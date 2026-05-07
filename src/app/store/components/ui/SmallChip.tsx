// app/store/components/ui/SmallChip.tsx
import React from "react";

type Props = {
  children: React.ReactNode;
  tone?:
    | "default"
    | "softBlue"
    | "softEmerald"
    | "softAmber"
    | "softSlate"
    | "darkBlue"
    | "darkSlate";
  className?: string;
};

export default function SmallChip({
  children,
  tone = "default",
  className = "",
}: Props) {
  const toneClass =
    tone === "softBlue"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : tone === "softEmerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "softAmber"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : tone === "softSlate"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : tone === "darkBlue"
      ? "bg-white/10 text-white ring-white/12"
      : tone === "darkSlate"
      ? "bg-white/8 text-slate-100 ring-white/10"
      : "bg-white text-slate-600 ring-slate-200";

  return (
    <span
      className={[
        "inline-flex h-8 items-center rounded-full px-3 text-[11px] font-extrabold ring-1",
        toneClass,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}