package i.drive.kids.ui.screen.eventeditor

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import i.drive.kids.domain.model.EventType
import i.drive.kids.domain.model.RideDirection
import java.text.SimpleDateFormat
import java.time.DayOfWeek
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun EventEditorScreen(
    onNavigateBack: () -> Unit = {},
    viewModel: EventEditorViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val dateFmt = SimpleDateFormat("MMM d, yyyy · HH:mm", Locale.getDefault())

    LaunchedEffect(uiState.isSaved) {
        if (uiState.isSaved) onNavigateBack()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (uiState.eventId == null) "New Event" else "Edit Event") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Child selector
            var childExpanded by remember { mutableStateOf(false) }
            val selectedChild = uiState.children.find { it.childId == uiState.selectedChildId }
            ExposedDropdownMenuBox(
                expanded = childExpanded,
                onExpandedChange = { childExpanded = it }
            ) {
                OutlinedTextField(
                    value = selectedChild?.name ?: "Select child",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Child") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = childExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = childExpanded,
                    onDismissRequest = { childExpanded = false }
                ) {
                    uiState.children.forEach { child ->
                        DropdownMenuItem(
                            text = { Text(child.name) },
                            onClick = {
                                viewModel.setSelectedChild(child.childId)
                                childExpanded = false
                            }
                        )
                    }
                }
            }

            // Title
            OutlinedTextField(
                value = uiState.title,
                onValueChange = viewModel::setTitle,
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth()
            )

            // EventType chips
            Text("Event Type", style = MaterialTheme.typography.labelLarge)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                EventType.entries.forEach { type ->
                    FilterChip(
                        selected = uiState.eventType == type,
                        onClick = { viewModel.setEventType(type) },
                        label = { Text(type.name.lowercase().replaceFirstChar { it.uppercase() }) }
                    )
                }
            }

            // Location
            OutlinedTextField(
                value = uiState.locationName,
                onValueChange = viewModel::setLocationName,
                label = { Text("Location Name") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = uiState.locationAddress,
                onValueChange = viewModel::setLocationAddress,
                label = { Text("Address") },
                modifier = Modifier.fillMaxWidth()
            )

            // Date/time (display only – picker would require DatePickerDialog)
            OutlinedTextField(
                value = dateFmt.format(Date(uiState.startDateTimeMs)),
                onValueChange = {},
                readOnly = true,
                label = { Text("Date & Time") },
                modifier = Modifier.fillMaxWidth()
            )

            // Duration
            var durationExpanded by remember { mutableStateOf(false) }
            val durations = listOf(30, 60, 90, 120)
            ExposedDropdownMenuBox(
                expanded = durationExpanded,
                onExpandedChange = { durationExpanded = it }
            ) {
                OutlinedTextField(
                    value = "${uiState.durationMinutes} min",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Duration") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = durationExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = durationExpanded,
                    onDismissRequest = { durationExpanded = false }
                ) {
                    durations.forEach { d ->
                        DropdownMenuItem(
                            text = { Text("$d min") },
                            onClick = {
                                viewModel.setDurationMinutes(d)
                                durationExpanded = false
                            }
                        )
                    }
                }
            }

            // Recurring
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Recurring")
                Switch(checked = uiState.isRecurring, onCheckedChange = viewModel::setIsRecurring)
            }
            if (uiState.isRecurring) {
                Text("Days of Week", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    DayOfWeek.entries.forEach { day ->
                        FilterChip(
                            selected = day in uiState.recurringDays,
                            onClick = { viewModel.toggleRecurringDay(day) },
                            label = { Text(day.name.take(3).lowercase().replaceFirstChar { it.uppercase() }) }
                        )
                    }
                }
                OutlinedTextField(
                    value = uiState.intervalWeeks.toString(),
                    onValueChange = { v -> v.toIntOrNull()?.let { viewModel.setIntervalWeeks(it) } },
                    label = { Text("Every N weeks") },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Needs ride
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Needs Ride")
                Switch(checked = uiState.needsRide, onCheckedChange = viewModel::setNeedsRide)
            }
            if (uiState.needsRide) {
                Text("Ride Direction", style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RideDirection.entries.forEach { dir ->
                        FilterChip(
                            selected = uiState.rideDirection == dir,
                            onClick = { viewModel.setRideDirection(dir) },
                            label = { Text(dir.name) }
                        )
                    }
                }
            }

            // Share with group
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Share with Group")
                Switch(checked = uiState.shareWithGroup, onCheckedChange = viewModel::setShareWithGroup)
            }

            uiState.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(onClick = onNavigateBack, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = viewModel::save,
                    modifier = Modifier.weight(1f),
                    enabled = !uiState.isSaving
                ) {
                    if (uiState.isSaving) CircularProgressIndicator() else Text("Save")
                }
            }
        }
    }
}
