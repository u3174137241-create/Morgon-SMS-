import Photos
import UIKit

/// All export paths operate on the user's *existing* originals by
/// reference (Photos album) or by rendering new, separate output
/// (PDF/collage images) — originals are never edited, moved, or deleted.
enum ExportService {
    /// Creates a new album in the Photos app containing the (unmodified)
    /// originals selected for this generated album.
    static func saveToPhotos(_ album: Album) async throws -> String {
        let assets = PhotoLibraryService.shared.assets(for: album.photoIDs)
        guard !assets.isEmpty else { throw ExportError.noPhotos }
        return try await PhotoLibraryService.shared.createAlbum(named: album.title, with: assets)
    }

    static func renderPDF(for album: Album) async -> Data? {
        let images = await loadFullImages(for: album.photoIDs, cap: 120)
        return AlbumPDFRenderer.render(album: album, images: images)
    }

    /// One flattened page image per section, suitable for exporting as
    /// individual image files.
    static func renderPageImages(for album: Album) async -> [UIImage] {
        let images = await loadFullImages(for: album.photoIDs, cap: 120)
        return AlbumPDFRenderer.renderPageImages(album: album, images: images)
    }

    private static func loadFullImages(for photoIDs: [String], cap: Int) async -> [String: UIImage] {
        let ids = Array(photoIDs.prefix(cap))
        let assets = PhotoLibraryService.shared.assets(for: ids)
        var result: [String: UIImage] = [:]
        for asset in assets {
            if let image = await PhotoLibraryService.shared.thumbnail(for: asset, targetSize: CGSize(width: 1200, height: 1200)) {
                result[asset.localIdentifier] = image
            }
        }
        return result
    }
}

enum ExportError: LocalizedError {
    case noPhotos
    var errorDescription: String? {
        switch self {
        case .noPhotos: return "Albumet innehåller inga bilder att exportera."
        }
    }
}
