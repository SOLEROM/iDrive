package i.drive.kids.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import i.drive.kids.data.local.entity.SyncQueueEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SyncQueueDao {

    @Query("SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY createdAt ASC")
    suspend fun getPending(): List<SyncQueueEntity>

    @Query("SELECT * FROM sync_queue ORDER BY createdAt ASC")
    fun getAll(): Flow<List<SyncQueueEntity>>

    @Query("SELECT COUNT(*) FROM sync_queue WHERE status = 'PENDING'")
    fun getPendingCount(): Flow<Int>

    @Upsert
    suspend fun upsert(entity: SyncQueueEntity)

    @Query("""
        UPDATE sync_queue
        SET status = 'DONE'
        WHERE operationId = :operationId
    """)
    suspend fun markDone(operationId: String)

    @Query("""
        UPDATE sync_queue
        SET status = 'FAILED',
            attempts = attempts + 1,
            lastAttemptAt = :attemptedAt
        WHERE operationId = :operationId
    """)
    suspend fun markFailed(operationId: String, attemptedAt: Long = System.currentTimeMillis())

    @Query("""
        UPDATE sync_queue
        SET status = 'IN_FLIGHT',
            attempts = attempts + 1,
            lastAttemptAt = :attemptedAt
        WHERE operationId = :operationId
    """)
    suspend fun markInFlight(operationId: String, attemptedAt: Long = System.currentTimeMillis())

    @Query("DELETE FROM sync_queue WHERE status = 'DONE'")
    suspend fun deleteDone()
}
