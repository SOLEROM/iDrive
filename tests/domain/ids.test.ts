import { describe, expect, it } from "vitest";
import {
  newChildId, newEventId, newAssignmentId,
  slugifyActivityName, activityEventId, activityEventIdPrefix,
} from "@/domain/ids";

describe("ids", () => {
  it("newChildId begins with c-", () => {
    expect(newChildId()).toMatch(/^c-[a-z0-9]+$/);
  });

  it("newEventId begins with e-", () => {
    expect(newEventId()).toMatch(/^e-[a-z0-9]+$/);
  });

  it("newAssignmentId begins with a-", () => {
    expect(newAssignmentId()).toMatch(/^a-[a-z0-9]+$/);
  });

  it("slugifyActivityName keeps it short and clean", () => {
    expect(slugifyActivityName("  Therapy GROUP  morning!! ")).toBe("therapy-group-morning");
    expect(slugifyActivityName("a".repeat(40)).length).toBeLessThanOrEqual(24);
  });

  it("activityEventId is deterministic", () => {
    const a = activityEventId("c-abcdef12", "Football", "2026-04-25");
    const b = activityEventId("c-abcdef12", "Football", "2026-04-25");
    expect(a).toBe(b);
    expect(a).toContain("act-");
    expect(a).toContain("football");
    expect(a).toContain("2026-04-25");
  });

  it("activityEventId differs for different days", () => {
    const a = activityEventId("c-abc", "Music", "2026-04-25");
    const b = activityEventId("c-abc", "Music", "2026-04-26");
    expect(a).not.toBe(b);
  });

  it("activityEventIdPrefix is a strict prefix of every dated id", () => {
    const prefix = activityEventIdPrefix("c-xyzdef9", "Piano");
    const id = activityEventId("c-xyzdef9", "Piano", "2026-04-25");
    expect(id.startsWith(prefix)).toBe(true);
  });

  it("activityEventId disambiguates same-name activities at different times", () => {
    const morning = activityEventId("c-abc", "Football", "2026-04-26", "09:00");
    const evening = activityEventId("c-abc", "Football", "2026-04-26", "16:00");
    expect(morning).not.toBe(evening);
    expect(morning).toContain("0900");
    expect(evening).toContain("1600");
  });

  it("activityEventId without startTime keeps legacy format", () => {
    const legacy = activityEventId("c-abc", "Football", "2026-04-26");
    expect(legacy).toBe("act-c-abc-football-2026-04-26");
  });
});
