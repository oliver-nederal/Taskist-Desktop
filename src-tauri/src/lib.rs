use serde::{Deserialize, Serialize};
use std::fs;

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Task {
    id: String,
    title: String,
    completed: bool,
}

fn get_tasks_file_path(app_handle: &AppHandle) -> PathBuf {
    let app_dir = app_handle.path().app_data_dir().expect("Failed to get app directory");
    
    fs::create_dir_all(&app_dir).expect("Failed to create app directory");
    app_dir.join("tasks.json")
}

#[tauri::command]
fn load_tasks(app_handle: AppHandle) -> Result<Vec<Task>, String> {
    let file_path = get_tasks_file_path(&app_handle);
    
    if !file_path.exists() {
        return Ok(Vec::new());
    }
    
    match fs::read_to_string(&file_path) {
        Ok(content) => {
            match serde_json::from_str(&content) {
                Ok(tasks) => Ok(tasks),
                Err(e) => Err(format!("Failed to parse tasks: {}", e))
            }
        },
        Err(e) => Err(format!("Failed to read tasks file: {}", e))
    }
}

#[tauri::command]
fn save_tasks(tasks: Vec<Task>, app_handle: AppHandle) -> Result<(), String> {
    let file_path = get_tasks_file_path(&app_handle);
    
    match serde_json::to_string_pretty(&tasks) {
        Ok(json) => {
            match fs::write(&file_path, json) {
                Ok(_) => Ok(()),
                Err(e) => Err(format!("Failed to write tasks file: {}", e))
            }
        },
        Err(e) => Err(format!("Failed to serialize tasks: {}", e))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![load_tasks, save_tasks])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
