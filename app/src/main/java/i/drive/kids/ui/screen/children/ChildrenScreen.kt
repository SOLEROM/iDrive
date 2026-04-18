package i.drive.kids.ui.screen.children

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import i.drive.kids.domain.model.Child
import i.drive.kids.domain.model.ChildColor
import i.drive.kids.ui.component.ChildColorBadge
import i.drive.kids.ui.component.toColor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChildrenScreen(
    onNavigateToChild: (String) -> Unit = {},
    viewModel: ChildrenViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val sheetState = rememberModalBottomSheetState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Children") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = viewModel::showAddForm) {
                Icon(Icons.Default.Add, contentDescription = "Add child")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            items(uiState.children, key = { it.childId }) { child ->
                SwipeToArchiveItem(
                    child = child,
                    onArchive = { viewModel.archiveChild(child.childId) },
                    onClick = { onNavigateToChild(child.childId) }
                )
            }
        }

        if (uiState.showAddForm) {
            ModalBottomSheet(
                onDismissRequest = viewModel::hideAddForm,
                sheetState = sheetState
            ) {
                AddChildForm(
                    name = uiState.newChildName,
                    selectedColor = uiState.newChildColor,
                    onNameChange = viewModel::setNewChildName,
                    onColorChange = viewModel::setNewChildColor,
                    onSave = viewModel::saveNewChild,
                    onCancel = viewModel::hideAddForm
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeToArchiveItem(
    child: Child,
    onArchive: () -> Unit,
    onClick: () -> Unit
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                onArchive()
                true
            } else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        enableDismissFromEndToStart = true,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.errorContainer)
                    .padding(end = 16.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(
                    Icons.Default.Archive,
                    contentDescription = "Archive",
                    tint = MaterialTheme.colorScheme.onErrorContainer
                )
            }
        },
        content = {
            Card(
                onClick = onClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            ) {
                ListItem(
                    headlineContent = { Text(child.name) },
                    supportingContent = { Text(child.colorTag.name.lowercase().replaceFirstChar { it.uppercase() }) },
                    leadingContent = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ChildColorBadge(color = child.colorTag, size = 20.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(Icons.Default.Person, contentDescription = null)
                        }
                    }
                )
            }
        }
    )
}

@Composable
private fun AddChildForm(
    name: String,
    selectedColor: ChildColor,
    onNameChange: (String) -> Unit,
    onColorChange: (ChildColor) -> Unit,
    onSave: () -> Unit,
    onCancel: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Add Child", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text("Child's Name") },
            modifier = Modifier.fillMaxWidth()
        )
        Text("Choose Color", style = MaterialTheme.typography.labelLarge)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ChildColor.entries.forEach { color ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(32.dp)
                        .background(
                            color = color.toColor(),
                            shape = MaterialTheme.shapes.small
                        )
                        .then(
                            if (selectedColor == color) Modifier.background(
                                Color.Black.copy(alpha = 0.2f),
                                shape = MaterialTheme.shapes.small
                            ) else Modifier
                        )
                        .padding(4.dp)
                )
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            TextButton(onClick = onCancel) { Text("Cancel") }
            Spacer(Modifier.width(8.dp))
            TextButton(onClick = onSave) { Text("Save") }
        }
        Spacer(Modifier.height(16.dp))
    }
}
