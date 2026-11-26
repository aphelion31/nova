import SwiftUI

struct PrejoinView: View {
    @ObservedObject var bridge: NovaClientBridge
    @State private var meetingUrl: String
    @State private var displayName: String
    @State private var password = ""

    init(bridge: NovaClientBridge, initialUrl: String) {
        self.bridge = bridge
        _meetingUrl = State(initialValue: initialUrl)
        _displayName = State(initialValue: bridge.displayName)
    }

    var body: some View {
        VStack(spacing: 18) {
            HStack {
                Button("Back") { bridge.closePrejoin() }
                    .buttonStyle(.bordered)
                Spacer()
                Text("Prejoin")
                    .font(.headline)
                Spacer()
            }

            RoundedRectangle(cornerRadius: 18)
                .fill(Color.black.opacity(0.85))
                .frame(height: 190)
                .overlay {
                    VStack(spacing: 10) {
                        Circle()
                            .fill(Color.blue.opacity(0.3))
                            .frame(width: 68, height: 68)
                            .overlay(Text(String(displayName.prefix(2)).uppercased()).font(.title2.bold()).foregroundStyle(.white))
                        Text(bridge.videoMuted ? "Camera off" : "Camera preview ready")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.75))
                    }
                }

            TextField("Meeting URL", text: $meetingUrl)
                .textFieldStyle(.roundedBorder)
            TextField("Your display name", text: $displayName)
                .textFieldStyle(.roundedBorder)
            SecureField("Room password (optional)", text: $password)
                .textFieldStyle(.roundedBorder)

            HStack(spacing: 12) {
                Button(bridge.audioMuted ? "Unmute Mic" : "Mute Mic") { bridge.toggleAudio() }
                    .buttonStyle(.bordered)
                Button(bridge.videoMuted ? "Cam On" : "Cam Off") { bridge.toggleVideo() }
                    .buttonStyle(.bordered)
            }

            if let err = bridge.errorText {
                Text(err).font(.footnote).foregroundStyle(.red)
            }

            VStack(spacing: 10) {
                Button("Join Meeting") {
                    bridge.join(
                        meetingUrl: meetingUrl,
                        displayName: displayName,
                        password: password.isEmpty ? nil : password,
                        audioOnlyMode: false
                    )
                }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity)

                Button("Join Audio-Only (Low Bandwidth)") {
                    bridge.join(
                        meetingUrl: meetingUrl,
                        displayName: displayName,
                        password: password.isEmpty ? nil : password,
                        audioOnlyMode: true
                    )
                }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)
            }
            Spacer()
        }
        .padding(20)
    }
}
