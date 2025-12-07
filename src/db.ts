import PouchDB from "pouchdb";

import { v7 as uuidv7 } from "uuid";

export interface Task {
  _id: string;
  _rev?: string;
  title: string;
  completed: boolean;
  updatedAt: number;
  order: number;
}

export const localDB = new PouchDB<Task>("tasks_db");

export const addTask = async (title: string): Promise<Task> => {
  // Get max order to append new task at the end
  const allTasks = await getAllTasks();
  const maxOrder = allTasks.length > 0 
    ? Math.max(...allTasks.map(t => t.order || 0))
    : 0;
  
  const newTask: Task = {
    _id: uuidv7(),
    title,
    completed: false,
    updatedAt: Date.now(),
    order: maxOrder + 1,
  };
  const response = await localDB.put(newTask);
  newTask._rev = response.rev;
  return newTask;
};

export const getAllTasks = async (): Promise<Task[]> => {
  const result = await localDB.allDocs<Task>({ include_docs: true });
  let tasks = result.rows.map((r) => r.doc!);
  // Sort by order field
  return tasks.sort((a, b) => a.order - b.order);
};

export const updateTask = async (task: Task): Promise<Task> => {
  task.updatedAt = Date.now();
  const response = await localDB.put(task);
  task._rev = response.rev;
  return task;
};

export const deleteTask = async (task: Task): Promise<void> => {
  if (!task._rev) {
    throw new Error("Task must have a _rev property to be deleted");
  }
  await localDB.remove(task._id, task._rev);
};

export const toggleTaskCompletion = async (task: Task): Promise<Task> => {
  task.completed = !task.completed;
  task.updatedAt = Date.now();
  const response = await localDB.put(task);
  task._rev = response.rev;
  return task;
};

export const reorderTasks = async (taskId: string, direction: "up" | "down"): Promise<void> => {
  const allTasks = await getAllTasks();
  const currentIndex = allTasks.findIndex(t => t._id === taskId);
  
  console.log("Reorder:", { taskId, direction, currentIndex, totalTasks: allTasks.length });
  
  if (currentIndex === -1) {
    console.log("Task not found");
    return;
  }
  
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  
  // Check bounds
  if (targetIndex < 0 || targetIndex >= allTasks.length) {
    console.log("Out of bounds:", { targetIndex, length: allTasks.length });
    return;
  }
  
  // Swap order values
  const currentTask = allTasks[currentIndex];
  const targetTask = allTasks[targetIndex];
  
  console.log("Swapping:", { 
    current: { title: currentTask.title, order: currentTask.order },
    target: { title: targetTask.title, order: targetTask.order }
  });
  
  const tempOrder = currentTask.order;
  currentTask.order = targetTask.order;
  targetTask.order = tempOrder;
  
  // Update both tasks
  await Promise.all([
    updateTask(currentTask),
    updateTask(targetTask)
  ]);
  
  console.log("Reorder complete");
};

export const watchTasks = (onChange: () => void) => {
  const changes = localDB.changes({
    since: "now",
    live: true,
    include_docs: true,
  }).on("change", onChange).on("error", console.error);

  return () => changes.cancel();
};