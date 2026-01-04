import { useState, useCallback, useRef, useEffect } from "react";
import { IoMdCalendar } from "react-icons/io";
import { IoClose, IoCalendarOutline, IoFlagOutline, IoChevronDown, IoReorderTwo } from "react-icons/io5";
import { TasksAPI, type Task } from "../../backend";
import { isOverdue, isDueToday, formatDueDate, getTodayString } from "./dateUtils";
import { PROJECTS, type TaskItemProps } from "./types";

/**
 * TaskItem - Individual task component with inline editing, selection, and drag support
 */
function TaskItem({
  task,
  onUpdate,
  onDelete: _onDelete,
  isSelected,
  onSelect,
  onExpand,
  animation,
  isDragging = false,
  dragHandleProps,
  isDropTarget = false,
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editDueDate, setEditDueDate] = useState(task.dueDate || "");
  const [editProject, setEditProject] = useState((task as any).project || "inbox");
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  
  const cardRef = useRef<HTMLLIElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);

  // Sync local state when task changes externally
  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditDueDate(task.dueDate || "");
    setEditProject((task as any).project || "inbox");
  }, [task]);

  // Focus title input when expanded
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Click outside to close expanded view
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        handleSave();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isExpanded]);

  // Close project dropdown when clicking outside
  useEffect(() => {
    if (!showProjectDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProjectDropdown]);

  // Cleanup click timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleCheckboxChange = useCallback((e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    onUpdate({
      ...task,
      completed: !task.completed,
    });
  }, [task, onUpdate]);

  // Improved click handling - distinguishes single vs double click
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isExpanded) return;
    
    // Don't interfere with checkbox clicks
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
    
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    
    // Clear any pending single-click action
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      // This was a double-click
      setIsExpanded(true);
      onExpand();
      return;
    }
    
    // Delay single-click action to check for double-click
    clickTimeoutRef.current = window.setTimeout(() => {
      clickTimeoutRef.current = null;
      onSelect(isMultiSelect);
    }, 200);
  }, [isExpanded, onSelect, onExpand]);

  const handleSave = async () => {
    if (!editTitle.trim()) {
      handleCancel();
      return;
    }
    
    const updatedTask: Task = {
      ...task,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      dueDate: editDueDate || undefined,
    };
    (updatedTask as any).project = editProject;
    
    await TasksAPI.update(updatedTask);
    onUpdate(updatedTask);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditDueDate(task.dueDate || "");
    setEditProject((task as any).project || "inbox");
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const clearDate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditDueDate("");
  };

  const selectProject = (projectId: string) => {
    setEditProject(projectId);
    setShowProjectDropdown(false);
  };

  const today = getTodayString();
  const currentProject = PROJECTS.find(p => p.id === editProject) || PROJECTS[0];
  
  const titleClasses = `
    relative text-gray-800 dark:text-neutral-300 select-none line-clamp-1 text-sm
    ${!animation && task.completed ? "line-through text-gray-500" : ""}
  `;

  return (
    <li 
      ref={cardRef}
      data-task-id={task.id}
      className={`list-none transition-all duration-200 ease-out group ${
        isExpanded ? "z-10 relative cursor-default" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-30 scale-[0.98]" : ""}`}
    >
      <div
        className={`rounded-xl transition-all duration-200 ease-out ${
          isExpanded
            ? "bg-white dark:bg-neutral-800 ring-1 ring-neutral-200 dark:ring-neutral-700 shadow-lg transform scale-[1.01]"
            : isDropTarget
              ? "bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 dark:ring-blue-500 shadow-lg scale-[1.02]"
              : isSelected 
                ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-700 shadow-md" 
                : "hover:bg-gray-50/80 dark:hover:bg-neutral-800/50 hover:shadow-sm"
        }`}
      >
        {/* Main Task Row */}
        <div
          className="flex items-center w-full p-2.5 transition-all duration-200"
          onClick={handleClick}
        >
          {/* Drag Handle */}
          <div
            className={`flex items-center justify-center w-5 h-5 mr-1 rounded transition-all duration-150 cursor-grab active:cursor-grabbing ${
              isSelected || isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-60"
            } text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300`}
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
          >
            <IoReorderTwo size={16} />
          </div>

          {/* Checkbox */}
          <span className="relative inline-block h-5 w-5 shrink-0 mr-3">
            <input
              id={`task-checkbox-${task.id}`}
              type="checkbox"
              className="peer appearance-none border-2 border-neutral-300 dark:border-neutral-600 focus:ring-0 h-5 w-5 rounded-full cursor-pointer checked:bg-green-500 checked:border-green-500 transition-all duration-150 ease-in-out hover:border-green-400"
              checked={task.completed}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()} 
              aria-checked={task.completed}
            />
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity duration-150 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>

          {/* Task Info */}
          <div className="flex-1 min-w-0">
            {isExpanded ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Task name"
                className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className={titleClasses}>
                <span className="relative inline-block">
                  {task.title}
                  {animation && (
                    <span
                      className={`absolute left-0 top-1/2 h-px bg-current transition-all duration-500 ease-out ${
                        task.completed ? "w-full" : "w-0"
                      }`}
                    />
                  )}
                </span>
              </div>
            )}
            
            {isExpanded ? (
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add description..."
                className="w-full bg-transparent text-xs text-neutral-500 dark:text-neutral-400 placeholder:text-neutral-400 focus:outline-none mt-0.5"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (task.dueDate || (task as any).project || task.description) && (
              <div className="flex items-center gap-2 mt-0.5">
                {task.description && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[120px]">
                    {task.description}
                  </span>
                )}
                {task.dueDate && (
                  <span className={`inline-flex items-center gap-1 text-xs ${
                    isOverdue(task.dueDate) && !task.completed
                      ? "text-red-500"
                      : isDueToday(task.dueDate)
                        ? "text-orange-500"
                        : "text-neutral-500 dark:text-neutral-400"
                  }`}>
                    <IoMdCalendar className="w-3 h-3" />
                    {formatDueDate(task.dueDate)}
                  </span>
                )}
                {(task as any).project && (task as any).project !== "inbox" && (
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className={`w-2 h-2 rounded-full ${PROJECTS.find(p => p.id === (task as any).project)?.color || "bg-neutral-400"}`} />
                    {PROJECTS.find(p => p.id === (task as any).project)?.name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expandable Details */}
        <div
          className={`grid transition-all duration-300 ease-out ${
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-3 pb-3 pt-1 space-y-3">
              <div className="h-px bg-neutral-100 dark:bg-neutral-700" />

              <div className="flex flex-wrap gap-2">
                {/* Date Picker */}
                <div className="relative">
                  <label
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      editDueDate
                        ? isOverdue(editDueDate) 
                          ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : isDueToday(editDueDate)
                            ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                            : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IoCalendarOutline size={14} />
                    <span>{editDueDate ? formatDueDate(editDueDate) : "Due date"}</span>
                    {editDueDate && (
                      <IoClose
                        size={14}
                        className="hover:text-red-500 cursor-pointer"
                        onClick={clearDate}
                      />
                    )}
                    <input
                      type="date"
                      min={today}
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </label>
                </div>

                {/* Project Picker */}
                <div className="relative" ref={projectDropdownRef}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setShowProjectDropdown(!showProjectDropdown); }}
                  >
                    <span className={`w-2 h-2 rounded-full ${currentProject.color}`} />
                    <span>{currentProject.name}</span>
                    <IoChevronDown size={12} className={`transition-transform ${showProjectDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {showProjectDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg ring-1 ring-neutral-200 dark:ring-neutral-700 py-1 z-20">
                      {PROJECTS.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${
                            editProject === project.id ? "bg-neutral-50 dark:bg-neutral-700/50" : ""
                          }`}
                          onClick={(e) => { e.stopPropagation(); selectProject(project.id); }}
                        >
                          <span className={`w-2 h-2 rounded-full ${project.color}`} />
                          <span className="text-neutral-700 dark:text-neutral-300">{project.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority (placeholder) */}
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IoFlagOutline size={14} />
                  <span>Priority</span>
                </button>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSave(); }}
                    disabled={!editTitle.trim()}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default TaskItem;
