//src\app\store\components\tabs\OrdersTab.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
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
};

type StageKey = "PENDING" | "PREPARING" | "EN_ROUTE" | "DELIVERED";

function formatShortOrderId(id?: string | null) {
  const clean = String(id ?? "").trim();
  if (!clean) return "...------";
  return `...${clean.slice(-6)}`;
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
}: Props) {
  const storeCity = useStoreCity();

  const pendingOrders = buckets.waiting ?? [];
  const preparingOrders = buckets.preparing ?? [];
  const enRouteOrders = buckets.enRoute ?? [];
  const deliveredOrders = buckets.delivered ?? [];

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
    setOrdersFilter(next);
    setSelectedOrderId(null);
  }

  return (
    <div className="ct-tab-frame grid h-full min-h-0 gap-2 grid-cols-[210px_minmax(0,1fr)]">
      <aside className="rounded-[20px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.96)_100%)] p-3 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
        <div className="flex h-full min-h-[470px] flex-col">
          <div className="text-[9px] font-extrabold uppercase tracking-[0.20em] text-slate-400">Órdenes</div>
          <div className="mt-2 text-[16px] font-black leading-none text-slate-900">Vista operativa</div>

          <div className="mt-4 space-y-2">
            <StageSidebarBtn
              active={activeStage === "PENDING"}
              label="Pendientes"
              count={pendingOrders.length}
              stage="PENDING"
              onClick={() => changeStage("PENDING")}
            />
            <StageSidebarBtn
              active={activeStage === "PREPARING"}
              label="En preparación"
              count={preparingOrders.length}
              stage="PREPARING"
              onClick={() => changeStage("PREPARING")}
            />
            <StageSidebarBtn
              active={activeStage === "EN_ROUTE"}
              label="En ruta"
              count={enRouteOrders.length}
              stage="EN_ROUTE"
              onClick={() => changeStage("EN_ROUTE")}
            />
            <StageSidebarBtn
              active={activeStage === "DELIVERED"}
              label="Entregadas"
              count={deliveredOrders.length}
              stage="DELIVERED"
              onClick={() => changeStage("DELIVERED")}
            />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {storeCity.hasCity ? <SmallChip tone="softBlue">📍 {storeCity.cityLabel}</SmallChip> : null}
            <SmallChip tone="softSlate">{loading ? "Actualizando…" : `${ordersList.length} visibles`}</SmallChip>
          </div>

          <div className="mt-3 grid gap-2">
            <StatePill
              active={storeStateUI === "ACTIVE"}
              onClick={() => saveStoreOperationalState("ACTIVE")}
              variant="green"
            >
              {savingStoreState && storeStateUI !== "ACTIVE" ? "Guardando..." : "Tienda activa"}
            </StatePill>

            <StatePill
              active={storeStateUI === "PAUSED"}
              onClick={() => saveStoreOperationalState("PAUSED")}
              variant="yellow"
            >
              {savingStoreState && storeStateUI !== "PAUSED" ? "Guardando..." : "En pausa"}
            </StatePill>

            <StatePill
              active={storeStateUI === "INACTIVE"}
              onClick={() => saveStoreOperationalState("INACTIVE")}
              variant="red"
            >
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

          <div className="mt-auto rounded-[14px] border border-slate-200 bg-white/85 px-3 py-3 text-[11px] font-medium leading-snug text-slate-500">
            Usa este panel para cambiar de etapa y operar la tienda sin salir del tablero.
          </div>
        </div>
      </aside>

      <section className="min-h-0 rounded-[20px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(248,250,252,0.85)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
        <div className="grid h-full min-h-0 gap-2 grid-cols-[320px_minmax(0,1fr)]">
          <div
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

            <div className="flex-1 min-h-0 p-3">
              <div className="ct-scroll-y flex h-full min-h-0 flex-col gap-3 pr-1">
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
                      active={selectedOrderId === order.id}
                      onClick={() => {
                        markManualInteraction();
                        setSelectedOrderId(order.id);
                      }}
                      storeCode={storeCode}
                      stage={activeStage}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="min-h-0 min-w-0 overflow-hidden rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.99)_100%)] p-3 shadow-[0_16px_34px_rgba(15,23,42,0.12)]">
            {!selectedOrderId || !selectedOrder ? (
              <EmptySelection />
            ) : (
              <div className="ct-scroll-y h-full min-h-0 pr-1">
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
      </section>
    </div>
  );
}