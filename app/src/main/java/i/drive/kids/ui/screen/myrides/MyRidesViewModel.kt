package i.drive.kids.ui.screen.myrides

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.RideAssignment
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

data class MyRideItem(
    val assignment: RideAssignment,
    val event: Event?
)

data class MyRidesUiState(
    val todayItems: List<MyRideItem> = emptyList(),
    val upcomingItems: List<MyRideItem> = emptyList(),
    val pastItems: List<MyRideItem> = emptyList()
)

private const val MOCK_PARENT_ID = "parent_1"

@HiltViewModel
class MyRidesViewModel @Inject constructor(
    private val rideAssignmentRepository: RideAssignmentRepository,
    private val eventRepository: EventRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MyRidesUiState())
    val uiState: StateFlow<MyRidesUiState> = _uiState.asStateFlow()

    private val eventCache = mutableMapOf<String, Event>()

    init {
        rideAssignmentRepository.observeAssignmentsForDriver(MOCK_PARENT_ID)
            .onEach { assignments ->
                assignments.forEach { a ->
                    if (!eventCache.containsKey(a.eventId)) {
                        val event = eventRepository.getEvent(a.eventId)
                        if (event != null) eventCache[a.eventId] = event
                    }
                }
                val now = System.currentTimeMillis()
                val todayStart = todayStartMs()
                val todayEnd = todayStart + 86_400_000L
                val items = assignments.map { MyRideItem(it, eventCache[it.eventId]) }
                _uiState.value = MyRidesUiState(
                    todayItems = items.filter { i ->
                        val t = i.event?.startDateTime ?: 0L
                        t in todayStart until todayEnd
                    },
                    upcomingItems = items.filter { i ->
                        val t = i.event?.startDateTime ?: 0L
                        t >= todayEnd
                    },
                    pastItems = items.filter { i ->
                        val t = i.event?.startDateTime ?: 0L
                        t < todayStart
                    }
                )
            }
            .catch { }
            .launchIn(viewModelScope)
    }

    fun markDone(assignmentId: String) {
        viewModelScope.launch {
            rideAssignmentRepository.updateAssignmentStatus(
                assignmentId = assignmentId,
                status = AssignmentStatus.COMPLETED,
                driverParentId = MOCK_PARENT_ID
            )
        }
    }

    private fun todayStartMs(): Long {
        val cal = java.util.Calendar.getInstance()
        cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
        cal.set(java.util.Calendar.MINUTE, 0)
        cal.set(java.util.Calendar.SECOND, 0)
        cal.set(java.util.Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }
}
