"use client";
import clsx from "clsx";
import { SPEC_OPTIONS, SpecValue } from "@/lib/specOptions";
export { SPEC_OPTIONS, DEFAULT_SPEC } from "@/lib/specOptions";
export type { SpecValue } from "@/lib/specOptions";

export function SpecSelector({ value, onChange }: { value: SpecValue; onChange: (v: SpecValue) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-[var(--color-ink)] mb-2 block">Print specification</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SPEC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange({ ...value, specKey: opt.key })}
              className={clsx(
                "rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer",
                value.specKey === opt.key
                  ? "border-[var(--color-brand-violet)] bg-[var(--color-brand-violet-soft)] ring-1 ring-[var(--color-brand-violet)]"
                  : "border-[var(--color-line)] hover:border-[var(--color-brand-violet)]/50 bg-white"
              )}
            >
              <div className="text-sm font-semibold text-[var(--color-ink)]">{opt.label}</div>
              <div className="text-[11px] text-[var(--color-muted)]">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {value.specKey === "custom" && (
        <div className="grid grid-cols-2 gap-3 animate-fade-up">
          <div>
            <label className="text-xs font-medium text-[var(--color-muted)]">Width (inches)</label>
            <input
              type="number" step="0.01" min="1" max="40"
              value={value.customWidthIn ?? ""}
              onChange={(e) => onChange({ ...value, customWidthIn: e.target.value ? parseFloat(e.target.value) : null })}
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-muted)]">Height (inches)</label>
            <input
              type="number" step="0.01" min="1" max="40"
              value={value.customHeightIn ?? ""}
              onChange={(e) => onChange({ ...value, customHeightIn: e.target.value ? parseFloat(e.target.value) : null })}
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-[var(--color-muted)]">Bleed (inches)</label>
          <input
            type="number" step="0.01" min="0" max="0.5"
            value={value.bleedIn}
            onChange={(e) => onChange({ ...value, bleedIn: parseFloat(e.target.value) || 0 })}
            className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--color-muted)]">Safe margin (inches)</label>
          <input
            type="number" step="0.05" min="0" max="2"
            value={value.marginIn}
            onChange={(e) => onChange({ ...value, marginIn: parseFloat(e.target.value) || 0 })}
            className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]"
          />
        </div>
      </div>
    </div>
  );
}
