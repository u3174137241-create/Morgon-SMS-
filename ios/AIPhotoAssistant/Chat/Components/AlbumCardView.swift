import SwiftUI

struct AlbumCardView: View {
    let album: Album
    var onTap: () -> Void

    private var template: AlbumStyleTemplate { .template(for: album.style) }

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .bottomLeading) {
                AsyncPhotoThumbnail(photoID: album.coverPhotoID, targetSize: CGSize(width: 600, height: 400))
                    .frame(height: 160)
                Rectangle()
                    .fill(LinearGradient(colors: [.black.opacity(0.65), .clear], startPoint: .bottom, endPoint: .center))
                    .frame(height: 160)
                VStack(alignment: .leading, spacing: 2) {
                    Text(album.title)
                        .font(.system(.headline, design: .serif, weight: .semibold))
                        .foregroundStyle(.white)
                    Text("\(album.subtitle.isEmpty ? "" : album.subtitle + " · ")\(album.photoCount) bilder")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.85))
                }
                .padding(Theme.Spacing.md)
            }
            .frame(height: 160)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
