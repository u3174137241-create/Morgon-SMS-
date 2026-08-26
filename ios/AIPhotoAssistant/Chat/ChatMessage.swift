import Foundation

struct ChatMessage: Identifiable, Equatable {
    enum Role: Equatable { case user, assistant }

    let id: UUID
    let role: Role
    var text: String
    var photoPreviewIDs: [String] = []
    var albumSnapshot: Album?
    var styleChips: [AlbumStyle] = []
    let timestamp: Date

    init(role: Role, text: String, photoPreviewIDs: [String] = [], albumSnapshot: Album? = nil, styleChips: [AlbumStyle] = [], timestamp: Date = Date()) {
        self.id = UUID()
        self.role = role
        self.text = text
        self.photoPreviewIDs = photoPreviewIDs
        self.albumSnapshot = albumSnapshot
        self.styleChips = styleChips
        self.timestamp = timestamp
    }

    static func == (lhs: ChatMessage, rhs: ChatMessage) -> Bool { lhs.id == rhs.id }
}
