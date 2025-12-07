import { invoke } from '@tauri-apps/api/core';

// Define the window Main interface
// This is global and will be accessed from window.Main
window.Main = {
  LoadTasks: async () => {
    try {
      return await invoke('load_tasks');
    } catch (error) {
      console.error('Error loading tasks:', error);
      return null;
    }
  },
  
  SaveTasks: async (tasks) => {
    try {
      await invoke('save_tasks', { tasks });
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }
};