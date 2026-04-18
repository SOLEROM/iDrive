package i.drive.kids.data.sync

import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.domain.model.RideLeg
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ConflictDetectorTest {

    private val detector = ConflictDetector()

    @Test
    fun `no conflict when remote is older`() {
        val res = detector.detectEntityConflict("e1", "EVENT", 200L, 100L)
        assertEquals(ConflictResult.NoConflict, res)
    }

    @Test
    fun `simple conflict when remote is newer`() {
        val res = detector.detectEntityConflict("e1", "EVENT", 100L, 200L)
        assertTrue(res is ConflictResult.SimpleConflict)
        val c = res as ConflictResult.SimpleConflict
        assertEquals("e1", c.entityId)
        assertEquals(100L, c.localUpdatedAt)
        assertEquals(200L, c.remoteUpdatedAt)
    }

    @Test
    fun `assignment collision detected when two volunteers for same leg`() {
        val a1 = RideAssignment("a1", "evt-1", "parent-a", RideLeg.TO, AssignmentStatus.VOLUNTEERED)
        val a2 = RideAssignment("a2", "evt-1", "parent-b", RideLeg.TO, AssignmentStatus.VOLUNTEERED)

        val conflicts = detector.detectAssignmentConflicts(listOf(a1, a2))

        assertEquals(1, conflicts.size)
        assertEquals("evt-1", conflicts[0].eventId)
        assertEquals(2, conflicts[0].conflictingAssignments.size)
    }

    @Test
    fun `no assignment collision when legs differ`() {
        val a1 = RideAssignment("a1", "evt-1", "parent-a", RideLeg.TO, AssignmentStatus.VOLUNTEERED)
        val a2 = RideAssignment("a2", "evt-1", "parent-b", RideLeg.FROM, AssignmentStatus.VOLUNTEERED)

        val conflicts = detector.detectAssignmentConflicts(listOf(a1, a2))

        assertTrue(conflicts.isEmpty())
    }

    @Test
    fun `cancelled and completed assignments never conflict`() {
        val a1 = RideAssignment("a1", "evt-1", "parent-a", RideLeg.TO, AssignmentStatus.CANCELLED)
        val a2 = RideAssignment("a2", "evt-1", "parent-b", RideLeg.TO, AssignmentStatus.COMPLETED)
        val a3 = RideAssignment("a3", "evt-1", "parent-c", RideLeg.TO, AssignmentStatus.VOLUNTEERED)

        val conflicts = detector.detectAssignmentConflicts(listOf(a1, a2, a3))

        assertTrue(conflicts.isEmpty())
    }

    @Test
    fun `event conflicts flag newer remotes`() {
        val local = Event(eventId = "e1", childId = "c1", title = "Piano",
            createdByParentId = "p1", updatedAt = 100L)
        val remote = local.copy(title = "Piano Updated", updatedAt = 200L)

        val conflicts = detector.detectEventConflicts(listOf(local), listOf(remote))

        assertEquals(1, conflicts.size)
        val c = conflicts[0] as ConflictResult.SimpleConflict
        assertEquals("e1", c.entityId)
    }

    @Test
    fun `event conflicts ignore new-only remote events`() {
        val local = emptyList<Event>()
        val remote = Event(eventId = "new-1", childId = "c1", title = "New",
            createdByParentId = "p1", updatedAt = 300L)

        val conflicts = detector.detectEventConflicts(local, listOf(remote))

        assertTrue(conflicts.isEmpty())
    }
}
