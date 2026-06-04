//src\app\store\components\tabs\SettingsTab.tsx
"use client";

import type { Dispatch, SetStateAction } from "react";
import Toggle from "../ui/Toggle";
import {
  PrintPaperSize,
  PrintPrefs,
  StoreAutoDecisionMode,
  StoreMe,
  StorePaymentInfoDraft,
  StoreStateUI,
} from "../../lib/storeTypes";

type Props = {
  savingAuto: boolean;
  saveAutoDecision: () => void | Promise<void>;
  autoMode: StoreAutoDecisionMode;
  setAutoMode: Dispatch<SetStateAction<StoreAutoDecisionMode>>;
  autoMinutes: number;
  setAutoMinutes: Dispatch<SetStateAction<number>>;
  printPrefs: PrintPrefs;
  updatePrintPrefs: (next: Partial<PrintPrefs>) => void;
  storeIcon: string;
  userName: string;
  storeStateUI: StoreStateUI;
  autoModeLabel: string;
  accessToken: string;
  onRefresh: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
  storeName: string;
  storeCityLabel: string;
  storeCitySlug: string;
  soundEnabled: boolean;
  toggleSound: () => void | Promise<void>;
  testSound: () => void | Promise<void>;
  notifyEnabled: boolean;
  toggleNotify: () => void | Promise<void>;
  soundVolume: number;
  setSoundVolumeState: Dispatch<SetStateAction<number>>;

  storeMe?: StoreMe | null;
  paymentInfoDraft?: StorePaymentInfoDraft;
  setPaymentInfoDraft?: Dispatch<SetStateAction<StorePaymentInfoDraft>>;
  savingPaymentInfo?: boolean;
  paymentInfoMsg?: string | null;
  savePaymentInfo?: () => void | Promise<void>;
};

function SectionCard({
  title,
  desc,
  action,
  children,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="ct-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[17px] font-black leading-none text-slate-900">{title}</div>
          {desc ? <div className="mt-1 text-[12px] font-medium leading-snug text-slate-500">{desc}</div> : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-2">{children}</div>
    </div>
  );
}

function FieldBox({
  label,
  children,
  helper,
}: {
  label: string;
  children: React.ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
      <div className="ct-muted-label">{label}</div>
      <div className="mt-2">{children}</div>
      {helper ? <div className="mt-2 text-[11px] font-medium leading-snug text-slate-500">{helper}</div> : null}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-200"
    />
  );
}

function statusText(status?: string | null) {
  const s = String(status ?? "NONE").toUpperCase();
  if (s === "PENDING") return "Pendiente aprobación CTCC";
  if (s === "APPROVED") return "Aprobada por KroniX";
  if (s === "REJECTED") return "Rechazada";
  return "Sin configurar";
}

function statusClass(status?: string | null) {
  const s = String(status ?? "NONE").toUpperCase();
  if (s === "PENDING") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (s === "APPROVED") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (s === "REJECTED") return "bg-rose-50 text-rose-800 ring-rose-100";
  return "bg-slate-50 text-slate-700 ring-slate-100";
}

export default function SettingsTab({
  savingAuto,
  saveAutoDecision,
  autoMode,
  setAutoMode,
  autoMinutes,
  setAutoMinutes,
  printPrefs,
  updatePrintPrefs,
  soundEnabled,
  toggleSound,
  testSound,
  notifyEnabled,
  toggleNotify,
  soundVolume,
  setSoundVolumeState,
  storeMe,
  paymentInfoDraft,
  setPaymentInfoDraft,
  savingPaymentInfo = false,
  paymentInfoMsg,
  savePaymentInfo,
}: Props) {
  const paymentDraft: StorePaymentInfoDraft =
    paymentInfoDraft ?? {
      storePayoutMethod: "BANK_ACCOUNT",
      storePayoutBankName: "",
      storePayoutAccountType: "AHORROS",
      storePayoutAccountNumber: "",
      storePayoutAccountHolder: "",
      storePayoutAccountDocument: "",
      storePayoutNequiPhone: "",
      storePayoutDaviplataPhone: "",
      storePayoutBillingEmail: "",
      storePayoutTaxResponsibility: "",
      storePayoutTaxNotes: "",
    };

  function setPaymentField<K extends keyof StorePaymentInfoDraft>(
    key: K,
    value: StorePaymentInfoDraft[K]
  ) {
    setPaymentInfoDraft?.((prev) => ({ ...prev, [key]: value }));
  }

  const method = paymentDraft.storePayoutMethod;

  return (
  <div className="ct-panel ct-tab-frame h-full min-h-0 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div className="rounded-[18px] border border-white/70 bg-white/70 px-4 py-3">
      <div className="ct-section-title">Configuración</div>
      <div className="mt-1 ct-section-desc">
        Ajustes operativos, impresión, alertas e información de pago de la tienda.
      </div>
    </div>

    <div className="mt-3 grid min-h-[540px] grid-cols-2 gap-3">
      <div className="space-y-2">
        <SectionCard
          title="Auto-decisión operativa"
          desc="Define cómo responde el sistema cuando la tienda no toma una decisión a tiempo."
          action={
            <button
              disabled={savingAuto}
              onClick={saveAutoDecision}
              className="inline-flex h-8 items-center justify-center rounded-full bg-emerald-600 px-4 text-[12px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingAuto ? "Guardando…" : "Guardar cambios"}
            </button>
          }
        >
          <div className="grid grid-cols-[1.25fr_0.75fr] gap-2">
            <FieldBox label="Modo de auto-decisión">
              <select
                value={autoMode}
                onChange={(e) => setAutoMode(e.target.value as StoreAutoDecisionMode)}
                className="h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="AUTO_REJECT">Auto-cancelar (recomendado)</option>
                <option value="AUTO_CONFIRM">Auto-confirmar</option>
              </select>
            </FieldBox>

            <FieldBox label="Tiempo máximo" helper="Minutos antes de ejecutar la regla automática.">
              <input
                type="number"
                min={1}
                max={60}
                value={autoMinutes}
                onChange={(e) => setAutoMinutes(Number(e.target.value))}
                className="h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </FieldBox>
          </div>
        </SectionCard>

        <SectionCard
          title="Sonido y notificaciones"
          desc="Controla alertas sonoras y avisos visuales del navegador."
          action={
            <button
              type="button"
              onClick={testSound}
              className="inline-flex h-8 items-center justify-center rounded-full bg-slate-900 px-4 text-[12px] font-extrabold text-white transition hover:bg-slate-800"
            >
              Probar sonido
            </button>
          }
        >
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Toggle
                label="Sonido de pedidos"
                desc="Activa o desactiva el sonido cuando entren nuevas órdenes."
                value={soundEnabled}
                onChange={() => toggleSound()}
                compact
              />

              <Toggle
                label="Notificaciones del navegador"
                desc="Permite avisos visuales cuando haya actividad."
                value={notifyEnabled}
                onChange={() => toggleNotify()}
                compact
              />
            </div>

            <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="ct-muted-label">Volumen de alertas</div>
                  <div className="mt-1 text-[11px] font-medium leading-snug text-slate-500">
                    Ajuste rápido para cocina y operación diaria.
                  </div>
                </div>

                <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700">
                  {Math.round(soundVolume * 100)}%
                </div>
              </div>

              <div className="mt-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(soundVolume * 100)}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(100, Number(e.target.value))) / 100;
                    setSoundVolumeState(v);
                  }}
                  className="w-full max-w-[240px]"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Impresión / Comanda"
          desc="Define cómo se imprime el ticket y qué información se muestra."
        >
          <div className="grid gap-2">
            <div className="grid grid-cols-[1.05fr_0.95fr] gap-2">
              <FieldBox
                label="Tamaño de papel"
                helper="80mm suele dar mejor lectura y más comodidad en impresión."
              >
                <select
                  value={printPrefs.paper}
                  onChange={(e) => updatePrintPrefs({ paper: e.target.value as PrintPaperSize })}
                  className="h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-900 outline-none"
                >
                  <option value="80MM">80mm (recomendado)</option>
                  <option value="58MM">58mm (compacto)</option>
                </select>
              </FieldBox>

              <Toggle
                label="Auto-imprimir al confirmar"
                desc="Al confirmar una orden, abre inmediatamente la comanda."
                value={printPrefs.autoPrintOnConfirm}
                onChange={(v) => updatePrintPrefs({ autoPrintOnConfirm: v })}
                compact
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Toggle label="Mostrar logo KroniX" value={printPrefs.showLogo} onChange={(v) => updatePrintPrefs({ showLogo: v })} compact />
              <Toggle label="Mostrar dirección de entrega" value={printPrefs.showDropoff} onChange={(v) => updatePrintPrefs({ showDropoff: v })} compact />
              <Toggle label="Mostrar nota del cliente" value={printPrefs.showCustomerNote} onChange={(v) => updatePrintPrefs({ showCustomerNote: v })} compact />
              <Toggle label="Mostrar precios y totales" desc="Incluye unitarios, subtotal y estimado." value={printPrefs.showPrices} onChange={(v) => updatePrintPrefs({ showPrices: v })} compact />
              <Toggle label="Mostrar información de pago" desc="Estado, referencia y fecha." value={printPrefs.showPayment} onChange={(v) => updatePrintPrefs({ showPayment: v })} compact />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="space-y-2">
        <SectionCard
          title="Información de pago"
          desc="Estos datos serán revisados por KroniX antes de habilitar o cambiar la cuenta de pagos."
          action={
            <div className="flex items-center gap-2">
              <span
                className={[
                  "inline-flex rounded-full px-3 py-1 text-[11px] font-black ring-1",
                  statusClass(storeMe?.storePayoutInfoStatus),
                ].join(" ")}
              >
                {statusText(storeMe?.storePayoutInfoStatus)}
              </span>

              <button
                type="button"
                disabled={savingPaymentInfo || !savePaymentInfo}
                onClick={() => savePaymentInfo?.()}
                className="inline-flex h-8 items-center justify-center rounded-full bg-slate-900 px-4 text-[12px] font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {savingPaymentInfo ? "Enviando…" : "Enviar a validación"}
              </button>
            </div>
          }
        >
          <div className="grid gap-2">
            {paymentInfoMsg ? (
              <div className="rounded-[14px] border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] font-bold leading-5 text-blue-900">
                {paymentInfoMsg}
              </div>
            ) : null}

            <div className="rounded-[14px] border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] font-semibold leading-5 text-amber-900">
              Por seguridad, cualquier cambio queda pendiente. CTCC valida titularidad, documento y cuenta real antes de aprobar.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FieldBox label="Medio de pago">
                <select
                  value={paymentDraft.storePayoutMethod}
                  onChange={(e) => setPaymentField("storePayoutMethod", e.target.value as any)}
                  className="h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-900 outline-none"
                >
                  <option value="BANK_ACCOUNT">Cuenta bancaria</option>
                  <option value="NEQUI">Nequi</option>
                  <option value="DAVIPLATA">Daviplata</option>
                </select>
              </FieldBox>

              <FieldBox label="Titular de la cuenta">
                <TextInput value={paymentDraft.storePayoutAccountHolder} onChange={(v) => setPaymentField("storePayoutAccountHolder", v)} placeholder="Nombre del propietario o empresa" />
              </FieldBox>

              <FieldBox label="Documento / NIT del titular">
                <TextInput value={paymentDraft.storePayoutAccountDocument} onChange={(v) => setPaymentField("storePayoutAccountDocument", v)} placeholder="Documento o NIT" />
              </FieldBox>

              <FieldBox label="Email de facturación">
                <TextInput type="email" value={paymentDraft.storePayoutBillingEmail} onChange={(v) => setPaymentField("storePayoutBillingEmail", v)} placeholder="facturacion@negocio.com" />
              </FieldBox>

              {method === "BANK_ACCOUNT" ? (
                <>
                  <FieldBox label="Banco">
                    <TextInput value={paymentDraft.storePayoutBankName} onChange={(v) => setPaymentField("storePayoutBankName", v)} placeholder="Ej: Bancolombia, Davivienda" />
                  </FieldBox>

                  <FieldBox label="Tipo de cuenta">
                    <select
                      value={paymentDraft.storePayoutAccountType || "AHORROS"}
                      onChange={(e) => setPaymentField("storePayoutAccountType", e.target.value as any)}
                      className="h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-900 outline-none"
                    >
                      <option value="AHORROS">Ahorros</option>
                      <option value="CORRIENTE">Corriente</option>
                    </select>
                  </FieldBox>

                  <FieldBox label="Número de cuenta">
                    <TextInput value={paymentDraft.storePayoutAccountNumber} onChange={(v) => setPaymentField("storePayoutAccountNumber", v)} placeholder="Número de cuenta" />
                  </FieldBox>
                </>
              ) : null}

              {method === "NEQUI" ? (
                <FieldBox label="Número Nequi">
                  <TextInput value={paymentDraft.storePayoutNequiPhone} onChange={(v) => setPaymentField("storePayoutNequiPhone", v)} placeholder="Celular Nequi" />
                </FieldBox>
              ) : null}

              {method === "DAVIPLATA" ? (
                <FieldBox label="Número Daviplata">
                  <TextInput value={paymentDraft.storePayoutDaviplataPhone} onChange={(v) => setPaymentField("storePayoutDaviplataPhone", v)} placeholder="Celular Daviplata" />
                </FieldBox>
              ) : null}

              <FieldBox label="Responsabilidad tributaria">
                <TextInput value={paymentDraft.storePayoutTaxResponsibility} onChange={(v) => setPaymentField("storePayoutTaxResponsibility", v)} placeholder="Ej: Régimen simple, responsable IVA..." />
              </FieldBox>

              <FieldBox label="Notas tributarias">
                <TextInput value={paymentDraft.storePayoutTaxNotes} onChange={(v) => setPaymentField("storePayoutTaxNotes", v)} placeholder="Observaciones de facturación o impuestos" />
              </FieldBox>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
);
}
