import SwiftData
import Foundation

/// Repository over SwiftData for saved albums. Kept as a small typed
/// wrapper so view models never touch `ModelContext`/`FetchDescriptor`
/// directly.
@MainActor
final class AlbumStore: ObservableObject {
    private let context: ModelContext
    @Published private(set) var savedAlbums: [Album] = []

    init(context: ModelContext) {
        self.context = context
        reload()
    }

    func reload() {
        let descriptor = FetchDescriptor<StoredAlbum>(sortBy: [SortDescriptor(\.updatedAt, order: .reverse)])
        let stored = (try? context.fetch(descriptor)) ?? []
        savedAlbums = stored.compactMap { $0.toAlbum() }
    }

    func save(_ album: Album) {
        let descriptor = FetchDescriptor<StoredAlbum>(predicate: #Predicate { $0.id == album.id })
        if let existing = try? context.fetch(descriptor).first {
            existing.updateContent(from: album)
        } else {
            context.insert(StoredAlbum(album: album))
        }
        try? context.save()
        reload()
    }

    func delete(albumID: UUID) {
        let descriptor = FetchDescriptor<StoredAlbum>(predicate: #Predicate { $0.id == albumID })
        if let existing = try? context.fetch(descriptor).first {
            context.delete(existing)
            try? context.save()
        }
        reload()
    }

    func deleteAll() {
        if let all = try? context.fetch(FetchDescriptor<StoredAlbum>()) {
            for item in all { context.delete(item) }
            try? context.save()
        }
        reload()
    }
}
