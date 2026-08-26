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

/// Cooperative progress reporter that can be observed from SwiftUI without
/// each pipeline stage needing to know about the view layer.
@MainActor
final class ProgressReporter: ObservableObject {
    @Published private(set) var stage: PipelineStage = .idle
    @Published private(set) var detail: String = ""

    func update(_ stage: PipelineStage, detail: String = "") {
        self.stage = stage
        self.detail = detail
    }
}

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
