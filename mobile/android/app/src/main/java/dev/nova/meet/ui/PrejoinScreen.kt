package dev.nova.meet.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
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
fun PrejoinScreen(controller: NovaClientController, initialUrl: String) {
    val defaultName by controller.displayName.collectAsState()
    var meetingUrl by remember(initialUrl) { mutableStateOf(initialUrl) }
    var displayName by remember { mutableStateOf(defaultName) }
    var password by remember { mutableStateOf("") }

    val audioMuted by controller.audioMuted.collectAsState()
    val videoMuted by controller.videoMuted.collectAsState()
    val error by controller.error.collectAsState()

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                OutlinedButton(onClick = { controller.closePrejoin() }) { Text("Back") }
                Text("Prejoin", style = MaterialTheme.typography.titleMedium)
            }

            OutlinedTextField(
                value = meetingUrl,
                onValueChange = { meetingUrl = it },
                label = { Text("Meeting URL") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = { Text("Display Name") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password (optional)") },
                modifier = Modifier.fillMaxWidth()
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = { controller.toggleAudio() }) {
                    Text(if (audioMuted) "Unmute" else "Mute")
                }
                OutlinedButton(onClick = { controller.toggleVideo() }) {
                    Text(if (videoMuted) "Cam On" else "Cam Off")
                }
            }

            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }

            Button(
                onClick = { controller.join(meetingUrl, displayName, password, audioOnlyMode = false) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Join Meeting")
            }

            OutlinedButton(
                onClick = { controller.join(meetingUrl, displayName, password, audioOnlyMode = true) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Join Audio-Only")
            }

            OutlinedButton(
                onClick = {
                    controller.join(
                        meetingUrl,
                        displayName,
                        password,
                        audioOnlyMode = true,
                        joinAsVisitor = true
                    )
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Join as Viewer")
            }
        }
    }
}
