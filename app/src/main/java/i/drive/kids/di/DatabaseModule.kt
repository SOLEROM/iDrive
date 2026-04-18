package i.drive.kids.di

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import i.drive.kids.data.local.dao.ChildDao
import i.drive.kids.data.local.dao.EventDao
import i.drive.kids.data.local.dao.GroupDao
import i.drive.kids.data.local.dao.NotificationDao
import i.drive.kids.data.local.dao.ParentDao
import i.drive.kids.data.local.dao.ReminderDao
import i.drive.kids.data.local.dao.RideAssignmentDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.local.db.AppDatabase
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(
        @ApplicationContext context: Context
    ): AppDatabase = Room.databaseBuilder(
        context,
        AppDatabase::class.java,
        "idrive_kids.db"
    ).build()

    @Provides
    @Singleton
    fun provideParentDao(db: AppDatabase): ParentDao = db.parentDao()

    @Provides
    @Singleton
    fun provideChildDao(db: AppDatabase): ChildDao = db.childDao()

    @Provides
    @Singleton
    fun provideGroupDao(db: AppDatabase): GroupDao = db.groupDao()

    @Provides
    @Singleton
    fun provideEventDao(db: AppDatabase): EventDao = db.eventDao()

    @Provides
    @Singleton
    fun provideRideAssignmentDao(db: AppDatabase): RideAssignmentDao = db.rideAssignmentDao()

    @Provides
    @Singleton
    fun provideReminderDao(db: AppDatabase): ReminderDao = db.reminderDao()

    @Provides
    @Singleton
    fun provideNotificationDao(db: AppDatabase): NotificationDao = db.notificationDao()

    @Provides
    @Singleton
    fun provideSyncQueueDao(db: AppDatabase): SyncQueueDao = db.syncQueueDao()
}
