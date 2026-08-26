import CoreLocation

struct PlaceMatch: Sendable {
    let countryCode: String?
    let displayName: String
    let coordinate: CLLocationCoordinate2D?
    /// Match radius in meters when matching by coordinate rather than country code.
    let radiusMeters: CLLocationDistance
}

/// Resolves a free-text place phrase (as extracted by the intent parser)
/// into something `PhotoLocationMatcher` can compare photos against.
/// Tries the offline gazetteer first, only falls back to a live geocode
/// (still just a text lookup, never the device's own location) if needed.
enum PlaceQuery {
    static func resolve(_ phrase: String) async -> PlaceMatch? {
        if let entry = Gazetteer.lookup(phrase) {
            let radius: CLLocationDistance = entry.kind == .country ? 0 : 40_000
            return PlaceMatch(countryCode: entry.countryCode, displayName: entry.canonicalName, coordinate: nil, radiusMeters: radius)
        }

        let geocoder = CLGeocoder()
        guard let placemarks = try? await geocoder.geocodeAddressString(phrase), let placemark = placemarks.first else {
            return nil
        }
        let name = placemark.locality ?? placemark.administrativeArea ?? placemark.country ?? phrase
        let isCountryLevel = placemark.locality == nil
        return PlaceMatch(
            countryCode: placemark.isoCountryCode,
            displayName: name,
            coordinate: isCountryLevel ? nil : placemark.location?.coordinate,
            radiusMeters: isCountryLevel ? 0 : 40_000
        )
    }
}

enum PhotoLocationMatcher {
    /// `resolvedPlace` is the reverse-geocoded place for a specific photo;
    /// `coordinate` is that same photo's raw GPS coordinate for radius checks.
    static func matches(place match: PlaceMatch, resolvedPlace: ResolvedPlace?, coordinate: CLLocationCoordinate2D?) -> Bool {
        if let countryCode = match.countryCode, let photoCountryCode = resolvedPlace?.countryCode {
            if countryCode == photoCountryCode {
                // Country-level match is sufficient unless the query also pinned a city radius.
                if match.radiusMeters == 0 { return true }
            } else {
                return false
            }
        }
        guard match.radiusMeters > 0, let target = match.coordinate, let coordinate else {
            return match.countryCode != nil && resolvedPlace?.countryCode == match.countryCode
        }
        let distance = CLLocation(latitude: target.latitude, longitude: target.longitude)
            .distance(from: CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude))
        return distance <= match.radiusMeters
    }
}
