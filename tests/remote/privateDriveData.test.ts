import { describe, it, expect } from "vitest";
import type { PrivateDriveData } from "@/remote/privateDriveData";
import { newChild, newEvent, newParent } from "@/domain/models";
import {
  ChildColor,
  DayOfWeek,
  EventType,
  RecurrenceFrequency,
  RideDirection,
  VisibilityScope,
} from "@/domain/enums";

describe("PrivateDriveData JSON schema", () => {
  it("full PrivateDriveData round-trips", () => {
    const parent = newParent({
      parentId: "p1",
      displayName: "Alex Parent",
      email: "alex@example.com",
      phone: "+1-555-0100",
      groupIds: ["g1", "g2"],
      isAdminByGroup: { g1: true },
      createdAt: 1000,
      updatedAt: 2000,
    });
    const child = newChild({
      childId: "c1",
      parentOwnerId: "p1",
      name: "Sam",
      colorTag: ChildColor.GREEN,
      notes: "Allergic to peanuts",
      createdAt: 1000,
      updatedAt: 2000,
    });
    const privateEvent = newEvent({
      eventId: "priv-e1",
      childId: "c1",
      title: "Therapy",
      eventType: EventType.THERAPY,
      startDateTime: 1_714_500_000_000,
      endDateTime: 1_714_503_600_000,
      isRecurring: true,
      recurrenceRule: {
        frequency: RecurrenceFrequency.WEEKLY,
        daysOfWeek: [DayOfWeek.TUESDAY],
        intervalWeeks: 1,
      },
      needsRide: true,
      rideDirection: RideDirection.BOTH,
      createdByParentId: "p1",
      visibilityScope: VisibilityScope.PRIVATE,
      createdAt: 1000,
      updatedAt: 2000,
    });
    const data: PrivateDriveData = {
      schemaVersion: 1,
      parent,
      children: [child],
      privateEvents: [privateEvent],
      knownGroups: [{
        groupId: "g1",
        groupName: "Soccer Parents",
        sharedSheetId: "sheet-1",
        role: "ADMIN",
      }],
      cachedRemoteIds: {
        driveFileId: "drive-file-1",
        sheetIds: { g1: "sheet-1" },
      },
      updatedAt: 3000,
    };

    const text = JSON.stringify(data);
    const restored: PrivateDriveData = JSON.parse(text);
    expect(restored).toEqual(data);
    expect(text).toContain('"schemaVersion"');
  });

  it("minimum PrivateDriveData round-trips with defaults", () => {
    const data: PrivateDriveData = {
      schemaVersion: 1,
      parent: newParent({ parentId: "p1", displayName: "X", email: "x@y.z" }),
      children: [],
      privateEvents: [],
      knownGroups: [],
      cachedRemoteIds: { driveFileId: null, sheetIds: {} },
      updatedAt: 0,
    };
    const text = JSON.stringify(data);
    expect(JSON.parse(text)).toEqual(data);
  });
});
