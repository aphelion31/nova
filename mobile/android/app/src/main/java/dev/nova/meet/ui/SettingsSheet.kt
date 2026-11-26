package dev.nova.meet.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.nova.meet.NovaClientController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsSheet(controller: NovaClientController, onDismiss: () -> Unit) {
    val curUrl by controller.serverBaseUrl.collectAsState()
    val curName by controller.displayName.collectAsState()
    val curMuted by controller.startMuted.collectAsState()

    var serverUrl by remember { mutableStateOf(curUrl) }
    var displayName by remember { mutableStateOf(curName) }
    var startMuted by remember { mutableStateOf(curMuted) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Settings")
            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("Server URL") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = { Text("Display Name") },
                modifier = Modifier.fillMaxWidth()
            )
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Start muted")
                Switch(checked = startMuted, onCheckedChange = { startMuted = it })
            }
            Button(
                onClick = {
                    controller.saveSettings(serverUrl, displayName, startMuted)
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Save")
            }
        }
    }
}
