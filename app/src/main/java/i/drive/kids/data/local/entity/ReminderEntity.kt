package i.drive.kids.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import i.drive.kids.data.local.db.Converters

@Entity(tableName = "reminders")
@TypeConverters(Converters::class)
data class ReminderEntity(
    @PrimaryKey val reminderId: String,
    val parentId: String,
    val eventId: String,
    val type: String,
    val scheduledAt: Long,
    val isDelivered: Boolean = false,
    val deliveryChannel: String = "LOCAL_NOTIFICATION",
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)
