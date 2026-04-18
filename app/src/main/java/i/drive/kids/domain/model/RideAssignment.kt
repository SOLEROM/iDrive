package i.drive.kids.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class RideAssignment(
    val assignmentId: String,
    val eventId: String,
    val driverParentId: String,
    val rideLeg: RideLeg,
    val assignmentStatus: AssignmentStatus = AssignmentStatus.UNASSIGNED,
    val notes: String = "",
    val claimedAt: Long? = null,
    val completedAt: Long? = null,
    val updatedAt: Long = 0L
)
