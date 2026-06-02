// src/app/store/components/layout/StoreDashboardHeader.tsx
"use client";

import type { Dispatch, SetStateAction } from "react";
import Image from "next/image";

import { LOCK_STORE_AFTER_LOGIN, TabKey } from "../../lib/storeTypes";
import { useStoreCity } from "../context/StoreCityContext";

type Props = {
  tab: TabKey;
  setTabSafe: (next: TabKey) => void;
  storeName: string;
  storeIcon: string;
  storeImageUrl?: string;
  storeCityLabel: string;
  inputStoreCode: string;
  setInputStoreCode: Dispatch<SetStateAction<string>>;
  applyStoreCode: () => void;
  accessToken: string;
  soundEnabled: boolean;
  toggleSound: () => void | Promise<void>;
  testSound: () => void | Promise<void>;
  notifyEnabled: boolean;
  toggleNotify: () => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onLogout: () => void | Promise<void>;
  soundVolume: number;
  setSoundVolumeState: Dispatch<SetStateAction<number>>;
  storeStateUI: any;
  savingStoreState: boolean;
  saveStoreOperationalState: (nextState: any) => void | Promise<void>;
  userName: string;
  pausedReason: string | null;
  err: string | null;
};

type HeaderTabConfig = {
  key: TabKey;
  label: string;
  image: string;
};

const HEADER_TABS: HeaderTabConfig[] = [
  { key: "ORDERS", label: "Órdenes", image: "/branding/kronix/settings-orders.png" },
  { key: "PRODUCTS", label: "Productos", image: "/branding/kronix/settings-products.png" },
  { key: "EARNINGS", label: "Ganancias", image: "/branding/kronix/settings-earnings.png" },
  { key: "SETTINGS", label: "Config.", image: "/branding/kronix/settings-gear.png" },
  { key: "REGISTER", label: "Registro", image: "/branding/kronix/settings-register.png" },
  { key: "PROFILE", label: "Perfil", image: "/branding/kronix/settings-profile.png" },
];

function HeaderTabBtn({
  active,
  label,
  image,
  onClick,
}: {
  active: boolean;
  label: string;
  image: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={[
        "group relative flex h-[54px] w-[74px] shrink-0 flex-col items-center justify-center rounded-[18px] transition",
        active
          ? "bg-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] ring-1 ring-white/80"
          : "bg-transparent hover:bg-white/10",
      ].join(" ")}
    >
      <span className="relative block h-[34px] w-[34px] transition group-hover:scale-[1.06]">
        <Image
          src={image}
          alt={label}
          fill
          className="object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.35)]"
          sizes="34px"
        />
      </span>

      <span
        className={[
          "mt-0.5 text-[9px] font-black leading-none",
          active ? "text-slate-800" : "text-white/85",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}

function getStoreNameTextClass(storeName: string) {
  const len = String(storeName ?? "").trim().length;

  if (len <= 10) return "text-[18px] leading-[1rem]";
  if (len <= 16) return "text-[16px] leading-[0.98rem]";
  if (len <= 24) return "text-[13px] leading-[0.95rem]";
  if (len <= 32) return "text-[11px] leading-[0.9rem]";

  return "text-[10px] leading-[0.86rem]";
}

export default function StoreDashboardHeader({
  tab,
  setTabSafe,
  storeName,
  storeIcon,
  storeImageUrl = "",
  storeCityLabel,
  inputStoreCode,
  setInputStoreCode,
  applyStoreCode,
  accessToken,
  onLogout,
}: Props) {
  const storeCity = useStoreCity();
  const cityShort = storeCity.cityName || storeCityLabel || "Ciudad";
  const storeNameTextClass = getStoreNameTextClass(storeName);

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#141827_0%,#202436_45%,#262633_100%)] shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
      <div className="px-3 py-1.5">
        <div className="grid grid-cols-[190px_minmax(0,1fr)_270px] items-center gap-2">
          <div className="relative flex min-w-0 items-center">
            <div className="relative h-[54px] w-[168px] shrink-0">
              <Image
                src="/branding/kronix/header-logo.png"
                alt="KroniX"
                fill
                className="object-contain object-left drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
                priority
              />
            </div>

            <div className="pointer-events-none absolute left-[118px] top-[39px] text-[12px] font-bold leading-none text-gray-100">
              {cityShort}
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center">
            <div className="grid w-full max-w-[560px] grid-cols-6 gap-1.5">
              {HEADER_TABS.map((item) => (
                <HeaderTabBtn
                  key={item.key}
                  active={tab === item.key}
                  label={item.label}
                  image={item.image}
                  onClick={() => setTabSafe(item.key)}
                />
              ))}
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <div className="flex h-[48px] min-w-0 flex-1 items-center gap-2 rounded-full bg-slate-50 px-1.5 py-1 ring-1 ring-slate-200">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                {storeImageUrl ? (
                  <Image src={storeImageUrl} alt={storeName} fill className="object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[12px] text-slate-700">
                    {storeIcon}
                  </div>
                )}
              </div>

              <div className="flex h-10 min-w-0 flex-1 items-center pr-2">
                <div
                  className={[
                    "flex min-h-[2rem] w-full items-center overflow-hidden text-left font-extrabold text-slate-800 break-words [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",
                    storeNameTextClass,
                  ].join(" ")}
                  title={storeName}
                >
                  {storeName}
                </div>
              </div>
            </div>

            {!(LOCK_STORE_AFTER_LOGIN && accessToken?.trim()) ? (
              <div className="flex shrink-0 items-center gap-2 rounded-full bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
                <input
                  value={inputStoreCode}
                  onChange={(e) => setInputStoreCode(e.target.value)}
                  className="h-8 w-[96px] rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300"
                  placeholder="storeCode"
                />
                <button
                  onClick={applyStoreCode}
                  className="h-8 rounded-full bg-slate-900 px-3 text-[12px] font-extrabold text-white transition hover:bg-slate-800"
                >
                  Cargar
                </button>
              </div>
            ) : null}

            <button
              onClick={onLogout}
              className="grid h-[48px] w-[48px] shrink-0 place-items-center rounded-full bg-[#202436] text-[26px] font-black text-red-500 ring-1 ring-red-200 transition hover:bg-red-100"
              title="Cerrar sesión"
            >
              ⏻
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}