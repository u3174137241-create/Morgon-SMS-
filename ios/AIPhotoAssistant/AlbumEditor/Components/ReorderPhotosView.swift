import SwiftUI

struct ReorderPhotosView: View {
    @ObservedObject var viewModel: AlbumEditorViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.album.photoIDs, id: \.self) { id in
                    HStack(spacing: Theme.Spacing.md) {
                        AsyncPhotoThumbnail(photoID: id, targetSize: CGSize(width: 120, height: 120))
                            .frame(width: 48, height: 48)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        if id == viewModel.album.coverPhotoID {
                            Text("Omslag")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Theme.Color.accent)
                        }
                        Spacer()
                        Image(systemName: "line.3.horizontal")
                            .foregroundStyle(Theme.Color.subtleText)
                    }
                }
                .onMove(perform: viewModel.move)
            }
            .environment(\.editMode, .constant(.active))
            .navigationTitle("Ordna bilder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Klar") { dismiss() }
                }
            }
        }
    }
}
