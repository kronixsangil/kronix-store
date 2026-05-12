//src\app\store\hooks\useStoreAlerts.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { ApiOrder } from "../lib/storeTypes";
import {
  canNotify,
  loadNotifyEnabled,
  notify,
  requestNotifyPermission,
  saveNotifyEnabled,
} from "../lib/alerts/notify";
import {
  loadSoundEnabled,
  loadSoundVolume,
  playSound,
  saveSoundEnabled,
  saveSoundVolume,
  unlockAudio,
  type StoreSoundId,
} from "../lib/alerts/sound";

type Props = {
  authChecked: boolean;
  accessToken: string;
  storeCode: string;
  waitingOrders: ApiOrder[];
  autoMinutes: number;
};

type OperationalSound = StoreSoundId | "NONE";

export function useStoreAlerts({
  authChecked,
  accessToken,
  storeCode,
  waitingOrders,
  autoMinutes,
}: Props) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [soundVolume, setSoundVolumeState] = useState<number>(0.6);
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(false);

  const timeoutWarnedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setSoundEnabled(loadSoundEnabled(false));
    setSoundVolumeState(loadSoundVolume(0.6));
    setNotifyEnabled(loadNotifyEnabled(false));
  }, []);

  function resetAlertTracking() {
    timeoutWarnedRef.current = new Set();
  }

  async function fireOperationalAlert(
    title: string,
    body: string,
    soundKind: OperationalSound = "GENERIC"
  ) {
    if (soundEnabled && soundKind !== "NONE") {
      await unlockAudio();
      await playSound(soundKind, soundVolume);
    }

    if (notifyEnabled && canNotify()) {
      notify(title, { body });
    }

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([120, 60, 120]);
      }
    } catch {}
  }

  useEffect(() => {
    if (!authChecked) return;
    if (!accessToken?.trim()) return;
    if (!storeCode?.trim()) return;
    if (!waitingOrders.length) return;

    const now = Date.now();
    const msLimit = Math.max(1, Math.round(Number(autoMinutes ?? 5))) * 60 * 1000;
    const warnMs = 90 * 1000;

    for (const o of waitingOrders) {
      const id = o.id;
      if (timeoutWarnedRef.current.has(id)) continue;

      const createdAt = Date.parse(String(o.createdAt ?? ""));
      if (!Number.isFinite(createdAt)) continue;

      const expiresAt = createdAt + msLimit;
      const remaining = expiresAt - now;

      if (remaining > 0 && remaining <= warnMs) {
        timeoutWarnedRef.current.add(id);

        fireOperationalAlert(
          "⏳ Pedido por vencer",
          `Faltan ~${Math.ceil(remaining / 1000)}s para auto-decisión.`,
          "TIMEOUT_SOON"
        );
      }
    }
  }, [waitingOrders, autoMinutes, authChecked, accessToken, storeCode, soundEnabled, soundVolume, notifyEnabled]);

  async function toggleSound() {
    const next = !soundEnabled;

    if (next) {
      await unlockAudio();
      saveSoundEnabled(true);
      setSoundEnabled(true);
      playSound("GENERIC", soundVolume);
    } else {
      saveSoundEnabled(false);
      setSoundEnabled(false);
    }
  }

  async function testSound() {
    await unlockAudio();
    playSound("GENERIC", soundVolume);
  }

  async function toggleNotify() {
    const next = !notifyEnabled;

    if (next) {
      const p = await requestNotifyPermission();

      if (p === "granted") {
        saveNotifyEnabled(true);
        setNotifyEnabled(true);

        notify("✅ Notificaciones activadas", {
          body: "Te avisaremos de nuevos pedidos, pagos y llegada de conductores.",
        });
      } else {
        saveNotifyEnabled(false);
        setNotifyEnabled(false);
      }
    } else {
      saveNotifyEnabled(false);
      setNotifyEnabled(false);
    }
  }

  useEffect(() => {
    saveSoundVolume(soundVolume);
  }, [soundVolume]);

  return {
    soundEnabled,
    setSoundEnabled,
    soundVolume,
    setSoundVolumeState,
    notifyEnabled,
    setNotifyEnabled,
    toggleSound,
    testSound,
    toggleNotify,
    resetAlertTracking,
    fireOperationalAlert,
  };
}