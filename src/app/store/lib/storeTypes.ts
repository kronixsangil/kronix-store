// app/store/lib/storeTypes.ts
export type ApiOrderStatus = "AVAILABLE" | "ASSIGNED" | "EN_ROUTE" | "DELIVERED" | "CANCELLED";

export type ApiOrderFlowStatus =
  | "WAITING_CONFIRMATION"
  | "STORE_CONFIRMED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "PREPARING"
  | "EN_ROUTE"
  | "DELIVERED"
  | "CANCELLED"
  | "PAYMENT_FAILED";

export type ApiFinancialSnapshot = {
  itemsSubtotalCOP?: number | null;
  platformCommissionCOP?: number | null;
  storePayoutCOP?: number | null;

  stores?: Array<{
    storeId?: string | null;
    storeCode?: string | null;
    itemsSubtotalCOP?: number | null;
    platformCommissionCOP?: number | null;
    storePayoutCOP?: number | null;
  }> | null;
};

export type ApiOrder = {
  id: string;
  status: ApiOrderStatus;
  flowStatus?: ApiOrderFlowStatus | string | null;
  paymentStatus?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  dropoffAddress: string;
  customerNote?: string | null;
  totalCOP?: number | null;
  deliveryFeeCOP?: number | null;
  tipCOP?: number | null;
  financialSnapshot?: ApiFinancialSnapshot | null;

  driver?: {
    id?: string | null;
    name?: string | null;
    phone?: string | null;
    vehicle?: {
      brand?: string | null;
      plate?: string | null;
      color?: string | null;
    } | null;
  } | null;

  pickups?: Array<{
    sequence: number;
    pickupAddress: string;
    storeConfirmedAt?: string | null;
    storeRejectedAt?: string | null;
    rejectReason?: string | null;
    store?: { id?: string; storeCode?: string; name: string } | null;
  }>;

  items?: Array<{
    storeId?: string | null;
    productId?: string | null;
    name: string;
    description?: string | null;
    qty: number;
    priceCOP: number;
  }>;
};

export type StoreAutoDecisionMode = "AUTO_REJECT" | "AUTO_CONFIRM";

export type StoreAffiliateStatus =
  | "PENDING_VISIT"
  | "VISITED"
  | "DOCUMENTS_PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type StoreMe = {
  id: string;
  cityId?: string | null;
  storeCode: string;
  name: string;

  legalName?: string | null;
  nit?: string | null;
  businessEmail?: string | null;
  category?: string | null;
  description?: string | null;
  cel1?: string | null;
  cel2?: string | null;
  address?: string | null;
  addressReference?: string | null;

  lat?: number | null;
  lng?: number | null;
  mainEntranceLat?: number | null;
  mainEntranceLng?: number | null;
  pickupLat?: number | null;
  pickupLng?: number | null;

  hrOp?: string | null;
  hrCl?: string | null;

  image?: string | null;
  image2?: string | null;
  image3?: string | null;
  image4?: string | null;
  coverImage?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;

  onboardingStep?: number | null;
  onboardingCompleted?: boolean | null;

  ownerName?: string | null;
  ownerDocument?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  storeType?: string | null;
  affiliateStatus?: StoreAffiliateStatus | string | null;
  visitedAt?: string | null;
  visitedBy?: string | null;
  physicalDocumentsReceived?: boolean | null;
  documentsReviewed?: boolean | null;
  documentsApproved?: boolean | null;
  contractSigned?: boolean | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  approvalNotes?: string | null;
  onboardingNotes?: string | null;
  rejectedReason?: string | null;

  isActive: boolean;
  isPaused: boolean;
  pausedReason?: string | null;

  autoDecisionMode: StoreAutoDecisionMode;
  autoDecisionMinutes: number;

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

  city?: {
    id: string;
    slug: string;
    name: string;
    department: string;
    country: string;
  } | null;

  users?: Array<{
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  }> | null;
};

export type StoreProduct = {
  id: string;
  storeId: string;
  externalId: string;
  name: string;
  description?: string | null;
  info?: string | null;
  priceCOP: number;
  image?: string | null;
  isActive: boolean;
  isAvailable: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export type StoreProductUpsertInput = {
  externalId: string;
  name: string;
  description?: string | null;
  info?: string | null;
  priceCOP: number;
  image?: string | null;
  isActive?: boolean;
  isAvailable?: boolean;
  sortOrder?: number;
};

export type TabKey = "ORDERS" | "PRODUCTS" | "EARNINGS" | "SETTINGS" | "REGISTER" | "PROFILE";
export type StoreStateUI = "ACTIVE" | "PAUSED" | "INACTIVE";

export const PLATFORM_COMMISSION_RATE = 0.08;

export type PrintPaperSize = "80MM" | "58MM";
export type PrintPrefs = {
  paper: PrintPaperSize;
  showLogo: boolean;
  showDropoff: boolean;
  showCustomerNote: boolean;
  showPrices: boolean;
  showPayment: boolean;
  autoPrintOnConfirm: boolean;
};

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

export const STORE_CODE_KEY = "store_active_storeCode_v1";
export const STORE_TAB_KEY = "store_active_tab_v1";
export const STORE_TOKEN_KEY = "ct_store_access_token_v1";

export const LOCK_STORE_AFTER_LOGIN = true;