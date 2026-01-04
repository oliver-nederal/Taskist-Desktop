/**
 * Date utility functions for task due dates
 */

export function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateStr + "T00:00:00");
  return dueDate < today;
}

export function isDueToday(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateStr + "T00:00:00");
  dueDate.setHours(0, 0, 0, 0);
  return dueDate.getTime() === today.getTime();
}

export function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);
  
  if (dueDate.getTime() === today.getTime()) return "Today";
  if (dueDate.getTime() === tomorrow.getTime()) return "Tomorrow";
  if (dueDate.getTime() === yesterday.getTime()) return "Yesterday";
  
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  
  if (dueDate < weekFromNow && dueDate > today) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}
