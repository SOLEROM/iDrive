package i.drive.kids.data.sync

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import i.drive.kids.data.local.dao.ChildDao
import i.drive.kids.data.local.dao.EventDao
import i.drive.kids.data.local.dao.NotificationDao
import i.drive.kids.data.local.dao.RideAssignmentDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.local.entity.toEntity
import i.drive.kids.data.remote.DriveAdapter
import i.drive.kids.data.remote.PrivateDriveData
import i.drive.kids.data.remote.SheetsAdapter
import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.Child
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.RideAssignment
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import javax.inject.Inject

class SyncEngine @Inject constructor(
    private val syncQueueDao: SyncQueueDao,
    private val driveAdapter: DriveAdapter,
    private val sheetsAdapter: SheetsAdapter,
    private val childDao: ChildDao,
    private val eventDao: EventDao,
    private val assignmentDao: RideAssignmentDao,
    private val notificationDao: NotificationDao,
    private val conflictDetector: ConflictDetector,
    private val dataStore: DataStore<Preferences>,
    private val json: Json
) {
    private val mutex = Mutex()
    private val _syncStatus = MutableStateFlow(SyncStatus())
    val syncStatus: StateFlow<SyncStatus> = _syncStatus

    suspend fun sync(parentId: String, groupId: String, sheetId: String) = mutex.withLock {
        _syncStatus.value = _syncStatus.value.copy(isSyncing = true, lastError = null)
        try {
            pushPendingOperations(parentId, sheetId)
            pullRemoteState(parentId, sheetId)
            val pendingCount = syncQueueDao.getPendingCount().first()
            _syncStatus.value = SyncStatus(
                lastSyncAt = System.currentTimeMillis(),
                isSyncing = false,
                pendingOperations = pendingCount
            )
        } catch (e: Exception) {
            _syncStatus.value = _syncStatus.value.copy(
                isSyncing = false,
                lastError = e.message
            )
        }
    }

    private suspend fun pushPendingOperations(parentId: String, sheetId: String) {
        val pending = syncQueueDao.getPending()
        for (op in pending) {
            try {
                syncQueueDao.markInFlight(op.operationId)
                when (op.target) {
                    "DRIVE" -> pushToDrive(parentId, op.entityType, op.entityId, op.entityJson)
                    "SHEETS" -> pushToSheets(sheetId, op.entityType, op.entityId, op.entityJson)
                }
                syncQueueDao.markDone(op.operationId)
            } catch (e: Exception) {
                syncQueueDao.markFailed(op.operationId)
            }
        }
        syncQueueDao.deleteDone()
    }

    private suspend fun pushToDrive(
        parentId: String,
        entityType: String,
        entityId: String,
        entityJson: String
    ) {
        val existing = driveAdapter.readPrivateData(parentId)
        if (existing == null) {
            driveAdapter.ensureFileExists(parentId)
            return
        }
        when (entityType) {
            "CHILD", "CHILD_ARCHIVE" -> {
                val updatedChild = json.decodeFromString(Child.serializer(), entityJson)
                val updatedChildren = existing.children
                    .filter { it.childId != updatedChild.childId } + updatedChild
                driveAdapter.writePrivateData(
                    parentId,
                    existing.copy(children = updatedChildren, updatedAt = System.currentTimeMillis())
                )
            }
            "PARENT" -> {
                val updatedParent = json.decodeFromString(
                    i.drive.kids.domain.model.Parent.serializer(), entityJson
                )
                driveAdapter.writePrivateData(
                    parentId,
                    existing.copy(parent = updatedParent, updatedAt = System.currentTimeMillis())
                )
            }
            else -> { /* Unknown drive entity type — skip */ }
        }
    }

    private suspend fun pushToSheets(
        sheetId: String,
        entityType: String,
        entityId: String,
        entityJson: String
    ) {
        when (entityType) {
            "EVENT", "EVENT_STATUS" -> {
                val remoteEvents = sheetsAdapter.readEvents(sheetId).toMutableList()
                if (entityType == "EVENT") {
                    val updatedEvent = json.decodeFromString(Event.serializer(), entityJson)
                    val idx = remoteEvents.indexOfFirst { it.eventId == updatedEvent.eventId }
                    if (idx >= 0) remoteEvents[idx] = updatedEvent else remoteEvents.add(updatedEvent)
                } else {
                    // EVENT_STATUS — partial update
                    val statusUpdate = json.parseToJsonElement(entityJson)
                    val statusStr = statusUpdate.jsonObject["status"]?.jsonPrimitive?.content
                    if (statusStr != null) {
                        val idx = remoteEvents.indexOfFirst { it.eventId == entityId }
                        if (idx >= 0) {
                            remoteEvents[idx] = remoteEvents[idx].copy(
                                status = i.drive.kids.domain.model.EventStatus.valueOf(statusStr)
                            )
                        }
                    }
                }
                sheetsAdapter.writeEvents(sheetId, remoteEvents)
            }
            "RIDE_ASSIGNMENT", "ASSIGNMENT_STATUS" -> {
                val remoteAssignments = sheetsAdapter.readAssignments(sheetId).toMutableList()
                if (entityType == "RIDE_ASSIGNMENT") {
                    val updated = json.decodeFromString(RideAssignment.serializer(), entityJson)
                    val idx = remoteAssignments.indexOfFirst { it.assignmentId == updated.assignmentId }
                    if (idx >= 0) remoteAssignments[idx] = updated else remoteAssignments.add(updated)
                } else {
                    val statusUpdate = json.parseToJsonElement(entityJson)
                    val statusStr = statusUpdate.jsonObject["status"]?.jsonPrimitive?.content
                    val driverStr = statusUpdate.jsonObject["driverParentId"]?.jsonPrimitive?.content
                    if (statusStr != null) {
                        val idx = remoteAssignments.indexOfFirst { it.assignmentId == entityId }
                        if (idx >= 0) {
                            remoteAssignments[idx] = remoteAssignments[idx].copy(
                                assignmentStatus = AssignmentStatus.valueOf(statusStr),
                                driverParentId = driverStr ?: remoteAssignments[idx].driverParentId
                            )
                        }
                    }
                }
                sheetsAdapter.writeAssignments(sheetId, remoteAssignments)
            }
            "NOTIFICATION" -> {
                val entry = json.decodeFromString(
                    i.drive.kids.domain.model.NotificationEntry.serializer(), entityJson
                )
                sheetsAdapter.appendNotification(sheetId, entry)
            }
            else -> { /* Unknown sheets entity type — skip */ }
        }
    }

    private suspend fun pullRemoteState(parentId: String, sheetId: String) {
        // Pull Drive data (children, parent profile)
        val driveData = driveAdapter.readPrivateData(parentId)
        if (driveData != null) {
            applyDriveData(driveData)
        }

        // Pull Sheets data (events, assignments, notifications)
        val remoteEvents = sheetsAdapter.readEvents(sheetId)
        val remoteAssignments = sheetsAdapter.readAssignments(sheetId)
        val remoteNotifications = sheetsAdapter.readNotifications(sheetId)

        // Detect assignment conflicts before persisting
        val conflicts = conflictDetector.detectAssignmentConflicts(remoteAssignments)
        val conflictAssignmentIds = conflicts
            .flatMap { it.conflictingAssignments }
            .map { it.assignmentId }
            .toSet()

        eventDao.upsertAll(remoteEvents.map { it.toEntity() })

        assignmentDao.upsertAll(
            remoteAssignments.map { assignment ->
                assignment.toEntity(isConflict = assignment.assignmentId in conflictAssignmentIds)
            }
        )

        notificationDao.upsertAll(
            remoteNotifications.map { it.toEntity() }
        )

        val hasConflicts = conflicts.isNotEmpty()
        _syncStatus.value = _syncStatus.value.copy(hasConflicts = hasConflicts)
    }

    private suspend fun applyDriveData(data: PrivateDriveData) {
        childDao.upsertAll(data.children.map { it.toEntity() })
    }
}

// Extension to access json element safely
private val kotlinx.serialization.json.JsonElement.jsonObject
    get() = this as? kotlinx.serialization.json.JsonObject
        ?: throw IllegalStateException("Expected JsonObject")

private val kotlinx.serialization.json.JsonElement.jsonPrimitive
    get() = this as? kotlinx.serialization.json.JsonPrimitive
        ?: throw IllegalStateException("Expected JsonPrimitive")
