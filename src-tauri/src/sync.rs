use crate::database::{Database, Task};
use crate::encryption::SyncSettings;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::RwLock;
use tokio::time::sleep;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum SyncStatus {
    Idle,
    Connecting,
    Syncing,
    Paused,
    Error,
    Disabled,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    pub status: SyncStatus,
    pub last_synced: Option<i64>,
    pub error: Option<String>,
    pub sync_mode: Option<String>,
}

impl Default for SyncState {
    fn default() -> Self {
        Self {
            status: SyncStatus::Disabled,
            last_synced: None,
            error: None,
            sync_mode: Some("local".to_string()),
        }
    }
}

// CouchDB document structure
#[derive(Serialize, Deserialize, Debug, Clone)]
struct CouchDoc {
    #[serde(rename = "_id")]
    id: String,
    #[serde(rename = "_rev", skip_serializing_if = "Option::is_none")]
    rev: Option<String>,
    #[serde(flatten)]
    task: TaskData,
    #[serde(rename = "_deleted", skip_serializing_if = "Option::is_none")]
    deleted: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct TaskData {
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    completed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    due_date: Option<String>,
    updated_at: i64,
    order: i32,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct CouchResponse {
    ok: Option<bool>,
    id: Option<String>,
    rev: Option<String>,
    error: Option<String>,
    reason: Option<String>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct AllDocsResponse {
    rows: Vec<AllDocsRow>,
    total_rows: Option<usize>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct AllDocsRow {
    id: String,
    #[serde(rename = "value")]
    _value: serde_json::Value,
    doc: Option<CouchDoc>,
}

#[derive(Deserialize, Debug)]
struct ChangesResponse {
    results: Vec<ChangesResult>,
    last_seq: String,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct ChangesResult {
    id: String,
    seq: String,
    changes: Vec<ChangesRev>,
    doc: Option<CouchDoc>,
    deleted: Option<bool>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct ChangesRev {
    rev: String,
}

pub struct SyncManager {
    state: Arc<RwLock<SyncState>>,
    running: Arc<RwLock<bool>>,
    client: Client,
}

impl SyncManager {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        
        Self {
            state: Arc::new(RwLock::new(SyncState::default())),
            running: Arc::new(RwLock::new(false)),
            client,
        }
    }
    
    pub async fn get_state(&self) -> SyncState {
        self.state.read().await.clone()
    }
    
    async fn set_state(&self, state: SyncState, app_handle: &AppHandle) {
        *self.state.write().await = state.clone();
        let _ = app_handle.emit("sync-state-changed", state);
    }
    
    pub async fn start_sync(
        &self,
        settings: SyncSettings,
        db: Arc<Database>,
        app_handle: AppHandle,
    ) {
        // Check if sync is disabled (local-only mode)
        if !settings.is_sync_enabled() {
            let new_state = SyncState {
                status: SyncStatus::Disabled,
                last_synced: None,
                error: None,
                sync_mode: Some(settings.sync_mode.clone()),
            };
            *self.state.write().await = new_state.clone();
            let _ = app_handle.emit("sync-state-changed", new_state);
            return;
        }
        
        // Check if already running
        {
            let mut running = self.running.write().await;
            if *running {
                return;
            }
            *running = true;
        }
        
        let running = self.running.clone();
        let state = self.state.clone();
        let client = self.client.clone();
        let sync_mode = settings.sync_mode.clone();
        
        tokio::spawn(async move {
            let base_url = normalize_url(&settings.sync_url);
            let db_url = format!("{}/{}", base_url, settings.sync_db_name);
            let auth = if !settings.sync_username.is_empty() && !settings.sync_password.is_empty() {
                Some((settings.sync_username.clone(), settings.sync_password.clone()))
            } else {
                None
            };
            
            // Update state to connecting
            {
                let new_state = SyncState {
                    status: SyncStatus::Connecting,
                    last_synced: None,
                    error: None,
                    sync_mode: Some(sync_mode.clone()),
                };
                *state.write().await = new_state.clone();
                let _ = app_handle.emit("sync-state-changed", new_state);
            }
            
            // Ensure remote database exists
            if let Err(e) = ensure_db_exists(&client, &db_url, auth.as_ref()).await {
                let new_state = SyncState {
                    status: SyncStatus::Error,
                    last_synced: None,
                    error: Some(e),
                    sync_mode: Some(sync_mode.clone()),
                };
                *state.write().await = new_state.clone();
                let _ = app_handle.emit("sync-state-changed", new_state);
                *running.write().await = false;
                return;
            }
            
            // Main sync loop
            loop {
                if !*running.read().await {
                    break;
                }
                
                // Update state to syncing
                {
                    let last_synced = state.read().await.last_synced;
                    let new_state = SyncState {
                        status: SyncStatus::Syncing,
                        last_synced,
                        error: None,
                        sync_mode: Some(sync_mode.clone()),
                    };
                    *state.write().await = new_state.clone();
                    let _ = app_handle.emit("sync-state-changed", new_state);
                }
                
                // Perform sync cycle
                match sync_cycle(&client, &db_url, auth.as_ref(), &db).await {
                    Ok(_) => {
                        let now = chrono::Utc::now().timestamp_millis();
                        let new_state = SyncState {
                            status: SyncStatus::Paused,
                            last_synced: Some(now),
                            error: None,
                            sync_mode: Some(sync_mode.clone()),
                        };
                        *state.write().await = new_state.clone();
                        let _ = app_handle.emit("sync-state-changed", new_state);
                        let _ = app_handle.emit("tasks-changed", ());
                    }
                    Err(e) => {
                        eprintln!("[sync] error: {}", e);
                        let new_state = SyncState {
                            status: SyncStatus::Error,
                            last_synced: state.read().await.last_synced,
                            error: Some(e),
                            sync_mode: Some(sync_mode.clone()),
                        };
                        *state.write().await = new_state.clone();
                        let _ = app_handle.emit("sync-state-changed", new_state);
                    }
                }
                
                // Wait before next sync
                sleep(Duration::from_secs(5)).await;
            }
        });
    }
    
    pub async fn stop_sync(&self, app_handle: &AppHandle) {
        *self.running.write().await = false;
        
        let current_state = self.state.read().await;
        let new_state = SyncState {
            status: SyncStatus::Paused,
            last_synced: current_state.last_synced,
            error: None,
            sync_mode: current_state.sync_mode.clone(),
        };
        drop(current_state);
        self.set_state(new_state, app_handle).await;
    }
}

fn normalize_url(url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else {
        format!("http://{}", url)
    }
}

async fn ensure_db_exists(
    client: &Client,
    db_url: &str,
    auth: Option<&(String, String)>,
) -> Result<(), String> {
    let mut req = client.put(db_url);
    if let Some((user, pass)) = auth {
        req = req.basic_auth(user, Some(pass));
    }
    
    let resp = req.send().await.map_err(|e| format!("Connection failed: {}", e))?;
    
    // 201 = created, 412 = already exists - both are fine
    if resp.status().is_success() || resp.status().as_u16() == 412 {
        Ok(())
    } else {
        let text = resp.text().await.unwrap_or_default();
        Err(format!("Failed to create database: {}", text))
    }
}

async fn sync_cycle(
    client: &Client,
    db_url: &str,
    auth: Option<&(String, String)>,
    db: &Database,
) -> Result<(), String> {
    // 1. Push local changes to remote
    push_changes(client, db_url, auth, db).await?;
    
    // 2. Pull remote changes to local
    pull_changes(client, db_url, auth, db).await?;
    
    Ok(())
}

async fn push_changes(
    client: &Client,
    db_url: &str,
    auth: Option<&(String, String)>,
    db: &Database,
) -> Result<(), String> {
    // Get local tasks that have been modified
    let tasks = db.get_all_tasks().map_err(|e| format!("DB error: {}", e))?;
    
    for task in tasks {
        // Check if document exists on remote
        let doc_url = format!("{}/{}", db_url, task.id);
        let mut req = client.get(&doc_url);
        if let Some((user, pass)) = auth {
            req = req.basic_auth(user, Some(pass));
        }
        
        let resp = req.send().await.map_err(|e| format!("Request failed: {}", e))?;
        
        let remote_rev = if resp.status().is_success() {
            let remote_doc: CouchDoc = resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
            Some(remote_doc.rev.unwrap_or_default())
        } else {
            None
        };
        
        // Prepare document for upload
        let couch_doc = CouchDoc {
            id: task.id.clone(),
            rev: remote_rev,
            task: TaskData {
                title: task.title,
                description: task.description,
                completed: task.completed,
                due_date: task.due_date,
                updated_at: task.updated_at,
                order: task.order,
            },
            deleted: if task.deleted { Some(true) } else { None },
        };
        
        // PUT the document
        let mut req = client.put(&doc_url).json(&couch_doc);
        if let Some((user, pass)) = auth {
            req = req.basic_auth(user, Some(pass));
        }
        
        let resp = req.send().await.map_err(|e| format!("PUT failed: {}", e))?;
        
        if !resp.status().is_success() && resp.status().as_u16() != 409 {
            // 409 = conflict, handled by pull
            let text = resp.text().await.unwrap_or_default();
            eprintln!("[sync] push error for {}: {}", task.id, text);
        }
    }
    
    Ok(())
}

async fn pull_changes(
    client: &Client,
    db_url: &str,
    auth: Option<&(String, String)>,
    db: &Database,
) -> Result<(), String> {
    // Get last sync sequence
    let since = db.get_last_sync_seq()
        .unwrap_or(None)
        .unwrap_or_else(|| "0".to_string());
    
    // Fetch changes from CouchDB
    let changes_url = format!("{}/_changes?include_docs=true&since={}", db_url, since);
    let mut req = client.get(&changes_url);
    if let Some((user, pass)) = auth {
        req = req.basic_auth(user, Some(pass));
    }
    
    let resp = req.send().await.map_err(|e| format!("Changes request failed: {}", e))?;
    
    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch changes: {}", text));
    }
    
    let changes: ChangesResponse = resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
    
    // Process each change
    for result in changes.results {
        if let Some(doc) = result.doc {
            // Skip design documents
            if doc.id.starts_with("_design") {
                continue;
            }
            
            let task = Task {
                id: doc.id,
                rev: doc.rev,
                title: doc.task.title,
                description: doc.task.description,
                completed: doc.task.completed,
                due_date: doc.task.due_date,
                updated_at: doc.task.updated_at,
                order: doc.task.order,
                deleted: result.deleted.unwrap_or(false) || doc.deleted.unwrap_or(false),
            };
            
            db.upsert_from_remote(&task).map_err(|e| format!("Upsert failed: {}", e))?;
        }
    }
    
    // Update last sync sequence
    db.set_last_sync_seq(&changes.last_seq).map_err(|e| format!("Failed to save seq: {}", e))?;
    
    Ok(())
}
