use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const KEY_SIZE: usize = 32; // AES-256
const NONCE_SIZE: usize = 12; // GCM standard nonce size

/// Sync mode options
/// - "local" = SQLite only, no sync
/// - "selfhosted" = Self-hosted CouchDB
/// - "cloud" = Taskly Cloud (proprietary service)
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct SyncSettings {
    #[serde(default = "default_sync_mode")]
    pub sync_mode: String, // "local", "selfhosted", or "cloud"
    pub sync_url: String,
    pub sync_username: String,
    pub sync_password: String,
    pub sync_db_name: String,
}

fn default_sync_mode() -> String {
    "local".to_string()
}

impl SyncSettings {
    pub fn default_settings() -> Self {
        Self {
            sync_mode: "local".to_string(),
            sync_url: "localhost:5984".to_string(),
            sync_username: "admin".to_string(),
            sync_password: "admin".to_string(),
            sync_db_name: "tasks_db".to_string(),
        }
    }
    
    pub fn is_sync_enabled(&self) -> bool {
        self.sync_mode != "local"
    }
}

pub struct EncryptedStorage {
    storage_path: PathBuf,
    key: [u8; KEY_SIZE],
}

impl EncryptedStorage {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app directory: {}", e))?;
        
        let key_path = app_data_dir.join("encryption.key");
        let storage_path = app_data_dir.join("settings.enc");
        
        let key = if key_path.exists() {
            // Load existing key
            let key_data = fs::read(&key_path)
                .map_err(|e| format!("Failed to read encryption key: {}", e))?;
            
            if key_data.len() != KEY_SIZE {
                return Err("Invalid encryption key length".to_string());
            }
            
            let mut key = [0u8; KEY_SIZE];
            key.copy_from_slice(&key_data);
            key
        } else {
            // Generate new key
            let mut key = [0u8; KEY_SIZE];
            rand::thread_rng().fill(&mut key);
            
            fs::write(&key_path, &key)
                .map_err(|e| format!("Failed to write encryption key: {}", e))?;
            
            key
        };
        
        Ok(Self { storage_path, key })
    }
    
    fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, String> {
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;
        
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        rand::thread_rng().fill(&mut nonce_bytes);
        #[allow(deprecated)]
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| format!("Encryption failed: {}", e))?;
        
        // Prepend nonce to ciphertext
        let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);
        
        Ok(result)
    }
    
    fn decrypt(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        if data.len() < NONCE_SIZE {
            return Err("Data too short".to_string());
        }
        
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;
        
        #[allow(deprecated)]
        let nonce = Nonce::from_slice(&data[..NONCE_SIZE]);
        let ciphertext = &data[NONCE_SIZE..];
        
        cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))
    }
    
    pub fn save_sync_settings(&self, settings: &SyncSettings) -> Result<(), String> {
        let json = serde_json::to_string(settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        
        let encrypted = self.encrypt(json.as_bytes())?;
        let encoded = BASE64.encode(&encrypted);
        
        fs::write(&self.storage_path, encoded)
            .map_err(|e| format!("Failed to write settings: {}", e))
    }
    
    pub fn load_sync_settings(&self) -> Result<SyncSettings, String> {
        if !self.storage_path.exists() {
            return Ok(SyncSettings::default_settings());
        }
        
        let encoded = fs::read_to_string(&self.storage_path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        
        let encrypted = BASE64.decode(encoded.trim())
            .map_err(|e| format!("Failed to decode settings: {}", e))?;
        
        let decrypted = self.decrypt(&encrypted)?;
        
        serde_json::from_slice(&decrypted)
            .map_err(|e| format!("Failed to parse settings: {}", e))
    }
    
    pub fn clear_sync_settings(&self) -> Result<(), String> {
        if self.storage_path.exists() {
            fs::remove_file(&self.storage_path)
                .map_err(|e| format!("Failed to remove settings: {}", e))?;
        }
        Ok(())
    }
}
