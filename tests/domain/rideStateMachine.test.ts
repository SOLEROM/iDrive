import { describe, it, expect } from "vitest";
import { canTransition, allowedNext, isTerminal, transition } from "@/domain/rideStateMachine";
import { AssignmentStatus } from "@/domain/enums";

const {
  UNASSIGNED, VOLUNTEERED, CONFIRMED, COMPLETED, CONFLICT, CANCELLED,
} = AssignmentStatus;

describe("RideAssignmentStateMachine", () => {
  it("UNASSIGNED → VOLUNTEERED (claim) is valid", () => {
    expect(canTransition(UNASSIGNED, VOLUNTEERED)).toBe(true);
  });

  it("VOLUNTEERED → COMPLETED (done) is valid", () => {
    expect(canTransition(VOLUNTEERED, COMPLETED)).toBe(true);
  });

  it("VOLUNTEERED → UNASSIGNED (release) is valid", () => {
    expect(canTransition(VOLUNTEERED, UNASSIGNED)).toBe(true);
  });

  it("CONFIRMED → COMPLETED (legacy) is valid", () => {
    expect(canTransition(CONFIRMED, COMPLETED)).toBe(true);
  });

  it("CONFIRMED → UNASSIGNED (legacy release) is valid", () => {
    expect(canTransition(CONFIRMED, UNASSIGNED)).toBe(true);
  });

  it("VOLUNTEERED → CONFLICT (sync collision) is valid", () => {
    expect(canTransition(VOLUNTEERED, CONFLICT)).toBe(true);
  });

  it("CONFLICT → VOLUNTEERED (resolution) is valid", () => {
    expect(canTransition(CONFLICT, VOLUNTEERED)).toBe(true);
  });

  it("CANCELLED → UNASSIGNED (restore) is valid", () => {
    expect(canTransition(CANCELLED, UNASSIGNED)).toBe(true);
  });

  it("UNASSIGNED → COMPLETED is invalid", () => {
    expect(canTransition(UNASSIGNED, COMPLETED)).toBe(false);
  });

  it("COMPLETED can be undone back to VOLUNTEERED", () => {
    expect(isTerminal(COMPLETED)).toBe(false);
    expect(canTransition(COMPLETED, VOLUNTEERED)).toBe(true);
    // CONFIRMED kept only for legacy rows; nothing else is reachable.
    for (const target of Object.values(AssignmentStatus)) {
      if (target === VOLUNTEERED || target === CONFIRMED) continue;
      expect(canTransition(COMPLETED, target)).toBe(false);
    }
  });

  it("transition() returns success for valid move", () => {
    const res = transition(UNASSIGNED, VOLUNTEERED);
    expect(res.ok).toBe(true);
    expect(res.ok && res.value).toBe(VOLUNTEERED);
  });

  it("transition() returns failure for invalid move", () => {
    const res = transition(UNASSIGNED, COMPLETED);
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toBeInstanceOf(Error);
  });

  it("allowedNext returns non-empty for non-terminal states", () => {
    for (const s of [UNASSIGNED, VOLUNTEERED, CONFIRMED, CONFLICT, CANCELLED]) {
      expect(allowedNext(s).length).toBeGreaterThan(0);
    }
  });
});
