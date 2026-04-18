import type { Event, Millis, RideAssignment } from "./models";
import { AssignmentStatus } from "./enums";

export type ConflictResult =
  | { kind: "NoConflict" }
  | {
      kind: "SimpleConflict";
      entityId: string;
      entityType: string;
      localUpdatedAt: Millis;
      remoteUpdatedAt: Millis;
    }
  | {
      kind: "AssignmentConflict";
      eventId: string;
      conflictingAssignments: RideAssignment[];
    };

export const NoConflict: ConflictResult = { kind: "NoConflict" };

export function detectEntityConflict(
  entityId: string,
  entityType: string,
  localUpdatedAt: Millis,
  remoteUpdatedAt: Millis,
): ConflictResult {
  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      kind: "SimpleConflict",
      entityId,
      entityType,
      localUpdatedAt,
      remoteUpdatedAt,
    };
  }
  return NoConflict;
}

export function detectAssignmentConflicts(
  assignments: RideAssignment[],
): Extract<ConflictResult, { kind: "AssignmentConflict" }>[] {
  const active = new Set<AssignmentStatus>([
    AssignmentStatus.VOLUNTEERED,
    AssignmentStatus.CONFIRMED,
  ]);
  const groups = new Map<string, RideAssignment[]>();
  for (const a of assignments) {
    if (!active.has(a.assignmentStatus)) continue;
    const key = `${a.eventId}|${a.rideLeg}`;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }
  const out: Extract<ConflictResult, { kind: "AssignmentConflict" }>[] = [];
  for (const [key, list] of groups) {
    if (list.length > 1) {
      out.push({
        kind: "AssignmentConflict",
        eventId: key.split("|")[0],
        conflictingAssignments: list,
      });
    }
  }
  return out;
}

export function detectEventConflicts(
  localEvents: Event[],
  remoteEvents: Event[],
): ConflictResult[] {
  const localById = new Map(localEvents.map((e) => [e.eventId, e]));
  const out: ConflictResult[] = [];
  for (const remote of remoteEvents) {
    const local = localById.get(remote.eventId);
    if (!local) continue;
    if (remote.updatedAt > local.updatedAt) {
      out.push({
        kind: "SimpleConflict",
        entityId: remote.eventId,
        entityType: "EVENT",
        localUpdatedAt: local.updatedAt,
        remoteUpdatedAt: remote.updatedAt,
      });
    }
  }
  return out;
}
