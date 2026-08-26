import Photos
import UIKit

/// Thin wrapper around PhotoKit for fetching assets and loading images.
/// This is the only module allowed to talk to `PHAsset`/`PHImageManager`
/// directly — everything else works with `PhotoMetadata`/`UIImage`.
/// `PHCachingImageManager`'s request methods are documented as thread-safe,
/// so it's safe to share one instance across the concurrent analysis tasks
/// in `PhotoAnalysisPipeline`.
final class PhotoLibraryService: @unchecked Sendable {
    static let shared = PhotoLibraryService()

    private let imageManager = PHCachingImageManager()

    /// Fetches every asset in the library, newest first. Callers should
    /// filter down (by date/location/etc.) before doing any heavy analysis —
    /// we never want to run Vision over the entire library for a narrow request.
    func fetchAllAssets() -> [PHAsset] {
        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        options.includeHiddenAssets = false
        let result = PHAsset.fetchAssets(with: .image, options: options)
        var assets: [PHAsset] = []
        assets.reserveCapacity(result.count)
        result.enumerateObjects { asset, _, _ in assets.append(asset) }
        return assets
    }

    func asset(for localIdentifier: String) -> PHAsset? {
        PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil).firstObject
    }

    func assets(for localIdentifiers: [String]) -> [PHAsset] {
        guard !localIdentifiers.isEmpty else { return [] }
        let result = PHAsset.fetchAssets(withLocalIdentifiers: localIdentifiers, options: nil)
        var byId: [String: PHAsset] = [:]
        result.enumerateObjects { asset, _, _ in byId[asset.localIdentifier] = asset }
        // Preserve caller-specified ordering.
        return localIdentifiers.compactMap { byId[$0] }
    }

    /// Fast, low-res thumbnail suitable for grids and Vision analysis (which
    /// doesn't benefit from full resolution and is far cheaper this way).
    func thumbnail(for asset: PHAsset, targetSize: CGSize = CGSize(width: 300, height: 300)) async -> UIImage? {
        await withCheckedContinuation { continuation in
            let options = PHImageRequestOptions()
            options.deliveryMode = .highQualityFormat
            options.resizeMode = .fast
            options.isNetworkAccessAllowed = true
            options.isSynchronous = false
            imageManager.requestImage(
                for: asset,
                targetSize: targetSize,
                contentMode: .aspectFill,
                options: options
            ) { image, _ in
                continuation.resume(returning: image)
            }
        }
    }

    /// Full-resolution image for export/PDF rendering. Network access is
    /// allowed so iCloud-only originals can be downloaded on demand.
    func fullImage(for asset: PHAsset) async -> UIImage? {
        await withCheckedContinuation { continuation in
            let options = PHImageRequestOptions()
            options.deliveryMode = .highQualityFormat
            options.resizeMode = .none
            options.isNetworkAccessAllowed = true
            options.isSynchronous = false
            imageManager.requestImage(
                for: asset,
                targetSize: PHImageManagerMaximumSize,
                contentMode: .default,
                options: options
            ) { image, _ in
                continuation.resume(returning: image)
            }
        }
    }

    func startCaching(_ assets: [PHAsset], targetSize: CGSize) {
        imageManager.startCachingImages(for: assets, targetSize: targetSize, contentMode: .aspectFill, options: nil)
    }

    func stopCachingAll() {
        imageManager.stopCachingImagesForAllAssets()
    }

    /// Creates a new user album in Photos containing the given assets.
    /// This only *references* the user's existing originals — nothing is
    /// copied, re-encoded, or removed from anywhere else.
    @discardableResult
    func createAlbum(named title: String, with assets: [PHAsset]) async throws -> String {
        var placeholder: PHObjectPlaceholder?
        try await PHPhotoLibrary.shared().performChanges {
            let request = PHAssetCollectionChangeRequest.creationRequestForAssetCollection(withTitle: title)
            placeholder = request.placeholderForCreatedAssetCollection
            request.addAssets(assets as NSArray)
        }
        guard let localIdentifier = placeholder?.localIdentifier else {
            throw PhotoLibraryError.albumCreationFailed
        }
        return localIdentifier
    }

    /// Saves a generated image (e.g. a rendered collage/cover) into Photos
    /// as a new asset, optionally inside an existing album.
    func saveImage(_ image: UIImage, toAlbumWithIdentifier albumIdentifier: String?) async throws {
        try await PHPhotoLibrary.shared().performChanges {
            let creationRequest = PHAssetChangeRequest.creationRequestForAsset(from: image)
            guard let albumIdentifier,
                  let collection = PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: [albumIdentifier], options: nil).firstObject,
                  let albumChangeRequest = PHAssetCollectionChangeRequest(for: collection),
                  let placeholder = creationRequest.placeholderForCreatedAsset else { return }
            albumChangeRequest.addAssets([placeholder] as NSArray)
        }
    }
}

enum PhotoLibraryError: LocalizedError {
    case albumCreationFailed
    case notAuthorized

    var errorDescription: String? {
        switch self {
        case .albumCreationFailed: return "Kunde inte skapa albumet i Bilder."
        case .notAuthorized: return "Åtkomst till bildbiblioteket saknas."
        }
    }
}
