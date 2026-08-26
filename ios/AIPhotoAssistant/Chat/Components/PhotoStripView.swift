import SwiftUI

struct PhotoStripView: View {
    let photoIDs: [String]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.xs) {
                ForEach(photoIDs, id: \.self) { id in
                    AsyncPhotoThumbnail(photoID: id, targetSize: CGSize(width: 160, height: 160))
                        .frame(width: 76, height: 76)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.thumb, style: .continuous))
                }
            }
        }
    }
}
