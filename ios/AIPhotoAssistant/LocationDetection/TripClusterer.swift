import CoreLocation
import Foundation

struct TripCluster: Sendable {
    let photoIDs: [String]
    let dateRange: ClosedRange<Date>
    let place: ResolvedPlace?
    /// True if this cluster looks like travel away from the user's "home"
    /// cluster (their most common location), rather than everyday local photos.
    let looksLikeTravel: Bool
}

/// Groups photos into likely "trips" using only date and location — no
/// network calls beyond the reverse-geocoding already done upstream. This is
/// what powers vague requests like "vår semester" or "resan till Dubai" when
/// the user doesn't name an exact place or date range.
enum TripClusterer {
    /// Maximum gap between consecutive photos (by date) before we consider
    /// them part of a different trip.
    static let maxDayGap: TimeInterval = 60 * 60 * 36 // 36h
    /// Distance beyond which two photos are considered "different places"
    /// even if taken on nearby days.
    static let placeDistanceThreshold: CLLocationDistance = 80_000 // 80km

    static func cluster(_ items: [(metadata: PhotoMetadata, place: ResolvedPlace?)]) -> [TripCluster] {
        let dated = items
            .filter { $0.metadata.creationDate != nil }
            .sorted { $0.metadata.creationDate! < $1.metadata.creationDate! }
        guard !dated.isEmpty else { return [] }

        // "Home" = the most frequent country across all supplied photos;
        // clusters matching it are treated as everyday life, not travel.
        let countryCounts = Dictionary(grouping: dated.compactMap { $0.place?.countryCode }, by: { $0 })
            .mapValues(\.count)
        let homeCountry = countryCounts.max(by: { $0.value < $1.value })?.key

        var clusters: [[(metadata: PhotoMetadata, place: ResolvedPlace?)]] = []
        var current: [(metadata: PhotoMetadata, place: ResolvedPlace?)] = [dated[0]]

        for item in dated.dropFirst() {
            guard let prevDate = current.last?.metadata.creationDate, let date = item.metadata.creationDate else {
                current.append(item)
                continue
            }
            let gap = date.timeIntervalSince(prevDate)
            let placeChanged = distanceChanged(from: current.last?.place, to: item.place)
            if gap > maxDayGap && placeChanged {
                clusters.append(current)
                current = [item]
            } else {
                current.append(item)
            }
        }
        clusters.append(current)

        return clusters.map { group in
            let dates = group.compactMap(\.metadata.creationDate)
            let dominantPlace = mostCommonPlace(in: group)
            let isTravel = dominantPlace?.countryCode != nil && dominantPlace?.countryCode != homeCountry
            return TripCluster(
                photoIDs: group.map(\.metadata.id),
                dateRange: (dates.min() ?? Date())...(dates.max() ?? Date()),
                place: dominantPlace,
                looksLikeTravel: isTravel
            )
        }
    }

    private static func distanceChanged(from a: ResolvedPlace?, to b: ResolvedPlace?) -> Bool {
        guard let a, let b else { return false }
        let distance = CLLocation(latitude: a.coordinate.latitude, longitude: a.coordinate.longitude)
            .distance(from: CLLocation(latitude: b.coordinate.latitude, longitude: b.coordinate.longitude))
        return distance > placeDistanceThreshold
    }

    private static func mostCommonPlace(in group: [(metadata: PhotoMetadata, place: ResolvedPlace?)]) -> ResolvedPlace? {
        let places = group.compactMap(\.place)
        guard !places.isEmpty else { return nil }
        var counts: [String: (place: ResolvedPlace, count: Int)] = [:]
        for place in places {
            let key = place.countryCode ?? place.displayName
            counts[key, default: (place, 0)].count += 1
        }
        return counts.values.max(by: { $0.count < $1.count })?.place
    }
}
