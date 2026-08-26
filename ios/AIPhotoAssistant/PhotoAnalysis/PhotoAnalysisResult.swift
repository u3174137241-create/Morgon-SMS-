import Foundation

enum SceneTag: String, Sendable, CaseIterable {
    case beach, sunset, sunrise, food, architecture, nature, mountain, city, night, snow, pool, boat, people, portrait, animal
}

/// Everything the album generator needs to know about one photo, produced
/// by `PhotoAnalysisPipeline`. All scores are 0...1, higher is better.
struct PhotoAnalysisResult: Identifiable, Sendable {
    let id: String // PHAsset.localIdentifier
    let metadata: PhotoMetadata
    let place: ResolvedPlace?

    let sharpnessScore: Double
    let exposureScore: Double
    let faceCount: Int
    /// Vision's per-face capture-quality estimate (sharp, well-lit, in-focus
    /// faces score higher). Not an identity or "attractiveness" judgment —
    /// Vision has no concept of who the user is or aesthetic beauty, so this
    /// is the closest honest proxy for "a flattering, clear shot of a face".
    let bestFaceQuality: Double?
    let sceneTags: Set<SceneTag>
    let featurePrintID: String? // opaque handle back into DuplicateDetector's cache

    /// Combined 0...1 usability score before any request-specific relevance
    /// weighting is applied.
    var qualityScore: Double {
        var score = sharpnessScore * 0.55 + exposureScore * 0.35
        if let bestFaceQuality { score = score * 0.7 + bestFaceQuality * 0.3 }
        if metadata.isFavorite { score = min(1, score + 0.1) }
        return score
    }

    var isUsable: Bool {
        !metadata.isScreenshot && sharpnessScore > 0.22 && metadata.duration == 0
    }
}
