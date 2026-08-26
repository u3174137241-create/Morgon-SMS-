import Vision
import UIKit

/// Groups near-identical photos (burst shots, "just one more" retakes) using
/// Vision's feature-print embeddings, entirely on-device. The album
/// generator keeps only the best-scoring photo from each cluster.
actor DuplicateDetector {
    private var featurePrints: [String: VNFeaturePrintObservation] = [:]

    func computeFeaturePrint(for image: UIImage, id: String) {
        guard let cgImage = image.cgImage else { return }
        let request = VNGenerateImageFeaturePrintRequest()
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
            try handler.perform([request])
            if let observation = request.results?.first {
                featurePrints[id] = observation
            }
        } catch {
            // No feature print available for this image; it simply won't
            // be grouped into any duplicate cluster.
        }
    }

    /// Returns groups of IDs (size >= 2) whose visual distance is below
    /// `threshold`. Distance is unbounded but empirically <0.3 reliably
    /// indicates near-duplicates for this embedding.
    func duplicateClusters(among ids: [String], threshold: Float = 0.3) -> [[String]] {
        var remaining = ids.filter { featurePrints[$0] != nil }
        var clusters: [[String]] = []

        while let seed = remaining.first {
            remaining.removeFirst()
            guard let seedPrint = featurePrints[seed] else { continue }
            var cluster = [seed]
            var stillRemaining: [String] = []
            for candidate in remaining {
                guard let candidatePrint = featurePrints[candidate] else { continue }
                var distance: Float = .greatestFiniteMagnitude
                try? seedPrint.computeDistance(&distance, to: candidatePrint)
                if distance < threshold {
                    cluster.append(candidate)
                } else {
                    stillRemaining.append(candidate)
                }
            }
            remaining = stillRemaining
            if cluster.count > 1 {
                clusters.append(cluster)
            }
        }
        return clusters
    }

    func reset() {
        featurePrints.removeAll()
    }
}
