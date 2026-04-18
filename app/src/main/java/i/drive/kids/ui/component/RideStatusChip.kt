package i.drive.kids.ui.component

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import i.drive.kids.domain.model.AssignmentStatus

private data class ChipConfig(
    val label: String,
    val color: Color,
    val icon: ImageVector
)

private fun AssignmentStatus.chipConfig(): ChipConfig = when (this) {
    AssignmentStatus.UNASSIGNED  -> ChipConfig("Unassigned", Color(0xFFFFA000), Icons.Default.HourglassEmpty)
    AssignmentStatus.VOLUNTEERED -> ChipConfig("Volunteered", Color(0xFF1976D2), Icons.Default.Check)
    AssignmentStatus.CONFIRMED   -> ChipConfig("Confirmed", Color(0xFF388E3C), Icons.Default.CheckCircle)
    AssignmentStatus.COMPLETED   -> ChipConfig("Completed", Color(0xFF757575), Icons.Default.History)
    AssignmentStatus.CONFLICT    -> ChipConfig("Conflict", Color(0xFFD32F2F), Icons.Default.Warning)
    AssignmentStatus.CANCELLED   -> ChipConfig("Cancelled", Color(0xFF9E9E9E), Icons.Default.Block)
}

@Composable
fun RideStatusChip(
    status: AssignmentStatus,
    modifier: Modifier = Modifier
) {
    val config = status.chipConfig()
    AssistChip(
        onClick = {},
        label = { Text(config.label) },
        leadingIcon = {
            Icon(
                imageVector = config.icon,
                contentDescription = config.label,
                tint = config.color
            )
        },
        colors = AssistChipDefaults.assistChipColors(
            containerColor = config.color.copy(alpha = 0.12f),
            labelColor = config.color
        ),
        modifier = modifier
    )
}
