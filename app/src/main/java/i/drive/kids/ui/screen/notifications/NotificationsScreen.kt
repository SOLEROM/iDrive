package i.drive.kids.ui.screen.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.SyncProblem
import androidx.compose.material.icons.filled.ThumbUp
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import i.drive.kids.domain.model.NotificationCategory
import i.drive.kids.domain.model.NotificationEntry
import i.drive.kids.ui.component.DateHeader
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    viewModel: NotificationsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val dateFmt = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault())
    val timeFmt = SimpleDateFormat("HH:mm", Locale.getDefault())

    val grouped = uiState.notifications.groupBy { dateFmt.format(Date(it.createdAt)) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
                actions = {
                    IconButton(onClick = viewModel::markAllRead) {
                        Icon(Icons.Default.DoneAll, contentDescription = "Mark all read")
                    }
                }
            )
        }
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
                items(items, key = { it.notificationId }) { notification ->
                    SwipeToDismissNotification(
                        notification = notification,
                        timeFmt = timeFmt,
                        onDismiss = { viewModel.dismiss(notification.notificationId) }
                    )
                }
            }

            if (uiState.notifications.isEmpty()) {
                item {
                    Text(
                        "No notifications",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SwipeToDismissNotification(
    notification: NotificationEntry,
    timeFmt: SimpleDateFormat,
    onDismiss: () -> Unit
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value != SwipeToDismissBoxValue.Settled) { onDismiss(); true } else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = true,
        enableDismissFromEndToStart = true,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.errorContainer)
                    .padding(16.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Text("Dismiss", color = MaterialTheme.colorScheme.onErrorContainer)
            }
        },
        content = {
            NotificationRow(notification = notification, timeFmt = timeFmt)
        }
    )
}

@Composable
private fun NotificationRow(
    notification: NotificationEntry,
    timeFmt: SimpleDateFormat
) {
    val isUnread = "parent_1" !in notification.readByParentIds

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = notification.category.icon(),
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(notification.message, style = MaterialTheme.typography.bodyMedium)
                Text(
                    timeFmt.format(Date(notification.createdAt)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (isUnread) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape)
                )
            }
        }
    }
}

private fun NotificationCategory.icon(): ImageVector = when (this) {
    NotificationCategory.RIDE_CLAIMED    -> Icons.Default.ThumbUp
    NotificationCategory.RIDE_COMPLETED  -> Icons.Default.DoneAll
    NotificationCategory.RIDE_CONFLICT   -> Icons.Default.Warning
    NotificationCategory.EVENT_CHANGED   -> Icons.Default.EventNote
    NotificationCategory.SYNC_ERROR      -> Icons.Default.SyncProblem
}
