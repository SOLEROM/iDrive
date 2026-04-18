package i.drive.kids.ui.screen.eventeditor

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.domain.model.Child
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.EventType
import i.drive.kids.domain.model.RecurrenceRule
import i.drive.kids.domain.model.RideDirection
import i.drive.kids.domain.model.VisibilityScope
import i.drive.kids.domain.repository.ChildRepository
import i.drive.kids.domain.repository.EventRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.util.UUID
import javax.inject.Inject

data class EventEditorUiState(
    val eventId: String? = null,
    val children: List<Child> = emptyList(),
    val selectedChildId: String? = null,
    val title: String = "",
    val eventType: EventType = EventType.CLASS,
    val locationName: String = "",
    val locationAddress: String = "",
    val startDateTimeMs: Long = System.currentTimeMillis(),
    val durationMinutes: Int = 60,
    val isRecurring: Boolean = false,
    val recurringDays: Set<DayOfWeek> = emptySet(),
    val intervalWeeks: Int = 1,
    val recurrenceEndDateMs: Long? = null,
    val needsRide: Boolean = false,
    val rideDirection: RideDirection = RideDirection.BOTH,
    val shareWithGroup: Boolean = true,
    val isSaving: Boolean = false,
    val isSaved: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class EventEditorViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val eventRepository: EventRepository,
    private val childRepository: ChildRepository
) : ViewModel() {

    private val editEventId: String? = savedStateHandle["eventId"]

    private val _uiState = MutableStateFlow(EventEditorUiState())
    val uiState: StateFlow<EventEditorUiState> = _uiState.asStateFlow()

    init {
        childRepository.observeAllChildren()
            .onEach { children ->
                _uiState.value = _uiState.value.copy(children = children.filter { !it.isArchived })
            }
            .catch { }
            .launchIn(viewModelScope)

        if (editEventId != null) {
            viewModelScope.launch {
                val event = eventRepository.getEvent(editEventId)
                event?.let { e ->
                    _uiState.value = _uiState.value.copy(
                        eventId = e.eventId,
                        selectedChildId = e.childId,
                        title = e.title,
                        eventType = e.eventType,
                        locationName = e.locationName,
                        locationAddress = e.locationAddress,
                        startDateTimeMs = e.startDateTime,
                        durationMinutes = ((e.endDateTime - e.startDateTime) / 60_000).toInt().coerceAtLeast(30),
                        isRecurring = e.isRecurring,
                        recurringDays = e.recurrenceRule?.daysOfWeek?.toSet() ?: emptySet(),
                        intervalWeeks = e.recurrenceRule?.intervalWeeks ?: 1,
                        recurrenceEndDateMs = e.recurrenceRule?.endDate,
                        needsRide = e.needsRide,
                        rideDirection = e.rideDirection,
                        shareWithGroup = e.visibilityScope == VisibilityScope.GROUP
                    )
                }
            }
        }
    }

    fun setSelectedChild(childId: String) { _uiState.value = _uiState.value.copy(selectedChildId = childId) }
    fun setTitle(v: String) { _uiState.value = _uiState.value.copy(title = v) }
    fun setEventType(v: EventType) { _uiState.value = _uiState.value.copy(eventType = v) }
    fun setLocationName(v: String) { _uiState.value = _uiState.value.copy(locationName = v) }
    fun setLocationAddress(v: String) { _uiState.value = _uiState.value.copy(locationAddress = v) }
    fun setStartDateTimeMs(v: Long) { _uiState.value = _uiState.value.copy(startDateTimeMs = v) }
    fun setDurationMinutes(v: Int) { _uiState.value = _uiState.value.copy(durationMinutes = v) }
    fun setIsRecurring(v: Boolean) { _uiState.value = _uiState.value.copy(isRecurring = v) }
    fun toggleRecurringDay(day: DayOfWeek) {
        val days = _uiState.value.recurringDays.toMutableSet()
        if (day in days) days.remove(day) else days.add(day)
        _uiState.value = _uiState.value.copy(recurringDays = days)
    }
    fun setIntervalWeeks(v: Int) { _uiState.value = _uiState.value.copy(intervalWeeks = v) }
    fun setRecurrenceEndDate(v: Long?) { _uiState.value = _uiState.value.copy(recurrenceEndDateMs = v) }
    fun setNeedsRide(v: Boolean) { _uiState.value = _uiState.value.copy(needsRide = v) }
    fun setRideDirection(v: RideDirection) { _uiState.value = _uiState.value.copy(rideDirection = v) }
    fun setShareWithGroup(v: Boolean) { _uiState.value = _uiState.value.copy(shareWithGroup = v) }

    fun save() {
        val state = _uiState.value
        val childId = state.selectedChildId
        if (state.title.isBlank()) {
            _uiState.value = state.copy(error = "Title is required")
            return
        }
        if (childId == null) {
            _uiState.value = state.copy(error = "Please select a child")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, error = null)
            val endMs = state.startDateTimeMs + state.durationMinutes * 60_000L
            val event = Event(
                eventId = state.eventId ?: UUID.randomUUID().toString(),
                childId = childId,
                groupId = if (state.shareWithGroup) "group_1" else null,
                title = state.title,
                eventType = state.eventType,
                locationName = state.locationName,
                locationAddress = state.locationAddress,
                startDateTime = state.startDateTimeMs,
                endDateTime = endMs,
                isRecurring = state.isRecurring,
                recurrenceRule = if (state.isRecurring) RecurrenceRule(
                    daysOfWeek = state.recurringDays.toList(),
                    intervalWeeks = state.intervalWeeks,
                    endDate = state.recurrenceEndDateMs
                ) else null,
                needsRide = state.needsRide,
                rideDirection = state.rideDirection,
                createdByParentId = "parent_1",
                visibilityScope = if (state.shareWithGroup) VisibilityScope.GROUP else VisibilityScope.PRIVATE,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
            eventRepository.upsertEvent(event)
            _uiState.value = _uiState.value.copy(isSaving = false, isSaved = true)
        }
    }
}
