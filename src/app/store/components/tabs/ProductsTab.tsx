// src/app/store/components/tabs/ProductsTab.tsx
"use client";

import { useMemo, useState } from "react";
import { formatCOP } from "../../lib/storeUtils";
import { StoreProduct, StoreProductUpsertInput } from "../../lib/storeTypes";

type Props = {
  products: StoreProduct[];
  loading: boolean;
  err: string | null;
  saving: boolean;
  deletingId: string | null;
  permissions?: {
    productsFeatureEnabled?: boolean;
    storeAppCanManageProducts?: boolean;
    storeAppCanCreateProducts?: boolean;
    storeAppCanEditProducts?: boolean;
    storeAppCanDeleteProducts?: boolean;
    storeAppCanChangeProductPrices?: boolean;
    storeAppCanUploadProductImages?: boolean;
    storeAppCanUseProductCamera?: boolean;
    storeAppCanImportProductsCsv?: boolean;
    storeAppCanToggleProductActive?: boolean;
    storeAppCanToggleProductAvailable?: boolean;
  } | null;
  onRefresh: () => void | Promise<void>;
  onCreate: (input: StoreProductUpsertInput) => Promise<boolean>;
  onUpdate: (productId: string, input: Partial<StoreProductUpsertInput>) => Promise<boolean>;
  onDelete: (productId: string) => Promise<boolean>;
};

type EditorState = {
  mode: "create" | "edit";
  productId: string | null;
  externalId: string;
  name: string;
  description: string;
  info: string;
  priceCOP: string;
  image: string;
  isActive: boolean;
  isAvailable: boolean;
  sortOrder: string;
};

function emptyEditor(): EditorState {
  return {
    mode: "create",
    productId: null,
    externalId: "",
    name: "",
    description: "",
    info: "",
    priceCOP: "",
    image: "",
    isActive: true,
    isAvailable: true,
    sortOrder: "100",
  };
}

function ProductChip({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold",
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function ProductsTab({
  products,
  loading,
  err,
  saving,
  deletingId,
  permissions,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditor());

  const productsEnabled = Boolean(permissions?.productsFeatureEnabled ?? true);
  const canManage = Boolean(permissions?.storeAppCanManageProducts ?? true);
  const canCreate = productsEnabled && canManage && Boolean(permissions?.storeAppCanCreateProducts ?? true);
  const canEdit = productsEnabled && canManage && Boolean(permissions?.storeAppCanEditProducts ?? true);
  const canDelete = productsEnabled && canManage && Boolean(permissions?.storeAppCanDeleteProducts ?? true);
  const canChangePrices = productsEnabled && canManage && Boolean(permissions?.storeAppCanChangeProductPrices ?? true);
  const canUploadImages = productsEnabled && canManage && Boolean(permissions?.storeAppCanUploadProductImages ?? true);
  const canToggleActive = productsEnabled && canManage && Boolean(permissions?.storeAppCanToggleProductActive ?? true);
  const canToggleAvailable =
    productsEnabled && canManage && Boolean(permissions?.storeAppCanToggleProductAvailable ?? true);

  const filtered = useMemo(() => {
    const q = String(query ?? "").trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      const hay =
        `${p.externalId} ${p.name} ${p.description ?? ""} ${p.info ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, query]);

    function openCreate() {
    if (!canCreate) {
      window.alert("Tu tienda no tiene permiso para crear productos.");
      return;
    }
    setEditor(emptyEditor());
  }

    function openEdit(p: StoreProduct) {
    if (!canEdit) {
      window.alert("Tu tienda no tiene permiso para editar productos.");
      return;
    }

    setEditor({
      mode: "edit",
      productId: p.id,
      externalId: p.externalId ?? "",
      name: p.name ?? "",
      description: p.description ?? "",
      info: p.info ?? "",
      priceCOP: String(p.priceCOP ?? ""),
      image: p.image ?? "",
      isActive: Boolean(p.isActive),
      isAvailable: Boolean(p.isAvailable),
      sortOrder: String(p.sortOrder ?? 100),
    });
  }

  async function handleSave() {
        if (editor.mode === "create" && !canCreate) {
      window.alert("Tu tienda no tiene permiso para crear productos.");
      return;
    }

    if (editor.mode === "edit" && !canEdit) {
      window.alert("Tu tienda no tiene permiso para editar productos.");
      return;
    }

    if (!canChangePrices && editor.mode === "edit") {
      const current = products.find((p) => p.id === editor.productId);
      const nextPrice = Math.max(0, Math.round(Number(editor.priceCOP || 0)));
      if (current && Number(current.priceCOP) !== nextPrice) {
        window.alert("Tu tienda no tiene permiso para cambiar precios.");
        return;
      }
    }

    if (!canUploadImages && String(editor.image ?? "").trim()) {
      const current = products.find((p) => p.id === editor.productId);
      const nextImage = String(editor.image ?? "").trim();
      const currentImage = String(current?.image ?? "").trim();

      if (editor.mode === "create" || nextImage !== currentImage) {
        window.alert("Tu tienda no tiene permiso para usar imágenes de productos.");
        return;
      }
    }

    if (!canToggleActive && editor.mode === "edit") {
      const current = products.find((p) => p.id === editor.productId);
      if (current && Boolean(current.isActive) !== Boolean(editor.isActive)) {
        window.alert("Tu tienda no tiene permiso para activar o desactivar productos.");
        return;
      }
    }

    if (!canToggleAvailable && editor.mode === "edit") {
      const current = products.find((p) => p.id === editor.productId);
      if (current && Boolean(current.isAvailable) !== Boolean(editor.isAvailable)) {
        window.alert("Tu tienda no tiene permiso para cambiar disponibilidad.");
        return;
      }
    }
    const externalId = String(editor.externalId ?? "").trim();
    const name = String(editor.name ?? "").trim();
    const description = String(editor.description ?? "").trim();
    const info = String(editor.info ?? "").trim();
    const image = String(editor.image ?? "").trim();
    const priceCOP = Math.max(0, Math.round(Number(editor.priceCOP || 0)));
    const sortOrder = Math.max(0, Math.round(Number(editor.sortOrder || 100)));

    if (!externalId) {
      window.alert("Debes ingresar el product_id / externalId.");
      return;
    }

    if (!name) {
      window.alert("Debes ingresar el nombre del producto.");
      return;
    }

    if (!Number.isFinite(priceCOP)) {
      window.alert("El precio es inválido.");
      return;
    }

    const payload: StoreProductUpsertInput = {
      externalId,
      name,
      description: description || null,
      info: info || null,
      priceCOP,
      image: image || null,
      isActive: Boolean(editor.isActive),
      isAvailable: Boolean(editor.isAvailable),
      sortOrder,
    };

    const ok =
      editor.mode === "create"
        ? await onCreate(payload)
        : await onUpdate(String(editor.productId), payload);

    if (ok) {
      setEditor(emptyEditor());
    }
  }

  async function handleDelete(productId: string, name: string) {
    const ok = window.confirm(`¿Eliminar producto "${name}"?`);
    if (!ok) return;
    await onDelete(productId);
  }

  async function quickToggleActive(p: StoreProduct) {
    await onUpdate(p.id, { isActive: !p.isActive });
  }

  async function quickToggleAvailable(p: StoreProduct) {
    await onUpdate(p.id, { isAvailable: !p.isAvailable });
  }

  return (
    <div className="ct-panel ct-tab-frame h-full min-h-0 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {err ? (
        <div className="mb-2 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700">
          {err}
        </div>
      ) : null}

      <div className="grid min-h-0 grid-cols-[55%_45%] items-start gap-2">
        {/* COLUMNA IZQUIERDA */}
        <div className="min-w-0">
          <div className="rounded-[18px] border border-white/70 bg-white/70 px-4 py-3">
            <div className="ct-section-title">Productos</div>
            <div className="mt-1 ct-section-desc">
              Administra el catálogo de la tienda: crear, editar, activar, desactivar y cambiar disponibilidad.
            </div>
          </div>

          <div className="mt-2 ct-card flex min-h-[592px] flex-col p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[17px] font-black leading-none text-slate-900">Catálogo actual</div>
                <div className="mt-1 text-[12px] font-medium text-slate-500">
                  Productos registrados para esta tienda.
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onRefresh()}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-[12px] font-extrabold text-slate-700 transition hover:bg-slate-50"
                >
                  Actualizar
                </button>

                {canCreate ? (
  <button
    type="button"
    onClick={openCreate}
    className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-[12px] font-extrabold text-white transition hover:bg-slate-800"
  >
    + Nuevo producto
  </button>
) : null}
              </div>
            </div>

            <div className="mt-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, product_id o info..."
                className="h-11 w-full rounded-[14px] border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {loading ? (
                <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-6 text-[13px] font-semibold text-slate-600">
                  Cargando productos...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-6 text-[13px] font-semibold text-slate-600">
                  No hay productos para mostrar.
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((p) => {
                    const expanded = expandedId === p.id;

                    return (
                      <div
                        key={p.id}
                        className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : p.id)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="truncate text-[15px] font-black text-slate-900">{p.name}</div>

                              <ProductChip active={p.isActive}>
                                {p.isActive ? "Activo" : "Inactivo"}
                              </ProductChip>

                              <ProductChip active={p.isAvailable}>
                                {p.isAvailable ? "Disponible" : "No disponible"}
                              </ProductChip>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-slate-500">
                              <span>product_id: {p.externalId}</span>
                              <span>•</span>
                              <span>{formatCOP(Number(p.priceCOP || 0))}</span>
                              <span>•</span>
                              <span>Orden: {p.sortOrder ?? 100}</span>
                            </div>
                          </div>

                          <div className="shrink-0 pr-1 text-[18px] font-black text-slate-500">
                            {expanded ? "−" : "+"}
                          </div>
                        </button>

                        {expanded ? (
                          <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                            {p.description ? (
                              <div className="text-[13px] font-medium text-slate-700">{p.description}</div>
                            ) : null}

                            {p.info ? (
                              <div className="mt-1 text-[12px] font-medium leading-snug text-slate-500">
                                {p.info}
                              </div>
                            ) : null}

                            {p.image ? (
                              <div className="mt-2 rounded-[12px] bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                                Imagen: {p.image}
                              </div>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
  type="button"
  onClick={() => openEdit(p)}
  disabled={!canEdit}
  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
>
  Editar
</button>

                              <button
  type="button"
  onClick={() => quickToggleActive(p)}
  disabled={!canToggleActive}
  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
>
  {p.isActive ? "Desactivar" : "Activar"}
</button>

                              <button
  type="button"
  onClick={() => quickToggleAvailable(p)}
  disabled={!canToggleAvailable}
  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
>
  {p.isAvailable ? "No disponible" : "Disponible"}
</button>

                              <button
  type="button"
  onClick={() => handleDelete(p.id, p.name)}
  disabled={deletingId === p.id || !canDelete}
  className="inline-flex h-9 items-center justify-center rounded-full bg-rose-600 px-3 text-[12px] font-extrabold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
>
  {deletingId === p.id ? "Eliminando..." : "Eliminar"}
</button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="min-w-0 pt-[14px]">
          <div className="ct-card flex min-h-[600px] flex-col p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[17px] font-black leading-none text-slate-900">
                  {editor.mode === "create" ? "Crear producto" : "Editar producto"}
                </div>
                <div className="mt-1 text-[12px] font-medium text-slate-500">
                  Completa la información básica del producto.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditor(emptyEditor())}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-extrabold text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid gap-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      product_id
                    </div>
                    <input
                      value={editor.externalId}
                      onChange={(e) => setEditor((s) => ({ ...s, externalId: e.target.value }))}
                      placeholder="ej: p-1001"
                      className="mt-2 h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Nombre
                    </div>
                    <input
                      value={editor.name}
                      onChange={(e) => setEditor((s) => ({ ...s, name: e.target.value }))}
                      placeholder="Nombre del producto"
                      className="mt-2 h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    Descripción visible
                  </div>
                  <input
                    value={editor.description}
                    onChange={(e) => setEditor((s) => ({ ...s, description: e.target.value }))}
                    placeholder="Ej: Botella 1L, x6, porción personal..."
                    className="mt-2 h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                    Info ampliada
                  </div>
                  <textarea
                    rows={4}
                    value={editor.info}
                    onChange={(e) => setEditor((s) => ({ ...s, info: e.target.value }))}
                    placeholder="Ej: ingredientes, detalles importantes, especificaciones..."
                    className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-3 py-3 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-[0.9fr_0.6fr_1fr]">
                  <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Precio COP
                    </div>
                    <input
                      type="number"
                      disabled={!canChangePrices}
                      min={0}
                      value={editor.priceCOP}
                      onChange={(e) => setEditor((s) => ({ ...s, priceCOP: e.target.value }))}
                      placeholder="15000"
                      className="mt-2 h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Orden
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={editor.sortOrder}
                      onChange={(e) => setEditor((s) => ({ ...s, sortOrder: e.target.value }))}
                      placeholder="100"
                      className="mt-2 h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Imagen (URL o ruta)
                    </div>
                    <input
                      value={editor.image}
                      disabled={!canUploadImages}
                      onChange={(e) => setEditor((s) => ({ ...s, image: e.target.value }))}
                      placeholder="/images/products/mi-producto.png"
                      className="mt-2 h-10 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                    <span className="text-[13px] font-bold text-slate-800">Activo</span>
                    <input
                      type="checkbox"
                      disabled={!canToggleActive}
                      checked={editor.isActive}
                      onChange={(e) => setEditor((s) => ({ ...s, isActive: e.target.checked }))}
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-[14px] border border-slate-200 bg-white px-3 py-3">
                    <span className="text-[13px] font-bold text-slate-800">Disponible</span>
                    <input
                      type="checkbox"
                      disabled={!canToggleAvailable}
                      checked={editor.isAvailable}
                      onChange={(e) => setEditor((s) => ({ ...s, isAvailable: e.target.checked }))}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-2 border-t border-slate-100 pt-2">
              <button
                type="button"                
                onClick={handleSave}
                disabled={
  saving ||
  (editor.mode === "create" && !canCreate) ||
  (editor.mode === "edit" && !canEdit)
}
                className="inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-emerald-600 px-4 text-[14px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Guardando..." : editor.mode === "create" ? "Crear producto" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}