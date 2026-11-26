import SwiftUI

struct OverflowSheet: View {
    @ObservedObject var bridge: NovaClientBridge
    @State private var breakoutName = ""
    @State private var roomPassword = ""
    @State private var e2eePassphrase = ""

    private let reactionEmojis = ["👍", "👏", "❤️", "🎉", "😂", "🔥"]

    var body: some View {
        List {
            Section("Reactions & Controls") {
                HStack(spacing: 12) {
                    ForEach(reactionEmojis, id: \.self) { emoji in
                        Button(emoji) { bridge.sendReaction(emoji) }
                            .font(.title2)
                    }
                }
                Button(bridge.handRaised ? "Lower Hand" : "Raise Hand") { bridge.toggleHand() }
                Button(bridge.tileView ? "Switch to Speaker View" : "Switch to Tile View") { bridge.toggleTileView() }
                Button(bridge.audioOnly ? "Disable Audio-Only" : "Enable Audio-Only") { bridge.toggleAudioOnly() }
                Button(bridge.carMode ? "Exit Car Mode" : "Enter Car Mode") { bridge.toggleCarMode() }
            }

            Section("Breakout Rooms") {
                if bridge.snapshot.isModerator {
                    HStack {
                        TextField("New breakout room", text: $breakoutName).textFieldStyle(.roundedBorder)
                        Button("Create") {
                            guard !breakoutName.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                            bridge.createBreakout(name: breakoutName)
                            breakoutName = ""
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                Button("Main Room") { bridge.moveBreakout(breakoutId: nil) }
                ForEach(bridge.snapshot.breakouts, id: \.id) { b in
                    Button("Join \(b.name)") { bridge.moveBreakout(breakoutId: b.id) }
                }
            }

            if bridge.snapshot.isModerator {
                Section("Security & E2EE") {
                    Button(bridge.snapshot.security.lobbyEnabled ? "Disable Lobby" : "Enable Lobby") {
                        bridge.updateSecurity(lobbyEnabled: !bridge.snapshot.security.lobbyEnabled)
                    }
                    HStack {
                        SecureField("Room password", text: $roomPassword).textFieldStyle(.roundedBorder)
                        Button("Lock") {
                            bridge.updateSecurity(locked: true, password: roomPassword)
                            roomPassword = ""
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    if bridge.snapshot.security.hasPassword {
                        Button("Clear Room Password", role: .destructive) {
                            bridge.updateSecurity(locked: false, clearPassword: true)
                        }
                    }
                    HStack {
                        SecureField("E2EE passphrase", text: $e2eePassphrase).textFieldStyle(.roundedBorder)
                        Button("Enable E2EE") {
                            if bridge.deriveE2eeKey(passphrase: e2eePassphrase) != nil {
                                bridge.updateSecurity(e2eeEnabled: true)
                            }
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }

            Section("Speaker Stats") {
                ForEach(bridge.snapshot.participants, id: \.id) { peer in
                    HStack {
                        Text(peer.displayName)
                        Spacer()
                        Text("\(peer.speakingMs / 1000)s").foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}
