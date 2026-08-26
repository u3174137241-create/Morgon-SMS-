import Foundation

/// On-device natural-language understanding for Swedish (with English
/// fallback) covering every command shape from the product spec. This is a
/// deterministic rule engine, not a call to a cloud model — no chat text
/// ever leaves the device. `IntentParsing` is a protocol specifically so a
/// generative backend (e.g. Apple's on-device Foundation Models, once
/// available as a deployment target, or an opt-in cloud API) can be dropped
/// in later without touching `ChatViewModel`.
struct RuleBasedIntentParser: IntentParsing {
    func parse(_ text: String, hasActiveAlbum: Bool) async -> UserIntent {
        let lowered = text.lowercased().folding(options: .diacriticInsensitive, locale: .current)
        let original = text.lowercased()

        if hasActiveAlbum, let modification = matchModification(lowered: lowered, original: original) {
            return UserIntent(action: modification, filters: PhotoFilters(), suggestedStyle: nil, rawText: text)
        }

        let filters = extractFilters(from: text, lowered: lowered)
        let style = detectStyle(lowered: lowered, filters: filters)
        let action: IntentAction = isFindOnly(lowered: lowered) ? .findPhotos : .createAlbum

        return UserIntent(action: action, filters: filters, suggestedStyle: style, rawText: text)
    }

    // MARK: - Modification intents (only considered when an album is already active)

    private func matchModification(lowered: String, original: String) -> IntentAction? {
        if lowered.contains("byt omslag") || lowered.contains("andra omslag") || lowered.contains("nytt omslag") {
            return .changeCover
        }
        if lowered.contains("gor om albumet") || lowered.contains("regenerera") || lowered.contains("borja om") {
            return .regenerateAlbum
        }
        if (lowered.contains("ta bort") || lowered.contains("radera")) && (lowered.contains("de har") || lowered.contains("dessa") || lowered.contains("den har")) {
            return .removeSelectedPhotos
        }
        if lowered.contains("lagg till") && (lowered.contains("de har") || lowered.contains("dessa") || lowered.contains("den har")) {
            return .addSelectedPhotos
        }
        if lowered.contains("ta bort") && (lowered.contains("samst") || lowered.contains("sist")) {
            let count = NumberWords.firstNumber(in: lowered) ?? 3
            return .removeWorstPhotos(count: count)
        }
        if let titleMatch = original.range(of: #"(?:byt titel till|kalla albumet|ny titel[: ]+)\s*(.+)"#, options: .regularExpression) {
            let raw = String(original[titleMatch])
            if let title = raw.range(of: #"(?:byt titel till|kalla albumet|ny titel[: ]+)\s*"#, options: .regularExpression) {
                let value = raw[title.upperBound...].trimmingCharacters(in: .whitespacesAndNewlines)
                if !value.isEmpty { return .changeTitle(value.capitalizedFirstLetter) }
            }
        }
        if lowered.contains("litet album") || lowered.contains("fler bilder") || lowered.contains("farre bilder") || lowered.range(of: #"\d+\s*bilder"#, options: .regularExpression) != nil {
            if let count = NumberWords.firstNumber(in: lowered) {
                return .changeCount(count)
            }
        }
        if let adjustment = styleAdjustment(lowered: lowered) {
            return .styleAdjustment(adjustment)
        }
        if let style = explicitStyle(lowered: lowered) {
            return .changeStyle(style)
        }
        return nil
    }

    private func styleAdjustment(lowered: String) -> StyleAdjustment? {
        guard lowered.contains("mer ") || lowered.contains("gor det") || lowered.contains("gor albumet") else { return nil }
        if lowered.contains("lyxig") { return .moreLuxury }
        if lowered.contains("minimalist") { return .moreMinimal }
        if lowered.contains("cinematisk") || lowered.contains("filmisk") { return .moreCinematic }
        if lowered.contains("romantisk") { return .moreRomantic }
        if lowered.contains("rolig") { return .moreFun }
        if lowered.contains("dokumentar") { return .moreDocumentary }
        if lowered.contains("modern") { return .moreModern }
        return nil
    }

    // MARK: - Filters

    private func isFindOnly(lowered: String) -> Bool {
        let creationCues = ["album", "skapa", "gor ett", "gor en", "bygg"]
        let findCues = ["hitta", "visa", "leta", "sok"]
        let hasCreation = creationCues.contains { lowered.contains($0) }
        let hasFind = findCues.contains { lowered.contains($0) }
        return hasFind && !hasCreation
    }

    private func extractFilters(from original: String, lowered: String) -> PhotoFilters {
        var filters = PhotoFilters()

        if let place = Gazetteer.lookup(lowered) {
            filters.locationPhrase = place.canonicalName
        } else if let match = original.range(of: #"(?:från|till|i)\s+([A-ZÅÄÖ][\wÅÄÖåäö]+(?:\s+[A-ZÅÄÖ][\wÅÄÖåäö]+)?)"#, options: .regularExpression) {
            let phrase = String(original[match])
            if let captured = phrase.range(of: #"[A-ZÅÄÖ][\wÅÄÖåäö]+(?:\s+[A-ZÅÄÖ][\wÅÄÖåäö]+)?$"#, options: .regularExpression) {
                filters.locationPhrase = String(phrase[captured])
            }
        }

        filters.dateRange = DateRangeParser.parse(lowered)

        if lowered.contains("semester") || lowered.contains(" resa") || lowered.contains("resan") || lowered.hasPrefix("resa") {
            filters.useTripClustering = true
        }

        filters.subjects = detectSubjects(lowered: lowered)

        if lowered.contains("mig och min partner") || lowered.contains("mig och min pojkvan") || lowered.contains("mig och min flickvan")
            || lowered.contains("mig och min man") || lowered.contains("mig och min fru") {
            filters.coupleOnly = true
            filters.requiresPeople = true
        }
        if lowered.contains("dar jag ser bra ut") || lowered.contains("jag ser bra ut") {
            filters.requiresPeople = true
            filters.subjects.insert(.portrait)
        }

        if lowered.contains("basta") {
            filters.bestOnly = true
        }

        filters.desiredCount = NumberWords.firstNumber(in: lowered)

        return filters
    }

    private func detectSubjects(lowered: String) -> Set<SubjectFilter> {
        var subjects: Set<SubjectFilter> = []
        let map: [(String, SubjectFilter)] = [
            ("strand", .beach), ("beach", .beach),
            ("solnedgang", .sunset), ("sunset", .sunset),
            ("soluppgang", .sunrise),
            ("mat", .food), ("restaurang", .food),
            ("arkitektur", .architecture), ("byggnad", .architecture),
            ("natur", .nature),
            ("porträtt", .portrait), ("portratt", .portrait),
            ("folk", .people), ("manniskor", .people), ("vanner", .people), ("familj", .people),
            ("natt", .night),
            ("sno", .snow), ("skidor", .snow),
            ("pool", .pool), ("simning", .pool),
            ("bat", .boat), ("segling", .boat),
            ("djur", .animal), ("hund", .animal), ("katt", .animal),
        ]
        for (keyword, tag) in map where lowered.contains(keyword) {
            subjects.insert(tag)
        }
        return subjects
    }

    // MARK: - Style

    private func explicitStyle(lowered: String) -> AlbumStyle? {
        let map: [(String, AlbumStyle)] = [
            ("lyxig", .luxury), ("luxur", .luxury),
            ("minimalist", .minimal),
            ("romantisk", .romantic),
            ("cinematisk", .cinematic), ("filmisk", .cinematic),
            ("rolig", .fun), ("kul", .fun),
            ("familj", .family),
            ("dokumentar", .documentary),
            ("modern", .modern),
            ("resealbum", .travel), ("semesteralbum", .travel),
        ]
        for (keyword, style) in map where lowered.contains(keyword) {
            return style
        }
        return nil
    }

    private func detectStyle(lowered: String, filters: PhotoFilters) -> AlbumStyle? {
        if let explicit = explicitStyle(lowered: lowered) { return explicit }
        if filters.coupleOnly { return .romantic }
        if filters.useTripClustering || filters.locationPhrase != nil { return .travel }
        return nil
    }
}

private extension String {
    var capitalizedFirstLetter: String {
        guard let first else { return self }
        return first.uppercased() + dropFirst()
    }
}
