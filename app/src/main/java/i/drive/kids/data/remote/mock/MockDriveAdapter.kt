package i.drive.kids.data.remote.mock

import i.drive.kids.config.ParentPrivateConfig
import i.drive.kids.data.remote.CachedRemoteIds
import i.drive.kids.data.remote.DriveAdapter
import i.drive.kids.data.remote.KnownGroupEntry
import i.drive.kids.data.remote.PrivateDriveData
import i.drive.kids.domain.model.Child
import i.drive.kids.domain.model.ChildColor
import i.drive.kids.domain.model.NotificationPreferences
import i.drive.kids.domain.model.Parent

/**
 * In-memory mock implementation of [DriveAdapter].
 *
 * On first [readPrivateData] call for a parent that has no stored data, realistic
 * seed data is returned and committed to the in-memory store so subsequent reads
 * are consistent.
 */
class MockDriveAdapter : DriveAdapter {

    // parentId -> PrivateDriveData
    private val store: MutableMap<String, PrivateDriveData> = mutableMapOf()

    // parentId -> fake Drive fileId
    private val fileIds: MutableMap<String, String> = mutableMapOf()

    override suspend fun readPrivateData(parentId: String): PrivateDriveData? {
        if (!store.containsKey(parentId)) {
            // Seed data on first access
            val seed = buildSeedData(parentId)
            store[parentId] = seed
        }
        return store[parentId]
    }

    override suspend fun writePrivateData(parentId: String, data: PrivateDriveData) {
        store[parentId] = data
    }

    override suspend fun ensureFileExists(parentId: String): String {
        return fileIds.getOrPut(parentId) { "mock-drive-file-$parentId" }
    }

    // ── Seed data ─────────────────────────────────────────────────────────────

    private fun buildSeedData(parentId: String): PrivateDriveData {
        val now = System.currentTimeMillis()

        val parent = Parent(
            parentId = parentId,
            displayName = "Test Parent",
            email = "test.parent@example.com",
            phone = "+1-555-0100",
            groupIds = listOf("mock-group-1"),
            notificationPreferences = NotificationPreferences(),
            isAdminByGroup = mapOf("mock-group-1" to false),
            createdAt = now,
            updatedAt = now
        )

        val child = Child(
            childId = "mock-child-1",
            parentOwnerId = parentId,
            name = "Emma",
            colorTag = ChildColor.BLUE,
            notes = "Loves music and swimming",
            isArchived = false,
            createdAt = now,
            updatedAt = now
        )

        val knownGroup = KnownGroupEntry(
            groupId = "mock-group-1",
            groupName = "Soccer Parents",
            sharedSheetId = "mock-sheet-1",
            role = "MEMBER"
        )

        return PrivateDriveData(
            schemaVersion = 1,
            parent = parent,
            children = listOf(child),
            privateEvents = emptyList(),
            preferences = ParentPrivateConfig(
                parentDisplayName = parent.displayName,
                defaultReminderLeadTimeMinutes = 60
            ),
            knownGroups = listOf(knownGroup),
            cachedRemoteIds = CachedRemoteIds(
                driveFileId = "mock-drive-file-$parentId",
                sheetIds = mapOf("mock-group-1" to "mock-sheet-1")
            ),
            updatedAt = now
        )
    }
}
