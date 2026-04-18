package i.drive.kids.ui.screen.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import i.drive.kids.domain.model.NotificationEntry
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.ui.component.SyncBanner
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToRides: () -> Unit = {},
    onNavigateToEvents: () -> Unit = {},
    onNavigateToChildren: () -> Unit = {},
    onNavigateToMyRides: () -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    onNavigateToSyncStatus: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val timeFmt = SimpleDateFormat("HH:mm", Locale.getDefault())

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard") },
                actions = {
                    IconButton(onClick = onNavigateToNotifications) {
                        Icon(Icons.Default.Notifications, contentDescription = "Notifications")
                    }
                    IconButton(onClick = onNavigateToSyncStatus) {
                        Icon(Icons.Default.Cloud, contentDescription = "Sync status")
                    }
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize()) {
            SyncBanner(syncStatus = uiState.syncStatus)
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        QuickAction("Rides", Icons.Default.DirectionsCar, onNavigateToRides, Modifier.weight(1f))
                        QuickAction("Events", Icons.Default.Event, onNavigateToEvents, Modifier.weight(1f))
                        QuickAction("Kids", Icons.Default.Group, onNavigateToChildren, Modifier.weight(1f))
                        QuickAction("Mine", Icons.Default.Person, onNavigateToMyRides, Modifier.weight(1f))
                    }
                }
                item {
                    SectionHeader("Today's Rides (${uiState.todayRides.size})")
                }
                if (uiState.todayRides.isEmpty()) {
                    item { EmptyCard("No rides today") }
                } else {
                    items(uiState.todayRides) { event ->
                        EventCard(event, timeFmt)
                    }
                }

                item { SectionHeader("Urgent Unassigned (${uiState.urgentUnassigned.size})") }
                if (uiState.urgentUnassigned.isEmpty()) {
                    item { EmptyCard("No unassigned rides") }
                } else {
                    items(uiState.urgentUnassigned) { assignment ->
                        AssignmentCard(assignment)
                    }
                }

                item { SectionHeader("My Accepted Rides (${uiState.myRides.size})") }
                if (uiState.myRides.isEmpty()) {
                    item { EmptyCard("No rides assigned to you") }
                } else {
                    items(uiState.myRides) { assignment ->
                        AssignmentCard(assignment)
                    }
                }

                item { SectionHeader("Recent Updates") }
                if (uiState.recentNotifications.isEmpty()) {
                    item { EmptyCard("No recent notifications") }
                } else {
                    items(uiState.recentNotifications) { notification ->
                        NotificationCard(notification)
                    }
                }

                item { SectionHeader("Upcoming Classes") }
                if (uiState.upcomingEvents.isEmpty()) {
                    item { EmptyCard("No upcoming events") }
                } else {
                    items(uiState.upcomingEvents.take(5)) { event ->
                        EventCard(event, timeFmt)
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickAction(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    FilledTonalButton(
        onClick = onClick,
        modifier = modifier,
        contentPadding = PaddingValues(vertical = 12.dp, horizontal = 8.dp)
    ) {
        Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = null)
            Text(label, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleMedium,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(vertical = 4.dp)
    )
}

@Composable
private fun EmptyCard(message: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = message,
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun EventCard(event: Event, timeFmt: SimpleDateFormat) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = event.title, style = MaterialTheme.typography.titleSmall)
            Text(
                text = "${event.locationName} · ${timeFmt.format(Date(event.startDateTime))}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun AssignmentCard(assignment: RideAssignment) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Event: ${assignment.eventId}",
                style = MaterialTheme.typography.titleSmall
            )
            Text(
                text = "${assignment.rideLeg} · ${assignment.assignmentStatus}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun NotificationCard(notification: NotificationEntry) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = notification.message,
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.bodySmall
        )
    }
}
