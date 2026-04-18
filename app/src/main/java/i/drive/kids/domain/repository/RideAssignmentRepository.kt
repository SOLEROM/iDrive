package i.drive.kids.domain.repository

import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.RideAssignment
import kotlinx.coroutines.flow.Flow

interface RideAssignmentRepository {
    fun observeAssignmentsForEvent(eventId: String): Flow<List<RideAssignment>>

    fun observeAssignmentsForDriver(driverParentId: String): Flow<List<RideAssignment>>

    fun observeUnassignedForGroup(groupId: String): Flow<List<RideAssignment>>

    suspend fun getAssignment(assignmentId: String): RideAssignment?

    suspend fun upsertAssignment(assignment: RideAssignment)

    suspend fun upsertAssignments(assignments: List<RideAssignment>)

    suspend fun updateAssignmentStatus(
        assignmentId: String,
        status: AssignmentStatus,
        driverParentId: String? = null
    )

    suspend fun deleteAssignment(assignmentId: String)
}
