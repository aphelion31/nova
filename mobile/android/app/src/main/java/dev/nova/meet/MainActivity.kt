package dev.nova.meet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import dev.nova.meet.ui.PrejoinScreen
import dev.nova.meet.ui.RoomScreen
import dev.nova.meet.ui.WelcomeScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val controller = NovaClientController(applicationContext)

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                val connected by controller.connected.collectAsState()
                val snapshot by controller.snapshot.collectAsState()
                val selectedUrl by controller.selectedRoomUrl.collectAsState()
                when {
                    connected || snapshot.inLobby -> RoomScreen(controller)
                    selectedUrl != null -> PrejoinScreen(controller, selectedUrl!!)
                    else -> WelcomeScreen(controller)
                }
            }
        }
    }
}
