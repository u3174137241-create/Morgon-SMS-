import SwiftUI

struct MessageBubbleView: View {
    let message: ChatMessage
    var onTapAlbum: (Album) -> Void
    var onTapStyleChip: (AlbumStyle) async -> Void

    var body: some View {
        VStack(alignment: message.role == .user ? .trailing : .leading, spacing: Theme.Spacing.sm) {
            HStack {
                if message.role == .user { Spacer(minLength: 40) }
                Text(message.text)
                    .font(Theme.Font.body)
                    .foregroundStyle(message.role == .user ? .white : .primary)
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.vertical, Theme.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.Radius.bubble, style: .continuous)
                            .fill(message.role == .user ? Theme.Color.userBubble : Theme.Color.assistantBubble)
                    )
                if message.role == .assistant { Spacer(minLength: 40) }
            }

            if !message.photoPreviewIDs.isEmpty {
                PhotoStripView(photoIDs: message.photoPreviewIDs)
            }

            if let album = message.albumSnapshot {
                AlbumCardView(album: album) { onTapAlbum(album) }
            }

            if !message.styleChips.isEmpty {
                HStack(spacing: Theme.Spacing.sm) {
                    ForEach(message.styleChips, id: \.self) { style in
                        Button {
                            Task { await onTapStyleChip(style) }
                        } label: {
                            Text(style.displayName)
                                .font(Theme.Font.caption.weight(.semibold))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(Capsule().fill(Theme.Color.surface))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: message.role == .user ? .trailing : .leading)
    }
}
