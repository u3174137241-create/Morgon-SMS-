import Foundation

/// Runs `transform` over `items` with at most `limit` tasks in flight at once.
/// Used to bound concurrent Vision/CoreImage work so we don't spike memory
/// while analyzing large photo batches.
func mapConcurrently<Input: Sendable, Output: Sendable>(
    _ items: [Input],
    limit: Int,
    priority: TaskPriority? = nil,
    transform: @escaping @Sendable (Input) async -> Output
) async -> [Output] {
    guard !items.isEmpty else { return [] }
    var results = [Output?](repeating: nil, count: items.count)

    await withTaskGroup(of: (Int, Output).self) { group in
        var nextIndex = 0
        func addTask(_ index: Int) {
            let item = items[index]
            group.addTask(priority: priority) {
                (index, await transform(item))
            }
        }
        let initial = min(limit, items.count)
        for i in 0..<initial { addTask(i) }
        nextIndex = initial

        while let (index, output) = await group.next() {
            results[index] = output
            if nextIndex < items.count {
                addTask(nextIndex)
                nextIndex += 1
            }
        }
    }
    return results.compactMap { $0 }
}

/// Progress callback shared by every stage of the album-generation
/// pipeline. It's `@MainActor`-isolated so callers (the chat/editor view
/// models) can mutate `@Published` UI state directly inside it, and every
/// pipeline call site `await`s it — that await is a real suspension point
/// in the pipeline's own linear control flow, which is what guarantees
/// stage updates arrive on the main actor in the exact order the pipeline
/// produced them (as opposed to each call spawning its own detached
/// `Task`, which would only be *likely*, not guaranteed, to preserve order).
typealias ProgressHandler = @MainActor @Sendable (PipelineStage, String) -> Void

enum PipelineStage: Int, CaseIterable {
    case idle
    case finding
    case analyzing
    case selecting
    case organizing
    case designing
    case done

    var label: String {
        switch self {
        case .idle: return ""
        case .finding: return "Hittar bilder"
        case .analyzing: return "Analyserar"
        case .selecting: return "Väljer ut"
        case .organizing: return "Organiserar"
        case .designing: return "Designar"
        case .done: return "Klart"
        }
    }
}
