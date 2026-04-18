package i.drive.kids.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import i.drive.kids.domain.model.ChildColor

fun ChildColor.toColor(): Color = when (this) {
    ChildColor.RED    -> Color(0xFFEF5350)
    ChildColor.ORANGE -> Color(0xFFFF7043)
    ChildColor.YELLOW -> Color(0xFFFDD835)
    ChildColor.GREEN  -> Color(0xFF66BB6A)
    ChildColor.BLUE   -> Color(0xFF42A5F5)
    ChildColor.PURPLE -> Color(0xFFAB47BC)
    ChildColor.PINK   -> Color(0xFFEC407A)
    ChildColor.TEAL   -> Color(0xFF26C6DA)
}

@Composable
fun ChildColorBadge(
    color: ChildColor,
    size: Dp = 12.dp,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .size(size)
            .background(color = color.toColor(), shape = CircleShape)
    )
}
