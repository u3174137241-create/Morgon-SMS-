import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

/// On-device sharpness/exposure scoring built entirely from Core Image
/// filters (GPU-accelerated, no third-party model, nothing leaves the
/// device). Sharpness uses a Laplacian-style edge convolution: a blurry
/// photo has low high-frequency energy, so the variance of the edge
/// response is a standard, well-established blur proxy.
enum PhotoQualityAnalyzer {
    private static let context = CIContext(options: [.useSoftwareRenderer: false])

    struct Result {
        let sharpness: Double
        let exposure: Double
    }

    static func analyze(_ image: UIImage) -> Result {
        guard let ciImage = CIImage(image: image) else {
            return Result(sharpness: 0.5, exposure: 0.5)
        }
        // Downscale first — sharpness/exposure signal doesn't need full res
        // and this keeps analysis fast across large batches.
        let scaled = downscale(ciImage, maxDimension: 400)
        let gray = grayscale(scaled)

        let sharpness = sharpnessScore(for: gray)
        let exposure = exposureScore(for: gray)
        return Result(sharpness: sharpness, exposure: exposure)
    }

    private static func downscale(_ image: CIImage, maxDimension: CGFloat) -> CIImage {
        let extent = image.extent
        let scale = maxDimension / max(extent.width, extent.height)
        guard scale < 1 else { return image }
        return image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    }

    private static func grayscale(_ image: CIImage) -> CIImage {
        let filter = CIFilter.colorControls()
        filter.inputImage = image
        filter.saturation = 0
        return filter.outputImage ?? image
    }

    /// Laplacian edge convolution, then mean(edge^2) as a variance proxy —
    /// low values mean few sharp edges (blurry), high values mean lots of
    /// fine detail (sharp).
    private static func sharpnessScore(for grayImage: CIImage) -> Double {
        let weights: [CGFloat] = [0, 1, 0, 1, -4, 1, 0, 1, 0]
        let convolution = CIFilter.convolution3X3()
        convolution.inputImage = grayImage.clampedToExtent()
        convolution.weights = CIVector(values: weights, count: weights.count)
        convolution.bias = 0
        guard let edges = convolution.outputImage?.cropped(to: grayImage.extent) else {
            return 0.5
        }

        let squared = CIFilter.multiplyCompositing()
        squared.inputImage = edges
        squared.backgroundImage = edges
        guard let energyImage = squared.outputImage else { return 0.5 }

        guard let meanEnergy = averagePixelValue(energyImage) else { return 0.5 }
        // Empirically, mean edge-energy above ~0.02 (after downscale+grayscale)
        // reads as sharp; near 0 reads as very blurry. Map log-ish to 0...1.
        let normalized = min(1, meanEnergy / 0.03)
        return normalized
    }

    private static func exposureScore(for grayImage: CIImage) -> Double {
        guard let mean = averagePixelValue(grayImage) else { return 0.5 }
        // Triangular score peaking around mid-gray (0.45); very dark or
        // very bright (blown out / underexposed) photos score lower.
        let distanceFromIdeal = abs(mean - 0.45)
        let score = max(0, 1 - distanceFromIdeal / 0.45)
        return score
    }

    private static func averagePixelValue(_ image: CIImage) -> Double? {
        let averageFilter = CIFilter.areaAverage()
        averageFilter.inputImage = image
        averageFilter.extent = image.extent
        guard let output = averageFilter.outputImage else { return nil }

        var pixel = [UInt8](repeating: 0, count: 4)
        context.render(
            output,
            toBitmap: &pixel,
            rowBytes: 4,
            bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
            format: .RGBA8,
            colorSpace: CGColorSpaceCreateDeviceRGB()
        )
        return Double(pixel[0]) / 255.0
    }
}
