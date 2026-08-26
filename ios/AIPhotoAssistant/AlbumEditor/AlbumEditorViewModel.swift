import Foundation
import PhotosUI

@MainActor
final class AlbumEditorViewModel: ObservableObject {
    @Published var album: Album
    @Published var isBusy = false
    @Published var statusMessage: String?
    @Published var addedPhotoItems: [PhotosPickerItem] = [] {
        didSet { Task { await ingestAddedPhotos() } }
    }

    private let intentParser: IntentParsing = RuleBasedIntentParser()
    private let onSave: (Album) -> Void

    init(album: Album, onSave: @escaping (Album) -> Void) {
        self.album = album
        self.onSave = onSave
    }

    private func persist() {
        onSave(album)
    }

    func setTitle(_ title: String) {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        album.title = title
        persist()
    }

    func removePhoto(_ id: String) {
        album.sections = album.sections.map { AlbumSection(id: $0.id, title: $0.title, photoIDs: $0.photoIDs.filter { $0 != id }) }
            .filter { !$0.photoIDs.isEmpty || album.sections.count == 1 }
        if album.coverPhotoID == id, let newCover = album.photoIDs.first {
            album.coverPhotoID = newCover
        }
        persist()
    }

    func setCover(_ id: String) {
        album.coverPhotoID = id
        persist()
    }

    func move(from source: IndexSet, to destination: Int) {
        var flat = album.photoIDs
        flat.move(fromOffsets: source, toOffset: destination)
        album.sections = [AlbumSection(photoIDs: flat)]
        persist()
    }

    func applyStyle(_ style: AlbumStyle) {
        album.style = style
        persist()
    }

    private func ingestAddedPhotos() async {
        let ids = addedPhotoItems.compactMap(\.itemIdentifier).filter { !album.photoIDs.contains($0) }
        guard !ids.isEmpty else { return }
        if var last = album.sections.last {
            last.photoIDs.append(contentsOf: ids)
            album.sections[album.sections.count - 1] = last
        } else {
            album.sections = [AlbumSection(photoIDs: ids)]
        }
        addedPhotoItems = []
        statusMessage = "\(ids.count) bild(er) tillagda."
        persist()
    }

    /// Lets the user type a free-text tweak ("Gör det mer lyxigt.") directly
    /// in the editor, reusing the same on-device intent parser the chat uses.
    func applyChatCommand(_ text: String) async {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isBusy = true
        defer { isBusy = false }
        let intent = await intentParser.parse(text, hasActiveAlbum: true)

        switch intent.action {
        case .changeStyle(let style):
            await regenerate(overrideStyle: style)
        case .styleAdjustment(let adjustment):
            await regenerate(overrideStyle: adjustment.nudgedStyle)
        case .changeCount(let count):
            await regenerate(overrideStyle: nil, overrideCount: count)
        case .regenerateAlbum:
            await regenerate(overrideStyle: nil)
        case .changeCover:
            if album.photoIDs.count > 1, let idx = album.photoIDs.firstIndex(of: album.coverPhotoID) {
                setCover(album.photoIDs[(idx + 1) % album.photoIDs.count])
            }
        case .changeTitle(let title):
            setTitle(title)
        case .removeWorstPhotos(let count):
            await removeWorst(count: count)
        default:
            statusMessage = "Jag kunde inte tolka det som en albumändring."
        }
    }

    private func regenerate(overrideStyle: AlbumStyle?, overrideCount: Int? = nil) async {
        let outcome = await AlbumGenerator.regenerate(previous: album, overrideStyle: overrideStyle, overrideCount: overrideCount)
        guard let newAlbum = outcome.album else {
            statusMessage = "Kunde inte skapa om albumet."
            return
        }
        album = newAlbum
        persist()
    }

    private func removeWorst(count: Int) async {
        guard album.photoCount > count else { return }
        let assets = PhotoLibraryService.shared.assets(for: album.photoIDs)
        var scored: [(id: String, score: Double)] = []
        for asset in assets {
            guard let thumbnail = await PhotoLibraryService.shared.thumbnail(for: asset) else { continue }
            let q = PhotoQualityAnalyzer.analyze(thumbnail)
            scored.append((asset.localIdentifier, q.sharpness * 0.6 + q.exposure * 0.4))
        }
        let worst = Set(scored.sorted { $0.score < $1.score }.prefix(count).map(\.id))
        album.sections = album.sections.map { AlbumSection(id: $0.id, title: $0.title, photoIDs: $0.photoIDs.filter { !worst.contains($0) }) }
        persist()
    }
}
