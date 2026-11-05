"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import { PLANS, PlanId } from "@/lib/plans";

export function PlanSwitcher({ currentPlan }: { currentPlan: PlanId }) {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanId | null>(null);

  async function switchPlan(plan: PlanId) {
    if (plan === currentPlan) return;
    setLoading(plan);
    await fetch("/api/dev/set-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {Object.values(PLANS).map((plan) => (
        <div key={plan.id} className={clsx("card p-5", plan.id === currentPlan && "ring-2 ring-[var(--color-brand-violet)] border-[var(--color-brand-violet)]")}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--color-ink)]">{plan.name}</h3>
            {plan.id === currentPlan && <span className="text-[10px] font-bold text-[var(--color-brand-violet)] bg-[var(--color-brand-violet-soft)] rounded-full px-2 py-0.5">CURRENT</span>}
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--color-ink)]">${plan.priceMonthlyUsd}<span className="text-xs font-normal text-[var(--color-muted)]">/mo</span></div>
          <ul className="mt-3 space-y-1.5 text-xs text-[var(--color-muted)]">
            <li>{plan.inspectionsPerMonth ?? "Unlimited"} inspections / month</li>
            <li>Up to {plan.maxFileSizeMb}MB files</li>
            <li>Up to {plan.maxPagesPerDocument} pages</li>
          </ul>
          <button
            onClick={() => switchPlan(plan.id)}
            disabled={plan.id === currentPlan || loading !== null}
            className="mt-4 w-full rounded-lg border border-[var(--color-line)] py-2 text-xs font-semibold hover:border-[var(--color-brand-violet)] hover:bg-[var(--color-brand-violet-soft)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading === plan.id ? <Loader2 size={13} className="animate-spin" /> : plan.id === currentPlan ? <><Check size={13} /> Active</> : "Switch (demo)"}
          </button>
        </div>
      ))}
    </div>
  );
}
