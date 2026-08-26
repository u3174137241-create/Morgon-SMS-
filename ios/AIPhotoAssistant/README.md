# AI Photo Assistant (iOS)

A native iOS app: you tell it what you want in plain Swedish or English
("Ta alla bilder från Grekland och gör ett fint album"), and it finds,
analyzes, selects, organizes, and designs an album from your own Photos
library — entirely on-device.

This app was built inside a Linux CI container with **no Xcode/macOS
toolchain available**, so none of this code has been compiled or run in a
simulator. It was written carefully against Apple's documented Photos /
Vision / CoreLocation / SwiftData / PDFKit APIs, and reviewed by hand for
logic errors, but you should expect to fix the odd typo or API-signature
mismatch on first build in Xcode — treat this as a complete, real
implementation rather than a mockup, not as pre-verified.

## Requirements

- Xcode 16+, iOS 17+ deployment target
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`) — this repo ships source files and a `project.yml`, not a checked-in `.xcodeproj`, since generated Xcode project files are large, merge-unfriendly, and easy to regenerate.
- A physical device or simulator signed in with a Photos library that has some GPS-tagged photos, to exercise location search.

## Build

```sh
cd ios/AIPhotoAssistant
xcodegen generate
open AIPhotoAssistant.xcodeproj
```

Then set your team under **Signing & Capabilities** and run on a simulator
or device. On first launch you'll see a short privacy explainer, then the
system Photos permission prompt (the app requests `.readWrite` access
since it also writes generated albums back into Photos).

## Architecture

Each top-level folder is one module, matching the spec's module list:

| Folder | Responsibility |
|---|---|
| `App/` | App entry, root navigation, permission onboarding |
| `Chat/` | The primary chat UI + `ChatViewModel`, which drives everything else |
| `PhotoLibrary/` | PhotoKit authorization + asset/image fetching (the only module that touches `PHAsset` directly) |
| `PhotoMetadata/` | Cheap per-asset metadata extraction (date, GPS, screenshot flag, favorite, size) |
| `LocationDetection/` | Reverse geocoding (`CLGeocoder`) with caching, an offline gazetteer for common travel destinations, and trip/vacation clustering by date+distance |
| `PhotoAnalysis/` | On-device Vision + Core Image analysis: sharpness/exposure scoring, scene/object/face classification, near-duplicate detection via feature prints |
| `AIIntentParsing/` | Turns free-text chat messages into a structured `UserIntent` — a deterministic on-device rule engine (Swedish + English) behind an `IntentParsing` protocol, so a generative backend can be swapped in later |
| `AlbumGeneration/` | Orchestrates candidate-finding → analysis → selection → story ordering → title/style — the "AI does it" pipeline |
| `AlbumEditor/` | Manual editing (reorder, remove, add, cover, title, style) plus a text field that re-runs the same intent parser for "gör det mer lyxigt"-style edits |
| `Export/` | Save to Photos (new album referencing originals), PDF export, image export, native share sheet |
| `LocalStorage/` | SwiftData persistence for generated albums (IDs + text only — never image bytes) |
| `Settings/` | Permission status, privacy explainer, data management |

## Why some things are approximations, not fakes

Per the brief's rule against faking functionality, a few requests are
handled with an honest, documented approximation rather than something
that isn't really possible on iOS:

- **"Hitta bilder där jag ser bra ut"** — Vision has no concept of *who*
  the user is or of aesthetic beauty. The app uses `VNDetectFaceCaptureQualityRequest`,
  Apple's real per-face sharpness/lighting/framing quality score, as the
  closest honest proxy: it favors clear, well-lit, well-composed face
  shots, not a specific person's best angle.
- **"Mig och min partner"** — with no reference photo of "the partner",
  the selection engine favors two-face photos (typical couple framing)
  over group or solo shots. It's a heuristic, not identity recognition.
- **Natural-language understanding** is a real, deterministic on-device
  rule engine (keyword/regex matching + `NumberWords`/`DateRangeParser`
  helpers), not a call to a hosted LLM — no chat text ever leaves the
  device. `IntentParsing` is a protocol specifically so a generative
  on-device model (e.g. once Apple's Foundation Models framework is a
  viable deployment target) or an opt-in cloud API can be swapped in
  later without touching the chat UI or pipeline.

## Known limitations to revisit

- `CLGeocoder` is rate-limited by Apple; resolving locations for a very
  large, geographically scattered candidate set could hit that limit. The
  candidate cap (`PhotoFinder.maxCandidates`) and per-coordinate caching
  in `LocationResolver` keep normal usage well under it, but a stress
  test on a huge library is worth doing on a real device.
- The Gazetteer in `LocationDetection/Gazetteer.swift` covers the most
  common Swedish travel destinations; anything else falls back to a live
  `CLGeocoder.geocodeAddressString` lookup of the typed place name (never
  the device's actual location).
- Concurrency annotations (`Sendable`/`@MainActor`) are written for
  correctness but the project targets Swift 5 language mode, not Swift 6
  strict concurrency — worth an audit if you later opt into Swift 6.
