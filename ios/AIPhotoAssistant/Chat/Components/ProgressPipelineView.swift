import SwiftUI

/// The "AI is working" indicator. Deliberately avoids looking like a
/// technical loading bar — each stage gets its own icon and a short,
/// human sentence rather than a percentage.
struct ProgressPipelineView: View {
    let stage: PipelineStage

    private let stages: [PipelineStage] = [.finding, .analyzing, .selecting, .organizing, .designing]

    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            ForEach(stages, id: \.self) { s in
                VStack(spacing: 6) {
                    Image(systemName: icon(for: s))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(color(for: s))
                        .symbolEffect(.pulse, isActive: s == stage)
                    Circle()
                        .fill(color(for: s))
                        .frame(width: 5, height: 5)
                }
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.vertical, Theme.Spacing.sm)
        .background(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous).fill(Theme.Color.surface))
        .overlay(alignment: .bottom) {
            Text(stage.label)
                .font(Theme.Font.caption)
                .foregroundStyle(Theme.Color.subtleText)
                .offset(y: 20)
        }
    }

    private func icon(for s: PipelineStage) -> String {
        switch s {
        case .finding: return "magnifyingglass"
        case .analyzing: return "sparkles"
        case .selecting: return "checkmark.circle"
        case .organizing: return "square.stack.3d.up"
        case .designing: return "paintbrush"
        default: return "circle"
        }
    }

    private func color(for s: PipelineStage) -> Color {
        let order = stages.firstIndex(of: s) ?? 0
        let currentOrder = stages.firstIndex(of: stage) ?? -1
        if order < currentOrder { return Theme.Color.accent }
        if order == currentOrder { return Theme.Color.accent }
        return Theme.Color.subtleText.opacity(0.3)
    }
}
