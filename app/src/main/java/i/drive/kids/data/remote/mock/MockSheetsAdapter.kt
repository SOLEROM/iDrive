package i.drive.kids.data.remote.mock

import i.drive.kids.config.GroupSharedConfig
import i.drive.kids.data.remote.SheetsAdapter
import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.EventStatus
import i.drive.kids.domain.model.EventType
import i.drive.kids.domain.model.GroupMember
import i.drive.kids.domain.model.GroupRole
import i.drive.kids.domain.model.NotificationEntry
import i.drive.kids.domain.model.NotificationCategory
import i.drive.kids.domain.model.RecurrenceFrequency
import i.drive.kids.domain.model.RecurrenceRule
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.domain.model.RideDirection
import i.drive.kids.domain.model.RideLeg
import i.drive.kids.domain.model.VisibilityScope
import java.time.DayOfWeek
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.util.concurrent.TimeUnit

/**
 * In-memory mock implementation of [SheetsAdapter].
 *
 * All tabs are held in per-sheetId maps. On first access for a sheet,
 * realistic seed data (2 events, 1 assignment, 1 member) is inserted.
 */
class MockSheetsAdapter : SheetsAdapter {

    private val eventsStore: MutableMap<String, MutableList<Event>> = mutableMapOf()
    private val assignmentsStore: MutableMap<String, MutableList<RideAssignment>> = mutableMapOf()
    private val parentsStore: MutableMap<String, MutableList<GroupMember>> = mutableMapOf()
    private val configStore: MutableMap<String, GroupSharedConfig> = mutableMapOf()
    private val notificationsStore: MutableMap<String, MutableList<NotificationEntry>> = mutableMapOf()
    private val sheetIds: MutableMap<String, String> = mutableMapOf() // groupId -> sheetId

    override suspend fun readEvents(sheetId: String): List<Event> {
        ensureSeedData(sheetId)
        return eventsStore[sheetId]?.toList() ?: emptyList()
    }

    override suspend fun readAssignments(sheetId: String): List<RideAssignment> {
        ensureSeedData(sheetId)
        return assignmentsStore[sheetId]?.toList() ?: emptyList()
    }

    override suspend fun readParents(sheetId: String): List<GroupMember> {
        ensureSeedData(sheetId)
        return parentsStore[sheetId]?.toList() ?: emptyList()
    }

    override suspend fun readGroupConfig(sheetId: String): GroupSharedConfig {
        ensureSeedData(sheetId)
        return configStore[sheetId] ?: GroupSharedConfig()
    }

    override suspend fun readNotifications(sheetId: String): List<NotificationEntry> {
        ensureSeedData(sheetId)
        return notificationsStore[sheetId]?.toList() ?: emptyList()
    }

    override suspend fun writeEvents(sheetId: String, events: List<Event>) {
        seededSheets.add(sheetId)
        eventsStore[sheetId] = events.toMutableList()
    }

    override suspend fun writeAssignments(sheetId: String, assignments: List<RideAssignment>) {
        seededSheets.add(sheetId)
        assignmentsStore[sheetId] = assignments.toMutableList()
    }

    override suspend fun writeGroupConfig(sheetId: String, config: GroupSharedConfig) {
        seededSheets.add(sheetId)
        configStore[sheetId] = config
    }

    override suspend fun appendNotification(sheetId: String, entry: NotificationEntry) {
        seededSheets.add(sheetId)
        notificationsStore.getOrPut(sheetId) { mutableListOf() }.add(entry)
    }

    override suspend fun ensureSheetExists(groupId: String, groupName: String): String {
        return sheetIds.getOrPut(groupId) {
            val newSheetId = "mock-sheet-$groupId"
            // Pre-seed the new sheet with initial config
            configStore[newSheetId] = GroupSharedConfig(groupName = groupName)
            newSheetId
        }
    }

    // ── Seed helpers ──────────────────────────────────────────────────────────

    private val seededSheets = mutableSetOf<String>()

    private fun ensureSeedData(sheetId: String) {
        if (seededSheets.contains(sheetId)) return
        seededSheets.add(sheetId)
        seedEvents(sheetId)
        seedAssignments(sheetId)
        seedParents(sheetId)
        seedConfig(sheetId)
    }

    private fun seedEvents(sheetId: String) {
        val now = System.currentTimeMillis()

        // Next Monday at 15:00 UTC for the Piano Lesson event
        val nextMonday = LocalDateTime.now(ZoneOffset.UTC)
            .let { ldt ->
                var d = ldt.toLocalDate()
                while (d.dayOfWeek != DayOfWeek.MONDAY) d = d.plusDays(1)
                d.atTime(15, 0)
            }
        val startMs = nextMonday.toInstant(ZoneOffset.UTC).toEpochMilli()
        val endMs = startMs + TimeUnit.HOURS.toMillis(1)

        val pianoLesson = Event(
            eventId = "mock-event-piano-1",
            groupId = "mock-group-1",
            childId = "mock-child-1",
            title = "Piano Lesson",
            eventType = EventType.MUSIC,
            description = "Weekly piano lesson at the music school",
            locationName = "City Music School",
            locationAddress = "123 Harmony Ave, Springfield",
            startDateTime = startMs,
            endDateTime = endMs,
            isRecurring = true,
            recurrenceRule = RecurrenceRule(
                frequency = RecurrenceFrequency.WEEKLY,
                daysOfWeek = listOf(DayOfWeek.MONDAY),
                intervalWeeks = 1,
                endDate = null
            ),
            needsRide = true,
            rideDirection = RideDirection.BOTH,
            createdByParentId = "mock-parent-1",
            visibilityScope = VisibilityScope.GROUP,
            status = EventStatus.ACTIVE,
            createdAt = now,
            updatedAt = now
        )

        // A soccer practice event (non-recurring)
        val soccerStart = now + TimeUnit.DAYS.toMillis(3)
        val soccerEvent = Event(
            eventId = "mock-event-soccer-1",
            groupId = "mock-group-1",
            childId = "mock-child-1",
            title = "Soccer Practice",
            eventType = EventType.SPORTS,
            description = "Saturday morning soccer",
            locationName = "Riverside Park Field 3",
            locationAddress = "Riverside Park, Springfield",
            startDateTime = soccerStart,
            endDateTime = soccerStart + TimeUnit.HOURS.toMillis(2),
            isRecurring = false,
            recurrenceRule = null,
            needsRide = true,
            rideDirection = RideDirection.BOTH,
            createdByParentId = "mock-parent-1",
            visibilityScope = VisibilityScope.GROUP,
            status = EventStatus.ACTIVE,
            createdAt = now,
            updatedAt = now
        )

        eventsStore[sheetId] = mutableListOf(pianoLesson, soccerEvent)
    }

    private fun seedAssignments(sheetId: String) {
        val now = System.currentTimeMillis()

        val unassigned = RideAssignment(
            assignmentId = "mock-assign-1",
            eventId = "mock-event-piano-1",
            driverParentId = "",       // not yet claimed
            rideLeg = RideLeg.TO,
            assignmentStatus = AssignmentStatus.UNASSIGNED,
            notes = "",
            claimedAt = null,
            completedAt = null,
            updatedAt = now
        )

        assignmentsStore[sheetId] = mutableListOf(unassigned)
    }

    private fun seedParents(sheetId: String) {
        val member = GroupMember(
            parentId = "mock-parent-1",
            displayName = "Test Parent",
            email = "test.parent@example.com",
            role = GroupRole.MEMBER,
            isActive = true
        )
        parentsStore[sheetId] = mutableListOf(member)
    }

    private fun seedConfig(sheetId: String) {
        if (!configStore.containsKey(sheetId)) {
            configStore[sheetId] = GroupSharedConfig(
                groupName = "Soccer Parents",
                groupDescription = "Parents coordinating rides for the Springfield Soccer team",
                timezone = "America/New_York",
                enableRideSharing = true
            )
        }
    }
}
