package i.drive.kids.ui.screen.myrides

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import i.drive.kids.ui.component.DateHeader
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyRidesScreen(
    viewModel: MyRidesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val timeFmt = SimpleDateFormat("HH:mm", Locale.getDefault())

    Scaffold(
        topBar = { TopAppBar(title = { Text("My Rides") }) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (uiState.todayItems.isNotEmpty()) {
                item { DateHeader("Today") }
                items(uiState.todayItems, key = { it.assignment.assignmentId + "_today" }) { item ->
                    MyRideCard(
                        item = item,
                        timeFmt = timeFmt,
                        showMarkDone = true,
                        onMarkDone = { viewModel.markDone(item.assignment.assignmentId) }
                    )
                }
            }
            if (uiState.upcomingItems.isNotEmpty()) {
                item { DateHeader("Upcoming") }
                items(uiState.upcomingItems, key = { it.assignment.assignmentId + "_upcoming" }) { item ->
                    MyRideCard(item = item, timeFmt = timeFmt, showMarkDone = false, onMarkDone = {})
                }
            }
            if (uiState.pastItems.isNotEmpty()) {
                item { DateHeader("Past") }
                items(uiState.pastItems, key = { it.assignment.assignmentId + "_past" }) { item ->
                    MyRideCard(item = item, timeFmt = timeFmt, showMarkDone = false, onMarkDone = {})
                }
            }
            if (uiState.todayItems.isEmpty() && uiState.upcomingItems.isEmpty() && uiState.pastItems.isEmpty()) {
                item {
                    Text(
                        "You have no rides assigned",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun MyRideCard(
    item: MyRideItem,
    timeFmt: SimpleDateFormat,
    showMarkDone: Boolean,
    onMarkDone: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            val event = item.event
            if (event != null) {
                Text(event.title, style = MaterialTheme.typography.titleSmall)
                Text(
                    "${timeFmt.format(Date(event.startDateTime))} · ${event.locationName}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Text("Event ID: ${item.assignment.eventId}", style = MaterialTheme.typography.bodySmall)
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "${item.assignment.rideLeg.name} · ${item.assignment.assignmentStatus.name}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (showMarkDone) {
                    Button(onClick = onMarkDone) { Text("Mark Done") }
                }
            }
        }
    }
}
