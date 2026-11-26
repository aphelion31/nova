import SwiftUI

struct WelcomeView: View {
    @ObservedObject var bridge: NovaClientBridge
    @State private var roomInput = ""
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Nova Meet")
                            .font(.largeTitle.bold())
                        Text("Native SwiftUI + Rust UniFFI")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Settings") { showSettings = true }
                        .buttonStyle(.bordered)
                }

                VStack(spacing: 12) {
                    TextField("Enter room name or URL", text: $roomInput)
                        .textFieldStyle(.roundedBorder)

                    HStack(spacing: 10) {
                        Button("Random") {
                            roomInput = NovaClientBridge.randomRoomSlug()
                        }
                        .buttonStyle(.bordered)

                        Button("Continue") {
                            bridge.openPrejoin(roomOrUrl: roomInput)
                        }
                        .buttonStyle(.borderedProminent)
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 16))

                VStack(alignment: .leading, spacing: 10) {
                    Text("Recent Meetings")
                        .font(.headline)
                    if bridge.recentMeetings.isEmpty {
                        Text("No recent rooms yet. Start or join a room above.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 12)
                    } else {
                        List(bridge.recentMeetings) { item in
                            Button {
                                bridge.openPrejoin(roomOrUrl: item.url)
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.room).font(.headline)
                                        Text(item.url).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                                    }
                                    Spacer()
                                    Text("Rejoin")
                                        .font(.caption.bold())
                                        .foregroundStyle(.blue)
                                }
                            }
                        }
                        .listStyle(.plain)
                    }
                }

                Spacer()
            }
            .padding(20)
            .sheet(isPresented: $showSettings) {
                SettingsSheet(bridge: bridge)
            }
        }
    }
}
