import SwiftUI
import PhotosUI

struct ChatView: View {
    @ObservedObject var viewModel: ChatViewModel
    @State private var editingAlbum: Album?
    @State private var showSettings = false
    @FocusState private var inputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                messageList
                if viewModel.isProcessing {
                    ProgressPipelineView(stage: viewModel.pipelineStage)
                        .padding(.bottom, Theme.Spacing.sm)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
                inputBar
            }
            .background(Theme.Color.background.ignoresSafeArea())
            .navigationTitle("AI Photo Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    NavigationLink {
                        SavedAlbumsView(albumStore: viewModel.albumStore) { album in
                            editingAlbum = album
                        }
                    } label: {
                        Image(systemName: "photo.stack")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(authManager: viewModel.authManager, albumStore: viewModel.albumStore)
            }
            .navigationDestination(item: $editingAlbum) { album in
                AlbumEditorView(album: album, albumStore: viewModel.albumStore) { updated in
                    viewModel.activeAlbum = updated
                    viewModel.albumStore.save(updated)
                }
            }
        }
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                    ForEach(viewModel.messages) { message in
                        MessageBubbleView(message: message) { album in
                            editingAlbum = album
                        } onTapStyleChip: { style in
                            await viewModel.tapStyleChip(style)
                        }
                        .id(message.id)
                    }
                }
                .padding(Theme.Spacing.md)
            }
            .onChange(of: viewModel.messages.count) {
                if let last = viewModel.messages.last {
                    withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }
        }
    }

    private var inputBar: some View {
        VStack(spacing: 0) {
            if let album = viewModel.activeAlbum {
                Button {
                    editingAlbum = album
                } label: {
                    HStack {
                        Image(systemName: "photo.stack")
                        Text("Redigera \"\(album.title)\"")
                            .lineLimit(1)
                        Spacer()
                        Image(systemName: "chevron.right")
                    }
                    .font(Theme.Font.caption)
                    .foregroundStyle(Theme.Color.subtleText)
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.vertical, 6)
                }
                .buttonStyle(.plain)
            }
            Divider()
            HStack(alignment: .bottom, spacing: Theme.Spacing.sm) {
                PhotosPicker(selection: $viewModel.pickedPhotoItems, matching: .images, photoLibrary: .shared()) {
                    Image(systemName: "photo.on.rectangle")
                        .font(.system(size: 20))
                        .foregroundStyle(Theme.Color.accent)
                }
                .frame(width: 32, height: 32)

                TextField("Skriv vad du letar efter…", text: $viewModel.inputText, axis: .vertical)
                    .lineLimit(1...4)
                    .focused($inputFocused)
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.vertical, 10)
                    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Theme.Color.surface))

                Button {
                    inputFocused = false
                    Task { await viewModel.send() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 30))
                        .foregroundStyle(viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty ? Theme.Color.subtleText : Theme.Color.accent)
                }
                .disabled(viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isProcessing)
            }
            .padding(Theme.Spacing.md)
        }
        .background(.thinMaterial)
    }
}
