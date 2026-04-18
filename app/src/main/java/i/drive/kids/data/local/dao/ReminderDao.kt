package i.drive.kids.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import i.drive.kids.data.local.entity.ReminderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ReminderDao {

    @Query("SELECT * FROM reminders WHERE isDelivered = 0 AND scheduledAt <= :before")
    fun getPendingReminders(before: Long): Flow<List<ReminderEntity>>

    @Query("SELECT * FROM reminders WHERE parentId = :parentId")
    fun getRemindersForParent(parentId: String): Flow<List<ReminderEntity>>

    @Query("SELECT * FROM reminders WHERE eventId = :eventId")
    fun getRemindersForEvent(eventId: String): Flow<List<ReminderEntity>>

    @Query("SELECT * FROM reminders WHERE reminderId = :reminderId")
    suspend fun getReminder(reminderId: String): ReminderEntity?

    @Upsert
    suspend fun upsert(entity: ReminderEntity)

    @Delete
    suspend fun delete(entity: ReminderEntity)

    @Query("DELETE FROM reminders WHERE reminderId = :reminderId")
    suspend fun deleteById(reminderId: String)

    @Query("DELETE FROM reminders WHERE eventId = :eventId")
    suspend fun deleteByEventId(eventId: String)

    @Query("UPDATE reminders SET isDelivered = 1 WHERE reminderId = :reminderId")
    suspend fun markDelivered(reminderId: String)
}
