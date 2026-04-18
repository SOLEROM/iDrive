package i.drive.kids.data.remote

import i.drive.kids.config.GroupSharedConfig
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.GroupMember
import i.drive.kids.domain.model.NotificationEntry
import i.drive.kids.domain.model.RideAssignment

interface SheetsAdapter {
    /** Read all Events from the Events tab. */
    suspend fun readEvents(sheetId: String): List<Event>

    /** Read all RideAssignments from the Assignments tab. */
    suspend fun readAssignments(sheetId: String): List<RideAssignment>

    /** Read all parent members from the Parents tab. */
    suspend fun readParents(sheetId: String): List<GroupMember>

    /** Read group-level configuration from the GroupConfig tab. */
    suspend fun readGroupConfig(sheetId: String): GroupSharedConfig

    /** Read all NotificationEntries from the Notifications tab. */
    suspend fun readNotifications(sheetId: String): List<NotificationEntry>

    /** Overwrite all rows in the Events tab. */
    suspend fun writeEvents(sheetId: String, events: List<Event>)

    /** Overwrite all rows in the Assignments tab. */
    suspend fun writeAssignments(sheetId: String, assignments: List<RideAssignment>)

    /** Overwrite the GroupConfig tab with the given config. */
    suspend fun writeGroupConfig(sheetId: String, config: GroupSharedConfig)

    /** Append a single notification entry to the Notifications tab. */
    suspend fun appendNotification(sheetId: String, entry: NotificationEntry)

    /**
     * Ensures a shared Sheet exists for the group.
     * Creates a new spreadsheet with the required tabs if absent.
     * @return the Google Sheets spreadsheetId.
     */
    suspend fun ensureSheetExists(groupId: String, groupName: String): String
}
