package i.drive.kids.ui.screen.syncstatus

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

data class SyncHistoryEntry(
    val timestamp: Long,
    val description: String,
    val success: Boolean
)

data class SyncStatusUiState(
    val lastSyncTime: Long? = null,
    val pendingOperations: Int = 0,
    val errorMessage: String? = null,
    val isSyncing: Boolean = false,
    val history: List<SyncHistoryEntry> = emptyList()
)

@HiltViewModel
class SyncStatusViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(SyncStatusUiState())
    val uiState: StateFlow<SyncStatusUiState> = _uiState.asStateFlow()

    init {
        val now = System.currentTimeMillis()
        _uiState.value = SyncStatusUiState(
            lastSyncTime = now - 5 * 60_000,
            pendingOperations = 0,
            errorMessage = null,
            history = listOf(
                SyncHistoryEntry(now - 5 * 60_000, "Full sync completed", true),
                SyncHistoryEntry(now - 35 * 60_000, "Full sync completed", true),
                SyncHistoryEntry(now - 65 * 60_000, "Sync failed: network error", false),
                SyncHistoryEntry(now - 95 * 60_000, "Full sync completed", true),
                SyncHistoryEntry(now - 125 * 60_000, "Full sync completed", true)
            )
        )
    }

    fun syncNow() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSyncing = true, errorMessage = null)
            delay(1500)
            val now = System.currentTimeMillis()
            val newEntry = SyncHistoryEntry(now, "Full sync completed", true)
            _uiState.value = _uiState.value.copy(
                isSyncing = false,
                lastSyncTime = now,
                pendingOperations = 0,
                history = listOf(newEntry) + _uiState.value.history.take(4)
            )
        }
    }
}
