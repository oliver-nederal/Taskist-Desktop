import { useState, useRef, useCallback, useEffect } from "react";
import type { Task } from "../../../backend";
import type { DragState, DragHandleProps } from "../types";

interface UseDragAndDropOptions {
  tasks: Task[];
  taskRefs: React.RefObject<Map<string, HTMLElement>>;
  onReorder: (draggedId: string, targetId: string) => Promise<void>;
}

interface UseDragAndDropReturn {
  dragState: DragState;
  isDragging: boolean;
  handleDragStart: (taskId: string, task: Task, x: number, y: number) => void;
  handleDragMove: (x: number, y: number) => void;
  handleDragEnd: () => Promise<void>;
  createDragHandleProps: (taskId: string, task: Task) => DragHandleProps;
  resetDrag: () => void;
}

const INITIAL_DRAG_STATE: DragState = {
  isDragging: false,
  draggedTaskId: null,
  draggedTask: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  dropTargetId: null,
};

export function useDragAndDrop({
  tasks,
  taskRefs,
  onReorder,
}: UseDragAndDropOptions): UseDragAndDropReturn {
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);
  const isProcessingRef = useRef(false);

  const handleDragStart = useCallback((taskId: string, task: Task, x: number, y: number) => {
    setDragState({
      isDragging: true,
      draggedTaskId: taskId,
      draggedTask: task,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      dropTargetId: null,
    });
  }, []);

  const handleDragMove = useCallback((x: number, y: number) => {
    if (!dragState.isDragging || !dragState.draggedTaskId) return;

    let hoveredId: string | null = null;
    
    taskRefs.current?.forEach((element, id) => {
      if (id === dragState.draggedTaskId) return;
      
      const rect = element.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        hoveredId = id;
      }
    });

    setDragState(prev => ({
      ...prev,
      currentX: x,
      currentY: y,
      dropTargetId: hoveredId,
    }));
  }, [dragState.isDragging, dragState.draggedTaskId, taskRefs]);

  const handleDragEnd = useCallback(async () => {
    if (isProcessingRef.current) return;
    
    const { isDragging, dropTargetId, draggedTaskId } = dragState;
    
    if (isDragging && dropTargetId && draggedTaskId) {
      isProcessingRef.current = true;
      try {
        await onReorder(draggedTaskId, dropTargetId);
      } finally {
        isProcessingRef.current = false;
      }
    }
    
    setDragState(INITIAL_DRAG_STATE);
  }, [dragState, onReorder]);

  const resetDrag = useCallback(() => {
    setDragState(INITIAL_DRAG_STATE);
  }, []);

  const createDragHandleProps = useCallback((taskId: string, task: Task): DragHandleProps => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleDragStart(taskId, task, e.clientX, e.clientY);
    },
    onTouchStart: (e: React.TouchEvent) => {
      e.stopPropagation();
      const touch = e.touches[0];
      handleDragStart(taskId, task, touch.clientX, touch.clientY);
    },
  }), [handleDragStart]);

  // Global mouse up to handle drops outside container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.isDragging) {
        handleDragEnd();
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        handleDragMove(e.clientX, e.clientY);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [dragState.isDragging, handleDragEnd, handleDragMove]);

  return {
    dragState,
    isDragging: dragState.isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    createDragHandleProps,
    resetDrag,
  };
}
