package i.drive.kids.data.repository

import i.drive.kids.data.local.dao.EventDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.local.entity.SyncQueueEntity
import i.drive.kids.data.local.entity.toDomain
import i.drive.kids.data.local.entity.toEntity
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.EventStatus
import i.drive.kids.domain.model.VisibilityScope
import i.drive.kids.domain.repository.EventRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject

class EventRepositoryImpl @Inject constructor(
    private val dao: EventDao,
    private val syncQueue: SyncQueueDao,
    private val json: Json
) : EventRepository {

    override fun observeEventsForGroup(groupId: String): Flow<List<Event>> =
        dao.getEventsForGroup(groupId).map { list -> list.map { it.toDomain() } }

    override fun observeEventsForChild(childId: String): Flow<List<Event>> =
        dao.getEventsForChild(childId).map { list -> list.map { it.toDomain() } }

    override fun observeUpcomingEvents(afterEpochMs: Long, limit: Int): Flow<List<Event>> =
        dao.getEventsAfter(afterEpochMs, limit).map { list -> list.map { it.toDomain() } }

    override fun observeEventsByVisibility(
        groupId: String,
        visibilityScope: VisibilityScope
    ): Flow<List<Event>> =
        dao.getEventsForGroupByVisibility(groupId, visibilityScope.name)
            .map { list -> list.map { it.toDomain() } }

    override suspend fun getEvent(eventId: String): Event? =
        dao.getEvent(eventId)?.toDomain()

    override suspend fun upsertEvent(event: Event) {
        dao.upsert(event.toEntity())
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "EVENT",
                entityId = event.eventId,
                entityJson = json.encodeToString(Event.serializer(), event),
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun upsertEvents(events: List<Event>) {
        dao.upsertAll(events.map { it.toEntity() })
        events.forEach { event ->
            syncQueue.upsert(
                SyncQueueEntity(
                    operationId = UUID.randomUUID().toString(),
                    operationType = "UPSERT",
                    entityType = "EVENT",
                    entityId = event.eventId,
                    entityJson = json.encodeToString(Event.serializer(), event),
                    target = "SHEETS",
                    createdAt = System.currentTimeMillis()
                )
            )
        }
    }

    override suspend fun updateEventStatus(eventId: String, status: EventStatus) {
        dao.updateStatus(eventId, status.name)
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "EVENT_STATUS",
                entityId = eventId,
                entityJson = """{"eventId":"$eventId","status":"${status.name}"}""",
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun deleteEvent(eventId: String) {
        dao.deleteById(eventId)
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "DELETE",
                entityType = "EVENT",
                entityId = eventId,
                entityJson = """{"eventId":"$eventId"}""",
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }
}
