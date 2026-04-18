package i.drive.kids.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import i.drive.kids.data.local.entity.RideAssignmentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface RideAssignmentDao {

    @Query("SELECT * FROM ride_assignments WHERE eventId = :eventId")
    fun getAssignmentsForEvent(eventId: String): Flow<List<RideAssignmentEntity>>

    @Query("SELECT * FROM ride_assignments WHERE driverParentId = :driverParentId")
    fun getAssignmentsForDriver(driverParentId: String): Flow<List<RideAssignmentEntity>>

    @Query("SELECT * FROM ride_assignments WHERE assignmentStatus = 'UNASSIGNED'")
    fun getUnassigned(): Flow<List<RideAssignmentEntity>>

    @Query("SELECT * FROM ride_assignments WHERE isConflict = 1")
    fun getConflicts(): Flow<List<RideAssignmentEntity>>

    @Query("SELECT * FROM ride_assignments WHERE assignmentId = :assignmentId")
    suspend fun getAssignment(assignmentId: String): RideAssignmentEntity?

    @Upsert
    suspend fun upsert(entity: RideAssignmentEntity)

    @Upsert
    suspend fun upsertAll(entities: List<RideAssignmentEntity>)

    @Delete
    suspend fun delete(entity: RideAssignmentEntity)

    @Query("DELETE FROM ride_assignments WHERE assignmentId = :assignmentId")
    suspend fun deleteById(assignmentId: String)

    @Query("""
        UPDATE ride_assignments
        SET assignmentStatus = :status,
            driverParentId = CASE WHEN :driverParentId IS NOT NULL THEN :driverParentId ELSE driverParentId END
        WHERE assignmentId = :assignmentId
    """)
    suspend fun updateStatus(assignmentId: String, status: String, driverParentId: String? = null)
}
