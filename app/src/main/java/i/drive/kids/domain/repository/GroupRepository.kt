package i.drive.kids.domain.repository

import i.drive.kids.domain.model.Group
import i.drive.kids.domain.model.GroupMember
import kotlinx.coroutines.flow.Flow

interface GroupRepository {
    fun observeGroupsForParent(parentId: String): Flow<List<Group>>

    fun observeAllGroups(): Flow<List<Group>>

    suspend fun getGroup(groupId: String): Group?

    suspend fun upsertGroup(group: Group)

    suspend fun deleteGroup(groupId: String)

    suspend fun addMember(groupId: String, member: GroupMember)

    suspend fun removeMember(groupId: String, parentId: String)

    suspend fun updateSheetId(groupId: String, sheetId: String)
}
