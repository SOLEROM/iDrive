package i.drive.kids.data.repository

import i.drive.kids.data.local.dao.EventDao
import i.drive.kids.data.local.dao.RideAssignmentDao
import i.drive.kids.data.local.dao.SyncQueueDao
import i.drive.kids.data.local.entity.SyncQueueEntity
import i.drive.kids.data.local.entity.toDomain
import i.drive.kids.data.local.entity.toEntity
import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.domain.repository.RideAssignmentRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import java.util.UUID
import javax.inject.Inject

class RideAssignmentRepositoryImpl @Inject constructor(
    private val dao: RideAssignmentDao,
    private val eventDao: EventDao,
    private val syncQueue: SyncQueueDao,
    private val json: Json
) : RideAssignmentRepository {

    override fun observeAssignmentsForEvent(eventId: String): Flow<List<RideAssignment>> =
        dao.getAssignmentsForEvent(eventId).map { list -> list.map { it.toDomain() } }

    override fun observeAssignmentsForDriver(driverParentId: String): Flow<List<RideAssignment>> =
        dao.getAssignmentsForDriver(driverParentId).map { list -> list.map { it.toDomain() } }

    override fun observeUnassignedForGroup(groupId: String): Flow<List<RideAssignment>> {
        // Get all events for this group, then collect unassigned assignments for those events
        return eventDao.getEventsForGroup(groupId)
            .flatMapLatest { events ->
                val eventIds = events.map { it.eventId }.toSet()
                dao.getUnassigned().map { assignments ->
                    assignments
                        .filter { it.eventId in eventIds }
                        .map { it.toDomain() }
                }
            }
    }

    override suspend fun getAssignment(assignmentId: String): RideAssignment? =
        dao.getAssignment(assignmentId)?.toDomain()

    override suspend fun upsertAssignment(assignment: RideAssignment) {
        dao.upsert(assignment.toEntity())
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "RIDE_ASSIGNMENT",
                entityId = assignment.assignmentId,
                entityJson = json.encodeToString(RideAssignment.serializer(), assignment),
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun upsertAssignments(assignments: List<RideAssignment>) {
        dao.upsertAll(assignments.map { it.toEntity() })
        assignments.forEach { assignment ->
            syncQueue.upsert(
                SyncQueueEntity(
                    operationId = UUID.randomUUID().toString(),
                    operationType = "UPSERT",
                    entityType = "RIDE_ASSIGNMENT",
                    entityId = assignment.assignmentId,
                    entityJson = json.encodeToString(RideAssignment.serializer(), assignment),
                    target = "SHEETS",
                    createdAt = System.currentTimeMillis()
                )
            )
        }
    }

    override suspend fun updateAssignmentStatus(
        assignmentId: String,
        status: AssignmentStatus,
        driverParentId: String?
    ) {
        dao.updateStatus(assignmentId, status.name, driverParentId)
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "UPSERT",
                entityType = "ASSIGNMENT_STATUS",
                entityId = assignmentId,
                entityJson = buildString {
                    append("""{"assignmentId":"$assignmentId","status":"${status.name}"""")
                    if (driverParentId != null) append(""","driverParentId":"$driverParentId"""")
                    append("}")
                },
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }

    override suspend fun deleteAssignment(assignmentId: String) {
        dao.deleteById(assignmentId)
        syncQueue.upsert(
            SyncQueueEntity(
                operationId = UUID.randomUUID().toString(),
                operationType = "DELETE",
                entityType = "RIDE_ASSIGNMENT",
                entityId = assignmentId,
                entityJson = """{"assignmentId":"$assignmentId"}""",
                target = "SHEETS",
                createdAt = System.currentTimeMillis()
            )
        )
    }
}
