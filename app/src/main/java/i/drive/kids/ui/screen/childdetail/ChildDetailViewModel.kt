package i.drive.kids.ui.screen.childdetail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.domain.model.Child
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.domain.repository.ChildRepository
import i.drive.kids.domain.repository.EventRepository
import i.drive.kids.domain.repository.RideAssignmentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChildDetailUiState(
    val child: Child? = null,
    val events: List<Event> = emptyList(),
    val assignmentsByEvent: Map<String, List<RideAssignment>> = emptyMap()
)

@HiltViewModel
class ChildDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val childRepository: ChildRepository,
    private val eventRepository: EventRepository,
    private val rideAssignmentRepository: RideAssignmentRepository
) : ViewModel() {

    private val childId: String = checkNotNull(savedStateHandle["childId"])

    private val _uiState = MutableStateFlow(ChildDetailUiState())
    val uiState: StateFlow<ChildDetailUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val child = childRepository.getChild(childId)
            _uiState.value = _uiState.value.copy(child = child)
        }

        eventRepository.observeEventsForChild(childId)
            .onEach { events ->
                _uiState.value = _uiState.value.copy(events = events)
                events.forEach { event ->
                    rideAssignmentRepository.observeAssignmentsForEvent(event.eventId)
                        .onEach { assignments ->
                            val map = _uiState.value.assignmentsByEvent.toMutableMap()
                            map[event.eventId] = assignments
                            _uiState.value = _uiState.value.copy(assignmentsByEvent = map)
                        }
                        .catch { }
                        .launchIn(viewModelScope)
                }
            }
            .catch { }
            .launchIn(viewModelScope)
    }
}
