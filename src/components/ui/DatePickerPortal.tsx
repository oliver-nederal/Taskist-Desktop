import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  IoSunnyOutline, 
  IoCalendarOutline, 
  IoCalendarClearOutline,
  IoChevronBack, 
  IoChevronForward,
  IoClose
} from "react-icons/io5";
import { LuSofa } from "react-icons/lu";

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

// Helper functions
function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextWeekday(dayOfWeek: number): Date {
  const today = getToday();
  const currentDay = today.getDay();
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const result = new Date(today);
  result.setDate(result.getDate() + daysUntil);
  return result;
}

function getNextWeekend(): Date {
  return getNextWeekday(6); // Saturday
}

function getNextMonday(): Date {
  return getNextWeekday(1);
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = getToday();
  
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

// Preset options
interface PresetOption {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  getDate: () => Date | null;
}

function getPresets(): PresetOption[] {
  const today = getToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextMonday = getNextMonday();
  const nextWeekend = getNextWeekend();
  
  return [
    {
      id: "tomorrow",
      label: "Tomorrow",
      sublabel: tomorrow.toLocaleDateString("en-US", { weekday: "short" }),
      icon: <IoSunnyOutline size={18} className="text-yellow-500" />,
      getDate: () => tomorrow,
    },
    {
      id: "next-week",
      label: "Next week",
      sublabel: nextMonday.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }),
      icon: <IoCalendarOutline size={18} className="text-purple-500" />,
      getDate: () => nextMonday,
    },
    {
      id: "next-weekend",
      label: "Next weekend",
      sublabel: nextWeekend.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }),
      icon: <LuSofa size={18} className="text-blue-500" />,
      getDate: () => nextWeekend,
    },
    {
      id: "no-date",
      label: "No Date",
      icon: <IoCalendarClearOutline size={18} className="text-neutral-400" />,
      getDate: () => null,
    },
  ];
}

// Calendar component
function Calendar({ 
  selectedDate, 
  onSelect, 
  currentMonth, 
  onMonthChange 
}: { 
  selectedDate: string | null;
  onSelect: (date: string) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}) {
  const today = getToday();
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
  // Convert to Monday-start week (0 = Monday, 6 = Sunday)
  let startDay = firstDay.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;
  
  const days: (number | null)[] = [];
  
  // Add empty cells for days before the 1st
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  
  // Add actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  // Pad to complete the grid
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  
  const goToPrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };
  
  const isToday = (day: number): boolean => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };
  
  const isSelected = (day: number): boolean => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate + "T00:00:00");
    return (
      day === selected.getDate() &&
      month === selected.getMonth() &&
      year === selected.getFullYear()
    );
  };
  
  const isPast = (day: number): boolean => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };
  
  const handleDayClick = (day: number) => {
    if (isPast(day)) return;
    const date = new Date(year, month, day);
    onSelect(formatDateString(date));
  };
  
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
  
  return (
    <div className="select-none">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 transition-colors"
          >
            <IoChevronBack size={16} />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 transition-colors"
          >
            <IoChevronForward size={16} />
          </button>
        </div>
      </div>
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((day, i) => (
          <div
            key={i}
            className={`text-center text-xs font-medium py-1 ${
              i >= 5 ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={i} className="w-8 h-8" />;
          }
          
          const past = isPast(day);
          const selected = isSelected(day);
          const todayDay = isToday(day);
          const isWeekend = i % 7 >= 5;
          
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={past}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                selected
                  ? "bg-red-500 text-white"
                  : todayDay
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : past
                      ? "text-neutral-300 dark:text-neutral-600 cursor-not-allowed"
                      : isWeekend
                        ? "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Natural language parser
function parseNaturalDate(input: string): Date | null {
  const lower = input.toLowerCase().trim();
  const today = getToday();
  
  if (lower === "today" || lower === "tod") {
    return today;
  }
  
  if (lower === "tomorrow" || lower === "tom" || lower === "tmr") {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }
  
  if (lower === "next week" || lower === "nw") {
    return getNextMonday();
  }
  
  if (lower === "next weekend" || lower === "weekend") {
    return getNextWeekend();
  }
  
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayIndex = days.findIndex(d => lower.startsWith(d.substring(0, 3)));
  if (dayIndex !== -1) {
    return getNextWeekday(dayIndex);
  }
  
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    parsed.setHours(0, 0, 0, 0);
    if (parsed >= today) {
      return parsed;
    }
  }
  
  return null;
}

// Dropdown content
function DatePickerDropdown({ 
  selectedDate, 
  onSelect, 
  onClose,
  position 
}: { 
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
  onClose: () => void;
  position: { top: number; left: number; openAbove: boolean };
}) {
  const [naturalInput, setNaturalInput] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      return new Date(selectedDate + "T00:00:00");
    }
    return getToday();
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const presets = getPresets();
  
  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);
  
  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Delay adding listener to avoid immediate close
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  
  const handlePresetClick = (preset: PresetOption) => {
    const date = preset.getDate();
    onSelect(date ? formatDateString(date) : null);
    onClose();
  };
  
  const handleCalendarSelect = (dateStr: string) => {
    onSelect(dateStr);
    onClose();
  };
  
  const handleNaturalInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const parsed = parseNaturalDate(naturalInput);
      if (parsed) {
        onSelect(formatDateString(parsed));
        onClose();
      }
    }
  };
  
  const dropdownStyle: React.CSSProperties = {
    position: "fixed",
    left: position.left,
    zIndex: 9999,
    ...(position.openAbove 
      ? { bottom: window.innerHeight - position.top + 4 }
      : { top: position.top + 4 }
    ),
  };
  
  return createPortal(
    <div 
      ref={dropdownRef}
      style={dropdownStyle}
      className="w-72 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
    >
      {/* Natural Language Input */}
      <div className="p-2 border-b border-neutral-100 dark:border-neutral-700">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            onKeyDown={handleNaturalInputKeyDown}
            placeholder="Type a date..."
            className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300 placeholder:text-blue-400 dark:placeholder:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
          />
          {naturalInput && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
              Press Enter
            </div>
          )}
        </div>
      </div>
      
      {/* Presets */}
      <div className="p-1 border-b border-neutral-100 dark:border-neutral-700">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {preset.icon}
              <span className="text-sm text-neutral-700 dark:text-neutral-300">{preset.label}</span>
            </div>
            {preset.sublabel && (
              <span className="text-xs text-neutral-400">{preset.sublabel}</span>
            )}
          </button>
        ))}
      </div>
      
      {/* Calendar */}
      <div className="p-3">
        <Calendar
          selectedDate={selectedDate}
          onSelect={handleCalendarSelect}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
      </div>
    </div>,
    document.body
  );
}

// Main DatePicker component
export default function DatePicker({ value, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, openAbove: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  const openPicker = useCallback(() => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 450; // Approximate height of dropdown
    
    // Check if there's enough space below
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    
    setPosition({
      top: openAbove ? rect.top : rect.bottom,
      left: Math.min(rect.left, window.innerWidth - 288 - 16), // Keep within viewport
      openAbove,
    });
    setIsOpen(true);
  }, []);
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };
  
  return (
    <>
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
      
      {isOpen && (
        <DatePickerDropdown
          selectedDate={value}
          onSelect={onChange}
          onClose={() => setIsOpen(false)}
          position={position}
        />
      )}
    </>
  );
}
