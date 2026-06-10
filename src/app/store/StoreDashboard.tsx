// app/store/StoreDashboard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { TabKey } from "./lib/storeTypes";
import { loadTab, saveTab } from "./lib/storeUtils";

import { useStoreAuth } from "./hooks/useStoreAuth";
import { useStoreOrders } from "./hooks/useStoreOrders";
import { useStoreAlerts } from "./hooks/useStoreAlerts";
import { useStoreEarnings } from "./hooks/useStoreEarnings";
import { useStoreSettings } from "./hooks/useStoreSettings";
import { useStoreProducts } from "./hooks/useStoreProducts";

import { StoreCityProvider } from "./components/context/StoreCityContext";
import StoreAuthScreen from "./components/auth/StoreAuthScreen";
import StoreDashboardHeader from "./components/layout/StoreDashboardHeader";
import OrdersTab from "./components/tabs/OrdersTab";
import ProductsTab from "./components/tabs/ProductsTab";
import EarningsTab from "./components/tabs/EarningsTab";
import SettingsTab from "./components/tabs/SettingsTab";
import ProfileTab from "./components/tabs/ProfileTab";
import RegisterTab from "./components/tabs/RegisterTab";

import { playSound } from "./lib/alerts/sound";
import StoreTermsModal from "./components/legal/StoreTermsModal";
import { getStoreLegalOverview } from "./lib/storeLegal";
import StorePrivacyModal from "./components/legal/StorePrivacyModal";
import StoreOperationalConsentModal from "./components/legal/StoreOperationalConsentModal";

const DRIVER_WAITING_STORAGE_KEY = "ct_store_driver_waiting_v1";
const STORE_NOTICE_STORAGE_KEY = "ct_store_notice_v1";

function shortOrderId(id?: string | null) {
  const clean = String(id ?? "").trim();
  if (!clean) return "------";
  return clean.slice(-6);
}

function getStoreActivationState(storeMe: any) {
  if (!storeMe) {
    return {
      finalActiveDone: false,
      statusLabel: "Cargando",
    };
  }

  const status = String(storeMe?.affiliateStatus ?? "PENDING_VISIT").toUpperCase();

  const docsApproved = Boolean(storeMe?.documentsApproved);
  const contractSigned = Boolean(storeMe?.contractSigned);

  const approved =
    status === "APPROVED" ||
    Boolean(storeMe?.approvedAt) ||
    Boolean(storeMe?.onboardingCompleted && docsApproved && contractSigned);

  const finalActiveDone =
  approved &&
  docsApproved &&
  contractSigned &&
  storeMe?.isActive === true;

  const statusLabel =
    status === "APPROVED"
      ? "Aprobado"
      : status === "VISITED"
        ? "Visitado"
        : status === "UNDER_REVIEW"
          ? "En revisión"
          : status === "DOCUMENTS_PENDING"
            ? "Documentos pendientes"
            : status === "REJECTED"
              ? "Rechazado"
              : "Pendiente visita";

  return {
    finalActiveDone,
    statusLabel,
  };
}

function loadDriverWaitingMap(): Record<
  string,
  {
    driverName?: string | null;
    driverPhone?: string | null;
    storeName?: string | null;
    updatedAt?: string | null;
  }
> {
  try {
    const raw = localStorage.getItem(DRIVER_WAITING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDriverWaitingMap(
  next: Record<
    string,
    {
      driverName?: string | null;
      driverPhone?: string | null;
      storeName?: string | null;
      updatedAt?: string | null;
    }
  >
) {
  try {
    localStorage.setItem(DRIVER_WAITING_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function persistDriverWaitingNotice(input: {
  orderId: string;
  driverName?: string | null;
  driverPhone?: string | null;
  storeName?: string | null;
  updatedAt?: string | null;
}) {
  const orderId = String(input.orderId ?? "").trim();
  if (!orderId) return;

  const next = {
    ...loadDriverWaitingMap(),
    [orderId]: {
      driverName: input.driverName ?? null,
      driverPhone: input.driverPhone ?? null,
      storeName: input.storeName ?? null,
      updatedAt: input.updatedAt ?? null,
    },
  };

  saveDriverWaitingMap(next);
}

function clearDriverWaitingNotice(orderId?: string | null) {
  const clean = String(orderId ?? "").trim();
  if (!clean) return;

  const next = { ...loadDriverWaitingMap() };
  delete next[clean];
  saveDriverWaitingMap(next);
}


function isValidKronixPassword(value: string) {
  const clean = String(value ?? "").trim();
  return clean.length >= 8 && /[a-zA-Z]/.test(clean) && /\d/.test(clean);
}

function StoreForcePasswordChangeScreen({
  storeName,
  storeCityLabel,
  storeFetch,
  onChanged,
  onLogout,
}: {
  storeName: string;
  storeCityLabel: string;
  storeFetch: <T>(path: string, init?: RequestInit, retry?: boolean) => Promise<T>;
  onChanged: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const hasMin = newPassword.trim().length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const matches = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    !saving &&
    currentPassword.trim().length > 0 &&
    isValidKronixPassword(newPassword) &&
    matches;

  async function submit() {
    setMsg(null);
    setErr(null);

    if (!isValidKronixPassword(newPassword)) {
      setErr("La nueva contraseña debe tener mínimo 8 caracteres y combinar letras y números. No necesita símbolos.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErr("La confirmación no coincide.");
      return;
    }

    setSaving(true);
    try {
      await storeFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      setMsg("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await onChanged();
    } catch (e: any) {
      setErr(e?.message || "No se pudo actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  }

  function Requirement({ ok, children }: { ok: boolean; children: ReactNode }) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={[
            "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-black",
            ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500",
          ].join(" ")}
        >
          {ok ? "✓" : "•"}
        </span>
        <span className={ok ? "text-emerald-800" : "text-slate-600"}>{children}</span>
      </div>
    );
  }

  return (
    <StoreCityProvider
      value={{
        cityId: null,
        citySlug: "",
        cityName: "",
        cityDepartment: "",
        cityCountry: "",
        cityLabel: storeCityLabel,
        hasCity: Boolean(storeCityLabel),
      }}
    >
      <main className="min-h-screen w-screen overflow-hidden ct-store-bg ct-tablet">
        <div className="flex h-screen w-screen items-center justify-center px-3 py-3">
          <div className="w-full max-w-[760px] overflow-hidden rounded-[26px] border border-white/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur">
            <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_54%,#475569_100%)] px-7 py-6 text-white">              
              <h1 className="mt-4 text-[28px] font-black leading-none">
                Cambio de contraseña requerido
              </h1>
              <p className="mt-3 max-w-[620px] text-[14px] font-semibold leading-6 text-white/75">
                Tu contraseña fue restablecida por KroniX. Debes cambiarla antes de continuar.
              </p>              
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-[12px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Requisitos
                </div>
                <div className="mt-3 space-y-2 text-sm font-bold">
                  <Requirement ok={hasMin}>Mínimo 8 caracteres</Requirement>
                  <Requirement ok={hasLetter}>Al menos una letra</Requirement>
                  <Requirement ok={hasNumber}>Al menos un número</Requirement>
                  <Requirement ok={matches}>Confirmación coincide</Requirement>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[12px] font-bold leading-5 text-amber-900">
                  Usa la contraseña temporal enviada por WhatsApp como contraseña actual.
                </div>
              </div>

              <div className="space-y-3">
                {err ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {err}
                  </div>
                ) : null}

                {msg ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {msg}
                  </div>
                ) : null}

                {[
                  {
                    label: "Contraseña temporal / actual",
                    value: currentPassword,
                    setValue: setCurrentPassword,
                    show: showCurrent,
                    setShow: setShowCurrent,
                    autoComplete: "current-password",
                  },
                  {
                    label: "Nueva contraseña",
                    value: newPassword,
                    setValue: setNewPassword,
                    show: showNew,
                    setShow: setShowNew,
                    autoComplete: "new-password",
                  },
                  {
                    label: "Confirmar nueva contraseña",
                    value: confirmPassword,
                    setValue: setConfirmPassword,
                    show: showConfirm,
                    setShow: setShowConfirm,
                    autoComplete: "new-password",
                  },
                ].map((field) => (
                  <div key={field.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[12px] font-black text-slate-800">{field.label}</div>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:bg-white">
                      <input
                        type={field.show ? "text" : "password"}
                        value={field.value}
                        onChange={(e) => field.setValue(e.target.value)}
                        placeholder={field.label.includes("Nueva") ? "Ej: Kronix123" : "••••••••"}
                        autoComplete={field.autoComplete}
                        className="w-full bg-transparent py-1 text-sm font-semibold text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => field.setShow((v) => !v)}
                        className="rounded-xl px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-100"
                      >
                        {field.show ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onLogout}
                    disabled={saving}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cerrar sesión
                  </button>

                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saving ? "Actualizando…" : "Actualizar contraseña"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </StoreCityProvider>
  );
}

function saveStoreNotice(input: {
  type:
    | "NEW_PENDING"
    | "PAYMENT_CONFIRMED"
    | "DRIVER_WAITING"
    | "READY_PICKUP"
    | "ORDER_EN_ROUTE"
    | "ORDER_DELIVERED";
  orderId?: string | null;
  message: string;
  updatedAt?: string | null;
}) {
  try {
    localStorage.setItem(
      STORE_NOTICE_STORAGE_KEY,
      JSON.stringify({
        type: input.type,
        orderId: input.orderId ?? null,
        message: input.message,
        updatedAt: input.updatedAt ?? new Date().toISOString(),
      })
    );
  } catch {}
}

export default function StoreDashboard() {
  const [tab, setTabState] = useState<TabKey>("ORDERS");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [operationalConsentAccepted, setOperationalConsentAccepted] = useState(false);
  const [checkingTerms, setCheckingTerms] = useState(true);

  const auth = useStoreAuth();

  const settings = useStoreSettings({
    storeFetch: auth.storeFetch,
    doLogout: auth.doLogout,
    isUnauthorizedErrMessage: auth.isUnauthorizedErrMessage,
  });

  const orders = useStoreOrders({
    storeCode: auth.storeCode,
    storeFetch: auth.storeFetch,
    doLogout: auth.doLogout,
    isUnauthorizedErrMessage: auth.isUnauthorizedErrMessage,
  });

  const products = useStoreProducts({
    storeFetch: auth.storeFetch,
    doLogout: auth.doLogout,
    isUnauthorizedErrMessage: auth.isUnauthorizedErrMessage,
  });

  const alerts = useStoreAlerts({
    authChecked: auth.authChecked,
    accessToken: auth.accessToken,
    storeCode: auth.storeCode,
    waitingOrders: orders.buckets.waiting,
    autoMinutes: settings.autoMinutes,
  });

  const earnings = useStoreEarnings({
    deliveredOrders: orders.buckets.delivered,
    storeCode: auth.storeCode,
  });

  const prevWaitingIdsRef = useRef<Set<string>>(new Set());
  const prevPreparingIdsRef = useRef<Set<string>>(new Set());
  const prevEnRouteIdsRef = useRef<Set<string>>(new Set());
  const prevDeliveredIdsRef = useRef<Set<string>>(new Set());

  const didInitWaitingRef = useRef(false);
  const didInitPreparingRef = useRef(false);
  const didInitEnRouteRef = useRef(false);
  const didInitDeliveredRef = useRef(false);

  useEffect(() => {
    const t = loadTab();
    setTabState(t);
  }, []);

  function setTabSafe(next: TabKey) {
    setTabState(next);
    saveTab(next);
  }

  async function handleLogout() {
    await auth.doLogout();
    alerts.resetAlertTracking();

    prevWaitingIdsRef.current = new Set();
    prevPreparingIdsRef.current = new Set();
    prevEnRouteIdsRef.current = new Set();
    prevDeliveredIdsRef.current = new Set();

    didInitWaitingRef.current = false;
    didInitPreparingRef.current = false;
    didInitEnRouteRef.current = false;
    didInitDeliveredRef.current = false;
  }

  async function handleRefresh() {
    await orders.load();
    await settings.loadStoreMe();
    await products.loadProducts();
  }

  async function refreshLegalStatus() {
    setCheckingTerms(true);

    try {
      const overview = await getStoreLegalOverview(auth.storeFetch);

      setTermsAccepted(overview.termsAccepted);
      setPrivacyAccepted(overview.privacyAccepted);
      setOperationalConsentAccepted(overview.operationalConsentAccepted);
    } catch {
      setTermsAccepted(false);
      setPrivacyAccepted(false);
      setOperationalConsentAccepted(false);
    } finally {
      setCheckingTerms(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!auth.authChecked) return;
      if (!auth.accessToken?.trim()) return;
      if (!auth.storeCode?.trim()) return;

      const accessOk = await auth.verifyStoreRole();
      if (!accessOk || cancelled) return;

      await refreshLegalStatus();
      if (cancelled) return;

      await orders.load();
      await settings.loadStoreMe();
      await products.loadProducts();
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [auth.authChecked, auth.accessToken, auth.storeCode]);

  useEffect(() => {
    if (!auth.authChecked) return;
    if (!auth.accessToken?.trim()) return;

    const ms = 7 * 60 * 1000;
    const id = window.setInterval(() => {
      auth.refreshStoreSession().catch(() => {
        handleLogout();
      });
    }, ms);

    return () => window.clearInterval(id);
  }, [auth.authChecked, auth.accessToken]);

  useEffect(() => {
    if (!auth.authChecked) return;
    if (!auth.accessToken?.trim()) return;

    const API_BASE = process.env.NEXT_PUBLIC_API || "http://localhost:3004";

    const realStoreId = String(settings.storeMe?.id ?? "").trim();
    const realStoreCode = String(auth.storeCode ?? "").trim();

    if (!realStoreId && !realStoreCode) return;

    const query = realStoreId
      ? `storeId=${encodeURIComponent(realStoreId)}`
      : `storeCode=${encodeURIComponent(realStoreCode)}`;

    const url = `${API_BASE}/events/stream?${query}`;
    const es = new EventSource(url, { withCredentials: true });

    let refreshTimer: number | null = null;

    function scheduleRefresh() {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        orders.load();
        settings.loadStoreMe();
        products.loadProducts();
      }, 250);
    }

    function handleDriverArrived(payload: any, orderId?: string) {
      const driverName = String(payload?.driverName ?? "").trim() || "El conductor";
      const driverPhone = String(payload?.driverPhone ?? "").trim() || null;
      const storeName =
        String(payload?.storeName ?? "").trim() ||
        settings.storeName ||
        "tu tienda";

      persistDriverWaitingNotice({
        orderId: String(orderId ?? ""),
        driverName,
        driverPhone,
        storeName,
        updatedAt:
          payload?.updatedAt != null ? String(payload.updatedAt) : new Date().toISOString(),
      });

      saveStoreNotice({
        type: "DRIVER_WAITING",
        orderId: String(orderId ?? ""),
        message: `${driverName} ya está esperando en tienda.`,
        updatedAt:
          payload?.updatedAt != null ? String(payload.updatedAt) : new Date().toISOString(),
      });

      alerts.fireOperationalAlert(
        "🛵 Conductor en tienda",
        `${driverName} ya está esperando en tienda.`,
        "DRIVER_ARRIVED"
      );
    }

    es.onmessage = async (event) => {
      try {
        const raw = String(event?.data ?? "").trim();
        if (!raw) return;
        if (raw === "[object Object]") return;

        const parsed = JSON.parse(raw) as any;
        const type = String(parsed?.type ?? "").trim();

        if (!type || type === "ping") return;

        if (type === "store.orders.changed") {
          scheduleRefresh();
          return;
        }

        if (type === "store.driver.arrived") {
          handleDriverArrived(parsed?.payload ?? null, parsed?.orderId);
          scheduleRefresh();
          return;
        }

        if (type === "order.updated") {
          const payloadStoreIds = Array.isArray(parsed?.payload?.storeIds)
            ? parsed.payload.storeIds.map((v: any) => String(v ?? "").trim()).filter(Boolean)
            : [];

          const flowStatus = String(parsed?.payload?.flowStatus ?? "").toUpperCase();
          const status = String(parsed?.payload?.status ?? "").toUpperCase();
          const eventOrderId = String(parsed?.orderId ?? parsed?.payload?.id ?? "").trim();

          if (payloadStoreIds.length > 0) {
            scheduleRefresh();

            if (
              eventOrderId &&
              (flowStatus === "EN_ROUTE" ||
                flowStatus === "DELIVERED" ||
                flowStatus === "CANCELLED" ||
                status === "EN_ROUTE" ||
                status === "DELIVERED" ||
                status === "CANCELLED")
            ) {
              clearDriverWaitingNotice(eventOrderId);
            }
          }

          return;
        }
      } catch {
        // ignorar heartbeats o mensajes no JSON
      }
    };

    es.onerror = () => {};

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      es.close();
    };
  }, [
    auth.authChecked,
    auth.accessToken,
    auth.storeCode,
    orders,
    settings,
    products,
    settings.storeMe?.id,
  ]);

  useEffect(() => {
    if (!auth.authChecked) return;
    if (!auth.accessToken?.trim()) return;
    if (!auth.storeCode?.trim()) return;

    const currentOrders = orders.buckets.waiting ?? [];
    const currentIds = new Set(currentOrders.map((o) => o.id));

    if (!didInitWaitingRef.current) {
      prevWaitingIdsRef.current = currentIds;
      didInitWaitingRef.current = true;
      return;
    }

    const prevIds = prevWaitingIdsRef.current;
    const newOrder = currentOrders.find((o) => !prevIds.has(o.id)) ?? null;

    prevWaitingIdsRef.current = currentIds;

    if (!newOrder) return;

    if (tab !== "ORDERS") {
      setTabSafe("ORDERS");
    }

    orders.setOrdersFilter("PENDING");
    orders.setSelectedOrderId(null);

    const orderId = String(newOrder.id ?? "").trim();
    const body = orderId
      ? `Nueva orden ${shortOrderId(orderId)} esperando confirmación.`
      : "Tienes una nueva orden pendiente.";

    saveStoreNotice({
      type: "NEW_PENDING",
      orderId: orderId || null,
      message: body,
      updatedAt: new Date().toISOString(),
    });

    alerts.fireOperationalAlert("🆕 Nuevo pedido", body, "NEW_ORDER");
  }, [
    auth.authChecked,
    auth.accessToken,
    auth.storeCode,
    alerts,
    orders.buckets.waiting,
    orders.setOrdersFilter,
    orders.setSelectedOrderId,
    tab,
  ]);

  useEffect(() => {
    if (!auth.authChecked) return;
    if (!auth.accessToken?.trim()) return;
    if (!auth.storeCode?.trim()) return;

    const currentPreparingOrders = orders.buckets.preparing ?? [];
    const currentIds = new Set(currentPreparingOrders.map((o) => o.id));

    if (!didInitPreparingRef.current) {
      prevPreparingIdsRef.current = currentIds;
      didInitPreparingRef.current = true;
      return;
    }

    const prevIds = prevPreparingIdsRef.current;
    const newPreparingOrder =
      currentPreparingOrders.find((o) => !prevIds.has(o.id)) ?? null;

    prevPreparingIdsRef.current = currentIds;

    if (!newPreparingOrder) return;

    if (tab !== "ORDERS") {
      setTabSafe("ORDERS");
    }

    orders.setOrdersFilter("PREPARING");
    orders.setSelectedOrderId(null);

    const orderId = String(newPreparingOrder.id ?? "").trim();
    const body = orderId
      ? `La orden ${shortOrderId(orderId)} ya está pagada. Puedes iniciar preparación.`
      : "Ya entró un pago confirmado. Puedes iniciar preparación.";

    saveStoreNotice({
      type: "PAYMENT_CONFIRMED",
      orderId: orderId || null,
      message: body,
      updatedAt: new Date().toISOString(),
    });

    alerts.fireOperationalAlert("💳 Pago confirmado", body, "PAYMENT_CONFIRMED");
  }, [
    auth.authChecked,
    auth.accessToken,
    auth.storeCode,
    alerts,
    orders.buckets.preparing,
    orders.setOrdersFilter,
    orders.setSelectedOrderId,
    tab,
  ]);

  useEffect(() => {
    if (!auth.authChecked) return;
    if (!auth.accessToken?.trim()) return;
    if (!auth.storeCode?.trim()) return;

    const currentOrders = orders.buckets.enRoute ?? [];
    const currentIds = new Set(currentOrders.map((o) => o.id));

    if (!didInitEnRouteRef.current) {
      prevEnRouteIdsRef.current = currentIds;
      didInitEnRouteRef.current = true;
      return;
    }

    const prevIds = prevEnRouteIdsRef.current;
    const newOrder = currentOrders.find((o) => !prevIds.has(o.id)) ?? null;

    prevEnRouteIdsRef.current = currentIds;

    if (!newOrder) return;

    if (tab !== "ORDERS") {
      setTabSafe("ORDERS");
    }

    orders.setOrdersFilter("EN_ROUTE");
    orders.setSelectedOrderId(null);

    if (alerts.soundEnabled) {
      void playSound("DRIVER_ARRIVED", alerts.soundVolume);
    }
  }, [
    auth.authChecked,
    auth.accessToken,
    auth.storeCode,
    alerts.soundEnabled,
    alerts.soundVolume,
    orders.buckets.enRoute,
    orders.setOrdersFilter,
    orders.setSelectedOrderId,
    tab,
  ]);

  useEffect(() => {
    if (!auth.authChecked) return;
    if (!auth.accessToken?.trim()) return;
    if (!auth.storeCode?.trim()) return;

    const currentOrders = orders.buckets.delivered ?? [];
    const currentIds = new Set(currentOrders.map((o) => o.id));

    if (!didInitDeliveredRef.current) {
      prevDeliveredIdsRef.current = currentIds;
      didInitDeliveredRef.current = true;
      return;
    }

    const prevIds = prevDeliveredIdsRef.current;
    const newOrder = currentOrders.find((o) => !prevIds.has(o.id)) ?? null;

    prevDeliveredIdsRef.current = currentIds;

    if (!newOrder) return;

    if (tab !== "ORDERS") {
      setTabSafe("ORDERS");
    }

    orders.setOrdersFilter("DELIVERED");
    orders.setSelectedOrderId(null);

    if (alerts.soundEnabled) {
      void playSound("GENERIC", alerts.soundVolume);
    }
  }, [
    auth.authChecked,
    auth.accessToken,
    auth.storeCode,
    alerts.soundEnabled,
    alerts.soundVolume,
    orders.buckets.delivered,
    orders.setOrdersFilter,
    orders.setSelectedOrderId,
    tab,
  ]);

  const cityContextValue = useMemo(() => {
    const city = settings.storeMe?.city ?? null;

    const cityId = city?.id ?? null;
    const citySlug = String(city?.slug ?? "").trim();
    const cityName = String(city?.name ?? "").trim();
    const cityDepartment = String(city?.department ?? "").trim();
    const cityCountry = String(city?.country ?? "").trim();

    const cityLabel =
      cityName && cityDepartment ? `${cityName}, ${cityDepartment}` : cityName || "";

    return {
      cityId,
      citySlug,
      cityName,
      cityDepartment,
      cityCountry,
      cityLabel,
      hasCity: Boolean(cityId || citySlug || cityName),
    };
  }, [settings.storeMe]);

  const storeActivation = useMemo(() => {
    return getStoreActivationState(settings.storeMe);
  }, [settings.storeMe]);

  const storeMustWaitActivation =
    auth.authChecked &&
    Boolean(auth.accessToken?.trim()) &&
    !auth.checkingRole &&
    !checkingTerms &&
    Boolean(settings.storeMe) &&
    !storeActivation.finalActiveDone;

  if (!auth.authChecked) {
    return (
      <main className="min-h-screen ct-store-bg ct-tablet">
        <div className="mx-auto flex min-h-screen ct-shell items-center justify-center px-3">
          <div className="w-full max-w-[520px] rounded-[20px] border border-white/70 bg-white/92 px-8 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="text-[22px] font-black leading-none text-slate-900">
              Cargando tienda…
            </div>
            <div className="mt-2 text-[13px] font-medium text-slate-600">
              Estamos validando tu sesión para abrir el panel correcto.
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (auth.authChecked && auth.accessToken?.trim() && auth.checkingRole) {
    return (
      <main className="min-h-screen ct-store-bg ct-tablet">
        <div className="mx-auto flex min-h-screen ct-shell items-center justify-center px-3">
          <div className="w-full max-w-[520px] rounded-[20px] border border-white/70 bg-white/92 px-8 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="text-[22px] font-black leading-none text-slate-900">
              Verificando acceso…
            </div>
            <div className="mt-2 text-[13px] font-medium text-slate-600">
              Estamos confirmando que esta cuenta pertenece a una tienda válida.
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (auth.authChecked && !auth.accessToken?.trim()) {
    return (
      <StoreAuthScreen
        authView={auth.authView}
        loginStoreCode={auth.loginStoreCode}
        setLoginStoreCode={auth.setLoginStoreCode}
        loginPassword={auth.loginPassword}
        setLoginPassword={auth.setLoginPassword}
        showPassword={auth.showPassword}
        setShowPassword={auth.setShowPassword}
        loggingIn={auth.loggingIn}
        loginErr={auth.loginErr}
        accessDeniedMessage={auth.accessDeniedMessage}
        doLogin={auth.doLogin}
        openForgot={auth.openForgot}
        forgotIdentifier={auth.forgotIdentifier}
        setForgotIdentifier={auth.setForgotIdentifier}
        forgotStep={auth.forgotStep}
        setForgotStep={auth.setForgotStep}
        forgotLoading={auth.forgotLoading}
        forgotMsg={auth.forgotMsg}
        forgotErr={auth.forgotErr}
        resetCode={auth.resetCode}
        setResetCode={auth.setResetCode}
        newPassword={auth.newPassword}
        setNewPassword={auth.setNewPassword}
        newPassword2={auth.newPassword2}
        setNewPassword2={auth.setNewPassword2}
        requestPasswordReset={auth.requestPasswordReset}
        confirmPasswordReset={auth.confirmPasswordReset}
        backToLogin={auth.backToLogin}
      />
    );
  }

  if (
    auth.authChecked &&
    auth.accessToken?.trim() &&
    !auth.checkingRole &&
    auth.mustChangePassword
  ) {
    return (
      <StoreForcePasswordChangeScreen
        storeName={settings.storeName}
        storeCityLabel={settings.storeCityLabel}
        storeFetch={auth.storeFetch}
        onLogout={handleLogout}
        onChanged={async () => {
          auth.setMustChangePassword(false);
          await auth.verifyStoreRole();
          await handleRefresh();
        }}
      />
    );
  }

  if (
    auth.authChecked &&
    auth.accessToken?.trim() &&
    !auth.checkingRole &&
    !checkingTerms &&
    !(termsAccepted && privacyAccepted && operationalConsentAccepted)
  ) {
    return (
      <StoreCityProvider value={cityContextValue}>
        <main className="min-h-screen w-screen overflow-hidden ct-store-bg ct-tablet">
          <div className="h-screen w-screen px-2 py-2">
            <div className="overflow-hidden rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.95)_100%)] shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur">
              <StoreDashboardHeader
                tab="PROFILE"
                setTabSafe={setTabSafe}
                storeName={settings.storeName}
                storeIcon={settings.storeIcon}
                storeImageUrl={settings.storeImageUrl}
                storeCityLabel={settings.storeCityLabel}
                inputStoreCode={auth.inputStoreCode}
                setInputStoreCode={auth.setInputStoreCode}
                applyStoreCode={auth.applyStoreCode}
                accessToken={auth.accessToken}
                soundEnabled={alerts.soundEnabled}
                toggleSound={alerts.toggleSound}
                testSound={alerts.testSound}
                notifyEnabled={alerts.notifyEnabled}
                toggleNotify={alerts.toggleNotify}
                onRefresh={handleRefresh}
                onLogout={handleLogout}
                soundVolume={alerts.soundVolume}
                setSoundVolumeState={alerts.setSoundVolumeState}
                storeStateUI={settings.storeStateUI}
                savingStoreState={settings.savingStoreState}
                saveStoreOperationalState={settings.saveStoreOperationalState}
                userName={settings.userName}
                pausedReason={settings.storeMe?.pausedReason ?? null}
                err={orders.err}
              />

              <div className="px-2 pb-2 pt-2">
                <div className="ct-tab-frame flex flex-col gap-3">
                  <div className="rounded-[20px] border border-white/60 bg-white/92 p-5 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                      Acción requerida
                    </div>

                    <h1 className="mt-2 text-[28px] font-black leading-none text-slate-950">
                      Aceptación legal pendiente
                    </h1>

                    <p className="mt-3 max-w-[720px] text-[14px] font-medium leading-6 text-slate-600">
                      Para operar en KroniX Store, recibir pedidos, administrar productos
                      y gestionar órdenes, debes revisar y aceptar los documentos legales
                      vigentes para comercios.
                    </p>
                  </div>
                </div>

                {!termsAccepted ? (
                  <StoreTermsModal
                    open
                    force
                    storeFetch={auth.storeFetch}
                    onClose={() => {}}
                    onAccepted={async () => {
                      await refreshLegalStatus();
                      setTabSafe("PROFILE");
                    }}
                  />
                ) : !privacyAccepted ? (
                  <StorePrivacyModal
                    open
                    force
                    storeFetch={auth.storeFetch}
                    onClose={() => {}}
                    onAccepted={async () => {
                      await refreshLegalStatus();
                      setTabSafe("PROFILE");
                    }}
                  />
                ) : !operationalConsentAccepted ? (
                  <StoreOperationalConsentModal
                    open
                    force
                    storeFetch={auth.storeFetch}
                    onClose={() => {}}
                    onAccepted={async () => {
                      await refreshLegalStatus();
                      setTabSafe("PROFILE");
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </StoreCityProvider>
    );
  }

  if (storeMustWaitActivation) {
    return (
      <StoreCityProvider value={cityContextValue}>
        <main className="min-h-screen w-screen overflow-hidden ct-store-bg ct-tablet">
          <div className="h-screen w-screen px-2 py-2">
            <div className="overflow-hidden rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.95)_100%)] shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur">
              <StoreDashboardHeader
                tab="REGISTER"
                setTabSafe={() => setTabSafe("REGISTER")}
                storeName={settings.storeName}
                storeIcon={settings.storeIcon}
                storeImageUrl={settings.storeImageUrl}
                storeCityLabel={settings.storeCityLabel}
                inputStoreCode={auth.inputStoreCode}
                setInputStoreCode={auth.setInputStoreCode}
                applyStoreCode={auth.applyStoreCode}
                accessToken={auth.accessToken}
                soundEnabled={alerts.soundEnabled}
                toggleSound={alerts.toggleSound}
                testSound={alerts.testSound}
                notifyEnabled={alerts.notifyEnabled}
                toggleNotify={alerts.toggleNotify}
                onRefresh={handleRefresh}
                onLogout={handleLogout}
                soundVolume={alerts.soundVolume}
                setSoundVolumeState={alerts.setSoundVolumeState}
                storeStateUI={settings.storeStateUI}
                savingStoreState={settings.savingStoreState}
                saveStoreOperationalState={settings.saveStoreOperationalState}
                userName={settings.userName}
                pausedReason={settings.storeMe?.pausedReason ?? null}
                err={orders.err}
              />

              <div className="px-2 pb-2 pt-2">
                <div className="mb-2 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-bold leading-6 text-amber-900">
                  Operación pendiente de activación KroniX. Estado actual:{" "}
                  <span className="font-black">{storeActivation.statusLabel}</span>. Por seguridad,
                  el panel operativo queda bloqueado hasta que CTCC registre documentos aprobados,
                  contrato firmado y aprobación final.
                </div>

                <RegisterTab
                  storeIcon={settings.storeIcon}
                  storeImageUrl={settings.storeImageUrl}
                  userName={settings.userName}
                  storeStateUI={settings.storeStateUI}
                  autoModeLabel={settings.autoMode === "AUTO_CONFIRM" ? "Auto-confirmar" : "Auto-cancelar"}
                  accessToken={auth.accessToken}
                  onRefresh={handleRefresh}
                  onLogout={handleLogout}
                  storeName={settings.storeName}
                  storeCityLabel={settings.storeCityLabel}
                  storeCitySlug={settings.storeCitySlug}
                  storeFetch={auth.storeFetch}
                  termsAccepted={termsAccepted}
                  privacyAccepted={privacyAccepted}
                  operationalConsentAccepted={operationalConsentAccepted}
                  checkingTerms={checkingTerms}
                  onLegalStatusChanged={refreshLegalStatus}
                />
              </div>
            </div>
          </div>
        </main>
      </StoreCityProvider>
    );
  }

  return (
    <StoreCityProvider value={cityContextValue}>
      <main className="min-h-screen w-screen overflow-hidden ct-store-bg ct-tablet">
        <div className="h-screen w-screen px-2 py-2">
          <div className="overflow-hidden rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.95)_100%)] shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur">
            <StoreDashboardHeader
              tab={tab}
              setTabSafe={setTabSafe}
              storeName={settings.storeName}
              storeIcon={settings.storeIcon}
              storeImageUrl={settings.storeImageUrl}
              storeCityLabel={settings.storeCityLabel}
              inputStoreCode={auth.inputStoreCode}
              setInputStoreCode={auth.setInputStoreCode}
              applyStoreCode={auth.applyStoreCode}
              accessToken={auth.accessToken}
              soundEnabled={alerts.soundEnabled}
              toggleSound={alerts.toggleSound}
              testSound={alerts.testSound}
              notifyEnabled={alerts.notifyEnabled}
              toggleNotify={alerts.toggleNotify}
              onRefresh={handleRefresh}
              onLogout={handleLogout}
              soundVolume={alerts.soundVolume}
              setSoundVolumeState={alerts.setSoundVolumeState}
              storeStateUI={settings.storeStateUI}
              savingStoreState={settings.savingStoreState}
              saveStoreOperationalState={settings.saveStoreOperationalState}
              userName={settings.userName}
              pausedReason={settings.storeMe?.pausedReason ?? null}
              err={orders.err}
            />

            <div className="px-2 pb-2 pt-2">
              {tab === "ORDERS" ? (
                <OrdersTab
                  ordersFilter={orders.ordersFilter}
                  setOrdersFilter={orders.setOrdersFilter}
                  buckets={orders.buckets}
                  loading={orders.loading}
                  ordersList={orders.ordersList}
                  selectedOrderId={orders.selectedOrderId}
                  setSelectedOrderId={orders.setSelectedOrderId}
                  selectedOrder={orders.selectedOrder}
                  storeCode={auth.storeCode}
                  busyId={orders.busyId}
                  rejectReasonByOrderId={orders.rejectReasonByOrderId}
                  setRejectReasonByOrderId={orders.setRejectReasonByOrderId}
                  openByOrderId={orders.openByOrderId}
                  setOpenByOrderId={orders.setOpenByOrderId}
                  onConfirm={orders.confirmOrder}
                  onReject={orders.rejectOrder}
                  onPreparing={orders.markPreparing}
                  printingId={orders.printingId}
                  storeStateUI={settings.storeStateUI}
                  savingStoreState={settings.savingStoreState}
                  saveStoreOperationalState={settings.saveStoreOperationalState}
                  onRefresh={handleRefresh}
                />
              ) : null}

              {tab === "PRODUCTS" ? (
                <ProductsTab
                  products={products.products}
                  loading={products.loading}
                  err={products.err}
                  saving={products.saving}
                  deletingId={products.deletingId}
                  permissions={settings.storeMe}
                  onRefresh={products.loadProducts}
                  onCreate={products.createProduct}
                  onUpdate={products.updateProduct}
                  onDelete={products.deleteProduct}
                />
              ) : null}

              {tab === "EARNINGS" ? (
                <EarningsTab
                  earningsScope={earnings.earningsScope}
                  setEarningsScope={earnings.setEarningsScope}
                  earnings={earnings.earnings}
                />
              ) : null}

              {tab === "SETTINGS" ? (
                <SettingsTab
                  savingAuto={settings.savingAuto}
                  saveAutoDecision={settings.saveAutoDecision}
                  autoMode={settings.autoMode}
                  setAutoMode={settings.setAutoMode}
                  autoMinutes={settings.autoMinutes}
                  setAutoMinutes={settings.setAutoMinutes}
                  printPrefs={settings.printPrefs}
                  updatePrintPrefs={settings.updatePrintPrefs}
                  storeIcon={settings.storeIcon}
                  userName={settings.userName}
                  storeStateUI={settings.storeStateUI}
                  autoModeLabel={settings.autoMode === "AUTO_CONFIRM" ? "Auto-confirmar" : "Auto-cancelar"}
                  accessToken={auth.accessToken}
                  onRefresh={handleRefresh}
                  onLogout={handleLogout}
                  storeName={settings.storeName}
                  storeCityLabel={settings.storeCityLabel}
                  storeCitySlug={settings.storeCitySlug}
                  soundEnabled={alerts.soundEnabled}
                  toggleSound={alerts.toggleSound}
                  testSound={alerts.testSound}
                  notifyEnabled={alerts.notifyEnabled}
                  toggleNotify={alerts.toggleNotify}
                  soundVolume={alerts.soundVolume}
                  setSoundVolumeState={alerts.setSoundVolumeState}
                  storeMe={settings.storeMe}
paymentInfoDraft={settings.paymentInfoDraft}
setPaymentInfoDraft={settings.setPaymentInfoDraft}
savingPaymentInfo={settings.savingPaymentInfo}
paymentInfoMsg={settings.paymentInfoMsg}
savePaymentInfo={settings.savePaymentInfo}
                />
              ) : null}

              {tab === "REGISTER" ? (
                <RegisterTab
                  storeIcon={settings.storeIcon}
                  storeImageUrl={settings.storeImageUrl}
                  userName={settings.userName}
                  storeStateUI={settings.storeStateUI}
                  autoModeLabel={settings.autoMode === "AUTO_CONFIRM" ? "Auto-confirmar" : "Auto-cancelar"}
                  accessToken={auth.accessToken}
                  onRefresh={handleRefresh}
                  onLogout={handleLogout}
                  storeName={settings.storeName}
                  storeCityLabel={settings.storeCityLabel}
                  storeCitySlug={settings.storeCitySlug}
                  storeFetch={auth.storeFetch}
                  termsAccepted={termsAccepted}
                  privacyAccepted={privacyAccepted}
                  operationalConsentAccepted={operationalConsentAccepted}
                  checkingTerms={checkingTerms}
                  onLegalStatusChanged={refreshLegalStatus}
                />
              ) : null}

              {tab === "PROFILE" ? (
                <ProfileTab
                  storeIcon={settings.storeIcon}
                  storeImageUrl={settings.storeImageUrl}
                  userName={settings.userName}
                  storeStateUI={settings.storeStateUI}
                  autoModeLabel={settings.autoMode === "AUTO_CONFIRM" ? "Auto-confirmar" : "Auto-cancelar"}
                  accessToken={auth.accessToken}
                  onRefresh={handleRefresh}
                  onLogout={handleLogout}
                  storeName={settings.storeName}
                  storeCityLabel={settings.storeCityLabel}
                  storeCitySlug={settings.storeCitySlug}
                  storeFetch={auth.storeFetch}
                  termsAccepted={termsAccepted}
                  privacyAccepted={privacyAccepted}
                  operationalConsentAccepted={operationalConsentAccepted}
                  checkingTerms={checkingTerms}
                  onLegalStatusChanged={refreshLegalStatus}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </StoreCityProvider>
  );
}