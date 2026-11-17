"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

// Visas för inloggade användare som ännu inte svarat på push-notis-frågan.
// Döljs permanent (den här webbläsaren) om man stänger den eller tackar nej,
// så vi inte tjatar varje sidladdning.
//
// På iPhone stödjer Safari webbpush bara när sidan körs som en installerad
// PWA (hemskärmsgenväg), aldrig i en vanlig flik — därför finns ett separat
// steg här som visar hur man lägger till appen på hemskärmen innan
// "Aktivera notiser" ens blir möjligt att visa för de användarna.
export default function PushNotificationPrompt({ userId }: { userId: string | null }) {
  const [visible, setVisible] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);

  useEffect(() => {
    if (!userId) return;

    if (isIosDevice() && !isStandalonePwa()) {
      if (localStorage.getItem("iosInstallHintDismissed") !== "1") {
        setShowIosInstallHint(true);
      }
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("pushPromptDismissed") === "1") return;
    setVisible(true);
  }, [userId]);

  function dismissIosHint() {
    localStorage.setItem("iosInstallHintDismissed", "1");
    setShowIosInstallHint(false);
  }

  async function enable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismiss();
        return;
      }

      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) {
        dismiss();
        return;
      }
      const { publicKey } = await keyRes.json();

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
    } catch (err) {
      console.error("[push] kunde inte aktivera notiser", err);
    } finally {
      setVisible(false);
    }
  }

  function dismiss() {
    localStorage.setItem("pushPromptDismissed", "1");
    setVisible(false);
  }

  if (showIosInstallHint) {
    return (
      <div className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-sm flex-col gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-lg sm:bottom-6">
        <div className="flex items-start gap-3">
          <span className="text-xl">📲</span>
          <p className="flex-1 text-xs text-gray-600">
            Vill du få notiser om bud och meddelanden på iPhone? Lägg till Sluta Leta på hemskärmen: tryck på
            dela-ikonen (rutan med pil uppåt) längst ner i Safari och välj <strong>Lägg till på hemskärmen</strong>.
            Öppna sedan appen därifrån för att kunna aktivera notiser.
          </p>
        </div>
        <button onClick={dismissIosHint} className="self-end text-xs font-medium text-gray-400">
          Stäng
        </button>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-lg sm:bottom-6">
      <span className="text-xl">🔔</span>
      <p className="flex-1 text-xs text-gray-600">Få en notis direkt när du får ett nytt bud eller meddelande.</p>
      <div className="flex gap-2">
        <button onClick={dismiss} className="text-xs font-medium text-gray-400">
          Nej tack
        </button>
        <button onClick={enable} className="btn-primary !px-3 !py-1.5 text-xs">
          Aktivera
        </button>
      </div>
    </div>
  );
}
