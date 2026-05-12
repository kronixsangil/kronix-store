//src\app\pwa-register.tsx
"use client";

import { useEffect, useRef } from "react";
import { playSound } from "./store/lib/alerts/sound";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function registerStorePush() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidKey) {
    console.warn("[Store Push] Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    return false;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let permission = Notification.permission;

  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    console.warn("[Store Push] Permiso no concedido:", permission);
    return false;
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  const res = await fetch("/api/store/push/subscribe", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app: "store",
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[Store Push] subscribe failed:", res.status, text);
    return false;
  }

  console.log("[Store Push] Suscripción registrada correctamente");
  return true;
}

function playForegroundStorePushSound(payload: any) {
  const sound = String(payload?.sound ?? "").toLowerCase();

  if (sound.includes("new-order")) {
    void playSound("NEW_ORDER", 0.8);
    return;
  }

  if (sound.includes("payment")) {
    void playSound("PAYMENT_CONFIRMED", 0.8);
    return;
  }

  if (sound.includes("cancel")) {
    void playSound("ORDER_CANCELLED", 0.8);
    return;
  }

  if (sound.includes("driver-arrived")) {
    void playSound("DRIVER_ARRIVED", 0.8);
    return;
  }

  void playSound("GENERIC", 0.8);
}

export default function PwaRegister() {
  const registeredRef = useRef(false);
  const registeringRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("[Store PWA] Service Worker registrado");
      })
      .catch((err) => {
        console.error("[Store PWA] Error registrando SW:", err);
      });
  }, []);

  useEffect(() => {
    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "KRONIX_STORE_PUSH_FOREGROUND") return;
      playForegroundStorePushSound(event.data?.payload);
    };

    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    const onAuthReady = async () => {
      if (registeredRef.current || registeringRef.current) return;

      registeringRef.current = true;

      try {
        const ok = await registerStorePush();
        if (ok) {
          registeredRef.current = true;
        }
      } catch (err) {
        console.warn("[Store Push] No se pudo registrar:", err);
      } finally {
        registeringRef.current = false;
      }
    };

    window.addEventListener("kronix-store-auth-ready", onAuthReady);

    return () => {
      window.removeEventListener("kronix-store-auth-ready", onAuthReady);
    };
  }, []);

  return null;
}