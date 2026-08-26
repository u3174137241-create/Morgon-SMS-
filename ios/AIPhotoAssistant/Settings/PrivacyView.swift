import SwiftUI

struct PrivacyView: View {
    var body: some View {
        List {
            Section {
                privacyRow(icon: "iphone", title: "Allt sker på din telefon", text: "Bildanalys (skärpa, exponering, motiv, ansikten, dubbletter) körs helt på enheten med Apples Vision-ramverk. Inga bilder skickas till internet.")
                privacyRow(icon: "photo.on.rectangle", title: "Bara relevanta bilder bearbetas", text: "Appen laddar aldrig upp eller analyserar hela ditt bildbibliotek — bara de bilder som matchar det du frågar efter.")
                privacyRow(icon: "mappin.and.ellipse", title: "Platsdata stannar lokalt", text: "Platsnamn (t.ex. \"Grekland\") slås upp mot koordinater som redan finns i dina bilder. Endast textnamnet på platsen du skriver kan slås upp via Apples kartjänst — aldrig dina bilder eller din nuvarande position.")
                privacyRow(icon: "lock.doc", title: "Original ändras aldrig", text: "Genererade album refererar till dina befintliga bilder eller skapar separata exporter (PDF/bilder). Dina originalbilder tas aldrig bort, flyttas eller redigeras automatiskt.")
                privacyRow(icon: "square.and.arrow.down", title: "Du väljer export", text: "Album sparas bara i Bilder, Filer eller delas när du aktivt väljer det.")
            }
        }
        .navigationTitle("Integritet")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func privacyRow(icon: String, title: String, text: String) -> some View {
        HStack(alignment: .top, spacing: Theme.Spacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Theme.Color.accent)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.subheadline.weight(.semibold))
                Text(text).font(.footnote).foregroundStyle(Theme.Color.subtleText)
            }
        }
        .padding(.vertical, 4)
    }
}
