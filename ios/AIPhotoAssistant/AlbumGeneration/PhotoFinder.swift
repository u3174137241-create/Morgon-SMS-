import Photos
import CoreLocation

/// First pass over the library: cheap metadata-only filtering (date, then
/// location) to narrow potentially thousands of photos down to a candidate
/// set before any Vision analysis runs. This is the step that keeps the app
/// from ever needing to "process the whole library" for a narrow request.
enum PhotoFinder {
    /// Hard ceiling on how many photos get analyzed for one request, so a
    /// vague prompt like "alla bilder från 2026" can't trigger an
    /// unbounded on-device Vision run. Prioritizes favorites and recency.
    static let maxCandidates = 500

    static func findCandidates(filters: PhotoFilters, onProgress: @escaping ProgressHandler = { _, _ in }) async -> [PHAsset] {
        await onProgress(.finding, "Söker i bildbiblioteket")
        let allAssets = PhotoLibraryService.shared.fetchAllAssets()
        var pairs: [(asset: PHAsset, metadata: PhotoMetadata)] = allAssets.map { ($0, PhotoMetadataExtractor.extract(from: $0)) }

        // Never include screenshots/videos in candidate pools — they're
        // never what "photos from Greece" or "our vacation" means.
        pairs = pairs.filter { !$0.metadata.isScreenshot && $0.metadata.duration == 0 }

        if let dateRange = filters.dateRange {
            pairs = pairs.filter {
                guard let date = $0.metadata.creationDate else { return false }
                return date >= dateRange.start && date < dateRange.end
            }
        }

        if let phrase = filters.locationPhrase {
            pairs = await filterByLocation(pairs, phrase: phrase, onProgress: onProgress)
        } else if filters.useTripClustering {
            pairs = await filterByTripClustering(pairs, preferredDateRange: filters.dateRange, onProgress: onProgress)
        }

        if pairs.count > maxCandidates {
            pairs.sort { lhs, rhs in
                if lhs.metadata.isFavorite != rhs.metadata.isFavorite { return lhs.metadata.isFavorite }
                return (lhs.metadata.creationDate ?? .distantPast) > (rhs.metadata.creationDate ?? .distantPast)
            }
            pairs = Array(pairs.prefix(maxCandidates))
        }

        return pairs.map(\.asset)
    }

    private static func filterByLocation(
        _ pairs: [(asset: PHAsset, metadata: PhotoMetadata)],
        phrase: String,
        onProgress: @escaping ProgressHandler
    ) async -> [(asset: PHAsset, metadata: PhotoMetadata)] {
        guard let match = await PlaceQuery.resolve(phrase) else { return pairs }
        await onProgress(.finding, "Letar efter bilder från \(match.displayName)")

        let withLocation = pairs.filter { $0.metadata.location != nil }
        let places = await LocationResolver.shared.resolveBatch(withLocation.map { $0.metadata.location! })

        return withLocation.filter { pair in
            let key = "\(pair.metadata.location!.coordinate.latitude),\(pair.metadata.location!.coordinate.longitude)"
            let resolved = places[key]
            return PhotoLocationMatcher.matches(place: match, resolvedPlace: resolved, coordinate: pair.metadata.location?.coordinate)
        }
    }

    private static func filterByTripClustering(
        _ pairs: [(asset: PHAsset, metadata: PhotoMetadata)],
        preferredDateRange: ParsedDateRange?,
        onProgress: @escaping ProgressHandler
    ) async -> [(asset: PHAsset, metadata: PhotoMetadata)] {
        await onProgress(.finding, "Identifierar resor och semestrar")
        let withLocation = pairs.filter { $0.metadata.location != nil }
        guard !withLocation.isEmpty else { return pairs }

        let places = await LocationResolver.shared.resolveBatch(withLocation.map { $0.metadata.location! })
        let items = withLocation.map { pair -> (metadata: PhotoMetadata, place: ResolvedPlace?) in
            let key = "\(pair.metadata.location!.coordinate.latitude),\(pair.metadata.location!.coordinate.longitude)"
            return (pair.metadata, places[key])
        }

        let clusters = TripClusterer.cluster(items).filter(\.looksLikeTravel)
        guard !clusters.isEmpty else { return pairs }

        let chosen: TripCluster
        if let preferredDateRange {
            chosen = clusters.min {
                abs($0.dateRange.lowerBound.timeIntervalSince(preferredDateRange.start)) < abs($1.dateRange.lowerBound.timeIntervalSince(preferredDateRange.start))
            } ?? clusters[0]
        } else {
            chosen = clusters.max { $0.dateRange.upperBound < $1.dateRange.upperBound } ?? clusters[0]
        }

        let chosenIDs = Set(chosen.photoIDs)
        return pairs.filter { chosenIDs.contains($0.metadata.id) }
    }
}
