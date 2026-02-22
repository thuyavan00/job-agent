// Pure date arithmetic helpers for the Interview Calendar.
// All functions use local timezone (not UTC) so calendar cells match the user's clock.
// month parameters are 1-indexed (1=January, 12=December) to match human convention.

export interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateKey: string; // "YYYY-MM-DD" in local timezone
}

/** Convert a Date to a "YYYY-MM-DD" string using local timezone. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build a fixed 6-row × 7-col (42-cell) grid for the given month.
 * @param year  Full year (e.g. 2026)
 * @param month 1-indexed month (1=January … 12=December)
 */
export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const todayKey = toDateKey(new Date());
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = firstDay.getDay(); // 0=Sunday

  const cells: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    // new Date(year, monthIdx, day) correctly handles negative/overflow days
    const cellDate = new Date(year, month - 1, 1 - startOffset + i);
    const dateKey = toDateKey(cellDate);
    cells.push({
      date: cellDate,
      dayNum: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === month - 1,
      isToday: dateKey === todayKey,
      dateKey,
    });
  }
  return cells;
}

/**
 * Group items by their local-timezone date key ("YYYY-MM-DD") derived from scheduledAt.
 * Generic over any object that has a `scheduledAt: string` field.
 */
export function groupByDateKey<T extends { scheduledAt: string }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = toDateKey(new Date(item.scheduledAt));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

/**
 * Advance or rewind by `delta` months, wrapping year correctly.
 * @param month 1-indexed
 * @returns 1-indexed month + year
 */
export function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  while (m < 1) {
    m += 12;
    y--;
  }
  while (m > 12) {
    m -= 12;
    y++;
  }
  return { year: y, month: m };
}

/** Format as "February 2026". month is 1-indexed. */
export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Format ISO timestamp as "9:00 AM". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format ISO timestamp as "Feb 22". */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Format a Date as "Tuesday, February 22, 2026". */
export function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
