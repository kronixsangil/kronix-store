//src\app\store\components\tabs\ProfileTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "amber" | "slate" | "blue";
}) {
  const cls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 ring-blue-100"
          : "bg-slate-50 text-slate-700 ring-slate-100";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ring-1 ${cls}`}>
      {children}
    </span>
  );
}

function InfoCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white/94 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.045)]">
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
    <div className="rounded-[18px] border border-slate-200 bg-white/94 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.045)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            Legal
          </div>
          <div className="mt-2 text-[18px] font-black leading-tight text-slate-900">
            {title}
          </div>
          <div className="mt-2 text-[13px] font-medium leading-snug text-slate-500">
            Versión: {version || "Cargando..."}
          </div>
        </div>

        <StatusBadge tone={accepted ? "green" : "amber"}>
          {checking ? "Verificando..." : accepted ? "Aceptado" : "Pendiente"}
        </StatusBadge>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[14px] bg-slate-900 px-4 text-[13px] font-extrabold text-white transition hover:bg-slate-800"
      >
        Ver documento
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const docsByType = useMemo(() => {
    const map = new Map<string, StoreLegalDocument>();
    for (const doc of legalDocs) map.set(doc.documentType, doc);
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
  const legalCompleted =
    termsAccepted && privacyAccepted && operationalConsentAccepted;

  return (
    <>
      <div className="ct-tab-frame flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="overflow-hidden rounded-[24px] border border-white/60 bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.96)_55%,rgba(15,23,42,0.98)_100%)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-white/10 ring-1 ring-white/20 shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
                {storeImageUrl ? (
                  <Image src={storeImageUrl} alt={storeName} fill className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[30px] text-white">
                    {storeIcon}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-[26px] font-black leading-tight text-white">
                    Perfil
                  </div>
                  <StatusBadge tone={storeStateUI === "ACTIVE" ? "green" : storeStateUI === "PAUSED" ? "amber" : "slate"}>
                    {storeStateUI === "ACTIVE" ? "Activa" : storeStateUI === "PAUSED" ? "En pausa" : "Inactiva"}
                  </StatusBadge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-300">
                  <span>{storeName}</span>
                  <span>• 📍 {storeCityLabel || "Sin ciudad"}</span>
                  {storeCitySlug ? <span>• Slug: {storeCitySlug}</span> : null}
                  <span>• Usuario: {userName || "—"}</span>
                </div>

                <div className="mt-3 max-w-3xl text-[13px] font-medium leading-snug text-slate-300">
                  Aquí quedan los datos de sesión, estado operativo y documentos legales. El registro del comercio vive ahora en la pestaña Registro.
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Legal
              </div>
              <div className="mt-1 text-[20px] font-black">
                {legalCompleted ? "Completo" : "Pendiente"}
              </div>
              <div className="mt-1 text-[12px] font-semibold text-slate-300">
                Sesión: {accessToken?.trim() ? "autenticada" : "sin sesión"}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(248,250,252,0.96)_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <InfoCard label="Tienda" value={storeName || "Tienda"} helper="Nombre visible de la cuenta STORE" />
            <InfoCard label="Ciudad" value={storeCityLabel || "Sin ciudad"} helper={storeCitySlug ? `Slug: ${storeCitySlug}` : "Sin slug"} />
            <InfoCard label="Usuario" value={userName || "—"} helper="Rol: STORE" />
            <InfoCard
              label="Estado actual"
              value={storeStateUI === "ACTIVE" ? "Activa" : storeStateUI === "PAUSED" ? "En pausa" : "Inactiva"}
              helper={`Auto-decisión: ${autoModeLabel}`}
            />
            <InfoCard label="Sesión" value={accessToken?.trim() ? "Autenticada" : "Sin sesión"} helper="AppKey: store" />
            <InfoCard label="Registro" value="Separado" helper="La información comercial ahora está en la pestaña Registro" />

            <div className="xl:col-span-3 rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.055)]">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                    Legal y seguridad
                  </div>
                  <div className="mt-2 text-[21px] font-black leading-tight text-slate-950">
                    Documentos aceptados por el comercio
                  </div>
                  <div className="mt-2 max-w-3xl text-[13px] font-medium leading-snug text-slate-500">
                    Consulta o actualiza la aceptación legal. Si cambia una versión, KroniX podrá solicitar aceptación nuevamente.
                  </div>
                </div>

                <div className="flex gap-2">
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

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
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

