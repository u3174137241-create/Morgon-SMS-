import SwiftUI
import SwiftData

@main
struct AIPhotoAssistantApp: App {
    let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(for: StoredAlbum.self)
        } catch {
            fatalError("Kunde inte skapa lokal databas för sparade album: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
    }
}
