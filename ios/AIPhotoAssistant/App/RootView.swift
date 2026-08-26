import SwiftUI
import SwiftData

struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @StateObject private var authManager = PhotoAuthorizationManager()
    @State private var albumStore: AlbumStore?
    @State private var chatViewModel: ChatViewModel?
    @State private var showWelcome: Bool

    init() {
        _showWelcome = State(initialValue: PHAuthorizationStatusSnapshot.isNotDetermined)
    }

    var body: some View {
        Group {
            if showWelcome {
                WelcomeView {
                    _ = await authManager.requestAccessIfNeeded()
                    showWelcome = false
                }
            } else if let chatViewModel {
                ChatView(viewModel: chatViewModel)
            } else {
                ProgressView()
            }
        }
        .task { setUp() }
    }

    private func setUp() {
        guard albumStore == nil else { return }
        let store = AlbumStore(context: modelContext)
        albumStore = store
        chatViewModel = ChatViewModel(authManager: authManager, albumStore: store)
    }
}

private enum PHAuthorizationStatusSnapshot {
    static var isNotDetermined: Bool {
        PhotoAuthorizationManager.currentStatusIsNotDetermined()
    }
}
