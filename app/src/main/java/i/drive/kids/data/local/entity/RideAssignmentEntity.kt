package i.drive.kids.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import i.drive.kids.data.local.db.Converters

@Entity(tableName = "ride_assignments")
@TypeConverters(Converters::class)
data class RideAssignmentEntity(
    @PrimaryKey val assignmentId: String,
    val eventId: String,
    val driverParentId: String,
    val rideLeg: String,
    val assignmentStatus: String = "UNASSIGNED",
    val notes: String = "",
    val claimedAt: Long? = null,
    val completedAt: Long? = null,
    val updatedAt: Long = 0L,
    val isConflict: Boolean = false
)
