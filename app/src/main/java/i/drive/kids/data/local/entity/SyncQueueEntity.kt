package i.drive.kids.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey val operationId: String,
    /** UPSERT | DELETE */
    val operationType: String,
    val entityType: String,
    val entityId: String,
    val entityJson: String,
    /** DRIVE | SHEETS */
    val target: String,
    val createdAt: Long,
    val attempts: Int = 0,
    val lastAttemptAt: Long? = null,
    /** PENDING | IN_FLIGHT | FAILED | DONE */
    val status: String = "PENDING"
)
