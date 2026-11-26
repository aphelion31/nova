import SwiftUI

struct SettingsSheet: View {
    @ObservedObject var bridge: NovaClientBridge
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Server & Identity") {
                    TextField("Default server URL", text: $bridge.serverBaseUrl)
                    TextField("Display name", text: $bridge.displayName)
                }
                Section("Defaults") {
                    Toggle("Start with mic & camera muted", isOn: $bridge.defaultStartMuted)
                    Picker("Language", selection: $bridge.language) {
                        Text("English").tag("en")
                        Text("Bahasa Indonesia").tag("id")
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        bridge.savePrefs()
                        dismiss()
                    }
                }
            }
        }
    }
}
