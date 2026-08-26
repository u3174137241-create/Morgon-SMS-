import SwiftUI

struct SavedAlbumsView: View {
    @ObservedObject var albumStore: AlbumStore
    var onSelect: (Album) -> Void

    var body: some View {
        Group {
            if albumStore.savedAlbums.isEmpty {
                ContentUnavailableView("Inga sparade album ännu", systemImage: "photo.stack", description: Text("Album du skapar i chatten sparas här automatiskt."))
            } else {
                List {
                    ForEach(albumStore.savedAlbums) { album in
                        Button {
                            onSelect(album)
                        } label: {
                            HStack(spacing: Theme.Spacing.md) {
                                AsyncPhotoThumbnail(photoID: album.coverPhotoID, targetSize: CGSize(width: 160, height: 160))
                                    .frame(width: 56, height: 56)
                                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                VStack(alignment: .leading) {
                                    Text(album.title).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                                    Text("\(album.photoCount) bilder").font(.caption).foregroundStyle(Theme.Color.subtleText)
                                }
                            }
                        }
                        .swipeActions {
                            Button(role: .destructive) { albumStore.delete(albumID: album.id) } label: { Label("Ta bort", systemImage: "trash") }
                        }
                    }
                }
            }
        }
        .navigationTitle("Mina album")
        .navigationBarTitleDisplayMode(.inline)
    }
}
