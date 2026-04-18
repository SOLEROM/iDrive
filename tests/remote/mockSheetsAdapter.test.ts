import { describe, it, expect } from "vitest";
import { MockSheetsAdapter } from "@/remote/mock/mockSheetsAdapter";
import { newAssignment, newEvent } from "@/domain/models";
import {
  AssignmentStatus,
  EventType,
  NotificationCategory,
  RideLeg,
  VisibilityScope,
} from "@/domain/enums";
import { defaultGroupSharedConfig } from "@/domain/config";
import type { NotificationEntry } from "@/domain/models";

describe("MockSheetsAdapter", () => {
  it("events write then read preserves every field", async () => {
    const a = new MockSheetsAdapter();
    const sheetId = await a.ensureSheetExists("g1", "Group One");
    const event = newEvent({
      eventId: "e-roundtrip",
      groupId: "g1",
      childId: "c1",
      title: "Swimming",
      eventType: EventType.SPORTS,
      locationName: "Pool",
      startDateTime: 1_714_500_000_000,
      endDateTime: 1_714_503_600_000,
      needsRide: true,
      createdByParentId: "p1",
      visibilityScope: VisibilityScope.GROUP,
      updatedAt: 111,
    });
    await a.writeEvents(sheetId, [event]);
    const read = await a.readEvents(sheetId);
    expect(read).toHaveLength(1);
    expect(read[0]).toEqual(event);
  });

  it("assignments write then read preserves every field", async () => {
    const a = new MockSheetsAdapter();
    const sheetId = await a.ensureSheetExists("g1", "Group One");
    const assign = newAssignment({
      assignmentId: "a-1",
      eventId: "e-1",
      driverParentId: "p2",
      rideLeg: RideLeg.FROM,
      assignmentStatus: AssignmentStatus.CONFIRMED,
      notes: "carpool with neighbor",
      claimedAt: 1_714_500_000_000,
      completedAt: null,
      updatedAt: 2,
    });
    await a.writeAssignments(sheetId, [assign]);
    const read = await a.readAssignments(sheetId);
    expect(read).toHaveLength(1);
    expect(read[0]).toEqual(assign);
  });

  it("groupConfig write then read preserves every field", async () => {
    const a = new MockSheetsAdapter();
    const sheetId = await a.ensureSheetExists("g1", "Group One");
    const cfg = {
      ...defaultGroupSharedConfig,
      groupName: "Renamed",
      timezone: "Europe/London",
      enableRideSharing: false,
      maxFutureEventMonths: 3,
    };
    await a.writeGroupConfig(sheetId, cfg);
    expect(await a.readGroupConfig(sheetId)).toEqual(cfg);
  });

  it("notifications append accumulates entries", async () => {
    const a = new MockSheetsAdapter();
    const sheetId = await a.ensureSheetExists("g1", "Group One");
    const n1: NotificationEntry = {
      notificationId: "n1", groupId: "g1", eventId: "e1", assignmentId: null,
      triggeredByParentId: "p1", message: "Ride claimed",
      category: NotificationCategory.RIDE_CLAIMED, createdAt: 100,
    };
    const n2 = { ...n1, notificationId: "n2", message: "Ride completed",
      category: NotificationCategory.RIDE_COMPLETED, createdAt: 200 };
    await a.appendNotification(sheetId, n1);
    await a.appendNotification(sheetId, n2);
    const read = await a.readNotifications(sheetId);
    expect(read).toEqual(expect.arrayContaining([n1, n2]));
  });

  it("ensureSheetExists is idempotent per groupId", async () => {
    const a = new MockSheetsAdapter();
    const first = await a.ensureSheetExists("g1", "Group One");
    const second = await a.ensureSheetExists("g1", "Group One renamed");
    expect(second).toBe(first);
  });

  it("new sheet seeds with Piano and Soccer events", async () => {
    const a = new MockSheetsAdapter();
    const sheetId = "seed-sheet-1";
    const events = await a.readEvents(sheetId);
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.title === "Piano Lesson")).toBe(true);
  });
});
