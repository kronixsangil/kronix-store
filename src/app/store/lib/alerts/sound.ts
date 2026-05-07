// src/app/store/lib/alerts/sound.ts
"use client";

type SoundId = "NEW_ORDER" | "TIMEOUT_SOON" | "ASSIGNED" | "GENERIC";

const SOUND_ENABLED_KEY = "ct_store_sound_enabled_v1";
const SOUND_VOLUME_KEY = "ct_store_sound_volume_v1";

let audioCtx: AudioContext | null = null;
let htmlAudioNewOrder: HTMLAudioElement | null = null;
let htmlAudioNotify: HTMLAudioElement | null = null;

function getCtx(): AudioContext | null {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

function getNewOrderAudio(): HTMLAudioElement | null {
  try {
    if (typeof window === "undefined") return null;
    if (!htmlAudioNewOrder) {
      htmlAudioNewOrder = new Audio("/Sounds/new-order.mp3");
      htmlAudioNewOrder.preload = "auto";
    }
    return htmlAudioNewOrder;
  } catch {
    return null;
  }
}

function getNotifyAudio(): HTMLAudioElement | null {
  try {
    if (typeof window === "undefined") return null;
    if (!htmlAudioNotify) {
      htmlAudioNotify = new Audio("/Sounds/notify.mp3");
      htmlAudioNotify.preload = "auto";
    }
    return htmlAudioNotify;
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

/**
 * Debe llamarse por click/tap del usuario para que el navegador permita audio.
 */
export async function unlockAudio(): Promise<boolean> {
  let unlocked = false;

  try {
    const ctx = getCtx();
    if (ctx) {
      if (ctx.state === "suspended") await ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
      unlocked = true;
    }
  } catch {}

  async function primeAudio(audio: HTMLAudioElement | null) {
    if (!audio) return false;

    try {
      const prevVol = audio.volume;
      const prevMuted = audio.muted;

      audio.volume = 0.0001;
      audio.muted = true;
      audio.currentTime = 0;

      try {
        await audio.play();
        audio.pause();
      } catch {}

      audio.currentTime = 0;
      audio.volume = prevVol;
      audio.muted = prevMuted;
      return true;
    } catch {
      return false;
    }
  }

  try {
    const ok1 = await primeAudio(getNewOrderAudio());
    const ok2 = await primeAudio(getNotifyAudio());
    if (ok1 || ok2) unlocked = true;
  } catch {}

  return unlocked;
}

function patternFor(id: SoundId) {
  if (id === "NEW_ORDER") {
    return [
      { f: 880, ms: 200 },
      { f: 660, ms: 180 },
      { f: 950, ms: 240 },
      { f: 660, ms: 180 },
      { f: 880, ms: 400 },
    ];
  }
  if (id === "TIMEOUT_SOON") {
    return [
      { f: 520, ms: 120 },
      { f: 520, ms: 120 },
    ];
  }
  if (id === "ASSIGNED") {
    return [
      { f: 990, ms: 120 },
      { f: 990, ms: 120 },
      { f: 740, ms: 160 },
    ];
  }
  return [{ f: 700, ms: 120 }];
}

async function playHtmlAudio(
  audio: HTMLAudioElement | null,
  volume?: number
): Promise<boolean> {
  try {
    if (!audio) return false;

    const vol =
      typeof volume === "number" ? Math.max(0, Math.min(1, volume)) : loadSoundVolume(0.6);

    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = vol;

    await audio.play();
    return true;
  } catch {
    return false;
  }
}

async function playSynthSound(id: SoundId, volume?: number) {
  const ctx = getCtx();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") await ctx.resume();

    const vol =
      typeof volume === "number" ? Math.max(0, Math.min(1, volume)) : loadSoundVolume(0.6);

    const steps = patternFor(id);

    let t = ctx.currentTime + 0.01;

    for (const s of steps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = s.f;

      gain.gain.setValueAtTime(0.00001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.00001, vol), t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.00001, t + s.ms / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + s.ms / 1000);

      t += s.ms / 1000 + 0.03;
    }
  } catch {
    // silencioso
  }
}

export async function playSound(id: SoundId, volume?: number) {
  if (id === "NEW_ORDER") {
    const played = await playHtmlAudio(getNewOrderAudio(), volume);
    if (played) return;
    await playSynthSound(id, volume);
    return;
  }

  if (id === "GENERIC" || id === "TIMEOUT_SOON" || id === "ASSIGNED") {
    const played = await playHtmlAudio(getNotifyAudio(), volume);
    if (played) return;
    await playSynthSound(id, volume);
    return;
  }

  await playSynthSound(id, volume);
}