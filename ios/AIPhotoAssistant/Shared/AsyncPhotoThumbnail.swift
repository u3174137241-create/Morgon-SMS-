import SwiftUI

/// Loads a `PHAsset` thumbnail by local identifier on demand. Used
/// everywhere a photo grid needs to show real library images without every
/// call site re-implementing PhotoKit loading + cancellation.
struct AsyncPhotoThumbnail: View {
    let photoID: String
    var targetSize: CGSize = CGSize(width: 300, height: 300)
    var contentMode: ContentMode = .fill

    @State private var image: UIImage?

    var body: some View {
        ZStack {
            Rectangle().fill(Color(.tertiarySystemFill))
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
            }
        }
        .clipped()
        .task(id: photoID) {
            image = nil
            guard let asset = PhotoLibraryService.shared.asset(for: photoID) else { return }
            image = await PhotoLibraryService.shared.thumbnail(for: asset, targetSize: targetSize)
        }
    }
}
