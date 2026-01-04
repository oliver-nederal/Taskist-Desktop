import type { Task } from "../../backend";

// ============ Selection Types ============
export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// ============ Drag Types ============
export interface DragState {
  isDragging: boolean;
  draggedTaskId: string | null;
  draggedTask: Task | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  dropTargetId: string | null;
}

export interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

// ============ Task Item Props ============
export interface TaskItemProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void | Promise<Task>;
  onDelete: (taskId: string) => void | Promise<void>;
  isSelected: boolean;
  onSelect: (multiSelect: boolean) => void;
  onExpand: () => void;
  animation: boolean;
  isDragging?: boolean;
  dragHandleProps?: DragHandleProps;
  isDropTarget?: boolean;
}

// ============ Task List Props ============
export interface TaskListProps {
  input?: boolean;
  isTaskPage?: boolean;
  animation?: boolean;
  maxTasks?: number | null;
  setTaskNum?: (taskNum: number) => void;
  refreshTrigger?: number;
}

// ============ Project Types (temporary mock) ============
export interface Project {
  id: string;
  name: string;
  color: string;
}

export const PROJECTS: Project[] = [
  { id: "inbox", name: "Inbox", color: "bg-neutral-400" },
  { id: "work", name: "Work", color: "bg-blue-500" },
  { id: "personal", name: "Personal", color: "bg-green-500" },
  { id: "shopping", name: "Shopping", color: "bg-purple-500" },
  { id: "health", name: "Health", color: "bg-red-500" },
];
