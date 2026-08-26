import CoreLocation
import Foundation

/// Metadata we can read straight from PHAsset without decoding pixels.
/// This is intentionally cheap — it's what lets us filter a 20,000-photo
/// library down to a few hundred candidates before any Vision analysis runs.
struct PhotoMetadata: Identifiable, Sendable {
    let id: String // PHAsset.localIdentifier
    let creationDate: Date?
    let location: CLLocation?
    let pixelWidth: Int
    let pixelHeight: Int
    let isScreenshot: Bool
    let isFavorite: Bool
    let duration: TimeInterval // 0 for stills
    let sourceType: PhotoSourceType

    var aspectRatio: Double {
        guard pixelHeight > 0 else { return 1 }
        return Double(pixelWidth) / Double(pixelHeight)
    }
}

enum PhotoSourceType: Sendable {
    case camera
    case screenshot
    case imported
    case unknown
}
