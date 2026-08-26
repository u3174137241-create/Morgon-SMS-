import Foundation

/// Turns an analyzed candidate pool into the final photo selection:
/// drop unusable/duplicate/off-topic photos, rank what's left, then cap to
/// the requested (or a sensible default) count.
enum SelectionEngine {
    static func select(from library: AnalyzedLibrary, filters: PhotoFilters) -> [PhotoAnalysisResult] {
        var pool = library.results.filter(\.isUsable)
        pool = dedupe(pool, clusters: library.duplicateClusters)
        pool = applyContentFilters(pool, filters: filters)

        guard !pool.isEmpty else { return [] }

        let ranked = pool.sorted { relevanceScore($0, filters: filters) > relevanceScore($1, filters: filters) }
        let target = targetCount(for: filters, poolSize: ranked.count)

        var selected = Array(ranked.prefix(target))
        // Keep a quality floor, but never shrink below a small viable album
        // just because everything scored modestly (a rainy-day trip is
        // still a trip worth an album).
        if selected.count > 6 {
            let aboveFloor = selected.filter { $0.qualityScore >= 0.28 }
            if aboveFloor.count >= 6 {
                selected = aboveFloor
            }
        }
        return selected
    }

    private static func dedupe(_ pool: [PhotoAnalysisResult], clusters: [[String]]) -> [PhotoAnalysisResult] {
        var byID = Dictionary(uniqueKeysWithValues: pool.map { ($0.id, $0) })
        for cluster in clusters {
            let members = cluster.compactMap { byID[$0] }
            guard members.count > 1, let best = members.max(by: { $0.qualityScore < $1.qualityScore }) else { continue }
            for member in members where member.id != best.id {
                byID.removeValue(forKey: member.id)
            }
        }
        return pool.filter { byID[$0.id] != nil }
    }

    private static func applyContentFilters(_ pool: [PhotoAnalysisResult], filters: PhotoFilters) -> [PhotoAnalysisResult] {
        var result = pool

        if !filters.subjects.isEmpty {
            let requiredTags = Set(filters.subjects.flatMap(\.matchingScenes))
            let wantsPeople = filters.subjects.contains(.people) || filters.subjects.contains(.portrait)
            result = result.filter { photo in
                let tagMatch = !photo.sceneTags.isDisjoint(with: requiredTags)
                let peopleMatch = wantsPeople && photo.faceCount > 0
                return tagMatch || peopleMatch
            }
        }

        if filters.requiresPeople {
            result = result.filter { $0.faceCount > 0 }
        }

        if filters.coupleOnly {
            // Best-effort proxy: Vision has no notion of "my partner", so we
            // favor photos with exactly two faces (typical couple framing)
            // over group shots or solo portraits.
            let pairs = result.filter { $0.faceCount == 2 }
            result = pairs.isEmpty ? result.filter { $0.faceCount >= 1 } : pairs
        }

        return result
    }

    private static func relevanceScore(_ photo: PhotoAnalysisResult, filters: PhotoFilters) -> Double {
        var score = photo.qualityScore
        if !filters.subjects.isEmpty {
            let requiredTags = Set(filters.subjects.flatMap(\.matchingScenes))
            let matchCount = photo.sceneTags.intersection(requiredTags).count
            score += Double(matchCount) * 0.05
        }
        return score
    }

    private static func targetCount(for filters: PhotoFilters, poolSize: Int) -> Int {
        if let desired = filters.desiredCount {
            return max(1, min(desired, poolSize))
        }
        if filters.bestOnly {
            return min(30, poolSize)
        }
        let proportional = Int(Double(poolSize) * 0.35)
        return max(min(20, poolSize), min(proportional, 60))
    }
}
