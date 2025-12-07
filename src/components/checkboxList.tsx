import React, { useState, useEffect } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import Checkbox from "./checkbox";
import { useTasks } from "../context/TasksContext";
import {
  addTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
  reorderTasks,
} from "../db";
import type { Task } from "../db";

interface CheckboxListProps {
  input?: boolean;
  isTaskPage?: boolean;
  animation?: boolean;
  maxTasks?: number | null;
  setTaskNum?: (taskNum: number) => void;
}

export default function CheckboxList({
  input = false,
  isTaskPage = false,
  animation = true,
  maxTasks = null,
  setTaskNum,
}: CheckboxListProps) {
  const { tasks } = useTasks();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invalidInput, setInvalidInput] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [parent, enableAnimations] = useAutoAnimate();
  const [isReordering, setIsReordering] = useState(false);

  // Control animations based on animation prop and reordering state
  useEffect(() => {
    enableAnimations(animation && !isReordering);
  }, [animation, isReordering]);

  // optional: update count in parent
  useEffect(() => {
    if (setTaskNum) setTaskNum(tasks.filter((t) => !t.completed).length);
  }, [tasks, setTaskNum]);

  const handleAddTask = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const value = event.currentTarget.value.trim();

    if (value.length >= 3 && value.length <= 50) {
      await addTask(value);
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
  if (selectedIds.length === 0) return;

  const { key, ctrlKey, shiftKey, metaKey } = event;
  console.log("Key pressed:", key);

  const selectedTasks = selectedIds
    .map((id) => tasks.find((t) => t._id === id))
    .filter(Boolean) as Task[];

  // helper to update or delete in bulk
  const updateMany = (updater: (t: Task) => void | Promise<void>) => {
    selectedTasks.forEach(updater);
  };

  switch (true) {
    case key === "Enter":
      updateMany(async (t) => { await toggleTaskCompletion(t); });
      break;

    case key === "Backspace" || key === "Delete":
      updateMany((t) => deleteTask(t));
      setSelectedIds([]);
      break;

    // ✏️ Edit first selected
    case key === "e" && !ctrlKey && !shiftKey:
      event.preventDefault();
      const first = selectedTasks[0];
      if (first) {
        const newTitle = prompt("Edit task:", first.title);
        if (newTitle && newTitle.trim().length >= 3) {
          updateTask({ ...first, title: newTitle.trim() });
        }
      }
      break;

    //move up (Shift + ArrowUp)
    case shiftKey && key === "ArrowUp":
      event.preventDefault();
      console.log("Moving task up, selected:", selectedTasks.length);
      if (selectedTasks.length === 1) {
        setIsReordering(true);
        await reorderTasks(selectedTasks[0]._id, "up");
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
        await reorderTasks(selectedTasks[0]._id, "down");
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
        await addTask(`${t.title} (copy)`);
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

  const toggleSelectedId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-full w-full relative">
      <ul
        ref={parent}
        className="pb-12 px-6 h-full space-y-0 transition-all"
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
            return (
              <Checkbox
                key={task._id}
                task={task}
                onUpdate={updateTask}
                onDelete={deleteTask}
                isSelected={selectedIds.includes(task._id)}
                onSelect={() => toggleSelectedId(task._id)}
                animation={animation}
              />
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
