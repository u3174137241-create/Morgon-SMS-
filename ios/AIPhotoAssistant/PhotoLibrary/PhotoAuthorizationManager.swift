import Photos
import Combine

/// Owns the single source of truth for the app's Photos permission state.
/// We request `.readWrite` because export writes generated albums back into
/// Photos; we never need to modify or delete the user's original assets.
@MainActor
final class PhotoAuthorizationManager: ObservableObject {
    @Published private(set) var status: PHAuthorizationStatus

    init() {
        status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    }

    var isAuthorized: Bool {
        status == .authorized || status == .limited
    }

    var isDenied: Bool {
        status == .denied || status == .restricted
    }

    @discardableResult
    func requestAccessIfNeeded() async -> PHAuthorizationStatus {
        let current = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        if current != .notDetermined {
            status = current
            return current
        }
        let newStatus = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        status = newStatus
        return newStatus
    }

    func refresh() {
        status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    }

    nonisolated static func currentStatusIsNotDetermined() -> Bool {
        PHPhotoLibrary.authorizationStatus(for: .readWrite) == .notDetermined
    }
}
