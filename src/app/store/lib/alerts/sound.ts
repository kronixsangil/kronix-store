// src/app/store/lib/alerts/sound.ts
"use client";

export type StoreSoundId =
  | "NEW_ORDER"
  | "PAYMENT_CONFIRMED"
  | "ORDER_CANCELLED"
  | "DRIVER_ARRIVED"
  | "TIMEOUT_SOON"
  | "GENERIC";

const SOUND_ENABLED_KEY = "ct_store_sound_enabled_v1";
const SOUND_VOLUME_KEY = "ct_store_sound_volume_v1";

const SOUND_SRC: Record<StoreSoundId, string> = {
  NEW_ORDER: "/Sounds/store/new-order.mp3",
  PAYMENT_CONFIRMED: "/Sounds/store/payment-confirmed.mp3",
  ORDER_CANCELLED: "/Sounds/store/order-cancelled.mp3",
  DRIVER_ARRIVED: "/Sounds/store/driver-arrived.mp3",
  TIMEOUT_SOON: "/Sounds/store/general-alert.mp3",
  GENERIC: "/Sounds/store/general-alert.mp3",
};

const audioMap = new Map<StoreSoundId, HTMLAudioElement>();

function getAudio(id: StoreSoundId): HTMLAudioElement | null {
  try {
    if (typeof window === "undefined") return null;

    const existing = audioMap.get(id);
    if (existing) return existing;

    const audio = new Audio(SOUND_SRC[id] || SOUND_SRC.GENERIC);
    audio.preload = "auto";

    audioMap.set(id, audio);
    return audio;
  } catch {
    return null;
  }
}

export function loadSoundEnabled(defaultValue = false): boolean {
  try {
    const raw = localStorage.getItem(SOUND_ENABLED_KEY);
    if (raw === null) return defaultValue;
    return raw === "1";
  } catch {
    return defaultValue;
  }
}

export function saveSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "1" : "0");
  } catch {}
}

export function loadSoundVolume(defaultValue = 0.6): number {
  try {
    const raw = localStorage.getItem(SOUND_VOLUME_KEY);
    const n = Number(raw);
    if (!Number.isFinite(n)) return defaultValue;
    return Math.max(0, Math.min(1, n));
  } catch {
    return defaultValue;
  }
}

export function saveSoundVolume(vol: number) {
  try {
    const v = Math.max(0, Math.min(1, Number(vol)));
    localStorage.setItem(SOUND_VOLUME_KEY, String(v));
  } catch {}
}

export async function unlockAudio(): Promise<boolean> {
  let ok = false;

  for (const id of Object.keys(SOUND_SRC) as StoreSoundId[]) {
    const audio = getAudio(id);
    if (!audio) continue;

    try {
      const prevVolume = audio.volume;
      const prevMuted = audio.muted;

      audio.volume = 0.0001;
      audio.muted = true;
      audio.currentTime = 0;

      try {
        await audio.play();
        audio.pause();
        ok = true;
      } catch {}

      audio.currentTime = 0;
      audio.volume = prevVolume;
      audio.muted = prevMuted;
    } catch {}
  }

  return ok;
}

export async function playSound(id: StoreSoundId, volume?: number) {
  try {
    const audio = getAudio(id);
    if (!audio) return;

    const vol =
      typeof volume === "number"
        ? Math.max(0, Math.min(1, volume))
        : loadSoundVolume(0.6);

    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = vol;

    await audio.play();
  } catch {
    // Algunos navegadores requieren interacción previa.
  }
}