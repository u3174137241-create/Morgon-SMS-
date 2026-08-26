import Foundation
import PhotosUI
import SwiftUI

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var inputText: String = ""
    @Published var pipelineStage: PipelineStage = .idle
    @Published var pipelineDetail: String = ""
    @Published var isProcessing = false
    @Published var activeAlbum: Album?
    @Published var albumPendingReview: Album?
    @Published var pickedPhotoItems: [PhotosPickerItem] = [] {
        didSet { Task { await ingestPickedPhotos() } }
    }
    @Published var pendingPickedPhotoIDs: [String] = []

    let authManager: PhotoAuthorizationManager
    let albumStore: AlbumStore
    private let intentParser: IntentParsing = RuleBasedIntentParser()

    init(authManager: PhotoAuthorizationManager, albumStore: AlbumStore) {
        self.authManager = authManager
        self.albumStore = albumStore
        messages = [
            ChatMessage(role: .assistant, text: "Hej! Berätta vilka bilder du letar efter, så hittar och organiserar jag dem åt dig. T.ex. \"Gör ett album av vår resa till Grekland.\"")
        ]
    }

    func send() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isProcessing else { return }
        inputText = ""
        messages.append(ChatMessage(role: .user, text: text))

        let authorized = await ensureAuthorization()
        guard authorized else { return }

        isProcessing = true
        pipelineStage = .idle
        let intent = await intentParser.parse(text, hasActiveAlbum: activeAlbum != nil)
        await handle(intent)
        isProcessing = false
    }

    func tapStyleChip(_ style: AlbumStyle) async {
        guard !isProcessing else { return }
        messages.append(ChatMessage(role: .user, text: style.displayName))
        isProcessing = true
        await regenerate(overrideStyle: style)
        isProcessing = false
    }

    // MARK: - Intent handling

    private func handle(_ intent: UserIntent) async {
        switch intent.action {
        case .createAlbum, .findPhotos:
            await runGeneration(intent: intent)
        case .regenerateAlbum:
            await regenerate(overrideStyle: nil)
        case .changeStyle(let style):
            await regenerate(overrideStyle: style)
        case .styleAdjustment(let adjustment):
            await regenerate(overrideStyle: adjustment.nudgedStyle)
        case .changeCount(let count):
            await regenerate(overrideStyle: nil, overrideCount: count)
        case .changeCover:
            cycleCover()
        case .changeTitle(let title):
            renameActiveAlbum(to: title)
        case .removeWorstPhotos(let count):
            await removeWorstPhotos(count: count)
        case .removeSelectedPhotos:
            removePickedPhotosFromActiveAlbum()
        case .addSelectedPhotos:
            addPickedPhotosToActiveAlbum()
        case .unknown:
            messages.append(ChatMessage(role: .assistant, text: "Jag är inte helt säker på vad du menar. Du kan t.ex. skriva \"Gör ett album av mina bilder från Grekland\" eller \"Hitta mina bästa bilder från sommaren\"."))
        }
    }

    private func runGeneration(intent: UserIntent) async {
        var lastStage: PipelineStage = .idle
        let outcome = await AlbumGenerator.generate(from: intent) { [weak self] stage, detail in
            Task { @MainActor in
                guard let self else { return }
                self.pipelineStage = stage
                self.pipelineDetail = detail
                if stage != lastStage {
                    lastStage = stage
                    self.appendProgressMessage(for: stage, detail: detail)
                }
            }
        }

        guard let album = outcome.album else {
            let reason = outcome.analyzedCount == 0
                ? "Jag hittade inga bilder som matchade din förfrågan. Prova att beskriva plats eller tidsperiod på ett annat sätt."
                : "Jag hittade \(outcome.analyzedCount) bilder men ingen var tillräckligt bra för ett album. Vill du att jag sänker kvalitetskraven?"
            messages.append(ChatMessage(role: .assistant, text: reason))
            return
        }

        activeAlbum = album
        albumStore.save(album)
        let summary = "Jag har valt \(outcome.selectedCount) bilder och organiserat dem i \(album.style.displayName.lowercased()) stil."
        messages.append(ChatMessage(
            role: .assistant, text: summary,
            photoPreviewIDs: Array(album.photoIDs.prefix(8)), albumSnapshot: album
        ))
        messages.append(ChatMessage(
            role: .assistant, text: "Klart! Vill du att jag gör det mer lyxigt, cinematiskt eller minimalistiskt?",
            styleChips: [.luxury, .cinematic, .minimal]
        ))
    }

    private func regenerate(overrideStyle: AlbumStyle?, overrideCount: Int? = nil) async {
        guard let current = activeAlbum else {
            messages.append(ChatMessage(role: .assistant, text: "Jag har inget album att ändra ännu — berätta först vilka bilder jag ska leta efter."))
            return
        }
        var lastStage: PipelineStage = .idle
        let outcome = await AlbumGenerator.regenerate(previous: current, overrideStyle: overrideStyle, overrideCount: overrideCount) { [weak self] stage, detail in
            Task { @MainActor in
                guard let self else { return }
                self.pipelineStage = stage
                self.pipelineDetail = detail
                if stage != lastStage {
                    lastStage = stage
                    self.appendProgressMessage(for: stage, detail: detail)
                }
            }
        }
        guard let album = outcome.album else {
            messages.append(ChatMessage(role: .assistant, text: "Jag kunde inte skapa om albumet med de kraven."))
            return
        }
        activeAlbum = album
        albumStore.save(album)
        messages.append(ChatMessage(
            role: .assistant, text: "Klart, jag har gjort om albumet.",
            photoPreviewIDs: Array(album.photoIDs.prefix(8)), albumSnapshot: album
        ))
    }

    private func appendProgressMessage(for stage: PipelineStage, detail: String) {
        switch stage {
        case .finding: messages.append(ChatMessage(role: .assistant, text: detail))
        case .analyzing: messages.append(ChatMessage(role: .assistant, text: "Analyserar bilderna för skärpa, exponering och innehåll…"))
        case .selecting: messages.append(ChatMessage(role: .assistant, text: "Väljer ut de starkaste bilderna och tar bort dubbletter…"))
        case .organizing, .designing, .idle, .done: break
        }
    }

    // MARK: - Editing via chat

    private func cycleCover() {
        guard var album = activeAlbum, album.photoIDs.count > 1 else { return }
        let ids = album.photoIDs
        let currentIndex = ids.firstIndex(of: album.coverPhotoID) ?? 0
        album.coverPhotoID = ids[(currentIndex + 1) % ids.count]
        activeAlbum = album
        albumStore.save(album)
        messages.append(ChatMessage(role: .assistant, text: "Jag har bytt omslagsbild.", albumSnapshot: album))
    }

    private func renameActiveAlbum(to title: String) {
        guard var album = activeAlbum else { return }
        album.title = title
        activeAlbum = album
        albumStore.save(album)
        messages.append(ChatMessage(role: .assistant, text: "Albumet heter nu \"\(title)\"."))
    }

    private func removeWorstPhotos(count: Int) async {
        guard var album = activeAlbum, album.photoCount > count else {
            messages.append(ChatMessage(role: .assistant, text: "Albumet har för få bilder för att ta bort fler."))
            return
        }
        let assets = PhotoLibraryService.shared.assets(for: album.photoIDs)
        var scored: [(id: String, score: Double)] = []
        for asset in assets {
            guard let thumbnail = await PhotoLibraryService.shared.thumbnail(for: asset) else { continue }
            let quality = PhotoQualityAnalyzer.analyze(thumbnail)
            scored.append((asset.localIdentifier, quality.sharpness * 0.6 + quality.exposure * 0.4))
        }
        let worstIDs = Set(scored.sorted { $0.score < $1.score }.prefix(count).map(\.id))
        album.sections = album.sections.map { AlbumSection(id: $0.id, title: $0.title, photoIDs: $0.photoIDs.filter { !worstIDs.contains($0) }) }
        if worstIDs.contains(album.coverPhotoID), let newCover = album.photoIDs.first {
            album.coverPhotoID = newCover
        }
        activeAlbum = album
        albumStore.save(album)
        messages.append(ChatMessage(role: .assistant, text: "Jag tog bort de \(worstIDs.count) sämsta bilderna.", albumSnapshot: album))
    }

    private func removePickedPhotosFromActiveAlbum() {
        guard var album = activeAlbum, !pendingPickedPhotoIDs.isEmpty else {
            messages.append(ChatMessage(role: .assistant, text: "Välj först bilderna du vill ta bort med bildväljaren nedanför."))
            return
        }
        let toRemove = Set(pendingPickedPhotoIDs)
        album.sections = album.sections.map { AlbumSection(id: $0.id, title: $0.title, photoIDs: $0.photoIDs.filter { !toRemove.contains($0) }) }
        pendingPickedPhotoIDs.removeAll()
        activeAlbum = album
        albumStore.save(album)
        messages.append(ChatMessage(role: .assistant, text: "Bilderna är borttagna.", albumSnapshot: album))
    }

    private func addPickedPhotosToActiveAlbum() {
        guard var album = activeAlbum, !pendingPickedPhotoIDs.isEmpty else {
            messages.append(ChatMessage(role: .assistant, text: "Välj bilderna du vill lägga till med bildväljaren nedanför."))
            return
        }
        let newIDs = pendingPickedPhotoIDs.filter { id in !album.photoIDs.contains(id) }
        if var lastSection = album.sections.last {
            lastSection.photoIDs.append(contentsOf: newIDs)
            album.sections[album.sections.count - 1] = lastSection
        } else {
            album.sections = [AlbumSection(photoIDs: newIDs)]
        }
        pendingPickedPhotoIDs.removeAll()
        activeAlbum = album
        albumStore.save(album)
        messages.append(ChatMessage(role: .assistant, text: "Jag har lagt till bilderna i albumet.", albumSnapshot: album))
    }

    // MARK: - Photo picker shortcut

    private func ingestPickedPhotos() async {
        let ids = pickedPhotoItems.compactMap(\.itemIdentifier)
        pendingPickedPhotoIDs = ids
        guard !ids.isEmpty else { return }
        messages.append(ChatMessage(role: .assistant, text: "\(ids.count) bild(er) valda. Säg t.ex. \"lägg till de här bilderna\" eller \"ta bort de här bilderna\".", photoPreviewIDs: ids))
    }

    // MARK: - Permissions

    private func ensureAuthorization() async -> Bool {
        if authManager.isAuthorized { return true }
        let status = await authManager.requestAccessIfNeeded()
        guard status == .authorized || status == .limited else {
            messages.append(ChatMessage(role: .assistant, text: "Jag behöver åtkomst till dina bilder för att kunna hjälpa dig. Gå till Inställningar för att ge appen behörighet."))
            isProcessing = false
            return false
        }
        return true
    }
}
