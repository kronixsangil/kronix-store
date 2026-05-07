// app/store/components/OrderDetail.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

import { ApiOrder, REJECT_REASONS } from "../lib/storeTypes";
import {
  getMyItems,
  getMyPickup,
  calcItemsSubtotalCOP,
  formatCOP,
  normFlow,
  normStatus,
} from "../lib/storeUtils";
import { playSound } from "../lib/alerts/sound";

const READY_PICKUP_STORAGE_KEY = "ct_store_ready_pickup_notified_v2";
const DRIVER_WAITING_STORAGE_KEY = "ct_store_driver_waiting_v1";
const STORE_NOTICE_STORAGE_KEY = "ct_store_notice_v1";

function formatShortOrderId(id?: string | null) {
  const clean = String(id ?? "").trim();
  if (!clean) return "...------";
  return `...${clean.slice(-6)}`;
}

function isMyPickupConfirmed(myPickup: any) {
  return !!myPickup?.storeConfirmedAt;
}
function isMyPickupPending(myPickup: any) {
  return !!myPickup && !myPickup.storeConfirmedAt && !myPickup.storeRejectedAt;
}

function hasAssignedDriver(order: ApiOrder) {
  return Boolean(String((order as any)?.driver?.id ?? (order as any)?.driverId ?? "").trim());
}

function canConfirmForMe(myPickup: any, status: string) {
  return isMyPickupPending(myPickup) && status !== "CANCELLED" && status !== "DELIVERED";
}
function canRejectForMe(myPickup: any, status: string) {
  return isMyPickupPending(myPickup) && status !== "CANCELLED" && status !== "DELIVERED";
}
function canStartPreparingForMe(
  myPickup: any,
  status: string,
  flowStatus?: string | null,
  paymentStatus?: string | null
) {
  if (status === "CANCELLED" || status === "DELIVERED" || status === "EN_ROUTE") return false;
  if (!isMyPickupConfirmed(myPickup)) return false;

  const flow = normFlow(flowStatus);
  const payment = String(paymentStatus ?? "").toUpperCase();

  if (payment !== "PAID") return false;
  if (flow === "EN_ROUTE" || flow === "DELIVERED" || flow === "CANCELLED" || flow === "PAYMENT_FAILED") {
    return false;
  }

  return flow === "STORE_CONFIRMED" || flow === "PAID";
}

function canReadyForPickupForMe(
  order: ApiOrder,
  myPickup: any,
  status: string,
  flowStatus?: string | null,
  paymentStatus?: string | null
) {
  if (status === "CANCELLED" || status === "DELIVERED" || status === "EN_ROUTE") return false;
  if (!isMyPickupConfirmed(myPickup)) return false;
  if (!hasAssignedDriver(order)) return false;

  const flow = normFlow(flowStatus);
  const payment = String(paymentStatus ?? "").toUpperCase();

  if (payment !== "PAID") return false;
  return flow === "PREPARING";
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printKitchenTicket(order: ApiOrder, storeCode: string, storeName: string) {
  const myItems = getMyItems(order, storeCode);
  const created = new Date(order.createdAt);
  const time = created.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  const date = created.toLocaleDateString("es-CO");

  const itemsHtml = myItems
    .map((it) => {
      const qty = Math.max(0, Math.round(Number(it.qty || 0)));
      const price = Math.max(0, Math.round(Number(it.priceCOP || 0)));
      const line = qty * price;

      const rawDesc =
        String((it as any)?.description ?? "").trim() ||
        String((it as any)?.variantName ?? "").trim() ||
        String((it as any)?.variantLabel ?? "").trim() ||
        String((it as any)?.presentation ?? "").trim() ||
        String((it as any)?.sizeLabel ?? "").trim() ||
        String((it as any)?.size ?? "").trim() ||
        String((it as any)?.unitLabel ?? "").trim();

      const descHtml = rawDesc
        ? `<div style="font-size:12px;color:#444;margin-top:2px;">${escapeHtml(rawDesc)}</div>`
        : "";

      return `
      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;">
        <div style="flex:1;">
          <div>
            <span style="font-weight:bold;">${qty}x</span>
            <span style="margin-left:6px;">${escapeHtml(String(it.name))}</span>
          </div>
          ${descHtml}
        </div>
        <div style="font-weight:bold;white-space:nowrap;">$${line.toLocaleString("es-CO")}</div>
      </div>
    `;
    })
    .join("");

  const total = calcItemsSubtotalCOP(myItems);

  const noteHtml = order.customerNote
    ? `<div class="note"><strong>NOTA:</strong> ${escapeHtml(order.customerNote)}</div>`
    : "";

  const customerName =
    String((order as any)?.customerName ?? "").trim() ||
    String((order as any)?.customer?.name ?? "").trim() ||
    "CLIENTE";

  const html = `
  <html>
    <head>
      <title>Comanda</title>
      <style>
        @page { width: 80mm; margin: 0; }
        body {
          width: 76mm;
          font-family: monospace;
          padding: 10px;
          font-size: 14px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .note {
          margin-top: 10px;
          font-size: 13px;
        }
        .total {
          display:flex;
          justify-content:space-between;
          margin-top:10px;
          padding-top:8px;
          border-top:1px solid #000;
          font-weight:bold;
        }
      </style>
    </head>
    <body>
      <div class="center bold">KRONIX</div>
      <div class="center bold">${escapeHtml(storeName || "TIENDA")}</div>
      <div class="divider"></div>

      <div class="bold">ORDEN ${escapeHtml(formatShortOrderId(order.id))}</div>
      <div>${escapeHtml(time)} · ${escapeHtml(date)}</div>

      <div class="divider"></div>

      <div class="bold">CLIENTE:</div>
      <div>${escapeHtml(customerName)}</div>

      <div class="divider"></div>

      ${itemsHtml}

      <div class="total">
        <div>TOTAL</div>
        <div>$${Math.round(total).toLocaleString("es-CO")}</div>
      </div>

      ${noteHtml}

      <div class="divider"></div>
      <div class="center">KroniX</div>
    </body>
  </html>
  `;

  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;

  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function elapsedFromIso(iso?: string | null) {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t)) return "00:00:00";

  const diffMs = Math.max(0, Date.now() - t);
  const totalSeconds = Math.floor(diffMs / 1000);

  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function loadReadyPickupMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(READY_PICKUP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveReadyPickupMap(next: Record<string, boolean>) {
  try {
    localStorage.setItem(READY_PICKUP_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function readyKey(orderId: string, storeCode: string) {
  return `${String(orderId ?? "").trim()}__${String(storeCode ?? "").trim()}`;
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

function clearDriverWaitingNotice(orderId?: string | null) {
  const clean = String(orderId ?? "").trim();
  if (!clean) return;
  try {
    const next = { ...loadDriverWaitingMap() };
    delete next[clean];
    localStorage.setItem(DRIVER_WAITING_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function noticeKey(orderId: string, storeCode: string) {
  return `${String(orderId ?? "").trim()}__${String(storeCode ?? "").trim()}`;
}

function loadStoreNoticeMap(): Record<
  string,
  {
    type?: "DRIVER_WAITING" | "READY_PICKUP" | "PAYMENT_CONFIRMED";
    orderId?: string | null;
    storeCode?: string | null;
    message?: string | null;
    updatedAt?: string | null;
  }
> {
  try {
    const raw = localStorage.getItem(STORE_NOTICE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoreNoticeMap(
  next: Record<
    string,
    {
      type?: "DRIVER_WAITING" | "READY_PICKUP" | "PAYMENT_CONFIRMED";
      orderId?: string | null;
      storeCode?: string | null;
      message?: string | null;
      updatedAt?: string | null;
    }
  >
) {
  try {
    localStorage.setItem(STORE_NOTICE_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function CompactInfo({
  value,
  label,
}: {
  value: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="rounded-[14px] bg-white/10 px-3 py-2.5 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="text-[18px] font-black leading-none text-white">{value}</div>
      {label ? (
        <div className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-300">
          {label}
        </div>
      ) : null}
    </div>
  );
}

function RejectModal({
  selectedReason,
  setSelectedReason,
  onCancel,
  onAccept,
  busy,
}: {
  selectedReason: string;
  setSelectedReason: (v: string) => void;
  onCancel: () => void;
  onAccept: () => void;
  busy: boolean;
}) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/30 backdrop-blur-[2px]">
      <div className="w-full max-w-[420px] rounded-[22px] border border-white/70 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="text-[20px] font-black leading-none text-slate-900">Rechazar pedido</div>
        <div className="mt-2 text-[13px] font-medium leading-snug text-slate-500">
          Selecciona el motivo de rechazo para continuar.
        </div>

        <div className="mt-4">
          <select
            value={selectedReason}
            disabled={busy}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="h-11 w-full rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-100 disabled:opacity-60"
          >
            {REJECT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-[14px] bg-slate-100 px-4 text-[13px] font-extrabold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className="inline-flex h-10 items-center justify-center rounded-[14px] bg-red-600 px-4 text-[13px] font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Rechazando…" : "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetail({
  order,
  storeCode,
  busyId,
  rejectReasonByOrderId,
  setRejectReasonByOrderId,
  openByOrderId,
  setOpenByOrderId,
  onConfirm,
  onReject,
  onPreparing,
  printing,
}: {
  order: ApiOrder;
  storeCode: string;
  busyId: string | null;
  rejectReasonByOrderId: Record<string, string>;
  setRejectReasonByOrderId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  openByOrderId: Record<string, boolean>;
  setOpenByOrderId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onConfirm: (id: string) => void | Promise<void>;
  onReject: (id: string, reason: string) => void | Promise<void>;
  onPreparing: (id: string) => void | Promise<void>;
  printing: boolean;
}) {
  const status = normStatus(order.status);
  const flow = normFlow(order.flowStatus);

  const myPickup = getMyPickup(order, storeCode);
  const showConfirm = canConfirmForMe(myPickup, status);
  const showReject = canRejectForMe(myPickup, status);
  const showPreparing = canStartPreparingForMe(myPickup, status, order.flowStatus, order.paymentStatus);
  const showReadyForPickup = canReadyForPickupForMe(order, myPickup, status, order.flowStatus, order.paymentStatus);

  const isBusy = busyId === order.id;

  const myItems = getMyItems(order, storeCode);
  const mySubtotal = calcItemsSubtotalCOP(myItems);

  const currentReason = rejectReasonByOrderId[order.id] || REJECT_REASONS[0]?.value || "Otro";
  const isOpen = openByOrderId[order.id] ?? true;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [elapsedLabel, setElapsedLabel] = useState(() => elapsedFromIso(order.createdAt));
  const [driverAccordionOpen, setDriverAccordionOpen] = useState(false);
  const [readyNotified, setReadyNotified] = useState(false);
  const [driverWaitingNotice, setDriverWaitingNotice] = useState<{
    driverName?: string | null;
    driverPhone?: string | null;
    storeName?: string | null;
    updatedAt?: string | null;
  } | null>(null);
  const [storeNotice, setStoreNotice] = useState<string | null>(null);

  useEffect(() => {
    setElapsedLabel(elapsedFromIso(order.createdAt));
    const id = window.setInterval(() => {
      setElapsedLabel(elapsedFromIso(order.createdAt));
    }, 1000);

    return () => window.clearInterval(id);
  }, [order.createdAt, order.id]);

  useEffect(() => {
    const map = loadReadyPickupMap();
    setReadyNotified(Boolean(map[readyKey(order.id, storeCode)]));

    const waitingMap = loadDriverWaitingMap();
    setDriverWaitingNotice(waitingMap[order.id] ?? null);

    const noticeMap = loadStoreNoticeMap();
    const currentNotice = noticeMap[noticeKey(order.id, storeCode)] ?? null;

    if (
      String(currentNotice?.orderId ?? "").trim() === String(order.id).trim() &&
      String(currentNotice?.storeCode ?? "").trim() === String(storeCode).trim()
    ) {
      setStoreNotice(String(currentNotice?.message ?? "").trim() || null);
    } else {
      setStoreNotice(null);
    }

    if (flow === "EN_ROUTE" || flow === "DELIVERED" || status === "EN_ROUTE" || status === "DELIVERED") {
      clearDriverWaitingNotice(order.id);
      setDriverWaitingNotice(null);
    }
  }, [order, flow, status, storeCode]);

  const customerName =
    String((order as any)?.customerName ?? "").trim() ||
    String((order as any)?.customer?.name ?? "").trim() ||
    "Cliente";

  const ticketStoreName = myPickup?.store?.name || "TIENDA";

  const driverName = String(order.driver?.name ?? "").trim();
  const driverPhone = String(order.driver?.phone ?? "").trim();
  const driverVehicleBrand = String(order.driver?.vehicle?.brand ?? "").trim();
  const driverVehiclePlate = String(order.driver?.vehicle?.plate ?? "").trim();
  const driverVehicleColor = String(order.driver?.vehicle?.color ?? "").trim();
  const hasDriver = hasAssignedDriver(order);

  const driverVehicleLabel = useMemo(() => {
    const parts = [driverVehicleBrand, driverVehicleColor].filter(Boolean);
    return parts.join(" · ");
  }, [driverVehicleBrand, driverVehicleColor]);

  async function handleReadyForPickup() {
    if (isBusy) return;
    if (readyNotified) return;

    await onPreparing(order.id);

    const next = {
      ...loadReadyPickupMap(),
      [readyKey(order.id, storeCode)]: true,
    };

    saveReadyPickupMap(next);
    setReadyNotified(true);

    try {
      playSound("GENERIC", 0.9);
    } catch {}

    const message = "Avisaste al conductor que el pedido está listo para recoger.";
    setStoreNotice(message);

    const noticeMap = loadStoreNoticeMap();
    noticeMap[noticeKey(order.id, storeCode)] = {
      type: "READY_PICKUP",
      orderId: order.id,
      storeCode,
      message,
      updatedAt: new Date().toISOString(),
    };
    saveStoreNoticeMap(noticeMap);
  }

  const rows = myItems.map((it, idx) => {
    const qty = Math.max(0, Math.round(Number(it.qty || 0)));
    const price = Math.max(0, Math.round(Number(it.priceCOP || 0)));
    const line = qty * price;

    const secondaryText =
      String((it as any)?.description ?? "").trim() ||
      String((it as any)?.variantName ?? "").trim() ||
      String((it as any)?.variantLabel ?? "").trim() ||
      String((it as any)?.presentation ?? "").trim() ||
      String((it as any)?.sizeLabel ?? "").trim() ||
      String((it as any)?.size ?? "").trim() ||
      String((it as any)?.unitLabel ?? "").trim() ||
      "";

    return {
      key: `${order.id}-it-${idx}`,
      qty,
      name: String(it.name),
      line,
      secondaryText,
    };
  });

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2">
      {showRejectModal ? (
        <RejectModal
          selectedReason={currentReason}
          setSelectedReason={(v) =>
            setRejectReasonByOrderId((prev) => ({ ...prev, [order.id]: v }))
          }
          onCancel={() => setShowRejectModal(false)}
          onAccept={() => {
            setShowRejectModal(false);
            onReject(order.id, currentReason);
          }}
          busy={isBusy}
        />
      ) : null}

      <div className="rounded-[18px] bg-[linear-gradient(135deg,#13264c_0%,#1f355e_48%,#223551_100%)] px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[12px] font-black text-blue-100">{customerName}</div>
            <div className="mt-1 break-all text-[17px] font-black leading-tight">
              {formatShortOrderId(order.id)}
            </div>
          </div>

          <button
            onClick={() => printKitchenTicket(order, storeCode, ticketStoreName)}
            className="inline-flex h-11 min-w-[126px] shrink-0 items-center justify-center rounded-full bg-white/12 px-4 text-[13px] font-extrabold text-white ring-1 ring-white/10 transition hover:bg-white/18 disabled:opacity-60"
            disabled={printing}
            title="Imprimir comanda"
          >
            {printing ? "Imprimiendo…" : "🖨 Imprimir"}
          </button>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[1.4fr_1fr]">
          <CompactInfo value={formatCOP(mySubtotal)} label="Subtotal" />
          <CompactInfo value={elapsedLabel} label="Temporizador" />
        </div>
      </div>

      {storeNotice ? (
        <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] font-semibold leading-snug text-emerald-900 shadow-[0_4px_10px_rgba(16,185,129,0.08)]">
          {storeNotice}
        </div>
      ) : null}

      {driverWaitingNotice ? (
        <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-snug text-amber-900 shadow-[0_4px_10px_rgba(245,158,11,0.05)]">
          <div className="font-extrabold">🛵 Conductor en espera</div>
          <div className="mt-1 font-medium">
            {String(driverWaitingNotice.driverName ?? "").trim() || "El conductor"} ya llegó a la tienda.
          </div>
        </div>
      ) : null}

      {order.customerNote ? (
        <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-snug text-amber-900 shadow-[0_4px_10px_rgba(245,158,11,0.05)]">
          <span className="font-extrabold">📝 Nota del cliente:</span> {order.customerNote}
        </div>
      ) : null}

      <div className="rounded-[18px] border border-white/60 bg-white/94 p-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
        <button
          type="button"
          onClick={() => setDriverAccordionOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 rounded-[14px] bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
        >
          <div>
            <div className="text-[15px] font-black text-slate-900">
              {driverWaitingNotice ? "Conductor en espera" : "Conductor asignado"}
            </div>
            <div className="mt-1 text-[12px] font-medium text-slate-500">
              Datos para entregar el pedido al conductor correcto.
            </div>
          </div>

          <div className="text-[16px] font-black text-slate-600">
            {driverAccordionOpen ? "−" : "+"}
          </div>
        </button>

        {driverAccordionOpen ? (
          hasDriver ? (
            <div className="mt-3 rounded-[16px] border border-emerald-200 bg-emerald-50/80 px-4 py-3">
              <div className="grid gap-2">
                <div className="text-[13px] font-medium text-slate-600">Nombre</div>
                <div className="text-[15px] font-black text-slate-900">
                  {driverName || driverWaitingNotice?.driverName || "No disponible"}
                </div>

                <div className="mt-1 text-[13px] font-medium text-slate-600">Vehículo</div>
                <div className="text-[14px] font-extrabold text-slate-900">
                  {driverVehicleLabel || "No disponible"}
                </div>

                <div className="mt-1 text-[13px] font-medium text-slate-600">Placa</div>
                <div className="text-[14px] font-extrabold text-slate-900">
                  {driverVehiclePlate || "No disponible"}
                </div>

                <div className="mt-1 text-[13px] font-medium text-slate-600">Teléfono</div>
                <div className="text-[14px] font-extrabold text-slate-900">
                  {driverPhone || driverWaitingNotice?.driverPhone || "No disponible"}
                </div>
              </div>

              {driverWaitingNotice ? (
                <div className="mt-3 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
                  El conductor ya llegó y está esperando el pedido en tienda.
                </div>
              ) : (showReadyForPickup || readyNotified) ? (
                <div className="mt-3 text-[12px] font-semibold text-emerald-800">
                  {readyNotified
                    ? "Ya avisaste al conductor que el pedido está listo."
                    : "Cuando el pedido esté listo, puedes avisarle al conductor desde el botón inferior."}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900">
              Aún no hay conductor asignado para esta orden.
            </div>
          )
        ) : null}
      </div>

      <div className="rounded-[18px] border border-white/60 bg-white/94 p-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[17px] font-black text-slate-900">Artículos del pedido</div>
            <div className="mt-1 text-[12px] font-medium text-slate-500">
              Valores sin descuentos, promos, ni agregados de servicio
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpenByOrderId((p) => ({ ...p, [order.id]: !isOpen }))}
            className="rounded-full bg-slate-100 px-4 py-2 text-[12px] font-extrabold text-slate-700 transition hover:bg-slate-200"
          >
            {isOpen ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {isOpen ? (
          <div className="ct-scroll-y mt-3 max-h-[260px] space-y-2 pr-1">
            {!rows.length ? (
              <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600">
                No hay ítems para esta tienda.
              </div>
            ) : (
              <>
                {rows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-slate-50/85 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                  >
                    <div className="min-w-0 flex flex-1 items-start gap-2">
                      <span className="shrink-0 pt-0.5 text-[18px] font-black leading-none text-red-600">
                        {row.qty}
                      </span>
                      <span className="shrink-0 pt-0.5 text-[15px] font-black leading-none text-red-600">
                        X
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-extrabold leading-snug text-slate-900">
                          {row.name}
                        </div>

                        {row.secondaryText ? (
                          <div className="mt-0.5 truncate text-[12px] font-medium leading-snug text-slate-500">
                            {row.secondaryText}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 text-[15px] font-black text-slate-900">
                      {formatCOP(row.line)}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-[14px] border border-slate-200 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <div className="text-[16px] font-black text-slate-900">TOTAL</div>
                  <div className="text-[16px] font-black text-slate-900">
                    {formatCOP(Math.round(mySubtotal))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-auto rounded-[18px] border border-white/60 bg-white/94 p-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          {showConfirm ? (
            <button
              disabled={isBusy}
              onClick={() => onConfirm(order.id)}
              className="inline-flex h-11 items-center justify-center rounded-[14px] bg-emerald-600 px-5 text-[14px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              ✅ Confirmar
            </button>
          ) : null}

          {showPreparing ? (
            <button
              disabled={isBusy}
              onClick={() => onPreparing(order.id)}
              className="inline-flex h-11 items-center justify-center rounded-[14px] bg-blue-600 px-5 text-[14px] font-extrabold text-white transition hover:bg-blue-700 disabled:opacity-60"
              title="Marcar orden como preparando"
            >
              👨‍🍳 Preparando
            </button>
          ) : null}

          {(showReadyForPickup || readyNotified) ? (
            <button
              disabled={isBusy || readyNotified}
              onClick={handleReadyForPickup}
              className="inline-flex h-11 items-center justify-center rounded-[14px] bg-emerald-600 px-5 text-[14px] font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white/90"
              title="Avisar al conductor que el pedido está listo para recoger"
            >
              {readyNotified ? "✅ Conductor avisado" : "✅ Listo para recoger"}
            </button>
          ) : null}

          {showReject ? (
            <button
              disabled={isBusy}
              onClick={() => setShowRejectModal(true)}
              className="inline-flex h-11 items-center justify-center rounded-[14px] bg-red-600 px-5 text-[14px] font-extrabold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              ❌ Rechazar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}