import SwiftUI

/// Shared visual language for the app. Kept centralized so album style
/// templates (Shared/AlbumStyle) and chat UI stay visually consistent.
enum Theme {
    enum Color {
        static let background = SwiftUI.Color("LaunchBackground", bundle: .main)
        static let surface = SwiftUI.Color(.secondarySystemBackground)
        static let accent = SwiftUI.Color.accentColor
        static let userBubble = SwiftUI.Color.accentColor
        static let assistantBubble = SwiftUI.Color(.secondarySystemBackground)
        static let subtleText = SwiftUI.Color.secondary
    }

    enum Font {
        static let title = SwiftUI.Font.system(.title2, design: .rounded, weight: .semibold)
        static let headline = SwiftUI.Font.system(.headline, design: .rounded)
        static let body = SwiftUI.Font.system(.body, design: .default)
        static let caption = SwiftUI.Font.system(.caption, design: .default)
        static let albumTitle = SwiftUI.Font.system(.largeTitle, design: .serif, weight: .bold)
        static let albumSubtitle = SwiftUI.Font.system(.subheadline, design: .serif, weight: .medium)
    }

    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 40
    }

    enum Radius {
        static let bubble: CGFloat = 20
        static let card: CGFloat = 18
        static let thumb: CGFloat = 10
    }
}
