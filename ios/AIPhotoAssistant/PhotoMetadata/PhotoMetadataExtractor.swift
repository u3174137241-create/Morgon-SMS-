import Photos

enum PhotoMetadataExtractor {
    static func extract(from asset: PHAsset) -> PhotoMetadata {
        let subtypes = asset.mediaSubtypes
        let isScreenshot = subtypes.contains(.photoScreenshot)

        let sourceType: PhotoSourceType
        if isScreenshot {
            sourceType = .screenshot
        } else if subtypes.contains(.photoLive) || asset.sourceType.contains(.typeUserLibrary) {
            sourceType = .camera
        } else if asset.sourceType.contains(.typeCloudShared) || asset.sourceType.contains(.typeiTunesSynced) {
            sourceType = .imported
        } else {
            sourceType = .unknown
        }

        return PhotoMetadata(
            id: asset.localIdentifier,
            creationDate: asset.creationDate,
            location: asset.location,
            pixelWidth: asset.pixelWidth,
            pixelHeight: asset.pixelHeight,
            isScreenshot: isScreenshot,
            isFavorite: asset.isFavorite,
            duration: asset.duration,
            sourceType: sourceType
        )
    }

    static func extract(from assets: [PHAsset]) -> [PhotoMetadata] {
        assets.map(extract(from:))
    }
}
