import Foundation

/// In-memory album while it's being built/edited. `LocalStorage` maps this
/// to/from its SwiftData-backed persisted form when the user saves it.
struct Album: Identifiable, Sendable, Equatable, Hashable {
    let id: UUID
    var title: String
    var subtitle: String
    var style: AlbumStyle
    var coverPhotoID: String
    var sections: [AlbumSection]
    var createdAt: Date
    /// The filters/context that produced this album, kept so "gör om
    /// albumet" or a style nudge can regenerate without the user repeating
    /// the whole request.
    var sourceFilters: PhotoFilters

    var photoIDs: [String] { sections.flatMap(\.photoIDs) }
    var photoCount: Int { photoIDs.count }

    static func == (lhs: Album, rhs: Album) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct AlbumSection: Identifiable, Sendable, Equatable, Codable {
    let id: UUID
    var title: String?
    var photoIDs: [String]

    init(id: UUID = UUID(), title: String? = nil, photoIDs: [String]) {
        self.id = id
        self.title = title
        self.photoIDs = photoIDs
    }
}
