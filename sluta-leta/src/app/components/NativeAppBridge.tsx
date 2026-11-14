"use client";

import { useEffect } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";

// Tar emot meddelanden från den native iOS/Android-appens WebView-skal (se
// mobile/App.tsx) — i praktiken bara ett Expo-pushtoken att registrera mot
// det inloggade kontot. Gör ingenting i en vanlig webbläsare, eftersom
// react-native-webview aldrig postar några meddelanden där.
export default function NativeAppBridge() {
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;

    function handleMessage(event: MessageEvent | Event) {
      // react-native-webview injicerar meddelandet med tomt ursprung (ingen
      // riktig cross-document postMessage-resa). Ett äkta cross-origin-fönster
      // (t.ex. en attacker-sida som öppnat oss via window.open och postar in
      // ett falskt expo-push-token för att kapa pushnotiser till inloggad
      // användare) har alltid ett annat, icke-tomt ursprung — avvisa det.
      const origin = (event as MessageEvent).origin;
      if (origin && origin !== window.location.origin) return;

      const data = (event as MessageEvent).data;
      if (typeof data !== "string") return;
      let parsed: { type?: string; token?: string } | null = null;
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }
      if (parsed?.type !== "expo-push-token" || !parsed.token) return;

      fetch("/api/push/expo-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: parsed.token }),
      }).catch(() => {});
    }

    // iOS använder window, Android kräver document — lyssna på båda.
    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage as EventListener);
    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleMessage as EventListener);
    };
  }, [user]);

  return null;
}
