//src\app\store\components\legal\StoreOperationalConsentModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  acceptStoreOperationalConsentBackend,
  getCurrentStoreLegalDocument,
  StoreFetchFn,
  type StoreLegalDocument,
} from "../../lib/storeLegal";

type Props = {
  open: boolean;
  force?: boolean;
  storeFetch: StoreFetchFn;
  onClose: () => void;
  onAccepted: () => void;
};

type ConsentKey =
  | "communications"
  | "monitoring"
  | "geolocation"
  | "antiFraud"
  | "pushNotifications"
  | "platformUpdates"
  | "finalAcceptance";

const CONSENTS: {
  key: ConsentKey;
  title: string;
  text: string;
}[] = [
  {
    key: "communications",
    title: "Comunicaciones operativas",
    text: "Acepto recibir comunicaciones relacionadas con pedidos, soporte, alertas, seguridad y funcionamiento de la plataforma mediante notificaciones, correo electrónico, SMS, llamadas o WhatsApp.",
  },
  {
    key: "monitoring",
    title: "Monitoreo operativo y métricas",
    text: "Autorizo a KroniX para monitorear métricas operativas, tiempos de preparación, actividad dentro de la plataforma y desempeño operativo con fines de calidad, seguridad, auditoría y optimización.",
  },
  {
    key: "geolocation",
    title: "Geolocalización operativa",
    text: "Autorizo el uso de información de ubicación y geolocalización relacionada con mi establecimiento y operación logística para mejorar asignaciones, tiempos y control operativo.",
  },
  {
    key: "antiFraud",
    title: "Prevención de fraude y validaciones",
    text: "Autorizo procesos automáticos y manuales de validación, monitoreo y prevención de fraude para proteger la seguridad de la plataforma y sus usuarios.",
  },
  {
    key: "pushNotifications",
    title: "Notificaciones push y alertas",
    text: "Acepto recibir notificaciones push y alertas relacionadas con actividad operativa, pedidos, incidencias y novedades importantes de la plataforma.",
  },
  {
    key: "platformUpdates",
    title: "Actualizaciones y mejoras de plataforma",
    text: "Acepto que KroniX implemente mejoras, cambios operativos y nuevas funcionalidades que puedan modificar parcialmente la experiencia de uso de la plataforma.",
  },
  {
    key: "finalAcceptance",
    title: "Aceptación final",
    text: "Confirmo que he leído, comprendido y acepto los Consentimientos Operativos para Comercios KroniX.",
  },
];

export default function StoreOperationalConsentModal({
  open,
  force = false,
  storeFetch,
  onClose,
  onAccepted,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [reachedBottom, setReachedBottom] = useState(false);
  const [checkedByKey, setCheckedByKey] = useState<Record<ConsentKey, boolean>>({
    communications: false,
    monitoring: false,
    geolocation: false,
    antiFraud: false,
    pushNotifications: false,
    platformUpdates: false,
    finalAcceptance: false,
  });

  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"READ" | "CONSENTS">("READ");
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [legalDoc, setLegalDoc] = useState<StoreLegalDocument | null>(null);

  const paragraphs = useMemo(() => {
    return String(legalDoc?.content ?? "")
      .split("\n")
      .filter((line) => line.trim().length > 0);
  }, [legalDoc?.content]);

  useEffect(() => {
    if (!open) return;

    setReachedBottom(false);
    setCheckedByKey({
      communications: false,
      monitoring: false,
      geolocation: false,
      antiFraud: false,
      pushNotifications: false,
      platformUpdates: false,
      finalAcceptance: false,
    });
    setSaving(false);
    setStep("READ");
    setLoadingDoc(true);

    getCurrentStoreLegalDocument(storeFetch, "STORE_OPERATIONAL_CONSENT")
      .then((doc) => setLegalDoc(doc))
      .catch(() => setLegalDoc(null))
      .finally(() => setLoadingDoc(false));
  }, [open, storeFetch]);

  if (!open) return null;

  const title =
    legalDoc?.title || "Consentimientos Operativos para Comercios KroniX";

  const version = legalDoc?.version || "Versión vigente";

  const lastUpdated = legalDoc?.updatedAt
    ? new Date(legalDoc.updatedAt).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      })
    : "Legal Center";

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (distanceToBottom <= 18) {
      setReachedBottom(true);
    }
  }

  function toggleConsent(key: ConsentKey, value: boolean) {
    setCheckedByKey((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const allChecked = CONSENTS.every((item) => checkedByKey[item.key]);
  const canAccept = reachedBottom && allChecked && !saving && !!legalDoc?.version;
  const canContinueToConsents = reachedBottom && !!legalDoc?.version;

  async function handleAccept() {
    if (!canAccept || !legalDoc?.version) return;

    setSaving(true);

    try {
      await acceptStoreOperationalConsentBackend(storeFetch, legalDoc.version);
      alert("Gracias por aceptar los Consentimientos Operativos de KroniX Store.");
      onAccepted();
      onClose();
    } catch {
      alert(
        "No fue posible registrar la aceptación de consentimientos. Inténtalo nuevamente."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-[2px]">
      <div className="flex max-h-[84vh] w-full max-w-[820px] flex-col overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Documento operativo KroniX Store
              </div>

              <h2 className="mt-2 text-[28px] font-black leading-none text-slate-950">
                {title}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">
                  {version}
                </span>

                <span className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
                  Actualizado: {lastUpdated}
                </span>
              </div>
            </div>

            {!force ? (
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-700 ring-1 ring-slate-200"
                aria-label="Cerrar consentimientos operativos"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        {step === "READ" ? (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="mb-5 rounded-[18px] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(248,250,252,0.96))] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
                Autorizaciones operativas
              </div>

              <p className="mt-2 text-[13px] font-semibold leading-5 text-slate-700">
                Estos consentimientos permiten que KroniX opere, monitoree,
                audite y comunique información crítica para el funcionamiento de
                la tienda dentro de la plataforma.
              </p>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
              {loadingDoc ? (
                <p className="text-[13px] font-semibold leading-5 text-slate-600">
                  Cargando documento operativo vigente desde Legal Center...
                </p>
              ) : paragraphs.length === 0 ? (
                <p className="text-[13px] font-semibold leading-5 text-amber-700">
                  No se pudo cargar el documento operativo vigente. Intenta nuevamente.
                </p>
              ) : (
                paragraphs.map((p, index) => {
                  const clean = p.replace(/^#+\s?/, "").trim();

                  const isBlockTitle =
                    clean.toUpperCase().startsWith("BLOQUE") ||
                    /^[0-9]+[\.\)]\s/.test(clean) ||
                    (clean.length < 90 && clean.toUpperCase() === clean);

                  const isBullet =
                    clean.startsWith("-") || clean.startsWith("•");

                  return (
                    <p
                      key={`${clean}-${index}`}
                      className={[
                        isBlockTitle
                          ? "mb-3 mt-5 text-[15px] font-black leading-5 text-slate-950 first:mt-0"
                          : isBullet
                            ? "mb-2 pl-4 text-[13px] font-semibold leading-5 text-slate-600"
                            : "mb-3 text-[13px] font-medium leading-5 text-slate-600",
                      ].join(" ")}
                    >
                      {clean}
                    </p>
                  );
                })
              )}
            </div>

            <div className="mt-5 rounded-[16px] border border-amber-100 bg-amber-50 p-4">
              <div className="text-[13px] font-black text-amber-800">
                Has llegado al final del documento.
              </div>

              <div className="mt-2 text-[13px] text-amber-900">
                Confirma que terminaste la lectura para continuar.
              </div>

              <button
                type="button"
                disabled={!canContinueToConsents}
                onClick={() => setStep("CONSENTS")}
                className={[
                  "mt-4 inline-flex h-11 w-full items-center justify-center rounded-[14px] text-[13px] font-extrabold text-white transition",
                  canContinueToConsents
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-slate-300",
                ].join(" ")}
              >
                He leído el documento
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mb-4 rounded-[18px] border border-amber-200 bg-amber-50 p-4">
              <div className="text-[13px] font-black text-amber-800">
                Consentimientos Operativos
              </div>

              <div className="mt-2 text-[13px] text-amber-900">
                Marca todas las casillas para continuar.
              </div>
            </div>

            <div className="space-y-3">
              {CONSENTS.map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-start gap-3 rounded-[16px] bg-slate-50 p-4 ring-1 ring-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={checkedByKey[item.key]}
                    onChange={(e) =>
                      toggleConsent(item.key, e.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-amber-600"
                  />

                  <span className="text-[13px] font-semibold leading-5 text-slate-700">
                    <span className="font-black text-slate-900">
                      {item.title}:{" "}
                    </span>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("READ")}
                className="h-11 rounded-[14px] border border-slate-300 px-5 text-[13px] font-bold text-slate-700"
              >
                Volver
              </button>

              <button
                type="button"
                disabled={!canAccept}
                onClick={handleAccept}
                className={[
                  "h-11 flex-1 rounded-[14px] text-[13px] font-extrabold text-white transition",
                  canAccept
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-slate-300",
                ].join(" ")}
              >
                {saving ? "Guardando aceptación..." : "Aceptar y continuar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}