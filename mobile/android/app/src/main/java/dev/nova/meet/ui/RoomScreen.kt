package dev.nova.meet.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.nova.meet.NovaClientController
import kotlinx.coroutines.delay

@Composable
fun RoomScreen(controller: NovaClientController) {
    val snapshot by controller.snapshot.collectAsState()
    val audioMuted by controller.audioMuted.collectAsState()
    val videoMuted by controller.videoMuted.collectAsState()
    val carMode by controller.carMode.collectAsState()
    val tileView by controller.tileView.collectAsState()
    val reactions by controller.reactions.collectAsState()
    var activeSheet by remember { mutableStateOf<String?>(null) }
    var elapsedSec by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            elapsedSec += 1
        }
    }

    val timerText = "%02d:%02d".format(elapsedSec / 60, elapsedSec % 60)

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(snapshot.security.subject, style = MaterialTheme.typography.titleMedium)
                    Text("$timerText • ${snapshot.participants.size} peers", style = MaterialTheme.typography.bodySmall)
                }
                OutlinedButton(onClick = { controller.toggleCarMode() }) {
                    Text(if (carMode) "Video UI" else "Car Mode")
                }
            }

            if (snapshot.inLobby) {
                Text(
                    snapshot.lobbyMessage ?: "Waiting for moderator approval…",
                    modifier = Modifier.weight(1f)
                )
            } else if (carMode) {
                Column(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Car Mode — Safe Audio Focus", style = MaterialTheme.typography.titleMedium)
                    Button(
                        onClick = { controller.toggleAudio() },
                        shape = CircleShape,
                        modifier = Modifier.padding(top = 20.dp).size(180.dp)
                    ) {
                        Text(if (audioMuted) "TAP TO UNMUTE" else "TAP TO MUTE")
                    }
                }
            } else {
                val selfBreakout = snapshot.participants.firstOrNull { it.id == snapshot.selfId }?.breakoutId
                val visible = snapshot.participants.filter { it.breakoutId == selfBreakout }
                LazyVerticalGrid(
                    columns = GridCells.Fixed(if (tileView) 2 else 1),
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(visible, key = { it.id }) { peer ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(
                                    if (peer.id == snapshot.selfId) "${peer.displayName} (You)" else peer.displayName,
                                    style = MaterialTheme.typography.titleSmall
                                )
                                Text(if (peer.audioMuted) "Muted" else "Audio on")
                                if (peer.isModerator) Text("Host")
                                if (peer.handRaised) Text("Hand raised")
                            }
                        }
                    }
                }
            }

            if (reactions.isNotEmpty()) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    reactions.forEach { Text("${it.emoji} ${it.senderName}") }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(onClick = { controller.toggleAudio() }) {
                    Text(if (audioMuted) "Unmute" else "Mute")
                }
                OutlinedButton(onClick = { controller.toggleVideo() }) {
                    Text(if (videoMuted) "Cam On" else "Cam Off")
                }
                OutlinedButton(onClick = { activeSheet = "chat" }) { Text("Chat") }
                OutlinedButton(onClick = { activeSheet = "peers" }) { Text("Peers") }
                OutlinedButton(onClick = { activeSheet = "more" }) { Text("More") }
                Button(onClick = { controller.leave() }) { Text("Leave") }
            }
        }

        when (activeSheet) {
            "chat" -> ChatPollsSheet(controller = controller, onDismiss = { activeSheet = null })
            "peers" -> ParticipantsSheet(controller = controller, onDismiss = { activeSheet = null })
            "more" -> OverflowSheet(controller = controller, onDismiss = { activeSheet = null })
        }
    }
}
