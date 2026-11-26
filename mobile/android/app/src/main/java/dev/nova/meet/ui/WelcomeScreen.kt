package dev.nova.meet.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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

@Composable
fun WelcomeScreen(controller: NovaClientController) {
    val recent by controller.recentMeetings.collectAsState()
    var roomInput by remember { mutableStateOf("") }
    var showSettings by remember { mutableStateOf(false) }

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Nova Meet", style = MaterialTheme.typography.headlineMedium)
                    Text("Native Compose + Rust UniFFI", style = MaterialTheme.typography.labelMedium)
                }
                OutlinedButton(onClick = { showSettings = true }) {
                    Text("Settings")
                }
            }

            OutlinedTextField(
                value = roomInput,
                onValueChange = { roomInput = it },
                label = { Text("Room name or URL") },
                modifier = Modifier.fillMaxWidth()
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { roomInput = "nova-room-${(100..999).random()}" }) {
                    Text("Random")
                }
                Button(
                    onClick = { controller.openPrejoin(roomInput) },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Continue")
                }
            }

            Text("Recent Meetings", style = MaterialTheme.typography.titleSmall)
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(recent, key = { it.url }) { item ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { controller.openPrejoin(item.url) }
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(item.room, style = MaterialTheme.typography.titleSmall)
                            Text(item.url, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }

        if (showSettings) {
            SettingsSheet(controller = controller, onDismiss = { showSettings = false })
        }
    }
}
