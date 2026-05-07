//src\app\store\lib\constants.ts
import type { PrintPrefs } from "./storeTypes";

export const API_BASE = process.env.NEXT_PUBLIC_API || "http://localhost:3004";

export const STORE_CODE_KEY = "store_active_storeCode_v1";
export const STORE_TAB_KEY = "store_active_tab_v1";

// ✅ Bloquear cambio manual de tienda una vez autenticado
export const LOCK_STORE_AFTER_LOGIN = true;

// ✅ NUEVO: token store
export const STORE_TOKEN_KEY = "ct_store_access_token_v1";

// ✅ Reglas económicas (Store Ganancias)
// Comisión plataforma: 8% SOLO sobre productos (itemsSubtotal)
export const PLATFORM_COMMISSION_RATE = 0.08;

// ✅ prefs impresión
export const PRINT_PREFS_KEY = "store_print_prefs_v1";

export const DEFAULT_PRINT_PREFS: PrintPrefs = {
  paper: "80MM",
  showLogo: true,
  showDropoff: true,
  showCustomerNote: true,
  showPrices: true,
  showPayment: true,
  autoPrintOnConfirm: false,
};

export const REJECT_REASONS: Array<{ value: string; label: string }> = [
  { value: "Inactiva temporalmente", label: "⏳ Tienda inactiva temporalmente (timeout)" },
  { value: "Producto agotado", label: "📦 Sin inventario / producto agotado" },
  { value: "Error en precios", label: "💲 Error en precios / catálogo desactualizado" },
  { value: "Alta Demanda", label: "🔥 No podemos preparar a tiempo (alta demanda)" },
  { value: "Cocina cerrada / fuera de horario", label: "🕒 Cocina cerrada / fuera de horario" },
  { value: "Falla operativa interna", label: "⚠️ Falla operativa interna (personal/energía)" },
  { value: "Problema con el pedido", label: "🧾 Problema con el pedido (items inválidos)" },
  { value: "No cubrimos esa zona", label: "📍 No cubrimos esa zona / dirección no atendida" },
  { value: "Condiciones no disponibles", label: "💳 No aceptamos condiciones en este momento" },
  { value: "Pedido duplicado / sospecha de fraude", label: "🕵️ Pedido duplicado / sospecha de fraude" },
  { value: "Otro", label: "🔧 Otro" },
];