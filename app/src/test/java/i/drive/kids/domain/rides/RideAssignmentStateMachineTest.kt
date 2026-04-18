package i.drive.kids.domain.rides

import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.AssignmentStatus.CANCELLED
import i.drive.kids.domain.model.AssignmentStatus.COMPLETED
import i.drive.kids.domain.model.AssignmentStatus.CONFIRMED
import i.drive.kids.domain.model.AssignmentStatus.CONFLICT
import i.drive.kids.domain.model.AssignmentStatus.UNASSIGNED
import i.drive.kids.domain.model.AssignmentStatus.VOLUNTEERED
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RideAssignmentStateMachineTest {

    @Test
    fun `valid transition UNASSIGNED to VOLUNTEERED`() {
        assertTrue(RideAssignmentStateMachine.canTransition(UNASSIGNED, VOLUNTEERED))
    }

    @Test
    fun `valid transition VOLUNTEERED to CONFIRMED`() {
        assertTrue(RideAssignmentStateMachine.canTransition(VOLUNTEERED, CONFIRMED))
    }

    @Test
    fun `valid transition CONFIRMED to COMPLETED`() {
        assertTrue(RideAssignmentStateMachine.canTransition(CONFIRMED, COMPLETED))
    }

    @Test
    fun `valid transition VOLUNTEERED to UNASSIGNED (release)`() {
        assertTrue(RideAssignmentStateMachine.canTransition(VOLUNTEERED, UNASSIGNED))
    }

    @Test
    fun `valid transition VOLUNTEERED to CONFLICT (sync collision)`() {
        assertTrue(RideAssignmentStateMachine.canTransition(VOLUNTEERED, CONFLICT))
    }

    @Test
    fun `valid transition CONFLICT to VOLUNTEERED (resolution)`() {
        assertTrue(RideAssignmentStateMachine.canTransition(CONFLICT, VOLUNTEERED))
    }

    @Test
    fun `valid transition CANCELLED to UNASSIGNED (restore)`() {
        assertTrue(RideAssignmentStateMachine.canTransition(CANCELLED, UNASSIGNED))
    }

    @Test
    fun `invalid transition UNASSIGNED to CONFIRMED`() {
        assertFalse(RideAssignmentStateMachine.canTransition(UNASSIGNED, CONFIRMED))
    }

    @Test
    fun `invalid transition UNASSIGNED to COMPLETED`() {
        assertFalse(RideAssignmentStateMachine.canTransition(UNASSIGNED, COMPLETED))
    }

    @Test
    fun `invalid transition VOLUNTEERED to COMPLETED (must confirm first)`() {
        assertFalse(RideAssignmentStateMachine.canTransition(VOLUNTEERED, COMPLETED))
    }

    @Test
    fun `COMPLETED is terminal`() {
        assertTrue(RideAssignmentStateMachine.isTerminal(COMPLETED))
        AssignmentStatus.values().forEach { target ->
            assertFalse(
                "COMPLETED → $target should be rejected",
                RideAssignmentStateMachine.canTransition(COMPLETED, target)
            )
        }
    }

    @Test
    fun `transition returns success for valid move`() {
        val res = RideAssignmentStateMachine.transition(UNASSIGNED, VOLUNTEERED)
        assertTrue(res.isSuccess)
        assertEquals(VOLUNTEERED, res.getOrNull())
    }

    @Test
    fun `transition returns failure for invalid move`() {
        val res = RideAssignmentStateMachine.transition(UNASSIGNED, COMPLETED)
        assertTrue(res.isFailure)
        assertNotNull(res.exceptionOrNull())
        assertTrue(res.exceptionOrNull() is IllegalStateException)
    }

    @Test
    fun `allowedNext returns non-empty for non-terminal states`() {
        listOf(UNASSIGNED, VOLUNTEERED, CONFIRMED, CONFLICT, CANCELLED).forEach { s ->
            assertTrue("$s should have allowed transitions",
                RideAssignmentStateMachine.allowedNext(s).isNotEmpty())
        }
    }
}
