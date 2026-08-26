import SwiftUI
import Photos

struct SettingsView: View {
    @ObservedObject var authManager: PhotoAuthorizationManager
    @ObservedObject var albumStore: AlbumStore
    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirmation = false

    var body: some View {
        NavigationStack {
            List {
                Section("Behörighet") {
                    HStack {
                        Text("Bildbibliotek")
                        Spacer()
                        Text(statusLabel)
                            .foregroundStyle(Theme.Color.subtleText)
                    }
                    if authManager.isDenied {
                        Button("Öppna Inställningar") {
                            if let url = URL(string: UIApplication.openSettingsURLString) {
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                }

                Section("Sparade album") {
                    HStack {
                        Text("Album i appen")
                        Spacer()
                        Text("\(albumStore.savedAlbums.count)")
                            .foregroundStyle(Theme.Color.subtleText)
                    }
                    Button("Ta bort alla sparade album", role: .destructive) {
                        showDeleteConfirmation = true
                    }
                }

                Section {
                    NavigationLink("Om integritet") { PrivacyView() }
                } header: {
                    Text("Integritet")
                }

                Section("Om") {
                    HStack {
                        Text("AI Photo Assistant")
                        Spacer()
                        Text(Bundle.main.appVersion)
                            .foregroundStyle(Theme.Color.subtleText)
                    }
                }
            }
            .navigationTitle("Inställningar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Klar") { dismiss() } }
            }
            .confirmationDialog("Ta bort alla sparade album?", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
                Button("Ta bort allt", role: .destructive) { albumStore.deleteAll() }
                Button("Avbryt", role: .cancel) {}
            } message: {
                Text("Dina originalbilder påverkas inte — bara albumen som skapats i appen tas bort.")
            }
        }
    }

    private var statusLabel: String {
        switch authManager.status {
        case .authorized: return "Full åtkomst"
        case .limited: return "Begränsad åtkomst"
        case .denied: return "Nekad"
        case .restricted: return "Begränsad av systemet"
        case .notDetermined: return "Ej begärd"
        @unknown default: return "Okänd"
        }
    }
}

private extension Bundle {
    var appVersion: String {
        let version = infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        return "v\(version)"
    }
}
