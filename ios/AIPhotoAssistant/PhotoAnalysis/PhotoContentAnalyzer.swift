import Vision
import UIKit

/// Wraps Apple's on-device Vision requests. Everything here runs locally on
/// the Neural Engine/GPU — no image data or classification result is ever
/// sent anywhere.
enum PhotoContentAnalyzer {
    struct Result {
        let sceneTags: Set<SceneTag>
        let faceCount: Int
        let bestFaceQuality: Double?
    }

    /// Identifiers returned by `VNClassifyImageRequest` are Apple's internal
    /// taxonomy (hundreds of entries e.g. "seaside", "sunset_sky",
    /// "dessert"); we match by substring against our small set of
    /// user-facing tags rather than hard-coding Apple's exact identifiers,
    /// since those aren't public API and can shift between OS versions.
    private static let tagKeywords: [SceneTag: [String]] = [
        .beach: ["beach", "seaside", "shore", "coast"],
        .sunset: ["sunset", "dusk", "afterglow"],
        .sunrise: ["sunrise", "dawn"],
        .food: ["food", "dessert", "meal", "restaurant", "dish", "drink", "cocktail"],
        .architecture: ["architecture", "building", "cathedral", "tower", "castle", "monument", "temple"],
        .nature: ["nature", "forest", "flower", "plant", "garden", "tree", "landscape"],
        .mountain: ["mountain", "hill", "cliff", "valley"],
        .city: ["skyline", "street", "urban", "downtown", "city"],
        .night: ["night", "fireworks", "neon"],
        .snow: ["snow", "ski", "winter", "ice"],
        .pool: ["pool", "swimming"],
        .boat: ["boat", "ship", "sailing", "yacht", "harbor"],
        .animal: ["dog", "cat", "animal", "bird", "wildlife"],
    ]

    static func analyze(_ image: UIImage) async -> Result {
        guard let cgImage = image.cgImage else {
            return Result(sceneTags: [], faceCount: 0, bestFaceQuality: nil)
        }
        async let scene = classifyScene(cgImage)
        async let faces = detectFaces(cgImage)
        let (sceneTags, faceResult) = await (scene, faces)
        return Result(sceneTags: sceneTags, faceCount: faceResult.count, bestFaceQuality: faceResult.bestQuality)
    }

    private static func classifyScene(_ cgImage: CGImage) async -> Set<SceneTag> {
        let request = VNClassifyImageRequest()
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
            try handler.perform([request])
        } catch {
            return []
        }
        guard let observations = request.results else { return [] }

        var tags: Set<SceneTag> = []
        for observation in observations where observation.confidence > 0.25 {
            let identifier = observation.identifier.lowercased()
            for (tag, keywords) in tagKeywords where keywords.contains(where: identifier.contains) {
                tags.insert(tag)
            }
        }
        return tags
    }

    private static func detectFaces(_ cgImage: CGImage) async -> (count: Int, bestQuality: Double?) {
        let rectanglesRequest = VNDetectFaceRectanglesRequest()
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
            try handler.perform([rectanglesRequest])
        } catch {
            return (0, nil)
        }
        guard let faces = rectanglesRequest.results, !faces.isEmpty else { return (0, nil) }

        let qualityRequest = VNDetectFaceCaptureQualityRequest()
        do {
            try handler.perform([qualityRequest])
        } catch {
            return (faces.count, nil)
        }
        let qualities = (qualityRequest.results ?? []).compactMap { $0.faceCaptureQuality.map(Double.init) }
        return (faces.count, qualities.max())
    }
}
