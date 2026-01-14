/* Fallback Task type for this component when backend types are unavailable */
type Task = {
  id?: string;
  title: string;
  completed: boolean;
  description?: string;
  dueDate?: string;
};

interface DragPreviewProps {
  task: Task;
  x: number;
  y: number;
  width?: number;
}

/**
 * Floating card preview that follows the cursor during drag operations
 */
export function DragPreview({ task, x, y, width = 300 }: DragPreviewProps) {
  return (
    <div
      className="fixed pointer-events-none z-1000"
      style={{
        left: x,
        top: y,
        width: width,
        transform: 'translate(-50%, -50%) rotate(-2deg)',
      }}
    >
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl ring-2 ring-blue-500 dark:ring-blue-400 p-3 opacity-95">
        <div className="flex items-center gap-3">
          {/* Checkbox visual */}
          <span className="relative inline-block h-5 w-5 shrink-0">
            <span 
              className={`block h-5 w-5 rounded-full border-2 ${
                task.completed 
                  ? "bg-green-500 border-green-500" 
                  : "border-neutral-300 dark:border-neutral-600"
              }`}
            >
              {task.completed && (
                <svg
                  viewBox="0 0 24 24"
                  className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </span>
          
          {/* Task title */}
          <span className={`font-medium text-sm truncate ${
            task.completed 
              ? "text-neutral-400 line-through" 
              : "text-neutral-800 dark:text-neutral-200"
          }`}>
            {task.title}
          </span>
        </div>
        
        {/* Optional meta info */}
        {(task.description || task.dueDate) && (
          <div className="flex items-center gap-2 mt-1.5 ml-8 text-xs text-neutral-500">
            {task.description && (
              <span className="truncate max-w-[150px]">{task.description}</span>
            )}
            {task.dueDate && (
              <span className="text-blue-500">{task.dueDate}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DragPreview;
