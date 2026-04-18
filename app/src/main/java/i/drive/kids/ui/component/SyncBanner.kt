package i.drive.kids.ui.component

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

enum class SyncStatus {
    IDLE, SYNCING, OFFLINE, ERROR
}

@Composable
fun SyncBanner(
    syncStatus: SyncStatus,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(visible = syncStatus != SyncStatus.IDLE) {
        val (bgColor, icon, message) = when (syncStatus) {
            SyncStatus.SYNCING -> Triple(Color(0xFF1976D2), Icons.Default.Sync, "Syncing…")
            SyncStatus.OFFLINE -> Triple(Color(0xFF757575), Icons.Default.CloudOff, "You are offline")
            SyncStatus.ERROR   -> Triple(Color(0xFFD32F2F), Icons.Default.CloudOff, "Sync error — tap to retry")
            SyncStatus.IDLE    -> Triple(Color.Transparent, Icons.Default.Sync, "")
        }
        Row(
            modifier = modifier
                .fillMaxWidth()
                .background(bgColor)
                .padding(horizontal = 16.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color.White
            )
            Text(
                text = message,
                style = MaterialTheme.typography.labelMedium,
                color = Color.White
            )
        }
    }
}
