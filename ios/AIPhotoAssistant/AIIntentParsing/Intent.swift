import Foundation

enum IntentAction: Sendable, Equatable {
    case createAlbum
    case findPhotos
    case regenerateAlbum
    case changeStyle(AlbumStyle)
    case styleAdjustment(StyleAdjustment)
    case changeCover
    case changeTitle(String)
    case changeCount(Int)
    case removeWorstPhotos(count: Int)
    case removeSelectedPhotos
    case addSelectedPhotos
    case unknown
}

enum StyleAdjustment: String, Sendable, Equatable, CaseIterable {
    case moreLuxury, moreMinimal, moreCinematic, moreRomantic, moreFun, moreDocumentary, moreModern

    var nudgedStyle: AlbumStyle {
        switch self {
        case .moreLuxury: return .luxury
        case .moreMinimal: return .minimal
        case .moreCinematic: return .cinematic
        case .moreRomantic: return .romantic
        case .moreFun: return .fun
        case .moreDocumentary: return .documentary
        case .moreModern: return .modern
        }
    }
}

enum SubjectFilter: String, Sendable, CaseIterable, Codable {
    case beach, sunset, sunrise, food, architecture, nature, people, portrait, night, snow, pool, boat, animal

    var matchingScenes: Set<SceneTag> {
        switch self {
        case .beach: return [.beach]
        case .sunset: return [.sunset]
        case .sunrise: return [.sunrise]
        case .food: return [.food]
        case .architecture: return [.architecture]
        case .nature: return [.nature, .mountain]
        case .people: return [.people, .portrait]
        case .portrait: return [.portrait]
        case .night: return [.night]
        case .snow: return [.snow]
        case .pool: return [.pool]
        case .boat: return [.boat]
        case .animal: return [.animal]
        }
    }
}

struct ParsedDateRange: Sendable, Equatable, Codable {
    var start: Date
    var end: Date
}

struct PhotoFilters: Sendable, Equatable, Codable {
    var locationPhrase: String?
    var dateRange: ParsedDateRange?
    var subjects: Set<SubjectFilter> = []
    var requiresPeople: Bool = false
    var coupleOnly: Bool = false
    var bestOnly: Bool = false
    var desiredCount: Int?
    var useTripClustering: Bool = false

    var isEmpty: Bool {
        locationPhrase == nil && dateRange == nil && subjects.isEmpty
            && !requiresPeople && !coupleOnly && !bestOnly && desiredCount == nil && !useTripClustering
    }
}

struct UserIntent: Sendable, Equatable {
    var action: IntentAction
    var filters: PhotoFilters
    var suggestedStyle: AlbumStyle?
    var rawText: String
}

/// Abstraction so a future on-device or cloud LLM can replace/augment the
/// rule-based parser without touching any calling code.
protocol IntentParsing: Sendable {
    func parse(_ text: String, hasActiveAlbum: Bool) async -> UserIntent
}
