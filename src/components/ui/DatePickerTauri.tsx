import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { IoCalendarOutline, IoClose } from "react-icons/io5";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  if (dateOnly.getTime() === today.getTime()) return "Today";
  if (dateOnly.getTime() === tomorrow.getTime()) return "Tomorrow";
  
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  
  if (dateOnly < weekFromNow && dateOnly > today) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  // Listen for date selection from popup
  useEffect(() => {
    const unlisten = listen<string | null>("date-selected", (event) => {
      onChange(event.payload);
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, [onChange]);
  
  const openPicker = async (e: React.MouseEvent) => {
    if (!triggerRef.current) return;
    
    try {
      const rect = triggerRef.current.getBoundingClientRect();
      
      // Use screenX/screenY from the click event - these are already in screen coordinates
      // The click event gives us the cursor position on screen
      const mainWindow = getCurrentWindow();
      const scaleFactor = await mainWindow.scaleFactor();
      
      // screenX/screenY from MouseEvent are in screen coordinates (logical pixels on Windows)
      // We need to convert to physical pixels for Tauri window positioning
      const clickScreenX = Math.round(e.screenX * scaleFactor);
      const clickScreenY = Math.round(e.screenY * scaleFactor);
      
      // Calculate where the button is relative to where we clicked
      const clickInButtonX = e.clientX - rect.left;
      const clickInButtonY = e.clientY - rect.top;
      
      // Calculate button edges in screen coordinates
      const buttonX = Math.round(clickScreenX - clickInButtonX * scaleFactor);
      const buttonTop = Math.round(clickScreenY - clickInButtonY * scaleFactor);
      const buttonBottom = Math.round(buttonTop + rect.height * scaleFactor);
      
      // Get available screen height in physical pixels
      const screenHeight = Math.round(window.screen.availHeight * scaleFactor);
      
      console.log("Date picker positioning:", {
        clickScreen: { x: e.screenX, y: e.screenY },
        clickInButton: { x: clickInButtonX, y: clickInButtonY },
        rect: { left: rect.left, top: rect.top, height: rect.height },
        scaleFactor,
        computed: { buttonX, buttonTop, buttonBottom, screenHeight }
      });
      
      await invoke("open_date_picker_popup", {
        buttonX,
        buttonTop,
        buttonBottom,
        screenHeight,
        currentDate: value,
      });
    } catch (error) {
      console.error("Failed to open date picker:", error);
    }
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };
  
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={openPicker}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
        value
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      }`}
    >
      <IoCalendarOutline size={14} />
      <span>{value ? formatDisplayDate(value) : "Date"}</span>
      {value && (
        <IoClose
          size={12}
          className="ml-0.5 hover:text-blue-800 dark:hover:text-blue-200"
          onClick={handleClear}
        />
      )}
    </button>
  );
}
