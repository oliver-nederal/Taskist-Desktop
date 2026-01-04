import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import Checkbox from "./checkbox";
import { useTasks } from "../../context/TasksContext";
import {
  TasksAPI,
  type Task,
} from "../../backend";

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface DragState {
  isDragging: boolean;
  draggedTaskId: string | null;
  currentX: number;
  currentY: number;
  dropTargetId: string | null; // The task slot we're hovering over (swap target)
}

interface CheckboxListProps {
  input?: boolean;
  isTaskPage?: boolean;
  animation?: boolean;
  maxTasks?: number | null;
  setTaskNum?: (taskNum: number) => void;
  refreshTrigger?: number;
}

export default function CheckboxList({
  input = false,
  isTaskPage = false,
  animation = true,
  maxTasks = null,
  setTaskNum,
}: CheckboxListProps) {
  const { tasks, refreshTasks } = useTasks();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invalidInput, setInvalidInput] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [parent, enableAnimations] = useAutoAnimate();
  const [isReordering, setIsReordering] = useState(false);
  
  // Box selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<string, HTMLElement>>(new Map());
  
  // Drag-and-drop state (simplified - just swap positions)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedTaskId: null,
    currentX: 0,
    currentY: 0,
    dropTargetId: null,
  });
  
  // Track mouse down position for distinguishing click vs drag
  const mouseDownPos = useRef<{ x: number; y: number; taskId: string | null } | null>(null);
  const dragThreshold = 5; // pixels to move before starting drag

  // Control animations based on animation prop and reordering state
  useEffect(() => {
    enableAnimations(animation && !isReordering && !dragState.isDragging);
  }, [animation, isReordering, dragState.isDragging, enableAnimations]);

  // optional: update count in parent
  useEffect(() => {
    if (setTaskNum) setTaskNum(tasks.filter((t) => !t.completed).length);
  }, [tasks, setTaskNum]);

  // Register task element refs
  const registerTaskRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      taskRefs.current.set(id, element);
    } else {
      taskRefs.current.delete(id);
    }
  }, []);

  // Calculate which tasks intersect with the selection box
  const getIntersectingTasks = useCallback((box: SelectionBox): string[] => {
    if (!containerRef.current) return [];
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Normalize box coordinates (handle dragging in any direction)
    const boxLeft = Math.min(box.startX, box.currentX);
    const boxRight = Math.max(box.startX, box.currentX);
    const boxTop = Math.min(box.startY, box.currentY);
    const boxBottom = Math.max(box.startY, box.currentY);
    
    const intersecting: string[] = [];
    
    taskRefs.current.forEach((element, id) => {
      const rect = element.getBoundingClientRect();
      
      // Convert to container-relative coordinates
      const taskLeft = rect.left - containerRect.left;
      const taskRight = rect.right - containerRect.left;
      const taskTop = rect.top - containerRect.top;
      const taskBottom = rect.bottom - containerRect.top;
      
      // Check intersection
      const intersects = !(
        boxRight < taskLeft ||
        boxLeft > taskRight ||
        boxBottom < taskTop ||
        boxTop > taskBottom
      );
      
      if (intersects) {
        intersecting.push(id);
      }
    });
    
    return intersecting;
  }, []);

  // Mouse event handlers for box selection and drag
  const handleContainerMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Check if clicking on a task - track for potential drag
    const taskElement = (e.target as HTMLElement).closest('li');
    if (taskElement) {
      const taskId = taskElement.getAttribute('data-task-id');
      if (taskId) {
        mouseDownPos.current = { x: e.clientX, y: e.clientY, taskId };
        return;
      }
    }
    
    // Only start box selection if clicking on empty space
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    
    mouseDownPos.current = { x: e.clientX, y: e.clientY, taskId: null };
    
    setIsSelecting(true);
    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
    
    // Clear previous selection unless holding shift
    if (!e.shiftKey) {
      setSelectedIds([]);
    }
  }, []);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    // Check if we should start dragging (mouse moved past threshold)
    if (mouseDownPos.current && !dragState.isDragging && !isSelecting && mouseDownPos.current.taskId) {
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > dragThreshold) {
        const taskId = mouseDownPos.current.taskId;
        
        setDragState({
          isDragging: true,
          draggedTaskId: taskId,
          currentX: e.clientX,
          currentY: e.clientY,
          dropTargetId: null,
        });
        return;
      }
    }
    
    // Handle box selection
    if (isSelecting && selectionBox) {
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;
      
      const newBox = {
        ...selectionBox,
        currentX: x,
        currentY: y,
      };
      
      setSelectionBox(newBox);
      
      // Update selected tasks in real-time
      const intersecting = getIntersectingTasks(newBox);
      setSelectedIds(intersecting);
      return;
    }
    
    // Handle drag reordering - find the task we're hovering over
    if (dragState.isDragging && dragState.draggedTaskId) {
      let hoveredId: string | null = null;
      
      taskRefs.current.forEach((element, id) => {
        if (id === dragState.draggedTaskId) return;
        
        const rect = element.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          hoveredId = id;
        }
      });
      
      setDragState(prev => ({
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
        dropTargetId: hoveredId,
      }));
    }
  }, [isSelecting, selectionBox, getIntersectingTasks, dragState.isDragging, dragState.draggedTaskId]);

  const handleContainerMouseUp = useCallback(async () => {
    const wasSelecting = isSelecting;
    const wasDragging = dragState.isDragging;
    
    // End box selection - keep the selection
    if (wasSelecting) {
      setIsSelecting(false);
      setSelectionBox(null);
      mouseDownPos.current = null;
      return; // Don't process further to preserve selection
    }
    
    // End drag reordering - swap positions
    if (wasDragging && dragState.dropTargetId && dragState.draggedTaskId) {
      setIsReordering(true);
      
      // Swap task positions
      await TasksAPI.moveToPosition(dragState.draggedTaskId, dragState.dropTargetId);
      await refreshTasks();
      
      setTimeout(() => setIsReordering(false), 100);
    }
    
    // Reset drag state
    setDragState({
      isDragging: false,
      draggedTaskId: null,
      currentX: 0,
      currentY: 0,
      dropTargetId: null,
    });
    mouseDownPos.current = null;
  }, [isSelecting, dragState, refreshTasks]);

  // Drag handle handlers (for explicit drag handle icon - starts drag immediately)
  const createDragHandleProps = useCallback((taskId: string) => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      setDragState({
        isDragging: true,
        draggedTaskId: taskId,
        currentX: e.clientX,
        currentY: e.clientY,
        dropTargetId: null,
      });
    },
    onTouchStart: (e: React.TouchEvent) => {
      e.stopPropagation();
      const touch = e.touches[0];
      
      setDragState({
        isDragging: true,
        draggedTaskId: taskId,
        currentX: touch.clientX,
        currentY: touch.clientY,
        dropTargetId: null,
      });
    },
  }), []);

  // Global mouse up handler to catch releases outside the container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      // Don't clear selection on global mouseup if we were selecting
      if (dragState.isDragging) {
        setDragState({
          isDragging: false,
          draggedTaskId: null,
          currentX: 0,
          currentY: 0,
          dropTargetId: null,
        });
      }
      if (isSelecting) {
        setIsSelecting(false);
        setSelectionBox(null);
      }
      mouseDownPos.current = null;
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, dragState.isDragging]);

  // Calculate selection box styles
  const getSelectionBoxStyle = (): React.CSSProperties => {
    if (!selectionBox) return { display: 'none' };
    
    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);
    
    return {
      left,
      top,
      width,
      height,
    };
  };

  const handleAddTask = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const value = event.currentTarget.value.trim();

    if (value.length >= 3 && value.length <= 50) {
      await TasksAPI.add(value);
      event.currentTarget.value = "";
    } else {
      if (animation) {
        setShakeInput(true);
        setTimeout(() => setShakeInput(false), 500);
      }
      setInvalidInput(true);
      setTimeout(() => setInvalidInput(false), 500);
    }
  };

  const handleKeyDown = async (event: KeyboardEvent) => {
  // Ignore keyboard shortcuts when user is typing in an input, textarea, or contenteditable
  const target = event.target as HTMLElement;
  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  ) {
    return;
  }

  if (selectedIds.length === 0) return;

  const { key, ctrlKey, shiftKey, metaKey } = event;
  console.log("Key pressed:", key);

  const selectedTasks = selectedIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean) as Task[];

  // helper to update or delete in bulk
  const updateMany = (updater: (t: Task) => void | Promise<void>) => {
    selectedTasks.forEach(updater);
  };

  switch (true) {
    case key === "Enter":
      updateMany(async (t) => { await TasksAPI.toggleCompletion(t.id); });
      break;

    case key === "Backspace" || key === "Delete":
      updateMany((t) => TasksAPI.delete(t.id));
      setSelectedIds([]);
      break;

    //move up (Shift + ArrowUp)
    case shiftKey && key === "ArrowUp":
      event.preventDefault();
      console.log("Moving task up, selected:", selectedTasks.length);
      if (selectedTasks.length === 1) {
        setIsReordering(true);
        await TasksAPI.reorder(selectedTasks[0].id, "up");
        console.log("Moved task up:", selectedTasks[0].title);
        // Brief delay to let the reorder complete before re-enabling animations
        setTimeout(() => setIsReordering(false), 50);
      }
      break;

    //move down (Shift + ArrowDown)
    case shiftKey && key === "ArrowDown":
      event.preventDefault();
      console.log("Moving task down, selected:", selectedTasks.length);
      if (selectedTasks.length === 1) {
        setIsReordering(true);
        await TasksAPI.reorder(selectedTasks[0].id, "down");
        console.log("Moved task down:", selectedTasks[0].title);
        // Brief delay to let the reorder complete before re-enabling animations
        setTimeout(() => setIsReordering(false), 50);
      }
      break;

    //clear selection
    case key === "Escape":
      setSelectedIds([]);
      break;

    //duplicate selected
    case key === "d" && (ctrlKey || metaKey):
      event.preventDefault();
      updateMany(async (t) => {
        await TasksAPI.add(`${t.title} (copy)`);
      });
      break;

    default:
      break;
  }
};


  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, tasks]);

  // Handle task selection with multi-select support
  const handleSelect = useCallback((id: string, multiSelect: boolean) => {
    if (multiSelect) {
      // Ctrl/Cmd+click: toggle individual selection
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      // Regular click: select only this task (or deselect if already only selected)
      setSelectedIds((prev) =>
        prev.length === 1 && prev[0] === id ? [] : [id]
      );
    }
  }, []);
  
  // Handle task expansion (for double-click)
  const handleExpand = useCallback((_id: string) => {
    // Clear selection when expanding
    setSelectedIds([]);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative select-none"
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
    >
      {/* Selection Box Overlay */}
      {isSelecting && selectionBox && (
        <div
          className="absolute pointer-events-none z-50 rounded-lg border-2 border-blue-400 bg-blue-400/10 dark:border-blue-500 dark:bg-blue-500/10 backdrop-blur-[1px] transition-none"
          style={getSelectionBoxStyle()}
        >
          {/* Inner glow effect */}
          <div className="absolute inset-0 rounded-lg bg-linear-to-br from-blue-400/20 to-transparent dark:from-blue-500/20" />
        </div>
      )}

      {/* Drag cursor indicator */}
      {dragState.isDragging && (
        <div
          className="fixed pointer-events-none z-100"
          style={{
            left: dragState.currentX,
            top: dragState.currentY,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-6 h-6 rounded-full bg-blue-500 shadow-lg opacity-80 animate-pulse" />
        </div>
      )}

      <ul
        ref={parent}
        className="pb-12 h-full transition-all"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedIds([]);
          }
        }}
      >
        {tasks.length === 0 && isTaskPage ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <p className="text-xl">A fresh start!</p>
            <p className="text-gray-400 italic">Anything to add?</p>
          </div>
        ) : (
          tasks.map((task, index) => {
            if (maxTasks && index >= maxTasks) return null;
            const isDragging = dragState.draggedTaskId === task.id;
            const isDropTarget = dragState.dropTargetId === task.id;
            return (
              <div
                key={task.id}
                ref={(el) => registerTaskRef(task.id, el)}
              >
                <Checkbox
                  task={task}
                  onUpdate={TasksAPI.update}
                  onDelete={TasksAPI.delete}
                  isSelected={selectedIds.includes(task.id)}
                  onSelect={(multiSelect) => handleSelect(task.id, multiSelect)}
                  onExpand={() => handleExpand(task.id)}
                  animation={animation}
                  isDragging={isDragging}
                  dragHandleProps={createDragHandleProps(task.id)}
                  isDropTarget={isDropTarget}
                />
              </div>
            );
          })
        )}
      </ul>

      {input && (
        <div className="absolute bottom-0 left-1/2 translate-x-[-50%] p-2 w-full h-[45px]">
          <input
            className={`w-full h-full px-2 rounded-lg outline-none ${
              invalidInput ? "bg-red-50" : "bg-gray-200"
            } ${shakeInput ? "shake" : ""}`}
            type="text"
            placeholder="+ Add a task"
            onClick={() => setSelectedIds([])}
            onKeyDown={handleAddTask}
          />
        </div>
      )}
    </div>
  );
}
