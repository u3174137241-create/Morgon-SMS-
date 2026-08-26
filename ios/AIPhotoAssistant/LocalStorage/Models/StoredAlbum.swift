import Foundation
import SwiftData

/// Persisted form of a generated `Album`. Only references
/// (`PHAsset.localIdentifier`s) and the album's own text/style are stored —
/// never image bytes — so this stays small and never duplicates the user's
/// photo library on disk.
@Model
final class StoredAlbum {
    @Attribute(.unique) var id: UUID
    var title: String
    var subtitle: String
    var styleRaw: String
    var coverPhotoID: String
    var createdAt: Date
    var updatedAt: Date
    var sectionsData: Data
    var filtersData: Data?

    init(
        id: UUID, title: String, subtitle: String, styleRaw: String,
        coverPhotoID: String, createdAt: Date, updatedAt: Date,
        sectionsData: Data, filtersData: Data?
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.styleRaw = styleRaw
        self.coverPhotoID = coverPhotoID
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.sectionsData = sectionsData
        self.filtersData = filtersData
    }
}

extension StoredAlbum {
    convenience init(album: Album) {
        let sections = (try? JSONEncoder().encode(album.sections)) ?? Data()
        let filters = try? JSONEncoder().encode(album.sourceFilters)
        self.init(
            id: album.id, title: album.title, subtitle: album.subtitle,
            styleRaw: album.style.rawValue, coverPhotoID: album.coverPhotoID,
            createdAt: album.createdAt, updatedAt: Date(),
            sectionsData: sections, filtersData: filters
        )
    }

    func updateContent(from album: Album) {
        title = album.title
        subtitle = album.subtitle
        styleRaw = album.style.rawValue
        coverPhotoID = album.coverPhotoID
        sectionsData = (try? JSONEncoder().encode(album.sections)) ?? sectionsData
        filtersData = try? JSONEncoder().encode(album.sourceFilters)
        updatedAt = Date()
    }

    func toAlbum() -> Album? {
        guard let sections = try? JSONDecoder().decode([AlbumSection].self, from: sectionsData),
              let style = AlbumStyle(rawValue: styleRaw) else { return nil }
        let filters = filtersData.flatMap { try? JSONDecoder().decode(PhotoFilters.self, from: $0) } ?? PhotoFilters()
        return Album(
            id: id, title: title, subtitle: subtitle, style: style,
            coverPhotoID: coverPhotoID, sections: sections, createdAt: createdAt,
            sourceFilters: filters
        )
    }
}
