package i.drive.kids.data.repository

import i.drive.kids.data.local.dao.ChildDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.local.entity.SyncQueueEntity
import i.drive.kids.data.local.entity.toDomain
import i.drive.kids.data.local.entity.toEntity
import i.drive.kids.domain.model.Child
import i.drive.kids.domain.repository.ChildRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject

class ChildRepositoryImpl @Inject constructor(
    private val dao: ChildDao,
    private val syncQueue: SyncQueueDao,
    private val json: Json
) : ChildRepository {

    override fun getChildrenForParent(parentId: String): Flow<List<Child>> =
        dao.getChildrenForParent(parentId).map { list -> list.map { it.toDomain() } }

    override fun observeAllChildren(): Flow<List<Child>> =
        dao.getAllChildren().map { list -> list.map { it.toDomain() } }

    override suspend fun getChild(childId: String): Child? =
        dao.getChild(childId)?.toDomain()

    override suspend fun upsertChild(child: Child) {
        dao.upsert(child.toEntity())
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "CHILD",
                entityId = child.childId,
                entityJson = json.encodeToString(Child.serializer(), child),
                target = "DRIVE",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun archiveChild(childId: String) {
        dao.archiveChild(childId)
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "CHILD_ARCHIVE",
                entityId = childId,
                entityJson = """{"childId":"$childId","isArchived":true}""",
                target = "DRIVE",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun deleteChild(childId: String) {
        val entity = dao.getChild(childId) ?: return
        dao.delete(entity)
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "DELETE",
                entityType = "CHILD",
                entityId = childId,
                entityJson = """{"childId":"$childId"}""",
                target = "DRIVE",
                createdAt = System.currentTimeMillis()
            )
        )
    }
}
