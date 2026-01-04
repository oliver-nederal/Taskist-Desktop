use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rev: Option<String>,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub completed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due_date: Option<String>,
    pub updated_at: i64,
    pub order: i32,
    #[serde(default)]
    pub deleted: bool,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self, String> {
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;
        
        // Initialize the database schema
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                rev TEXT,
                title TEXT NOT NULL,
                description TEXT,
                completed INTEGER NOT NULL DEFAULT 0,
                due_date TEXT,
                updated_at INTEGER NOT NULL,
                task_order INTEGER NOT NULL,
                deleted INTEGER NOT NULL DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS sync_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                last_seq TEXT,
                last_synced_at INTEGER
            );
            
            CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted);
            "
        ).map_err(|e| format!("Failed to create tables: {}", e))?;
        
        Ok(Self { conn: Mutex::new(conn) })
    }
    
    pub fn add_task(&self, title: String, description: Option<String>, due_date: Option<String>) -> Result<Task, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        // Get max order
        let max_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(task_order), 0) FROM tasks WHERE deleted = 0",
                [],
                |row| row.get(0)
            )
            .unwrap_or(0);
        
        let id = Uuid::now_v7().to_string();
        let rev = format!("1-{}", Uuid::new_v4().to_string().replace("-", "")[..32].to_string());
        let updated_at = Utc::now().timestamp_millis();
        let order = max_order + 1;
        
        conn.execute(
            "INSERT INTO tasks (id, rev, title, description, completed, due_date, updated_at, task_order, deleted)
             VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7, 0)",
            params![id, rev, title, description, due_date, updated_at, order],
        ).map_err(|e| format!("Failed to insert task: {}", e))?;
        
        Ok(Task {
            id,
            rev: Some(rev),
            title,
            description,
            completed: false,
            due_date,
            updated_at,
            order,
            deleted: false,
        })
    }
    
    pub fn get_all_tasks(&self) -> Result<Vec<Task>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        let mut stmt = conn.prepare(
            "SELECT id, rev, title, description, completed, due_date, updated_at, task_order, deleted 
             FROM tasks 
             WHERE deleted = 0 
             ORDER BY task_order ASC"
        ).map_err(|e| format!("Failed to prepare statement: {}", e))?;
        
        let tasks = stmt.query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                rev: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                completed: row.get::<_, i32>(4)? != 0,
                due_date: row.get(5)?,
                updated_at: row.get(6)?,
                order: row.get(7)?,
                deleted: row.get::<_, i32>(8)? != 0,
            })
        }).map_err(|e| format!("Failed to query tasks: {}", e))?;
        
        tasks.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect tasks: {}", e))
    }
    
    pub fn update_task(&self, task: &Task) -> Result<Task, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        // Increment revision
        let rev_num: i32 = task.rev
            .as_ref()
            .and_then(|r| r.split('-').next())
            .and_then(|n| n.parse().ok())
            .unwrap_or(0) + 1;
        let new_rev = format!("{}-{}", rev_num, Uuid::new_v4().to_string().replace("-", "")[..32].to_string());
        let updated_at = Utc::now().timestamp_millis();
        
        conn.execute(
            "UPDATE tasks SET 
                rev = ?1, 
                title = ?2, 
                description = ?3, 
                completed = ?4, 
                due_date = ?5, 
                updated_at = ?6, 
                task_order = ?7,
                deleted = ?8
             WHERE id = ?9",
            params![
                new_rev,
                task.title,
                task.description,
                task.completed as i32,
                task.due_date,
                updated_at,
                task.order,
                task.deleted as i32,
                task.id
            ],
        ).map_err(|e| format!("Failed to update task: {}", e))?;
        
        Ok(Task {
            id: task.id.clone(),
            rev: Some(new_rev),
            title: task.title.clone(),
            description: task.description.clone(),
            completed: task.completed,
            due_date: task.due_date.clone(),
            updated_at,
            order: task.order,
            deleted: task.deleted,
        })
    }
    
    pub fn delete_task(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        let updated_at = Utc::now().timestamp_millis();
        
        // Soft delete for sync purposes
        conn.execute(
            "UPDATE tasks SET deleted = 1, updated_at = ?1 WHERE id = ?2",
            params![updated_at, id],
        ).map_err(|e| format!("Failed to delete task: {}", e))?;
        
        Ok(())
    }
    
    pub fn toggle_task_completion(&self, id: &str) -> Result<Task, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        // Get current task
        let mut task: Task = conn.query_row(
            "SELECT id, rev, title, description, completed, due_date, updated_at, task_order, deleted 
             FROM tasks WHERE id = ?1",
            params![id],
            |row| {
                Ok(Task {
                    id: row.get(0)?,
                    rev: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    completed: row.get::<_, i32>(4)? != 0,
                    due_date: row.get(5)?,
                    updated_at: row.get(6)?,
                    order: row.get(7)?,
                    deleted: row.get::<_, i32>(8)? != 0,
                })
            }
        ).map_err(|e| format!("Task not found: {}", e))?;
        
        drop(conn); // Release lock before calling update_task
        
        task.completed = !task.completed;
        self.update_task(&task)
    }
    
    pub fn reorder_task(&self, task_id: &str, direction: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        // Get all tasks sorted by order
        let mut stmt = conn.prepare(
            "SELECT id, task_order FROM tasks WHERE deleted = 0 ORDER BY task_order ASC"
        ).map_err(|e| format!("Failed to prepare: {}", e))?;
        
        let tasks: Vec<(String, i32)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }).map_err(|e| format!("Query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Collect error: {}", e))?;
        
        let current_index = tasks.iter().position(|(id, _)| id == task_id)
            .ok_or_else(|| "Task not found".to_string())?;
        
        let target_index = if direction == "up" {
            if current_index == 0 { return Ok(()); }
            current_index - 1
        } else {
            if current_index >= tasks.len() - 1 { return Ok(()); }
            current_index + 1
        };
        
        let updated_at = Utc::now().timestamp_millis();
        let current_order = tasks[current_index].1;
        let target_order = tasks[target_index].1;
        
        // Swap orders
        conn.execute(
            "UPDATE tasks SET task_order = ?1, updated_at = ?2 WHERE id = ?3",
            params![target_order, updated_at, task_id],
        ).map_err(|e| format!("Failed to update current task: {}", e))?;
        
        conn.execute(
            "UPDATE tasks SET task_order = ?1, updated_at = ?2 WHERE id = ?3",
            params![current_order, updated_at, tasks[target_index].0],
        ).map_err(|e| format!("Failed to update target task: {}", e))?;
        
        Ok(())
    }
    
    /// Move a task to a specific target position (by target task ID)
    pub fn move_task_to_position(&self, task_id: &str, target_task_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        // Get all tasks sorted by order
        let mut stmt = conn.prepare(
            "SELECT id, task_order FROM tasks WHERE deleted = 0 ORDER BY task_order ASC"
        ).map_err(|e| format!("Failed to prepare: {}", e))?;
        
        let tasks: Vec<(String, i32)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }).map_err(|e| format!("Query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Collect error: {}", e))?;
        
        let current_index = tasks.iter().position(|(id, _)| id == task_id)
            .ok_or_else(|| "Task not found".to_string())?;
        
        let target_index = tasks.iter().position(|(id, _)| id == target_task_id)
            .ok_or_else(|| "Target task not found".to_string())?;
        
        // If same position, nothing to do
        if current_index == target_index {
            return Ok(());
        }
        
        let updated_at = Utc::now().timestamp_millis();
        
        // Swap the two tasks' orders directly
        let current_order = tasks[current_index].1;
        let target_order = tasks[target_index].1;
        
        conn.execute(
            "UPDATE tasks SET task_order = ?1, updated_at = ?2 WHERE id = ?3",
            params![target_order, updated_at, task_id],
        ).map_err(|e| format!("Failed to update dragged task: {}", e))?;
        
        conn.execute(
            "UPDATE tasks SET task_order = ?1, updated_at = ?2 WHERE id = ?3",
            params![current_order, updated_at, target_task_id],
        ).map_err(|e| format!("Failed to update target task: {}", e))?;
        
        Ok(())
    }
    
    // Sync-related methods
    #[allow(dead_code)]
    pub fn get_changes_since(&self, since: i64) -> Result<Vec<Task>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        let mut stmt = conn.prepare(
            "SELECT id, rev, title, description, completed, due_date, updated_at, task_order, deleted 
             FROM tasks 
             WHERE updated_at > ?1 
             ORDER BY updated_at ASC"
        ).map_err(|e| format!("Failed to prepare: {}", e))?;
        
        let tasks = stmt.query_map(params![since], |row| {
            Ok(Task {
                id: row.get(0)?,
                rev: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                completed: row.get::<_, i32>(4)? != 0,
                due_date: row.get(5)?,
                updated_at: row.get(6)?,
                order: row.get(7)?,
                deleted: row.get::<_, i32>(8)? != 0,
            })
        }).map_err(|e| format!("Query error: {}", e))?;
        
        tasks.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Collect error: {}", e))
    }
    
    pub fn upsert_from_remote(&self, task: &Task) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        conn.execute(
            "INSERT INTO tasks (id, rev, title, description, completed, due_date, updated_at, task_order, deleted)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
                rev = excluded.rev,
                title = excluded.title,
                description = excluded.description,
                completed = excluded.completed,
                due_date = excluded.due_date,
                updated_at = excluded.updated_at,
                task_order = excluded.task_order,
                deleted = excluded.deleted
             WHERE excluded.updated_at > tasks.updated_at",
            params![
                task.id,
                task.rev,
                task.title,
                task.description,
                task.completed as i32,
                task.due_date,
                task.updated_at,
                task.order,
                task.deleted as i32,
            ],
        ).map_err(|e| format!("Failed to upsert task: {}", e))?;
        
        Ok(())
    }
    
    pub fn get_last_sync_seq(&self) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        match conn.query_row(
            "SELECT last_seq FROM sync_state WHERE id = 1",
            [],
            |row| row.get::<_, String>(0)
        ) {
            Ok(seq) => Ok(Some(seq)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Query error: {}", e)),
        }
    }
    
    pub fn set_last_sync_seq(&self, seq: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        let now = Utc::now().timestamp_millis();
        
        conn.execute(
            "INSERT INTO sync_state (id, last_seq, last_synced_at) VALUES (1, ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET last_seq = ?1, last_synced_at = ?2",
            params![seq, now],
        ).map_err(|e| format!("Failed to update sync state: {}", e))?;
        
        Ok(())
    }
}
