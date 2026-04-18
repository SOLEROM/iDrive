package i.drive.kids.ui.screen.children

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import i.drive.kids.domain.model.Child
import i.drive.kids.domain.model.ChildColor
import i.drive.kids.domain.repository.ChildRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class ChildrenUiState(
    val children: List<Child> = emptyList(),
    val showAddForm: Boolean = false,
    val newChildName: String = "",
    val newChildColor: ChildColor = ChildColor.BLUE
)

@HiltViewModel
class ChildrenViewModel @Inject constructor(
    private val childRepository: ChildRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChildrenUiState())
    val uiState: StateFlow<ChildrenUiState> = _uiState.asStateFlow()

    init {
        childRepository.observeAllChildren()
            .onEach { children ->
                _uiState.value = _uiState.value.copy(children = children.filter { !it.isArchived })
            }
            .catch { }
            .launchIn(viewModelScope)
    }

    fun showAddForm() {
        _uiState.value = _uiState.value.copy(showAddForm = true)
    }

    fun hideAddForm() {
        _uiState.value = _uiState.value.copy(showAddForm = false, newChildName = "", newChildColor = ChildColor.BLUE)
    }

    fun setNewChildName(name: String) {
        _uiState.value = _uiState.value.copy(newChildName = name)
    }

    fun setNewChildColor(color: ChildColor) {
        _uiState.value = _uiState.value.copy(newChildColor = color)
    }

    fun saveNewChild() {
        val state = _uiState.value
        if (state.newChildName.isBlank()) return
        viewModelScope.launch {
            childRepository.upsertChild(
                Child(
                    childId = UUID.randomUUID().toString(),
                    parentOwnerId = "parent_1",
                    name = state.newChildName,
                    colorTag = state.newChildColor,
                    createdAt = System.currentTimeMillis(),
                    updatedAt = System.currentTimeMillis()
                )
            )
            hideAddForm()
        }
    }

    fun archiveChild(childId: String) {
        viewModelScope.launch {
            childRepository.archiveChild(childId)
        }
    }
}
