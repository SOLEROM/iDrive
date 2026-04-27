import type { AssignmentStatus } from "./enums";
import { AssignmentStatus as AS } from "./enums";

/**
 * State machine for RideAssignment.assignmentStatus.
 *
 *   UNASSIGNED ─claim──▶ VOLUNTEERED ─complete──▶ COMPLETED
 *        ▲                    │                       │
 *        │                    └─release──▶ UNASSIGNED │
 *        │                                ◀── undo ───┘
 *
 * Claim goes straight to VOLUNTEERED — assigning a ride is the commitment;
 * there is no separate confirmation step.
 *
 * CONFIRMED is kept in the table only so legacy assignments still in
 * Firestore can be released / completed / undone with the same UI. New
 * writes never produce a CONFIRMED row.
 *
 * COMPLETED is not terminal — an accidental "Done" can be undone back to
 * VOLUNTEERED.
 */
const transitions: Record<AssignmentStatus, readonly AssignmentStatus[]> = {
  [AS.UNASSIGNED]: [AS.VOLUNTEERED, AS.CONFIRMED, AS.CANCELLED],
  [AS.VOLUNTEERED]: [AS.COMPLETED, AS.UNASSIGNED, AS.CANCELLED, AS.CONFLICT, AS.CONFIRMED],
  [AS.CONFIRMED]: [AS.COMPLETED, AS.UNASSIGNED, AS.CANCELLED, AS.CONFLICT, AS.VOLUNTEERED],
  [AS.COMPLETED]: [AS.VOLUNTEERED, AS.CONFIRMED],
  [AS.CONFLICT]: [AS.VOLUNTEERED, AS.CONFIRMED, AS.UNASSIGNED, AS.CANCELLED],
  [AS.CANCELLED]: [AS.UNASSIGNED],
};

export function canTransition(from: AssignmentStatus, to: AssignmentStatus): boolean {
  return transitions[from].includes(to);
}

export function allowedNext(from: AssignmentStatus): readonly AssignmentStatus[] {
  return transitions[from];
}

export function isTerminal(status: AssignmentStatus): boolean {
  return transitions[status].length === 0;
}

export type TransitionResult =
  | { ok: true; value: AssignmentStatus }
  | { ok: false; error: Error };

export function transition(
  from: AssignmentStatus,
  to: AssignmentStatus,
): TransitionResult {
  if (canTransition(from, to)) return { ok: true, value: to };
  return { ok: false, error: new Error(`Invalid transition: ${from} → ${to}`) };
}
