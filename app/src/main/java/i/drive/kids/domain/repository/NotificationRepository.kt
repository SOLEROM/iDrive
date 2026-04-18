package i.drive.kids.domain.repository

import i.drive.kids.domain.model.NotificationEntry
import kotlinx.coroutines.flow.Flow

interface NotificationRepository {
    fun observeNotificationsForGroup(groupId: String): Flow<List<NotificationEntry>>

    fun observeUnreadNotifications(parentId: String): Flow<List<NotificationEntry>>

    suspend fun getNotification(notificationId: String): NotificationEntry?

    suspend fun upsertNotification(entry: NotificationEntry)

    suspend fun upsertNotifications(entries: List<NotificationEntry>)

    suspend fun markRead(notificationId: String, parentId: String)

    suspend fun markAllReadForGroup(groupId: String, parentId: String)

    suspend fun deleteNotification(notificationId: String)
}
