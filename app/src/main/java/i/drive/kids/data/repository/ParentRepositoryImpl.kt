package i.drive.kids.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import i.drive.kids.data.local.dao.ParentDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.local.entity.SyncQueueEntity
import i.drive.kids.data.local.entity.toDomain
import i.drive.kids.data.local.entity.toEntity
import i.drive.kids.domain.model.Parent
import i.drive.kids.domain.repository.ParentRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject

class ParentRepositoryImpl @Inject constructor(
    private val dao: ParentDao,
    private val syncQueue: SyncQueueDao,
    private val dataStore: DataStore<Preferences>,
    private val json: Json
) : ParentRepository {

    private val currentParentIdKey = stringPreferencesKey("current_parent_id")

    override fun observeCurrentParent(): Flow<Parent?> =
        dataStore.data
            .flatMapLatest { prefs ->
                val parentId = prefs[currentParentIdKey]
                if (parentId.isNullOrBlank()) {
                    flowOf(null)
                } else {
                    dao.getParent(parentId).map { it?.toDomain() }
                }
            }

    override fun observeAllParents(): Flow<List<Parent>> =
        dao.getAllParents().map { list -> list.map { it.toDomain() } }

    override suspend fun getParent(parentId: String): Parent? =
        dao.getParentOnce(parentId)?.toDomain()

    override suspend fun upsertParent(parent: Parent) {
        dao.upsert(parent.toEntity())
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "PARENT",
                entityId = parent.parentId,
                entityJson = json.encodeToString(Parent.serializer(), parent),
                target = "DRIVE",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun deleteParent(parentId: String) {
        dao.deleteById(parentId)
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "DELETE",
                entityType = "PARENT",
                entityId = parentId,
                entityJson = """{"parentId":"$parentId"}""",
                target = "DRIVE",
                createdAt = System.currentTimeMillis()
            )
        )
    }
}
