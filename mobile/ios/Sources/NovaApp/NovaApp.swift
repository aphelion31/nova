import SwiftUI

@main
struct NovaMobileApp: App {
    @StateObject private var bridge = NovaClientBridge()

    var body: some Scene {
        WindowGroup {
            if bridge.connected || bridge.snapshot.inLobby {
                RoomView(bridge: bridge)
            } else if let targetUrl = bridge.selectedRoomUrl {
                PrejoinView(bridge: bridge, initialUrl: targetUrl)
            } else {
                WelcomeView(bridge: bridge)
            }
        }
    }
}
