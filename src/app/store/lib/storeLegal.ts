//src\app\store\lib\storeLegal.ts
import { STORE_TERMS_VERSION } from "../legal/storeTerms";

export { STORE_TERMS_VERSION } from "../legal/storeTerms";

export const STORE_TERMS_LOCAL_KEY = "kronix_store_terms_acceptance";

export type StoreFetchFn = <T>(
  path: string,
  init?: RequestInit,
  retry?: boolean
) => Promise<T>;

export function saveStoreTermsLocal() {
  try {
    localStorage.setItem(
      STORE_TERMS_LOCAL_KEY,
      JSON.stringify({
        version: STORE_TERMS_VERSION,
        acceptedAt: new Date().toISOString(),
      })
    );
  } catch {}
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