import SwiftUI

struct ChatSheet: View {
    @ObservedObject var bridge: NovaClientBridge
    @State private var draft = ""
    @State private var dmRecipientId: String?
    @State private var pollQuestion = ""
    @State private var pollOptA = "Yes"
    @State private var pollOptB = "No"

    var body: some View {
        VStack(spacing: 12) {
            Text("Chat & Polls").font(.headline).padding(.top)
            List {
                Section("Messages (\(bridge.snapshot.messages.count))") {
                    ForEach(bridge.snapshot.messages, id: \.id) { msg in
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(msg.senderName).font(.caption.bold())
                                if msg.recipientId != nil {
                                    Text("DM").font(.caption2).foregroundStyle(.orange)
                                }
                            }
                            Text(msg.body).font(.body)
                        }
                    }
                }
                Section("Polls (\(bridge.snapshot.polls.count))") {
                    VStack(alignment: .leading, spacing: 6) {
                        TextField("New poll question...", text: $pollQuestion).textFieldStyle(.roundedBorder)
                        HStack {
                            TextField("Option 1", text: $pollOptA).textFieldStyle(.roundedBorder)
                            TextField("Option 2", text: $pollOptB).textFieldStyle(.roundedBorder)
                        }
                        Button("Create Poll") {
                            bridge.createPoll(question: pollQuestion, options: [pollOptA, pollOptB])
                            pollQuestion = ""
                        }
                        .buttonStyle(.borderedProminent)
                    }

                    ForEach(bridge.snapshot.polls, id: \.id) { poll in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(poll.question).font(.subheadline.bold())
                            ForEach(Array(poll.options.enumerated()), id: \.offset) { idx, opt in
                                Button("\(opt.text) — \(opt.voteCount) votes") {
                                    bridge.votePoll(pollId: poll.id, optionIndex: UInt32(idx))
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                }
            }
            HStack {
                Picker("To", selection: $dmRecipientId) {
                    Text("Everyone").tag(String?.none)
                    ForEach(bridge.snapshot.participants.filter { $0.id != bridge.snapshot.selfId }, id: \.id) { p in
                        Text("DM: \(p.displayName)").tag(Optional(p.id))
                    }
                }
                .labelsHidden()

                TextField("Message...", text: $draft).textFieldStyle(.roundedBorder)
                Button("Send") {
                    guard !draft.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    bridge.sendChat(draft, recipientId: dmRecipientId)
                    draft = ""
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
    }
}
