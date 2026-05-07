// app/store/components/ui/TabBtn.tsx
import React from "react";

export default function TabBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-extrabold transition",
        active
          ? "bg-white text-slate-900 shadow-[0_8px_20px_rgba(255,255,255,0.14)]"
          : "bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/14",
      ].join(" ")}
    >
      {children}
    </button>
  );
}