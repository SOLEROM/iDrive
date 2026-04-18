package i.drive.kids.ui.screen.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.NotificationEntry
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.domain.repository.EventRepository
import i.drive.kids.domain.repository.NotificationRepository
import i.drive.kids.domain.repository.RideAssignmentRepository
import i.drive.kids.ui.component.SyncStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import javax.inject.Inject

data class DashboardUiState(
    val todayRides: List<Event> = emptyList(),
    val urgentUnassigned: List<RideAssignment> = emptyList(),
    val myRides: List<RideAssignment> = emptyList(),
    val recentNotifications: List<NotificationEntry> = emptyList(),
    val upcomingEvents: List<Event> = emptyList(),
    val syncStatus: SyncStatus = SyncStatus.IDLE
)

private const val MOCK_GROUP_ID = "group_1"
private const val MOCK_PARENT_ID = "parent_1"

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val rideAssignmentRepository: RideAssignmentRepository,
    private val notificationRepository: NotificationRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        val nowMs = System.currentTimeMillis()

        eventRepository.observeUpcomingEvents(afterEpochMs = nowMs, limit = 20)
            .onEach { events ->
                val todayStart = todayStartMs()
                val todayEnd = todayStart + 86_400_000L
                _uiState.value = _uiState.value.copy(
                    todayRides = events.filter { it.needsRide && it.startDateTime in todayStart until todayEnd },
                    upcomingEvents = events
                )
            }
            .catch { }
            .launchIn(viewModelScope)

        rideAssignmentRepository.observeUnassignedForGroup(MOCK_GROUP_ID)
            .onEach { assignments ->
                _uiState.value = _uiState.value.copy(urgentUnassigned = assignments)
            }
            .catch { }
            .launchIn(viewModelScope)

        rideAssignmentRepository.observeAssignmentsForDriver(MOCK_PARENT_ID)
            .onEach { assignments ->
                _uiState.value = _uiState.value.copy(myRides = assignments)
            }
            .catch { }
            .launchIn(viewModelScope)

        notificationRepository.observeNotificationsForGroup(MOCK_GROUP_ID)
            .onEach { notifications ->
                _uiState.value = _uiState.value.copy(
                    recentNotifications = notifications.take(5)
                )
            }
            .catch { }
            .launchIn(viewModelScope)
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
