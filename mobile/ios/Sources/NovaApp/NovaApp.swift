import SwiftUI

@main
struct NovaMobileApp: App {
    @StateObject private var bridge = NovaClientBridge()

    var body: some Scene {
        WindowGroup {
            Group {
                if bridge.connected || bridge.snapshot.inLobby {
                    RoomView(bridge: bridge)
                } else if let targetUrl = bridge.selectedRoomUrl {
                    PrejoinView(bridge: bridge, initialUrl: targetUrl)
                } else {
                    WelcomeView(bridge: bridge)
                }
            }
            .preferredColorScheme(.dark)
            .tint(Color(red: 0x24 / 255.0, green: 0x6F / 255.0, blue: 0xE5 / 255.0))
        }
    }
}
