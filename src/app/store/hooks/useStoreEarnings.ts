//src\app\store\hooks\useStoreEarnings.ts
"use client";

import { useMemo, useState } from "react";
import { ApiOrder, PLATFORM_COMMISSION_RATE } from "../lib/storeTypes";
import {
  calcItemsSubtotalCOP,
  dayKeyFromIso,
  getMyItems,
  getMyStorePayoutFromSnapshot,
} from "../lib/storeUtils";

type Props = {
  deliveredOrders: ApiOrder[];
  storeCode: string;
};

export function useStoreEarnings({ deliveredOrders, storeCode }: Props) {
  const [earningsScope, setEarningsScope] = useState<"WEEKLY" | "MONTHLY" | "YEARLY">("WEEKLY");

  const earnings = useMemo(() => {
    const rowsMap = new Map<
      string,
      { key: string; orders: number; storePayout: number; salesProducts: number; platformCommission: number }
    >();

    function includeOrder(o: ApiOrder) {
      const dKey = dayKeyFromIso(o.updatedAt || o.createdAt);

      const myItems = getMyItems(o, storeCode);
      const mySubtotal = calcItemsSubtotalCOP(myItems);

      const snapPayout = getMyStorePayoutFromSnapshot(o, storeCode);

      const commission = Math.max(0, Math.round(mySubtotal * PLATFORM_COMMISSION_RATE));
      const payoutFallback = Math.max(0, Math.round(mySubtotal - commission));

      const myPayout = typeof snapPayout === "number" ? snapPayout : payoutFallback;

      const prev = rowsMap.get(dKey);
      if (!prev) {
        rowsMap.set(dKey, {
          key: dKey,
          orders: 1,
          storePayout: myPayout,
          salesProducts: mySubtotal,
          platformCommission: commission,
        });
      } else {
        rowsMap.set(dKey, {
          key: dKey,
          orders: prev.orders + 1,
          storePayout: prev.storePayout + myPayout,
          salesProducts: prev.salesProducts + mySubtotal,
          platformCommission: prev.platformCommission + commission,
        });
      }
    }

    for (const o of deliveredOrders) includeOrder(o);

    const rows = Array.from(rowsMap.values()).sort((a, b) => (a.key < b.key ? 1 : -1));

    const now = Date.now();
    const daysLimit = earningsScope === "WEEKLY" ? 7 : earningsScope === "MONTHLY" ? 30 : 365;

    const filteredRows = rows.filter((r) => {
      const t = Date.parse(r.key + "T00:00:00");
      if (!Number.isFinite(t)) return false;
      const diffDays = (now - t) / (1000 * 60 * 60 * 24);
      return diffDays <= daysLimit;
    });

    const totalOrders = filteredRows.reduce((acc, r) => acc + r.orders, 0);
    const storePayout = filteredRows.reduce((acc, r) => acc + r.storePayout, 0);
    const salesProducts = filteredRows.reduce((acc, r) => acc + r.salesProducts, 0);
    const platformCommission = filteredRows.reduce((acc, r) => acc + r.platformCommission, 0);

    return { rows: filteredRows, totalOrders, storePayout, salesProducts, platformCommission };
  }, [deliveredOrders, storeCode, earningsScope]);

  return {
    earningsScope,
    setEarningsScope,
    earnings,
  };
}