import CoreLocation

/// Human-readable place derived from a photo's GPS coordinate.
struct ResolvedPlace: Sendable, Equatable {
    let country: String?
    let countryCode: String?
    let city: String?
    let locality: String? // neighborhood/area, e.g. "Hersonissos"
    let coordinate: CLLocationCoordinate2D

    static func == (lhs: ResolvedPlace, rhs: ResolvedPlace) -> Bool {
        lhs.country == rhs.country && lhs.city == rhs.city && lhs.locality == rhs.locality
    }

    /// Best short label for UI, e.g. "Hersonissos, Grekland".
    var displayName: String {
        [locality ?? city, country].compactMap { $0 }.joined(separator: ", ")
    }
}
