package i.drive.kids.data.remote

import i.drive.kids.domain.model.Child
import i.drive.kids.domain.model.ChildColor
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.EventType
import i.drive.kids.domain.model.Parent
import i.drive.kids.domain.model.RecurrenceFrequency
import i.drive.kids.domain.model.RecurrenceRule
import i.drive.kids.domain.model.RideDirection
import i.drive.kids.domain.model.VisibilityScope
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek

/**
 * JsonSchemaTest — verifies the PrivateDriveData root object (what is actually
 * written to Google Drive) survives a full serialize/deserialize round-trip
 * with every field populated.
 */
class PrivateDriveDataJsonTest {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    @Test
    fun `full PrivateDriveData round-trips`() {
        val parent = Parent(
            parentId = "p1",
            displayName = "Alex Parent",
            email = "alex@example.com",
            phone = "+1-555-0100",
            groupIds = listOf("g1", "g2"),
            isAdminByGroup = mapOf("g1" to true),
            createdAt = 1_000L,
            updatedAt = 2_000L
        )
        val child = Child(
            childId = "c1",
            parentOwnerId = "p1",
            name = "Sam",
            colorTag = ChildColor.GREEN,
            notes = "Allergic to peanuts",
            createdAt = 1_000L,
            updatedAt = 2_000L
        )
        val privateEvent = Event(
            eventId = "priv-e1",
            childId = "c1",
            title = "Therapy",
            eventType = EventType.THERAPY,
            startDateTime = 1_714_500_000_000L,
            endDateTime = 1_714_503_600_000L,
            isRecurring = true,
            recurrenceRule = RecurrenceRule(
                frequency = RecurrenceFrequency.WEEKLY,
                daysOfWeek = listOf(DayOfWeek.TUESDAY),
                intervalWeeks = 1
            ),
            needsRide = true,
            rideDirection = RideDirection.BOTH,
            createdByParentId = "p1",
            visibilityScope = VisibilityScope.PRIVATE,
            createdAt = 1_000L,
            updatedAt = 2_000L
        )
        val data = PrivateDriveData(
            schemaVersion = 1,
            parent = parent,
            children = listOf(child),
            privateEvents = listOf(privateEvent),
            knownGroups = listOf(
                KnownGroupEntry(
                    groupId = "g1",
                    groupName = "Soccer Parents",
                    sharedSheetId = "sheet-1",
                    role = "ADMIN"
                )
            ),
            cachedRemoteIds = CachedRemoteIds(
                driveFileId = "drive-file-1",
                sheetIds = mapOf("g1" to "sheet-1")
            ),
            updatedAt = 3_000L
        )

        val text = json.encodeToString(data)
        val restored = json.decodeFromString<PrivateDriveData>(text)

        assertEquals(data, restored)
        assertTrue("JSON should contain schemaVersion field",
            text.contains("\"schemaVersion\""))
    }

    @Test
    fun `minimum PrivateDriveData round-trips with defaults`() {
        val data = PrivateDriveData(
            parent = Parent(parentId = "p1", displayName = "X", email = "x@y.z")
        )
        val text = json.encodeToString(data)
        val restored = json.decodeFromString<PrivateDriveData>(text)
        assertEquals(data, restored)
    }
}
