import SwiftUI
import UniformTypeIdentifiers

struct ExportSheet: View {
    let album: Album
    @Environment(\.dismiss) private var dismiss

    @State private var isWorking = false
    @State private var statusText: String?
    @State private var shareItems: [Any]?
    @State private var showShare = false
    @State private var pdfData: Data?
    @State private var showPDFExporter = false
    @State private var pngData: Data?
    @State private var showPNGExporter = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Dina originalbilder ändras eller flyttas aldrig. Export skapar ett nytt, separat resultat.")
                        .font(.footnote)
                        .foregroundStyle(Theme.Color.subtleText)
                }
                Section("Spara") {
                    Button {
                        Task { await saveToPhotos() }
                    } label: {
                        Label("Spara album till Bilder", systemImage: "photo.on.rectangle.angled")
                    }
                    Button {
                        Task { await preparePDF() }
                    } label: {
                        Label("Spara som PDF till Filer", systemImage: "doc.richtext")
                    }
                    Button {
                        Task { await prepareImages() }
                    } label: {
                        Label("Spara som bilder till Filer", systemImage: "photo.stack")
                    }
                }
                Section("Dela") {
                    Button {
                        Task { await shareAlbum() }
                    } label: {
                        Label("Dela album", systemImage: "square.and.arrow.up")
                    }
                }
                if let statusText {
                    Section { Text(statusText).font(.footnote).foregroundStyle(Theme.Color.subtleText) }
                }
            }
            .disabled(isWorking)
            .overlay { if isWorking { ProgressView() } }
            .navigationTitle("Exportera")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Klar") { dismiss() } }
            }
            .sheet(isPresented: $showShare) {
                if let shareItems { ShareSheet(items: shareItems) }
            }
            .fileExporter(isPresented: $showPDFExporter, document: pdfData.map(PDFFileDocument.init), contentType: .pdf, defaultFilename: album.title) { _ in }
            .fileExporter(isPresented: $showPNGExporter, document: pngData.map(PNGFileDocument.init), contentType: .png, defaultFilename: album.title) { _ in }
        }
    }

    private func saveToPhotos() async {
        isWorking = true
        defer { isWorking = false }
        do {
            _ = try await ExportService.saveToPhotos(album)
            statusText = "Albumet är sparat i Bilder-appen."
        } catch {
            statusText = error.localizedDescription
        }
    }

    private func preparePDF() async {
        isWorking = true
        defer { isWorking = false }
        guard let data = await ExportService.renderPDF(for: album) else {
            statusText = "Kunde inte skapa PDF."
            return
        }
        pdfData = data
        showPDFExporter = true
    }

    private func prepareImages() async {
        isWorking = true
        defer { isWorking = false }
        let images = await ExportService.renderPageImages(for: album)
        guard let first = images.first, let data = first.pngData() else {
            statusText = "Kunde inte skapa bilder."
            return
        }
        pngData = data
        showPNGExporter = true
    }

    private func shareAlbum() async {
        isWorking = true
        defer { isWorking = false }
        let images = await ExportService.renderPageImages(for: album)
        guard !images.isEmpty else {
            statusText = "Inget att dela."
            return
        }
        shareItems = images
        showShare = true
    }
}
