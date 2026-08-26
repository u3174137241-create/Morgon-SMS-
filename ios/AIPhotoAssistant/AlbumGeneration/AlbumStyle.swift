import SwiftUI

/// Visual/editorial style applied by `AlbumStyleTemplate` and offered as
/// quick-reply chips after generation.
enum AlbumStyle: String, Sendable, Equatable, CaseIterable, Codable {
    case modern, minimal, luxury, travel, romantic, cinematic, fun, family, documentary

    var displayName: String {
        switch self {
        case .modern: return "Modern"
        case .minimal: return "Minimalistisk"
        case .luxury: return "Lyxig"
        case .travel: return "Resa"
        case .romantic: return "Romantisk"
        case .cinematic: return "Cinematisk"
        case .fun: return "Rolig"
        case .family: return "Familj"
        case .documentary: return "Dokumentär"
        }
    }
}
