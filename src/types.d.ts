// Task type is now defined in backend.ts
// This file contains legacy types that may be removed

interface Window {
  // Legacy - no longer used
  Main?: {
    LoadTasks: () => Promise<unknown[] | null>;
    SaveTasks: (tasks: unknown[]) => Promise<void>;
  };
}