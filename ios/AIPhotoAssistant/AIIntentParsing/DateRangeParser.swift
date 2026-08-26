import Foundation

/// Turns relative/vague date phrases ("förra veckan", "sommaren", "i
/// somras", "2026") into concrete ranges. When nothing matches, callers
/// fall back to trip clustering rather than failing outright.
enum DateRangeParser {
    static func parse(_ text: String, now: Date = Date(), calendar: Calendar = .current) -> ParsedDateRange? {
        let lowered = text.lowercased()

        if let yearMatch = lowered.range(of: #"\b(19|20)\d{2}\b"#, options: .regularExpression),
           let year = Int(lowered[yearMatch]) {
            return yearRange(year, calendar: calendar)
        }

        if lowered.contains("förra veckan") || lowered.contains("senaste veckan") {
            return lastWeek(now: now, calendar: calendar)
        }

        if lowered.contains("förra månaden") {
            return lastMonth(now: now, calendar: calendar)
        }

        if lowered.contains("igår") {
            let start = calendar.startOfDay(for: calendar.date(byAdding: .day, value: -1, to: now) ?? now)
            let end = calendar.date(byAdding: .day, value: 1, to: start) ?? start
            return ParsedDateRange(start: start, end: end)
        }

        for season in Season.allCases where season.matches(lowered) {
            return season.mostRecentRange(before: now, calendar: calendar)
        }

        return nil
    }

    private static func yearRange(_ year: Int, calendar: Calendar) -> ParsedDateRange? {
        var startComponents = DateComponents()
        startComponents.year = year; startComponents.month = 1; startComponents.day = 1
        var endComponents = DateComponents()
        endComponents.year = year + 1; endComponents.month = 1; endComponents.day = 1
        guard let start = calendar.date(from: startComponents), let end = calendar.date(from: endComponents) else { return nil }
        return ParsedDateRange(start: start, end: end)
    }

    private static func lastWeek(now: Date, calendar: Calendar) -> ParsedDateRange? {
        guard let thisWeekStart = calendar.dateInterval(of: .weekOfYear, for: now)?.start,
              let lastWeekStart = calendar.date(byAdding: .weekOfYear, value: -1, to: thisWeekStart) else { return nil }
        return ParsedDateRange(start: lastWeekStart, end: thisWeekStart)
    }

    private static func lastMonth(now: Date, calendar: Calendar) -> ParsedDateRange? {
        guard let thisMonthStart = calendar.dateInterval(of: .month, for: now)?.start,
              let lastMonthStart = calendar.date(byAdding: .month, value: -1, to: thisMonthStart) else { return nil }
        return ParsedDateRange(start: lastMonthStart, end: thisMonthStart)
    }

    private enum Season: CaseIterable {
        case summer, winter, autumn, spring

        func matches(_ text: String) -> Bool {
            switch self {
            case .summer: return text.contains("sommar") || text.contains("somras")
            case .winter: return text.contains("vinter") || text.contains("vintras")
            // Callers pass diacritic-folded text ("höst" -> "host", "våren" ->
            // "varen"), so these must be written without å/ä/ö. Bare "var" is
            // avoided for spring since it's also the common Swedish word for
            // "was/where" and would false-positive constantly.
            case .autumn: return text.contains("host")
            case .spring: return text.contains("varen") || text.contains("varas") || text.contains("i var ")
            }
        }

        var monthRange: (start: Int, endExclusive: Int) {
            switch self {
            case .summer: return (6, 9)
            case .winter: return (12, 3) // wraps year boundary
            case .autumn: return (9, 12)
            case .spring: return (3, 6)
            }
        }

        func mostRecentRange(before now: Date, calendar: Calendar) -> ParsedDateRange? {
            let currentYear = calendar.component(.year, from: now)
            let (startMonth, endMonthExclusive) = monthRange

            func range(forYear year: Int) -> ParsedDateRange? {
                var startComponents = DateComponents(); startComponents.year = year; startComponents.month = startMonth; startComponents.day = 1
                var endYear = year
                var endMonth = endMonthExclusive
                if endMonthExclusive <= startMonth { endYear += 1 } // winter wraps
                if endMonth == 0 { endMonth = 12 }
                var endComponents = DateComponents(); endComponents.year = endYear; endComponents.month = endMonth; endComponents.day = 1
                guard let start = calendar.date(from: startComponents), let end = calendar.date(from: endComponents) else { return nil }
                return ParsedDateRange(start: start, end: end)
            }

            if let thisYear = range(forYear: currentYear), thisYear.start <= now {
                return thisYear
            }
            return range(forYear: currentYear - 1)
        }
    }
}
