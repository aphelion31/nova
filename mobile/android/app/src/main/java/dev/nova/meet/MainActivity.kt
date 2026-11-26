package dev.nova.meet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import dev.nova.meet.ui.PrejoinScreen
import dev.nova.meet.ui.RoomScreen
import dev.nova.meet.ui.WelcomeScreen

private val JitsiDarkColors = darkColorScheme(
    primary = Color(0xFF246FE5),
    onPrimary = Color(0xFFFFFFFF),
    secondary = Color(0xFF4687ED),
    background = Color(0xFF040404),
    surface = Color(0xFF141414),
    surfaceVariant = Color(0xFF292929),
    onBackground = Color(0xFFFFFFFF),
    onSurface = Color(0xFFFFFFFF),
    error = Color(0xFFCB2233),
    outline = Color(0xFF3D3D3D)
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val controller = NovaClientController(applicationContext)

        setContent {
            MaterialTheme(colorScheme = JitsiDarkColors) {
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
