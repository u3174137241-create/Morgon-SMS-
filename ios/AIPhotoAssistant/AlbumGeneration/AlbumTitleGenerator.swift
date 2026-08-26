import Foundation

enum AlbumTitleGenerator {
    static func generate(photos: [PhotoAnalysisResult], filters: PhotoFilters, style: AlbumStyle) -> (title: String, subtitle: String) {
        let place = dominantPlace(in: photos)
        let dateRange = photos.compactMap(\.metadata.creationDate)
        let earliest = dateRange.min()
        let latest = dateRange.max()

        let monthFormatter = DateFormatter()
        monthFormatter.locale = Locale(identifier: "sv_SE")
        monthFormatter.dateFormat = "MMMM yyyy"

        let dateText: String
        if let earliest, let latest, !Calendar.current.isDate(earliest, equalTo: latest, toGranularity: .month) {
            let yearFormatter = DateFormatter()
            yearFormatter.locale = Locale(identifier: "sv_SE")
            yearFormatter.dateFormat = "yyyy"
            dateText = "\(seasonLabel(for: earliest)) \(yearFormatter.string(from: earliest))"
        } else if let earliest {
            dateText = monthFormatter.string(from: earliest)
        } else {
            dateText = ""
        }

        switch style {
        case .minimal, .luxury:
            let placeTitle = place.flatMap { $0.displayName.isEmpty ? nil : $0.displayName.uppercased() }
            let title = placeTitle ?? place?.country?.uppercased() ?? "ALBUM"
            return (title, dateText)
        case .romantic:
            let title = place != nil ? "Vår resa till \(place!.displayName)" : "Vår historia"
            return (title, dateText)
        case .cinematic:
            let title = place != nil ? "\(place!.displayName)" : "En berättelse"
            return (title, [place?.country, dateText].compactMap { $0 }.joined(separator: " · "))
        case .travel:
            let title = place != nil ? "Vår resa till \(place!.displayName)" : "Vårt äventyr"
            return (title, [place?.displayName, dateText].compactMap { $0 }.joined(separator: " · "))
        case .family, .fun, .documentary, .modern:
            let title = place?.displayName ?? "Mitt album"
            return (title, dateText)
        }
    }

    private static func dominantPlace(in photos: [PhotoAnalysisResult]) -> ResolvedPlace? {
        let places = photos.compactMap(\.place)
        guard !places.isEmpty else { return nil }
        var counts: [String: (place: ResolvedPlace, count: Int)] = [:]
        for place in places {
            let key = place.locality ?? place.city ?? place.country ?? "?"
            counts[key, default: (place, 0)].count += 1
        }
        return counts.values.max(by: { $0.count < $1.count })?.place
    }

    private static func seasonLabel(for date: Date) -> String {
        let month = Calendar.current.component(.month, from: date)
        switch month {
        case 6...8: return "Sommar"
        case 9...11: return "Höst"
        case 12, 1, 2: return "Vinter"
        default: return "Vår"
        }
    }
}
