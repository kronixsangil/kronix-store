// app/store/components/ui/FilterPill.tsx
import React from "react";

export default function FilterPill({
  active,
  children,
  onClick,
  badgeCount,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  badgeCount?: number;
}) {
  const showBadge = Number(badgeCount ?? 0) > 0;
  const badgeText = String(Math.min(99, Math.max(0, Math.round(Number(badgeCount ?? 0)))));

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative inline-flex h-11 min-w-[132px] items-center justify-center rounded-full px-4 text-sm font-extrabold transition",
        active
          ? "bg-white text-slate-900 shadow-[0_8px_20px_rgba(255,255,255,0.18)]"
          : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/14",
      ].join(" ")}
    >
      {children}

      {showBadge ? (
        <span
          className="absolute -right-1.5 -top-1.5 grid min-w-[22px] place-items-center rounded-full bg-red-500 px-1.5 py-1 text-[11px] font-black text-white ring-2 ring-white/80"
          aria-label={`contador ${badgeText}`}
          title={`Total: ${badgeText}`}
        >
          {badgeText}
        </span>
      ) : null}
    </button>
  );
}