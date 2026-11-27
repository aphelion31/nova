import SwiftUI
import NovaCore

struct RoomView: View {
    @ObservedObject var bridge: NovaClientBridge
    @State private var showChat = false
    @State private var showParticipants = false
    @State private var showOverflow = false

    private var formattedTimer: String {
        let mins = bridge.callSeconds / 60
        let secs = bridge.callSeconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            VStack(spacing: 10) {
                if !bridge.snapshot.inPipMode {
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text(bridge.snapshot.security.subject)
                                    .font(.headline)
                                    .lineLimit(1)
                                if bridge.snapshot.isVisitor {
                                    Text("Viewer").font(.caption2.bold()).padding(.horizontal, 6).padding(.vertical, 2).background(Color.blue.opacity(0.25)).clipShape(Capsule())
                                }
                                if bridge.snapshot.security.locked {
                                    Text("Locked").font(.caption2.bold()).padding(.horizontal, 6).padding(.vertical, 2).background(Color.orange.opacity(0.2)).clipShape(Capsule())
                                }
                                if bridge.snapshot.security.e2eeEnabled {
                                    Text("E2EE").font(.caption2.bold()).padding(.horizontal, 6).padding(.vertical, 2).background(Color.green.opacity(0.2)).clipShape(Capsule())
                                }
                            }
                            Text("\(formattedTimer) • \(bridge.snapshot.participants.count) peers")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button(bridge.audioRoute.rawValue) { bridge.cycleAudioRoute() }
                            .buttonStyle(.bordered)
                            .font(.caption)
                        Button(bridge.carMode ? "Video UI" : "Car Mode") { bridge.toggleCarMode() }
                            .buttonStyle(.bordered)
                            .font(.caption)
                    }
                    .padding(.horizontal)
                }

                if bridge.snapshot.inLobby {
                    Spacer()
                    Text("Waiting in Lobby").font(.title3.bold())
                    Text(bridge.snapshot.lobbyMessage ?? "A moderator will admit you shortly.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                } else if bridge.carMode {
                    VStack(spacing: 22) {
                        Spacer()
                        Text("Car Mode — Safe Audio Focus")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                        Button {
                            bridge.toggleAudio()
                        } label: {
                            VStack(spacing: 8) {
                                Text(bridge.audioMuted ? "TAP TO UNMUTE" : "TAP TO MUTE")
                                    .font(.title2.bold())
                                Text(bridge.audioMuted ? "Mic is off" : "Mic is live")
                                    .font(.caption)
                            }
                            .frame(width: 220, height: 220)
                            .background(bridge.audioMuted ? Color.red : Color.blue)
                            .foregroundStyle(.white)
                            .clipShape(Circle())
                        }
                        Spacer()
                    }
                } else {
                    let selfBreakout = bridge.snapshot.participants.first(where: { $0.id == bridge.snapshot.selfId })?.breakoutId
                    let visible = bridge.snapshot.participants.filter { $0.breakoutId == selfBreakout }

                    ScrollView {
                        LazyVGrid(
                            columns: bridge.tileView ? [GridItem(.flexible()), GridItem(.flexible())] : [GridItem(.flexible())],
                            spacing: 10
                        ) {
                            ForEach(visible, id: \.id) { peer in
                                let isSpeaker = bridge.snapshot.activeSpeakerId == peer.id
                                VStack(spacing: 6) {
                                    Circle()
                                        .fill(Color.blue.opacity(0.25))
                                        .frame(width: 56, height: 56)
                                        .overlay(Text(String(peer.displayName.prefix(2)).uppercased()).bold())
                                    Text(peer.id == bridge.snapshot.selfId ? "\(peer.displayName) (You)" : peer.displayName)
                                        .font(.caption.bold())
                                        .lineLimit(1)
                                    HStack(spacing: 6) {
                                        if peer.isModerator { Text("Host").font(.caption2).foregroundStyle(.orange) }
                                        if peer.audioMuted { Text("Muted").font(.caption2).foregroundStyle(.red) }
                                        if peer.handRaised { Text("Hand").font(.caption2).foregroundStyle(.yellow) }
                                    }
                                }
                                .frame(maxWidth: .infinity, minHeight: bridge.tileView ? 132 : 200)
                                .background(Color(red: 0x29 / 255.0, green: 0x29 / 255.0, blue: 0x29 / 255.0))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(isSpeaker ? Color(red: 0x24 / 255.0, green: 0x6F / 255.0, blue: 0xE5 / 255.0) : Color.clear, lineWidth: 2)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                        }
                        .padding(.horizontal)
                    }
                }

                if !bridge.snapshot.inPipMode {
                    HStack(spacing: 8) {
                        if bridge.snapshot.isVisitor {
                            Button(bridge.handRaised ? "Lower Hand" : "Raise Hand") { bridge.toggleHand() }
                        } else {
                            Button(bridge.audioMuted ? "Unmute" : "Mute") { bridge.toggleAudio() }
                            Button(bridge.videoMuted ? "Cam On" : "Cam Off") { bridge.toggleVideo() }
                        }
                        Button("Chat") { showChat = true }
                        Button("Peers (\(bridge.snapshot.participants.count))") { showParticipants = true }
                        Button("More") { showOverflow = true }
                        Button("Leave", role: .destructive) { bridge.leave() }
                    }
                    .buttonStyle(.bordered)
                    .padding(.bottom, 12)
                }
            }

            VStack(alignment: .trailing, spacing: 6) {
                ForEach(bridge.reactions) { r in
                    Text("\(r.emoji) \(r.senderName)")
                        .font(.caption.bold())
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.black.opacity(0.75))
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
            }
            .padding(.trailing, 18)
            .padding(.bottom, 76)
        }
        .sheet(isPresented: $showChat) { ChatSheet(bridge: bridge) }
        .sheet(isPresented: $showParticipants) { ParticipantsSheet(bridge: bridge) }
        .sheet(isPresented: $showOverflow) { OverflowSheet(bridge: bridge) }
        .alert(
            "Joining meeting",
            isPresented: Binding(
                get: { bridge.snapshot.showVisitorJoinDialog },
                set: { if !$0 { bridge.hideDialog() } }
            )
        ) {
            Button("OK") { bridge.hideDialog() }
        } message: {
            Text("You're currently a viewer in this conference.\n\nIf you wish to speak, please raise your hand below and wait for the moderator's approval.")
        }
    }
}
