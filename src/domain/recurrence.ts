import type { Event, Millis, RecurrenceRule } from "./models";
import { DayOfWeek, dayOfWeekIndex } from "./enums";

const MAX_OCCURRENCES = 520;
const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;

/**
 * Expand a recurring Event into concrete occurrences within a [windowStart, windowEnd] range.
 *
 * V1 supports WEEKLY only (single weekday from startDateTime or explicit daysOfWeek, with
 * `intervalWeeks` gap). Non-recurring events emit a single occurrence if they fall in the window.
 */
export function expandRecurrence(
  event: Event,
  windowStart: Millis,
  windowEnd: Millis,
): Event[] {
  if (windowEnd < windowStart) {
    throw new Error("windowEnd must be >= windowStart");
  }
  if (!event.isRecurring || !event.recurrenceRule) {
    return event.startDateTime >= windowStart && event.startDateTime <= windowEnd
      ? [event]
      : [];
  }
  return expandWeekly(event, event.recurrenceRule, windowStart, windowEnd);
}

function expandWeekly(
  event: Event,
  rule: RecurrenceRule,
  windowStart: Millis,
  windowEnd: Millis,
): Event[] {
  const duration = Math.max(0, event.endDateTime - event.startDateTime);
  const effectiveEnd = rule.endDate != null ? Math.min(rule.endDate, windowEnd) : windowEnd;
  if (effectiveEnd < windowStart) return [];

  const baseDate = new Date(event.startDateTime);
  const baseDayDow = jsDayToDow(baseDate.getUTCDay());
  const days = rule.daysOfWeek && rule.daysOfWeek.length > 0
    ? rule.daysOfWeek
    : [baseDayDow];
  const interval = Math.max(1, rule.intervalWeeks);

  // Anchor at UTC Monday 00:00 of base-date's ISO week.
  const baseDayStartUtc = Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
  );
  const mondayOffsetDays = (dayOfWeekIndex(baseDayDow) + 7) % 7; // MON→0
  const anchorMondayMs = baseDayStartUtc - mondayOffsetDays * MS_DAY;
  const timeOfDayMs = event.startDateTime - baseDayStartUtc;

  const results: Event[] = [];
  let weekIndex = 0;
  while (results.length < MAX_OCCURRENCES) {
    const weekStartMs = anchorMondayMs + weekIndex * MS_WEEK;
    if (weekStartMs > effectiveEnd) break;

    if (weekIndex % interval === 0) {
      for (const day of days) {
        const dayOffset = dayOfWeekIndex(day);
        if (dayOffset < 0) continue;
        const occurrenceDayMs = weekStartMs + dayOffset * MS_DAY;
        if (occurrenceDayMs < baseDayStartUtc) continue;
        const startMs = occurrenceDayMs + timeOfDayMs;
        if (startMs > effectiveEnd) continue;
        if (startMs + duration < windowStart) continue;

        const occurrenceDateIso = isoDateFromUtcMs(occurrenceDayMs);
        results.push({
          ...event,
          eventId: `${event.eventId}:${occurrenceDateIso}`,
          startDateTime: startMs,
          endDateTime: startMs + duration,
          isRecurring: false,
          recurrenceRule: null,
        });
      }
    }
    weekIndex++;
    if (weekIndex > 20 * 52) break;
  }

  return results.sort((a, b) => a.startDateTime - b.startDateTime);
}

function jsDayToDow(jsDay: number): DayOfWeek {
  // JS: 0 = Sunday, 1 = Monday, …, 6 = Saturday
  const map: Record<number, DayOfWeek> = {
    0: DayOfWeek.SUNDAY,
    1: DayOfWeek.MONDAY,
    2: DayOfWeek.TUESDAY,
    3: DayOfWeek.WEDNESDAY,
    4: DayOfWeek.THURSDAY,
    5: DayOfWeek.FRIDAY,
    6: DayOfWeek.SATURDAY,
  };
  return map[jsDay];
}

function isoDateFromUtcMs(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
