package i.drive.kids.di

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import i.drive.kids.data.local.dao.ChildDao
import i.drive.kids.data.local.dao.EventDao
import i.drive.kids.data.local.dao.NotificationDao
import i.drive.kids.data.local.dao.RideAssignmentDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.remote.DriveAdapter
import i.drive.kids.data.remote.SheetsAdapter
import i.drive.kids.data.sync.ConflictDetector
import i.drive.kids.data.sync.SyncEngine
import kotlinx.serialization.json.Json
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object SyncModule {

    @Provides
    @Singleton
    fun provideConflictDetector(): ConflictDetector = ConflictDetector()

    @Provides
    @Singleton
    fun provideSyncEngine(
        syncQueueDao: SyncQueueDao,
        driveAdapter: DriveAdapter,
        sheetsAdapter: SheetsAdapter,
        childDao: ChildDao,
        eventDao: EventDao,
        assignmentDao: RideAssignmentDao,
        notificationDao: NotificationDao,
        conflictDetector: ConflictDetector,
        dataStore: DataStore<Preferences>,
        json: Json
    ): SyncEngine = SyncEngine(
        syncQueueDao = syncQueueDao,
        driveAdapter = driveAdapter,
        sheetsAdapter = sheetsAdapter,
        childDao = childDao,
        eventDao = eventDao,
        assignmentDao = assignmentDao,
        notificationDao = notificationDao,
        conflictDetector = conflictDetector,
        dataStore = dataStore,
        json = json
    )
}
