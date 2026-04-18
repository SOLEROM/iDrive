package i.drive.kids.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import i.drive.kids.data.local.dao.ChildDao
import i.drive.kids.data.local.dao.EventDao
import i.drive.kids.data.local.dao.GroupDao
import i.drive.kids.data.local.dao.NotificationDao
import i.drive.kids.data.local.dao.ParentDao
import i.drive.kids.data.local.dao.ReminderDao
import i.drive.kids.data.local.dao.RideAssignmentDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.local.entity.ChildEntity
import i.drive.kids.data.local.entity.EventEntity
import i.drive.kids.data.local.entity.GroupEntity
import i.drive.kids.data.local.entity.NotificationEntryEntity
import i.drive.kids.data.local.entity.ParentEntity
import i.drive.kids.data.local.entity.ReminderEntity
import i.drive.kids.data.local.entity.RideAssignmentEntity
import i.drive.kids.data.local.entity.SyncQueueEntity

@Database(
    entities = [
        ParentEntity::class,
        ChildEntity::class,
        GroupEntity::class,
        EventEntity::class,
        RideAssignmentEntity::class,
        ReminderEntity::class,
        NotificationEntryEntity::class,
        SyncQueueEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun parentDao(): ParentDao
    abstract fun childDao(): ChildDao
    abstract fun groupDao(): GroupDao
    abstract fun eventDao(): EventDao
    abstract fun rideAssignmentDao(): RideAssignmentDao
    abstract fun reminderDao(): ReminderDao
    abstract fun notificationDao(): NotificationDao
    abstract fun syncQueueDao(): SyncQueueDao
}
