package i.drive.kids.ui.screen.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun OnboardingScreen(
    onNavigateToDashboard: () -> Unit,
    viewModel: OnboardingViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.isComplete) {
        if (uiState.isComplete) onNavigateToDashboard()
    }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            LinearProgressIndicator(
                progress = { (uiState.currentStep + 1) / 3f },
                modifier = Modifier.fillMaxWidth()
            )
            Text(
                text = "Step ${uiState.currentStep + 1} of 3",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            when (uiState.currentStep) {
                0 -> Step1Profile(
                    displayName = uiState.displayName,
                    phone = uiState.phone,
                    onDisplayNameChange = viewModel::setDisplayName,
                    onPhoneChange = viewModel::setPhone
                )
                1 -> Step2Group(
                    groupName = uiState.groupName,
                    onGroupNameChange = viewModel::setGroupName
                )
                2 -> Step3Storage()
            }

            Spacer(modifier = Modifier.weight(1f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (uiState.currentStep > 0) {
                    OutlinedButton(
                        onClick = viewModel::prevStep,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Back")
                    }
                }
                Button(
                    onClick = viewModel::nextStep,
                    modifier = Modifier.weight(1f)
                ) {
                    Text(if (uiState.currentStep == 2) "Get Started" else "Next")
                }
            }
        }
    }
}

@Composable
private fun Step1Profile(
    displayName: String,
    phone: String,
    onDisplayNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit
) {
    Text("Tell us about yourself", style = MaterialTheme.typography.headlineSmall)
    OutlinedTextField(
        value = displayName,
        onValueChange = onDisplayNameChange,
        label = { Text("Display Name") },
        modifier = Modifier.fillMaxWidth()
    )
    OutlinedTextField(
        value = phone,
        onValueChange = onPhoneChange,
        label = { Text("Phone Number") },
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun Step2Group(
    groupName: String,
    onGroupNameChange: (String) -> Unit
) {
    Text("Create your group", style = MaterialTheme.typography.headlineSmall)
    Text(
        text = "A group lets you share ride coordination with other parents.",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(modifier = Modifier.height(8.dp))
    OutlinedTextField(
        value = groupName,
        onValueChange = onGroupNameChange,
        label = { Text("Group Name") },
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun Step3Storage() {
    Text("Cloud Storage", style = MaterialTheme.typography.headlineSmall)
    Text(
        text = "Kids Rides uses your Google Drive to securely store ride history and private data. " +
            "No data leaves your account.",
        style = MaterialTheme.typography.bodyMedium
    )
    Spacer(modifier = Modifier.height(16.dp))
    Text(
        text = "Google Drive: Ready",
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.primary
    )
}
