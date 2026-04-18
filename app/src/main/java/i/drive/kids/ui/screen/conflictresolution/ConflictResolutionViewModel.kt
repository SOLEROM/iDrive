package i.drive.kids.ui.screen.conflictresolution

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.domain.model.RideLeg
import i.drive.kids.domain.repository.RideAssignmentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ConflictResolutionUiState(
    val conflictId: String = "",
    val localVersion: RideAssignment? = null,
    val remoteVersion: RideAssignment? = null,
    val isResolved: Boolean = false
)

@HiltViewModel
class ConflictResolutionViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val rideAssignmentRepository: RideAssignmentRepository
) : ViewModel() {

    private val conflictId: String = checkNotNull(savedStateHandle["conflictId"])

    private val _uiState = MutableStateFlow(ConflictResolutionUiState(conflictId = conflictId))
    val uiState: StateFlow<ConflictResolutionUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            // Mock: simulate two conflicting versions derived from conflictId
            val local = rideAssignmentRepository.getAssignment(conflictId)
            // Remote version is mocked as a copy with different status
            val remote = local?.copy(
                assignmentStatus = if (local.assignmentStatus == AssignmentStatus.VOLUNTEERED)
                    AssignmentStatus.CONFIRMED else AssignmentStatus.VOLUNTEERED,
                driverParentId = "parent_other"
            ) ?: RideAssignment(
                assignmentId = conflictId,
                eventId = "event_unknown",
                driverParentId = "parent_remote",
                rideLeg = RideLeg.TO,
                assignmentStatus = AssignmentStatus.VOLUNTEERED
            )
            _uiState.value = _uiState.value.copy(
                localVersion = local ?: RideAssignment(
                    assignmentId = conflictId,
                    eventId = "event_unknown",
                    driverParentId = "parent_local",
                    rideLeg = RideLeg.TO,
                    assignmentStatus = AssignmentStatus.CONFIRMED
                ),
                remoteVersion = remote
            )
        }
    }

    fun keepLocal() {
        val local = _uiState.value.localVersion ?: return
        viewModelScope.launch {
            rideAssignmentRepository.upsertAssignment(local)
            _uiState.value = _uiState.value.copy(isResolved = true)
        }
    }

    fun keepRemote() {
        val remote = _uiState.value.remoteVersion ?: return
        viewModelScope.launch {
            rideAssignmentRepository.upsertAssignment(remote)
            _uiState.value = _uiState.value.copy(isResolved = true)
        }
    }
}
