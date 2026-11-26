package dev.nova.meet

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import uniffi.nova_core.NovaClientCore
import uniffi.nova_core.NovaRoomSnapshot
import uniffi.nova_core.parseNovaMeetingUrl

data class RecentMeeting(val room: String, val url: String)
data class MobileReaction(val id: Long, val emoji: String, val senderName: String)

interface AndroidWebRtcAdapter {
    fun createInitialOffer(onOfferSdp: (String) -> Unit)
    fun applyAnswer(sdp: String)
    fun applyRemoteOfferAndCreateAnswer(sdp: String, onAnswerSdp: (String) -> Unit)
    fun setAudioMuted(muted: Boolean)
    fun setVideoMuted(muted: Boolean)
    fun stop()
}

class NovaClientController(
    private val context: Context,
    private val rtcAdapter: AndroidWebRtcAdapter? = null
) {
    private val prefs = context.getSharedPreferences("nova_prefs", Context.MODE_PRIVATE)
    private var core = NovaClientCore("standup")
    private val client = OkHttpClient()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var initialOfferSent = false
    private var ws: WebSocket? = null

    private val _snapshot = MutableStateFlow(core.snapshot())
    val snapshot: StateFlow<NovaRoomSnapshot> = _snapshot.asStateFlow()

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    private val _selectedRoomUrl = MutableStateFlow<String?>(null)
    val selectedRoomUrl: StateFlow<String?> = _selectedRoomUrl.asStateFlow()

    private val _serverBaseUrl = MutableStateFlow(prefs.getString("serverBaseUrl", "http://10.0.2.2:3000") ?: "http://10.0.2.2:3000")
    val serverBaseUrl: StateFlow<String> = _serverBaseUrl.asStateFlow()

    private val _displayName = MutableStateFlow(prefs.getString("displayName", "Android User") ?: "Android User")
    val displayName: StateFlow<String> = _displayName.asStateFlow()

    private val _startMuted = MutableStateFlow(prefs.getBoolean("startMuted", false))
    val startMuted: StateFlow<Boolean> = _startMuted.asStateFlow()

    private val _audioMuted = MutableStateFlow(false)
    val audioMuted: StateFlow<Boolean> = _audioMuted.asStateFlow()

    private val _videoMuted = MutableStateFlow(false)
    val videoMuted: StateFlow<Boolean> = _videoMuted.asStateFlow()

    private val _audioOnly = MutableStateFlow(false)
    val audioOnly: StateFlow<Boolean> = _audioOnly.asStateFlow()

    private val _carMode = MutableStateFlow(false)
    val carMode: StateFlow<Boolean> = _carMode.asStateFlow()

    private val _tileView = MutableStateFlow(true)
    val tileView: StateFlow<Boolean> = _tileView.asStateFlow()

    private val _handRaised = MutableStateFlow(false)
    val handRaised: StateFlow<Boolean> = _handRaised.asStateFlow()

    private val _recentMeetings = MutableStateFlow(loadRecent())
    val recentMeetings: StateFlow<List<RecentMeeting>> = _recentMeetings.asStateFlow()

    private val _reactions = MutableStateFlow<List<MobileReaction>>(emptyList())
    val reactions: StateFlow<List<MobileReaction>> = _reactions.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun openPrejoin(roomOrUrl: String) {
        val trimmed = roomOrUrl.trim()
        val target = if (trimmed.contains("://") || trimmed.contains("/")) {
            trimmed
        } else {
            val slug = trimmed.ifEmpty { "nova-${(100..999).random()}" }
            "${_serverBaseUrl.value.trimEnd('/')}/room/$slug"
        }
        _audioMuted.value = _startMuted.value
        _videoMuted.value = _startMuted.value
        _audioOnly.value = false
        _error.value = null
        _selectedRoomUrl.value = target
    }

    fun closePrejoin() {
        _selectedRoomUrl.value = null
        _error.value = null
    }

    fun saveSettings(serverUrl: String, name: String, mutedByDefault: Boolean) {
        _serverBaseUrl.value = serverUrl.trim()
        _displayName.value = name.trim().ifEmpty { "Android User" }
        _startMuted.value = mutedByDefault
        prefs.edit()
            .putString("serverBaseUrl", _serverBaseUrl.value)
            .putString("displayName", _displayName.value)
            .putBoolean("startMuted", mutedByDefault)
            .apply()
    }

    fun join(meetingUrl: String, displayName: String, password: String?, audioOnlyMode: Boolean = false) {
        runCatching {
            val parsed = parseNovaMeetingUrl(meetingUrl)
            core = NovaClientCore(parsed.room)
            _snapshot.value = core.snapshot()
            initialOfferSent = false
            _displayName.value = displayName
            _audioOnly.value = audioOnlyMode
            if (audioOnlyMode) _videoMuted.value = true
            _error.value = null
            saveSettings(_serverBaseUrl.value, displayName, _startMuted.value)
            recordRecent(parsed.room, meetingUrl)

            val joinPayload = core.buildJoinPayload(
                displayName = displayName,
                password = password?.ifBlank { null },
                token = parsed.token,
                audioMuted = _audioMuted.value,
                videoMuted = _videoMuted.value
            )

            context.startForegroundService(Intent(context, CallForegroundService::class.java))

            val request = Request.Builder().url(parsed.wsUrl).build()
            ws = client.newWebSocket(request, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    webSocket.send(joinPayload)
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    runCatching {
                        val obj = JSONObject(text)
                        when (obj.optString("type")) {
                            "reaction" -> {
                                val rid = System.nanoTime()
                                val r = MobileReaction(
                                    id = rid,
                                    emoji = obj.optString("emoji"),
                                    senderName = obj.optString("display_name")
                                )
                                _reactions.value = (_reactions.value + r).takeLast(6)
                                mainHandler.postDelayed({
                                    _reactions.value = _reactions.value.filterNot { it.id == rid }
                                }, 2400L)
                            }
                            "moderated" -> {
                                when (obj.optString("action")) {
                                    "mute_audio" -> {
                                        _audioMuted.value = true
                                        rtcAdapter?.setAudioMuted(true)
                                    }
                                    "mute_video" -> {
                                        _videoMuted.value = true
                                        rtcAdapter?.setVideoMuted(true)
                                    }
                                    "kick" -> {
                                        leave()
                                        return
                                    }
                                }
                            }
                        }
                        val next = core.applyServerJson(text)
                        _snapshot.value = next
                        val active = next.selfId != null && !next.inLobby
                        _connected.value = active
                        next.sdpAnswer?.let { rtcAdapter?.applyAnswer(it) }
                        next.pendingRenegotiateSdp?.let { offer ->
                            rtcAdapter?.applyRemoteOfferAndCreateAnswer(offer) { ans ->
                                webSocket.send(core.buildRtcRenegotiateAnswerPayload(ans))
                            }
                        }
                        if (active && rtcAdapter != null && !initialOfferSent) {
                            initialOfferSent = true
                            rtcAdapter.createInitialOffer { offerSdp ->
                                webSocket.send(core.buildRtcOfferPayload(offerSdp))
                            }
                        }
                    }.onFailure { _error.value = it.message }
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    _error.value = t.message
                    _connected.value = false
                }
            })
        }.onFailure { _error.value = it.message }
    }

    fun toggleAudio() {
        val next = !_audioMuted.value
        _audioMuted.value = next
        rtcAdapter?.setAudioMuted(next)
        sendMediaState()
    }

    fun toggleVideo() {
        if (_audioOnly.value && _videoMuted.value) _audioOnly.value = false
        val next = !_videoMuted.value
        _videoMuted.value = next
        rtcAdapter?.setVideoMuted(next)
        sendMediaState()
    }

    fun toggleAudioOnly() {
        val next = !_audioOnly.value
        _audioOnly.value = next
        if (next) {
            _videoMuted.value = true
            rtcAdapter?.setVideoMuted(true)
            sendMediaState()
        }
    }

    fun toggleCarMode() {
        val next = !_carMode.value
        _carMode.value = next
        if (next) {
            _audioOnly.value = true
            _videoMuted.value = true
            rtcAdapter?.setVideoMuted(true)
            sendMediaState()
        }
    }

    fun toggleTileView() {
        _tileView.value = !_tileView.value
    }

    fun toggleHand() {
        val next = !_handRaised.value
        _handRaised.value = next
        ws?.send(core.buildRaiseHandPayload(next))
    }

    fun sendReaction(emoji: String) {
        ws?.send(core.buildReactionPayload(emoji))
    }

    fun sendChat(body: String, recipientId: String? = null) {
        if (body.isBlank()) return
        ws?.send(core.buildChatPayload(body, recipientId))
    }

    fun createPoll(question: String, options: List<String>) {
        if (question.isBlank() || options.size < 2) return
        ws?.send(core.buildPollCreatePayload(question, options))
    }

    fun votePoll(pollId: String, optionIndex: UInt) {
        ws?.send(core.buildPollVotePayload(pollId, optionIndex))
    }

    fun admitLobby(peerId: String, admit: Boolean) {
        ws?.send(core.buildLobbyDecisionPayload(peerId, admit))
    }

    fun moderate(targetId: String, action: String) {
        ws?.send(core.buildModeratePayload(targetId, action))
    }

    fun createBreakout(name: String) {
        if (name.isBlank()) return
        ws?.send(core.buildBreakoutCreatePayload(name))
    }

    fun moveBreakout(breakoutId: String?) {
        ws?.send(core.buildBreakoutMovePayload(breakoutId))
    }

    fun updateSecurity(
        locked: Boolean? = null,
        password: String? = null,
        clearPassword: Boolean = false,
        lobbyEnabled: Boolean? = null,
        e2eeEnabled: Boolean? = null,
        subject: String? = null
    ) {
        ws?.send(
            core.buildRoomSecurityPayload(
                locked = locked,
                password = password,
                clearPassword = clearPassword,
                lobbyEnabled = lobbyEnabled,
                e2eeEnabled = e2eeEnabled,
                subject = subject
            )
        )
    }

    fun deriveE2eeKey(passphrase: String): String? =
        runCatching { core.deriveE2eeKeyB64(passphrase, 1u) }.getOrNull()

    fun leave() {
        ws?.close(1000, "User left")
        ws = null
        rtcAdapter?.stop()
        initialOfferSent = false
        _connected.value = false
        _carMode.value = false
        _selectedRoomUrl.value = null
        context.stopService(Intent(context, CallForegroundService::class.java))
    }

    private fun recordRecent(room: String, url: String) {
        val next = (listOf(RecentMeeting(room, url)) + _recentMeetings.value.filter { it.url != url }).take(12)
        _recentMeetings.value = next
        val arr = JSONArray()
        next.forEach {
            arr.put(JSONObject().put("room", it.room).put("url", it.url))
        }
        prefs.edit().putString("recentMeetings", arr.toString()).apply()
    }

    private fun loadRecent(): List<RecentMeeting> {
        val raw = prefs.getString("recentMeetings", null) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { idx ->
                val o = arr.getJSONObject(idx)
                RecentMeeting(o.getString("room"), o.getString("url"))
            }
        }.getOrDefault(emptyList())
    }

    private fun sendMediaState() {
        ws?.send(
            core.buildMediaStatePayload(
                audioMuted = _audioMuted.value,
                videoMuted = _videoMuted.value,
                screenSharing = false,
                audioLevel = 0f
            )
        )
    }
}
