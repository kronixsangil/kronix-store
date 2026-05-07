// app/store/components/ui/Toggle.tsx
import React from "react";

export default function Toggle({
  label,
  desc,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-[14px] border border-slate-200 bg-white/92 px-3 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-extrabold leading-snug text-slate-900">
            {label}
          </div>
          {desc ? (
            <div className="mt-1 text-[11px] font-medium leading-snug text-slate-500">
              {desc}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onChange(!value)}
          className={[
            "relative mt-0.5 inline-flex h-7 w-[48px] shrink-0 items-center rounded-full px-1 transition",
            value ? "bg-emerald-500" : "bg-slate-200",
          ].join(" ")}
          aria-pressed={value}
        >
          <span
            className={[
              "inline-block h-5 w-5 rounded-full bg-white shadow-[0_3px_8px_rgba(15,23,42,0.16)] transition",
              value ? "translate-x-[20px]" : "translate-x-0",
            ].join(" ")}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-[16px] border border-slate-200 bg-white/92 px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
      <div className="min-w-0 pr-2">
        <div className="text-[14px] font-extrabold leading-tight text-slate-900">{label}</div>
        {desc ? (
          <div className="mt-1 text-[12px] font-medium leading-snug text-slate-500">
            {desc}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!value)}
        className={[
          "relative inline-flex h-7 w-[48px] shrink-0 items-center rounded-full px-1 transition",
          value ? "bg-emerald-500" : "bg-slate-200",
        ].join(" ")}
        aria-pressed={value}
      >
        <span
          className={[
            "inline-block h-5 w-5 rounded-full bg-white shadow-[0_3px_8px_rgba(15,23,42,0.16)] transition",
            value ? "translate-x-[20px]" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  );
}