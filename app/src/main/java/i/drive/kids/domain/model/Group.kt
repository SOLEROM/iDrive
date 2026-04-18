package i.drive.kids.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Group(
    val groupId: String,
    val groupName: String,
    val sharedSheetId: String = "",
    val members: List<GroupMember> = emptyList(),
    val createdByParentId: String,
    val defaultConfigVersion: Int = 1,
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L
)

@Serializable
data class GroupMember(
    val parentId: String,
    val displayName: String,
    val email: String,
    val role: GroupRole = GroupRole.MEMBER,
    val isActive: Boolean = true
)
