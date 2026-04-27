// Local-time window helpers. All ms inputs/outputs.

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function todayStart(): number {
  return startOfDay(Date.now());
}

export function endOfWeek(ms: number = Date.now()): number {
  const d = new Date(ms);
  const offset = 7 - d.getDay(); // days until next Sunday
  d.setDate(d.getDate() + offset);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function endOfMonth(ms: number = Date.now()): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}

export function startOfMonth(ms: number = Date.now()): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
}

/** End of *next* month — used by activity expansion. */
export function endOfNextMonth(ms: number = Date.now()): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + 2, 0, 23, 59, 59, 999).getTime();
}

/**
 * End of the month that is `monthsAhead` after the current month.
 * `monthsAhead = 0` → end of current month.
 * `monthsAhead = 1` → end of next month (same as endOfNextMonth).
 * `monthsAhead = 3` → end of the third month from now.
 */
export function endOfMonthsAhead(monthsAhead: number, ms: number = Date.now()): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + monthsAhead + 1, 0, 23, 59, 59, 999).getTime();
}

export function sameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export const DOW_KEYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

/** Returns the DayOfWeek key (matching domain/enums.ts) for the given local date. */
export function dowOf(ms: number): typeof DOW_KEYS[number] {
  return DOW_KEYS[new Date(ms).getDay()];
}

/** "YYYY-MM-DD" using local date (not UTC). */
export function isoDateLocal(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
