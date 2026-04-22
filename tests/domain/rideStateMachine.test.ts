import { describe, it, expect } from "vitest";
import { canTransition, allowedNext, isTerminal, transition } from "@/domain/rideStateMachine";
import { AssignmentStatus } from "@/domain/enums";

const {
  UNASSIGNED, VOLUNTEERED, CONFIRMED, COMPLETED, CONFLICT, CANCELLED,
} = AssignmentStatus;

describe("RideAssignmentStateMachine", () => {
  it("UNASSIGNED → VOLUNTEERED is valid", () => {
    expect(canTransition(UNASSIGNED, VOLUNTEERED)).toBe(true);
  });

  it("VOLUNTEERED → CONFIRMED is valid", () => {
    expect(canTransition(VOLUNTEERED, CONFIRMED)).toBe(true);
  });

  it("CONFIRMED → COMPLETED is valid", () => {
    expect(canTransition(CONFIRMED, COMPLETED)).toBe(true);
  });

  it("VOLUNTEERED → UNASSIGNED (release) is valid", () => {
    expect(canTransition(VOLUNTEERED, UNASSIGNED)).toBe(true);
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

  it("UNASSIGNED → CONFIRMED is invalid", () => {
    expect(canTransition(UNASSIGNED, CONFIRMED)).toBe(false);
  });

  it("UNASSIGNED → COMPLETED is invalid", () => {
    expect(canTransition(UNASSIGNED, COMPLETED)).toBe(false);
  });

  it("VOLUNTEERED → COMPLETED is invalid (must confirm first)", () => {
    expect(canTransition(VOLUNTEERED, COMPLETED)).toBe(false);
  });

  it("COMPLETED is terminal", () => {
    expect(isTerminal(COMPLETED)).toBe(true);
    for (const target of Object.values(AssignmentStatus)) {
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
