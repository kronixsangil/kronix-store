//src\app\store\lib\storeLegal.ts
export const STORE_TERMS_VERSION = "store-terms-v1-2026-05-21";
export const STORE_PRIVACY_VERSION = "store-privacy-v1-2026-05";
export const STORE_OPERATIONAL_CONSENT_VERSION =
  "store-operational-consent-v1-2026-05";

export const STORE_TERMS_LOCAL_KEY = "kronix_store_terms_acceptance";
export const STORE_PRIVACY_LOCAL_KEY = "kronix_store_privacy_acceptance";
export const STORE_OPERATIONAL_CONSENT_LOCAL_KEY =
  "kronix_store_operational_consent_acceptance";

export type StoreLegalDocumentType =
  | "STORE_TERMS"
  | "STORE_PRIVACY"
  | "STORE_OPERATIONAL_CONSENT";

export type StoreLegalDocument = {
  id: string;
  documentType: StoreLegalDocumentType;
  version: string;
  title: string;
  description?: string | null;
  content?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

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
  currentDocuments?: StoreLegalDocument[];
  documents?: any[];
};

export async function getCurrentStoreLegalDocument(
  storeFetch: StoreFetchFn,
  documentType: StoreLegalDocumentType
) {
  const res = await storeFetch<{
    ok: boolean;
    documentType: string;
    document: StoreLegalDocument | null;
  }>(`/legal/documents/current/${documentType}`, {
    method: "GET",
    cache: "no-store",
  });

  return res.document;
}

export async function getCurrentStoreTermsVersion(storeFetch: StoreFetchFn) {
  const doc = await getCurrentStoreLegalDocument(storeFetch, "STORE_TERMS");
  return doc?.version || STORE_TERMS_VERSION;
}

export async function getCurrentStorePrivacyVersion(storeFetch: StoreFetchFn) {
  const doc = await getCurrentStoreLegalDocument(storeFetch, "STORE_PRIVACY");
  return doc?.version || STORE_PRIVACY_VERSION;
}

export async function getCurrentStoreOperationalConsentVersion(
  storeFetch: StoreFetchFn
) {
  const doc = await getCurrentStoreLegalDocument(
    storeFetch,
    "STORE_OPERATIONAL_CONSENT"
  );

  return doc?.version || STORE_OPERATIONAL_CONSENT_VERSION;
}

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

export function saveStoreTermsLocal(version: string) {
  saveLegalLocal(STORE_TERMS_LOCAL_KEY, version);
}

export function saveStorePrivacyLocal(version: string) {
  saveLegalLocal(STORE_PRIVACY_LOCAL_KEY, version);
}

export function saveStoreOperationalConsentLocal(version: string) {
  saveLegalLocal(STORE_OPERATIONAL_CONSENT_LOCAL_KEY, version);
}

export async function checkStoreTermsStatus(storeFetch: StoreFetchFn) {
  const version = await getCurrentStoreTermsVersion(storeFetch);

  const res = await storeFetch<{ ok: boolean; accepted: boolean }>(
    `/legal/status?documentType=STORE_TERMS&version=${encodeURIComponent(
      version
    )}`,
    { method: "GET", cache: "no-store" }
  );

  if (res?.accepted) saveStoreTermsLocal(version);

  return !!res?.accepted;
}

export async function checkStorePrivacyStatus(storeFetch: StoreFetchFn) {
  const version = await getCurrentStorePrivacyVersion(storeFetch);

  const res = await storeFetch<{ ok: boolean; accepted: boolean }>(
    `/legal/status?documentType=STORE_PRIVACY&version=${encodeURIComponent(
      version
    )}`,
    { method: "GET", cache: "no-store" }
  );

  if (res?.accepted) saveStorePrivacyLocal(version);

  return !!res?.accepted;
}

export async function checkStoreOperationalConsentStatus(
  storeFetch: StoreFetchFn
) {
  const version = await getCurrentStoreOperationalConsentVersion(storeFetch);

  const res = await storeFetch<{ ok: boolean; accepted: boolean }>(
    `/legal/status?documentType=STORE_OPERATIONAL_CONSENT&version=${encodeURIComponent(
      version
    )}`,
    { method: "GET", cache: "no-store" }
  );

  if (res?.accepted) saveStoreOperationalConsentLocal(version);

  return !!res?.accepted;
}

export async function getStoreLegalOverview(storeFetch: StoreFetchFn) {
  const res = await storeFetch<StoreLegalOverviewResponse>(
    "/legal/store/overview",
    { method: "GET", cache: "no-store" }
  );

  const currentTerms = res?.currentDocuments?.find(
    (d) => d.documentType === "STORE_TERMS"
  );

  const currentPrivacy = res?.currentDocuments?.find(
    (d) => d.documentType === "STORE_PRIVACY"
  );

  const currentOperationalConsent = res?.currentDocuments?.find(
    (d) => d.documentType === "STORE_OPERATIONAL_CONSENT"
  );

  if (res?.termsAccepted && currentTerms?.version) {
    saveStoreTermsLocal(currentTerms.version);
  }

  if (res?.privacyAccepted && currentPrivacy?.version) {
    saveStorePrivacyLocal(currentPrivacy.version);
  }

  if (
    res?.operationalConsentAccepted &&
    currentOperationalConsent?.version
  ) {
    saveStoreOperationalConsentLocal(currentOperationalConsent.version);
  }

  return {
    termsAccepted: !!res?.termsAccepted,
    privacyAccepted: !!res?.privacyAccepted,
    operationalConsentAccepted: !!res?.operationalConsentAccepted,
    allAccepted:
      !!res?.termsAccepted &&
      !!res?.privacyAccepted &&
      !!res?.operationalConsentAccepted,
    currentDocuments: res?.currentDocuments ?? [],
    documents: res?.documents ?? [],
  };
}

export async function acceptStoreTermsBackend(
  storeFetch: StoreFetchFn,
  version?: string
) {
  const finalVersion = version || (await getCurrentStoreTermsVersion(storeFetch));

  await storeFetch("/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentType: "STORE_TERMS",
      version: finalVersion,
      source: "STORE_APP",
    }),
  });

  saveStoreTermsLocal(finalVersion);
}

export async function acceptStorePrivacyBackend(
  storeFetch: StoreFetchFn,
  version?: string
) {
  const finalVersion =
    version || (await getCurrentStorePrivacyVersion(storeFetch));

  await storeFetch("/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentType: "STORE_PRIVACY",
      version: finalVersion,
      source: "STORE_APP",
    }),
  });

  saveStorePrivacyLocal(finalVersion);
}

export async function acceptStoreOperationalConsentBackend(
  storeFetch: StoreFetchFn,
  version?: string
) {
  const finalVersion =
    version || (await getCurrentStoreOperationalConsentVersion(storeFetch));

  await storeFetch("/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentType: "STORE_OPERATIONAL_CONSENT",
      version: finalVersion,
      source: "STORE_APP",
    }),
  });

  saveStoreOperationalConsentLocal(finalVersion);
}