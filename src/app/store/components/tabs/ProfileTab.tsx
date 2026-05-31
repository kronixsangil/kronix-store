//src\app\store\components\tabs\ProfileTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import SmallChip from "../ui/SmallChip";
import { StoreStateUI } from "../../lib/storeTypes";
import StoreTermsModal from "../legal/StoreTermsModal";
import StorePrivacyModal from "../legal/StorePrivacyModal";
import StoreOperationalConsentModal from "../legal/StoreOperationalConsentModal";
import {
  getStoreLegalOverview,
  StoreFetchFn,
  type StoreLegalDocument,
} from "../../lib/storeLegal";

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
  privacyAccepted: boolean;
  operationalConsentAccepted: boolean;
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

function LegalCard({
  title,
  version,
  accepted,
  checking,
  onOpen,
}: {
  title: string;
  version: string;
  accepted: boolean;
  checking: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white/94 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        Legal
      </div>

      <div className="mt-2 text-[20px] font-black leading-tight text-slate-900">
        {title}
      </div>

      <div className="mt-2 text-[13px] font-medium leading-snug text-slate-500">
        Versión: {version || "Cargando..."}
      </div>

      <div
        className={[
          "mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-black ring-1",
          accepted
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : "bg-amber-50 text-amber-700 ring-amber-100",
        ].join(" ")}
      >
        {checking ? "Verificando..." : accepted ? "Aceptado" : "Pendiente"}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[14px] bg-slate-900 px-4 text-[13px] font-extrabold text-white transition hover:bg-slate-800"
      >
        Ver documento legal
      </button>
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
  privacyAccepted,
  operationalConsentAccepted,
  checkingTerms,
  onLegalStatusChanged,
}: Props) {
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [operationalConsentOpen, setOperationalConsentOpen] = useState(false);

  const [legalDocs, setLegalDocs] = useState<StoreLegalDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  async function loadLegalDocs() {
    setLoadingDocs(true);

    try {
      const overview = await getStoreLegalOverview(storeFetch);
      setLegalDocs(overview.currentDocuments || []);
    } catch {
      setLegalDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  }

  useEffect(() => {
    loadLegalDocs();
  }, []);

  const docsByType = useMemo(() => {
    const map = new Map<string, StoreLegalDocument>();

    for (const doc of legalDocs) {
      map.set(doc.documentType, doc);
    }

    return map;
  }, [legalDocs]);

  const termsDoc = docsByType.get("STORE_TERMS");
  const privacyDoc = docsByType.get("STORE_PRIVACY");
  const operationalDoc = docsByType.get("STORE_OPERATIONAL_CONSENT");

  async function refreshLegalAfterAccept() {
    await onLegalStatusChanged();
    await loadLegalDocs();
  }

  const legalChecking = checkingTerms || loadingDocs;

  return (
    <>
      <div className="ct-tab-frame flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="rounded-[20px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.97)_100%)] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              {storeImageUrl ? (
                <Image src={storeImageUrl} alt={storeName} fill className="object-cover" />
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
                Información de acceso, sesión y documentos legales de la tienda.
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-[22px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(248,250,252,0.94)_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-3 gap-3">
            <ProfileBox label="Tienda" value={storeName} />

            <div className="rounded-[16px] border border-slate-200 bg-white/94 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Ciudad
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SmallChip tone="softBlue">📍 {storeCityLabel || "Sin ciudad"}</SmallChip>
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

            <LegalCard
              title={termsDoc?.title || "Términos y Condiciones"}
              version={termsDoc?.version || "Cargando..."}
              accepted={termsAccepted}
              checking={legalChecking}
              onOpen={() => setTermsOpen(true)}
            />

            <LegalCard
              title={privacyDoc?.title || "Política de Privacidad"}
              version={privacyDoc?.version || "Cargando..."}
              accepted={privacyAccepted}
              checking={legalChecking}
              onOpen={() => setPrivacyOpen(true)}
            />

            <LegalCard
              title={operationalDoc?.title || "Consentimientos Operativos"}
              version={operationalDoc?.version || "Cargando..."}
              accepted={operationalConsentAccepted}
              checking={legalChecking}
              onOpen={() => setOperationalConsentOpen(true)}
            />

            <div className="rounded-[16px] border border-slate-200 bg-white/94 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Acciones
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await onRefresh();
                    await loadLegalDocs();
                  }}
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
          await refreshLegalAfterAccept();
        }}
      />

      <StorePrivacyModal
        open={privacyOpen}
        storeFetch={storeFetch}
        onClose={() => setPrivacyOpen(false)}
        onAccepted={async () => {
          setPrivacyOpen(false);
          await refreshLegalAfterAccept();
        }}
      />

      <StoreOperationalConsentModal
        open={operationalConsentOpen}
        storeFetch={storeFetch}
        onClose={() => setOperationalConsentOpen(false)}
        onAccepted={async () => {
          setOperationalConsentOpen(false);
          await refreshLegalAfterAccept();
        }}
      />
    </>
  );
}