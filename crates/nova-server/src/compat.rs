use axum::{
    Router,
    extract::State,
    http::{HeaderMap, StatusCode, header},
    response::IntoResponse,
    routing::get,
};

#[derive(Clone)]
pub struct CompatState {
    pub frontend_url: String,
    pub stun_url: Option<String>,
}

pub fn routes(frontend_url: String, stun_url: Option<String>) -> Router {
    let st = CompatState { frontend_url, stun_url };
    Router::new()
        .route("/config.js", get(serve_config_js))
        .route("/interface_config.js", get(serve_interface_config_js))
        .route("/external_api.js", get(serve_external_api_js))
        .with_state(st)
}

async fn serve_config_js(State(st): State<CompatState>, headers: HeaderMap) -> impl IntoResponse {
    let host = headers
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("localhost:3000");
    let scheme = if st.frontend_url.starts_with("https://") {
        "wss"
    } else {
        "ws"
    };
    let ice_urls = st.stun_url.clone().into_iter().collect::<Vec<_>>();
    let config = serde_json::json!({
        "hosts": {
            "domain": host,
            "muc": format!("conference.{host}"),
        },
        "websocket": format!("{scheme}://{host}/ws/"),
        "serviceUrl": format!("{scheme}://{host}/ws/"),
        "prejoinPageEnabled": true,
        "enableWelcomePage": true,
        "enableLobbyChat": true,
        "e2ee": { "enabled": true },
        "p2p": { "enabled": false },
        "iceServers": [{ "urls": ice_urls }],
        "testing": { "sfu": "str0m" },
    });
    let body = format!("var config = {};\n", config);
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/javascript; charset=utf-8")],
        body,
    )
}

async fn serve_interface_config_js() -> impl IntoResponse {
    let body = r##"var interfaceConfig = {
  APP_NAME: "Nova Meet",
  PROVIDER_NAME: "Nova",
  DEFAULT_BACKGROUND: "#0b0f17",
  DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
  FILM_STRIP_MAX_HEIGHT: 120,
  GENERATE_ROOMNAMES_ON_WELCOME_PAGE: true,
  HIDE_INVITE_MORE_HEADER: false,
  TOOLBAR_BUTTONS: [
    "microphone", "camera", "desktop", "chat", "raisehand",
    "participants-pane", "tileview", "polls", "whiteboard",
    "breakout-rooms", "security", "recording", "hangup"
  ]
};
"##;
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/javascript; charset=utf-8")],
        body,
    )
}

async fn serve_external_api_js() -> impl IntoResponse {
    let body = r#"(function (global) {
  "use strict";

  var COMMAND_MAP = {
    toggleAudio: "toggle-audio",
    toggleVideo: "toggle-video",
    toggleShareScreen: "toggle-share-screen",
    toggleChat: "toggle-chat",
    toggleTileView: "toggle-tile-view",
    toggleRaiseHand: "toggle-raise-hand",
    toggleWhiteboard: "toggle-whiteboard",
    hangup: "video-hangup",
    displayName: "display-name",
    subject: "subject",
    password: "password",
    sendChatMessage: "send-chat-message",
    muteEveryone: "mute-everyone"
  };

  function NovaMeetExternalAPI(domain, options) {
    options = options || {};
    this._domain = domain || global.location.host;
    this._roomName = options.roomName || "nova-room";
    this._listeners = Object.create(null);
    this._audioMuted = false;
    this._videoMuted = false;
    this._participants = [];

    var proto = options.ssl === false ? "http:" : (global.location.protocol === "https:" ? "https:" : "http:");
    var base = /^https?:\/\//i.test(this._domain) ? this._domain.replace(/\/$/, "") : proto + "//" + this._domain;
    var params = new URLSearchParams();
    if (options.jwt) params.set("jwt", options.jwt);
    if (options.userInfo && options.userInfo.displayName) params.set("name", options.userInfo.displayName);
    if (options.userInfo && options.userInfo.email) params.set("email", options.userInfo.email);
    if (options.lang) params.set("lang", options.lang);
    var qs = params.toString();
    var src = base + "/embed/" + encodeURIComponent(this._roomName) + (qs ? "?" + qs : "");

    var iframe = document.createElement("iframe");
    iframe.id = "nova-meet-iframe-" + Math.random().toString(36).slice(2, 9);
    iframe.src = src;
    iframe.allow = "camera; microphone; display-capture; autoplay; clipboard-write; fullscreen";
    iframe.style.width = typeof options.width === "number" ? options.width + "px" : (options.width || "100%");
    iframe.style.height = typeof options.height === "number" ? options.height + "px" : (options.height || "100%");
    iframe.style.border = "0";
    iframe.allowFullscreen = true;

    this._iframe = iframe;
    var parent = options.parentNode || document.body;
    parent.appendChild(iframe);

    var self = this;
    this._onMessage = function (ev) {
      if (!ev.data || ev.data.source !== "nova-embed") return;
      if (ev.data.room && ev.data.room !== self._roomName) return;
      var type = ev.data.event;
      var payload = ev.data.payload || {};
      if (type === "audioMuteStatusChanged") self._audioMuted = !!payload.muted;
      if (type === "videoMuteStatusChanged") self._videoMuted = !!payload.muted;
      if (type === "participantsSnapshot" && Array.isArray(payload.participants)) {
        self._participants = payload.participants;
        return;
      }
      var cbs = self._listeners[type] || [];
      for (var i = 0; i < cbs.length; i++) {
        try { cbs[i](payload); } catch (_err) {}
      }
    };
    global.addEventListener("message", this._onMessage);
  }

  NovaMeetExternalAPI.prototype.executeCommand = function (command) {
    var args = Array.prototype.slice.call(arguments, 1);
    var mapped = COMMAND_MAP[command] || command;
    if (this._iframe && this._iframe.contentWindow) {
      this._iframe.contentWindow.postMessage({
        source: "nova-external-api",
        command: mapped,
        args: args
      }, "*");
    }
  };

  NovaMeetExternalAPI.prototype.executeCommands = function (commandList) {
    if (!commandList || typeof commandList !== "object") return;
    var keys = Object.keys(commandList);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var val = commandList[k];
      if (Array.isArray(val)) this.executeCommand.apply(this, [k].concat(val));
      else this.executeCommand(k, val);
    }
  };

  NovaMeetExternalAPI.prototype.addListener = function (event, listener) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(listener);
  };

  NovaMeetExternalAPI.prototype.on = NovaMeetExternalAPI.prototype.addListener;

  NovaMeetExternalAPI.prototype.removeListener = function (event, listener) {
    var list = this._listeners[event];
    if (!list) return;
    this._listeners[event] = list.filter(function (fn) { return fn !== listener; });
  };

  NovaMeetExternalAPI.prototype.getParticipantsInfo = function () {
    return this._participants.slice();
  };

  NovaMeetExternalAPI.prototype.getNumberOfParticipants = function () {
    return this._participants.length;
  };

  NovaMeetExternalAPI.prototype.isAudioMuted = function () {
    return Promise.resolve(this._audioMuted);
  };

  NovaMeetExternalAPI.prototype.isVideoMuted = function () {
    return Promise.resolve(this._videoMuted);
  };

  NovaMeetExternalAPI.prototype.getIFrame = function () {
    return this._iframe;
  };

  NovaMeetExternalAPI.prototype.dispose = function () {
    global.removeEventListener("message", this._onMessage);
    if (this._iframe && this._iframe.parentNode) {
      this._iframe.parentNode.removeChild(this._iframe);
    }
    this._listeners = Object.create(null);
  };

  global.NovaMeetExternalAPI = NovaMeetExternalAPI;
  global.JitsiMeetExternalAPI = NovaMeetExternalAPI;
})(window);
"#;
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/javascript; charset=utf-8")],
        body,
    )
}
