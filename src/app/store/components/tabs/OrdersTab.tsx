//src\app\store\components\tabs\OrdersTab.tsx
"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import OrderDetail from "../OrderDetail";
import SmallChip from "../ui/SmallChip";
import StatePill from "../ui/StatePill";
import { useStoreCity } from "../context/StoreCityContext";
import { ApiOrder, StoreStateUI } from "../../lib/storeTypes";
import {
  calcItemsSubtotalCOP,
  formatCOP,
  formatTimeAgo,
  getMyItems,
  getMyPickup,
  normFlow,
  normStatus,
} from "../../lib/storeUtils";

type StoreFetchFn = <T>(path: string, init?: RequestInit, retry?: boolean) => Promise<T>;

type Props = {
  ordersFilter: "ALL" | "PENDING" | "PREPARING" | "EN_ROUTE" | "DELIVERED";
  setOrdersFilter: Dispatch<
    SetStateAction<"ALL" | "PENDING" | "PREPARING" | "EN_ROUTE" | "DELIVERED">
  >;
  buckets: {
    waiting: ApiOrder[];
    preparing: ApiOrder[];
    enRoute: ApiOrder[];
    delivered: ApiOrder[];
  };
  loading: boolean;
  ordersList: ApiOrder[];
  selectedOrderId: string | null;
  setSelectedOrderId: Dispatch<SetStateAction<string | null>>;
  selectedOrder: ApiOrder | null;
  storeCode: string;
  busyId: string | null;
  rejectReasonByOrderId: Record<string, string>;
  setRejectReasonByOrderId: Dispatch<SetStateAction<Record<string, string>>>;
  openByOrderId: Record<string, boolean>;
  setOpenByOrderId: Dispatch<SetStateAction<Record<string, boolean>>>;
  onConfirm: (id: string) => void | Promise<void>;
  onReject: (id: string, reason: string) => void | Promise<void>;
  onPreparing: (id: string) => void | Promise<void>;
  printingId: string | null;
  storeStateUI: StoreStateUI;
  savingStoreState: boolean;
  saveStoreOperationalState: (nextState: StoreStateUI) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  storeFetch?: StoreFetchFn;
};

type StageKey = "PENDING" | "PREPARING" | "EN_ROUTE" | "DELIVERED";
type RightPanelMode = "EMPTY" | "ORDER" | "KRONIX_ENVIOS";

type AuthMeResponse = {
  user?: {
    sub?: string;
    id?: string;
    role?: string;
    phone?: string | null;
    email?: string | null;
    name?: string | null;
    storeId?: string | null;
    cityId?: string | null;
  } | null;
};

type StoreMeResponse = {
  id?: string;
  cityId?: string | null;
  storeCode?: string | null;
  name?: string | null;
  address?: string | null;
  addressReference?: string | null;
  lat?: number | null;
  lng?: number | null;
  mainEntranceLat?: number | null;
  mainEntranceLng?: number | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  cel1?: string | null;
  cel2?: string | null;
  businessEmail?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  category?: string | null;
  city?: {
    id?: string | null;
    slug?: string | null;
    name?: string | null;
    department?: string | null;
  } | null;
};

type CourierZoneCalculateResponse = {
  serviceType?: "PICKUP_AND_DELIVERY" | "SEND_PACKAGE" | "ERRAND" | string;
  zone?: {
    id?: string;
    zoneNumber?: number;
    name?: string;
    isNegotiable?: boolean;
    isInsideCoverage?: boolean;
  } | null;
  pricing?: {
    baseServiceCOP?: number;
    zoneFeeCOP?: number;
    serviceFeeCOP?: number;
    packageLargeFeeCOP?: number;
    additionalPointsFeeCOP?: number;
    returnFeeCOP?: number;
    complexityFeeCOP?: number;
    tipCOP?: number;
    totalCOP?: number;
  } | null;
  message?: string;
};

type CreateCourierOrderResponse = {
  id?: string;
  orderId?: string;
  status?: string;
  flowStatus?: string;
  totalCOP?: number;
  createdAt?: string;
  orderType?: "COURIER" | "STORE" | string;
};

const STORE_KRONIX_ENVIOS_LAST_ORDER_KEY = "kronix:store:kronix-envios:last-order:v1";

function formatShortOrderId(id?: string | null) {
  const clean = String(id ?? "").trim();
  if (!clean) return "...------";
  return `...${clean.slice(-6)}`;
}

function getSafeMoney(value: unknown) {
  const n = Math.round(Number(value ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function cleanPhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}

function readJsonErrorMessage(e: any) {
  const raw = String(e?.message ?? e ?? "").trim();

  try {
    const parsed = JSON.parse(raw);
    const msg = String(parsed?.message ?? parsed?.error ?? "").trim();
    if (msg) return msg;
  } catch {}

  return raw || "No fue posible completar la acción.";
}

function isPendingForStore(order: ApiOrder, storeCode: string) {
  const myPickup = getMyPickup(order, storeCode);
  return !!myPickup && !myPickup.storeConfirmedAt && !myPickup.storeRejectedAt;
}

function isPreparingForStore(order: ApiOrder, storeCode: string) {
  const myPickup = getMyPickup(order, storeCode);
  const flow = normFlow(order.flowStatus);
  const status = normStatus(order.status);
  const payment = String(order.paymentStatus ?? "").toUpperCase();

  if (!myPickup) return false;
  if (myPickup.storeRejectedAt) return false;
  if (!myPickup.storeConfirmedAt) return false;
  if (status === "CANCELLED" || status === "DELIVERED") return false;
  if (status === "EN_ROUTE" || flow === "EN_ROUTE") return false;
  if (flow === "DELIVERED") return false;
  if (payment !== "PAID") return false;
  if (flow !== "PREPARING") return false;

  return true;
}

function isEnRouteForStore(order: ApiOrder) {
  const flow = normFlow(order.flowStatus);
  const status = normStatus(order.status);
  return status === "EN_ROUTE" || flow === "EN_ROUTE";
}

function isDeliveredForStore(order: ApiOrder) {
  const flow = normFlow(order.flowStatus);
  const status = normStatus(order.status);
  return status === "DELIVERED" || flow === "DELIVERED";
}

function getStateLabel(order: ApiOrder, storeCode: string) {
  const myPickup = getMyPickup(order, storeCode);
  const flow = normFlow(order.flowStatus);
  const status = normStatus(order.status);
  const payment = String(order.paymentStatus ?? "").toUpperCase();

  if (!myPickup) return "SIN PICKUP";
  if (myPickup.storeRejectedAt) return "RECHAZADA";
  if (!myPickup.storeConfirmedAt) return "PENDIENTE";
  if (status === "EN_ROUTE" || flow === "EN_ROUTE") return "EN RUTA";
  if (status === "DELIVERED" || flow === "DELIVERED") return "ENTREGADA";
  if (payment === "PAID" && flow === "PREPARING") return "PREPARANDO";
  if (myPickup.storeConfirmedAt && payment !== "PAID") return "CONFIRMADA";
  return "CONFIRMADA";
}

function getStageTone(stage: StageKey) {
  if (stage === "PENDING") {
    return {
      shell: "bg-[linear-gradient(180deg,#fff5e6_0%,#fffaf2_100%)]",
      header: "from-orange-500 to-amber-400",
      subtle: "bg-orange-100 text-orange-800",
      dot: "bg-orange-500",
      sidebarActive: "bg-[linear-gradient(135deg,#ff7a00_0%,#ff9900_100%)] text-white ring-orange-500",
      sidebarBadge: "bg-white/20 text-white",
    };
  }

  if (stage === "PREPARING") {
    return {
      shell: "bg-[linear-gradient(180deg,#eef6ff_0%,#f7fbff_100%)]",
      header: "from-blue-600 to-sky-500",
      subtle: "bg-blue-100 text-blue-800",
      dot: "bg-blue-500",
      sidebarActive: "bg-[linear-gradient(135deg,#1d4ed8_0%,#0ea5e9_100%)] text-white ring-sky-500",
      sidebarBadge: "bg-white/20 text-white",
    };
  }

  if (stage === "EN_ROUTE") {
    return {
      shell: "bg-[linear-gradient(180deg,#eefbf4_0%,#f7fdf9_100%)]",
      header: "from-lime-500 to-emerald-500",
      subtle: "bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-500",
      sidebarActive: "bg-[linear-gradient(135deg,#65a30d_0%,#10b981_100%)] text-white ring-emerald-500",
      sidebarBadge: "bg-white/20 text-white",
    };
  }

  return {
    shell: "bg-[linear-gradient(180deg,#f6f8fb_0%,#fbfcfe_100%)]",
    header: "from-slate-700 to-slate-500",
    subtle: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
    sidebarActive: "bg-[linear-gradient(135deg,#475569_0%,#64748b_100%)] text-white ring-slate-400",
    sidebarBadge: "bg-white/20 text-white",
  };
}

function StageSidebarBtn({
  active,
  label,
  count,
  stage,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  stage: StageKey;
  onClick: () => void;
}) {
  const tone = getStageTone(stage);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center justify-between rounded-[14px] px-4 py-2.5 text-left text-[13px] font-extrabold ring-1 transition",
        active
          ? `${tone.sidebarActive} shadow-[0_8px_18px_rgba(15,23,42,0.10)]`
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "grid min-w-[22px] place-items-center rounded-full px-2 py-1 text-[10px] font-black",
          active ? tone.sidebarBadge : "bg-slate-100 text-slate-700",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function KronixEnviosSidebarBtn({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative min-h-[74px] w-full overflow-hidden rounded-[16px] px-3 py-3 text-left text-white ring-1 transition active:scale-[0.99]",
        active
          ? "bg-[radial-gradient(circle_at_78%_50%,rgba(220,252,231,1)_0%,rgba(110,231,183,1)_15%,rgba(16,185,129,1)_35%,rgba(5,150,105,1)_60%,rgba(6,95,70,1)_100%)] ring-emerald-300 shadow-[0_12px_24px_rgba(16,185,129,0.22)]"
          : "bg-[radial-gradient(circle_at_78%_50%,rgba(220,252,231,1)_0%,rgba(110,231,183,1)_15%,rgba(16,185,129,1)_35%,rgba(5,150,105,1)_60%,rgba(6,95,70,1)_100%)] ring-emerald-300 hover:-translate-y-[1px] hover:shadow-[0_10px_20px_rgba(16,185,129,0.16)]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/25 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-10 w-24 rotate-[-18deg] bg-white/30 blur-md" />

      {/* Imagen izquierda: caja. Ajusta scale / translate aquí si quieres probar tamaño y posición. */}
      <div className="pointer-events-none absolute left-2 top-1/2 h-[50px] w-[50px] -translate-y-1/2">
        <Image
          src="/branding/kronix/Enviar-Paquete3.png"
          alt="Paquete KroniX Envíos"
          fill
          className="object-contain scale-[1.1] translate-x-[-2px] translate-y-[0px] drop-shadow-[0_8px_12px_rgba(0,0,0,0.18)]"
          sizes="50px"
        />
      </div>

      {/* Imagen derecha: motorizado. Ajusta scale / translate aquí si quieres probar tamaño y posición. */}
      <div className="pointer-events-none absolute right-[-4px] top-1/2 h-[66px] w-[74px] -translate-y-1/2">
        <Image
          src="/branding/kronix/Enviar-Paquete1.png"
          alt="Motorizado KroniX Envíos"
          fill
          className="object-contain scale-[1.1] translate-x-[-18px] translate-y-[3px] drop-shadow-[0_10px_16px_rgba(0,0,0,0.22)]"
          sizes="74px"
        />
      </div>

      <div className="relative z-10 flex min-h-[50px] items-center">
        <div className="min-w-0 flex-1 pl-[50px] pr-[72px]">
          <div className="text-[13px] font-black leading-tight text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.22)]">
            KroniX Envíos
          </div>
          <div className="mt-0.5 text-[10px] font-bold leading-3 text-white/92 drop-shadow-[0_1px_1px_rgba(0,0,0,0.16)]">
            Solicitar motorizado
          </div>
        </div>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[24px] font-black leading-none text-white/90 transition group-hover:translate-x-0.5">
          ›
        </div>
      </div>
    </button>
  );
}

function EmptyStage({
  title,
  cityName,
}: {
  title: string;
  cityName?: string;
}) {
  return (
    <div className="rounded-[16px] border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center">
      <div className="text-[15px] font-black text-slate-700">
        No hay órdenes en {title.toLowerCase()}
        {cityName ? ` para ${cityName}` : ""}.
      </div>
    </div>
  );
}

function EmptySelection() {
  return (
    <div className="grid h-full min-h-[320px] place-items-center rounded-[16px] bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(248,250,252,0.98)_100%)] text-center">
      <div className="max-w-[360px] px-6">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[18px] bg-slate-100 text-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] ring-1 ring-slate-200">
          📋
        </div>
        <div className="text-[20px] font-black leading-none text-slate-900">Selecciona una orden</div>
        <div className="mt-3 text-[13px] font-medium leading-snug text-slate-500">
          El panel derecho mostrará el detalle operativo, los artículos y las acciones disponibles
          para la orden seleccionada.
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  active,
  onClick,
  storeCode,
  stage,
}: {
  order: ApiOrder;
  active: boolean;
  onClick: () => void;
  storeCode: string;
  stage: StageKey;
}) {
  const myItems = getMyItems(order, storeCode);
  const mySubtotal = calcItemsSubtotalCOP(myItems);
  const tone = getStageTone(stage);
  const stateLabel = getStateLabel(order, storeCode);

  const customerName =
    String((order as any)?.customerName ?? "").trim() ||
    String((order as any)?.customer?.name ?? "").trim() ||
    "Cliente";

  const totalUnits = myItems.reduce((acc, item) => acc + Math.max(0, Math.round(Number(item.qty || 0))), 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-[16px] border border-white/70 bg-white/95 p-3.5 text-left shadow-[0_8px_18px_rgba(15,23,42,0.045)] transition",
        active
          ? "border-slate-300 ring-2 ring-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
          : "hover:-translate-y-[1px] hover:shadow-[0_10px_20px_rgba(15,23,42,0.06)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-black text-slate-500">{customerName}</div>
          <div className="mt-1 pr-2 text-[15px] font-black leading-tight text-slate-900">
            {formatShortOrderId(order.id)}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              {stateLabel}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[15px] font-black leading-none text-slate-900">{formatCOP(mySubtotal)}</div>
          <div className="mt-1 text-[10px] font-semibold text-slate-500">{formatTimeAgo(order.createdAt)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${tone.subtle}`}>
          {myItems.length} ítems
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold text-slate-700">
          {totalUnits} artículos
        </span>
      </div>
    </button>
  );
}

function KronixEnviosPanel({
  storeCode,
  storeFetch,
  onCreated,
  onCancel,
}: {
  storeCode: string;
  storeFetch?: StoreFetchFn;
  onCreated: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const storeCity = useStoreCity();
  const [loadingData, setLoadingData] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [storeMe, setStoreMe] = useState<StoreMeResponse | null>(null);
  const [authMe, setAuthMe] = useState<AuthMeResponse | null>(null);
  const [zoneCalculation, setZoneCalculation] = useState<CourierZoneCalculateResponse | null>(null);

  async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    if (storeFetch) return storeFetch<T>(path, init);

    const headers: Record<string, string> = {
      "x-ct-app": "store",
      ...(init?.headers ? (init.headers as any) : {}),
    };

    const code = String(storeCode ?? "").trim();
    if (code) headers["x-store-code"] = code;

    const res = await fetch(`/api/store${path}`, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Error ${res.status}`);
    }

    const ct = res.headers.get("content-type") || "";
    return (ct.includes("application/json") ? await res.json() : ((await res.text()) as any)) as T;
  }

  const pickupLat = useMemo(() => {
    const raw =
      storeMe?.pickupLat ??
      storeMe?.mainEntranceLat ??
      storeMe?.lat ??
      null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [storeMe]);

  const pickupLng = useMemo(() => {
    const raw =
      storeMe?.pickupLng ??
      storeMe?.mainEntranceLng ??
      storeMe?.lng ??
      null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [storeMe]);

  const pickupAddress = String(storeMe?.address ?? "").trim();
  const pickupReference = String(storeMe?.addressReference ?? "").trim();
  const storeName = String(storeMe?.name ?? "").trim() || "Tienda KroniX";
  const contactName =
    String(storeMe?.ownerName ?? "").trim() ||
    String(authMe?.user?.name ?? "").trim() ||
    storeName;
  const contactPhone = cleanPhone(
    storeMe?.cel1 ||
      storeMe?.cel2 ||
      storeMe?.ownerPhone ||
      authMe?.user?.phone ||
      ""
  );
  const citySlug =
    String(storeMe?.city?.slug ?? "").trim() ||
    String((storeCity as any)?.citySlug ?? "").trim();

  const pricing = useMemo(() => {
    const p = zoneCalculation?.pricing;
    const baseServiceCOP = getSafeMoney(p?.baseServiceCOP);
    const zoneFeeCOP = getSafeMoney(p?.zoneFeeCOP);
    const serviceFeeCOP = getSafeMoney(p?.serviceFeeCOP);
    const totalCOP = getSafeMoney(p?.totalCOP) || baseServiceCOP + zoneFeeCOP + serviceFeeCOP;

    return {
      baseServiceCOP,
      zoneFeeCOP,
      serviceFeeCOP,
      totalCOP: totalCOP || 3000,
      zoneNumber: zoneCalculation?.zone?.zoneNumber ?? null,
      isNegotiable: Boolean(zoneCalculation?.zone?.isNegotiable),
    };
  }, [zoneCalculation]);

  const canCreate =
    !!authMe?.user?.sub &&
    !!pickupAddress &&
    typeof pickupLat === "number" &&
    typeof pickupLng === "number" &&
    Number.isFinite(pickupLat) &&
    Number.isFinite(pickupLng);

  async function loadData() {
    setLoadingData(true);
    setError(null);
    setSuccess(null);

    try {
      const [me, store] = await Promise.all([
        apiFetch<AuthMeResponse>("/auth/me", { method: "GET" }),
        apiFetch<StoreMeResponse>("/stores/me", { method: "GET" }),
      ]);

      setAuthMe(me);
      setStoreMe(store);
    } catch (e: any) {
      setError(readJsonErrorMessage(e));
      setAuthMe(null);
      setStoreMe(null);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function calculate() {
      setZoneCalculation(null);

      if (!storeMe) return;
      if (!citySlug) return;
      if (!pickupAddress) return;
      if (typeof pickupLat !== "number" || typeof pickupLng !== "number") return;

      try {
        const response = await apiFetch<CourierZoneCalculateResponse>(
          "/courier/zones/calculate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              citySlug,
              serviceType: "SEND_PACKAGE",
              points: [
                {
                  lat: pickupLat,
                  lng: pickupLng,
                  label: "Punto de recogida KroniX Envíos Store",
                  address: pickupAddress,
                },
                {
                  lat: pickupLat,
                  lng: pickupLng,
                  label: "Destino por confirmar en tienda",
                  address: "Destino por confirmar en tienda",
                },
              ],
              tipCOP: 0,
              isLargePackage: false,
            }),
          }
        );

        if (!cancelled) setZoneCalculation(response);
      } catch {
        if (!cancelled) setZoneCalculation(null);
      }
    }

    calculate();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeMe?.id, citySlug, pickupAddress, pickupLat, pickupLng]);

  async function createKronixEnvio() {
    if (creating) return;

    setError(null);
    setSuccess(null);

    if (!canCreate) {
      setError(
        "Faltan datos de recogida de la tienda. Revisa Registro: dirección, coordenadas y teléfono/contacto."
      );
      return;
    }

    setCreating(true);

    try {
      const customerId = String(authMe?.user?.sub ?? authMe?.user?.id ?? "").trim();
      const orderTotal = pricing.totalCOP || 3000;
      const baseService = pricing.baseServiceCOP || Math.max(0, orderTotal - (pricing.serviceFeeCOP || 0));
      const serviceFee = pricing.serviceFeeCOP || 500;

      const packageDescription = [
        "SERVICIO: KroniX Envíos solicitado desde Store App",
        "TIPO DE PAQUETE: Pedido externo del comercio",
        `TIENDA: ${storeName}`,
        `ZONA CALCULADA: ${pricing.zoneNumber ? `Zona ${pricing.zoneNumber}` : "Pendiente"}`,
        `VALOR BASE: ${formatCOP(baseService)}`,
        `COSTO SERVICIO: ${formatCOP(serviceFee)}`,
        "NOTA OPERATIVA: La tienda entregará al motorizado el paquete, datos del cliente y destino final en sitio.",
        "COBROS EXTRA: Si existen condiciones especiales, el conductor podrá acordar valor adicional directamente con el comercio o cliente final.",
      ].join("\n");

      const payload = {
        orderType: "COURIER" as const,
        courierServiceType: "SEND_PACKAGE" as const,
        customerId,
        citySlug,

        dropoffAddress: "Destino por confirmar en tienda",
        dropoffLat: pickupLat,
        dropoffLng: pickupLng,

        customerNote:
          "KroniX Envíos solicitado desde Store App. Motorizado debe llegar al comercio y confirmar en sitio paquete, destino y datos del cliente final.",

        deliveryFeeCOP: baseService,
        serviceFeeCOP: serviceFee,
        promoCOP: 0,
        tipCOP: 0,
        totalCOP: orderTotal,

        packageType: "Pedido externo del comercio",
        packageDescription,

        origin: {
          address: pickupAddress,
          lat: pickupLat,
          lng: pickupLng,
          placeName: storeName,
          reference: pickupReference || undefined,
          senderName: contactName,
          senderPhone: contactPhone || undefined,
        },

        destination: {
          address: "Destino por confirmar en tienda",
          lat: pickupLat,
          lng: pickupLng,
          placeName: "Destino por confirmar",
          reference: "El comercio entregará destino y datos al motorizado en sitio.",
          receiverName: "Cliente final por confirmar",
          receiverPhone: undefined,
        },
      };

      const created = await apiFetch<CreateCourierOrderResponse>("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const orderId = String(created?.id ?? created?.orderId ?? "").trim();

      if (!orderId) {
        throw new Error("La orden se creó, pero la API no devolvió un id válido.");
      }

      try {
        await apiFetch(`/orders/${encodeURIComponent(orderId)}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "PAID",
            ref: `STORE-AUTO-${orderId}`,
          }),
        });
      } catch {
        // Si el backend no permite a STORE marcar pago sobre una orden courier,
        // dejamos la orden creada. El siguiente paso será endpoint dedicado de créditos/wallet store.
      }

      try {
        localStorage.setItem(
          STORE_KRONIX_ENVIOS_LAST_ORDER_KEY,
          JSON.stringify({ orderId, createdAt: new Date().toISOString() })
        );
      } catch {}

      setSuccess(`Solicitud creada correctamente: ${formatShortOrderId(orderId)}.`);
      await Promise.resolve(onCreated());
    } catch (e: any) {
      setError(readJsonErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden px-5 py-5 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.58),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.34),transparent_34%),linear-gradient(135deg,#047857_0%,#10b981_35%,#34d399_70%,#6ee7b7_100%)]" />
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-64 rotate-[-12deg] bg-white/30 blur-md" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="relative h-[70px] w-[70px] shrink-0">
              <Image
                src="/branding/kronix/Enviar-Paquete2.png"
                alt="KroniX Envíos"
                fill
                className="object-contain scale-[1.4] drop-shadow-[0_12px_20px_rgba(0,0,0,0.28)]"
                sizes="70px"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-100">
                KroniX Envíos
              </div>
              <div className="mt-1 text-[24px] font-black leading-tight">
                Solicita un motorizado para tu negocio
              </div>
              <div className="mt-2 text-[13px] font-semibold leading-5 text-white/85">
                Servicio de un toque para pedidos recibidos por WhatsApp, llamada o venta directa.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {loadingData ? (
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
              <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-24 animate-pulse rounded-[16px] bg-slate-200" />
            </div>
          ) : (
            <>
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Punto de recogida
                </div>

                <div className="mt-3 grid gap-2 text-[13px]">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-500">Lugar</span>
                    <span className="text-right font-black text-slate-900">{storeName}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-500">Dirección</span>
                    <span className="text-right font-black text-slate-900">
                      {pickupAddress || "Sin dirección registrada"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-500">Referencia</span>
                    <span className="text-right font-bold text-slate-800">
                      {pickupReference || "Sin referencia"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-500">Contacto</span>
                    <span className="text-right font-bold text-slate-800">{contactName}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-semibold text-slate-500">Teléfono</span>
                    <span className="text-right font-bold text-slate-800">
                      {contactPhone || "Sin teléfono"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[17px] font-black text-slate-900">Precio estimado</div>
                    <div className="mt-1 text-[12px] font-semibold text-slate-500">
                      Pago automático temporal mientras activamos créditos o Wallet Store.
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                    {pricing.zoneNumber ? `Zona ${pricing.zoneNumber}` : "Auto"}
                  </span>
                </div>

                <div className="mt-3 rounded-[16px] bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between py-1.5 text-[13px] font-semibold text-slate-600">
                    <span>Base servicio</span>
                    <span className="font-black text-slate-900">{formatCOP(pricing.baseServiceCOP)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 text-[13px] font-semibold text-slate-600">
                    <span>Costo servicio</span>
                    <span className="font-black text-slate-900">{formatCOP(pricing.serviceFeeCOP || 500)}</span>
                  </div>
                  <div className="my-2 border-t border-slate-200" />
                  <div className="flex items-center justify-between py-1.5 text-[14px] font-black text-slate-900">
                    <span>Total estimado</span>
                    <span>{formatCOP(pricing.totalCOP || 3000)}</span>
                  </div>
                </div>
              </div>
               </>
          )}
          {error ? (
            <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-bold leading-5 text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-bold leading-5 text-emerald-800">
              {success}
            </div>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={creating}
              className="h-11 flex-1 rounded-[18px] border border-slate-200 bg-white text-[13px] font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={createKronixEnvio}
              disabled={creating || loadingData || !canCreate}
              className={[
                "h-11 flex-1 rounded-[18px] text-[13px] font-black text-white transition disabled:cursor-not-allowed disabled:opacity-55",
                "bg-[linear-gradient(90deg,#047857_0%,#10b981_50%,#6ee7b7_100%)] shadow-[0_12px_22px_rgba(15,23,42,0.22)] hover:scale-[0.995]",
              ].join(" ")}
            >
              {creating ? "Solicitando..." : "Confirmar servicio"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersTab({
  ordersFilter,
  setOrdersFilter,
  buckets,
  loading,
  ordersList,
  selectedOrderId,
  setSelectedOrderId,
  selectedOrder,
  storeCode,
  busyId,
  rejectReasonByOrderId,
  setRejectReasonByOrderId,
  openByOrderId,
  setOpenByOrderId,
  onConfirm,
  onReject,
  onPreparing,
  printingId,
  storeStateUI,
  savingStoreState,
  saveStoreOperationalState,
  onRefresh,
  storeFetch,
}: Props) {
  const storeCity = useStoreCity();

  const pendingOrders = buckets.waiting ?? [];
  const preparingOrders = buckets.preparing ?? [];
  const enRouteOrders = buckets.enRoute ?? [];
  const deliveredOrders = buckets.delivered ?? [];

  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>("EMPTY");
  const previousStageRef = useRef<StageKey | null>(null);
  const returnToPriorityTimerRef = useRef<number | null>(null);
  const manualUntilRef = useRef<number>(0);

  const resolvePreferredStage = useCallback((): StageKey => {
    if (pendingOrders.length > 0) return "PENDING";
    if (preparingOrders.length > 0) return "PREPARING";
    if (enRouteOrders.length > 0) return "EN_ROUTE";
    return "DELIVERED";
  }, [pendingOrders.length, preparingOrders.length, enRouteOrders.length]);

  const activeStage: StageKey =
    ordersFilter === "ALL" ? resolvePreferredStage() : ordersFilter;

  useEffect(() => {
    return () => {
      if (returnToPriorityTimerRef.current) {
        window.clearTimeout(returnToPriorityTimerRef.current);
        returnToPriorityTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedOrderId && selectedOrder) {
      setRightPanelMode("ORDER");
    } else if (rightPanelMode === "ORDER") {
      setRightPanelMode("EMPTY");
    }
  }, [selectedOrderId, selectedOrder, rightPanelMode]);

  function armReturnToPriority() {
    if (returnToPriorityTimerRef.current) {
      window.clearTimeout(returnToPriorityTimerRef.current);
    }

    returnToPriorityTimerRef.current = window.setTimeout(() => {
      manualUntilRef.current = 0;
      const preferred = resolvePreferredStage();
      setOrdersFilter(preferred);
      setSelectedOrderId(null);
    }, 30_000);
  }

  function markManualInteraction() {
    manualUntilRef.current = Date.now() + 30_000;
    armReturnToPriority();
  }

  useEffect(() => {
    if (loading) return;
    if (rightPanelMode === "KRONIX_ENVIOS") return;

    const preferred = resolvePreferredStage();
    const now = Date.now();
    const manualHoldActive = now < manualUntilRef.current;

    if (!manualHoldActive) {
      if (ordersFilter === "ALL" || activeStage !== preferred) {
        setOrdersFilter(preferred);
        setSelectedOrderId(null);
      }
    }
  }, [
    loading,
    ordersFilter,
    activeStage,
    resolvePreferredStage,
    setOrdersFilter,
    setSelectedOrderId,
    rightPanelMode,
  ]);

  const stageTitle =
    activeStage === "PENDING"
      ? "Pendientes"
      : activeStage === "PREPARING"
      ? "En preparación"
      : activeStage === "EN_ROUTE"
      ? "En ruta"
      : "Entregadas";

  const stageOrders =
    activeStage === "PENDING"
      ? pendingOrders
      : activeStage === "PREPARING"
      ? preparingOrders
      : activeStage === "EN_ROUTE"
      ? enRouteOrders
      : deliveredOrders;

  const stageTone = getStageTone(activeStage);

  function changeStage(next: StageKey) {
    markManualInteraction();
    setRightPanelMode("EMPTY");
    setOrdersFilter(next);
    setSelectedOrderId(null);
  }

  function openKronixEnvios() {
    previousStageRef.current = activeStage;
    markManualInteraction();
    setSelectedOrderId(null);
    setRightPanelMode("KRONIX_ENVIOS");
  }

  async function handleKronixEnviosCreated() {
    const previous = previousStageRef.current ?? resolvePreferredStage();
    setRightPanelMode("EMPTY");
    setSelectedOrderId(null);
    setOrdersFilter(previous);
    await Promise.resolve(onRefresh());
  }

  function closeKronixEnvios() {
    const previous = previousStageRef.current ?? activeStage;
    setRightPanelMode("EMPTY");
    setSelectedOrderId(null);
    setOrdersFilter(previous);
  }

  return (
    <div className="ct-tab-frame grid h-full min-h-0 grid-cols-[20%_30%_50%] gap-2 overflow-hidden">
      <aside className="min-h-0 rounded-[20px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.96)_100%)] p-3 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
        <div className="h-full min-h-0 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="text-[9px] font-extrabold uppercase tracking-[0.20em] text-slate-400">
            Órdenes
          </div>
          <div className="mt-2 text-[16px] font-black leading-none text-slate-900">
            Vista operativa
          </div>

          <div className="mt-4 space-y-2">
            <StageSidebarBtn active={activeStage === "PENDING" && rightPanelMode !== "KRONIX_ENVIOS"} label="Pendientes" count={pendingOrders.length} stage="PENDING" onClick={() => changeStage("PENDING")} />
            <StageSidebarBtn active={activeStage === "PREPARING" && rightPanelMode !== "KRONIX_ENVIOS"} label="En preparación" count={preparingOrders.length} stage="PREPARING" onClick={() => changeStage("PREPARING")} />
            <StageSidebarBtn active={activeStage === "EN_ROUTE" && rightPanelMode !== "KRONIX_ENVIOS"} label="En ruta" count={enRouteOrders.length} stage="EN_ROUTE" onClick={() => changeStage("EN_ROUTE")} />
            <StageSidebarBtn active={activeStage === "DELIVERED" && rightPanelMode !== "KRONIX_ENVIOS"} label="Entregadas" count={deliveredOrders.length} stage="DELIVERED" onClick={() => changeStage("DELIVERED")} />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <KronixEnviosSidebarBtn
              active={rightPanelMode === "KRONIX_ENVIOS"}
              onClick={openKronixEnvios}
            />
            <SmallChip tone="softSlate">{loading ? "Actualizando…" : `${ordersList.length} visibles`}</SmallChip>
          </div>

          <div className="mt-3 grid gap-2">
            <StatePill active={storeStateUI === "ACTIVE"} onClick={() => saveStoreOperationalState("ACTIVE")} variant="green">
              {savingStoreState && storeStateUI !== "ACTIVE" ? "Guardando..." : "Tienda activa"}
            </StatePill>

            <StatePill active={storeStateUI === "PAUSED"} onClick={() => saveStoreOperationalState("PAUSED")} variant="yellow">
              {savingStoreState && storeStateUI !== "PAUSED" ? "Guardando..." : "En pausa"}
            </StatePill>

            <StatePill active={storeStateUI === "INACTIVE"} onClick={() => saveStoreOperationalState("INACTIVE")} variant="red">
              {savingStoreState && storeStateUI !== "INACTIVE" ? "Guardando..." : "Inactiva"}
            </StatePill>

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-8 items-center justify-center rounded-full bg-slate-900 px-4 text-[12px] font-extrabold text-white transition hover:bg-slate-800"
            >
              Refrescar
            </button>
          </div>

          <div className="mt-3 rounded-[14px] border border-slate-200 bg-white/85 px-3 py-3 text-[11px] font-medium leading-snug text-slate-500">
            Usa este panel para cambiar de etapa, operar la tienda y solicitar KroniX Envíos sin salir del tablero.
          </div>
        </div>
      </aside>

      <section
        className={[
          "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[18px] border border-white/60 shadow-[0_10px_20px_rgba(15,23,42,0.055)]",
          stageTone.shell,
        ].join(" ")}
      >
        <div className={`bg-gradient-to-r ${stageTone.header} px-4 py-3 text-white`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[17px] font-black leading-none">{stageTitle}</div>
            <div className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold">
              {stageOrders.length}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white/75 px-6 py-10 text-center">
                <div className="text-[15px] font-black text-slate-700">Actualizando órdenes…</div>
              </div>
            ) : !stageOrders.length ? (
              <EmptyStage title={stageTitle} cityName={storeCity.cityName} />
            ) : (
              stageOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  active={selectedOrderId === order.id && rightPanelMode === "ORDER"}
                  onClick={() => {
                    markManualInteraction();
                    setRightPanelMode("ORDER");
                    setSelectedOrderId(order.id);
                  }}
                  storeCode={storeCode}
                  stage={activeStage}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <aside className="min-h-0 min-w-0 overflow-hidden rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.99)_100%)] p-3 shadow-[0_16px_34px_rgba(15,23,42,0.12)]">
        {rightPanelMode === "KRONIX_ENVIOS" ? (
          <KronixEnviosPanel
            storeCode={storeCode}
            storeFetch={storeFetch}
            onCreated={handleKronixEnviosCreated}
            onCancel={closeKronixEnvios}
          />
        ) : !selectedOrderId || !selectedOrder ? (
          <EmptySelection />
        ) : (
          <div className="h-full min-h-0 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <OrderDetail
              order={selectedOrder}
              storeCode={storeCode}
              busyId={busyId}
              rejectReasonByOrderId={rejectReasonByOrderId}
              setRejectReasonByOrderId={setRejectReasonByOrderId}
              openByOrderId={openByOrderId}
              setOpenByOrderId={setOpenByOrderId}
              onConfirm={onConfirm}
              onReject={onReject}
              onPreparing={onPreparing}
              printing={printingId === selectedOrder.id}
            />
          </div>
        )}
      </aside>
    </div>
  );
}



