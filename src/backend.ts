/**
 * Rust Backend API Bindings
 * 
 * This module provides a TypeScript interface to the Rust backend.
 * All database operations, encryption, syncing, and server communication
 * are handled on the Rust side.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// ============ Types ============

export interface Task {
  id: string;
  rev?: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  updatedAt: number;
  order: number;
  deleted?: boolean;
}

export type SyncMode = 'local' | 'selfhosted' | 'cloud';

export interface SyncSettings {
  syncMode: SyncMode;
  syncUrl: string;
  syncUsername: string;
  syncPassword: string;
  syncDbName: string;
}

export type SyncStatus = 'idle' | 'connecting' | 'syncing' | 'paused' | 'error' | 'disabled';

export interface SyncState {
  status: SyncStatus;
  lastSynced?: number;
  error?: string;
}

// ============ Task API ============

export const TasksAPI = {
  /**
   * Get all tasks from the database
   */
  async getAll(): Promise<Task[]> {
    return await invoke<Task[]>('get_all_tasks');
  },

  /**
   * Add a new task
   */
  async add(
    title: string,
    options?: { description?: string; dueDate?: string }
  ): Promise<Task> {
    return await invoke<Task>('add_task', {
      title,
      description: options?.description,
      dueDate: options?.dueDate,
    });
  },

  /**
   * Update an existing task
   */
  async update(task: Task): Promise<Task> {
    return await invoke<Task>('update_task', { task });
  },

  /**
   * Delete a task
   */
  async delete(id: string): Promise<void> {
    await invoke('delete_task', { id });
  },

  /**
   * Toggle task completion status
   */
  async toggleCompletion(id: string): Promise<Task> {
    return await invoke<Task>('toggle_task_completion', { id });
  },

  /**
   * Reorder a task up or down
   */
  async reorder(taskId: string, direction: 'up' | 'down'): Promise<void> {
    await invoke('reorder_task', { taskId, direction });
  },

  /**
   * Move a task to swap positions with another task
   */
  async moveToPosition(taskId: string, targetTaskId: string): Promise<void> {
    await invoke('move_task_to_position', { taskId, targetTaskId });
  },

  /**
   * Listen for task changes (from sync or local modifications)
   */
  onTasksChanged(callback: () => void): Promise<UnlistenFn> {
    return listen('tasks-changed', callback);
  },
};

// ============ Settings API ============

export const SettingsAPI = {
  /**
   * Get sync settings (decrypted from secure storage)
   */
  async getSyncSettings(): Promise<SyncSettings> {
    return await invoke<SyncSettings>('get_sync_settings');
  },

  /**
   * Save sync settings (encrypted to secure storage)
   */
  async saveSyncSettings(settings: SyncSettings): Promise<void> {
    await invoke('save_sync_settings', { settings });
  },

  /**
   * Clear all sync settings
   */
  async clearSyncSettings(): Promise<void> {
    await invoke('clear_sync_settings');
  },
};

// ============ Sync API ============

export const SyncAPI = {
  /**
   * Get current sync state
   */
  async getState(): Promise<SyncState> {
    return await invoke<SyncState>('get_sync_state');
  },

  /**
   * Start syncing with the remote CouchDB server
   */
  async start(): Promise<void> {
    await invoke('start_sync');
  },

  /**
   * Stop syncing
   */
  async stop(): Promise<void> {
    await invoke('stop_sync');
  },

  /**
   * Restart sync (useful after settings change)
   */
  async restart(): Promise<void> {
    await invoke('restart_sync');
  },

  /**
   * Listen for sync state changes
   */
  onStateChanged(callback: (state: SyncState) => void): Promise<UnlistenFn> {
    return listen<SyncState>('sync-state-changed', (event) => {
      callback(event.payload);
    });
  },
};

// ============ Convenience Exports ============

// Re-export for compatibility
export const getAllTasks = TasksAPI.getAll;
export const addTask = TasksAPI.add;
export const updateTask = TasksAPI.update;
export const deleteTask = TasksAPI.delete;
export const toggleTaskCompletion = TasksAPI.toggleCompletion;
export const reorderTasks = TasksAPI.reorder;
export const getSyncSettings = SettingsAPI.getSyncSettings;
export const saveSyncSettings = SettingsAPI.saveSyncSettings;
