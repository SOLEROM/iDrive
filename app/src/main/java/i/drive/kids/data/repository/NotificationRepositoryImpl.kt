package i.drive.kids.data.repository

import i.drive.kids.data.local.dao.NotificationDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.local.entity.SyncQueueEntity
import i.drive.kids.data.local.entity.toDomain
import i.drive.kids.data.local.entity.toEntity
import i.drive.kids.domain.model.NotificationEntry
import i.drive.kids.domain.repository.NotificationRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject

class NotificationRepositoryImpl @Inject constructor(
    private val dao: NotificationDao,
    private val syncQueue: SyncQueueDao,
    private val json: Json
) : NotificationRepository {

    override fun observeNotificationsForGroup(groupId: String): Flow<List<NotificationEntry>> =
        dao.getNotificationsForGroup(groupId).map { list -> list.map { it.toDomain() } }

    override fun observeUnreadNotifications(parentId: String): Flow<List<NotificationEntry>> =
        dao.getUnreadNotificationsForParent(parentId).map { list -> list.map { it.toDomain() } }

    override suspend fun getNotification(notificationId: String): NotificationEntry? =
        dao.getNotification(notificationId)?.toDomain()

    override suspend fun upsertNotification(entry: NotificationEntry) {
        dao.upsert(entry.toEntity())
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "NOTIFICATION",
                entityId = entry.notificationId,
                entityJson = json.encodeToString(NotificationEntry.serializer(), entry),
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun upsertNotifications(entries: List<NotificationEntry>) {
        dao.upsertAll(entries.map { it.toEntity() })
        entries.forEach { entry ->
            syncQueue.upsert(
                SyncQueueEntity(
                    operationId = UUID.randomUUID().toString(),
                    operationType = "UPSERT",
                    entityType = "NOTIFICATION",
                    entityId = entry.notificationId,
                    entityJson = json.encodeToString(NotificationEntry.serializer(), entry),
                    target = "SHEETS",
                    createdAt = System.currentTimeMillis()
                )
            )
        }
    }

    override suspend fun markRead(notificationId: String, parentId: String) {
        val entity = dao.getNotification(notificationId) ?: return
        if (parentId in entity.readByParentIds) return
        val updatedIds = entity.readByParentIds + parentId
        val updatedJson = json.encodeToString(
            ListSerializer(String.serializer()), updatedIds
        )
        dao.updateReadByParentIds(notificationId, updatedJson)
    }

    override suspend fun markAllReadForGroup(groupId: String, parentId: String) {
        val notifications = dao.getNotificationsForGroup(groupId).first()
        notifications.forEach { entity ->
            if (parentId !in entity.readByParentIds) {
                val updatedIds = entity.readByParentIds + parentId
                val updatedJson = json.encodeToString(
                    ListSerializer(String.serializer()), updatedIds
                )
                dao.updateReadByParentIds(entity.notificationId, updatedJson)
            }
        }
    }

    override suspend fun deleteNotification(notificationId: String) {
        dao.deleteById(notificationId)
    }
}
