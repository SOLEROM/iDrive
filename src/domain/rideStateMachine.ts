import type { AssignmentStatus } from "./enums";
import { AssignmentStatus as AS } from "./enums";

/**
 * State machine for RideAssignment.assignmentStatus.
 *
 *   UNASSIGNED ─claim──▶ VOLUNTEERED ─confirm──▶ CONFIRMED ─complete──▶ COMPLETED
 *        ▲                    │                      │
 *        │                    └──release──▶ UNASSIGNED
 *        │                    └──cancel───▶ CANCELLED
 *   CONFLICT ◀─sync-detects-collision── any of (VOLUNTEERED, CONFIRMED)
 */
const transitions: Record<AssignmentStatus, readonly AssignmentStatus[]> = {
  [AS.UNASSIGNED]: [AS.VOLUNTEERED, AS.CANCELLED],
  [AS.VOLUNTEERED]: [AS.CONFIRMED, AS.UNASSIGNED, AS.CANCELLED, AS.CONFLICT],
  [AS.CONFIRMED]: [AS.COMPLETED, AS.CANCELLED, AS.CONFLICT],
  [AS.COMPLETED]: [],
  [AS.CONFLICT]: [AS.VOLUNTEERED, AS.UNASSIGNED, AS.CANCELLED],
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
