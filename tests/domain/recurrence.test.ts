import { describe, it, expect } from "vitest";
import { expandRecurrence } from "@/domain/recurrence";
import type { Event, RecurrenceRule } from "@/domain/models";
import { newEvent } from "@/domain/models";
import { DayOfWeek, RecurrenceFrequency } from "@/domain/enums";

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

/** UTC millis for Y/M/D at 16:00. May 4 2026 is a Monday. */
function utcAt(y: number, m: number, d: number, h = 16, min = 0): number {
  return Date.UTC(y, m - 1, d, h, min, 0, 0);
}

function evt(start: number, durationMinutes = 60, rule: RecurrenceRule | null = null): Event {
  return newEvent({
    eventId: "e1",
    childId: "c1",
    title: "Piano",
    createdByParentId: "p1",
    startDateTime: start,
    endDateTime: start + durationMinutes * 60_000,
    isRecurring: rule != null,
    recurrenceRule: rule,
  });
}

describe("RecurrenceExpander", () => {
  it("non-recurring event in window returns single occurrence", () => {
    const start = utcAt(2026, 5, 4);
    const e = evt(start);
    const out = expandRecurrence(e, start - DAY, start + DAY);
    expect(out).toHaveLength(1);
    expect(out[0].startDateTime).toBe(start);
  });

  it("non-recurring event outside window returns empty", () => {
    const start = utcAt(2026, 5, 4);
    const e = evt(start);
    const out = expandRecurrence(e, start + 10 * DAY, start + 20 * DAY);
    expect(out).toEqual([]);
  });

  it("weekly recurrence with no end date generates occurrences", () => {
    const start = utcAt(2026, 5, 4);
    const rule: RecurrenceRule = {
      frequency: RecurrenceFrequency.WEEKLY,
      daysOfWeek: [DayOfWeek.MONDAY],
      intervalWeeks: 1,
      endDate: null,
    };
    const e = evt(start, 60, rule);
    const out = expandRecurrence(e, start, start + 4 * WEEK);
    expect(out.length).toBeGreaterThanOrEqual(4);
    expect(out[0].startDateTime).toBe(start);
  });

  it("weekly recurrence every 2 weeks skips alternate weeks", () => {
    const start = utcAt(2026, 5, 4);
    const rule: RecurrenceRule = {
      frequency: RecurrenceFrequency.WEEKLY,
      daysOfWeek: [DayOfWeek.MONDAY],
      intervalWeeks: 2,
      endDate: null,
    };
    const e = evt(start, 60, rule);
    const out = expandRecurrence(e, start, start + 7 * WEEK);
    // Week 0, 2, 4, 6 within a 7-week window → 4 occurrences
    expect(out).toHaveLength(4);
    expect(out[1].startDateTime - out[0].startDateTime).toBe(14 * DAY);
  });

  it("weekly recurrence respects endDate", () => {
    const start = utcAt(2026, 5, 4);
    const endDate = start + 3 * WEEK;
    const rule: RecurrenceRule = {
      frequency: RecurrenceFrequency.WEEKLY,
      daysOfWeek: [DayOfWeek.MONDAY],
      intervalWeeks: 1,
      endDate,
    };
    const e = evt(start, 60, rule);
    const out = expandRecurrence(e, start, start + 52 * WEEK);
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.length).toBeLessThanOrEqual(4);
    expect(out[out.length - 1].startDateTime).toBeLessThanOrEqual(endDate);
  });

  it("multiple daysOfWeek produces multiple occurrences per week", () => {
    const start = utcAt(2026, 5, 4);
    const rule: RecurrenceRule = {
      frequency: RecurrenceFrequency.WEEKLY,
      daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY],
      intervalWeeks: 1,
      endDate: null,
    };
    const e = evt(start, 60, rule);
    const out = expandRecurrence(e, start, start + 2 * WEEK);
    expect(out.length).toBeGreaterThanOrEqual(4);
  });

  it("far-future window without endDate is capped", () => {
    const start = utcAt(2026, 5, 4);
    const rule: RecurrenceRule = {
      frequency: RecurrenceFrequency.WEEKLY,
      daysOfWeek: [DayOfWeek.MONDAY],
      intervalWeeks: 1,
      endDate: null,
    };
    const e = evt(start, 60, rule);
    const windowEnd = start + 25 * 365 * DAY;
    const out = expandRecurrence(e, start, windowEnd);
    expect(out.length).toBeLessThanOrEqual(520);
    expect(out.length).toBeGreaterThan(0);
  });
});
