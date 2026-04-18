import { describe, it, expect } from "vitest";
import {
  detectEntityConflict,
  detectAssignmentConflicts,
  detectEventConflicts,
} from "@/domain/conflictDetector";
import { AssignmentStatus, RideLeg } from "@/domain/enums";
import { newAssignment, newEvent } from "@/domain/models";

describe("ConflictDetector", () => {
  it("no conflict when remote is older", () => {
    const r = detectEntityConflict("e1", "EVENT", 200, 100);
    expect(r.kind).toBe("NoConflict");
  });

  it("simple conflict when remote is newer", () => {
    const r = detectEntityConflict("e1", "EVENT", 100, 200);
    expect(r.kind).toBe("SimpleConflict");
    if (r.kind === "SimpleConflict") {
      expect(r.entityId).toBe("e1");
      expect(r.localUpdatedAt).toBe(100);
      expect(r.remoteUpdatedAt).toBe(200);
    }
  });

  it("assignment collision detected when two volunteers for same leg", () => {
    const a1 = newAssignment({
      assignmentId: "a1", eventId: "evt-1", driverParentId: "pa",
      rideLeg: RideLeg.TO, assignmentStatus: AssignmentStatus.VOLUNTEERED,
    });
    const a2 = newAssignment({
      assignmentId: "a2", eventId: "evt-1", driverParentId: "pb",
      rideLeg: RideLeg.TO, assignmentStatus: AssignmentStatus.VOLUNTEERED,
    });
    const out = detectAssignmentConflicts([a1, a2]);
    expect(out).toHaveLength(1);
    expect(out[0].eventId).toBe("evt-1");
    expect(out[0].conflictingAssignments).toHaveLength(2);
  });

  it("no assignment collision when legs differ", () => {
    const a1 = newAssignment({
      assignmentId: "a1", eventId: "evt-1", driverParentId: "pa",
      rideLeg: RideLeg.TO, assignmentStatus: AssignmentStatus.VOLUNTEERED,
    });
    const a2 = newAssignment({
      assignmentId: "a2", eventId: "evt-1", driverParentId: "pb",
      rideLeg: RideLeg.FROM, assignmentStatus: AssignmentStatus.VOLUNTEERED,
    });
    expect(detectAssignmentConflicts([a1, a2])).toHaveLength(0);
  });

  it("cancelled and completed assignments never conflict", () => {
    const a1 = newAssignment({
      assignmentId: "a1", eventId: "evt-1", driverParentId: "pa",
      rideLeg: RideLeg.TO, assignmentStatus: AssignmentStatus.CANCELLED,
    });
    const a2 = newAssignment({
      assignmentId: "a2", eventId: "evt-1", driverParentId: "pb",
      rideLeg: RideLeg.TO, assignmentStatus: AssignmentStatus.COMPLETED,
    });
    const a3 = newAssignment({
      assignmentId: "a3", eventId: "evt-1", driverParentId: "pc",
      rideLeg: RideLeg.TO, assignmentStatus: AssignmentStatus.VOLUNTEERED,
    });
    expect(detectAssignmentConflicts([a1, a2, a3])).toHaveLength(0);
  });

  it("event conflicts flag newer remotes", () => {
    const local = newEvent({
      eventId: "e1", childId: "c1", title: "Piano", createdByParentId: "p1",
      updatedAt: 100,
    });
    const remote = { ...local, title: "Piano Updated", updatedAt: 200 };
    const out = detectEventConflicts([local], [remote]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("SimpleConflict");
  });

  it("event conflicts ignore new-only remote events", () => {
    const remote = newEvent({
      eventId: "new-1", childId: "c1", title: "New", createdByParentId: "p1",
      updatedAt: 300,
    });
    expect(detectEventConflicts([], [remote])).toHaveLength(0);
  });
});
