package i.drive.kids.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import i.drive.kids.data.local.entity.EventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface EventDao {

    @Query("SELECT * FROM events WHERE childId = :childId")
    fun getEventsForChild(childId: String): Flow<List<EventEntity>>

    @Query("SELECT * FROM events WHERE groupId = :groupId")
    fun getEventsForGroup(groupId: String): Flow<List<EventEntity>>

    @Query("SELECT * FROM events WHERE groupId = :groupId AND visibilityScope = :visibilityScope")
    fun getEventsForGroupByVisibility(groupId: String, visibilityScope: String): Flow<List<EventEntity>>

    @Query("SELECT * FROM events WHERE eventId = :eventId")
    suspend fun getEvent(eventId: String): EventEntity?

    @Query("SELECT * FROM events WHERE startDateTime >= :timestamp ORDER BY startDateTime ASC LIMIT :limit")
    fun getEventsAfter(timestamp: Long, limit: Int = 20): Flow<List<EventEntity>>

    @Upsert
    suspend fun upsert(entity: EventEntity)

    @Upsert
    suspend fun upsertAll(entities: List<EventEntity>)

    @Delete
    suspend fun delete(entity: EventEntity)

    @Query("DELETE FROM events WHERE eventId = :eventId")
    suspend fun deleteById(eventId: String)

    @Query("UPDATE events SET status = :status WHERE eventId = :eventId")
    suspend fun updateStatus(eventId: String, status: String)
}
