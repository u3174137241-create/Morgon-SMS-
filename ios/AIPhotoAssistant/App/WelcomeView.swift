import SwiftUI

struct WelcomeView: View {
    let onContinue: () async -> Void
    @State private var isRequesting = false

    var body: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Spacer()
            Image(systemName: "sparkles.rectangle.stack")
                .font(.system(size: 56))
                .foregroundStyle(Theme.Color.accent)
            Text("AI Photo Assistant")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
            Text("Berätta vilka bilder du letar efter — jag hittar, väljer ut och bygger vackra album åt dig.")
                .multilineTextAlignment(.center)
                .foregroundStyle(Theme.Color.subtleText)
                .padding(.horizontal, Theme.Spacing.lg)

            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                bullet("iphone", "Analys sker på din telefon — inga bilder laddas upp.")
                bullet("photo.on.rectangle", "Bara bilder som är relevanta för din förfrågan bearbetas.")
                bullet("lock", "Dina originalbilder ändras eller raderas aldrig.")
            }
            .padding(Theme.Spacing.md)
            .background(RoundedRectangle(cornerRadius: Theme.Radius.card, style: .continuous).fill(Theme.Color.surface))
            .padding(.horizontal, Theme.Spacing.lg)

            Spacer()

            Button {
                isRequesting = true
                Task {
                    await onContinue()
                    isRequesting = false
                }
            } label: {
                Text(isRequesting ? "Ber om åtkomst…" : "Kom igång")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Theme.Color.accent)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .disabled(isRequesting)
            .padding(.horizontal, Theme.Spacing.lg)
            .padding(.bottom, Theme.Spacing.lg)
        }
        .background(Theme.Color.background.ignoresSafeArea())
    }

    private func bullet(_ icon: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: Theme.Spacing.sm) {
            Image(systemName: icon).foregroundStyle(Theme.Color.accent).frame(width: 20)
            Text(text).font(.footnote)
            Spacer()
        }
    }
}
