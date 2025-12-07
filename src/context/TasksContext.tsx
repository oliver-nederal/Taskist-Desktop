import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAllTasks, watchTasks } from "../db";
import type { Task } from "../db";
import { startSync } from "../sync";
import type { SyncState } from "../sync";
import { getSyncSettings } from "../utils/secureStorage";

interface TasksContextType {
  tasks: Task[];
  refreshTasks: () => Promise<void>;
  syncState: SyncState;
}

const TasksContext = createContext<TasksContextType | null>(null);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle" });

  const refreshTasks = async () => {
    const all = await getAllTasks();
    setTasks(all);
  };

  useEffect(() => {
    refreshTasks();

    const stopWatching = watchTasks(refreshTasks);
    return () => stopWatching();
  }, []);

  useEffect(() => {
    const settings = getSyncSettings();

    const remoteUrl = settings.syncUrl;

    if (!remoteUrl) {
      console.warn("[sync] remote URL missing, skipping replication setup");
      return;
    }

    const controller = startSync(
      remoteUrl,
      settings.syncDbName,
      {
        username: settings.syncUsername,
        password: settings.syncPassword,
        onStateChange: (state) => setSyncState(state),
      }
    );

    return () => controller.cancel();
  }, []);

  const value = useMemo(
    () => ({ tasks, refreshTasks, syncState }),
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
