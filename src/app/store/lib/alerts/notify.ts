// src/app/store/lib/alerts/notify.ts
"use client";

const NOTIFY_ENABLED_KEY = "ct_store_notify_enabled_v1";

export function loadNotifyEnabled(defaultValue = false): boolean {
  try {
    const raw = localStorage.getItem(NOTIFY_ENABLED_KEY);
    if (raw === null) return defaultValue;
    return raw === "1";
  } catch {
    return defaultValue;
  }
}

export function saveNotifyEnabled(enabled: boolean) {
  try {
    localStorage.setItem(NOTIFY_ENABLED_KEY, enabled ? "1" : "0");
  } catch {}
}

export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  try {
    if (typeof window === "undefined") return "unsupported";
    if (!("Notification" in window)) return "unsupported";
    const p = await Notification.requestPermission();
    return p;
  } catch {
    return "unsupported";
  }
}

export function canNotify(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    return Notification.permission === "granted";
  } catch {
    return false;
  }
}

export function notify(title: string, options?: NotificationOptions) {
  try {
    if (!canNotify()) return;
    new Notification(title, options);
  } catch {
    // ignore
  }
}