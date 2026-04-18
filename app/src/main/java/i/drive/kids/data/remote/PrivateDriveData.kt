package i.drive.kids.data.remote

import i.drive.kids.config.ParentPrivateConfig
import i.drive.kids.domain.model.Child
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.Parent
import kotlinx.serialization.Serializable

/**
 * Root object stored as JSON in the parent's private Google Drive file
 * (`kids_rides_private_data.json`). Maps directly to the schema in DATA_MODEL.md §2.
 */
@Serializable
data class PrivateDriveData(
    val schemaVersion: Int = 1,
    val parent: Parent,
    val children: List<Child> = emptyList(),
    /** Events with visibilityScope == PRIVATE */
    val privateEvents: List<Event> = emptyList(),
    val preferences: ParentPrivateConfig = ParentPrivateConfig(),
    val knownGroups: List<KnownGroupEntry> = emptyList(),
    val cachedRemoteIds: CachedRemoteIds = CachedRemoteIds(),
    val updatedAt: Long = 0L
)

@Serializable
data class KnownGroupEntry(
    val groupId: String,
    val groupName: String,
    val sharedSheetId: String,
    val role: String = "MEMBER"
)

@Serializable
data class CachedRemoteIds(
    val driveFileId: String = "",
    /** Maps groupId -> sheetId */
    val sheetIds: Map<String, String> = emptyMap()
)
