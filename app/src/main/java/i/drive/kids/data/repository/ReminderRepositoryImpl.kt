package i.drive.kids.data.repository

import i.drive.kids.data.local.dao.ReminderDao
import i.drive.kids.data.local.entity.toDomain
import i.drive.kids.data.local.entity.toEntity
import i.drive.kids.domain.model.Reminder
import i.drive.kids.domain.repository.ReminderRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class ReminderRepositoryImpl @Inject constructor(
    private val dao: ReminderDao
) : ReminderRepository {

    override fun observeRemindersForParent(parentId: String): Flow<List<Reminder>> =
        dao.getRemindersForParent(parentId).map { list -> list.map { it.toDomain() } }

    override fun observePendingReminders(beforeEpochMs: Long): Flow<List<Reminder>> =
        dao.getPendingReminders(beforeEpochMs).map { list -> list.map { it.toDomain() } }

    override suspend fun getReminder(reminderId: String): Reminder? =
        dao.getReminder(reminderId)?.toDomain()

    override suspend fun upsertReminder(reminder: Reminder) {
        dao.upsert(reminder.toEntity())
    }

    override suspend fun markDelivered(reminderId: String) {
        dao.markDelivered(reminderId)
    }

    override suspend fun deleteReminder(reminderId: String) {
        dao.deleteById(reminderId)
    }

    override suspend fun deleteRemindersForEvent(eventId: String) {
        dao.deleteByEventId(eventId)
    }
}
