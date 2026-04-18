package i.drive.kids.ui.screen.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.domain.model.NotificationEntry
import i.drive.kids.domain.repository.NotificationRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationsUiState(
    val notifications: List<NotificationEntry> = emptyList()
)

private const val MOCK_GROUP_ID = "group_1"
private const val MOCK_PARENT_ID = "parent_1"

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationRepository: NotificationRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationsUiState())
    val uiState: StateFlow<NotificationsUiState> = _uiState.asStateFlow()

    init {
        notificationRepository.observeNotificationsForGroup(MOCK_GROUP_ID)
            .onEach { notifications ->
                _uiState.value = _uiState.value.copy(
                    notifications = notifications.sortedByDescending { it.createdAt }
                )
            }
            .catch { }
            .launchIn(viewModelScope)
    }

    fun markAllRead() {
        viewModelScope.launch {
            notificationRepository.markAllReadForGroup(MOCK_GROUP_ID, MOCK_PARENT_ID)
        }
    }

    fun dismiss(notificationId: String) {
        viewModelScope.launch {
            notificationRepository.deleteNotification(notificationId)
        }
    }
}
