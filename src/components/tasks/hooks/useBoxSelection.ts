import { useState, useRef, useCallback, useEffect } from "react";
import type { SelectionBox } from "../types";

interface UseBoxSelectionOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  taskRefs: React.RefObject<Map<string, HTMLElement>>;
  onSelectionChange: (ids: string[]) => void;
  preserveOnShift?: boolean;
}

interface UseBoxSelectionReturn {
  isSelecting: boolean;
  selectionBox: SelectionBox | null;
  startSelection: (x: number, y: number, shiftKey: boolean) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  getSelectionBoxStyle: () => React.CSSProperties;
}

export function useBoxSelection({
  containerRef,
  taskRefs,
  onSelectionChange,
}: UseBoxSelectionOptions): UseBoxSelectionReturn {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const previousSelectionRef = useRef<string[]>([]);

  const getIntersectingTasks = useCallback((box: SelectionBox): string[] => {
    if (!containerRef.current) return [];
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Normalize box coordinates (handle dragging in any direction)
    const boxLeft = Math.min(box.startX, box.currentX);
    const boxRight = Math.max(box.startX, box.currentX);
    const boxTop = Math.min(box.startY, box.currentY);
    const boxBottom = Math.max(box.startY, box.currentY);
    
    const intersecting: string[] = [];
    
    taskRefs.current?.forEach((element, id) => {
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
  }, [containerRef, taskRefs]);

  const startSelection = useCallback((clientX: number, clientY: number, shiftKey: boolean) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;
    
    if (!shiftKey) {
      previousSelectionRef.current = [];
      onSelectionChange([]);
    }
    
    setIsSelecting(true);
    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
  }, [containerRef, onSelectionChange]);

  const updateSelection = useCallback((clientX: number, clientY: number) => {
    if (!isSelecting || !selectionBox) return;
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;
    
    const newBox = {
      ...selectionBox,
      currentX: x,
      currentY: y,
    };
    
    setSelectionBox(newBox);
    
    // Update selected tasks in real-time
    const intersecting = getIntersectingTasks(newBox);
    const combined = [...new Set([...previousSelectionRef.current, ...intersecting])];
    onSelectionChange(combined);
  }, [isSelecting, selectionBox, containerRef, getIntersectingTasks, onSelectionChange]);

  const endSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectionBox(null);
  }, []);

  const getSelectionBoxStyle = useCallback((): React.CSSProperties => {
    if (!selectionBox) return { display: 'none' };
    
    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);
    
    return { left, top, width, height };
  }, [selectionBox]);

  // Global mouse up to end selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        endSelection();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, endSelection]);

  return {
    isSelecting,
    selectionBox,
    startSelection,
    updateSelection,
    endSelection,
    getSelectionBoxStyle,
  };
}
