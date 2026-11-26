package dev.nova.meet.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
fun OverflowSheet(controller: NovaClientController, onDismiss: () -> Unit) {
    val snapshot by controller.snapshot.collectAsState()
    val handRaised by controller.handRaised.collectAsState()
    val tileView by controller.tileView.collectAsState()
    val audioOnly by controller.audioOnly.collectAsState()
    var breakoutName by remember { mutableStateOf("") }
    var roomPassword by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("👍", "👏", "❤️", "🎉", "🔥").forEach { emoji ->
                    OutlinedButton(onClick = { controller.sendReaction(emoji) }) { Text(emoji) }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { controller.toggleHand() }) {
                    Text(if (handRaised) "Lower Hand" else "Raise Hand")
                }
                OutlinedButton(onClick = { controller.toggleTileView() }) {
                    Text(if (tileView) "Speaker View" else "Tile View")
                }
                OutlinedButton(onClick = { controller.toggleAudioOnly() }) {
                    Text(if (audioOnly) "Video Mode" else "Audio-Only")
                }
            }

            if (snapshot.isModerator) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = breakoutName,
                        onValueChange = { breakoutName = it },
                        modifier = Modifier.weight(1f),
                        label = { Text("Breakout room") }
                    )
                    Button(onClick = {
                        controller.createBreakout(breakoutName)
                        breakoutName = ""
                    }) { Text("Add") }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { controller.moveBreakout(null) }) { Text("Main Room") }
                snapshot.breakouts.forEach { b ->
                    OutlinedButton(onClick = { controller.moveBreakout(b.id) }) { Text(b.name) }
                }
            }

            if (snapshot.isModerator) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = {
                        controller.updateSecurity(lobbyEnabled = !snapshot.security.lobbyEnabled)
                    }) {
                        Text(if (snapshot.security.lobbyEnabled) "Disable Lobby" else "Enable Lobby")
                    }
                    OutlinedTextField(
                        value = roomPassword,
                        onValueChange = { roomPassword = it },
                        modifier = Modifier.weight(1f),
                        label = { Text("Password") }
                    )
                    Button(onClick = {
                        controller.updateSecurity(locked = true, password = roomPassword)
                        roomPassword = ""
                    }) { Text("Lock") }
                }
            }
        }
    }
}
