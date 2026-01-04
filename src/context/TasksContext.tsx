import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TasksAPI, SyncAPI, SettingsAPI } from "../backend";
import type { Task, SyncState } from "../backend";

interface TasksContextType {
  tasks: Task[];
  refreshTasks: () => Promise<void>;
  syncState: SyncState;
  restartSync: () => void; 
}

const TasksContext = createContext<TasksContextType | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle" });

  const refreshTasks = async () => {
    try {
      const all = await TasksAPI.getAll();
      setTasks(all);
    } catch (error) {
      console.error("[tasks] Failed to refresh:", error);
    }
  };
  
  const restartSync = async () => {
    try {
      await SyncAPI.restart();
    } catch (error) {
      console.error("[sync] Failed to restart:", error);
    }
  };

  // Initial load and set up listeners
  useEffect(() => {
    refreshTasks();
    
    // Get initial sync state
    SyncAPI.getState().then(setSyncState).catch(console.error);

    // Listen for task changes from Rust backend
    let unlistenTasks: (() => void) | undefined;
    let unlistenSync: (() => void) | undefined;
    
    TasksAPI.onTasksChanged(() => {
      refreshTasks();
    }).then((unlisten) => {
      unlistenTasks = unlisten;
    });
    
    SyncAPI.onStateChanged((state) => {
      setSyncState(state);
    }).then((unlisten) => {
      unlistenSync = unlisten;
    });

    return () => {
      unlistenTasks?.();
      unlistenSync?.();
    };
  }, []);

  // Start sync on mount
  useEffect(() => {
    const initSync = async () => {
      try {
        const settings = await SettingsAPI.getSyncSettings();
        
        if (!settings.syncUrl) {
          console.warn("[sync] remote URL missing, skipping sync setup");
          return;
        }

        await SyncAPI.start();
      } catch (error) {
        console.error("[sync] Failed to start:", error);
      }
    };
    
    initSync();

    return () => {
      SyncAPI.stop().catch(console.error);
    };
  }, []);

  const value = useMemo(
    () => ({ tasks, refreshTasks, syncState, restartSync }),
    [tasks, syncState],
  );

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within a TasksProvider");
  return ctx;
}