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
      const list = await storeFetch<ApiOrder[]>(`/orders/store`, { method: "GET" });

      const normalized = Array.isArray(list) ? list : [];
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