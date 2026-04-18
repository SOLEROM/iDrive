package i.drive.kids.config

import kotlinx.serialization.Serializable

@Serializable
data class SyncConfig(
    val syncOnStartup: Boolean = true,
    val syncOnResume: Boolean = true,
    val syncOnMutation: Boolean = true,
    val syncRetryCount: Int = 5,
    val syncRetryBackoffSeconds: Int = 30,
    val syncBatchSize: Int = 50,
    val maxOfflineQueueSize: Int = 500,
    val requireWifiForLargeSync: Boolean = false,
    val localCacheRetentionDays: Int = 90
)
