package i.drive.kids.data.repository

import i.drive.kids.data.local.dao.GroupDao
import i.drive.kids.data.local.dao.ParentDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.local.entity.SyncQueueEntity
import i.drive.kids.data.local.entity.toDomain
import i.drive.kids.data.local.entity.toEntity
import i.drive.kids.domain.model.Group
import i.drive.kids.domain.model.GroupMember
import i.drive.kids.domain.repository.GroupRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject

class GroupRepositoryImpl @Inject constructor(
    private val dao: GroupDao,
    private val parentDao: ParentDao,
    private val syncQueue: SyncQueueDao,
    private val json: Json
) : GroupRepository {

    override fun observeGroupsForParent(parentId: String): Flow<List<Group>> {
        // Get the parent's groupIds, then emit all groups that match
        return parentDao.getParent(parentId)
            .flatMapLatest { parentEntity ->
                val groupIds = parentEntity?.groupIds ?: emptyList()
                dao.getAllGroups().map { groups ->
                    groups.filter { it.groupId in groupIds }.map { it.toDomain() }
                }
            }
    }

    override fun observeAllGroups(): Flow<List<Group>> =
        dao.getAllGroups().map { list -> list.map { it.toDomain() } }

    override suspend fun getGroup(groupId: String): Group? =
        dao.getGroup(groupId)?.toDomain()

    override suspend fun upsertGroup(group: Group) {
        dao.upsert(group.toEntity())
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "GROUP",
                entityId = group.groupId,
                entityJson = json.encodeToString(Group.serializer(), group),
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun deleteGroup(groupId: String) {
        dao.deleteById(groupId)
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "DELETE",
                entityType = "GROUP",
                entityId = groupId,
                entityJson = """{"groupId":"$groupId"}""",
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun addMember(groupId: String, member: GroupMember) {
        val existing = dao.getGroup(groupId) ?: return
        val group = existing.toDomain()
        val updatedMembers = group.members.filter { it.parentId != member.parentId } + member
        val updatedGroup = group.copy(
            members = updatedMembers,
            updatedAt = System.currentTimeMillis()
        )
        dao.upsert(updatedGroup.toEntity())
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "GROUP",
                entityId = groupId,
                entityJson = json.encodeToString(Group.serializer(), updatedGroup),
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun removeMember(groupId: String, parentId: String) {
        val existing = dao.getGroup(groupId) ?: return
        val group = existing.toDomain()
        val updatedGroup = group.copy(
            members = group.members.filter { it.parentId != parentId },
            updatedAt = System.currentTimeMillis()
        )
        dao.upsert(updatedGroup.toEntity())
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "GROUP",
                entityId = groupId,
                entityJson = json.encodeToString(Group.serializer(), updatedGroup),
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun updateSheetId(groupId: String, sheetId: String) {
        dao.updateSheetId(groupId, sheetId)
    }
}
