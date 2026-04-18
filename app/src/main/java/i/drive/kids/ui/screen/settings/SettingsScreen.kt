package i.drive.kids.ui.screen.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.ViewCompact
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import i.drive.kids.domain.model.AppLanguage
import i.drive.kids.domain.model.ThemeMode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val config = uiState.config

    Scaffold(
        topBar = { TopAppBar(title = { Text("Settings") }) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            SectionTitle("Account")
            SettingRow(
                icon = Icons.Default.AccountCircle,
                title = "Signed in as",
                scope = "device",
                value = "vladi.solov@gmail.com"
            )
            Divider()

            SectionTitle("Group")
            SettingRow(
                icon = Icons.Default.Group,
                title = "Current Group",
                scope = "group",
                value = config.lastSelectedGroupId ?: "None"
            )
            Divider()

            SectionTitle("Notifications")
            SettingRow(
                icon = Icons.Default.Notifications,
                title = "Lead time",
                scope = "private",
                value = "${config.notificationLeadTimeMinutesDefault} min"
            )
            Divider()

            SectionTitle("Appearance")
            ThemeSettingRow(
                currentTheme = config.themeMode,
                onThemeChange = viewModel::setThemeMode
            )
            LanguageSettingRow(
                currentLanguage = config.language,
                onLanguageChange = viewModel::setLanguage
            )
            SwitchSettingRow(
                icon = Icons.Default.ViewCompact,
                title = "Compact Mode",
                scope = "device",
                checked = config.compactCardMode,
                onCheckedChange = viewModel::setCompactMode
            )
            Divider()

            SectionTitle("Sync")
            SwitchSettingRow(
                icon = Icons.Default.Sync,
                title = "Sync on App Open",
                scope = "device",
                checked = config.syncOnAppOpen,
                onCheckedChange = viewModel::setSyncOnOpen
            )
            SwitchSettingRow(
                icon = Icons.Default.Sync,
                title = "Background Sync",
                scope = "device",
                checked = config.backgroundSyncEnabled,
                onCheckedChange = viewModel::setBackgroundSync
            )
            SettingRow(
                icon = Icons.Default.Sync,
                title = "Sync Interval",
                scope = "device",
                value = "${config.backgroundSyncIntervalMinutes} min"
            )
            Divider()

            SectionTitle("Advanced")
            SwitchSettingRow(
                icon = Icons.Default.BugReport,
                title = "Debug Logging",
                scope = "device",
                checked = config.debugLoggingEnabled,
                onCheckedChange = viewModel::setDebugLogging
            )
            Divider()

            SectionTitle("About")
            SettingRow(
                icon = Icons.Default.Info,
                title = "Version",
                scope = "device",
                value = "1.0.0"
            )
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp)
    )
}

@Composable
private fun SettingRow(
    icon: ImageVector,
    title: String,
    scope: String,
    value: String
) {
    ListItem(
        headlineContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title)
                Spacer(modifier = Modifier.width(8.dp))
                ScopeBadge(scope = scope)
            }
        },
        supportingContent = { Text(value, color = MaterialTheme.colorScheme.onSurfaceVariant) },
        leadingContent = { Icon(icon, contentDescription = null) }
    )
}

@Composable
private fun SwitchSettingRow(
    icon: ImageVector,
    title: String,
    scope: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    ListItem(
        headlineContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title)
                Spacer(modifier = Modifier.width(8.dp))
                ScopeBadge(scope = scope)
            }
        },
        leadingContent = { Icon(icon, contentDescription = null) },
        trailingContent = {
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ThemeSettingRow(
    currentTheme: ThemeMode,
    onThemeChange: (ThemeMode) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    ListItem(
        headlineContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Theme")
                Spacer(modifier = Modifier.width(8.dp))
                ScopeBadge("device")
            }
        },
        leadingContent = { Icon(Icons.Default.DarkMode, contentDescription = null) },
        trailingContent = {
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                OutlinedTextField(
                    value = currentTheme.name.lowercase().replaceFirstChar { it.uppercase() },
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier
                        .width(140.dp)
                        .menuAnchor()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    ThemeMode.entries.forEach { mode ->
                        DropdownMenuItem(
                            text = { Text(mode.name.lowercase().replaceFirstChar { it.uppercase() }) },
                            onClick = { onThemeChange(mode); expanded = false }
                        )
                    }
                }
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LanguageSettingRow(
    currentLanguage: AppLanguage,
    onLanguageChange: (AppLanguage) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    ListItem(
        headlineContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Language")
                Spacer(modifier = Modifier.width(8.dp))
                ScopeBadge("device")
            }
        },
        leadingContent = { Icon(Icons.Default.Language, contentDescription = null) },
        trailingContent = {
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                OutlinedTextField(
                    value = currentLanguage.name.lowercase().replaceFirstChar { it.uppercase() },
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier
                        .width(140.dp)
                        .menuAnchor()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    AppLanguage.entries.forEach { lang ->
                        DropdownMenuItem(
                            text = { Text(lang.name.lowercase().replaceFirstChar { it.uppercase() }) },
                            onClick = { onLanguageChange(lang); expanded = false }
                        )
                    }
                }
            }
        }
    )
}

@Composable
private fun ScopeBadge(scope: String) {
    AssistChip(
        onClick = {},
        label = { Text("[$scope]", style = MaterialTheme.typography.labelSmall) }
    )
}
