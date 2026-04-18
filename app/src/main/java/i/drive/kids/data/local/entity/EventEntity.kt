package i.drive.kids.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import i.drive.kids.data.local.db.Converters

@Entity(tableName = "events")
@TypeConverters(Converters::class)
data class EventEntity(
    @PrimaryKey val eventId: String,
    val groupId: String? = null,
    val childId: String,
    val title: String,
    val eventType: String = "CLASS",
    val description: String = "",
    val locationName: String = "",
    val locationAddress: String = "",
    val startDateTime: Long = 0L,
    val endDateTime: Long = 0L,
    val isRecurring: Boolean = false,
    /** Nullable JSON string of RecurrenceRule */
    val recurrenceRuleJson: String? = null,
    val needsRide: Boolean = false,
    val rideDirection: String = "BOTH",
    val createdByParentId: String,
    val visibilityScope: String = "GROUP",
    val status: String = "ACTIVE",
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)
