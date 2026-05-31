//src\app\store\components\legal\StoreTermsModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  acceptStoreTermsBackend,
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

export default function StoreTermsModal({
  open,
  force = false,
  storeFetch,
  onClose,
  onAccepted,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [reachedBottom, setReachedBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setChecked(false);
    setSaving(false);
    setLoadingDoc(true);

    getCurrentStoreLegalDocument(storeFetch, "STORE_TERMS")
      .then((doc) => setLegalDoc(doc))
      .catch(() => setLegalDoc(null))
      .finally(() => setLoadingDoc(false));
  }, [open, storeFetch]);

  if (!open) return null;

  const title = legalDoc?.title || "Términos y Condiciones para Comercios KroniX";
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
    if (distanceToBottom <= 18) setReachedBottom(true);
  }

  async function handleAccept() {
    if (!reachedBottom || !checked || saving || !legalDoc?.version) return;

    setSaving(true);

    try {
      await acceptStoreTermsBackend(storeFetch, legalDoc.version);
      alert("Gracias por aceptar los Términos y Condiciones de KroniX Store.");
      onAccepted();
      onClose();
    } catch {
      alert("No fue posible registrar la aceptación legal. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  const canAccept = reachedBottom && checked && !saving && !!legalDoc?.version;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-[2px]">
      <div className="flex max-h-[84vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Documento legal KroniX Store
              </div>

              <h2 className="mt-2 text-[28px] font-black leading-none text-slate-950">
                {title}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
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
                aria-label="Cerrar términos"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mb-5 rounded-[18px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(239,246,255,0.95))] p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Información legal
            </div>

            <p className="mt-2 text-[13px] font-semibold leading-5 text-slate-700">
              Para operar en KroniX Store, el comercio debe leer y aceptar la versión vigente del documento.
            </p>
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
            {loadingDoc ? (
              <p className="text-[13px] font-semibold leading-5 text-slate-600">
                Cargando documento legal vigente desde Legal Center...
              </p>
            ) : paragraphs.length === 0 ? (
              <p className="text-[13px] font-semibold leading-5 text-amber-700">
                No se pudo cargar el documento legal vigente. Intenta nuevamente.
              </p>
            ) : (
              paragraphs.map((p, index) => {
                const clean = p.replace(/^#+\s?/, "").trim();

                const isBlockTitle =
                  clean.toUpperCase().startsWith("BLOQUE") ||
                  /^[0-9]+[\.\)]\s/.test(clean) ||
                  (clean.length < 90 && clean.toUpperCase() === clean);

                const isBullet = clean.startsWith("-") || clean.startsWith("•");

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

          <div className="mt-5 rounded-[16px] border border-emerald-100 bg-emerald-50 p-3 text-[12px] font-black text-emerald-800">
            Has llegado al final del documento.
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          {!reachedBottom ? (
            <div className="mb-3 text-center text-[12px] font-bold text-slate-500">
              Lee el documento completo para habilitar la aceptación.
            </div>
          ) : null}

          <label
            className={[
              "flex items-start gap-3 rounded-[16px] bg-slate-50 p-3 ring-1 ring-slate-200",
              reachedBottom ? "cursor-pointer" : "cursor-not-allowed opacity-60",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={!reachedBottom}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-4 w-4 accent-emerald-600"
            />

            <span className="text-[13px] font-semibold leading-5 text-slate-700">
              Declaro que he leído, comprendido y acepto los Términos y Condiciones para comercios KroniX.
            </span>
          </label>

          <button
            type="button"
            disabled={!canAccept}
            onClick={handleAccept}
            className={[
              "mt-3 inline-flex h-11 w-full items-center justify-center rounded-[14px] text-[13px] font-extrabold text-white transition",
              canAccept ? "bg-slate-900 hover:bg-slate-800" : "bg-slate-300",
            ].join(" ")}
          >
            {saving ? "Guardando aceptación..." : "Aceptar y continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}