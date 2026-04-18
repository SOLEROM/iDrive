package i.drive.kids.domain.rides

import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.AssignmentStatus.CANCELLED
import i.drive.kids.domain.model.AssignmentStatus.COMPLETED
import i.drive.kids.domain.model.AssignmentStatus.CONFIRMED
import i.drive.kids.domain.model.AssignmentStatus.CONFLICT
import i.drive.kids.domain.model.AssignmentStatus.UNASSIGNED
import i.drive.kids.domain.model.AssignmentStatus.VOLUNTEERED

/**
 * State machine for RideAssignment.assignmentStatus.
 *
 * Diagram:
 *
 *   UNASSIGNED ─claim──▶ VOLUNTEERED ─confirm──▶ CONFIRMED ─complete──▶ COMPLETED
 *        ▲                    │                      │
 *        │                    └──release──▶ UNASSIGNED
 *        │                    └──cancel───▶ CANCELLED
 *        │                                          │
 *        ├──────────────────restore─────────────────┘
 *        │
 *   CONFLICT ◀─sync-detects-collision── any of (VOLUNTEERED, CONFIRMED)
 *       │
 *       └─resolve──▶ VOLUNTEERED (winner) or UNASSIGNED (both cancelled)
 */
object RideAssignmentStateMachine {

    private val transitions: Map<AssignmentStatus, Set<AssignmentStatus>> = mapOf(
        UNASSIGNED  to setOf(VOLUNTEERED, CANCELLED),
        VOLUNTEERED to setOf(CONFIRMED, UNASSIGNED, CANCELLED, CONFLICT),
        CONFIRMED   to setOf(COMPLETED, CANCELLED, CONFLICT),
        COMPLETED   to emptySet(), // terminal
        CONFLICT    to setOf(VOLUNTEERED, UNASSIGNED, CANCELLED),
        CANCELLED   to setOf(UNASSIGNED) // explicit restore
    )

    fun canTransition(from: AssignmentStatus, to: AssignmentStatus): Boolean =
        to in (transitions[from] ?: emptySet())

    fun allowedNext(from: AssignmentStatus): Set<AssignmentStatus> =
        transitions[from] ?: emptySet()

    fun isTerminal(status: AssignmentStatus): Boolean =
        transitions[status].isNullOrEmpty()

    /**
     * Request a transition. Returns [Result.success] with the new status, or [Result.failure]
     * with [IllegalStateException] if the transition is invalid.
     */
    fun transition(from: AssignmentStatus, to: AssignmentStatus): Result<AssignmentStatus> =
        if (canTransition(from, to)) Result.success(to)
        else Result.failure(IllegalStateException("Invalid transition: $from → $to"))
}
