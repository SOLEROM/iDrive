package i.drive.kids.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import i.drive.kids.data.local.db.Converters

@Entity(tableName = "parents")
@TypeConverters(Converters::class)
data class ParentEntity(
    @PrimaryKey val parentId: String,
    val displayName: String,
    val email: String,
    val phone: String? = null,
    val groupIds: List<String> = emptyList(),
    val notificationPreferencesJson: String = "{}",
    val isAdminByGroup: Map<String, Boolean> = emptyMap(),
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)
