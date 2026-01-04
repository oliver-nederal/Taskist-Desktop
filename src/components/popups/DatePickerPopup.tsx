import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  IoSunnyOutline, 
  IoCalendarOutline, 
  IoCalendarClearOutline,
  IoChevronBack, 
  IoChevronForward,
  IoTimeOutline,
  IoRepeatOutline
} from "react-icons/io5";
import { LuSofa } from "react-icons/lu";

// Helper functions
function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0];
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
  return getNextWeekday(6);
}

function getNextMonday(): Date {
  return getNextWeekday(1);
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
  
  let startDay = firstDay.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;
  
  const days: (number | null)[] = [];
  
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(null);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
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

// Main Popup Component
export default function DatePickerPopup() {
  // Get initial date from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const initialDate = urlParams.get("date");
  
  const [selectedDate] = useState<string | null>(initialDate);
  const [naturalInput, setNaturalInput] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialDate) {
      return new Date(initialDate + "T00:00:00");
    }
    return getToday();
  });
  const inputRef = useRef<HTMLInputElement>(null);
  
  const presets = getPresets();
  
  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);
  
  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        invoke("close_date_picker_popup");
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Close on click outside (blur)
  useEffect(() => {
    const handleBlur = () => {
      // Small delay to allow clicks within popup
      setTimeout(() => {
        if (!document.hasFocus()) {
          invoke("close_date_picker_popup");
        }
      }, 100);
    };
    
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);
  
  const selectDate = (date: string | null) => {
    invoke("emit_date_selected", { date });
  };
  
  const handlePresetClick = (preset: PresetOption) => {
    const date = preset.getDate();
    selectDate(date ? formatDateString(date) : null);
  };
  
  const handleCalendarSelect = (dateStr: string) => {
    selectDate(dateStr);
  };
  
  const handleNaturalInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const parsed = parseNaturalDate(naturalInput);
      if (parsed) {
        selectDate(formatDateString(parsed));
      }
    }
  };
  
  return (
    <div className="w-full h-full bg-white dark:bg-neutral-800 rounded-xl overflow-hidden flex flex-col">
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
      <div className="p-3 border-b border-neutral-100 dark:border-neutral-700">
        <Calendar
          selectedDate={selectedDate}
          onSelect={handleCalendarSelect}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
      </div>
      
      {/* Additional Options */}
      <div className="p-1">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
        >
          <IoTimeOutline size={16} />
          <span>Time</span>
        </button>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
        >
          <IoRepeatOutline size={16} />
          <span>Repeat</span>
        </button>
      </div>
    </div>
  );
}
