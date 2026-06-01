//src\app\store\components\tabs\ProfileTab.tsx
//src\app\store\components\tabs\ProfileTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import SmallChip from "../ui/SmallChip";
import { StoreMe, StoreStateUI } from "../../lib/storeTypes";
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

type ProfileForm = {
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
  lat: string;
  lng: string;
  mainEntranceLat: string;
  mainEntranceLng: string;
  pickupLat: string;
  pickupLng: string;
  image: string;
  image2: string;
  image3: string;
  image4: string;
  coverImage: string;
  primaryColor: string;
  secondaryColor: string;
};

const emptyForm: ProfileForm = {
  name: "",
  legalName: "",
  nit: "",
  businessEmail: "",
  category: "",
  description: "",
  cel1: "",
  cel2: "",
  address: "",
  addressReference: "",
  hrOp: "",
  hrCl: "",
  lat: "",
  lng: "",
  mainEntranceLat: "",
  mainEntranceLng: "",
  pickupLat: "",
  pickupLng: "",
  image: "",
  image2: "",
  image3: "",
  image4: "",
  coverImage: "",
  primaryColor: "",
  secondaryColor: "",
};

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function asCoord(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function buildFormFromStore(store: StoreMe | null, fallbackName: string): ProfileForm {
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
    lat: asCoord(store?.lat),
    lng: asCoord(store?.lng),
    mainEntranceLat: asCoord(store?.mainEntranceLat),
    mainEntranceLng: asCoord(store?.mainEntranceLng),
    pickupLat: asCoord(store?.pickupLat),
    pickupLng: asCoord(store?.pickupLng),
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

function toNullableNumber(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function isRealStoreName(value: string) {
  const v = String(value ?? "").trim().toUpperCase();
  return Boolean(v && v !== "TIENDA");
}

function completionPercent(form: ProfileForm) {
  const required = [
    form.name,
    form.category,
    form.cel1,
    form.businessEmail,
    form.address,
    form.lat,
    form.lng,
    form.image,
  ];

  const filled = required.filter((x) => String(x ?? "").trim()).length;
  return Math.round((filled / required.length) * 100);
}

function ProfileBox({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: "default" | "dark" | "green" | "amber" | "blue";
}) {
  const toneClass =
    tone === "dark"
      ? "border-slate-800 bg-slate-950 text-white"
      : tone === "green"
        ? "border-emerald-100 bg-emerald-50/90"
        : tone === "amber"
          ? "border-amber-100 bg-amber-50/90"
          : tone === "blue"
            ? "border-blue-100 bg-blue-50/90"
            : "border-slate-200 bg-white/94";

  return (
    <div className={`rounded-[18px] border p-4 shadow-[0_8px_20px_rgba(15,23,42,0.045)] ${toneClass}`}>
      <div className={["text-[10px] font-extrabold uppercase tracking-[0.16em]", tone === "dark" ? "text-slate-400" : "text-slate-400"].join(" ")}>
        {label}
      </div>
      <div className={["mt-2 text-[20px] font-black leading-tight", tone === "dark" ? "text-white" : "text-slate-900"].join(" ")}>
        {value}
      </div>
      {helper ? (
        <div className={["mt-2 text-[13px] font-medium leading-snug", tone === "dark" ? "text-slate-300" : "text-slate-500"].join(" ")}>
          {helper}
        </div>
      ) : null}
    </div>
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

function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
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
        Ver documento legal
      </button>
    </div>
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

  const [storeProfile, setStoreProfile] = useState<StoreMe | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(() =>
    buildFormFromStore(null, isRealStoreName(storeName) ? storeName : "")
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  function setFormValue<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
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
      setProfileForm(buildFormFromStore(me, isRealStoreName(storeName) ? storeName : ""));
      setProfileMsg("");
    } catch (e: any) {
      setStoreProfile(null);

      setProfileForm((prev) => ({
        ...prev,
        name: isRealStoreName(storeName) ? storeName : prev.name,
      }));

      setProfileMsg(
        `No se pudo cargar el perfil completo de la tienda. Detalle: ${String(
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
      setProfileForm((prev) => ({
        ...prev,
        name: prev.name || storeName,
      }));
    }
  }, [storeName, storeProfile]);

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

  async function saveProfile() {
    if (savingProfile) return;

    setProfileMsg("");

    if (!profileForm.name.trim()) {
      setProfileMsg("El nombre comercial es obligatorio.");
      return;
    }

    if (!profileForm.category.trim()) {
      setProfileMsg("La categoría es obligatoria.");
      return;
    }

    if (!profileForm.address.trim()) {
      setProfileMsg("La dirección es obligatoria.");
      return;
    }

    setSavingProfile(true);

    try {
      const payload = {
        name: profileForm.name.trim(),
        legalName: toNullableText(profileForm.legalName),
        nit: toNullableText(profileForm.nit),
        businessEmail: toNullableText(profileForm.businessEmail),
        category: profileForm.category.trim(),
        description: profileForm.description.trim(),
        cel1: toNullableText(profileForm.cel1),
        cel2: toNullableText(profileForm.cel2),
        address: profileForm.address.trim(),
        addressReference: toNullableText(profileForm.addressReference),
        hrOp: toNullableText(profileForm.hrOp),
        hrCl: toNullableText(profileForm.hrCl),
        lat: toNullableNumber(profileForm.lat),
        lng: toNullableNumber(profileForm.lng),
        mainEntranceLat: toNullableNumber(profileForm.mainEntranceLat),
        mainEntranceLng: toNullableNumber(profileForm.mainEntranceLng),
        pickupLat: toNullableNumber(profileForm.pickupLat),
        pickupLng: toNullableNumber(profileForm.pickupLng),
        image: toNullableText(profileForm.image),
        image2: toNullableText(profileForm.image2),
        image3: toNullableText(profileForm.image3),
        image4: toNullableText(profileForm.image4),
        coverImage: toNullableText(profileForm.coverImage),
        primaryColor: toNullableText(profileForm.primaryColor),
        secondaryColor: toNullableText(profileForm.secondaryColor),
        onboardingStep: Math.max(2, Number(storeProfile?.onboardingStep ?? 1)),
      };

      const updated = await storeFetch<StoreMe>("/stores/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setStoreProfile(updated);
      setProfileForm(buildFormFromStore(updated, isRealStoreName(storeName) ? storeName : ""));
      setProfileMsg("Información guardada correctamente.");
      await onRefresh();
    } catch (e: any) {
      setProfileMsg(String(e?.message ?? "No se pudo guardar la información."));
    } finally {
      setSavingProfile(false);
    }
  }

  const legalChecking = checkingTerms || loadingDocs;
  const activeStoreImage = profileForm.image || storeImageUrl;
  const displayStoreName = isRealStoreName(storeName)
    ? storeName
    : storeProfile?.name || profileForm.name || "Tienda";
  const displayCityLabel = storeCityLabel && storeCityLabel !== "Establecimiento"
    ? storeCityLabel
    : storeProfile?.city?.name
      ? `${storeProfile.city.name}${storeProfile.city.department ? `, ${storeProfile.city.department}` : ""}`
      : "Sin ciudad";

  const percent = completionPercent(profileForm);
  const legalCompleted =
    termsAccepted && privacyAccepted && operationalConsentAccepted;

  return (
    <>
      <div className="ct-tab-frame flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="overflow-hidden rounded-[24px] border border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.96)_52%,rgba(15,23,42,0.98)_100%)] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-white/10 ring-1 ring-white/20 shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
                {activeStoreImage ? (
                  <Image src={activeStoreImage} alt={displayStoreName} fill className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[30px] text-white">
                    {storeIcon}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-[26px] font-black leading-tight text-white">
                    {displayStoreName}
                  </div>
                  <StatusBadge tone={storeStateUI === "ACTIVE" ? "green" : storeStateUI === "PAUSED" ? "amber" : "slate"}>
                    {storeStateUI === "ACTIVE" ? "Activa" : storeStateUI === "PAUSED" ? "En pausa" : "Inactiva"}
                  </StatusBadge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-300">
                  <span>📍 {displayCityLabel}</span>
                  {storeCitySlug ? <span>• Slug: {storeCitySlug}</span> : null}
                  <span>• Usuario: {userName || "—"}</span>
                </div>

                <div className="mt-3 max-w-3xl text-[13px] font-medium leading-snug text-slate-300">
                  Administra el registro del comercio, ubicación operativa, branding,
                  cumplimiento legal y estado de onboarding de la tienda.
                </div>
              </div>
            </div>

            <div className="w-full rounded-[20px] border border-white/10 bg-white/10 p-4 backdrop-blur md:w-[260px]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Perfil completo
                  </div>
                  <div className="mt-1 text-[28px] font-black text-white">
                    {percent}%
                  </div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-[18px] font-black text-slate-950">
                  {storeProfile?.onboardingCompleted ? "✓" : "↗"}
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="mt-2 text-[12px] font-semibold text-slate-300">
                Paso {storeProfile?.onboardingStep ?? 1} •{" "}
                {storeProfile?.onboardingCompleted ? "Completado" : "En proceso"}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(248,250,252,0.96)_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <ProfileBox label="Ciudad" value={displayCityLabel} helper={storeCitySlug ? `Slug: ${storeCitySlug}` : "Sin slug"} tone="blue" />
            <ProfileBox label="Sesión" value={accessToken?.trim() ? "Autenticada" : "Sin sesión"} helper="AppKey: store" />
            <ProfileBox label="Auto-decisión" value={autoModeLabel} helper="Configuración operativa actual" />

            <div className="xl:col-span-3">
              <SectionCard
                eyebrow="Fase 2 — Registro del Comercio"
                title="Información básica del negocio"
                description="Datos principales del comercio. Esta información se usa para CTCC, perfil público, soporte, validaciones y operación diaria."
                right={
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={savingProfile || loadingProfile}
                    className="inline-flex h-11 items-center justify-center rounded-[14px] bg-slate-900 px-5 text-[13px] font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? "Guardando..." : loadingProfile ? "Cargando..." : "Guardar registro"}
                  </button>
                }
              >
                {profileMsg ? (
                  <div className="mb-4 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-bold text-slate-700">
                    {profileMsg}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Nombre comercial" value={profileForm.name} onChange={(v) => setFormValue("name", v)} />
                  <Field label="Razón social" value={profileForm.legalName} onChange={(v) => setFormValue("legalName", v)} />
                  <Field label="NIT / identificación" value={profileForm.nit} onChange={(v) => setFormValue("nit", v)} />
                  <Field label="Categoría" value={profileForm.category} onChange={(v) => setFormValue("category", v)} />
                  <Field label="Teléfono principal" value={profileForm.cel1} onChange={(v) => setFormValue("cel1", v)} />
                  <Field label="Teléfono secundario" value={profileForm.cel2} onChange={(v) => setFormValue("cel2", v)} />
                  <Field label="Email comercial" value={profileForm.businessEmail} onChange={(v) => setFormValue("businessEmail", v)} type="email" />
                  <TextAreaField label="Descripción del negocio" value={profileForm.description} onChange={(v) => setFormValue("description", v)} />
                </div>
              </SectionCard>
            </div>

            <div className="xl:col-span-3">
              <SectionCard
                eyebrow="Ubicación exacta"
                title="Dirección, entrada y punto de pickup"
                description="Estos datos impactan ETA, geocercas, navegación, asignación de drivers y cálculo de costos."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Dirección" value={profileForm.address} onChange={(v) => setFormValue("address", v)} />
                  <Field label="Referencia de dirección" value={profileForm.addressReference} onChange={(v) => setFormValue("addressReference", v)} />
                  <Field label="Latitud comercio" value={profileForm.lat} onChange={(v) => setFormValue("lat", v)} />
                  <Field label="Longitud comercio" value={profileForm.lng} onChange={(v) => setFormValue("lng", v)} />
                  <Field label="Latitud entrada principal" value={profileForm.mainEntranceLat} onChange={(v) => setFormValue("mainEntranceLat", v)} />
                  <Field label="Longitud entrada principal" value={profileForm.mainEntranceLng} onChange={(v) => setFormValue("mainEntranceLng", v)} />
                  <Field label="Latitud pickup drivers" value={profileForm.pickupLat} onChange={(v) => setFormValue("pickupLat", v)} />
                  <Field label="Longitud pickup drivers" value={profileForm.pickupLng} onChange={(v) => setFormValue("pickupLng", v)} />
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
                  <Field label="Hora apertura" value={profileForm.hrOp} onChange={(v) => setFormValue("hrOp", v)} placeholder="Ej: 08:00 AM" />
                  <Field label="Hora cierre" value={profileForm.hrCl} onChange={(v) => setFormValue("hrCl", v)} placeholder="Ej: 09:00 PM" />
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
                    <Field label="Logo / imagen principal URL" value={profileForm.image} onChange={(v) => setFormValue("image", v)} />
                    <Field label="Portada URL" value={profileForm.coverImage} onChange={(v) => setFormValue("coverImage", v)} />
                    <Field label="Imagen 2 URL" value={profileForm.image2} onChange={(v) => setFormValue("image2", v)} />
                    <Field label="Imagen 3 URL" value={profileForm.image3} onChange={(v) => setFormValue("image3", v)} />
                    <Field label="Imagen 4 URL" value={profileForm.image4} onChange={(v) => setFormValue("image4", v)} />
                    <Field label="Color primario" value={profileForm.primaryColor} onChange={(v) => setFormValue("primaryColor", v)} placeholder="#111827" />
                    <Field label="Color secundario" value={profileForm.secondaryColor} onChange={(v) => setFormValue("secondaryColor", v)} placeholder="#f97316" />
                  </div>

                  <div className="grid gap-3">
                    <PreviewImage src={profileForm.image || storeImageUrl} label="Logo principal" fallback="Logo pendiente" />
                    <PreviewImage src={profileForm.coverImage} label="Portada" fallback="Portada pendiente" />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Primario
                        </div>
                        <div
                          className="mt-3 h-10 rounded-[12px] border border-slate-200"
                          style={{ backgroundColor: profileForm.primaryColor || "#111827" }}
                        />
                      </div>
                      <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Secundario
                        </div>
                        <div
                          className="mt-3 h-10 rounded-[12px] border border-slate-200"
                          style={{ backgroundColor: profileForm.secondaryColor || "#f97316" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="xl:col-span-3">
              <SectionCard
                eyebrow="Legal y sesión"
                title="Documentos legales y acciones"
                description="Consulta el estado legal de la tienda, verifica sesión o cierra sesión."
              >
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
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

                  <div className="rounded-[18px] border border-slate-200 bg-white/94 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.045)]">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Acciones
                    </div>

                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await onRefresh();
                          await loadLegalDocs();
                          await loadProfile();
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

                    <div className="mt-4 rounded-[14px] border border-slate-100 bg-slate-50 p-3 text-[12px] font-semibold text-slate-500">
                      Legal: {legalCompleted ? "completo" : "pendiente"} · Onboarding: paso{" "}
                      {storeProfile?.onboardingStep ?? 1}
                    </div>
                  </div>
                </div>
              </SectionCard>
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
