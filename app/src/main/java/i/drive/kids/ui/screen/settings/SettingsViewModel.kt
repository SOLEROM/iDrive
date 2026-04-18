package i.drive.kids.ui.screen.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.config.AppLocalConfig
import i.drive.kids.domain.model.AppLanguage
import i.drive.kids.domain.model.ThemeMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val config: AppLocalConfig = AppLocalConfig()
)

@HiltViewModel
class SettingsViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    fun setThemeMode(mode: ThemeMode) {
        update { copy(themeMode = mode) }
    }

    fun setLanguage(lang: AppLanguage) {
        update { copy(language = lang) }
    }

    fun setCompactMode(enabled: Boolean) {
        update { copy(compactCardMode = enabled) }
    }

    fun setSyncOnOpen(enabled: Boolean) {
        update { copy(syncOnAppOpen = enabled) }
    }

    fun setBackgroundSync(enabled: Boolean) {
        update { copy(backgroundSyncEnabled = enabled) }
    }

    fun setBackgroundSyncInterval(minutes: Long) {
        update { copy(backgroundSyncIntervalMinutes = minutes) }
    }

    fun setDebugLogging(enabled: Boolean) {
        update { copy(debugLoggingEnabled = enabled) }
    }

    private fun update(block: AppLocalConfig.() -> AppLocalConfig) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(config = _uiState.value.config.block())
        }
    }
}
