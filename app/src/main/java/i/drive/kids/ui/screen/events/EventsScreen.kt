package i.drive.kids.ui.screen.events

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import i.drive.kids.domain.model.Event
import i.drive.kids.ui.component.DateHeader
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun EventsScreen(
    onNavigateToNewEvent: () -> Unit = {},
    onNavigateToEvent: (String) -> Unit = {},
    viewModel: EventsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val dateFmt = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault())
    val timeFmt = SimpleDateFormat("HH:mm", Locale.getDefault())

    val grouped = uiState.events
        .sortedBy { it.startDateTime }
        .groupBy { dateFmt.format(Date(it.startDateTime)) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Events") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = onNavigateToNewEvent) {
                Icon(Icons.Default.Add, contentDescription = "New event")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            FlowRow(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                EventFilter.entries.forEach { filter ->
                    FilterChip(
                        selected = uiState.filter == filter,
                        onClick = { viewModel.setFilter(filter) },
                        label = {
                            Text(
                                when (filter) {
                                    EventFilter.ALL       -> "All"
                                    EventFilter.PRIVATE   -> "Private"
                                    EventFilter.GROUP     -> "Group"
                                    EventFilter.WITH_RIDE -> "With Ride"
                                }
                            )
                        }
                    )
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                grouped.forEach { (dateLabel, events) ->
                    item(key = "header_$dateLabel") {
                        DateHeader(label = dateLabel)
                    }
                    items(events, key = { it.eventId }) { event ->
                        EventListItem(event = event, timeFmt = timeFmt, onClick = { onNavigateToEvent(event.eventId) })
                    }
                }

                if (uiState.events.isEmpty()) {
                    item {
                        Text(
                            "No events found",
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EventListItem(
    event: Event,
    timeFmt: SimpleDateFormat,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(event.title, style = MaterialTheme.typography.titleSmall)
            Text(
                "${event.eventType.name.lowercase().replaceFirstChar { it.uppercase() }} · ${timeFmt.format(Date(event.startDateTime))}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (event.locationName.isNotBlank()) {
                Text(
                    event.locationName,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (event.needsRide) {
                Text(
                    "Ride needed: ${event.rideDirection.name}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
