import Foundation

/// Top-level orchestrator: find candidates → analyze → select → organize →
/// title. This is the "AI does it" pipeline `ChatViewModel` drives and
/// reports progress from.
enum AlbumGenerator {
    struct Outcome {
        let album: Album?
        let analyzedCount: Int
        let selectedCount: Int
    }

    static func generate(
        from intent: UserIntent,
        onProgress: @escaping @Sendable (PipelineStage, String) -> Void = { _, _ in }
    ) async -> Outcome {
        let candidates = await PhotoFinder.findCandidates(filters: intent.filters, onProgress: onProgress)
        guard !candidates.isEmpty else {
            return Outcome(album: nil, analyzedCount: 0, selectedCount: 0)
        }

        let analyzed = await PhotoAnalysisPipeline.run(assets: candidates, onProgress: onProgress)

        onProgress(.selecting, "Väljer de starkaste bilderna")
        let selected = SelectionEngine.select(from: analyzed, filters: intent.filters)
        guard !selected.isEmpty else {
            return Outcome(album: nil, analyzedCount: analyzed.results.count, selectedCount: 0)
        }

        onProgress(.organizing, "Ordnar bilderna kronologiskt")
        let sections = StoryOrganizer.organize(selected)
        let cover = StoryOrganizer.pickCover(from: selected) ?? selected.first!.id

        onProgress(.designing, "Designar albumet")
        let style = intent.suggestedStyle ?? .modern
        let (title, subtitle) = AlbumTitleGenerator.generate(photos: selected, filters: intent.filters, style: style)

        let album = Album(
            id: UUID(),
            title: title,
            subtitle: subtitle,
            style: style,
            coverPhotoID: cover,
            sections: sections,
            createdAt: Date(),
            sourceFilters: intent.filters
        )
        onProgress(.done, "Klart")
        return Outcome(album: album, analyzedCount: analyzed.results.count, selectedCount: selected.count)
    }

    /// Re-runs generation with the same source filters but a different
    /// style/count — used for "gör om albumet", style nudges, and count changes.
    static func regenerate(
        previous: Album,
        overrideStyle: AlbumStyle? = nil,
        overrideCount: Int? = nil,
        onProgress: @escaping @Sendable (PipelineStage, String) -> Void = { _, _ in }
    ) async -> Outcome {
        var filters = previous.sourceFilters
        if let overrideCount { filters.desiredCount = overrideCount }
        let intent = UserIntent(action: .createAlbum, filters: filters, suggestedStyle: overrideStyle ?? previous.style, rawText: "")
        return await generate(from: intent, onProgress: onProgress)
    }
}
