import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import TaskItem from "./TaskItem";
import DragPreview from "./DragPreview";
import { useTasks } from "../../context/TasksContext";
import { TasksAPI, type Task } from "../../backend";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useBoxSelection } from "./hooks/useBoxSelection";
import type { TaskListProps } from "./types";

/**
 * TaskList - Container component for task items with drag-and-drop and box selection
 */
export default function TaskList({
  input = false,
  isTaskPage = false,
  animation = true,
  maxTasks = null,
  setTaskNum,
}: TaskListProps) {
  const { tasks, refreshTasks } = useTasks();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invalidInput, setInvalidInput] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  
  const [parent, enableAnimations] = useAutoAnimate();
  const containerRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<string, HTMLElement>>(new Map());
  const mouseDownPos = useRef<{ x: number; y: number; taskId: string | null } | null>(null);
  
  const DRAG_THRESHOLD = 5;

  // Handle reordering via drag
  const handleReorder = useCallback(async (draggedId: string, targetId: string) => {
    setIsReordering(true);
    try {
      await TasksAPI.moveToPosition(draggedId, targetId);
      await refreshTasks();
    } finally {
      setTimeout(() => setIsReordering(false), 100);
    }
  }, [refreshTasks]);

  // Drag and drop hook
  const {
    dragState,
    isDragging,
    handleDragStart,
    handleDragMove,
    createDragHandleProps,
  } = useDragAndDrop({
    tasks,
    taskRefs: taskRefs as React.RefObject<Map<string, HTMLElement>>,
    onReorder: handleReorder,
  });

  // Box selection hook
  const {
    isSelecting,
    selectionBox,
    startSelection,
    updateSelection,
    endSelection,
    getSelectionBoxStyle,
  } = useBoxSelection({
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    taskRefs: taskRefs as React.RefObject<Map<string, HTMLElement>>,
    onSelectionChange: setSelectedIds,
  });

  // Control animations
  useEffect(() => {
    enableAnimations(animation && !isReordering && !isDragging);
  }, [animation, isReordering, isDragging, enableAnimations]);

  // Update task count in parent
  useEffect(() => {
    if (setTaskNum) setTaskNum(tasks.filter((t) => !t.completed).length);
  }, [tasks, setTaskNum]);

  // Register task refs
  const registerTaskRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      taskRefs.current.set(id, element);
    } else {
      taskRefs.current.delete(id);
    }
  }, []);

  // Mouse handlers
  const handleContainerMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const taskElement = (e.target as HTMLElement).closest('li');
    
    if (taskElement) {
      const taskId = taskElement.getAttribute('data-task-id');
      if (taskId) {
        mouseDownPos.current = { x: e.clientX, y: e.clientY, taskId };
        return;
      }
    }
    
    // Start box selection on empty space
    mouseDownPos.current = { x: e.clientX, y: e.clientY, taskId: null };
    startSelection(e.clientX, e.clientY, e.shiftKey);
  }, [startSelection]);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Check if we should start dragging
    if (mouseDownPos.current && !isDragging && !isSelecting && mouseDownPos.current.taskId) {
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > DRAG_THRESHOLD) {
        const taskId = mouseDownPos.current.taskId;
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          handleDragStart(taskId, task, e.clientX, e.clientY);
        }
        return;
      }
    }
    
    // Update box selection
    if (isSelecting) {
      updateSelection(e.clientX, e.clientY);
      return;
    }
    
    // Update drag position
    if (isDragging) {
      handleDragMove(e.clientX, e.clientY);
    }
  }, [isDragging, isSelecting, tasks, handleDragStart, handleDragMove, updateSelection]);

  const handleContainerMouseUp = useCallback(() => {
    if (isSelecting) {
      endSelection();
    }
    mouseDownPos.current = null;
  }, [isSelecting, endSelection]);

  // Add task handler
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (selectedIds.length === 0) return;

      const { key, ctrlKey, shiftKey, metaKey } = event;
      const selectedTasks = selectedIds
        .map((id) => tasks.find((t) => t.id === id))
        .filter(Boolean) as Task[];

      switch (true) {
        case key === "Enter":
          selectedTasks.forEach(async (t) => { await TasksAPI.toggleCompletion(t.id); });
          break;

        case key === "Backspace" || key === "Delete":
          selectedTasks.forEach((t) => TasksAPI.delete(t.id));
          setSelectedIds([]);
          break;

        case shiftKey && key === "ArrowUp":
          event.preventDefault();
          if (selectedTasks.length === 1) {
            setIsReordering(true);
            await TasksAPI.reorder(selectedTasks[0].id, "up");
            setTimeout(() => setIsReordering(false), 50);
          }
          break;

        case shiftKey && key === "ArrowDown":
          event.preventDefault();
          if (selectedTasks.length === 1) {
            setIsReordering(true);
            await TasksAPI.reorder(selectedTasks[0].id, "down");
            setTimeout(() => setIsReordering(false), 50);
          }
          break;

        case key === "Escape":
          setSelectedIds([]);
          break;

        case key === "d" && (ctrlKey || metaKey):
          event.preventDefault();
          selectedTasks.forEach(async (t) => {
            await TasksAPI.add(`${t.title} (copy)`);
          });
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, tasks]);

  // Selection handlers
  const handleSelect = useCallback((id: string, multiSelect: boolean) => {
    if (multiSelect) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setSelectedIds((prev) =>
        prev.length === 1 && prev[0] === id ? [] : [id]
      );
    }
  }, []);
  
  const handleExpand = useCallback(() => {
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
          className="absolute pointer-events-none z-50 rounded-lg border-2 border-blue-400 bg-blue-400/10 dark:border-blue-500 dark:bg-blue-500/10 backdrop-blur-[1px]"
          style={getSelectionBoxStyle()}
        >
          <div className="absolute inset-0 rounded-lg bg-linear-to-br from-blue-400/20 to-transparent dark:from-blue-500/20" />
        </div>
      )}

      {/* Drag Preview - floating card that follows cursor */}
      {isDragging && dragState.draggedTask && (
        <DragPreview
          task={dragState.draggedTask}
          x={dragState.currentX}
          y={dragState.currentY}
          width={containerRef.current?.offsetWidth ? containerRef.current.offsetWidth - 32 : 300}
        />
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
            const isTaskDragging = dragState.draggedTaskId === task.id;
            const isDropTarget = dragState.dropTargetId === task.id;
            
            return (
              <div
                key={task.id}
                ref={(el) => registerTaskRef(task.id, el)}
              >
                <TaskItem
                  task={task}
                  onUpdate={TasksAPI.update}
                  onDelete={TasksAPI.delete}
                  isSelected={selectedIds.includes(task.id)}
                  onSelect={(multiSelect) => handleSelect(task.id, multiSelect)}
                  onExpand={handleExpand}
                  animation={animation}
                  isDragging={isTaskDragging}
                  dragHandleProps={createDragHandleProps(task.id, task)}
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
