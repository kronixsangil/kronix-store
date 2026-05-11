//src\app\pwa-register.tsx
"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("[Store PWA] Service Worker registrado");
      })
      .catch((err) => {
        console.error("[Store PWA] Error registrando SW:", err);
      });
  }, []);

  return null;
}