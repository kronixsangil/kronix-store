//src\app\store\components\tabs\ProfileTab.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import SmallChip from "../ui/SmallChip";
import { StoreStateUI } from "../../lib/storeTypes";
import StoreTermsModal from "../legal/StoreTermsModal";
import { STORE_TERMS_VERSION, StoreFetchFn } from "../../lib/storeLegal";

type Props = {
  storeIcon: string;
  storeImageUrl?: string;
  userName: string;
  storeStateUI: StoreStateUI;
  autoModeLabel: string;
  accessToken: string;
  onRefresh: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
  storeName: string;
  storeCityLabel: string;
  storeCitySlug: string;
  storeFetch: StoreFetchFn;
  termsAccepted: boolean;
  checkingTerms: boolean;
  onLegalStatusChanged: () => void | Promise<void>;
};

function ProfileBox({
  label,
  value,
  helper,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white/94 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-[20px] font-black leading-tight text-slate-900">
        {value}
      </div>
      {helper ? (
        <div className="mt-2 text-[13px] font-medium leading-snug text-slate-500">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

export default function ProfileTab({
  storeIcon,
  storeImageUrl = "",
  userName,
  storeStateUI,
  autoModeLabel,
  accessToken,
  onRefresh,
  onLogout,
  storeName,
  storeCityLabel,
  storeCitySlug,
  storeFetch,
  termsAccepted,
  checkingTerms,
  onLegalStatusChanged,
}: Props) {
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <>
      <div className="ct-tab-frame flex flex-col gap-3">
        <div className="rounded-[20px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.97)_100%)] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              {storeImageUrl ? (
                <Image
                  src={storeImageUrl}
                  alt={storeName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-[24px] text-slate-700">
                  {storeIcon}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-[24px] font-black leading-none text-slate-900">
                Perfil
              </div>
              <div className="mt-2 text-[13px] font-medium text-slate-600">
                Información de acceso, sesión y datos generales de la tienda.
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 rounded-[22px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(248,250,252,0.94)_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <div className="grid grid-cols-3 gap-3">
            <ProfileBox label="Tienda" value={storeName} />

            <div className="rounded-[16px] border border-slate-200 bg-white/94 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Ciudad
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SmallChip tone="softBlue">
                  📍 {storeCityLabel || "Sin ciudad"}
                </SmallChip>
                {storeCitySlug ? (
                  <SmallChip tone="softSlate">Slug: {storeCitySlug}</SmallChip>
                ) : null}
              </div>
            </div>

            <ProfileBox label="Usuario" value={userName} helper="Rol: STORE" />

            <ProfileBox
              label="Estado actual"
              value={
                storeStateUI === "ACTIVE"
                  ? "Activa"
                  : storeStateUI === "PAUSED"
                    ? "En pausa"
                    : "Inactiva"
              }
              helper={`Auto-decisión: ${autoModeLabel}`}
            />

            <ProfileBox
              label="Sesión"
              value={accessToken?.trim() ? "Autenticada" : "Sin sesión"}
              helper="AppKey: store"
            />

            <div className="rounded-[16px] border border-slate-200 bg-white/94 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Legal
              </div>

              <div className="mt-2 text-[20px] font-black leading-tight text-slate-900">
                Términos y Condiciones
              </div>

              <div className="mt-2 text-[13px] font-medium leading-snug text-slate-500">
                Versión: {STORE_TERMS_VERSION}
              </div>

              <div
                className={[
                  "mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-black ring-1",
                  termsAccepted
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : "bg-amber-50 text-amber-700 ring-amber-100",
                ].join(" ")}
              >
                {checkingTerms
                  ? "Verificando..."
                  : termsAccepted
                    ? "Aceptado"
                    : "Pendiente"}
              </div>

              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[14px] bg-slate-900 px-4 text-[13px] font-extrabold text-white transition hover:bg-slate-800"
              >
                Ver documento legal
              </button>
            </div>

            <div className="rounded-[16px] border border-slate-200 bg-white/94 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Acciones
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex h-10 items-center justify-center rounded-[14px] bg-slate-900 px-4 text-[13px] font-extrabold text-white transition hover:bg-slate-800"
                >
                  Verificar sesión
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex h-10 items-center justify-center rounded-[14px] bg-white px-4 text-[13px] font-extrabold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StoreTermsModal
        open={termsOpen}
        storeFetch={storeFetch}
        onClose={() => setTermsOpen(false)}
        onAccepted={async () => {
          setTermsOpen(false);
          await onLegalStatusChanged();
        }}
      />
    </>
  );
}