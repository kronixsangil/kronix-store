//src\app\store\hooks\useStoreProducts.ts
"use client";

import { useState } from "react";
import { StoreProduct, StoreProductUpsertInput } from "../lib/storeTypes";

type Props = {
  storeFetch: <T>(path: string, init?: RequestInit, retry?: boolean) => Promise<T>;
  doLogout: () => Promise<void>;
  isUnauthorizedErrMessage: (msg: string) => boolean;
};

export function useStoreProducts({
  storeFetch,
  doLogout,
  isUnauthorizedErrMessage,
}: Props) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    setErr(null);

    try {
      const list = await storeFetch<StoreProduct[]>(`/stores/me/products`, { method: "GET" });
      setProducts(Array.isArray(list) ? list : []);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return;
      }
      setErr(e?.message || "No se pudieron cargar los productos");
    } finally {
      setLoading(false);
    }
  }

  async function createProduct(input: StoreProductUpsertInput) {
    setSaving(true);
    setErr(null);

    try {
      await storeFetch<StoreProduct>(`/stores/me/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      await loadProducts();
      return true;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return false;
      }
      setErr(e?.message || "No se pudo crear el producto");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateProduct(productId: string, input: Partial<StoreProductUpsertInput>) {
    setSaving(true);
    setErr(null);

    try {
      await storeFetch<StoreProduct>(`/stores/me/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      await loadProducts();
      return true;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return false;
      }
      setErr(e?.message || "No se pudo actualizar el producto");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(productId: string) {
    setDeletingId(productId);
    setErr(null);

    try {
      await storeFetch<{ ok?: boolean }>(`/stores/me/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });

      await loadProducts();
      return true;
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (isUnauthorizedErrMessage(msg)) {
        await doLogout();
        return false;
      }
      setErr(e?.message || "No se pudo eliminar el producto");
      return false;
    } finally {
      setDeletingId(null);
    }
  }

  return {
    products,
    loading,
    saving,
    deletingId,
    err,
    setErr,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}