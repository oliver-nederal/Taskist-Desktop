interface Tasks {
  id: string;
  title: string;
  completed: boolean;
}

interface Window {
  Main: {
    LoadTasks: () => Promise<Tasks[] | null>;
    SaveTasks: (tasks: Tasks[]) => Promise<void>;
  };
}