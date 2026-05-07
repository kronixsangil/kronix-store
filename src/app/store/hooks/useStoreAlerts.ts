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
} from "../lib/alerts/sound";

type Props = {
  authChecked: boolean;
  accessToken: string;
  storeCode: string;
  waitingOrders: ApiOrder[];
  autoMinutes: number;
};

type OperationalSound = "NEW_ORDER" | "GENERIC" | "NONE";

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

  const prevWaitingIdsRef = useRef<Set<string>>(new Set());
  const timeoutWarnedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const se = loadSoundEnabled(false);
    setSoundEnabled(se);

    const sv = loadSoundVolume(0.6);
    setSoundVolumeState(sv);

    const ne = loadNotifyEnabled(false);
    setNotifyEnabled(ne);
  }, []);

  function resetAlertTracking() {
    prevWaitingIdsRef.current = new Set();
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
  }

  useEffect(() => {
    if (!authChecked) return;
    if (!accessToken?.trim()) return;
    if (!storeCode?.trim()) return;

    const currentIds = new Set(waitingOrders.map((o) => o.id));
    const prevIds = prevWaitingIdsRef.current;

    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevIds.has(id)) newIds.push(id);
    }

    prevWaitingIdsRef.current = currentIds;

    if (!newIds.length) return;

    if (soundEnabled) {
      playSound("NEW_ORDER", soundVolume);
    }

    if (notifyEnabled && typeof document !== "undefined" && document.hidden) {
      if (canNotify()) {
        const first = waitingOrders.find((o) => o.id === newIds[0]) ?? null;
        notify("🆕 Nuevo pedido", {
          body: first?.dropoffAddress ? `Entrega: ${first.dropoffAddress}` : "Tienes un pedido pendiente.",
        });
      }
    }
  }, [waitingOrders, authChecked, accessToken, storeCode, soundEnabled, soundVolume, notifyEnabled]);

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

        if (soundEnabled) {
          playSound("GENERIC", Math.min(1, Math.max(0.2, soundVolume)));
        }

        if (notifyEnabled && typeof document !== "undefined" && document.hidden) {
          if (canNotify()) {
            notify("⏳ Pedido por vencer", {
              body: `Faltan ~${Math.ceil(remaining / 1000)}s para auto-decisión.`,
            });
          }
        }
      }
    }
  }, [waitingOrders, autoMinutes, soundEnabled, soundVolume, notifyEnabled, authChecked, accessToken, storeCode]);

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
          body: "Te avisaremos de nuevos pedidos y timeouts.",
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