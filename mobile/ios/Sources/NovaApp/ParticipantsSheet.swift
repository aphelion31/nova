import SwiftUI

struct ParticipantsSheet: View {
    @ObservedObject var bridge: NovaClientBridge

    var body: some View {
        List {
            if bridge.snapshot.isModerator && !bridge.snapshot.lobby.isEmpty {
                Section("Lobby Queue (\(bridge.snapshot.lobby.count))") {
                    ForEach(bridge.snapshot.lobby, id: \.peerId) { entry in
                        HStack {
                            Text(entry.displayName)
                            Spacer()
                            Button("Admit") { bridge.admitLobby(peerId: entry.peerId, admit: true) }
                                .buttonStyle(.borderedProminent)
                            Button("Decline") { bridge.admitLobby(peerId: entry.peerId, admit: false) }
                                .buttonStyle(.bordered)
                        }
                    }
                }
            }
            Section("Participants (\(bridge.snapshot.participants.count))") {
                ForEach(bridge.snapshot.participants, id: \.id) { peer in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(peer.displayName)
                            if peer.isModerator {
                                Text("Host").font(.caption2).foregroundStyle(.orange)
                            }
                        }
                        Spacer()
                        if bridge.snapshot.isModerator && peer.id != bridge.snapshot.selfId {
                            Button("Mute") { bridge.moderate(targetId: peer.id, action: "mute_audio") }
                                .buttonStyle(.bordered)
                            Button("Kick", role: .destructive) { bridge.moderate(targetId: peer.id, action: "kick") }
                                .buttonStyle(.bordered)
                        }
                    }
                }
            }
        }
    }
}
