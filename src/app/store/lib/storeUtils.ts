// app/store/lib/storeUtils.ts
import {
  ApiOrder,
  PrintPrefs,
  DEFAULT_PRINT_PREFS,
  PRINT_PREFS_KEY,
  STORE_CODE_KEY,
  STORE_TAB_KEY,
  STORE_TOKEN_KEY,
  PLATFORM_COMMISSION_RATE,
  TabKey,
} from "./storeTypes";

export function formatCOP(value: number) {
  return value.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

export function normFlow(x?: string | null) {
  return String(x ?? "").trim().toUpperCase();
}
export function normStatus(x?: string | null) {
  return String(x ?? "").trim().toUpperCase();
}

export function loadStoreCode(): string {
  try {
    return localStorage.getItem(STORE_CODE_KEY) || "1";
  } catch {
    return "1";
  }
}
export function saveStoreCode(code: string) {
  try {
    localStorage.setItem(STORE_CODE_KEY, code);
  } catch {}
}

export function loadTab(): TabKey {
  try {
    const v = String(localStorage.getItem(STORE_TAB_KEY) || "ORDERS").toUpperCase();
    if (v === "PRODUCTS") return "PRODUCTS";
    if (v === "EARNINGS") return "EARNINGS";
    if (v === "SETTINGS") return "SETTINGS";
    if (v === "PROFILE") return "PROFILE";
    return "ORDERS";
  } catch {
    return "ORDERS";
  }
}
export function saveTab(tab: TabKey) {
  try {
    localStorage.setItem(STORE_TAB_KEY, tab);
  } catch {}
}

export function loadStoreToken(): string {
  try {
    return localStorage.getItem(STORE_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}
export function saveStoreToken(token: string) {
  try {
    localStorage.setItem(STORE_TOKEN_KEY, token);
  } catch {}
}
export function clearStoreToken() {
  try {
    localStorage.removeItem(STORE_TOKEN_KEY);
  } catch {}
}

export function loadPrintPrefs(): PrintPrefs {
  try {
    const raw = localStorage.getItem(PRINT_PREFS_KEY);
    if (!raw) return { ...DEFAULT_PRINT_PREFS };
    const parsed = JSON.parse(raw);
    const next: PrintPrefs = {
      paper: parsed?.paper === "58MM" ? "58MM" : "80MM",
      showLogo: Boolean(parsed?.showLogo ?? DEFAULT_PRINT_PREFS.showLogo),
      showDropoff: Boolean(parsed?.showDropoff ?? DEFAULT_PRINT_PREFS.showDropoff),
      showCustomerNote: Boolean(parsed?.showCustomerNote ?? DEFAULT_PRINT_PREFS.showCustomerNote),
      showPrices: Boolean(parsed?.showPrices ?? DEFAULT_PRINT_PREFS.showPrices),
      showPayment: Boolean(parsed?.showPayment ?? DEFAULT_PRINT_PREFS.showPayment),
      autoPrintOnConfirm: Boolean(parsed?.autoPrintOnConfirm ?? DEFAULT_PRINT_PREFS.autoPrintOnConfirm),
    };
    return next;
  } catch {
    return { ...DEFAULT_PRINT_PREFS };
  }
}
export function savePrintPrefs(p: PrintPrefs) {
  try {
    localStorage.setItem(PRINT_PREFS_KEY, JSON.stringify(p));
  } catch {}
}

export function isUnauthorizedErrMessage(msg: string) {
  const m = String(msg ?? "").toLowerCase();
  return m.includes("unauthorized") || m.includes("401") || m.includes('"statuscode":401') || m.includes("token");
}

async function readErrorTextSafe(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function refreshStoreAccessToken(base: string): Promise<string> {
  const res = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: {
      "x-ct-app": "store",
    },
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await readErrorTextSafe(res);
    throw new Error(txt || `Refresh failed (${res.status})`);
  }

  const out = (await res.json()) as any;
  const token = String(out?.accessToken ?? "").trim();
  if (!token) throw new Error("Refresh no devolvió accessToken");

  saveStoreToken(token);
  return token;
}

function mergeHeaders(base?: Record<string, string>, extra?: Record<string, string>) {
  return { ...(base ?? {}), ...(extra ?? {}) };
}

function withBearer(headers: Record<string, string> | undefined, token: string) {
  const h = { ...(headers ?? {}) };
  const t = String(token ?? "").trim();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

export async function apiGet<T>(base: string, path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    cache: "no-store",
    headers,
    credentials: "include",
  });

  if (res.ok) return (await res.json()) as T;

  const txt = await readErrorTextSafe(res);
  if (res.status === 401 || isUnauthorizedErrMessage(txt)) {
    const newTok = await refreshStoreAccessToken(base);
    const retryHeaders = withBearer(headers, newTok);

    const res2 = await fetch(`${base}${path}`, {
      method: "GET",
      cache: "no-store",
      headers: retryHeaders,
      credentials: "include",
    });

    if (!res2.ok) throw new Error((await readErrorTextSafe(res2)) || `Error ${res2.status}`);
    return (await res2.json()) as T;
  }

  throw new Error(txt || `Error ${res.status}`);
}

export async function apiPost<T>(base: string, path: string, body?: any, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: mergeHeaders({ "Content-Type": "application/json" }, headers),
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    cache: "no-store",
  });

  if (res.ok) return (await res.json()) as T;

  const txt = await readErrorTextSafe(res);
  if (res.status === 401 || isUnauthorizedErrMessage(txt)) {
    const newTok = await refreshStoreAccessToken(base);
    const retryHeaders = withBearer(headers, newTok);

    const res2 = await fetch(`${base}${path}`, {
      method: "POST",
      headers: mergeHeaders({ "Content-Type": "application/json" }, retryHeaders),
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      cache: "no-store",
    });

    if (!res2.ok) throw new Error((await readErrorTextSafe(res2)) || `Error ${res2.status}`);
    return (await res2.json()) as T;
  }

  throw new Error(txt || `Error ${res.status}`);
}

export function buildStoreHeaders(token: string, storeCode: string) {
  const headers: Record<string, string> = {};
  headers["x-ct-app"] = "store";

  const tok = String(token ?? "").trim();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const code = String(storeCode ?? "").trim();
  if (!tok && code) headers["x-store-code"] = code;

  return headers;
}

export function getMyPickup(order: ApiOrder, storeCode: string) {
  const code = String(storeCode ?? "").trim();
  if (!code) return null;
  const pickups = Array.isArray(order.pickups) ? order.pickups : [];
  return pickups.find((p) => String(p.store?.storeCode ?? "").trim() === code) ?? null;
}

export function getMyStoreId(order: ApiOrder, storeCode: string) {
  const myPickup = getMyPickup(order, storeCode);
  const id = myPickup?.store?.id ? String(myPickup.store.id) : "";
  return id || null;
}

export function getMyItems(order: ApiOrder, storeCode: string) {
  const myStoreId = getMyStoreId(order, storeCode);
  const items = Array.isArray(order.items) ? order.items : [];
  if (!myStoreId) return [];
  return items.filter((it) => String(it.storeId ?? "") === myStoreId);
}

export function calcItemsSubtotalCOP(items: Array<{ priceCOP: number; qty: number }>) {
  return items.reduce((acc, it) => {
    const price = Math.max(0, Math.round(Number(it.priceCOP || 0)));
    const qty = Math.max(0, Math.round(Number(it.qty || 0)));
    return acc + price * qty;
  }, 0);
}

export function getMyStorePayoutFromSnapshot(order: ApiOrder, storeCode: string): number | null {
  const snap = order.financialSnapshot;
  if (!snap) return null;

  const stores = Array.isArray(snap.stores) ? snap.stores : [];
  if (!stores.length) return null;

  const myStoreId = getMyStoreId(order, storeCode);
  const code = String(storeCode ?? "").trim();

  const hit =
    (myStoreId ? stores.find((s) => String(s.storeId ?? "") === String(myStoreId)) : null) ??
    (code ? stores.find((s) => String(s.storeCode ?? "").trim() === code) : null) ??
    null;

  const payout = (hit as any)?.storePayoutCOP;
  if (typeof payout === "number" && Number.isFinite(payout)) return Math.max(0, Math.round(payout));

  return null;
}

export function isMyPickupPending(myPickup: any) {
  return !!myPickup && !myPickup.storeConfirmedAt && !myPickup.storeRejectedAt;
}

export function formatTimeAgo(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "hace un momento";
  const diffMs = Date.now() - t;
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  return `hace ${days} días`;
}

export function dayKeyFromIso(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getStoreIconByName(name: string) {
  const n = String(name || "").toLowerCase();

  if (n.includes("drog") || n.includes("farm") || n.includes("botica")) return "💊";
  if (n.includes("pizza") || n.includes("rest") || n.includes("cafe") || n.includes("comida")) return "🍽️";
  if (n.includes("market") || n.includes("super") || n.includes("tienda") || n.includes("mini")) return "🛒";
  if (n.includes("boutique") || n.includes("moda") || n.includes("ropa")) return "👗";
  if (n.includes("tec") || n.includes("cell") || n.includes("phone") || n.includes("pc")) return "📱";
  return "🏪";
}

export function calcCommissionAndPayout(mySubtotal: number) {
  const commission = Math.max(0, Math.round(mySubtotal * PLATFORM_COMMISSION_RATE));
  const payoutFallback = Math.max(0, Math.round(mySubtotal - commission));
  return { commission, payoutFallback };
}