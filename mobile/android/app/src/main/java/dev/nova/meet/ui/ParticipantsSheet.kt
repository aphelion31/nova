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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.nova.meet.NovaClientController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParticipantsSheet(controller: NovaClientController, onDismiss: () -> Unit) {
    val snapshot by controller.snapshot.collectAsState()

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (snapshot.isModerator && snapshot.lobby.isNotEmpty()) {
                Text("Waiting in Lobby")
                snapshot.lobby.forEach { entry ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(entry.displayName)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Button(onClick = { controller.admitLobby(entry.peerId, true) }) { Text("Admit") }
                            OutlinedButton(onClick = { controller.admitLobby(entry.peerId, false) }) { Text("Decline") }
                        }
                    }
                }
            }
            Text("Participants (${snapshot.participants.size})")
            snapshot.participants.forEach { peer ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        when {
                            peer.isModerator -> "${peer.displayName} (Host)"
                            peer.isVisitor -> "${peer.displayName} (Viewer)"
                            else -> peer.displayName
                        }
                    )
                    if (snapshot.isModerator && peer.id != snapshot.selfId) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            if (peer.isVisitor) {
                                Button(onClick = { controller.moderate(peer.id, "promote_visitor") }) { Text("Promote") }
                            }
                            OutlinedButton(onClick = { controller.moderate(peer.id, "mute_audio") }) { Text("Mute") }
                            OutlinedButton(onClick = { controller.moderate(peer.id, "kick") }) { Text("Kick") }
                        }
                    }
                }
            }
        }
    }
}
