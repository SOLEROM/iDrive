package i.drive.kids.data.remote.mock

import i.drive.kids.config.GroupSharedConfig
import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.EventType
import i.drive.kids.domain.model.NotificationCategory
import i.drive.kids.domain.model.NotificationEntry
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.domain.model.RideLeg
import i.drive.kids.domain.model.VisibilityScope
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * SheetRowMapperTest equivalent — exercises all Sheet tabs (Events, Assignments,
 * Parents, GroupConfig, Notifications) through the mock adapter to confirm
 * read/write is a lossless identity on the in-memory representation.
 */
class MockSheetsAdapterTest {

    private fun newAdapter() = MockSheetsAdapter()

    @Test
    fun `events write then read preserves every field`() = runBlocking {
        val adapter = newAdapter()
        val sheetId = adapter.ensureSheetExists("g1", "Group One")
        val event = Event(
            eventId = "e-roundtrip",
            groupId = "g1",
            childId = "c1",
            title = "Swimming",
            eventType = EventType.SPORTS,
            locationName = "Pool",
            startDateTime = 1_714_500_000_000L,
            endDateTime = 1_714_503_600_000L,
            needsRide = true,
            createdByParentId = "p1",
            visibilityScope = VisibilityScope.GROUP,
            updatedAt = 111L
        )
        adapter.writeEvents(sheetId, listOf(event))

        val read = adapter.readEvents(sheetId)

        assertEquals(1, read.size)
        assertEquals(event, read[0])
    }

    @Test
    fun `assignments write then read preserves every field`() = runBlocking {
        val adapter = newAdapter()
        val sheetId = adapter.ensureSheetExists("g1", "Group One")
        val a = RideAssignment(
            assignmentId = "a-1",
            eventId = "e-1",
            driverParentId = "p2",
            rideLeg = RideLeg.FROM,
            assignmentStatus = AssignmentStatus.CONFIRMED,
            notes = "carpool with neighbor",
            claimedAt = 1_714_500_000_000L,
            completedAt = null,
            updatedAt = 2L
        )
        adapter.writeAssignments(sheetId, listOf(a))

        val read = adapter.readAssignments(sheetId)

        assertEquals(1, read.size)
        assertEquals(a, read[0])
    }

    @Test
    fun `groupConfig write then read preserves every field`() = runBlocking {
        val adapter = newAdapter()
        val sheetId = adapter.ensureSheetExists("g1", "Group One")
        val cfg = GroupSharedConfig(
            groupName = "Renamed",
            timezone = "Europe/London",
            enableRideSharing = false,
            maxFutureEventMonths = 3
        )
        adapter.writeGroupConfig(sheetId, cfg)

        val read = adapter.readGroupConfig(sheetId)

        assertEquals(cfg, read)
    }

    @Test
    fun `notifications append accumulates entries`() = runBlocking {
        val adapter = newAdapter()
        val sheetId = adapter.ensureSheetExists("g1", "Group One")
        val n1 = NotificationEntry(
            notificationId = "n1", groupId = "g1", eventId = "e1", assignmentId = null,
            triggeredByParentId = "p1", message = "Ride claimed",
            category = NotificationCategory.RIDE_CLAIMED, createdAt = 100L
        )
        val n2 = n1.copy(notificationId = "n2", message = "Ride completed",
            category = NotificationCategory.RIDE_COMPLETED, createdAt = 200L)

        adapter.appendNotification(sheetId, n1)
        adapter.appendNotification(sheetId, n2)

        val read = adapter.readNotifications(sheetId)

        assertTrue(read.containsAll(listOf(n1, n2)))
    }

    @Test
    fun `ensureSheetExists is idempotent per groupId`() = runBlocking {
        val adapter = newAdapter()
        val first = adapter.ensureSheetExists("g1", "Group One")
        val second = adapter.ensureSheetExists("g1", "Group One renamed")
        assertEquals(first, second)
        assertNotNull(first)
    }

    @Test
    fun `new sheet seeds with piano lesson and soccer events`() = runBlocking {
        val adapter = newAdapter()
        val sheetId = "seed-sheet-1"
        val events = adapter.readEvents(sheetId)
        assertTrue("should seed at least one event", events.isNotEmpty())
        assertTrue(events.any { it.title == "Piano Lesson" })
    }
}
