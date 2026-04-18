package i.drive.kids.domain.repository

import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.EventStatus
import i.drive.kids.domain.model.VisibilityScope
import kotlinx.coroutines.flow.Flow

interface EventRepository {
    fun observeEventsForGroup(groupId: String): Flow<List<Event>>

    fun observeEventsForChild(childId: String): Flow<List<Event>>

    fun observeUpcomingEvents(afterEpochMs: Long, limit: Int = 20): Flow<List<Event>>

    suspend fun getEvent(eventId: String): Event?

    suspend fun upsertEvent(event: Event)

    suspend fun upsertEvents(events: List<Event>)

    suspend fun updateEventStatus(eventId: String, status: EventStatus)

    suspend fun deleteEvent(eventId: String)

    fun observeEventsByVisibility(
        groupId: String,
        visibilityScope: VisibilityScope
    ): Flow<List<Event>>
}
