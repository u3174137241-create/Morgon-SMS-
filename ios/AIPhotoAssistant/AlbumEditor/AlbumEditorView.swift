import SwiftUI
import PhotosUI

struct AlbumEditorView: View {
    @StateObject private var viewModel: AlbumEditorViewModel
    @State private var showReorder = false
    @State private var showExport = false
    @State private var showTitleEditor = false
    @State private var editedTitle = ""
    @State private var commandText = ""

    private let gridColumns = [GridItem(.adaptive(minimum: 100), spacing: 4)]

    init(album: Album, onSave: @escaping (Album) -> Void) {
        _viewModel = StateObject(wrappedValue: AlbumEditorViewModel(album: album, onSave: onSave))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                header
                styleRow
                photoGrid
                commandBar
            }
            .padding(.bottom, Theme.Spacing.xl)
        }
        .navigationTitle("Album")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { showReorder = true } label: { Label("Ordna om", systemImage: "arrow.up.arrow.down") }
                    Button { editedTitle = viewModel.album.title; showTitleEditor = true } label: { Label("Byt titel", systemImage: "textformat") }
                    PhotosPicker(selection: $viewModel.addedPhotoItems, matching: .images, photoLibrary: .shared()) {
                        Label("Lägg till bilder", systemImage: "plus.rectangle.on.folder")
                    }
                    Button { showExport = true } label: { Label("Exportera", systemImage: "square.and.arrow.up") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showReorder) { ReorderPhotosView(viewModel: viewModel) }
        .sheet(isPresented: $showExport) { ExportSheet(album: viewModel.album) }
        .alert("Byt titel", isPresented: $showTitleEditor) {
            TextField("Titel", text: $editedTitle)
            Button("Avbryt", role: .cancel) {}
            Button("Spara") { viewModel.setTitle(editedTitle) }
        }
        .overlay {
            if viewModel.isBusy {
                ProgressView("Uppdaterar album…").padding().background(.thinMaterial).clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var header: some View {
        ZStack(alignment: .bottomLeading) {
            AsyncPhotoThumbnail(photoID: viewModel.album.coverPhotoID, targetSize: CGSize(width: 900, height: 700))
                .frame(height: 260)
            Rectangle()
                .fill(LinearGradient(colors: [.black.opacity(0.7), .clear], startPoint: .bottom, endPoint: .center))
                .frame(height: 260)
            VStack(alignment: .leading, spacing: 4) {
                Text(viewModel.album.title)
                    .font(.system(.largeTitle, design: .serif, weight: .bold))
                    .foregroundStyle(.white)
                Text("\(viewModel.album.subtitle.isEmpty ? "" : viewModel.album.subtitle + " · ")\(viewModel.album.photoCount) bilder")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.85))
            }
            .padding(Theme.Spacing.md)
        }
        .frame(height: 260)
    }

    private var styleRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.sm) {
                ForEach(AlbumStyle.allCases, id: \.self) { style in
                    Button {
                        viewModel.applyStyle(style)
                    } label: {
                        Text(style.displayName)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(style == viewModel.album.style ? Theme.Color.accent : Theme.Color.surface))
                            .foregroundStyle(style == viewModel.album.style ? .white : .primary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, Theme.Spacing.md)
        }
    }

    private var photoGrid: some View {
        LazyVGrid(columns: gridColumns, spacing: 4) {
            ForEach(viewModel.album.photoIDs, id: \.self) { id in
                AsyncPhotoThumbnail(photoID: id, targetSize: CGSize(width: 220, height: 220))
                    .aspectRatio(1, contentMode: .fill)
                    .overlay(alignment: .topTrailing) {
                        if id == viewModel.album.coverPhotoID {
                            Image(systemName: "star.fill")
                                .font(.caption)
                                .foregroundStyle(.yellow)
                                .padding(4)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    .contextMenu {
                        Button { viewModel.setCover(id) } label: { Label("Gör till omslag", systemImage: "star") }
                        Button(role: .destructive) { viewModel.removePhoto(id) } label: { Label("Ta bort", systemImage: "trash") }
                    }
            }
        }
        .padding(.horizontal, Theme.Spacing.sm)
    }

    private var commandBar: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Be AI:n ändra albumet")
                .font(Theme.Font.headline)
                .padding(.horizontal, Theme.Spacing.md)
            HStack {
                TextField("T.ex. \"Gör det mer lyxigt\"", text: $commandText)
                    .textFieldStyle(.roundedBorder)
                Button("Skicka") {
                    let text = commandText
                    commandText = ""
                    Task { await viewModel.applyChatCommand(text) }
                }
                .disabled(commandText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, Theme.Spacing.md)
            if let status = viewModel.statusMessage {
                Text(status)
                    .font(.caption)
                    .foregroundStyle(Theme.Color.subtleText)
                    .padding(.horizontal, Theme.Spacing.md)
            }
        }
    }
}
