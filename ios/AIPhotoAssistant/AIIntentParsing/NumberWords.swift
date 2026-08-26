import Foundation

/// Extracts counts like "20 bilder", "de 50 bästa", "tre sämsta" from
/// Swedish text — both digit and spelled-out forms for small numbers.
enum NumberWords {
    private static let words: [String: Int] = [
        "en": 1, "ett": 1, "två": 2, "tre": 3, "fyra": 4, "fem": 5,
        "sex": 6, "sju": 7, "åtta": 8, "nio": 9, "tio": 10,
        "femton": 15, "tjugo": 20, "trettio": 30, "fyrtio": 40, "femtio": 50,
        "sextio": 60, "sjuttio": 70, "åttio": 80, "nittio": 90, "hundra": 100,
    ]

    /// A bare year (e.g. "2026" in "bilder från 2026") is never the count
    /// the user means, even though it's the first digit sequence in a
    /// sentence like "Ta alla bilder från 2026 och välj de 50 bästa." — so
    /// year-shaped 4-digit numbers are skipped in favor of any other digit
    /// sequence, and only used as a last resort.
    static func firstNumber(in text: String) -> Int? {
        let lowered = text.lowercased()
        let digitStrings = allMatches(of: #"\d+"#, in: lowered)
        let nonYearNumbers = digitStrings.compactMap(Int.init).filter { !looksLikeYear($0) }
        if let first = nonYearNumbers.first { return first }

        let tokens = lowered.split(whereSeparator: { !$0.isLetter })
        for token in tokens {
            if let value = words[String(token)] {
                return value
            }
        }

        if let fallbackYear = digitStrings.first.flatMap(Int.init) { return fallbackYear }
        return nil
    }

    private static func looksLikeYear(_ value: Int) -> Bool {
        String(value).count == 4 && value >= 1900 && value <= 2100
    }

    private static func allMatches(of pattern: String, in text: String) -> [String] {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let range = NSRange(text.startIndex..., in: text)
        return regex.matches(in: text, range: range).compactMap {
            Range($0.range, in: text).map { String(text[$0]) }
        }
    }
}
