package dev.nova.meet.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
fun ChatPollsSheet(controller: NovaClientController, onDismiss: () -> Unit) {
    val snapshot by controller.snapshot.collectAsState()
    var draft by remember { mutableStateOf("") }
    var dmRecipientId by remember { mutableStateOf<String?>(null) }
    var pollQuestion by remember { mutableStateOf("") }
    var pollOptA by remember { mutableStateOf("Yes") }
    var pollOptB by remember { mutableStateOf("No") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            LazyColumn(
                modifier = Modifier.weight(1f, fill = false),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                items(snapshot.messages, key = { it.id }) { msg ->
                    val prefix = if (msg.recipientId != null) "[DM] " else ""
                    Text("$prefix${msg.senderName}: ${msg.body}")
                }
                items(snapshot.polls, key = { it.id }) { poll ->
                    Column {
                        Text(poll.question)
                        poll.options.forEachIndexed { idx, opt ->
                            OutlinedButton(onClick = { controller.votePoll(poll.id, idx.toUInt()) }) {
                                Text("${opt.text} (${opt.voteCount})")
                            }
                        }
                    }
                }
            }
            OutlinedTextField(
                value = pollQuestion,
                onValueChange = { pollQuestion = it },
                label = { Text("New poll question") },
                modifier = Modifier.fillMaxWidth()
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = pollOptA, onValueChange = { pollOptA = it }, modifier = Modifier.weight(1f))
                OutlinedTextField(value = pollOptB, onValueChange = { pollOptB = it }, modifier = Modifier.weight(1f))
                Button(onClick = {
                    controller.createPoll(pollQuestion, listOf(pollOptA, pollOptB))
                    pollQuestion = ""
                }) { Text("Poll") }
            }
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                if (dmRecipientId == null) {
                    Button(onClick = { dmRecipientId = null }) { Text("To: Everyone") }
                } else {
                    OutlinedButton(onClick = { dmRecipientId = null }) { Text("Everyone") }
                }
                snapshot.participants
                    .filter { it.id != snapshot.selfId }
                    .forEach { peer ->
                        if (dmRecipientId == peer.id) {
                            Button(onClick = { dmRecipientId = peer.id }) { Text("DM: ${peer.displayName}") }
                        } else {
                            OutlinedButton(onClick = { dmRecipientId = peer.id }) { Text("DM: ${peer.displayName}") }
                        }
                    }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    modifier = Modifier.weight(1f),
                    label = { Text(if (dmRecipientId == null) "Message" else "Direct message") }
                )
                Button(onClick = {
                    controller.sendChat(draft, dmRecipientId)
                    draft = ""
                }) {
                    Text("Send")
                }
            }
        }
    }
}
