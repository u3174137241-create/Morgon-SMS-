import Foundation

/// Orders the final selection into a "story" — chronological, optionally
/// split into day-by-day sections — and picks a cover photo.
enum StoryOrganizer {
    static func organize(_ photos: [PhotoAnalysisResult]) -> [AlbumSection] {
        let sorted = photos.sorted { lhs, rhs in
            switch (lhs.metadata.creationDate, rhs.metadata.creationDate) {
            case let (l?, r?): return l < r
            case (nil, _): return false
            case (_, nil): return true
            }
        }
        guard sorted.count >= 10 else {
            return [AlbumSection(photoIDs: sorted.map(\.id))]
        }

        let calendar = Calendar.current
        let groupedByDay = Dictionary(grouping: sorted) { photo -> Date in
            guard let date = photo.metadata.creationDate else { return .distantPast }
            return calendar.startOfDay(for: date)
        }
        guard groupedByDay.count > 1 else {
            return [AlbumSection(photoIDs: sorted.map(\.id))]
        }

        let orderedDays = groupedByDay.keys.sorted()
        let formatter = DateFormatter()
        formatter.dateFormat = "d MMMM"
        formatter.locale = Locale(identifier: "sv_SE")

        return orderedDays.compactMap { day in
            guard let dayPhotos = groupedByDay[day], !dayPhotos.isEmpty else { return nil }
            let title = day == .distantPast ? nil : formatter.string(from: day)
            return AlbumSection(title: title, photoIDs: dayPhotos.map(\.id))
        }
    }

    static func pickCover(from photos: [PhotoAnalysisResult]) -> String? {
        let withScene = photos.filter { !$0.sceneTags.isEmpty || $0.faceCount > 0 }
        let candidates = withScene.isEmpty ? photos : withScene
        return candidates.max(by: { $0.qualityScore < $1.qualityScore })?.id
    }
}
