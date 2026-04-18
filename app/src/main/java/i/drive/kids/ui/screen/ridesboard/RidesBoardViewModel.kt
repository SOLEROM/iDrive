package i.drive.kids.ui.screen.ridesboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.domain.model.AssignmentStatus
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

data class RideBoardItem(
    val event: Event,
    val child: Child?,
    val assignments: List<RideAssignment>
)

data class RidesBoardUiState(
    val items: List<RideBoardItem> = emptyList()
)

private const val MOCK_GROUP_ID = "group_1"
private const val MOCK_PARENT_ID = "parent_1"

@HiltViewModel
class RidesBoardViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val rideAssignmentRepository: RideAssignmentRepository,
    private val childRepository: ChildRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RidesBoardUiState())
    val uiState: StateFlow<RidesBoardUiState> = _uiState.asStateFlow()

    private var childMap: Map<String, Child> = emptyMap()
    private var assignmentMap: Map<String, List<RideAssignment>> = emptyMap()
    private var rideEvents: List<Event> = emptyList()

    init {
        childRepository.observeAllChildren()
            .onEach { children ->
                childMap = children.associateBy { it.childId }
                rebuildItems()
            }
            .catch { }
            .launchIn(viewModelScope)

        eventRepository.observeEventsForGroup(MOCK_GROUP_ID)
            .onEach { events ->
                rideEvents = events.filter { it.needsRide }
                rideEvents.forEach { event ->
                    rideAssignmentRepository.observeAssignmentsForEvent(event.eventId)
                        .onEach { assignments ->
                            assignmentMap = assignmentMap.toMutableMap().also { it[event.eventId] = assignments }
                            rebuildItems()
                        }
                        .catch { }
                        .launchIn(viewModelScope)
                }
                rebuildItems()
            }
            .catch { }
            .launchIn(viewModelScope)
    }

    private fun rebuildItems() {
        val items = rideEvents
            .sortedBy { it.startDateTime }
            .map { event ->
                RideBoardItem(
                    event = event,
                    child = childMap[event.childId],
                    assignments = assignmentMap[event.eventId] ?: emptyList()
                )
            }
        _uiState.value = _uiState.value.copy(items = items)
    }

    fun claimRide(assignmentId: String) {
        viewModelScope.launch {
            rideAssignmentRepository.updateAssignmentStatus(
                assignmentId = assignmentId,
                status = AssignmentStatus.VOLUNTEERED,
                driverParentId = MOCK_PARENT_ID
            )
        }
    }
}
