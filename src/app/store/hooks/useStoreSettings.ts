//src\app\store\hooks\useStoreSettings.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRINT_PREFS,
  PrintPrefs,
  StoreAutoDecisionMode,
  StoreMe,
  StoreStateUI,
} from "../lib/storeTypes";
import {
  getStoreIconByName,
  loadPrintPrefs,
  savePrintPrefs,
} from "../lib/storeUtils";

function mapStoreStateFromMe(me: StoreMe | null): StoreStateUI {
  if (!me) return "ACTIVE";
  if (me.isActive === false) return "INACTIVE";
  if (me.isPaused === true) return "PAUSED";
  return "ACTIVE";
}

type Props = {
  storeFetch: <T>(path: string, init?: RequestInit, retry?: boolean) => Promise<T>;
  doLogout: () => Promise<void>;
  isUnauthorizedErrMessage: (msg: string) => boolean;
};

export function useStoreSettings({
  storeFetch,
  doLogout,
  isUnauthorizedErrMessage,
}: Props) {
  const [storeMe, setStoreMe] = useState<StoreMe | null>(null);
  const [autoMode, setAutoMode] = useState<StoreAutoDecisionMode>("AUTO_REJECT");
  const [autoMinutes, setAutoMinutes] = useState<number>(5);
  const [savingAuto, setSavingAuto] = useState(false);

  const [storeStateUI, setStoreStateUI] = useState<StoreStateUI>("ACTIVE");
  const [savingStoreState, setSavingStoreState] = useState(false);

  const [printPrefs, setPrintPrefs] = useState<PrintPrefs>({ ...DEFAULT_PRINT_PREFS });

  useEffect(() => {
    const pp = loadPrintPrefs();
    setPrintPrefs(pp);
  }, []);

  async function loadStoreMe() {
    try {
      const me = await storeFetch<StoreMe>(`/stores/me`, { method: "GET" });
      setStoreMe(me);
      setAutoMode(me.autoDecisionMode ?? "AUTO_REJECT");
      setAutoMinutes(Number(me.autoDecisionMinutes ?? 5));
      setStoreStateUI(mapStoreStateFromMe(me));
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return;
      }
      setStoreMe(null);
    }
  }

  async function saveAutoDecision() {
    if (savingAuto) return;
    setSavingAuto(true);

    try {
      const minutes = Math.max(1, Math.min(60, Math.round(Number(autoMinutes ?? 5))));
      const updated = await storeFetch<StoreMe>(`/stores/me/auto-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: autoMode, minutes }),
      });

      setStoreMe(updated);
      setAutoMode(updated.autoDecisionMode);
      setAutoMinutes(updated.autoDecisionMinutes);
      setStoreStateUI(mapStoreStateFromMe(updated));
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return;
      }
      throw e;
    } finally {
      setSavingAuto(false);
    }
  }

  async function saveStoreOperationalState(nextState: StoreStateUI) {
    if (savingStoreState) return;
    setSavingStoreState(true);

    try {
      const pausedReason =
        nextState === "PAUSED"
          ? "Pausada temporalmente desde la tablet de tienda"
          : null;

      const updated = await storeFetch<StoreMe>(`/stores/me/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: nextState,
          pausedReason,
        }),
      });

      setStoreMe(updated);
      setStoreStateUI(mapStoreStateFromMe(updated));
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return;
      }
      throw e;
    } finally {
      setSavingStoreState(false);
    }
  }

  function updatePrintPrefs(next: Partial<PrintPrefs>) {
    setPrintPrefs((p) => {
      const merged = { ...p, ...next };
      savePrintPrefs(merged);
      return merged;
    });
  }

  const storeName = useMemo(() => storeMe?.name || "TIENDA", [storeMe]);

  const userName = useMemo(() => {
    return (
      storeMe?.users?.find((u) => String((u as any)?.role ?? "").toUpperCase() === "STORE")?.name ??
      storeMe?.users?.[0]?.name ??
      "—"
    );
  }, [storeMe]);

  const storeIcon = useMemo(() => getStoreIconByName(storeName), [storeName]);

  const storeCityName = useMemo(() => {
    return String(storeMe?.city?.name ?? "").trim();
  }, [storeMe]);

  const storeCitySlug = useMemo(() => {
    return String(storeMe?.city?.slug ?? "").trim();
  }, [storeMe]);

  const storeCityDepartment = useMemo(() => {
    return String(storeMe?.city?.department ?? "").trim();
  }, [storeMe]);

  const storeCityLabel = useMemo(() => {
    if (storeCityName && storeCityDepartment) {
      return `${storeCityName}, ${storeCityDepartment}`;
    }
    if (storeCityName) return storeCityName;
    return "Establecimiento";
  }, [storeCityName, storeCityDepartment]);

  const storeImageUrl = useMemo(() => {
  const meAny = storeMe as any;

  const explicitImage = String(
    meAny?.imageMain ??
    meAny?.imageUrl ??
    meAny?.image ??
    meAny?.logoUrl ??
    meAny?.logo ??
    ""
  ).trim();

  if (explicitImage) return explicitImage;

  const storeCode = String(meAny?.storeCode ?? "").trim();
  if (!storeCode) return "";

  return `/images/stores/${storeCode}.png`;
}, [storeMe]);

  return {
    storeMe,
    setStoreMe,
    autoMode,
    setAutoMode,
    autoMinutes,
    setAutoMinutes,
    savingAuto,
    storeStateUI,
    savingStoreState,
    printPrefs,
    setPrintPrefs,

    storeName,
    userName,
    storeIcon,
    storeImageUrl,
    storeCityName,
    storeCitySlug,
    storeCityDepartment,
    storeCityLabel,

    loadStoreMe,
    saveAutoDecision,
    saveStoreOperationalState,
    updatePrintPrefs,
  };
}