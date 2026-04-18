package i.drive.kids.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import i.drive.kids.data.local.db.Converters

@Entity(tableName = "notifications")
@TypeConverters(Converters::class)
data class NotificationEntryEntity(
    @PrimaryKey val notificationId: String,
    val groupId: String,
    val eventId: String? = null,
    val assignmentId: String? = null,
    val triggeredByParentId: String,
    val message: String,
    val category: String,
    val createdAt: Long = 0L,
    val readByParentIds: List<String> = emptyList()
)
