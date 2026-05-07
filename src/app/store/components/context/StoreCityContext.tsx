//src\app\store\components\context\StoreCityContext.tsx
"use client";

import { createContext, useContext } from "react";

export type StoreCityContextValue = {
  cityId: string | null;
  citySlug: string;
  cityName: string;
  cityDepartment: string;
  cityCountry: string;
  cityLabel: string;
  hasCity: boolean;
};

const StoreCityContext = createContext<StoreCityContextValue>({
  cityId: null,
  citySlug: "",
  cityName: "",
  cityDepartment: "",
  cityCountry: "",
  cityLabel: "",
  hasCity: false,
});

type Props = {
  value: StoreCityContextValue;
  children: React.ReactNode;
};

export function StoreCityProvider({ value, children }: Props) {
  return <StoreCityContext.Provider value={value}>{children}</StoreCityContext.Provider>;
}

export function useStoreCity() {
  return useContext(StoreCityContext);
}