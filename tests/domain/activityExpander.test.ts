import { describe, expect, it } from "vitest";
import { newActivity } from "@/domain/models";
import { expandActivity } from "@/domain/activityExpander";
import { RideDirection } from "@/domain/enums";

const CHILD = "c-abc1234";
const PARENT = "p-1";

function ctx(start: number, end: number) {
  return { childId: CHILD, createdByParentId: PARENT, windowStart: start, windowEnd: end };
}

describe("expandActivity", () => {
  it("repeating per-day produces one event per matching day in window", () => {
    // 2026-04-25 = Saturday → next Mon = 27, Wed = 29, Fri = May 1
    const start = new Date(2026, 3, 25).getTime();
    const end = new Date(2026, 4, 2).getTime();
    const a = newActivity({
      name: "Football", repeating: true, needsRide: true, rideDirection: RideDirection.BOTH,
      dayTimes: {
        MONDAY:    { startTime: "16:00", endTime: "17:30" },
        WEDNESDAY: { startTime: "16:00", endTime: "17:30" },
        FRIDAY:    { startTime: "16:00", endTime: "17:30" },
      },
    });
    const events = expandActivity(a, ctx(start, end));
    expect(events.length).toBe(3);
    for (const e of events) {
      const d = new Date(e.startDateTime);
      expect(d.getHours()).toBe(16);
      expect(d.getMinutes()).toBe(0);
    }
  });

  it("one-time activity emits exactly the first matching day", () => {
    const start = new Date(2026, 3, 25).getTime();
    const end = new Date(2026, 4, 30).getTime();
    const a = newActivity({
      name: "Field trip", repeating: false, needsRide: false,
      dayTimes: { TUESDAY: { startTime: "09:00", endTime: "12:00" } },
    });
    const events = expandActivity(a, ctx(start, end));
    expect(events.length).toBe(1);
    expect(new Date(events[0].startDateTime).getDay()).toBe(2);
  });

  it("empty dayTimes + empty days = every day in window", () => {
    const start = new Date(2026, 3, 25).getTime();
    const end = new Date(2026, 3, 28, 23, 59).getTime();
    const a = newActivity({
      name: "All days", repeating: true, needsRide: false,
      dayTimes: {},
    });
    const events = expandActivity(a, ctx(start, end));
    expect(events.length).toBe(4); // 25,26,27,28
  });

  it("missing endTime falls back to startTime", () => {
    const start = new Date(2026, 3, 25).getTime();
    const a = newActivity({
      name: "Brief", repeating: false, needsRide: false,
      dayTimes: { SATURDAY: { startTime: "09:00", endTime: "" } },
    });
    const [e] = expandActivity(a, ctx(start, start + 86400000));
    expect(e.startDateTime).toBe(e.endDateTime);
  });

  it("re-running with the same activity yields stable ids", () => {
    const start = new Date(2026, 3, 25).getTime();
    const end = new Date(2026, 4, 30).getTime();
    const a = newActivity({
      name: "Music", repeating: true, needsRide: true,
      dayTimes: { MONDAY: { startTime: "16:00", endTime: "17:00" } },
    });
    const a1 = expandActivity(a, ctx(start, end));
    const a2 = expandActivity(a, ctx(start, end));
    expect(a1.map((e) => e.eventId)).toEqual(a2.map((e) => e.eventId));
  });

  it("two activities with the same name on the same day produce distinct event ids", () => {
    const start = new Date(2026, 3, 26).getTime(); // Sunday
    const end = new Date(2026, 3, 26, 23, 59).getTime();
    const morning = newActivity({
      name: "Therapy", repeating: false, needsRide: true,
      dayTimes: { SUNDAY: { startTime: "09:00", endTime: "10:00" } },
    });
    const evening = newActivity({
      name: "Therapy", repeating: false, needsRide: true,
      dayTimes: { SUNDAY: { startTime: "16:00", endTime: "17:00" } },
    });
    const [a] = expandActivity(morning, ctx(start, end));
    const [b] = expandActivity(evening, ctx(start, end));
    expect(a.eventId).not.toBe(b.eventId);
    expect(a.startDateTime).not.toBe(b.startDateTime);
  });
});
