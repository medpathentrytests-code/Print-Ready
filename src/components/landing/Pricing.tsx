import { Check } from "lucide-react";
import clsx from "clsx";
import { Container, SectionLabel } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { PLANS } from "@/lib/plans";

export function Pricing() {
  const plans = Object.values(PLANS);
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
            Simple pricing that scales with you
          </h2>
          <p className="mt-4 text-[var(--color-muted)]">Start free. No credit card required. Upgrade any time.</p>
        </div>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={clsx(
                "card p-7 relative flex flex-col",
                plan.highlighted && "border-[var(--color-brand-violet)] ring-2 ring-[var(--color-brand-violet)] shadow-lg"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand px-3 py-1 text-[11px] font-bold text-white">
                  MOST POPULAR
                </span>
              )}
              <h3 className="font-semibold text-[var(--color-ink)]">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[var(--color-ink)]">${plan.priceMonthlyUsd}</span>
                <span className="text-sm text-[var(--color-muted)]">/month</span>
              </div>
              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                    <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-success)]" /> {f}
                  </li>
                ))}
              </ul>
              <LinkButton href="/register" variant={plan.highlighted ? "primary" : "secondary"} className="mt-7 w-full">
                {plan.priceMonthlyUsd === 0 ? "Start free" : "Get started"}
              </LinkButton>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-[var(--color-muted-soft)]">
          Paid plans are pre-configured for launch and are not yet billed — every account currently runs on the Free tier limits shown above.
        </p>
      </Container>
    </section>
  );
}
