package i.drive.kids.ui.screen.syncstatus

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncStatusScreen(
    viewModel: SyncStatusViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val dtFmt = SimpleDateFormat("MMM d · HH:mm:ss", Locale.getDefault())

    Scaffold(
        topBar = { TopAppBar(title = { Text("Sync Status") }) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Last Sync", style = MaterialTheme.typography.labelLarge)
                        Text(
                            text = uiState.lastSyncTime?.let { dtFmt.format(Date(it)) } ?: "Never",
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Text("Pending Operations: ${uiState.pendingOperations}")
                        uiState.errorMessage?.let {
                            Text(it, color = MaterialTheme.colorScheme.error)
                        }
                        if (uiState.isSyncing) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                CircularProgressIndicator(modifier = Modifier.padding(4.dp))
                                Text("Syncing…")
                            }
                        } else {
                            Button(onClick = viewModel::syncNow, modifier = Modifier.fillMaxWidth()) {
                                Text("Sync Now")
                            }
                        }
                    }
                }
            }

            item {
                Text("Sync History", style = MaterialTheme.typography.titleMedium)
            }

            items(uiState.history) { entry ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (entry.success) Icons.Default.Check else Icons.Default.Error,
                            contentDescription = null,
                            tint = if (entry.success) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.error
                        )
                        Column {
                            Text(entry.description, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                dtFmt.format(Date(entry.timestamp)),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}
