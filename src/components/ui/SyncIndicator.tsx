import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  IoCloudDone, 
  IoCloudOffline, 
  IoSync, 
  IoWarning,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoRefresh
} from "react-icons/io5";
import { useTasks } from "../../context/TasksContext";
import type { SyncStatus } from "../../backend";

interface StatusConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
  dotClass: string;
}

const statusConfigs: Record<SyncStatus, StatusConfig> = {
  disabled: {
    label: "Local Only",
    description: "Sync disabled – data stored locally in SQLite",
    icon: <IoCloudOffline size={16} />,
    iconClass: "text-neutral-400",
    dotClass: "bg-neutral-400",
  },
  connecting: {
    label: "Connecting",
    description: "Connecting to CouchDB server...",
    icon: <IoSync size={16} className="animate-spin" />,
    iconClass: "text-amber-500",
    dotClass: "bg-amber-500",
  },
  syncing: {
    label: "Syncing",
    description: "Syncing SQLite with CouchDB...",
    icon: <IoSync size={16} className="animate-spin" />,
    iconClass: "text-blue-500",
    dotClass: "bg-blue-500",
  },
  paused: {
    label: "Synced",
    description: "All changes saved locally and synced",
    icon: <IoCloudDone size={16} />,
    iconClass: "text-emerald-500",
    dotClass: "bg-emerald-500",
  },
  idle: {
    label: "Local Only",
    description: "Data stored locally in SQLite",
    icon: <IoCloudOffline size={16} />,
    iconClass: "text-neutral-400",
    dotClass: "bg-neutral-400",
  },
  error: {
    label: "Sync Error",
    description: "Could not connect to CouchDB",
    icon: <IoWarning size={16} />,
    iconClass: "text-red-500",
    dotClass: "bg-red-500",
  },
};

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return "Never";
  
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Popup content
function SyncPopup({ 
  onClose,
  position,
  syncState,
  onRetry
}: { 
  onClose: () => void;
  position: { top: number; left: number };
  syncState: { status: SyncStatus; lastSynced?: number; error?: string };
  onRetry: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const config = statusConfigs[syncState.status] || statusConfigs.idle;
  
  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  
  return createPortal(
    <div 
      ref={popupRef}
      style={{
        position: "fixed",
        bottom: window.innerHeight - position.top + 8,
        left: position.left,
        zIndex: 9999,
      }}
      className="w-72 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 ${config.iconClass}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {config.label}
              </span>
              <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {config.description}
            </p>
          </div>
        </div>
      </div>
      
      {/* Details */}
      <div className="p-3 space-y-2">
        {/* Storage info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">Local storage</span>
          <span className="text-neutral-700 dark:text-neutral-300 font-medium">
            SQLite
          </span>
        </div>
        
        {/* Last synced */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">Last synced</span>
          <span className="text-neutral-700 dark:text-neutral-300 font-medium">
            {formatTimeAgo(syncState.lastSynced)}
          </span>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500 dark:text-neutral-400">CouchDB</span>
          <div className="flex items-center gap-1.5">
            {syncState.status === "paused" && (
              <IoCheckmarkCircle size={14} className="text-emerald-500" />
            )}
            {syncState.status === "error" && (
              <IoCloseCircle size={14} className="text-red-500" />
            )}
            <span className={`font-medium ${
              syncState.status === "paused" ? "text-emerald-600 dark:text-emerald-400" :
              syncState.status === "error" ? "text-red-600 dark:text-red-400" :
              syncState.status === "syncing" || syncState.status === "connecting" ? "text-blue-600 dark:text-blue-400" :
              "text-neutral-600 dark:text-neutral-400"
            }`}>
              {syncState.status === "paused" ? "Connected" : 
               syncState.status === "error" ? "Disconnected" :
               syncState.status === "syncing" ? "Syncing" :
               syncState.status === "connecting" ? "Connecting" :
               "Not configured"}
            </span>
          </div>
        </div>
        
        {/* Error message */}
        {syncState.error && (
          <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
              {syncState.error}
            </p>
          </div>
        )}
      </div>
      
      {/* Actions */}
      {(syncState.status === "error" || syncState.status === "paused") && (
        <div className="p-2 border-t border-neutral-100 dark:border-neutral-700">
          <button
            onClick={() => {
              onRetry();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <IoRefresh size={16} />
            <span>{syncState.status === "error" ? "Retry Sync" : "Sync Now"}</span>
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

// Compact indicator for sidebar
export function SyncIndicatorCompact({ isExpanded = true }: { isExpanded?: boolean }) {
  const { syncState, restartSync } = useTasks();
  const [showPopup, setShowPopup] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const config = statusConfigs[syncState.status] || statusConfigs.idle;
  
  const handleClick = () => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      top: rect.top,
      left: rect.left,
    });
    setShowPopup(true);
  };
  
  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`group flex items-center gap-2 w-full px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
          showPopup ? "bg-neutral-100 dark:bg-neutral-800" : ""
        }`}
      >
        <div className={`relative ${config.iconClass}`}>
          {config.icon}
          {/* Animated pulse for syncing */}
          {(syncState.status === "syncing" || syncState.status === "connecting") && (
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${config.dotClass} animate-pulse`} />
          )}
          {/* Error dot */}
          {syncState.status === "error" && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>
        
        {isExpanded && (
          <div className="flex-1 flex items-center justify-between min-w-0">
            <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
              {config.label}
            </span>
            {syncState.lastSynced && syncState.status === "paused" && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {formatTimeAgo(syncState.lastSynced)}
              </span>
            )}
          </div>
        )}
      </button>
      
      {showPopup && (
        <SyncPopup
          onClose={() => setShowPopup(false)}
          position={position}
          syncState={syncState}
          onRetry={restartSync}
        />
      )}
    </>
  );
}

// Default export - floating indicator
export default function SyncIndicator() {
  const { syncState, restartSync } = useTasks();
  const [showPopup, setShowPopup] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const config = statusConfigs[syncState.status] || statusConfigs.idle;
  
  const handleClick = () => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom,
      left: Math.max(16, rect.right - 288),
    });
    setShowPopup(true);
  };
  
  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`fixed top-4 right-4 z-40 p-2.5 rounded-xl bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700 hover:shadow-xl hover:scale-105 transition-all duration-200 ${
          showPopup ? "ring-2 ring-blue-500/50" : ""
        }`}
      >
        <div className={`relative ${config.iconClass}`}>
          {config.icon}
          {(syncState.status === "syncing" || syncState.status === "connecting") && (
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${config.dotClass} animate-pulse`} />
          )}
          {syncState.status === "error" && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          )}
          {syncState.status === "paused" && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
          )}
        </div>
      </button>
      
      {showPopup && (
        <SyncPopup
          onClose={() => setShowPopup(false)}
          position={{ top: position.top + 8, left: position.left }}
          syncState={syncState}
          onRetry={restartSync}
        />
      )}
    </>
  );
}
