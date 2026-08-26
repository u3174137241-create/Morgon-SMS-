import SwiftUI

/// Visual parameters for one `AlbumStyle`, consumed by both the on-screen
/// editor and the PDF export renderer so the two stay visually consistent.
struct AlbumStyleTemplate {
    let background: Color
    let titleColor: Color
    let accentColor: Color
    let titleFont: Font
    let subtitleFont: Font
    let cornerRadius: CGFloat
    let gridColumns: Int
    let coverOverlayOpacity: Double
    let spacing: CGFloat

    static func template(for style: AlbumStyle) -> AlbumStyleTemplate {
        switch style {
        case .minimal:
            return AlbumStyleTemplate(
                background: .white, titleColor: .black, accentColor: .black,
                titleFont: .system(.largeTitle, design: .default, weight: .light),
                subtitleFont: .system(.footnote, design: .default, weight: .regular),
                cornerRadius: 2, gridColumns: 3, coverOverlayOpacity: 0.05, spacing: 2
            )
        case .luxury:
            return AlbumStyleTemplate(
                background: Color(red: 0.07, green: 0.06, blue: 0.05), titleColor: Color(red: 0.85, green: 0.72, blue: 0.45), accentColor: Color(red: 0.85, green: 0.72, blue: 0.45),
                titleFont: .system(.largeTitle, design: .serif, weight: .semibold),
                subtitleFont: .system(.subheadline, design: .serif, weight: .medium),
                cornerRadius: 4, gridColumns: 2, coverOverlayOpacity: 0.45, spacing: 6
            )
        case .romantic:
            return AlbumStyleTemplate(
                background: Color(red: 0.98, green: 0.93, blue: 0.93), titleColor: Color(red: 0.55, green: 0.2, blue: 0.28), accentColor: Color(red: 0.75, green: 0.35, blue: 0.4),
                titleFont: .system(.largeTitle, design: .serif, weight: .medium),
                subtitleFont: .system(.subheadline, design: .serif, weight: .regular),
                cornerRadius: 16, gridColumns: 2, coverOverlayOpacity: 0.25, spacing: 10
            )
        case .cinematic:
            return AlbumStyleTemplate(
                background: .black, titleColor: .white, accentColor: .white,
                titleFont: .system(.largeTitle, design: .default, weight: .bold),
                subtitleFont: .system(.subheadline, design: .default, weight: .light),
                cornerRadius: 0, gridColumns: 1, coverOverlayOpacity: 0.55, spacing: 0
            )
        case .fun:
            return AlbumStyleTemplate(
                background: Color(red: 1.0, green: 0.96, blue: 0.85), titleColor: Color(red: 0.9, green: 0.4, blue: 0.1), accentColor: Color(red: 0.95, green: 0.6, blue: 0.15),
                titleFont: .system(.largeTitle, design: .rounded, weight: .bold),
                subtitleFont: .system(.subheadline, design: .rounded, weight: .semibold),
                cornerRadius: 24, gridColumns: 3, coverOverlayOpacity: 0.1, spacing: 8
            )
        case .family:
            return AlbumStyleTemplate(
                background: Color(red: 0.97, green: 0.96, blue: 0.93), titleColor: Color(red: 0.3, green: 0.25, blue: 0.2), accentColor: Color(red: 0.55, green: 0.45, blue: 0.3),
                titleFont: .system(.largeTitle, design: .rounded, weight: .semibold),
                subtitleFont: .system(.subheadline, design: .default, weight: .regular),
                cornerRadius: 18, gridColumns: 2, coverOverlayOpacity: 0.15, spacing: 12
            )
        case .documentary:
            return AlbumStyleTemplate(
                background: Color(white: 0.12), titleColor: .white, accentColor: Color(white: 0.7),
                titleFont: .system(.title, design: .monospaced, weight: .medium),
                subtitleFont: .system(.footnote, design: .monospaced, weight: .regular),
                cornerRadius: 0, gridColumns: 3, coverOverlayOpacity: 0.3, spacing: 3
            )
        case .travel:
            return AlbumStyleTemplate(
                background: Color(red: 0.96, green: 0.97, blue: 0.98), titleColor: Color(red: 0.1, green: 0.25, blue: 0.35), accentColor: Color(red: 0.2, green: 0.55, blue: 0.6),
                titleFont: .system(.largeTitle, design: .serif, weight: .semibold),
                subtitleFont: .system(.subheadline, design: .default, weight: .medium),
                cornerRadius: 14, gridColumns: 2, coverOverlayOpacity: 0.2, spacing: 10
            )
        case .modern:
            return AlbumStyleTemplate(
                background: Color(.systemBackground), titleColor: .primary, accentColor: .accentColor,
                titleFont: .system(.largeTitle, design: .rounded, weight: .bold),
                subtitleFont: .system(.subheadline, design: .rounded, weight: .medium),
                cornerRadius: 14, gridColumns: 3, coverOverlayOpacity: 0.2, spacing: 8
            )
        }
    }
}
