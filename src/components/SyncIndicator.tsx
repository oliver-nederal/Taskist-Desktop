import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { FaCloud, FaCloudUploadAlt, FaExclamationTriangle } from "react-icons/fa";
import { useTasks } from "../context/TasksContext";

const statusCopy: Record<string, { label: string; color: string; bgColor: string; icon: ReactElement }> = {
  connecting: {
    label: "Connecting…",
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    icon: <FaCloud className="w-5 h-5" />,
  },
  syncing: {
    label: "Syncing",
    color: "text-sky-500",
    bgColor: "bg-sky-500",
    icon: <FaCloudUploadAlt className="w-5 h-5 animate-spin" />,
  },
  paused: {
    label: "Up to date",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500",
    icon: <FaCloud className="w-5 h-5" />,
  },
  idle: {
    label: "Idle",
    color: "text-slate-400",
    bgColor: "bg-slate-400",
    icon: <FaCloud className="w-5 h-5" />,
  },
  error: {
    label: "Sync error",
    color: "text-rose-500",
    bgColor: "bg-rose-500",
    icon: <FaExclamationTriangle className="w-5 h-5" />,
  },
};

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleTimeString();
}

export default function SyncIndicator() {
  const { syncState } = useTasks();
  const [isHovered, setIsHovered] = useState(false);

  const display = useMemo(() => {
    const fallback = statusCopy.idle;
    return statusCopy[syncState.status] ?? fallback;
  }, [syncState.status]);

  const lastSynced = formatTimestamp(syncState.lastSynced);

  return (
    <div 
      className="fixed bottom-4 right-4 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon button */}
      <div className="p-2 cursor-pointer hover:scale-110 transition-transform duration-200">
        <span className={display.color}>{display.icon}</span>
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-2 rounded-lg bg-white shadow-xl border border-gray-200 px-3 py-2 text-xs min-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col space-y-1">
            <span className={`font-semibold ${display.color} flex items-center space-x-1`}>
              <span>{display.label}</span>
            </span>
            <span className="text-gray-600">Last synced: {lastSynced}</span>
            {syncState.error && (
              <span className="text-rose-500 max-w-[220px] line-clamp-2 pt-1 border-t border-gray-100">
                {syncState.error}
              </span>
            )}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute -bottom-1 right-4 w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45" />
        </div>
      )}
    </div>
  );
}
