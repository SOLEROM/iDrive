package i.drive.kids.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import i.drive.kids.data.local.db.Converters

@Entity(tableName = "groups")
@TypeConverters(Converters::class)
data class GroupEntity(
    @PrimaryKey val groupId: String,
    val groupName: String,
    val sharedSheetId: String = "",
    /** Serialized List<GroupMember> as JSON */
    val membersJson: String = "[]",
    val createdByParentId: String,
    val defaultConfigVersion: Int = 1,
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)
