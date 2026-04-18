package i.drive.kids.ui.screen.ridesboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import i.drive.kids.domain.model.AssignmentStatus
import i.drive.kids.domain.model.RideAssignment
import i.drive.kids.ui.component.ChildColorBadge
import i.drive.kids.ui.component.DateHeader
import i.drive.kids.ui.component.RideStatusChip
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun RidesBoardScreen(
    viewModel: RidesBoardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val dateFmt = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault())
    val timeFmt = SimpleDateFormat("HH:mm", Locale.getDefault())

    val grouped = uiState.items.groupBy { dateFmt.format(Date(it.event.startDateTime)) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Rides Board") }) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            grouped.forEach { (dateLabel, items) ->
                item(key = "header_$dateLabel") {
                    DateHeader(label = dateLabel)
                }
                items(items, key = { it.event.eventId }) { item ->
                    RideCard(
                        item = item,
                        timeFmt = timeFmt,
                        onClaim = { assignmentId -> viewModel.claimRide(assignmentId) }
                    )
                }
            }

            if (uiState.items.isEmpty()) {
                item {
                    Text(
                        "No rides need coverage",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RideCard(
    item: RideBoardItem,
    timeFmt: SimpleDateFormat,
    onClaim: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                item.child?.let { child ->
                    ChildColorBadge(color = child.colorTag, size = 16.dp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(child.name, style = MaterialTheme.typography.labelLarge)
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    item.event.title,
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.weight(1f)
                )
            }
            Text(
                "${timeFmt.format(Date(item.event.startDateTime))} · ${item.event.locationName}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                item.assignments.forEach { assignment ->
                    AssignmentLeg(assignment = assignment, onClaim = onClaim)
                }
            }
        }
    }
}

@Composable
private fun AssignmentLeg(
    assignment: RideAssignment,
    onClaim: (String) -> Unit
) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            assignment.rideLeg.name,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(end = 4.dp)
        )
        RideStatusChip(status = assignment.assignmentStatus)
        if (assignment.assignmentStatus == AssignmentStatus.UNASSIGNED) {
            Button(
                onClick = { onClaim(assignment.assignmentId) },
                modifier = Modifier.size(width = 72.dp, height = 32.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            ) {
                Text("Claim", style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
