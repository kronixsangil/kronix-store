//src\app\store\components\tabs\LunchTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type StoreFetch = <T>(
  path: string,
  init?: RequestInit,
  retry?: boolean,
) => Promise<T>;

type LunchMenuItem = {
  id: string;
  category?: string | null;
  name?: string | null;
  description?: string | null;
  priceCOP?: number | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
};

type LunchMenu = {
  id: string;
  dayOfWeek: string;
  title?: string | null;
  includedText?: string | null;
  isActive?: boolean | null;
  items?: LunchMenuItem[];
};

type LunchConfig = {
  id?: string;
  isActive?: boolean;
  serviceTitle?: string | null;
  serviceSubtitle?: string | null;
  dailyIncludedText?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  menus?: LunchMenu[];
};

const DAYS = [
  { key: "MONDAY", label: "Lunes", short: "Lun" },
  { key: "TUESDAY", label: "Martes", short: "Mar" },
  { key: "WEDNESDAY", label: "Miércoles", short: "Mié" },
  { key: "THURSDAY", label: "Jueves", short: "Jue" },
  { key: "FRIDAY", label: "Viernes", short: "Vie" },
  { key: "SATURDAY", label: "Sábado", short: "Sáb" },
  { key: "SUNDAY", label: "Domingo", short: "Dom" },
  { key: "HOLIDAY", label: "Festivo", short: "Fest" },
];

const CATEGORY_ORDER = [
  "15000",
  "16000",
  "17000",
  "18000",
  "19000",
  "20000",
  "ESPECIALES",
];

function formatCOP(value?: number | null) {
  return `$ ${Number(value ?? 0).toLocaleString("es-CO")}`;
}

function categoryLabel(category: string) {
  if (category.toUpperCase() === "ESPECIALES") return "Especiales";
  const amount = Number(category);
  return Number.isFinite(amount) ? formatCOP(amount) : category;
}

function categoryTone(category: string) {
  if (category.toUpperCase() === "ESPECIALES") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  const tones: Record<string, string> = {
    "15000": "border-blue-200 bg-blue-50 text-blue-700",
    "16000": "border-cyan-200 bg-cyan-50 text-cyan-700",
    "17000": "border-amber-200 bg-amber-50 text-amber-700",
    "18000": "border-orange-200 bg-orange-50 text-orange-700",
    "19000": "border-emerald-200 bg-emerald-50 text-emerald-700",
    "20000": "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  };

  return tones[category] ?? "border-slate-200 bg-slate-50 text-slate-700";
}

function readErrorMessage(error: any) {
  const raw = String(error?.message ?? error ?? "").trim();
  try {
    const parsed = JSON.parse(raw);
    return String(parsed?.message ?? parsed?.error ?? raw);
  } catch {
    return raw || "No fue posible cargar el módulo de almuerzos.";
  }
}

export default function LunchTab({ storeFetch }: { storeFetch: StoreFetch }) {
  const [cfg, setCfg] = useState<LunchConfig | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("FRIDAY");
  const [editingItem, setEditingItem] = useState<LunchMenuItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", category: "15000", priceCOP: 15000, description: "", sortOrder: 100 });
  const [menuBusy, setMenuBusy] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const next = await storeFetch<LunchConfig>("/lunch/store/config");
      setCfg(next);

      const todayKey = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ][new Date().getDay()];

      const todayHasMenu = next.menus?.some(
        (menu) => menu.dayOfWeek === todayKey && (menu.items?.length ?? 0) > 0,
      );

      const firstConfigured = DAYS.find((day) =>
        next.menus?.some(
          (menu) =>
            menu.dayOfWeek === day.key && (menu.items?.length ?? 0) > 0,
        ),
      );

      setSelectedDay(
        todayHasMenu ? todayKey : firstConfigured?.key ?? todayKey,
      );
    } catch (error: any) {
      setErr(readErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!cfg) return;

    setSaving(true);
    setErr("");
    setMsg("");

    try {
      await storeFetch("/lunch/store/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: cfg.isActive,
          serviceTitle: cfg.serviceTitle,
          serviceSubtitle: cfg.serviceSubtitle,
          dailyIncludedText: cfg.dailyIncludedText,
          openTime: cfg.openTime,
          closeTime: cfg.closeTime,
        }),
      });

      setMsg("Configuración guardada correctamente.");
      await load();
    } catch (error: any) {
      setErr(readErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function refreshAfterAction(message: string) {
    setMsg(message);
    await load();
  }

  async function createMenu() {
    setMenuBusy(true); setErr("");
    try {
      await storeFetch("/lunch/store/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayOfWeek: selectedDay, title: `Menú ${DAYS.find(d=>d.key===selectedDay)?.label ?? selectedDay}`, includedText: "", isActive: true }) });
      await refreshAfterAction("Menú creado correctamente.");
    } catch (e:any) { setErr(readErrorMessage(e)); } finally { setMenuBusy(false); }
  }

  async function patchMenu(body: any) {
    if (!selectedMenu) return;
    setMenuBusy(true); setErr("");
    try { await storeFetch(`/lunch/store/menus/${selectedMenu.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) }); await refreshAfterAction("Menú actualizado."); }
    catch(e:any){ setErr(readErrorMessage(e)); } finally { setMenuBusy(false); }
  }

  async function deleteMenu() {
    if (!selectedMenu || !window.confirm(`¿Eliminar completamente el menú de ${selectedDayLabel}? Esta acción también elimina sus platos.`)) return;
    setMenuBusy(true); setErr("");
    try { await storeFetch(`/lunch/store/menus/${selectedMenu.id}`, {method:"DELETE"}); await refreshAfterAction("Menú eliminado."); }
    catch(e:any){ setErr(readErrorMessage(e)); } finally { setMenuBusy(false); }
  }

  function openNewItem() { setEditingItem(null); setEditorOpen(true); setItemForm({name:"",category:"15000",priceCOP:15000,description:"",sortOrder:(selectedMenu?.items?.length??0)*10+10}); }
  function openEditItem(item: LunchMenuItem) { setEditingItem(item); setEditorOpen(true); setItemForm({name:item.name??"",category:String(item.category??"15000"),priceCOP:Number(item.priceCOP??0),description:item.description??"",sortOrder:Number(item.sortOrder??100)}); }
  async function saveItem() {
    if (!selectedMenu || !itemForm.name.trim()) { setErr("Escribe el nombre del plato."); return; }
    setMenuBusy(true); setErr("");
    try {
      const path=editingItem?`/lunch/store/items/${editingItem.id}`:`/lunch/store/menus/${selectedMenu.id}/items`;
      await storeFetch(path,{method:editingItem?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(itemForm)});
      setEditingItem(null); setEditorOpen(false); setItemForm(f=>({...f,name:""})); await refreshAfterAction(editingItem?"Plato actualizado.":"Plato agregado.");
    } catch(e:any){setErr(readErrorMessage(e));} finally{setMenuBusy(false);}
  }
  async function toggleItem(item: LunchMenuItem) {
    try { await storeFetch(`/lunch/store/items/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isActive:item.isActive===false})}); await refreshAfterAction(item.isActive===false?"Plato habilitado.":"Plato pausado por falta de stock."); } catch(e:any){setErr(readErrorMessage(e));}
  }
  async function deleteItem(item: LunchMenuItem) {
    if(!window.confirm(`¿Eliminar “${item.name}” del menú?`)) return;
    try { await storeFetch(`/lunch/store/items/${item.id}`,{method:"DELETE"}); await refreshAfterAction("Plato eliminado."); } catch(e:any){setErr(readErrorMessage(e));}
  }

  const selectedMenu = useMemo(
    () => cfg?.menus?.find((menu) => menu.dayOfWeek === selectedDay) ?? null,
    [cfg?.menus, selectedDay],
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, LunchMenuItem[]>();

    for (const item of selectedMenu?.items ?? []) {
      const key = String(item.category ?? "OTROS").toUpperCase();
      const current = groups.get(key) ?? [];
      current.push(item);
      groups.set(key, current);
    }

    for (const items of groups.values()) {
      items.sort(
        (a, b) =>
          Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
      );
    }

    return [...groups.entries()].sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [selectedMenu]);

  const totalConfigured = useMemo(
    () =>
      cfg?.menus?.reduce(
        (total, menu) => total + (menu.items?.length ?? 0),
        0,
      ) ?? 0,
    [cfg?.menus],
  );

  const configuredDays = useMemo(
    () =>
      DAYS.filter((day) =>
        cfg?.menus?.some(
          (menu) =>
            menu.dayOfWeek === day.key && (menu.items?.length ?? 0) > 0,
        ),
      ).length,
    [cfg?.menus],
  );

  if (loading && !cfg) {
    return (
      <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-lg font-black text-slate-900">
          Cargando módulo Almuerzos…
        </div>
        <div className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-violet-500" />
        </div>
      </div>
    );
  }

  if (!cfg) {
    return (
      <div className="rounded-[22px] border border-red-200 bg-red-50 p-6 font-bold text-red-700">
        {err || "No fue posible cargar Almuerzos."}
      </div>
    );
  }

  const selectedDayLabel =
    DAYS.find((day) => day.key === selectedDay)?.label ?? selectedDay;

  return (
    <div
      className="h-[calc(100dvh-92px)] min-h-0 space-y-3 overflow-y-auto overscroll-contain pb-10 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ msOverflowStyle: "none" }}
    >
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 bg-[linear-gradient(135deg,#141827_0%,#202436_55%,#302252_100%)] px-5 py-5 text-white lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] border border-white/15 bg-white/10 text-3xl shadow-inner">
              🍽️
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[24px] font-black tracking-tight">
                  Almuerzos
                </h2>
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-[11px] font-black",
                    cfg.isActive
                      ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                      : "border-amber-300/40 bg-amber-400/15 text-amber-100",
                  ].join(" ")}
                >
                  {cfg.isActive ? "Servicio activo" : "Servicio pausado"}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-300">
                Control del servicio, horario y menú semanal del restaurante.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                Días configurados
              </div>
              <div className="mt-0.5 text-lg font-black">
                {configuredDays} / 8
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                Platos registrados
              </div>
              <div className="mt-0.5 text-lg font-black">
                {totalConfigured}
              </div>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </section>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {err}
        </div>
      ) : null}

      {msg ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {msg}
        </div>
      ) : null}

      <div className="grid min-h-0 gap-3 min-[800px]:grid-cols-[280px_minmax(0,1fr)] min-[1100px]:grid-cols-[320px_minmax(0,1fr)] min-[1400px]:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-3 min-[800px]:sticky min-[800px]:top-2 min-[800px]:self-start">
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Configuración
                </div>
                <h3 className="mt-1 text-lg font-black text-slate-900">
                  Servicio de almuerzos
                </h3>
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={Boolean(cfg.isActive)}
                  onChange={(event) =>
                    setCfg({ ...cfg, isActive: event.target.checked })
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="text-xs font-black text-slate-700">
                  Activo
                </span>
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Título del servicio
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                  value={cfg.serviceTitle ?? ""}
                  onChange={(event) =>
                    setCfg({ ...cfg, serviceTitle: event.target.value })
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Subtítulo
                </span>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                  value={cfg.serviceSubtitle ?? ""}
                  onChange={(event) =>
                    setCfg({ ...cfg, serviceSubtitle: event.target.value })
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Incluido del día
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                  placeholder="Ej. Sopa de mute • Garbanzo"
                  value={cfg.dailyIncludedText ?? ""}
                  onChange={(event) =>
                    setCfg({ ...cfg, dailyIncludedText: event.target.value })
                  }
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Apertura
                  </span>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                    value={cfg.openTime ?? ""}
                    onChange={(event) =>
                      setCfg({ ...cfg, openTime: event.target.value })
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Cierre
                  </span>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                    value={cfg.closeTime ?? ""}
                    onChange={(event) =>
                      setCfg({ ...cfg, closeTime: event.target.value })
                    }
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Menú semanal
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Selecciona un día para consultar su menú completo.
            </p>

            <div className="mt-3 space-y-2">
              {DAYS.map((day) => {
                const menu = cfg.menus?.find(
                  (entry) => entry.dayOfWeek === day.key,
                );
                const count = menu?.items?.length ?? 0;
                const selected = selectedDay === day.key;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDay(day.key)}
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition",
                      selected
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.15)]"
                        : "border-slate-200 bg-white text-slate-800 hover:border-violet-200 hover:bg-violet-50/50",
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={[
                          "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black",
                          selected
                            ? "bg-white/12 text-white"
                            : count > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-400",
                        ].join(" ")}
                      >
                        {day.short}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black">
                          {day.label}
                        </div>
                        <div
                          className={[
                            "mt-0.5 text-[11px] font-semibold",
                            selected ? "text-slate-300" : "text-slate-500",
                          ].join(" ")}
                        >
                          {count > 0
                            ? `${count} platos configurados`
                            : "Pendiente de configurar"}
                        </div>
                      </div>
                    </div>

                    <span
                      className={[
                        "text-lg font-black",
                        selected ? "text-white" : "text-slate-300",
                      ].join(" ")}
                    >
                      ›
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="min-w-0 rounded-[22px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="sticky top-0 z-10 rounded-t-[22px] border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-600">
                  Menú seleccionado
                </div>
                <h3 className="mt-1 text-[24px] font-black tracking-tight text-slate-950">
                  {selectedMenu?.title || `Menú ${selectedDayLabel}`}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selectedMenu?.includedText ||
                    "Este día todavía no tiene menú configurado desde CTCC."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">{selectedMenu?.items?.length ?? 0} platos</span>
                {!selectedMenu ? <button onClick={createMenu} disabled={menuBusy} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white">+ Cargar menú</button> : <>
                  <button onClick={()=>patchMenu({isActive:selectedMenu.isActive===false})} className={`rounded-xl border px-3 py-2 text-xs font-black ${selectedMenu.isActive===false?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-amber-200 bg-amber-50 text-amber-700"}`}>{selectedMenu.isActive===false?"Habilitar menú":"Pausar menú"}</button>
                  <button onClick={openNewItem} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">+ Agregar plato</button>
                  <button onClick={deleteMenu} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Eliminar menú</button>
                </>}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {!selectedMenu || (selectedMenu.items?.length ?? 0) === 0 ? (
              <div className="grid min-h-[420px] place-items-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-3xl shadow-sm">
                    🍽️
                  </div>
                  <h4 className="mt-4 text-lg font-black text-slate-900">
                    {selectedDayLabel} aún no tiene menú
                  </h4>
                  <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-500">
                    Cuando KroniX configure este día desde CTCC, los platos aparecerán aquí automáticamente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedItems.map(([category, items]) => (
                  <div
                    key={category}
                    className="overflow-hidden rounded-[20px] border border-slate-200 bg-white"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "rounded-full border px-3 py-1 text-xs font-black",
                            categoryTone(category),
                          ].join(" ")}
                        >
                          {categoryLabel(category)}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {items.length} {items.length === 1 ? "plato" : "platos"}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-px bg-slate-100 lg:grid-cols-2">
                      {items.map((item) => (
                        <div key={item.id} className={`flex min-w-0 items-center justify-between gap-4 bg-white px-4 py-3.5 transition hover:bg-slate-50 ${item.isActive===false?"opacity-55":""}`}>
                          <div className="min-w-0"><div className="text-[15px] font-black leading-snug text-slate-900">{item.name || "Plato sin nombre"}</div>{item.description?<div className="mt-1 text-xs font-medium text-slate-500">{item.description}</div>:null}<div className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{item.isActive===false?"Sin stock / inactivo":"Disponible"}</div></div>
                          <div className="flex shrink-0 items-center gap-2"><div className="mr-2 text-[14px] font-black text-slate-950">{formatCOP(item.priceCOP)}</div><button onClick={()=>openEditItem(item)} className="rounded-lg border px-2.5 py-1.5 text-xs font-black text-slate-700">Editar</button><button onClick={()=>toggleItem(item)} className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${item.isActive===false?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{item.isActive===false?"Habilitar":"Pausar"}</button><button onClick={()=>deleteItem(item)} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-black text-rose-700">×</button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedMenu && editorOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(e)=>{if(e.target===e.currentTarget){setEditingItem(null);setEditorOpen(false);setItemForm(f=>({...f,name:""}))}}}>
          <div className="w-full max-w-xl rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between"><div><div className="text-[11px] font-black uppercase tracking-[.16em] text-violet-600">{editingItem?"Editar plato":"Nuevo plato"}</div><h3 className="mt-1 text-xl font-black">{selectedDayLabel}</h3></div><button onClick={()=>{setEditingItem(null);setEditorOpen(false);setItemForm(f=>({...f,name:""}))}} className="rounded-xl bg-slate-100 px-3 py-2 font-black">×</button></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black text-slate-500 sm:col-span-2">NOMBRE<input autoFocus value={itemForm.name} onChange={e=>setItemForm({...itemForm,name:e.target.value})} className="mt-1 w-full rounded-xl border p-3 text-sm text-slate-900"/></label><label className="text-xs font-black text-slate-500">CATEGORÍA<input value={itemForm.category} onChange={e=>setItemForm({...itemForm,category:e.target.value.toUpperCase()})} placeholder="15000 o ESPECIALES" className="mt-1 w-full rounded-xl border p-3 text-sm text-slate-900"/></label><label className="text-xs font-black text-slate-500">PRECIO<input type="number" value={itemForm.priceCOP} onChange={e=>setItemForm({...itemForm,priceCOP:Number(e.target.value)})} className="mt-1 w-full rounded-xl border p-3 text-sm text-slate-900"/></label><label className="text-xs font-black text-slate-500 sm:col-span-2">DESCRIPCIÓN<textarea value={itemForm.description} onChange={e=>setItemForm({...itemForm,description:e.target.value})} className="mt-1 w-full rounded-xl border p-3 text-sm text-slate-900" rows={2}/></label></div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={()=>{setEditingItem(null);setEditorOpen(false);setItemForm(f=>({...f,name:""}))}} className="rounded-xl border px-4 py-2 text-sm font-black">Cancelar</button><button disabled={menuBusy} onClick={saveItem} className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-black text-white">{menuBusy?"Guardando…":"Guardar plato"}</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}