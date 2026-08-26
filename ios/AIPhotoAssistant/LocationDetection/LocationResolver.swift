import CoreLocation

/// Reverse-geocodes photo coordinates into country/city names.
///
/// `CLGeocoder` does not require location permission — it just looks up a
/// coordinate we already have from the photo's own EXIF/GPS metadata, it
/// doesn't touch the device's current location. Results are cached in
/// memory and rounded to ~1km so a whole album from one beach only costs a
/// single network lookup.
actor LocationResolver {
    static let shared = LocationResolver()

    private let geocoder = CLGeocoder()
    private var cache: [String: ResolvedPlace] = [:]
    private var inFlight: [String: Task<ResolvedPlace?, Never>] = [:]

    private func cacheKey(for coordinate: CLLocationCoordinate2D) -> String {
        // ~0.01deg ≈ 1.1km — enough precision to separate nearby towns
        // while collapsing hundreds of beach photos into one lookup.
        let lat = (coordinate.latitude * 100).rounded() / 100
        let lon = (coordinate.longitude * 100).rounded() / 100
        return "\(lat),\(lon)"
    }

    func resolve(_ location: CLLocation) async -> ResolvedPlace? {
        let key = cacheKey(for: location.coordinate)
        if let cached = cache[key] { return cached }
        if let existing = inFlight[key] { return await existing.value }

        let task = Task<ResolvedPlace?, Never> { [geocoder] in
            do {
                let placemarks = try await geocoder.reverseGeocodeLocation(location)
                guard let placemark = placemarks.first else { return nil }
                let place = ResolvedPlace(
                    country: placemark.country,
                    countryCode: placemark.isoCountryCode,
                    city: placemark.locality ?? placemark.administrativeArea,
                    locality: placemark.subLocality ?? placemark.locality,
                    coordinate: location.coordinate
                )
                return place
            } catch {
                return nil
            }
        }
        inFlight[key] = task
        let result = await task.value
        inFlight[key] = nil
        if let result {
            cache[key] = result
        }
        return result
    }

    /// Resolves many locations while respecting Apple's geocoding rate
    /// limits (a handful of requests per second) via a small concurrency cap.
    func resolveBatch(_ locations: [CLLocation]) async -> [String: ResolvedPlace] {
        var out: [String: ResolvedPlace] = [:]
        let unique = Dictionary(grouping: locations) { cacheKey(for: $0.coordinate) }
        let keys = Array(unique.keys)

        for chunk in keys.chunked(into: 4) {
            await withTaskGroup(of: (String, ResolvedPlace?).self) { group in
                for key in chunk {
                    guard let sample = unique[key]?.first else { continue }
                    group.addTask {
                        (key, await self.resolve(sample))
                    }
                }
                for await (key, place) in group {
                    if let place { out[key] = place }
                }
            }
        }

        var byLocationKey: [String: ResolvedPlace] = [:]
        for location in locations {
            let key = cacheKey(for: location.coordinate)
            if let place = out[key] {
                byLocationKey["\(location.coordinate.latitude),\(location.coordinate.longitude)"] = place
            }
        }
        return byLocationKey
    }
}

private extension Array {
    func chunked(into size: Int) -> [[Element]] {
        stride(from: 0, to: count, by: size).map { Array(self[$0..<Swift.min($0 + size, count)]) }
    }
}
