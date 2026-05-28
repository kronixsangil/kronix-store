//src\app\store\lib\storeLegal.ts
import { STORE_TERMS_VERSION } from "../legal/storeTerms";

export { STORE_TERMS_VERSION } from "../legal/storeTerms";

export const STORE_PRIVACY_VERSION = "store-privacy-v1-2026-05";
export const STORE_OPERATIONAL_CONSENT_VERSION =
  "store-operational-consent-v1-2026-05";

export const STORE_TERMS_LOCAL_KEY = "kronix_store_terms_acceptance";
export const STORE_PRIVACY_LOCAL_KEY = "kronix_store_privacy_acceptance";
export const STORE_OPERATIONAL_CONSENT_LOCAL_KEY =
  "kronix_store_operational_consent_acceptance";

export type StoreFetchFn = <T>(
  path: string,
  init?: RequestInit,
  retry?: boolean
) => Promise<T>;

type StoreLegalOverviewResponse = {
  ok: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  operationalConsentAccepted: boolean;
  documents?: any[];
};

function saveLegalLocal(key: string, version: string) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        version,
        acceptedAt: new Date().toISOString(),
      })
    );
  } catch {}
}

export function saveStoreTermsLocal() {
  saveLegalLocal(STORE_TERMS_LOCAL_KEY, STORE_TERMS_VERSION);
}

export function saveStorePrivacyLocal() {
  saveLegalLocal(STORE_PRIVACY_LOCAL_KEY, STORE_PRIVACY_VERSION);
}

export function saveStoreOperationalConsentLocal() {
  saveLegalLocal(
    STORE_OPERATIONAL_CONSENT_LOCAL_KEY,
    STORE_OPERATIONAL_CONSENT_VERSION
  );
}

export async function checkStoreTermsStatus(storeFetch: StoreFetchFn) {
  const res = await storeFetch<{ ok: boolean; accepted: boolean }>(
    `/legal/status?documentType=STORE_TERMS&version=${encodeURIComponent(
      STORE_TERMS_VERSION
    )}`,
    { method: "GET", cache: "no-store" }
  );

  if (res?.accepted) saveStoreTermsLocal();

  return !!res?.accepted;
}

export async function checkStorePrivacyStatus(storeFetch: StoreFetchFn) {
  const res = await storeFetch<{ ok: boolean; accepted: boolean }>(
    `/legal/status?documentType=STORE_PRIVACY&version=${encodeURIComponent(
      STORE_PRIVACY_VERSION
    )}`,
    { method: "GET", cache: "no-store" }
  );

  if (res?.accepted) saveStorePrivacyLocal();

  return !!res?.accepted;
}

export async function checkStoreOperationalConsentStatus(
  storeFetch: StoreFetchFn
) {
  const res = await storeFetch<{ ok: boolean; accepted: boolean }>(
    `/legal/status?documentType=STORE_OPERATIONAL_CONSENT&version=${encodeURIComponent(
      STORE_OPERATIONAL_CONSENT_VERSION
    )}`,
    { method: "GET", cache: "no-store" }
  );

  if (res?.accepted) saveStoreOperationalConsentLocal();

  return !!res?.accepted;
}

export async function getStoreLegalOverview(storeFetch: StoreFetchFn) {
  const res = await storeFetch<StoreLegalOverviewResponse>(
    "/legal/store/overview",
    { method: "GET", cache: "no-store" }
  );

  if (res?.termsAccepted) saveStoreTermsLocal();
  if (res?.privacyAccepted) saveStorePrivacyLocal();
  if (res?.operationalConsentAccepted) saveStoreOperationalConsentLocal();

  return {
    termsAccepted: !!res?.termsAccepted,
    privacyAccepted: !!res?.privacyAccepted,
    operationalConsentAccepted: !!res?.operationalConsentAccepted,
    allAccepted:
      !!res?.termsAccepted &&
      !!res?.privacyAccepted &&
      !!res?.operationalConsentAccepted,
    documents: res?.documents ?? [],
  };
}

export async function acceptStoreTermsBackend(storeFetch: StoreFetchFn) {
  await storeFetch("/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentType: "STORE_TERMS",
      version: STORE_TERMS_VERSION,
      source: "STORE_APP",
    }),
  });

  saveStoreTermsLocal();
}

export async function acceptStorePrivacyBackend(storeFetch: StoreFetchFn) {
  await storeFetch("/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentType: "STORE_PRIVACY",
      version: STORE_PRIVACY_VERSION,
      source: "STORE_APP",
    }),
  });

  saveStorePrivacyLocal();
}

export async function acceptStoreOperationalConsentBackend(
  storeFetch: StoreFetchFn
) {
  await storeFetch("/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentType: "STORE_OPERATIONAL_CONSENT",
      version: STORE_OPERATIONAL_CONSENT_VERSION,
      source: "STORE_APP",
    }),
  });

  saveStoreOperationalConsentLocal();
}