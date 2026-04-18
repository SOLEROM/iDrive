package i.drive.kids.data.sync

data class SyncStatus(
    val lastSyncAt: Long? = null,
    val isSyncing: Boolean = false,
    val pendingOperations: Int = 0,
    val hasConflicts: Boolean = false,
    val lastError: String? = null
)
