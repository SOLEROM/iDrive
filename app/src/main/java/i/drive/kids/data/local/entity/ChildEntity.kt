package i.drive.kids.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import i.drive.kids.data.local.db.Converters

@Entity(tableName = "children")
@TypeConverters(Converters::class)
data class ChildEntity(
    @PrimaryKey val childId: String,
    val parentOwnerId: String,
    val name: String,
    val colorTag: String = "BLUE",
    val notes: String = "",
    val isArchived: Boolean = false,
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)
