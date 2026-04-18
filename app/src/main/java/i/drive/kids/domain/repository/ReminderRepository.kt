package i.drive.kids.domain.repository

import i.drive.kids.domain.model.Reminder
import kotlinx.coroutines.flow.Flow

interface ReminderRepository {
    fun observeRemindersForParent(parentId: String): Flow<List<Reminder>>

    fun observePendingReminders(beforeEpochMs: Long): Flow<List<Reminder>>

    suspend fun getReminder(reminderId: String): Reminder?

    suspend fun upsertReminder(reminder: Reminder)

    suspend fun markDelivered(reminderId: String)

    suspend fun deleteReminder(reminderId: String)

    suspend fun deleteRemindersForEvent(eventId: String)
}
