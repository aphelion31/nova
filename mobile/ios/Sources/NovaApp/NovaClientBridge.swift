import Foundation
import SwiftUI
import NovaCore

#if os(iOS)
import AVFoundation
#endif

public struct RecentMeeting: Identifiable, Codable, Hashable {
    public var id: String { url }
    public let room: String
    public let url: String
    public let lastJoinedAt: Date
}

public enum AudioRoute: String, CaseIterable {
    case speaker = "Speaker"
    case earpiece = "Earpiece"
    case bluetooth = "Bluetooth"
}

public struct MobileReaction: Identifiable {
    public let id = UUID()
    public let emoji: String
    public let senderName: String
}

public protocol NovaWebRtcAdapter: AnyObject {
    func startLocalPreview(audioMuted: Bool, videoMuted: Bool)
    func createInitialOffer(iceUrls: [String], onOfferSdp: @escaping (String) -> Void)
    func applyAnswer(sdp: String)
    func applyRemoteOfferAndCreateAnswer(sdp: String, onAnswerSdp: @escaping (String) -> Void)
    func setAudioMuted(_ muted: Bool)
    func setVideoMuted(_ muted: Bool)
    func stop()
}

@MainActor
public final class NovaClientBridge: ObservableObject {
    @Published public var snapshot: NovaRoomSnapshot
    @Published public var connected: Bool = false
    @Published public var selectedRoomUrl: String?
    @Published public var serverBaseUrl: String
    @Published public var displayName: String
    @Published public var defaultStartMuted: Bool
    @Published public var audioMuted: Bool = false
    @Published public var videoMuted: Bool = false
    @Published public var audioOnly: Bool = false
    @Published public var carMode: Bool = false
    @Published public var tileView: Bool = true
    @Published public var handRaised: Bool = false
    @Published public var callSeconds: Int = 0
    @Published public var audioRoute: AudioRoute = .speaker
    @Published public var language: String = "en"
    @Published public var recentMeetings: [RecentMeeting] = []
    @Published public var reactions: [MobileReaction] = []
    @Published public var errorText: String?

    private var core: NovaClientCore
    private var wsTask: URLSessionWebSocketTask?
    private var timer: Timer?
    private var initialOfferSent = false
    private let rtcAdapter: NovaWebRtcAdapter?

    public init(room: String = "standup", rtcAdapter: NovaWebRtcAdapter? = nil) {
        self.core = NovaClientCore(room: room)
        self.snapshot = core.snapshot()
        self.rtcAdapter = rtcAdapter
        let defaults = UserDefaults.standard
        self.serverBaseUrl = defaults.string(forKey: "nova.serverBaseUrl") ?? "http://127.0.0.1:3000"
        self.displayName = defaults.string(forKey: "nova.displayName") ?? "iOS User"
        self.defaultStartMuted = defaults.bool(forKey: "nova.startMuted")
        self.language = defaults.string(forKey: "nova.lang") ?? "en"
        if let data = defaults.data(forKey: "nova.recentMeetings"),
           let saved = try? JSONDecoder().decode([RecentMeeting].self, from: data) {
            self.recentMeetings = saved
        }
    }

    public func openPrejoin(roomOrUrl: String) {
        let trimmed = roomOrUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        let target: String
        if trimmed.contains("://") || trimmed.contains("/") {
            target = trimmed
        } else {
            let slug = trimmed.isEmpty ? Self.randomRoomSlug() : trimmed
            target = "\(serverBaseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/")))/room/\(slug)"
        }
        audioMuted = defaultStartMuted
        videoMuted = defaultStartMuted
        audioOnly = false
        errorText = nil
        selectedRoomUrl = target
    }

    public func closePrejoin() {
        selectedRoomUrl = nil
        errorText = nil
    }

    public func join(meetingUrl: String, displayName: String, password: String? = nil, audioOnlyMode: Bool = false) {
        do {
            let parsed = try parseNovaMeetingUrl(rawUrl: meetingUrl)
            core = NovaClientCore(room: parsed.room)
            snapshot = core.snapshot()
            initialOfferSent = false
            self.displayName = displayName
            self.audioOnly = audioOnlyMode
            if audioOnlyMode { self.videoMuted = true }
            errorText = nil
            savePrefs()
            recordRecent(room: parsed.room, url: meetingUrl)
            configureAudioSession()

            guard let url = URL(string: parsed.wsUrl) else {
                errorText = "Invalid WebSocket URL"
                return
            }
            let task = URLSession.shared.webSocketTask(with: url)
            self.wsTask = task
            task.resume()

            let joinPayload = try core.buildJoinPayload(
                displayName: displayName,
                password: password,
                token: parsed.token,
                audioMuted: audioMuted,
                videoMuted: videoMuted
            )
            sendText(joinPayload)
            listenLoop(task: task)
        } catch {
            errorText = error.localizedDescription
        }
    }

    public func toggleAudio() {
        audioMuted.toggle()
        rtcAdapter?.setAudioMuted(audioMuted)
        sendMediaState()
    }

    public func toggleVideo() {
        if audioOnly && videoMuted { audioOnly = false }
        videoMuted.toggle()
        rtcAdapter?.setVideoMuted(videoMuted)
        sendMediaState()
    }

    public func toggleAudioOnly() {
        audioOnly.toggle()
        if audioOnly {
            videoMuted = true
            rtcAdapter?.setVideoMuted(true)
            sendMediaState()
        }
    }

    public func toggleCarMode() {
        carMode.toggle()
        if carMode {
            audioOnly = true
            videoMuted = true
            rtcAdapter?.setVideoMuted(true)
            sendMediaState()
        }
    }

    public func toggleTileView() {
        tileView.toggle()
    }

    public func cycleAudioRoute() {
        let all = AudioRoute.allCases
        if let idx = all.firstIndex(of: audioRoute) {
            audioRoute = all[(idx + 1) % all.count]
        }
        configureAudioSession()
    }

    public func toggleHand() {
        handRaised.toggle()
        if let payload = try? core.buildRaiseHandPayload(raised: handRaised) {
            sendText(payload)
        }
    }

    public func sendReaction(_ emoji: String) {
        if let payload = try? core.buildReactionPayload(emoji: emoji) {
            sendText(payload)
        }
    }

    public func sendChat(_ body: String, recipientId: String? = nil) {
        if let payload = try? core.buildChatPayload(body: body, recipientId: recipientId) {
            sendText(payload)
        }
    }

    public func createPoll(question: String, options: [String]) {
        if let payload = try? core.buildPollCreatePayload(question: question, options: options) {
            sendText(payload)
        }
    }

    public func votePoll(pollId: String, optionIndex: UInt32) {
        if let payload = try? core.buildPollVotePayload(pollId: pollId, optionIndex: optionIndex) {
            sendText(payload)
        }
    }

    public func admitLobby(peerId: String, admit: Bool) {
        if let payload = try? core.buildLobbyDecisionPayload(peerId: peerId, admit: admit) {
            sendText(payload)
        }
    }

    public func moderate(targetId: String, action: String) {
        if let payload = try? core.buildModeratePayload(targetId: targetId, action: action) {
            sendText(payload)
        }
    }

    public func createBreakout(name: String) {
        if let payload = try? core.buildBreakoutCreatePayload(name: name) {
            sendText(payload)
        }
    }

    public func moveBreakout(breakoutId: String?) {
        if let payload = try? core.buildBreakoutMovePayload(breakoutId: breakoutId) {
            sendText(payload)
        }
    }

    public func updateSecurity(
        locked: Bool? = nil,
        password: String? = nil,
        clearPassword: Bool = false,
        lobbyEnabled: Bool? = nil,
        e2eeEnabled: Bool? = nil,
        subject: String? = nil
    ) {
        if let payload = try? core.buildRoomSecurityPayload(
            locked: locked,
            password: password,
            clearPassword: clearPassword,
            lobbyEnabled: lobbyEnabled,
            e2eeEnabled: e2eeEnabled,
            subject: subject
        ) {
            sendText(payload)
        }
    }

    public func deriveE2eeKey(passphrase: String) -> String? {
        try? core.deriveE2eeKeyB64(passphrase: passphrase, generation: 1)
    }

    public func savePrefs() {
        let defaults = UserDefaults.standard
        defaults.set(serverBaseUrl, forKey: "nova.serverBaseUrl")
        defaults.set(displayName, forKey: "nova.displayName")
        defaults.set(defaultStartMuted, forKey: "nova.startMuted")
        defaults.set(language, forKey: "nova.lang")
    }

    public func leave() {
        timer?.invalidate()
        timer = nil
        wsTask?.cancel(with: .goingAway, reason: nil)
        wsTask = nil
        rtcAdapter?.stop()
        initialOfferSent = false
        connected = false
        carMode = false
        callSeconds = 0
        selectedRoomUrl = nil
    }

    public static func randomRoomSlug() -> String {
        let adj = ["amber", "cobalt", "lunar", "solar", "vivid"].randomElement() ?? "nova"
        let noun = ["beacon", "comet", "orbit", "quasar", "summit"].randomElement() ?? "room"
        return "\(adj)-\(noun)-\(Int.random(in: 100...999))"
    }

    private func recordRecent(room: String, url: String) {
        var next = recentMeetings.filter { $0.url != url }
        next.insert(RecentMeeting(room: room, url: url, lastJoinedAt: Date()), at: 0)
        if next.count > 12 { next = Array(next.prefix(12)) }
        recentMeetings = next
        if let data = try? JSONEncoder().encode(next) {
            UserDefaults.standard.set(data, forKey: "nova.recentMeetings")
        }
    }

    private func startCallTimerIfNeeded() {
        guard timer == nil else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.callSeconds += 1
            }
        }
    }

    private func sendMediaState() {
        if let payload = try? core.buildMediaStatePayload(
            audioMuted: audioMuted,
            videoMuted: videoMuted,
            screenSharing: false,
            audioLevel: 0
        ) {
            sendText(payload)
        }
    }

    private func sendText(_ text: String) {
        wsTask?.send(.string(text)) { [weak self] err in
            if let err {
                Task { @MainActor in self?.errorText = err.localizedDescription }
            }
        }
    }

    private func listenLoop(task: URLSessionWebSocketTask) {
        task.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(.string(let text)):
                Task { @MainActor in
                    do {
                        if let raw = text.data(using: .utf8),
                           let obj = try? JSONSerialization.jsonObject(with: raw) as? [String: Any] {
                            let msgType = obj["type"] as? String
                            if msgType == "reaction",
                               let emoji = obj["emoji"] as? String,
                               let senderName = obj["display_name"] as? String {
                                let item = MobileReaction(emoji: emoji, senderName: senderName)
                                self.reactions.append(item)
                                Task { @MainActor in
                                    try? await Task.sleep(nanoseconds: 2_400_000_000)
                                    self.reactions.removeAll { $0.id == item.id }
                                }
                            } else if msgType == "moderated", let action = obj["action"] as? String {
                                switch action {
                                case "mute_audio":
                                    self.audioMuted = true
                                    self.rtcAdapter?.setAudioMuted(true)
                                case "mute_video":
                                    self.videoMuted = true
                                    self.rtcAdapter?.setVideoMuted(true)
                                case "kick":
                                    self.leave()
                                    return
                                default:
                                    break
                                }
                            }
                        }

                        let next = try self.core.applyServerJson(json: text)
                        self.snapshot = next
                        self.connected = next.selfId != nil && !next.inLobby
                        if self.connected {
                            self.startCallTimerIfNeeded()
                        }
                        if let ans = next.sdpAnswer {
                            self.rtcAdapter?.applyAnswer(sdp: ans)
                        }
                        if let reoffer = next.pendingRenegotiateSdp {
                            self.rtcAdapter?.applyRemoteOfferAndCreateAnswer(sdp: reoffer) { answerSdp in
                                if let msg = try? self.core.buildRtcRenegotiateAnswerPayload(sdp: answerSdp) {
                                    self.sendText(msg)
                                }
                            }
                        }
                        if self.connected, self.rtcAdapter != nil, !self.initialOfferSent {
                            self.initialOfferSent = true
                            self.rtcAdapter?.createInitialOffer(iceUrls: []) { offerSdp in
                                if let msg = try? self.core.buildRtcOfferPayload(sdp: offerSdp) {
                                    self.sendText(msg)
                                }
                            }
                        }
                    } catch {
                        self.errorText = error.localizedDescription
                    }
                    self.listenLoop(task: task)
                }
            case .success:
                Task { @MainActor in self.listenLoop(task: task) }
            case .failure(let err):
                Task { @MainActor in
                    self.errorText = err.localizedDescription
                    self.connected = false
                }
            }
        }
    }

    private func configureAudioSession() {
        #if os(iOS)
        let session = AVAudioSession.sharedInstance()
        var opts: AVAudioSession.CategoryOptions = [.allowBluetooth]
        if audioRoute == .speaker {
            opts.insert(.defaultToSpeaker)
        }
        try? session.setCategory(.playAndRecord, mode: .voiceChat, options: opts)
        try? session.setActive(true)
        #endif
    }
}
