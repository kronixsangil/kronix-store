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

function ProfileBox({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
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

  return (
    <>
      <div className="ct-tab-frame flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="rounded-[20px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.97)_100%)] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              {activeStoreImage ? (
                <Image src={activeStoreImage} alt={displayStoreName} fill className="object-cover" />
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
                Registro del comercio, ubicación, branding y documentos legales de la tienda.
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-[22px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(248,250,252,0.94)_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <ProfileBox label="Tienda" value={displayStoreName} />

            <div className="rounded-[16px] border border-slate-200 bg-white/94 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                Ciudad
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SmallChip tone="softBlue">📍 {displayCityLabel}</SmallChip>
                {storeCitySlug ? (
                  <SmallChip tone="softSlate">Slug: {storeCitySlug}</SmallChip>
                ) : null}
              </div>
            </div>

            <ProfileBox label="Usuario" value={userName || "—"} helper="Rol: STORE" />

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

            <ProfileBox
              label="Onboarding"
              value={`Paso ${storeProfile?.onboardingStep ?? 1}`}
              helper={storeProfile?.onboardingCompleted ? "Completado" : "En proceso"}
            />

            <div className="xl:col-span-3 rounded-[18px] border border-slate-200 bg-white/94 p-4 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                    Fase 2 — Registro del Comercio
                  </div>
                  <div className="mt-2 text-[22px] font-black leading-tight text-slate-900">
                    Información básica, ubicación y branding
                  </div>
                  <div className="mt-2 max-w-3xl text-[13px] font-medium leading-snug text-slate-500">
                    Estos datos alimentan CTCC, geocercas, ETA, asignación de drivers,
                    costos, perfil público y operación diaria de la tienda.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={savingProfile || loadingProfile}
                  className="inline-flex h-11 items-center justify-center rounded-[14px] bg-slate-900 px-5 text-[13px] font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? "Guardando..." : loadingProfile ? "Cargando..." : "Guardar registro"}
                </button>
              </div>

              {profileMsg ? (
                <div className="mt-4 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-bold text-slate-700">
                  {profileMsg}
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nombre comercial" value={profileForm.name} onChange={(v) => setFormValue("name", v)} />
                <Field label="Razón social" value={profileForm.legalName} onChange={(v) => setFormValue("legalName", v)} />
                <Field label="NIT / identificación" value={profileForm.nit} onChange={(v) => setFormValue("nit", v)} />
                <Field label="Categoría" value={profileForm.category} onChange={(v) => setFormValue("category", v)} />
                <Field label="Teléfono principal" value={profileForm.cel1} onChange={(v) => setFormValue("cel1", v)} />
                <Field label="Teléfono secundario" value={profileForm.cel2} onChange={(v) => setFormValue("cel2", v)} />
                <Field label="Email comercial" value={profileForm.businessEmail} onChange={(v) => setFormValue("businessEmail", v)} type="email" />
                <Field label="Dirección" value={profileForm.address} onChange={(v) => setFormValue("address", v)} />
                <TextAreaField label="Referencia de dirección" value={profileForm.addressReference} onChange={(v) => setFormValue("addressReference", v)} />
                <TextAreaField label="Descripción del negocio" value={profileForm.description} onChange={(v) => setFormValue("description", v)} />

                <Field label="Hora apertura" value={profileForm.hrOp} onChange={(v) => setFormValue("hrOp", v)} placeholder="Ej: 08:00 AM" />
                <Field label="Hora cierre" value={profileForm.hrCl} onChange={(v) => setFormValue("hrCl", v)} placeholder="Ej: 09:00 PM" />

                <Field label="Latitud comercio" value={profileForm.lat} onChange={(v) => setFormValue("lat", v)} />
                <Field label="Longitud comercio" value={profileForm.lng} onChange={(v) => setFormValue("lng", v)} />
                <Field label="Latitud entrada principal" value={profileForm.mainEntranceLat} onChange={(v) => setFormValue("mainEntranceLat", v)} />
                <Field label="Longitud entrada principal" value={profileForm.mainEntranceLng} onChange={(v) => setFormValue("mainEntranceLng", v)} />
                <Field label="Latitud pickup drivers" value={profileForm.pickupLat} onChange={(v) => setFormValue("pickupLat", v)} />
                <Field label="Longitud pickup drivers" value={profileForm.pickupLng} onChange={(v) => setFormValue("pickupLng", v)} />

                <Field label="Logo / imagen principal URL" value={profileForm.image} onChange={(v) => setFormValue("image", v)} />
                <Field label="Portada URL" value={profileForm.coverImage} onChange={(v) => setFormValue("coverImage", v)} />
                <Field label="Imagen 2 URL" value={profileForm.image2} onChange={(v) => setFormValue("image2", v)} />
                <Field label="Imagen 3 URL" value={profileForm.image3} onChange={(v) => setFormValue("image3", v)} />
                <Field label="Imagen 4 URL" value={profileForm.image4} onChange={(v) => setFormValue("image4", v)} />
                <Field label="Color primario" value={profileForm.primaryColor} onChange={(v) => setFormValue("primaryColor", v)} placeholder="#111827" />
                <Field label="Color secundario" value={profileForm.secondaryColor} onChange={(v) => setFormValue("secondaryColor", v)} placeholder="#f97316" />
              </div>
            </div>

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