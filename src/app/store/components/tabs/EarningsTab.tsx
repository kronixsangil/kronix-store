//src\app\store\components\tabs\EarningsTab.tsx
"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import SmallChip from "../ui/SmallChip";
import { useStoreCity } from "../context/StoreCityContext";
import { formatCOP } from "../../lib/storeUtils";

type EarningsRow = {
  key: string;
  orders: number;
  storePayout: number;
  salesProducts: number;
  platformCommission: number;
};

type StoreCourierRow = {
  id: string;
  shortId?: string;
  createdAt: string;
  updatedAt?: string;
  status?: string | null;
  flowStatus?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  totalCOP?: number;
  deliveryFeeCOP?: number;
  serviceFeeCOP?: number;
  promoCOP?: number;
  tipCOP?: number;
  pickupAddress?: string | null;
  pickupPlaceName?: string | null;
  pickupReference?: string | null;
  dropoffAddress?: string | null;
  dropoffPlaceName?: string | null;
  dropoffReference?: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  packageType?: string | null;
  packageDescription?: string | null;
  customerNote?: string | null;
  driver?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
    vehicle?: {
      brand?: string | null;
      plate?: string | null;
      color?: string | null;
    } | null;
  } | null;
};

type StoreCourierPeriodRow = {
  key: string;
  services: number;
  totalCOP: number;
  deliveredServices: number;
  activeServices: number;
  cancelledServices: number;
};

type StoreCourierResponse = {
  summary?: {
    totalServices?: number;
    totalCOP?: number;
    deliveredServices?: number;
    deliveredCOP?: number;
    activeServices?: number;
    activeCOP?: number;
    cancelledServices?: number;
    cancelledCOP?: number;
    pendingReconciliationCOP?: number;
    averageServiceCOP?: number;
  };
  byPeriod?: StoreCourierPeriodRow[];
  rows?: StoreCourierRow[];
};

type Props = {
  earningsScope: "WEEKLY" | "MONTHLY" | "YEARLY";
  setEarningsScope: Dispatch<SetStateAction<"WEEKLY" | "MONTHLY" | "YEARLY">>;
  earnings: {
    rows: EarningsRow[];
    totalOrders: number;
    storePayout: number;
    salesProducts: number;
    platformCommission: number;
  };
};

type CourierViewScope = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";

type CourierGroupedPeriod = {
  key: string;
  label: string;
  rangeLabel: string;
  services: number;
  totalCOP: number;
  deliveredServices: number;
  activeServices: number;
  cancelledServices: number;
  rows: StoreCourierRow[];
  sortTime: number;
};

function readErrorMessage(e: any) {
  const raw = String(e?.message ?? e ?? "").trim();

  try {
    const parsed = JSON.parse(raw);
    const msg = String(parsed?.message ?? parsed?.error ?? "").trim();
    if (msg) return msg;
  } catch {}

  return raw || "No fue posible cargar la información.";
}

function formatShortOrderId(id?: string | null) {
  const clean = String(id ?? "").trim();
  if (!clean) return "...------";
  return `...${clean.slice(-6)}`;
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "Sin fecha";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatDateOnly(value?: string | Date | null) {
  if (!value) return "Sin fecha";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function statusLabel(status?: string | null, flowStatus?: string | null) {
  const s = String(status ?? "").toUpperCase();
  const f = String(flowStatus ?? "").toUpperCase();

  if (s === "DELIVERED" || f === "DELIVERED") return "Entregado";
  if (s === "CANCELLED" || f === "CANCELLED") return "Cancelado";
  if (s === "EN_ROUTE" || f === "EN_ROUTE") return "En ruta";
  if (s === "ASSIGNED") return "Asignado";
  if (f === "PAID") return "Disponible";
  if (f === "STORE_CONFIRMED") return "Confirmado";
  return "Activo";
}

function statusTone(status?: string | null, flowStatus?: string | null) {
  const s = String(status ?? "").toUpperCase();
  const f = String(flowStatus ?? "").toUpperCase();

  if (s === "DELIVERED" || f === "DELIVERED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (s === "CANCELLED" || f === "CANCELLED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (s === "EN_ROUTE" || f === "EN_ROUTE" || s === "ASSIGNED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function isDeliveredService(row: StoreCourierRow) {
  const s = String(row.status ?? "").toUpperCase();
  const f = String(row.flowStatus ?? "").toUpperCase();
  return s === "DELIVERED" || f === "DELIVERED";
}

function isCancelledService(row: StoreCourierRow) {
  const s = String(row.status ?? "").toUpperCase();
  const f = String(row.flowStatus ?? "").toUpperCase();
  return s === "CANCELLED" || f === "CANCELLED";
}

function getMonday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getCourierPeriodInfo(date: Date, scope: CourierViewScope) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = d.getMonth();

  if (scope === "WEEKLY") {
    const start = getMonday(d);
    const end = addDays(start, 6);
    const key = `WEEKLY-${start.toISOString().slice(0, 10)}`;

    return {
      key,
      label: `Semana ${formatDateOnly(start)} - ${formatDateOnly(end)}`,
      rangeLabel: `${formatDateOnly(start)} → ${formatDateOnly(end)}`,
      sortTime: start.getTime(),
    };
  }

  if (scope === "BIWEEKLY") {
    const firstHalf = d.getDate() <= 15;
    const start = new Date(year, month, firstHalf ? 1 : 16);
    const end = new Date(year, month + 1, 0);
    if (firstHalf) end.setDate(15);

    const key = `BIWEEKLY-${year}-${String(month + 1).padStart(2, "0")}-${firstHalf ? "01" : "16"}`;

    return {
      key,
      label: `${firstHalf ? "Primera quincena" : "Segunda quincena"} · ${formatMonthYear(d)}`,
      rangeLabel: `${formatDateOnly(start)} → ${formatDateOnly(end)}`,
      sortTime: start.getTime(),
    };
  }

  if (scope === "MONTHLY") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const key = `MONTHLY-${year}-${String(month + 1).padStart(2, "0")}`;

    return {
      key,
      label: formatMonthYear(d),
      rangeLabel: `${formatDateOnly(start)} → ${formatDateOnly(end)}`,
      sortTime: start.getTime(),
    };
  }

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return {
    key: `YEARLY-${year}`,
    label: String(year),
    rangeLabel: `${formatDateOnly(start)} → ${formatDateOnly(end)}`,
    sortTime: start.getTime(),
  };
}

function ScopeBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-9 items-center justify-center rounded-full px-4 text-[12px] font-extrabold transition",
        active
          ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CourierScopeBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-extrabold transition",
        active
          ? "bg-[linear-gradient(135deg,#111827_0%,#334155_56%,#94a3b8_100%)] text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)]"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
  tone?: "default" | "dark" | "blue" | "green" | "silver";
}) {
  const toneClass =
    tone === "dark"
      ? "bg-[linear-gradient(135deg,#17294e_0%,#243756_100%)] text-white border-transparent shadow-[0_10px_24px_rgba(15,23,42,0.10)]"
      : tone === "blue"
      ? "bg-[linear-gradient(135deg,#1888f3_0%,#1497ff_100%)] text-white border-transparent shadow-[0_10px_24px_rgba(24,136,243,0.14)]"
      : tone === "green"
      ? "bg-[linear-gradient(135deg,#06b85c_0%,#08c25d_100%)] text-white border-transparent shadow-[0_10px_24px_rgba(6,184,92,0.14)]"
      : tone === "silver"
      ? "bg-[linear-gradient(135deg,#111827_0%,#475569_48%,#cbd5e1_100%)] text-white border-transparent shadow-[0_12px_26px_rgba(15,23,42,0.16)]"
      : "border border-slate-200 bg-white text-slate-900 shadow-[0_4px_14px_rgba(15,23,42,0.03)]";

  const labelClass = tone === "default" ? "text-slate-400" : "text-white/72";
  const helperClass = tone === "default" ? "text-slate-500" : "text-white/88";

  return (
    <div className={`rounded-[18px] border px-4 py-3 ${toneClass}`}>
      <div className={`text-[10px] font-extrabold uppercase tracking-[0.16em] ${labelClass}`}>
        {label}
      </div>

      <div className="mt-2 text-[22px] font-black leading-none">{value}</div>

      {helper ? (
        <div className={`mt-2 text-[12px] font-medium leading-snug ${helperClass}`}>
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white px-4 py-3">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-[16px] font-black leading-none text-slate-900">{value}</div>
    </div>
  );
}

function PeriodRow({
  row,
  totalStorePayout,
}: {
  row: EarningsRow;
  totalStorePayout: number;
}) {
  const ratio =
    totalStorePayout > 0
      ? Math.max(10, Math.min(100, (row.storePayout / totalStorePayout) * 100))
      : 10;

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[16px] font-black leading-none text-slate-900">{row.key}</div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-medium text-slate-500">
            <span>
              {row.orders} {row.orders === 1 ? "orden" : "órdenes"}
            </span>
            <span className="text-slate-300">•</span>
            <span>Ventas {formatCOP(Math.round(row.salesProducts))}</span>
            <span className="text-slate-300">•</span>
            <span>Comisión {formatCOP(Math.round(row.platformCommission))}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[20px] font-black leading-none text-slate-900">
            {formatCOP(Math.round(row.storePayout))}
          </div>
          <div className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-600">
            Neto tienda
          </div>
        </div>
      </div>

      <div className="mt-3 h-2.5 rounded-full bg-slate-100">
        <div
          className="h-2.5 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

function CourierServiceCompactRow({ row }: { row: StoreCourierRow }) {
  const driverName = String(row.driver?.name ?? "").trim();
  const vehiclePlate = String(row.driver?.vehicle?.plate ?? "").trim();
  const totalCOP = Math.round(Number(row.totalCOP ?? 0));

  return (
    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] items-center gap-3 border-t border-slate-100 px-3 py-2.5 first:border-t-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-black text-slate-900">
            {row.shortId || formatShortOrderId(row.id)}
          </span>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${statusTone(
              row.status,
              row.flowStatus
            )}`}
          >
            {statusLabel(row.status, row.flowStatus)}
          </span>
        </div>
        <div className="mt-1 text-[11px] font-semibold text-slate-500">
          {formatDateTime(row.createdAt)}
        </div>
      </div>

      <div className="min-w-0 text-[11px] font-medium leading-snug text-slate-600">
        <div className="truncate">
          <b>Recogida:</b> {row.pickupPlaceName || row.pickupAddress || "Tienda"}
        </div>
        <div className="truncate">
          <b>Driver:</b> {driverName || "Sin asignar"}{vehiclePlate ? ` · ${vehiclePlate}` : ""}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[14px] font-black text-slate-900">{formatCOP(totalCOP)}</div>
        <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.10em] text-slate-400">
          A conciliar
        </div>
      </div>
    </div>
  );
}

function CourierPeriodAccordionCard({
  period,
  maxCOP,
  open,
  onToggle,
}: {
  period: CourierGroupedPeriod;
  maxCOP: number;
  open: boolean;
  onToggle: () => void;
}) {
  const ratio = maxCOP > 0 ? Math.max(10, Math.min(100, (period.totalCOP / maxCOP) * 100)) : 10;

  return (
    <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-[18px] font-black leading-none text-white shadow-sm">
          {open ? "−" : "+"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-[15px] font-black text-slate-900">{period.label}</div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">
              {period.services} {period.services === 1 ? "servicio" : "servicios"}
            </span>
          </div>

          <div className="mt-1 text-[11px] font-semibold text-slate-500">
            {period.rangeLabel} · {period.deliveredServices} entregados · {period.activeServices} activos
            {period.cancelledServices ? ` · ${period.cancelledServices} cancelados` : ""}
          </div>

          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-[linear-gradient(90deg,#111827_0%,#64748b_100%)] transition-all"
              style={{ width: `${ratio}%` }}
            />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[18px] font-black leading-none text-slate-900">
            {formatCOP(Math.round(period.totalCOP || 0))}
          </div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            A conciliar
          </div>
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-2 pb-2">
          <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
            {period.rows.map((row) => (
              <CourierServiceCompactRow key={row.id} row={row} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function EarningsTab({
  earningsScope,
  setEarningsScope,
  earnings,
}: Props) {
  const storeCity = useStoreCity();
  const [courierData, setCourierData] = useState<StoreCourierResponse | null>(null);
  const [courierLoading, setCourierLoading] = useState(false);
  const [courierError, setCourierError] = useState<string | null>(null);
  const [courierViewScope, setCourierViewScope] = useState<CourierViewScope>("MONTHLY");
  const [openCourierPeriodKey, setOpenCourierPeriodKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStoreCourierServices() {
      setCourierLoading(true);
      setCourierError(null);

      try {
        const res = await fetch(`/api/store/orders/store/kronix-envios?scope=YEARLY`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "x-ct-app": "store",
          },
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `Error ${res.status}`);
        }

        const json = (await res.json()) as StoreCourierResponse;
        if (!cancelled) setCourierData(json);
      } catch (e: any) {
        if (!cancelled) {
          setCourierData(null);
          setCourierError(readErrorMessage(e));
        }
      } finally {
        if (!cancelled) setCourierLoading(false);
      }
    }

    loadStoreCourierServices();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setOpenCourierPeriodKey(null);
  }, [courierViewScope]);

  const courierSummary = courierData?.summary ?? {};
  const courierRows = courierData?.rows ?? [];

  const groupedCourierPeriods = useMemo(() => {
    const map = new Map<string, CourierGroupedPeriod>();

    courierRows.forEach((row) => {
      const date = new Date(row.createdAt);
      if (Number.isNaN(date.getTime())) return;

      const info = getCourierPeriodInfo(date, courierViewScope);
      const existing = map.get(info.key);
      const amount = Math.round(Number(row.totalCOP ?? 0));
      const delivered = isDeliveredService(row) ? 1 : 0;
      const cancelled = isCancelledService(row) ? 1 : 0;
      const active = !delivered && !cancelled ? 1 : 0;

      if (!existing) {
        map.set(info.key, {
          key: info.key,
          label: info.label,
          rangeLabel: info.rangeLabel,
          services: 1,
          totalCOP: amount,
          deliveredServices: delivered,
          activeServices: active,
          cancelledServices: cancelled,
          rows: [row],
          sortTime: info.sortTime,
        });
        return;
      }

      existing.services += 1;
      existing.totalCOP += amount;
      existing.deliveredServices += delivered;
      existing.activeServices += active;
      existing.cancelledServices += cancelled;
      existing.rows.push(row);
    });

    return Array.from(map.values())
      .map((period) => ({
        ...period,
        rows: period.rows.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }))
      .sort((a, b) => b.sortTime - a.sortTime);
  }, [courierRows, courierViewScope]);

  const maxCourierPeriodCOP = useMemo(
    () => Math.max(0, ...groupedCourierPeriods.map((row) => Math.round(Number(row.totalCOP ?? 0)))),
    [groupedCourierPeriods]
  );

  return (
    <div className="ct-panel ct-tab-frame flex h-full min-h-0 flex-col overflow-hidden p-3">
      <div className="rounded-[18px] border border-white/70 bg-white/70 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="ct-section-title">Ganancias</div>
              {storeCity.hasCity ? <SmallChip tone="softBlue">📍 {storeCity.cityLabel}</SmallChip> : null}
            </div>

            <div className="mt-1 ct-section-desc">
              Vista financiera compacta para tablet horizontal. Incluye ventas entregadas y servicios KroniX Envíos solicitados por la tienda.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ScopeBtn active={earningsScope === "WEEKLY"} onClick={() => setEarningsScope("WEEKLY")}>
              Semanal
            </ScopeBtn>
            <ScopeBtn active={earningsScope === "MONTHLY"} onClick={() => setEarningsScope("MONTHLY")}>
              Mensual
            </ScopeBtn>
            <ScopeBtn active={earningsScope === "YEARLY"} onClick={() => setEarningsScope("YEARLY")}>
              Anual
            </ScopeBtn>
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              label="Ganancia total"
              value={formatCOP(Math.round(earnings.storePayout))}
              helper="Valor neto estimado para esta tienda."
              tone="dark"
            />

            <StatCard
              label="Órdenes entregadas"
              value={earnings.totalOrders}
              helper="Base contabilizada en el rango actual."
            />

            <StatCard
              label="Ventas productos"
              value={formatCOP(Math.round(earnings.salesProducts))}
              helper="Suma total de productos vendidos."
              tone="blue"
            />

            <StatCard
              label="Comisión plataforma"
              value={formatCOP(Math.round(earnings.platformCommission))}
              helper="Regla oficial o snapshot aplicado."
              tone="green"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <StatCard
              label="KroniX Envíos"
              value={courierLoading ? "..." : courierSummary.totalServices ?? 0}
              helper="Servicios solicitados desde esta Store App."
              tone="silver"
            />

            <StatCard
              label="Total servicios"
              value={courierLoading ? "..." : formatCOP(Math.round(courierSummary.totalCOP ?? 0))}
              helper="Valor completo registrado para corte."
            />

            <StatCard
              label="Pendiente conciliación"
              value={courierLoading ? "..." : formatCOP(Math.round(courierSummary.pendingReconciliationCOP ?? 0))}
              helper="Se conciliará desde CTCC en fecha de corte."
              tone="dark"
            />

            <StatCard
              label="Entregados / activos"
              value={courierLoading ? "..." : `${courierSummary.deliveredServices ?? 0} / ${courierSummary.activeServices ?? 0}`}
              helper="Control operativo de servicios solicitados."
            />
          </div>

          <div className="grid grid-cols-[390px_minmax(0,1fr)] items-start gap-2">
            <div className="space-y-2">
              <div className="ct-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[18px] font-black text-slate-900">Resumen financiero</div>
                    <div className="mt-1 text-[12px] font-medium text-slate-500">
                      Vista rápida del neto, ventas y comisión.
                    </div>
                  </div>

                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">
                    {earningsScope === "WEEKLY"
                      ? "Últimos 7 días"
                      : earningsScope === "MONTHLY"
                      ? "Últimos 30 días"
                      : "Últimos 12 meses"}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Neto tienda
                    </div>
                    <div className="mt-1 text-[22px] font-black leading-none text-slate-900">
                      {formatCOP(Math.round(earnings.storePayout))}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <MiniMetric label="Órdenes" value={earnings.totalOrders} />
                    <MiniMetric label="Ventas" value={formatCOP(Math.round(earnings.salesProducts))} />
                  </div>

                  <div className="rounded-[14px] border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Comisión KroniX
                    </div>
                    <div className="mt-1 text-[16px] font-black leading-none text-slate-900">
                      {formatCOP(Math.round(earnings.platformCommission))}
                    </div>
                    <div className="mt-2 text-[12px] font-medium leading-snug text-slate-500">
                      Se usa desglose por snapshot cuando existe; si no, aplica la regla oficial del 8%.
                    </div>
                  </div>
                </div>
              </div>

              <div className="ct-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[18px] font-black text-slate-900">KroniX Envíos</div>
                    <div className="mt-1 text-[12px] font-medium text-slate-500">
                      Record para corte y conciliación posterior desde CTCC.
                    </div>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-extrabold text-slate-700">
                    Store App
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <MiniMetric label="Servicios" value={courierSummary.totalServices ?? 0} />
                  <MiniMetric label="Promedio" value={formatCOP(Math.round(courierSummary.averageServiceCOP ?? 0))} />
                </div>

                <div className="mt-2 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                    Valor a conciliar
                  </div>
                  <div className="mt-1 text-[22px] font-black leading-none text-slate-900">
                    {formatCOP(Math.round(courierSummary.pendingReconciliationCOP ?? 0))}
                  </div>
                  <div className="mt-2 text-[12px] font-medium leading-snug text-slate-500">
                    No se cobra aquí. Este valor queda registrado para balance en fechas de corte.
                  </div>
                </div>

                {courierError ? (
                  <div className="mt-2 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-bold text-red-700">
                    {courierError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <div className="ct-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[18px] font-black text-slate-900">Detalle del período</div>
                    <div className="mt-1 text-[12px] font-medium text-slate-500">
                      Comportamiento por fecha dentro del rango seleccionado.
                    </div>
                  </div>

                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">
                    {earnings.rows.length} {earnings.rows.length === 1 ? "registro" : "registros"}
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {earnings.rows.length ? (
                    earnings.rows.map((r) => (
                      <PeriodRow
                        key={r.key}
                        row={r}
                        totalStorePayout={earnings.storePayout}
                      />
                    ))
                  ) : (
                    <div className="grid min-h-[210px] place-items-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                      <div>
                        <div className="text-[16px] font-black text-slate-800">
                          No hay entregas en este rango
                        </div>
                        <div className="mt-2 text-[13px] font-medium text-slate-500">
                          {storeCity.cityName
                            ? `No se encontraron órdenes entregadas en ${storeCity.cityName}.`
                            : "No se encontraron órdenes entregadas para este período."}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ct-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[18px] font-black text-slate-900">Record KroniX Envíos</div>
                    <div className="mt-1 text-[12px] font-medium text-slate-500">
                      Resumen agrupado para evitar filas largas. Abre cada período con + para ver el desglose.
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <CourierScopeBtn
                      active={courierViewScope === "WEEKLY"}
                      onClick={() => setCourierViewScope("WEEKLY")}
                    >
                      Semanal
                    </CourierScopeBtn>
                    <CourierScopeBtn
                      active={courierViewScope === "BIWEEKLY"}
                      onClick={() => setCourierViewScope("BIWEEKLY")}
                    >
                      Quincenal
                    </CourierScopeBtn>
                    <CourierScopeBtn
                      active={courierViewScope === "MONTHLY"}
                      onClick={() => setCourierViewScope("MONTHLY")}
                    >
                      Mensual
                    </CourierScopeBtn>
                    <CourierScopeBtn
                      active={courierViewScope === "YEARLY"}
                      onClick={() => setCourierViewScope("YEARLY")}
                    >
                      Anual
                    </CourierScopeBtn>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-extrabold text-slate-700">
                    {courierLoading ? "Cargando..." : `${groupedCourierPeriods.length} períodos`}
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700">
                    {courierLoading ? "..." : `${courierRows.length} servicios`}
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700">
                    Total {courierLoading ? "..." : formatCOP(Math.round(courierSummary.pendingReconciliationCOP ?? 0))}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {groupedCourierPeriods.length ? (
                    groupedCourierPeriods.map((period) => (
                      <CourierPeriodAccordionCard
                        key={period.key}
                        period={period}
                        maxCOP={maxCourierPeriodCOP}
                        open={openCourierPeriodKey === period.key}
                        onToggle={() =>
                          setOpenCourierPeriodKey((current) =>
                            current === period.key ? null : period.key
                          )
                        }
                      />
                    ))
                  ) : (
                    <div className="grid min-h-[220px] place-items-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                      <div>
                        <div className="text-[16px] font-black text-slate-800">
                          No hay KroniX Envíos registrados
                        </div>
                        <div className="mt-2 text-[13px] font-medium text-slate-500">
                          Los servicios solicitados desde el botón KroniX Envíos quedarán agrupados aquí para conciliación.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
