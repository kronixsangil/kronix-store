//src\app\store\components\tabs\RegisterTab.tsx
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { StoreMe, StoreStateUI } from "../../lib/storeTypes";
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

type RegisterForm = {
  name: string;
  legalName: string;
  nit: string;
  businessEmail: string;
  category: string;
  description: string;
  cel1: string;
  cel2: string;
  address: string;
  addressReference: string;
  hrOp: string;
  hrCl: string;
  image: string;
  image2: string;
  image3: string;
  image4: string;
  coverImage: string;
  primaryColor: string;
  secondaryColor: string;
};

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function buildFormFromStore(store: StoreMe | null, fallbackName: string): RegisterForm {
  return {
    name: asText(store?.name || fallbackName),
    legalName: asText(store?.legalName),
    nit: asText(store?.nit),
    businessEmail: asText(store?.businessEmail),
    category: asText(store?.category),
    description: asText(store?.description),
    cel1: asText(store?.cel1),
    cel2: asText(store?.cel2),
    address: asText(store?.address),
    addressReference: asText(store?.addressReference),
    hrOp: asText(store?.hrOp),
    hrCl: asText(store?.hrCl),
    image: asText(store?.image),
    image2: asText(store?.image2),
    image3: asText(store?.image3),
    image4: asText(store?.image4),
    coverImage: asText(store?.coverImage),
    primaryColor: asText(store?.primaryColor),
    secondaryColor: asText(store?.secondaryColor),
  };
}

function toNullableText(value: string) {
  const v = String(value ?? "").trim();
  return v ? v : null;
}

function isRealStoreName(value: string) {
  const v = String(value ?? "").trim().toUpperCase();
  return Boolean(v && v !== "TIENDA");
}

function getAffiliateStatusLabel(status?: string | null) {
  const s = String(status ?? "PENDING_VISIT").toUpperCase();

  if (s === "VISITED") return "Visitado";
  if (s === "DOCUMENTS_PENDING") return "Documentos pendientes";
  if (s === "UNDER_REVIEW") return "En revisión";
  if (s === "APPROVED") return "Aprobado";
  if (s === "REJECTED") return "Rechazado";

  return "Pendiente visita";
}

function getAffiliateStatusTone(status?: string | null): "green" | "amber" | "slate" | "blue" | "rose" {
  const s = String(status ?? "PENDING_VISIT").toUpperCase();

  if (s === "APPROVED") return "green";
  if (s === "VISITED" || s === "UNDER_REVIEW") return "blue";
  if (s === "DOCUMENTS_PENDING" || s === "PENDING_VISIT") return "amber";
  if (s === "REJECTED") return "rose";

  return "slate";
}

function hasDate(value?: string | null) {
  return Boolean(String(value ?? "").trim());
}

function getActivationState(store: StoreMe | null, legalCompleted: boolean) {
  const status = String(store?.affiliateStatus ?? "PENDING_VISIT").toUpperCase();

  const commercialDone = Boolean(store?.name && store?.category && (store?.legalName || store?.nit));
  const contactDone = Boolean(store?.cel1 || store?.businessEmail);
  const addressDone = Boolean(store?.address);
  const brandingDone = Boolean(store?.image || store?.coverImage);

  const visitedDone =
    status === "VISITED" ||
    status === "UNDER_REVIEW" ||
    status === "APPROVED" ||
    hasDate(store?.visitedAt);

  const docsReceivedDone = Boolean(store?.physicalDocumentsReceived);
  const docsReviewedDone = Boolean(store?.documentsReviewed);
  const docsApprovedDone = Boolean(store?.documentsApproved);
  const contractDone = Boolean(store?.contractSigned);

  const approvedDone =
    status === "APPROVED" ||
    Boolean(store?.approvedAt) ||
    Boolean(store?.onboardingCompleted && docsApprovedDone && contractDone);

  const finalActiveDone =
    approvedDone &&
    docsApprovedDone &&
    contractDone &&
    store?.isActive === true;

  const checks = [
    commercialDone,
    contactDone,
    addressDone,
    brandingDone,
    legalCompleted,
    visitedDone,
    docsReceivedDone,
    docsReviewedDone,
    docsApprovedDone,
    contractDone,
    approvedDone,
    finalActiveDone,
  ];

  const percent = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    status,
    statusLabel: getAffiliateStatusLabel(status),
    statusTone: getAffiliateStatusTone(status),
    commercialDone,
    contactDone,
    addressDone,
    brandingDone,
    legalCompleted,
    visitedDone,
    docsReceivedDone,
    docsReviewedDone,
    docsApprovedDone,
    contractDone,
    approvedDone,
    finalActiveDone,
    percent,
  };
}

function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "green" | "amber" | "slate" | "blue" | "rose";
}) {
  const cls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : tone === "blue"
          ? "bg-blue-50 text-blue-700 ring-blue-100"
          : tone === "rose"
            ? "bg-rose-50 text-rose-700 ring-rose-100"
            : "bg-slate-50 text-slate-700 ring-slate-100";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ring-1 ${cls}`}>
      {children}
    </span>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  right,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.055)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            {eyebrow}
          </div>
          <div className="mt-2 text-[21px] font-black leading-tight text-slate-950">
            {title}
          </div>
          {description ? (
            <div className="mt-2 max-w-3xl text-[13px] font-medium leading-snug text-slate-500">
              {description}
            </div>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-[14px] font-semibold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-2 w-full resize-none rounded-[14px] border border-slate-200 bg-white px-3 py-3 text-[14px] font-semibold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function PreviewImage({
  src,
  label,
  fallback,
}: {
  src: string;
  label: string;
  fallback?: ReactNode;
}) {
  if (!src.trim()) {
    return (
      <div className="grid h-28 place-items-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50 text-center text-[12px] font-bold text-slate-400">
        {fallback || "Sin imagen"}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50">
      <div className="relative h-28 w-full">
        <Image src={src} alt={label} fill className="object-cover" />
      </div>
      <div className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
    </div>
  );
}

function ChecklistItem({
  done,
  title,
  helper,
}: {
  done: boolean;
  title: string;
  helper: string;
}) {
  return (
    <div className="flex gap-3 rounded-[16px] border border-slate-200 bg-white p-3">
      <div
        className={[
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-black",
          done ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-50 text-slate-400 ring-1 ring-slate-100",
        ].join(" ")}
      >
        {done ? "✓" : "•"}
      </div>
      <div>
        <div className="text-[13px] font-black text-slate-900">{title}</div>
        <div className="mt-1 text-[12px] font-semibold leading-snug text-slate-500">
          {helper}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyInfoCard({
  label,
  value,
  empty = "Pendiente",
}: {
  label: string;
  value?: string | null;
  empty?: string;
}) {
  const clean = String(value ?? "").trim();

  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-extrabold text-slate-800">
        {clean || empty}
      </div>
    </div>
  );
}

export default function RegisterTab({
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
  const [legalDocs, setLegalDocs] = useState<StoreLegalDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [storeProfile, setStoreProfile] = useState<StoreMe | null>(null);
  const [form, setForm] = useState<RegisterForm>(() =>
    buildFormFromStore(null, isRealStoreName(storeName) ? storeName : "")
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [msg, setMsg] = useState("");

  function setFormValue<K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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

  async function loadProfile() {
    setLoadingProfile(true);

    try {
      const me = await storeFetch<StoreMe>("/stores/me", { method: "GET" });
      setStoreProfile(me);
      setForm(buildFormFromStore(me, isRealStoreName(storeName) ? storeName : ""));
      setMsg("");
    } catch (e: any) {
      setStoreProfile(null);
      setForm((prev) => ({
        ...prev,
        name: isRealStoreName(storeName) ? storeName : prev.name,
      }));
      setMsg(
        `No se pudo cargar el registro completo. Detalle: ${String(
          e?.message ?? "Error desconocido"
        )}`
      );
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    loadLegalDocs();
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storeProfile && isRealStoreName(storeName)) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || storeName,
      }));
    }
  }, [storeName, storeProfile]);

  const legalCompleted = termsAccepted && privacyAccepted && operationalConsentAccepted;
  const activation = getActivationState(storeProfile, legalCompleted);
  const percent = activation.percent;
  const activeImage = form.image || storeImageUrl;

  const displayStoreName = isRealStoreName(storeName)
    ? storeName
    : storeProfile?.name || form.name || "Tienda";

  const displayCityLabel =
    storeCityLabel && storeCityLabel !== "Establecimiento"
      ? storeCityLabel
      : storeProfile?.city?.name
        ? `${storeProfile.city.name}${storeProfile.city.department ? `, ${storeProfile.city.department}` : ""}`
        : "Sin ciudad";

  async function saveRegister() {
    if (savingProfile) return;

    setMsg("");

    if (!form.name.trim()) {
      setMsg("El nombre comercial es obligatorio.");
      return;
    }

    if (!form.category.trim()) {
      setMsg("La categoría es obligatoria.");
      return;
    }

    if (!form.address.trim()) {
      setMsg("La dirección es obligatoria.");
      return;
    }

    setSavingProfile(true);

    try {
      const payload = {
        name: form.name.trim(),
        legalName: toNullableText(form.legalName),
        nit: toNullableText(form.nit),
        businessEmail: toNullableText(form.businessEmail),
        category: form.category.trim(),
        description: form.description.trim(),
        cel1: toNullableText(form.cel1),
        cel2: toNullableText(form.cel2),
        address: form.address.trim(),
        addressReference: toNullableText(form.addressReference),
        hrOp: toNullableText(form.hrOp),
        hrCl: toNullableText(form.hrCl),
        image: toNullableText(form.image),
        image2: toNullableText(form.image2),
        image3: toNullableText(form.image3),
        image4: toNullableText(form.image4),
        coverImage: toNullableText(form.coverImage),
        primaryColor: toNullableText(form.primaryColor),
        secondaryColor: toNullableText(form.secondaryColor),
        onboardingStep: Math.max(2, Number(storeProfile?.onboardingStep ?? 1)),
      };

      const updated = await storeFetch<StoreMe>("/stores/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setStoreProfile(updated);
      setForm(buildFormFromStore(updated, isRealStoreName(storeName) ? storeName : ""));
      setMsg("Registro guardado correctamente.");
      await onRefresh();
    } catch (e: any) {
      setMsg(String(e?.message ?? "No se pudo guardar el registro."));
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <>
      <div className="ct-tab-frame h-full min-h-0 overflow-y-auto px-0 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
  <div className="flex min-h-full flex-col gap-3">
        <div className="overflow-hidden rounded-[24px] border border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.96)_52%,rgba(15,23,42,0.98)_100%)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-white/10 ring-1 ring-white/20 shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
                {activeImage ? (
                  <Image src={activeImage} alt={displayStoreName} fill className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[30px] text-white">
                    {storeIcon}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-[26px] font-black leading-tight text-white">
                    Registro del Comercio
                  </div>

                  <StatusBadge tone={storeStateUI === "ACTIVE" ? "green" : storeStateUI === "PAUSED" ? "amber" : "slate"}>
                    {storeStateUI === "ACTIVE" ? "Activa" : storeStateUI === "PAUSED" ? "En pausa" : "Inactiva"}
                  </StatusBadge>

                  <StatusBadge tone={activation.statusTone}>
                    Afiliación: {activation.statusLabel}
                  </StatusBadge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-300">
                  <span>{displayStoreName}</span>
                  <span>• 📍 {displayCityLabel}</span>
                  {storeCitySlug ? <span>• Slug: {storeCitySlug}</span> : null}
                  <span>• Usuario: {userName || "—"}</span>
                </div>

                <div className="mt-3 max-w-3xl text-[13px] font-medium leading-snug text-slate-300">
                  Completa los datos comerciales, contacto, horarios y branding. La visita,
                  
                </div>
                <div className="mt-3 max-w-3xl text-[13px] font-medium leading-snug text-slate-300">
                 
                  documentos, contrato y activación final son validados por KroniX desde CTCC.
                </div>
              </div>
            </div>

            <div className="sticky top-3 z-30 ml-auto w-full rounded-[20px] border border-white/10 bg-white/10 p-4 backdrop-blur md:w-[270px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Activación KroniX
                  </div>
                  <div className="mt-1 text-[28px] font-black text-white">
                    {percent}%
                  </div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-[18px] font-black text-slate-950">
                  {activation.finalActiveDone ? "✓" : "↗"}
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="mt-2 text-[12px] font-semibold text-slate-300">
                {activation.finalActiveDone
                  ? "Lista para operar"
                  : `Afiliación: ${activation.statusLabel}`}
              </div>
            </div>
          </div>
        </div>

        {!activation.finalActiveDone ? (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-bold leading-6 text-amber-900">
            Tu tienda todavía no está activada para operar completamente. Puedes completar tu
            registro, pero la operación final depende de la visita, revisión documental, contrato
            y aprobación de KroniX desde CTCC.
          </div>
        ) : null}

        <div className="rounded-[24px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(248,250,252,0.96)_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <SectionCard
                eyebrow="Fase 2 — Registro del Comercio"
                title="Información básica del negocio"
                description="Datos principales del comercio. Se usan para CTCC, perfil público, soporte, validaciones y operación diaria."
                right={
                  <button
                    type="button"
                    onClick={saveRegister}
                    disabled={savingProfile || loadingProfile}
                    className="inline-flex h-11 items-center justify-center rounded-[14px] bg-slate-900 px-5 text-[13px] font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? "Guardando..." : loadingProfile ? "Cargando..." : "Guardar registro"}
                  </button>
                }
              >
                {msg ? (
                  <div className="mb-4 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-bold text-slate-700">
                    {msg}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Nombre comercial" value={form.name} onChange={(v) => setFormValue("name", v)} />
                  <Field label="Razón social" value={form.legalName} onChange={(v) => setFormValue("legalName", v)} />
                  <Field label="NIT / identificación" value={form.nit} onChange={(v) => setFormValue("nit", v)} />
                  <Field label="Categoría" value={form.category} onChange={(v) => setFormValue("category", v)} />
                  <Field label="Teléfono principal" value={form.cel1} onChange={(v) => setFormValue("cel1", v)} />
                  <Field label="Teléfono secundario" value={form.cel2} onChange={(v) => setFormValue("cel2", v)} />
                  <Field label="Email comercial" value={form.businessEmail} onChange={(v) => setFormValue("businessEmail", v)} type="email" />
                  <TextAreaField label="Descripción del negocio" value={form.description} onChange={(v) => setFormValue("description", v)} />
                </div>
              </SectionCard>
            </div>

            <div>
              <SectionCard
                eyebrow="Activación KroniX"
                title="Checklist"
                description="Estado real sincronizado con CTCC."
              >
                <div className="grid gap-3">
                  <ChecklistItem done={activation.commercialDone} title="Información comercial" helper="Nombre, razón social, NIT y categoría." />
                  <ChecklistItem done={activation.contactDone} title="Contacto" helper="Teléfono o correo comercial." />
                  <ChecklistItem done={activation.addressDone} title="Dirección" helper="Dirección base del establecimiento." />
                  <ChecklistItem done={activation.brandingDone} title="Branding" helper="Logo, portada o imágenes." />
                  <ChecklistItem done={activation.legalCompleted} title="Legal Store" helper="Términos, privacidad y consentimiento aceptados." />
                  <ChecklistItem done={activation.visitedDone} title="Visita KroniX" helper={activation.visitedDone ? "Visita registrada desde CTCC." : "Pendiente de validación presencial."} />
                  <ChecklistItem done={activation.docsReceivedDone} title="Documentos recibidos" helper="Documentación física o soportes recibidos." />
                  <ChecklistItem done={activation.docsReviewedDone} title="Documentos revisados" helper="Revisión interna de KroniX." />
                  <ChecklistItem done={activation.docsApprovedDone} title="Documentos aprobados" helper="Documentación validada por KroniX." />
                  <ChecklistItem done={activation.contractDone} title="Contrato firmado" helper="Acuerdo comercial firmado." />
                  <ChecklistItem done={activation.approvedDone} title="Aprobación final" helper="Aprobación administrativa desde CTCC." />
                  <ChecklistItem done={activation.finalActiveDone} title="Activación operativa" helper="Lista para operar en KroniX." />
                </div>
              </SectionCard>
            </div>

            <div className="xl:col-span-3">
              <SectionCard
                eyebrow="Estado CTCC"
                title="Validación interna KroniX"
                description="Esta información es de solo lectura para la tienda y se actualiza desde CTCC."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <ReadOnlyInfoCard label="Estado afiliación" value={activation.statusLabel} />
                  <ReadOnlyInfoCard label="Fecha visita" value={storeProfile?.visitedAt ? String(storeProfile.visitedAt).slice(0, 10) : ""} />
                  <ReadOnlyInfoCard label="Visitado por" value={storeProfile?.visitedBy} />
                  <ReadOnlyInfoCard label="Fecha aprobación" value={storeProfile?.approvedAt ? String(storeProfile.approvedAt).slice(0, 10) : ""} />
                  <ReadOnlyInfoCard label="Aprobado por" value={storeProfile?.approvedBy} />
                  <ReadOnlyInfoCard label="Contrato" value={storeProfile?.contractSigned ? "Firmado" : "Pendiente"} />
                  <ReadOnlyInfoCard label="Documentos recibidos" value={storeProfile?.physicalDocumentsReceived ? "Sí" : "No"} />
                  <ReadOnlyInfoCard label="Documentos revisados" value={storeProfile?.documentsReviewed ? "Sí" : "No"} />
                  <ReadOnlyInfoCard label="Documentos aprobados" value={storeProfile?.documentsApproved ? "Sí" : "No"} />
                </div>

                {storeProfile?.approvalNotes ? (
                  <div className="mt-4 rounded-[16px] border border-emerald-100 bg-emerald-50 p-4 text-[13px] font-semibold leading-6 text-emerald-900">
                    <b>Observaciones de aprobación:</b> {storeProfile.approvalNotes}
                  </div>
                ) : null}

                {storeProfile?.rejectedReason ? (
                  <div className="mt-4 rounded-[16px] border border-rose-100 bg-rose-50 p-4 text-[13px] font-semibold leading-6 text-rose-900">
                    <b>Motivo de rechazo:</b> {storeProfile.rejectedReason}
                  </div>
                ) : null}
              </SectionCard>
            </div>

            <div className="xl:col-span-3">
              <SectionCard
                eyebrow="Ubicación operativa"
                title="Dirección y referencia"
                description="La tienda solo registra dirección y referencia. Los geopuntos exactos, entrada principal y pickup de drivers se definen manualmente por KroniX en CTCC durante la visita."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Dirección" value={form.address} onChange={(v) => setFormValue("address", v)} />
                  <Field label="Referencia de dirección" value={form.addressReference} onChange={(v) => setFormValue("addressReference", v)} />
                </div>

                <div className="mt-4 rounded-[18px] border border-blue-100 bg-blue-50/80 p-4">
                  <div className="text-[13px] font-black text-blue-800">
                    Geopuntos gestionados por KroniX
                  </div>
                  <div className="mt-1 text-[13px] font-semibold leading-6 text-blue-900/75">
                    Durante la visita al establecimiento, el equipo KroniX definirá coordenadas exactas,
                    entrada principal, punto de recogida para drivers y zona operativa.
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="xl:col-span-3">
              <SectionCard
                eyebrow="Operación"
                title="Horarios del comercio"
                description="Define los horarios base de atención. Más adelante podremos convertir esto en horarios por día."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Hora apertura" value={form.hrOp} onChange={(v) => setFormValue("hrOp", v)} placeholder="Ej: 08:00 AM" />
                  <Field label="Hora cierre" value={form.hrCl} onChange={(v) => setFormValue("hrCl", v)} placeholder="Ej: 09:00 PM" />
                </div>
              </SectionCard>
            </div>

            <div className="xl:col-span-3">
              <SectionCard
                eyebrow="Branding básico"
                title="Logo, portada, galería y colores"
                description="Estos elementos mejoran la presentación visual del comercio en KroniX."
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Logo / imagen principal URL" value={form.image} onChange={(v) => setFormValue("image", v)} />
                    <Field label="Portada URL" value={form.coverImage} onChange={(v) => setFormValue("coverImage", v)} />
                    <Field label="Imagen 2 URL" value={form.image2} onChange={(v) => setFormValue("image2", v)} />
                    <Field label="Imagen 3 URL" value={form.image3} onChange={(v) => setFormValue("image3", v)} />
                    <Field label="Imagen 4 URL" value={form.image4} onChange={(v) => setFormValue("image4", v)} />
                    <Field label="Color primario" value={form.primaryColor} onChange={(v) => setFormValue("primaryColor", v)} placeholder="#111827" />
                    <Field label="Color secundario" value={form.secondaryColor} onChange={(v) => setFormValue("secondaryColor", v)} placeholder="#f97316" />
                  </div>

                  <div className="grid gap-3">
                    <PreviewImage src={form.image || storeImageUrl} label="Logo principal" fallback="Logo pendiente" />
                    <PreviewImage src={form.coverImage} label="Portada" fallback="Portada pendiente" />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Primario
                        </div>
                        <div
                          className="mt-3 h-10 rounded-[12px] border border-slate-200"
                          style={{ backgroundColor: form.primaryColor || "#111827" }}
                        />
                      </div>
                      <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Secundario
                        </div>
                        <div
                          className="mt-3 h-10 rounded-[12px] border border-slate-200"
                          style={{ backgroundColor: form.secondaryColor || "#f97316" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
