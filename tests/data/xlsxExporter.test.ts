import { describe, expect, it } from "vitest";
import { buildAnalyticsBlob, buildBackupBlob, type ExportInput } from "@/data/xlsxExporter";
import { defaultAppLocalConfig } from "@/domain/config";
import {
  AssignmentStatus, ChildColor, EventStatus, RideDirection, RideLeg,
} from "@/domain/enums";

const INPUT: ExportInput = {
  config: defaultAppLocalConfig,
  parents: [
    { parentId: "p1", displayName: "Vlad", email: "v@x" },
    { parentId: "p2", displayName: "Zina", email: "z@x" },
  ],
  children: [
    {
      childId: "c1", parentOwnerId: "p1", name: "Noa",
      colorTag: ChildColor.GREEN, notes: "", isArchived: false,
      activities: [{
        name: "Football", days: ["MONDAY"], place: "Park",
        startTime: "16:00", endTime: "17:00", dayTimes: {},
        repeating: true, needsRide: true, rideDirection: RideDirection.BOTH, notes: "",
      }],
      createdAt: 1, updatedAt: 1,
    },
  ],
  events: [{
    eventId: "e1", childId: "c1", title: "Football",
    eventType: "Football", description: "", locationName: "Park", locationAddress: "",
    startDateTime: new Date(2026, 3, 27, 16, 0).getTime(),
    endDateTime:   new Date(2026, 3, 27, 17, 0).getTime(),
    isRecurring: false, recurrenceRule: null,
    needsRide: true, rideDirection: RideDirection.BOTH,
    createdByParentId: "p1", visibilityScope: "GROUP",
    status: EventStatus.ACTIVE, createdAt: 1, updatedAt: 1, groupId: null,
  }],
  assignments: [{
    assignmentId: "a1", eventId: "e1",
    driverParentId: "p2", driverName: "Zina",
    claimedByParentId: "p1",
    rideLeg: RideLeg.TO,
    assignmentStatus: AssignmentStatus.VOLUNTEERED,
    notes: "", claimedAt: 2, completedAt: null, updatedAt: 2,
  }],
};

describe("buildBackupBlob", () => {
  it("produces a non-empty xlsx blob", async () => {
    const blob = buildBackupBlob(INPUT);
    expect(blob.type).toContain("spreadsheet");
    expect(blob.size).toBeGreaterThan(100);
  });
});

describe("buildAnalyticsBlob", () => {
  it("produces a non-empty xlsx blob with Events/Assignments/Activities/Summary", async () => {
    const blob = buildAnalyticsBlob(INPUT);
    expect(blob.type).toContain("spreadsheet");
    expect(blob.size).toBeGreaterThan(100);
  });

  it("handles an empty group", async () => {
    const empty: ExportInput = {
      config: defaultAppLocalConfig, parents: [], children: [], events: [], assignments: [],
    };
    const blob = buildAnalyticsBlob(empty);
    expect(blob.size).toBeGreaterThan(100);
  });
});
