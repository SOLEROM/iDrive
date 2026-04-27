import { describe, expect, it } from "vitest";
import {
  startOfDay, endOfDay, sameDay, dowOf, isoDateLocal,
} from "@/domain/timeWindow";

describe("timeWindow", () => {
  it("startOfDay zeroes the time", () => {
    const ms = new Date(2026, 3, 25, 14, 32, 17).getTime();
    const d = new Date(startOfDay(ms));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it("endOfDay maxes out the time", () => {
    const ms = new Date(2026, 3, 25, 0, 0, 0, 0).getTime();
    const d = new Date(endOfDay(ms));
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  it("sameDay across hours of the same date", () => {
    const a = new Date(2026, 3, 25, 1, 0).getTime();
    const b = new Date(2026, 3, 25, 23, 0).getTime();
    expect(sameDay(a, b)).toBe(true);
  });

  it("sameDay across midnight is false", () => {
    const a = new Date(2026, 3, 25, 23, 59).getTime();
    const b = new Date(2026, 3, 26, 0, 1).getTime();
    expect(sameDay(a, b)).toBe(false);
  });

  it("dowOf returns the local weekday key", () => {
    // 2026-04-25 is a Saturday
    const ms = new Date(2026, 3, 25, 12, 0).getTime();
    expect(dowOf(ms)).toBe("SATURDAY");
  });

  it("isoDateLocal pads month + day", () => {
    const ms = new Date(2026, 0, 9, 12, 0).getTime();
    expect(isoDateLocal(ms)).toBe("2026-01-09");
  });
});
