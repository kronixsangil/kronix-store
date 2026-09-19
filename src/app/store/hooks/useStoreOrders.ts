//src\app\store\hooks\useStoreOrders.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiOrder,
  REJECT_REASONS,
} from "../lib/storeTypes";
import {
  calcItemsSubtotalCOP,
  getMyItems,
  getMyPickup,
  isMyPickupPending,
  normFlow,
  normStatus,
} from "../lib/storeUtils";

type Props = {
  storeCode: string;
  storeFetch: <T>(path: string, init?: RequestInit, retry?: boolean) => Promise<T>;
  doLogout: () => Promise<void>;
  isUnauthorizedErrMessage: (msg: string) => boolean;
};

type StoreVisibleStage = "PENDING" | "PREPARING" | "EN_ROUTE" | "DELIVERED" | "HIDDEN";

function hasAssignedDriver(order: ApiOrder | null | undefined) {
  const driverId = String((order as any)?.driver?.id ?? (order as any)?.driverId ?? "").trim();
  return Boolean(driverId);
}

function shouldNotifyReadyForPickup(order: ApiOrder | null | undefined) {
  if (!order) return false;

  const status = normStatus(order.status);
  const flow = normFlow(order.flowStatus);
  const payment = String(order.paymentStatus ?? "").toUpperCase();

  if (status === "CANCELLED" || status === "DELIVERED" || status === "EN_ROUTE") return false;
  if (flow !== "PREPARING") return false;
  if (payment !== "PAID") return false;
  if (!hasAssignedDriver(order)) return false;

  return true;
}

function resolveStoreVisibleStage(order: ApiOrder, storeCode: string): StoreVisibleStage {
  if (order.sourceType === "LUNCH_ORDER") {
    const lunchStatus = String(order.lunchStatus ?? "").toUpperCase();
    if (lunchStatus === "PENDING_PAYMENT_REVIEW") return "PENDING";
    if (lunchStatus === "CONFIRMED" || lunchStatus === "PREPARING") return "PREPARING";
    if (lunchStatus === "READY") return "PREPARING";
    if (lunchStatus === "COMPLETED") return "DELIVERED";
    return "HIDDEN";
  }
  const myPickup = getMyPickup(order, storeCode);
  const flow = normFlow(order.flowStatus);
  const status = normStatus(order.status);
  const payment = String(order.paymentStatus ?? "").toUpperCase();

  if (!myPickup) return "HIDDEN";
  if (myPickup.storeRejectedAt) return "HIDDEN";

  if (status === "CANCELLED" || flow === "CANCELLED") return "HIDDEN";

  if (status === "DELIVERED" || flow === "DELIVERED") return "DELIVERED";
  if (status === "EN_ROUTE" || flow === "EN_ROUTE") return "EN_ROUTE";

  if (!myPickup.storeConfirmedAt) {
    return "PENDING";
  }

  // tienda confirmó pero el cliente aún no paga => limbo / hidden
  if (payment !== "PAID") {
    return "HIDDEN";
  }

  if (flow === "PREPARING") {
    return "PREPARING";
  }

  return "HIDDEN";
}


function adaptLunchOrder(row: any, storeCode: string): ApiOrder {
  const lunchStatus = String(row?.status ?? "PENDING_PAYMENT_REVIEW").toUpperCase();
  const confirmed = ["CONFIRMED", "PREPARING", "READY", "COMPLETED"].includes(lunchStatus);
  const rejected = lunchStatus === "REJECTED";
  const courierStatus = String(row?.courier?.status ?? "").toUpperCase();
  const courierFlow = String(row?.courier?.flowStatus ?? "").toUpperCase();
  const courierDelivered = courierStatus === "DELIVERED" || courierFlow === "DELIVERED";
  const courierEnRoute = courierStatus === "EN_ROUTE" || courierFlow === "EN_ROUTE";
  const completed = lunchStatus === "COMPLETED" || courierDelivered;
  const ready = lunchStatus === "READY";

  const snapshot = Array.isArray(row?.itemsSnapshot) ? row.itemsSnapshot : [];
  const items = snapshot.map((item: any) => ({
    storeId: String(row?.storeId ?? "") || null,
    productId: String(item?.itemId ?? "") || null,
    name: String(item?.name ?? "Producto"),
    description: item?.automatic ? "Incluido automáticamente" : null,
    qty: Math.max(0, Number(item?.qty ?? 0)),
    priceCOP: Math.max(0, Number(item?.priceCOP ?? 0)),
  }));

  const totalCOP = items.reduce((sum: number, item: any) => sum + item.qty * item.priceCOP, 0);

  return {
    id: String(row?.id ?? ""),
    sourceType: "LUNCH_ORDER",
    lunchStatus,
    fulfillment: String(row?.fulfillment ?? "DELIVERY").toUpperCase(),
    deliveryReference: row?.deliveryReference ?? null,
    lunchPaymentMethod: row?.paymentMethod ?? null,
    status: rejected ? "CANCELLED" : completed ? "DELIVERED" : courierEnRoute ? "EN_ROUTE" : "AVAILABLE",
    flowStatus: rejected ? "CANCELLED" : completed ? "DELIVERED" : courierEnRoute ? "EN_ROUTE" : ready ? "PREPARING" : lunchStatus === "PREPARING" ? "PREPARING" : confirmed ? "STORE_CONFIRMED" : "WAITING_CONFIRMATION",
    paymentStatus: confirmed ? "PAID" : "PENDING",
    paymentReference: row?.paymentReference ?? null,
    paidAt: row?.paymentVerifiedAt ?? null,
    createdAt: String(row?.createdAt ?? new Date().toISOString()),
    updatedAt: String(row?.updatedAt ?? row?.createdAt ?? new Date().toISOString()),
    dropoffAddress: String(row?.deliveryAddress ?? (String(row?.fulfillment).toUpperCase() === "PICKUP" ? "Recoge en el restaurante" : "")),
    customerNote: row?.customerNote ?? null,
    totalCOP,
    deliveryFeeCOP: 0,
    tipCOP: 0,
    pickups: [{
      sequence: 1,
      pickupAddress: String(row?.store?.address ?? "Restaurante"),
      storeConfirmedAt: confirmed ? (row?.paymentVerifiedAt ?? row?.updatedAt ?? row?.createdAt) : null,
      storeRejectedAt: rejected ? (row?.updatedAt ?? row?.createdAt) : null,
      rejectReason: rejected ? "Pedido rechazado por el restaurante" : null,
      store: { id: String(row?.storeId ?? ""), storeCode, name: String(row?.store?.name ?? "Restaurante") },
    }],
    items,
    ...(row?.customer ? { customer: row.customer } : {}),
  } as ApiOrder;
}

export function useStoreOrders({
  storeCode,
  storeFetch,
  doLogout,
  isUnauthorizedErrMessage,
}: Props) {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rejectReasonByOrderId, setRejectReasonByOrderId] = useState<Record<string, string>>({});
  const [openByOrderId, setOpenByOrderId] = useState<Record<string, boolean>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [ordersFilter, setOrdersFilter] = useState<
    "ALL" | "PENDING" | "PREPARING" | "EN_ROUTE" | "DELIVERED"
  >("ALL");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [printingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [regularResult, lunchResult] = await Promise.allSettled([
        storeFetch<ApiOrder[]>(`/orders/store`, { method: "GET" }),
        storeFetch<any[]>(`/lunch/store/orders`, { method: "GET" }),
      ]);

      if (regularResult.status === "rejected" && lunchResult.status === "rejected") {
        throw regularResult.reason;
      }

      const regular = regularResult.status === "fulfilled" && Array.isArray(regularResult.value) ? regularResult.value : [];
      const lunchRaw = lunchResult.status === "fulfilled" && Array.isArray(lunchResult.value) ? lunchResult.value : [];
      const lunch = lunchRaw.map((row) => adaptLunchOrder(row, storeCode));
      const normalized = [...regular, ...lunch];
      normalized.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      setOrders(normalized);

      setSelectedOrderId((prev) => {
        if (prev && normalized.some((o) => o.id === prev)) return prev;
        return null;
      });

      setRejectReasonByOrderId((prev) => {
        const next = { ...prev };
        for (const o of normalized) {
          if (!next[o.id]) {
            next[o.id] =
              REJECT_REASONS[0]?.value || "Tienda inactiva temporalmente (timeout)";
          }
        }
        return next;
      });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return;
      }
      setErr(e?.message ?? "Error cargando órdenes");
    } finally {
      setLoading(false);
    }
  }

  const buckets = useMemo(() => {
    const waiting = orders.filter((o) => resolveStoreVisibleStage(o, storeCode) === "PENDING");
    const preparing = orders.filter((o) => resolveStoreVisibleStage(o, storeCode) === "PREPARING");
    const enRoute = orders.filter((o) => resolveStoreVisibleStage(o, storeCode) === "EN_ROUTE");
    const delivered = orders.filter((o) => resolveStoreVisibleStage(o, storeCode) === "DELIVERED");

    return { waiting, preparing, enRoute, delivered };
  }, [orders, storeCode]);

  // Mantener lista completa evita perder historial o etapas cuando la UI filtra por su cuenta.
  const ordersList = useMemo(() => {
    return orders;
  }, [orders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o.id === selectedOrderId) ?? null;
  }, [orders, selectedOrderId]);

  useEffect(() => {
    setSelectedOrderId(null);
  }, [ordersFilter]);

  async function confirmOrder(id: string) {
    if (busyId) return;
    setErr(null);
    setBusyId(id);

    try {
      const current = orders.find((o) => o.id === id);
      if (current?.sourceType === "LUNCH_ORDER") {
        await storeFetch(`/lunch/store/orders/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED" }),
        });
        await load();
        return;
      }
      await storeFetch(`/orders/${id}/store-confirmed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeCode }),
      });
      await load();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return;
      }
      setErr(e?.message ?? "No se pudo confirmar");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectOrder(id: string, reason: string) {
    if (busyId) return;
    setErr(null);
    setBusyId(id);

    try {
      const finalReason = String(reason ?? "").trim() || "Otro";
      const current = orders.find((o) => o.id === id);
      if (current?.sourceType === "LUNCH_ORDER") {
        await storeFetch(`/lunch/store/orders/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "REJECTED", reason: finalReason }),
        });
        await load();
        return;
      }
      await storeFetch(`/orders/${id}/store-rejected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeCode, reason: finalReason }),
      });
      await load();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return;
      }
      setErr(e?.message ?? "No se pudo rechazar");
    } finally {
      setBusyId(null);
    }
  }

  async function markPreparing(id: string) {
    if (busyId) return;
    setErr(null);
    setBusyId(id);

    try {
      const currentOrder = orders.find((o) => o.id === id) ?? null;
      if (currentOrder?.sourceType === "LUNCH_ORDER") {
        await storeFetch(`/lunch/store/orders/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PREPARING" }),
        });
        await load();
        return;
      }
      const readyMode = shouldNotifyReadyForPickup(currentOrder);

      await storeFetch(`/orders/${id}/preparing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      await load();

      if (readyMode) {
        setErr(null);
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return;
      }

      const currentOrder = orders.find((o) => o.id === id) ?? null;
      const readyMode = shouldNotifyReadyForPickup(currentOrder);

      setErr(
        e?.message ??
          (readyMode
            ? "No se pudo avisar al conductor que el pedido está listo"
            : "No se pudo marcar preparando")
      );
    } finally {
      setBusyId(null);
    }
  }

  return {
    orders,
    loading,
    err,
    setErr,

    rejectReasonByOrderId,
    setRejectReasonByOrderId,
    openByOrderId,
    setOpenByOrderId,
    selectedOrderId,
    setSelectedOrderId,

    ordersFilter,
    setOrdersFilter,

    busyId,
    printingId,

    load,
    buckets,
    ordersList,
    selectedOrder,

    confirmOrder,
    rejectOrder,
    markPreparing,

    getMyItems,
    calcItemsSubtotalCOP,
    getMyPickup,
  };
}