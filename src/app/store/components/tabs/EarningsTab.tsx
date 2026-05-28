//src\app\store\components\tabs\EarningsTab.tsx
"use client";

import type { Dispatch, SetStateAction } from "react";
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

function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
  tone?: "default" | "dark" | "blue" | "green";
}) {
  const toneClass =
    tone === "dark"
      ? "bg-[linear-gradient(135deg,#17294e_0%,#243756_100%)] text-white border-transparent shadow-[0_10px_24px_rgba(15,23,42,0.10)]"
      : tone === "blue"
      ? "bg-[linear-gradient(135deg,#1888f3_0%,#1497ff_100%)] text-white border-transparent shadow-[0_10px_24px_rgba(24,136,243,0.14)]"
      : tone === "green"
      ? "bg-[linear-gradient(135deg,#06b85c_0%,#08c25d_100%)] text-white border-transparent shadow-[0_10px_24px_rgba(6,184,92,0.14)]"
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

export default function EarningsTab({
  earningsScope,
  setEarningsScope,
  earnings,
}: Props) {
  const storeCity = useStoreCity();

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
              Vista financiera compacta para tablet horizontal. Solo órdenes <b>DELIVERED</b>.
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

          <div className="grid grid-cols-[390px_minmax(0,1fr)] items-start gap-2">
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
                    Comisión Kronix
                  </div>
                  <div className="mt-1 text-[16px] font-black leading-none text-slate-900">
                    {formatCOP(Math.round(earnings.platformCommission))}
                  </div>
                  <div className="mt-2 text-[12px] font-medium leading-snug text-slate-500">
                    Se usa desglose por snapshot cuando existe; si no, aplica la regla oficial del 8%.
                  </div>
                </div>

                <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-medium text-emerald-800">
                  ✅ Panel ejecutivo compacto optimizado para tablet horizontal.
                </div>
              </div>
            </div>

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
                  <div className="grid min-h-[260px] place-items-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
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
          </div>
        </div>
      </div>
    </div>
  );
}