import Photos
import CoreLocation

struct AnalyzedLibrary: Sendable {
    let results: [PhotoAnalysisResult]
    /// Groups of near-duplicate photo IDs; `SelectionEngine` keeps only the
    /// best one per group.
    let duplicateClusters: [[String]]
}

/// Orchestrates metadata extraction, location resolution, and Vision
/// analysis for a *pre-filtered* candidate set of assets. Callers (the
/// intent pipeline) are responsible for narrowing the library down first —
/// this never runs over the whole photo library at once.
enum PhotoAnalysisPipeline {
    static func run(
        assets: [PHAsset],
        onProgress: @escaping ProgressHandler = { _, _ in }
    ) async -> AnalyzedLibrary {
        await onProgress(.finding, "\(assets.count) bilder hittade")
        let metadataList = PhotoMetadataExtractor.extract(from: assets)

        let locations = metadataList.compactMap(\.location)
        let placesByLocationKey = await LocationResolver.shared.resolveBatch(locations)

        await onProgress(.analyzing, "Analyserar bildkvalitet och innehåll")
        let duplicateDetector = DuplicateDetector()
        let library = PhotoLibraryService.shared

        let results = await mapConcurrently(metadataList, limit: 4) { metadata -> PhotoAnalysisResult in
            let place = metadata.location.flatMap { placesByLocationKey["\($0.coordinate.latitude),\($0.coordinate.longitude)"] }

            guard let asset = library.asset(for: metadata.id), let thumbnail = await library.thumbnail(for: asset) else {
                return PhotoAnalysisResult(
                    id: metadata.id, metadata: metadata, place: place,
                    sharpnessScore: 0.4, exposureScore: 0.5, faceCount: 0,
                    bestFaceQuality: nil, sceneTags: [], featurePrintID: nil
                )
            }

            let quality = PhotoQualityAnalyzer.analyze(thumbnail)
            let content = await PhotoContentAnalyzer.analyze(thumbnail)
            await duplicateDetector.computeFeaturePrint(for: thumbnail, id: metadata.id)

            return PhotoAnalysisResult(
                id: metadata.id,
                metadata: metadata,
                place: place,
                sharpnessScore: quality.sharpness,
                exposureScore: quality.exposure,
                faceCount: content.faceCount,
                bestFaceQuality: content.bestFaceQuality,
                sceneTags: content.sceneTags,
                featurePrintID: metadata.id
            )
        }

        let clusters = await duplicateDetector.duplicateClusters(among: results.map(\.id))
        return AnalyzedLibrary(results: results, duplicateClusters: clusters)
    }
}
