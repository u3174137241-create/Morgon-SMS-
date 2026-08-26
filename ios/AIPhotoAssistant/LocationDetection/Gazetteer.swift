import Foundation

/// A small offline lookup of common travel destinations, keyed by every
/// Swedish/English spelling we expect users to type. This lets the app
/// resolve "Grekland", "Greece", "Hersonissos" etc. instantly and without a
/// network round-trip; anything not in here falls back to `CLGeocoder`
/// forward geocoding in `PlaceQuery`.
enum Gazetteer {
    struct Entry {
        let countryCode: String?
        let canonicalName: String
        let kind: Kind
        enum Kind { case country, city }
    }

    // Keys are lowercased, diacritic-insensitive.
    static let entries: [String: Entry] = [
        "grekland": .init(countryCode: "GR", canonicalName: "Grekland", kind: .country),
        "greece": .init(countryCode: "GR", canonicalName: "Grekland", kind: .country),
        "hersonissos": .init(countryCode: "GR", canonicalName: "Hersonissos", kind: .city),
        "kreta": .init(countryCode: "GR", canonicalName: "Kreta", kind: .city),
        "crete": .init(countryCode: "GR", canonicalName: "Kreta", kind: .city),
        "rhodos": .init(countryCode: "GR", canonicalName: "Rhodos", kind: .city),
        "santorini": .init(countryCode: "GR", canonicalName: "Santorini", kind: .city),
        "mykonos": .init(countryCode: "GR", canonicalName: "Mykonos", kind: .city),
        "athen": .init(countryCode: "GR", canonicalName: "Aten", kind: .city),
        "aten": .init(countryCode: "GR", canonicalName: "Aten", kind: .city),

        "spanien": .init(countryCode: "ES", canonicalName: "Spanien", kind: .country),
        "spain": .init(countryCode: "ES", canonicalName: "Spanien", kind: .country),
        "mallorca": .init(countryCode: "ES", canonicalName: "Mallorca", kind: .city),
        "gran canaria": .init(countryCode: "ES", canonicalName: "Gran Canaria", kind: .city),
        "barcelona": .init(countryCode: "ES", canonicalName: "Barcelona", kind: .city),

        "italien": .init(countryCode: "IT", canonicalName: "Italien", kind: .country),
        "italy": .init(countryCode: "IT", canonicalName: "Italien", kind: .country),
        "rom": .init(countryCode: "IT", canonicalName: "Rom", kind: .city),
        "rome": .init(countryCode: "IT", canonicalName: "Rom", kind: .city),
        "venedig": .init(countryCode: "IT", canonicalName: "Venedig", kind: .city),

        "turkiet": .init(countryCode: "TR", canonicalName: "Turkiet", kind: .country),
        "turkey": .init(countryCode: "TR", canonicalName: "Turkiet", kind: .country),
        "antalya": .init(countryCode: "TR", canonicalName: "Antalya", kind: .city),

        "thailand": .init(countryCode: "TH", canonicalName: "Thailand", kind: .country),
        "phuket": .init(countryCode: "TH", canonicalName: "Phuket", kind: .city),
        "bangkok": .init(countryCode: "TH", canonicalName: "Bangkok", kind: .city),

        "dubai": .init(countryCode: "AE", canonicalName: "Dubai", kind: .city),
        "forenade arabemiraten": .init(countryCode: "AE", canonicalName: "Förenade Arabemiraten", kind: .country),
        "uae": .init(countryCode: "AE", canonicalName: "Förenade Arabemiraten", kind: .country),

        "frankrike": .init(countryCode: "FR", canonicalName: "Frankrike", kind: .country),
        "france": .init(countryCode: "FR", canonicalName: "Frankrike", kind: .country),
        "paris": .init(countryCode: "FR", canonicalName: "Paris", kind: .city),

        "portugal": .init(countryCode: "PT", canonicalName: "Portugal", kind: .country),
        "algarve": .init(countryCode: "PT", canonicalName: "Algarve", kind: .city),

        "sverige": .init(countryCode: "SE", canonicalName: "Sverige", kind: .country),
        "sweden": .init(countryCode: "SE", canonicalName: "Sverige", kind: .country),
        "stockholm": .init(countryCode: "SE", canonicalName: "Stockholm", kind: .city),

        "usa": .init(countryCode: "US", canonicalName: "USA", kind: .country),
        "new york": .init(countryCode: "US", canonicalName: "New York", kind: .city),
        "miami": .init(countryCode: "US", canonicalName: "Miami", kind: .city),

        "egypten": .init(countryCode: "EG", canonicalName: "Egypten", kind: .country),
        "egypt": .init(countryCode: "EG", canonicalName: "Egypten", kind: .country),

        "kroatien": .init(countryCode: "HR", canonicalName: "Kroatien", kind: .country),
        "croatia": .init(countryCode: "HR", canonicalName: "Kroatien", kind: .country),
    ]

    static func lookup(_ raw: String) -> Entry? {
        let normalized = raw
            .lowercased()
            .folding(options: .diacriticInsensitive, locale: .current)
            .trimmingCharacters(in: .whitespaces)
        if let hit = entries[normalized] { return hit }
        // allow partial containment, e.g. "vår resa till grekland i somras"
        return entries.first { normalized.contains($0.key) }?.value
    }
}
