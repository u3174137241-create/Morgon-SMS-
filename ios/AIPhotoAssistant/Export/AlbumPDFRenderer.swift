import UIKit

/// Renders an `Album` to a paginated PDF (and, page by page, to flat
/// images) using the same `AlbumStyleTemplate` tokens the on-screen editor
/// uses, so exported output matches what the user saw in the app.
enum AlbumPDFRenderer {
    private static let pageSize = CGSize(width: 612, height: 792) // US Letter @72dpi

    static func render(album: Album, images: [String: UIImage]) -> Data? {
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: pageSize))
        return renderer.pdfData { context in
            drawCoverPage(context: context, album: album, images: images)
            for section in album.sections {
                drawGridPages(context: context, album: album, section: section, images: images)
            }
        }
    }

    static func renderPageImages(album: Album, images: [String: UIImage]) -> [UIImage] {
        var pages: [UIImage] = []
        let renderer = UIGraphicsImageRenderer(size: pageSize)

        pages.append(renderer.image { ctx in
            drawCover(in: ctx.cgContext, bounds: CGRect(origin: .zero, size: pageSize), album: album, images: images)
        })
        for section in album.sections {
            for chunk in section.photoIDs.chunked(into: gridCapacity(for: album.style)) {
                pages.append(renderer.image { ctx in
                    drawGrid(in: ctx.cgContext, bounds: CGRect(origin: .zero, size: pageSize), style: album.style, title: section.title, photoIDs: chunk, images: images)
                })
            }
        }
        return pages
    }

    private static func drawCoverPage(context: UIGraphicsPDFRendererContext, album: Album, images: [String: UIImage]) {
        context.beginPage()
        drawCover(in: context.cgContext, bounds: CGRect(origin: .zero, size: pageSize), album: album, images: images)
    }

    private static func drawCover(in ctx: CGContext, bounds: CGRect, album: Album, images: [String: UIImage]) {
        let template = AlbumStyleTemplate.template(for: album.style)
        UIColor(template.background).setFill()
        ctx.fill(bounds)

        if let cover = images[album.coverPhotoID] {
            drawAspectFilled(cover, in: bounds, context: ctx)
            ctx.setFillColor(UIColor.black.withAlphaComponent(template.coverOverlayOpacity).cgColor)
            ctx.fill(bounds)
        }

        let titleAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 34, weight: .bold),
            .foregroundColor: UIColor(template.titleColor),
        ]
        let subtitleAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 15, weight: .medium),
            .foregroundColor: UIColor(template.titleColor).withAlphaComponent(0.85),
        ]

        let titleSize = album.title.size(withAttributes: titleAttrs)
        let subtitleSize = album.subtitle.size(withAttributes: subtitleAttrs)
        let titleY = bounds.height - 140
        album.title.draw(at: CGPoint(x: 40, y: titleY), withAttributes: titleAttrs)
        album.subtitle.draw(at: CGPoint(x: 40, y: titleY + titleSize.height + 8), withAttributes: subtitleAttrs)
        _ = subtitleSize
    }

    private static func gridCapacity(for style: AlbumStyle) -> Int {
        AlbumStyleTemplate.template(for: style).gridColumns * 3
    }

    private static func drawGridPages(context: UIGraphicsPDFRendererContext, album: Album, section: AlbumSection, images: [String: UIImage]) {
        let capacity = gridCapacity(for: album.style)
        for chunk in section.photoIDs.chunked(into: capacity) {
            context.beginPage()
            drawGrid(in: context.cgContext, bounds: CGRect(origin: .zero, size: pageSize), style: album.style, title: section.title, photoIDs: chunk, images: images)
        }
    }

    private static func drawGrid(in ctx: CGContext, bounds: CGRect, style: AlbumStyle, title: String?, photoIDs: [String], images: [String: UIImage]) {
        let template = AlbumStyleTemplate.template(for: style)
        UIColor(template.background).setFill()
        ctx.fill(bounds)

        var top: CGFloat = 40
        if let title {
            let attrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 16, weight: .semibold),
                .foregroundColor: UIColor(template.titleColor),
            ]
            title.draw(at: CGPoint(x: 30, y: top), withAttributes: attrs)
            top += 30
        }

        let columns = max(1, template.gridColumns)
        let margin: CGFloat = 30
        let spacing: CGFloat = 8
        let availableWidth = bounds.width - margin * 2
        let cellWidth = (availableWidth - spacing * CGFloat(columns - 1)) / CGFloat(columns)
        let cellHeight = cellWidth

        for (index, id) in photoIDs.enumerated() {
            let row = index / columns
            let col = index % columns
            let x = margin + CGFloat(col) * (cellWidth + spacing)
            let y = top + CGFloat(row) * (cellHeight + spacing)
            let rect = CGRect(x: x, y: y, width: cellWidth, height: cellHeight)
            if let image = images[id] {
                ctx.saveGState()
                let path = UIBezierPath(roundedRect: rect, cornerRadius: template.cornerRadius)
                path.addClip()
                drawAspectFilled(image, in: rect, context: ctx)
                ctx.restoreGState()
            } else {
                UIColor.gray.withAlphaComponent(0.2).setFill()
                ctx.fill(rect)
            }
        }
    }

    private static func drawAspectFilled(_ image: UIImage, in rect: CGRect, context: CGContext) {
        let imageSize = image.size
        guard imageSize.width > 0, imageSize.height > 0 else { return }
        let scale = max(rect.width / imageSize.width, rect.height / imageSize.height)
        let drawSize = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
        let origin = CGPoint(x: rect.midX - drawSize.width / 2, y: rect.midY - drawSize.height / 2)
        context.saveGState()
        context.clip(to: rect)
        image.draw(in: CGRect(origin: origin, size: drawSize))
        context.restoreGState()
    }
}

private extension Array {
    func chunked(into size: Int) -> [[Element]] {
        guard size > 0 else { return [self] }
        return stride(from: 0, to: count, by: size).map { Array(self[$0..<Swift.min($0 + size, count)]) }
    }
}
