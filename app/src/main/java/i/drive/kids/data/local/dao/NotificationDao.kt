package i.drive.kids.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import i.drive.kids.data.local.entity.NotificationEntryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationDao {

    @Query("SELECT * FROM notifications WHERE groupId = :groupId ORDER BY createdAt DESC")
    fun getNotificationsForGroup(groupId: String): Flow<List<NotificationEntryEntity>>

    /**
     * Returns notifications where the parentId is NOT in the readByParentIds JSON array.
     * Room cannot query inside a JSON array natively, so we do a string-not-contains check
     * which is sufficient for simple parentId formats without special chars.
     */
    @Query("SELECT * FROM notifications WHERE readByParentIds NOT LIKE '%' || :parentId || '%' ORDER BY createdAt DESC")
    fun getUnreadNotificationsForParent(parentId: String): Flow<List<NotificationEntryEntity>>

    @Query("SELECT COUNT(*) FROM notifications WHERE readByParentIds NOT LIKE '%' || :parentId || '%'")
    fun getUnreadCount(parentId: String): Flow<Int>

    @Query("SELECT * FROM notifications WHERE notificationId = :notificationId")
    suspend fun getNotification(notificationId: String): NotificationEntryEntity?

    @Upsert
    suspend fun upsert(entity: NotificationEntryEntity)

    @Upsert
    suspend fun upsertAll(entities: List<NotificationEntryEntity>)

    @Delete
    suspend fun delete(entity: NotificationEntryEntity)

    @Query("DELETE FROM notifications WHERE notificationId = :notificationId")
    suspend fun deleteById(notificationId: String)

    /**
     * Mark a notification as read by appending the parentId to readByParentIds JSON.
     * We fetch + update at the repository layer for correctness.
     */
    @Query("UPDATE notifications SET readByParentIds = :updatedJson WHERE notificationId = :notificationId")
    suspend fun updateReadByParentIds(notificationId: String, updatedJson: String)
}
