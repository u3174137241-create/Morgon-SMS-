# AI Lead Hunter — mobile app

A companion Expo/React Native app for the [AI Lead Hunter](../README.md)
dashboard, in the same beige/white/gold design. It talks to the same
backend over the same REST API as the web dashboard — no separate backend,
no separate database.

**Important:** this app is a *client*. The actual search/AI/scheduler
backend (SQLite, source adapters, scoring, Telegram) still needs to be
running on a computer — see the [main README](../README.md). The phone
only displays data from, and sends commands to, that backend.

## Quickstart

```bash
cd mobile
npm install
npx expo start
```

This prints a QR code. Install **Expo Go** from the App Store / Play Store
on your phone, then scan the QR code (Camera app on iOS, Expo Go's scanner
on Android). The app opens on your phone.

On first launch you'll see a **connect screen** asking for your server's
address. Find your computer's local IP address:

- macOS/Linux: `ifconfig | grep inet`
- Windows: `ipconfig`

Then enter e.g. `http://192.168.1.23:3100` (use the `PORT` from your
backend's `.env`, default `3100`). Your phone and computer must be on the
**same WiFi network** (or reachable via a VPN like Tailscale). If you set
`APP_PASSWORD` in the backend's `.env`, enter it on the same screen.

You can also open the dashboard as a plain web page from your phone's
browser at the same address and tap "Add to Home Screen" — see the PWA
section in the [main README](../README.md) if you'd rather skip Expo
entirely.

## What works

Everything the web dashboard does: live stats, search-run history, source
health, the full leads list with filters and status actions (Sold /
Contacted / Reviewed / Discard), notification history, and settings
(categories, locations, thresholds, search intensity, Telegram toggle).

## Notifications — what to actually expect

The app polls the backend's notification history and shows a **local**
notification on your phone when a new hot/warm lead comes in — but only
while the app is open or has just been reopened. This is not remote push:
**the phone will not buzz while the app is fully closed.**

If you need a guaranteed alert even when the app isn't running, keep
Telegram configured on the backend (`.env` → `TELEGRAM_BOT_TOKEN` /
`TELEGRAM_CHAT_ID`) — that's the reliable channel. The in-app notifications
here are a convenience layered on top, not a replacement. (True background
push would require a custom Expo dev build wired up to send push tokens to
the backend and call Expo's push API — a bigger project not included here.)

## Building a real installable app (optional, later)

Running via Expo Go (above) is the fastest way to use this on your phone
day-to-day and needs nothing beyond `npx expo start`. If you'd rather have
a standalone app icon on your home screen that doesn't need Expo Go
running:

```bash
npx eas-cli login       # free Expo account
npx eas-cli build --platform android --profile preview
# or: --platform ios (requires an Apple developer account for a real device)
```

This is an Expo Application Services (EAS) build — it's free for
occasional personal builds, but does require creating an Expo account and
is not something this project sets up automatically.

## Troubleshooting

- **"Kunde inte nå servern"** — confirm the backend is running
  (`npm run dev` in the project root) and that your phone is on the same
  network. Try opening the same `http://IP:PORT/api/health` URL in your
  phone's browser first — if that fails, it's a network/firewall issue,
  not the app.
- **Fel lösenord** — must match `APP_PASSWORD` in the backend's `.env`
  exactly (leave blank on both sides if you didn't set one).
- **Notifications never appear** — check "Tillåt notiser" under
  Inställningar was granted, and remember they only fire while the app is
  open (see above).
- **Expo Go says the app needs a newer/older SDK** — this project targets
  Expo SDK 57; update Expo Go from the app store to match, or run
  `npx expo install --check` here to align dependency versions.
