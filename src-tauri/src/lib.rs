mod database;
mod encryption;
mod sync;

use database::{Database, Task};
use encryption::{EncryptedStorage, SyncSettings};
use sync::{SyncManager, SyncState};

use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::RwLock;

// App state to hold our database and sync manager
pub struct AppState {
    db: Arc<Database>,
    storage: Arc<EncryptedStorage>,
    sync_manager: Arc<SyncManager>,
}

// ============ Task Commands ============

#[tauri::command]
async fn get_all_tasks(state: State<'_, Arc<RwLock<AppState>>>) -> Result<Vec<Task>, String> {
    let state = state.read().await;
    state.db.get_all_tasks()
}

#[tauri::command]
async fn add_task(
    title: String,
    description: Option<String>,
    due_date: Option<String>,
    state: State<'_, Arc<RwLock<AppState>>>,
    app_handle: AppHandle,
) -> Result<Task, String> {
    let state = state.read().await;
    let task = state.db.add_task(title, description, due_date)?;
    let _ = app_handle.emit("tasks-changed", ());
    Ok(task)
}

#[tauri::command]
async fn update_task(
    task: Task,
    state: State<'_, Arc<RwLock<AppState>>>,
    app_handle: AppHandle,
) -> Result<Task, String> {
    let state = state.read().await;
    let updated = state.db.update_task(&task)?;
    let _ = app_handle.emit("tasks-changed", ());
    Ok(updated)
}

#[tauri::command]
async fn delete_task(
    id: String,
    state: State<'_, Arc<RwLock<AppState>>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let state = state.read().await;
    state.db.delete_task(&id)?;
    let _ = app_handle.emit("tasks-changed", ());
    Ok(())
}

#[tauri::command]
async fn toggle_task_completion(
    id: String,
    state: State<'_, Arc<RwLock<AppState>>>,
    app_handle: AppHandle,
) -> Result<Task, String> {
    let state = state.read().await;
    let task = state.db.toggle_task_completion(&id)?;
    let _ = app_handle.emit("tasks-changed", ());
    Ok(task)
}

#[tauri::command]
async fn reorder_task(
    task_id: String,
    direction: String,
    state: State<'_, Arc<RwLock<AppState>>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let state = state.read().await;
    state.db.reorder_task(&task_id, &direction)?;
    let _ = app_handle.emit("tasks-changed", ());
    Ok(())
}

#[tauri::command]
async fn move_task_to_position(
    task_id: String,
    target_task_id: String,
    state: State<'_, Arc<RwLock<AppState>>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let state = state.read().await;
    state.db.move_task_to_position(&task_id, &target_task_id)?;
    let _ = app_handle.emit("tasks-changed", ());
    Ok(())
}

// ============ Settings Commands ============

#[tauri::command]
async fn get_sync_settings(state: State<'_, Arc<RwLock<AppState>>>) -> Result<SyncSettings, String> {
    let state = state.read().await;
    state.storage.load_sync_settings()
}

#[tauri::command]
async fn save_sync_settings(
    settings: SyncSettings,
    state: State<'_, Arc<RwLock<AppState>>>,
) -> Result<(), String> {
    let state = state.read().await;
    state.storage.save_sync_settings(&settings)
}

#[tauri::command]
async fn clear_sync_settings(state: State<'_, Arc<RwLock<AppState>>>) -> Result<(), String> {
    let state = state.read().await;
    state.storage.clear_sync_settings()
}

// ============ Sync Commands ============

#[tauri::command]
async fn get_sync_state(state: State<'_, Arc<RwLock<AppState>>>) -> Result<SyncState, String> {
    let state = state.read().await;
    Ok(state.sync_manager.get_state().await)
}

#[tauri::command]
async fn start_sync(
    state: State<'_, Arc<RwLock<AppState>>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let state = state.read().await;
    let settings = state.storage.load_sync_settings()?;
    
    if settings.sync_url.is_empty() {
        return Err("Sync URL is not configured".to_string());
    }
    
    state.sync_manager.start_sync(settings, state.db.clone(), app_handle).await;
    Ok(())
}

#[tauri::command]
async fn stop_sync(
    state: State<'_, Arc<RwLock<AppState>>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let state = state.read().await;
    state.sync_manager.stop_sync(&app_handle).await;
    Ok(())
}

#[tauri::command]
async fn restart_sync(
    state: State<'_, Arc<RwLock<AppState>>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let state = state.read().await;
    
    // Stop existing sync
    state.sync_manager.stop_sync(&app_handle).await;
    
    // Start new sync with updated settings
    let settings = state.storage.load_sync_settings()?;
    
    if settings.sync_url.is_empty() {
        return Err("Sync URL is not configured".to_string());
    }
    
    state.sync_manager.start_sync(settings, state.db.clone(), app_handle).await;
    Ok(())
}

// ============ Date Picker Popup Commands ============

const POPUP_WIDTH: f64 = 288.0;
const POPUP_HEIGHT: f64 = 520.0;

#[tauri::command]
async fn open_date_picker_popup(
    app_handle: AppHandle,
    button_x: i32,
    button_top: i32,
    button_bottom: i32,
    screen_height: i32,
    current_date: Option<String>,
) -> Result<(), String> {
    // Close existing popup if any
    if let Some(existing) = app_handle.get_webview_window("datepicker") {
        let _ = existing.close();
    }

    // Calculate if we should open above or below
    let space_below = screen_height - button_bottom;
    let space_above = button_top;
    
    let (y_position, open_above) = if space_below >= POPUP_HEIGHT as i32 {
        // Enough space below, open downward
        (button_bottom + 4, false)
    } else if space_above >= POPUP_HEIGHT as i32 {
        // Open above the button
        (button_top - POPUP_HEIGHT as i32 - 4, true)
    } else {
        // Not enough space either way, prefer below
        (button_bottom + 4, false)
    };

    let url = match &current_date {
        Some(date) => format!("/popup/datepicker?date={}&above={}", date, open_above),
        None => format!("/popup/datepicker?above={}", open_above),
    };

    let _popup = WebviewWindowBuilder::new(
        &app_handle,
        "datepicker",
        WebviewUrl::App(url.into()),
    )
    .title("")
    .inner_size(POPUP_WIDTH, POPUP_HEIGHT)
    .position(button_x as f64, y_position as f64)
    .decorations(false)
    .resizable(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .focused(true)
    //.transparent(true)
    .shadow(true)
    .build()
    .map_err(|e| format!("Failed to create popup: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn close_date_picker_popup(app_handle: AppHandle) -> Result<(), String> {
    if let Some(popup) = app_handle.get_webview_window("datepicker") {
        popup.close().map_err(|e| format!("Failed to close popup: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn emit_date_selected(app_handle: AppHandle, date: Option<String>) -> Result<(), String> {
    app_handle
        .emit("date-selected", date)
        .map_err(|e| format!("Failed to emit event: {}", e))?;
    
    // Close the popup after emitting
    if let Some(popup) = app_handle.get_webview_window("datepicker") {
        let _ = popup.close();
    }
    
    Ok(())
}

// ============ App Entry Point ============

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("Failed to get app directory");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app directory");
            
            let db_path = app_dir.join("tasks.db");
            let db = Database::new(db_path).expect("Failed to initialize database");
            
            let storage = EncryptedStorage::new(app_dir.clone())
                .expect("Failed to initialize encrypted storage");
            
            let sync_manager = SyncManager::new();
            
            let state = AppState {
                db: Arc::new(db),
                storage: Arc::new(storage),
                sync_manager: Arc::new(sync_manager),
            };
            
            app.manage(Arc::new(RwLock::new(state)));

            // Check for updates on startup (optional - comment out if you want manual checks only)
            // UNCOMMENT THE LINES BELOW FOR AUTOMATIC UPDATE CHECKS ON STARTUP:
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                let _ = app_handle.emit("check-for-updates", ());
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Task commands
            get_all_tasks,
            add_task,
            update_task,
            delete_task,
            toggle_task_completion,
            reorder_task,
            move_task_to_position,
            // Settings commands
            get_sync_settings,
            save_sync_settings,
            clear_sync_settings,
            // Sync commands
            get_sync_state,
            start_sync,
            stop_sync,
            restart_sync,
            // Date picker commands
            open_date_picker_popup,
            close_date_picker_popup,
            emit_date_selected
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}