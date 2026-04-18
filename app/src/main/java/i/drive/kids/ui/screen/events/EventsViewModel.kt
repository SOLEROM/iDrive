package i.drive.kids.ui.screen.events

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.VisibilityScope
import i.drive.kids.domain.repository.EventRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import javax.inject.Inject

enum class EventFilter { ALL, PRIVATE, GROUP, WITH_RIDE }

data class EventsUiState(
    val events: List<Event> = emptyList(),
    val filter: EventFilter = EventFilter.ALL
)

private const val MOCK_GROUP_ID = "group_1"

@HiltViewModel
class EventsViewModel @Inject constructor(
    private val eventRepository: EventRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(EventsUiState())
    val uiState: StateFlow<EventsUiState> = _uiState.asStateFlow()

    private var allEvents: List<Event> = emptyList()

    init {
        eventRepository.observeEventsForGroup(MOCK_GROUP_ID)
            .onEach { events ->
                allEvents = events
                applyFilter(_uiState.value.filter)
            }
            .catch { }
            .launchIn(viewModelScope)
    }

    fun setFilter(filter: EventFilter) {
        _uiState.value = _uiState.value.copy(filter = filter)
        applyFilter(filter)
    }

    private fun applyFilter(filter: EventFilter) {
        val filtered = when (filter) {
            EventFilter.ALL       -> allEvents
            EventFilter.PRIVATE   -> allEvents.filter { it.visibilityScope == VisibilityScope.PRIVATE }
            EventFilter.GROUP     -> allEvents.filter { it.visibilityScope == VisibilityScope.GROUP }
            EventFilter.WITH_RIDE -> allEvents.filter { it.needsRide }
        }
        _uiState.value = _uiState.value.copy(events = filtered)
    }
}
