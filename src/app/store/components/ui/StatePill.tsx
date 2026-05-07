// app/store/components/ui/StatePill.tsx
import React from "react";

export default function StatePill({
  active,
  children,
  onClick,
  variant,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  variant: "green" | "gray" | "orange" | "blue" | "yellow" | "red";
}) {
  const base =
    "inline-flex h-8 items-center justify-center rounded-full px-4 text-[12px] font-extrabold transition ring-1";

  const on =
    variant === "green"
      ? "bg-emerald-500 text-white ring-emerald-500"
      : variant === "gray"
      ? "bg-slate-900 text-white ring-slate-900"
      : variant === "orange"
      ? "bg-orange-600 text-white ring-orange-600"
      : variant === "blue"
      ? "bg-blue-600 text-white ring-blue-600"
      : variant === "yellow"
      ? "bg-yellow-400 text-slate-900 ring-yellow-400"
      : variant === "red"
      ? "bg-red-600 text-white ring-red-600"
      : "bg-slate-900 text-white ring-slate-900";

  const off = "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50";

  return (
    <button type="button" onClick={onClick} className={[base, active ? on : off].join(" ")}>
      {children}
    </button>
  );
}