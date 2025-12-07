// Simple encryption for local storage (browser-based)
// Note: This provides obfuscation, not true security. For production,
// consider using a more robust solution or server-side encryption.

const ENCRYPTION_KEY = "taskly_secure_key_v1";

function simpleEncrypt(text: string): string {
  // Base64 encode with simple XOR cipher
  const key = ENCRYPTION_KEY;
  let encrypted = "";
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode);
  }
  
  return btoa(encrypted);
}

function simpleDecrypt(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    const key = ENCRYPTION_KEY;
    let decrypted = "";
    
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    return decrypted;
  } catch (e) {
    console.error("Failed to decrypt:", e);
    return "";
  }
}

export interface SyncSettings {
  syncUrl: string;
  syncUsername: string;
  syncPassword: string;
  syncDbName: string;
}

const SETTINGS_KEY = "taskly_sync_settings";

export function saveSyncSettings(settings: Partial<SyncSettings>): void {
  const current = getSyncSettings();
  const updated = { ...current, ...settings };
  const encrypted = simpleEncrypt(JSON.stringify(updated));
  localStorage.setItem(SETTINGS_KEY, encrypted);
}

export function getSyncSettings(): SyncSettings {
  const encrypted = localStorage.getItem(SETTINGS_KEY);
  
  if (!encrypted) {
    // Return defaults
    return {
      syncUrl: "localhost:5984",
      syncUsername: "admin",
      syncPassword: "admin",
      syncDbName: "tasks_db",
    };
  }
  
  try {
    const decrypted = simpleDecrypt(encrypted);
    return JSON.parse(decrypted) as SyncSettings;
  } catch (e) {
    console.error("Failed to parse sync settings:", e);
    return {
      syncUrl: "localhost:5984",
      syncUsername: "admin",
      syncPassword: "admin",
      syncDbName: "tasks_db",
    };
  }
}

export function clearSyncSettings(): void {
  localStorage.removeItem(SETTINGS_KEY);
}
