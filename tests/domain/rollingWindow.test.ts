import { describe, expect, it } from "vitest";
import { newActivity, newChild, newEvent } from "@/domain/models";
import { activityEventId } from "@/domain/ids";
import { planActivityRegen } from "@/domain/rollingWindow";
import { RideDirection } from "@/domain/enums";

const NOW = new Date(2026, 3, 25).getTime(); // Sat Apr 25 2026

const child = newChild({ childId: "c-abcdef12", parentOwnerId: "p1", name: "Noa" });

const activity = newActivity({
  name: "Football", repeating: true, needsRide: true, rideDirection: RideDirection.BOTH,
  dayTimes: { MONDAY: { startTime: "16:00", endTime: "17:30" } },
});

function existingEvent(isoDate: string): ReturnType<typeof newEvent> {
  const dayMs = new Date(isoDate + "T16:00").getTime();
  return newEvent({
    eventId: activityEventId(child.childId, activity.name, isoDate),
    childId: child.childId, title: "Football", createdByParentId: "p1",
    eventType: "Football", startDateTime: dayMs, endDateTime: dayMs + 90 * 60_000,
  });
}

describe("planActivityRegen", () => {
  it("returns no upserts when last future event is far enough out", () => {
    const events = [existingEvent("2026-05-25")]; // ~30 days ahead
    const plan = planActivityRegen(events, child, activity, NOW);
    // Empty because the existing event is past the threshold AND past
    // the target window (endOfNextMonth(NOW) = end of May 2026).
    expect(plan.upserts.length).toBe(0);
  });

  it("regenerates when no future events exist", () => {
    const plan = planActivityRegen([], child, activity, NOW);
    expect(plan.upserts.length).toBeGreaterThan(0);
  });

  it("only emits NEW events (idempotent regen)", () => {
    const events = [existingEvent("2026-04-27")]; // present
    const plan = planActivityRegen(events, child, activity, NOW);
    for (const u of plan.upserts) {
      expect(u.eventId).not.toBe(events[0].eventId);
    }
  });
});
