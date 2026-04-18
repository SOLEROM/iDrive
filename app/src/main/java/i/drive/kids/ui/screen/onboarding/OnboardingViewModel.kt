package i.drive.kids.ui.screen.onboarding

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class OnboardingUiState(
    val currentStep: Int = 0,
    val displayName: String = "",
    val phone: String = "",
    val groupName: String = "",
    val isComplete: Boolean = false
)

@HiltViewModel
class OnboardingViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    fun setDisplayName(value: String) {
        _uiState.value = _uiState.value.copy(displayName = value)
    }

    fun setPhone(value: String) {
        _uiState.value = _uiState.value.copy(phone = value)
    }

    fun setGroupName(value: String) {
        _uiState.value = _uiState.value.copy(groupName = value)
    }

    fun nextStep() {
        val current = _uiState.value.currentStep
        if (current < 2) {
            _uiState.value = _uiState.value.copy(currentStep = current + 1)
        } else {
            _uiState.value = _uiState.value.copy(isComplete = true)
        }
    }

    fun prevStep() {
        val current = _uiState.value.currentStep
        if (current > 0) {
            _uiState.value = _uiState.value.copy(currentStep = current - 1)
        }
    }
}
