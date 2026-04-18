package i.drive.kids.data.sync

import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.RideAssignment
import javax.inject.Inject

/** Result of a conflict check. */
sealed class ConflictResult {
    /** No conflict detected. */
    object NoConflict : ConflictResult()

    /**
     * A generic conflict between two versions of the same entity.
     * @param localUpdatedAt  Timestamp of the locally-stored version.
     * @param remoteUpdatedAt Timestamp of the remotely-fetched version.
     */
    data class SimpleConflict(
        val entityId: String,
        val entityType: String,
        val localUpdatedAt: Long,
        val remoteUpdatedAt: Long
    ) : ConflictResult()

    /**
     * A ride-assignment conflict where two drivers have both claimed the same leg.
     * @param conflictingAssignments The two (or more) assignments that are in conflict.
     */
    data class AssignmentConflict(
        val eventId: String,
        val conflictingAssignments: List<RideAssignment>
    ) : ConflictResult()
}

class ConflictDetector @Inject constructor() {

    /**
     * Compare a local entity's [localUpdatedAt] with the remote [remoteUpdatedAt].
     * Returns [ConflictResult.SimpleConflict] when the remote is newer, meaning the
     * local write may overwrite a more recent change.
     */
    fun detectEntityConflict(
        entityId: String,
        entityType: String,
        localUpdatedAt: Long,
        remoteUpdatedAt: Long
    ): ConflictResult {
        return if (remoteUpdatedAt > localUpdatedAt) {
            ConflictResult.SimpleConflict(
                entityId = entityId,
                entityType = entityType,
                localUpdatedAt = localUpdatedAt,
                remoteUpdatedAt = remoteUpdatedAt
            )
        } else {
            ConflictResult.NoConflict
        }
    }

    /**
     * Check for assignment conflicts: more than one VOLUNTEERED/CONFIRMED assignment
     * for the same (eventId, rideLeg) combination implies two drivers claimed the same seat.
     */
    fun detectAssignmentConflicts(assignments: List<RideAssignment>): List<ConflictResult.AssignmentConflict> {
        val activeStatuses = setOf(
            i.drive.kids.domain.model.AssignmentStatus.VOLUNTEERED,
            i.drive.kids.domain.model.AssignmentStatus.CONFIRMED
        )
        return assignments
            .filter { it.assignmentStatus in activeStatuses }
            .groupBy { it.eventId to it.rideLeg }
            .filter { (_, group) -> group.size > 1 }
            .map { (key, group) ->
                ConflictResult.AssignmentConflict(
                    eventId = key.first,
                    conflictingAssignments = group
                )
            }
    }

    /**
     * Compare local and remote event lists, returning [ConflictResult.SimpleConflict]
     * entries for every event that was modified remotely since the local version.
     */
    fun detectEventConflicts(
        localEvents: List<Event>,
        remoteEvents: List<Event>
    ): List<ConflictResult> {
        val localById = localEvents.associateBy { it.eventId }
        return remoteEvents.mapNotNull { remote ->
            val local = localById[remote.eventId] ?: return@mapNotNull null
            if (remote.updatedAt > local.updatedAt) {
                ConflictResult.SimpleConflict(
                    entityId = remote.eventId,
                    entityType = "EVENT",
                    localUpdatedAt = local.updatedAt,
                    remoteUpdatedAt = remote.updatedAt
                )
            } else null
        }
    }
}
