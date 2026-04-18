package i.drive.kids.data.sync

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val syncEngine: SyncEngine,
    private val dataStore: DataStore<Preferences>
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val WORK_NAME = "SyncWorker"
        private val KEY_PARENT_ID = stringPreferencesKey("current_parent_id")
        private val KEY_GROUP_ID = stringPreferencesKey("current_group_id")
        private val KEY_SHEET_ID = stringPreferencesKey("current_sheet_id")
    }

    override suspend fun doWork(): Result {
        val prefs = dataStore.data.first()
        val parentId = prefs[KEY_PARENT_ID]
        val groupId = prefs[KEY_GROUP_ID]
        val sheetId = prefs[KEY_SHEET_ID]

        if (parentId.isNullOrBlank() || groupId.isNullOrBlank() || sheetId.isNullOrBlank()) {
            return Result.failure()
        }

        return try {
            syncEngine.sync(parentId, groupId, sheetId)
            if (syncEngine.syncStatus.value.lastError != null) {
                Result.retry()
            } else {
                Result.success()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
