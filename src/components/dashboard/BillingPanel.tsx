"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, AlertCircle, CheckCircle2, CreditCard, ExternalLink } from "lucide-react";
import clsx from "clsx";
import { PLANS, PlanId } from "@/lib/plans";

type FreemiusConfig = {
  productId: string;
  publicKey: string;
  sandbox: boolean;
  planIds: { pro: string | null; business: string | null };
  plansReady: { pro: boolean; business: boolean };
  userEmail: string;
};

type PortalSubscription = {
  planTitle: string;
  isActive: boolean;
  renewalAmount: number;
  currency: string;
  renewalDate: string | null;
  billingCycle: string | null;
  cancelledAt: string | null;
  cancelRenewalUrl: string;
};

export function BillingPanel({
  currentPlan,
  planExpiresAt,
  billingProvider,
}: {
  currentPlan: PlanId;
  planExpiresAt: string | null;
  billingProvider: "freemius" | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Derived straight from the URL at initial render (not via an effect) so we
  // never need to call setState synchronously inside a useEffect body.
  const [notice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(() => {
    const billing = params.get("billing");
    if (billing === "success") return { type: "success", text: "Payment confirmed — your plan has been upgraded." };
    if (billing === "cancelled") return { type: "info", text: "Checkout was cancelled. No charge was made." };
    return null;
  });
  const [config, setConfig] = useState<FreemiusConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PortalSubscription | null>(null);
  const checkoutRef = useRef<import("@freemius/checkout").Checkout | null>(null);

  // Fetch the public checkout config once on mount, and instantiate the
  // Checkout overlay immediately (rather than lazily on click) so Freemius's
  // Cart Abandonment Recovery emails work correctly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/freemius/config");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setConfigError(data.error || "Live billing is not configured yet.");
          return;
        }
        setConfig(data);
        const { Checkout } = await import("@freemius/checkout");
        if (cancelled) return;
        checkoutRef.current = new Checkout({ product_id: data.productId, public_key: data.publicKey });
      } catch {
        if (!cancelled) setConfigError("Could not load billing configuration.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the current subscription (renewal date / cancel action) from our
  // Customer Portal proxy route, so a paying user can self-serve cancel.
  useEffect(() => {
    if (currentPlan === "free" || billingProvider !== "freemius") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/freemius/portal");
        const data = await res.json();
        if (!cancelled && res.ok) setSubscription(data.subscription ?? null);
      } catch {
        // Non-fatal — the plan grid above still works without this panel.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPlan, billingProvider]);

  async function buyPlan(plan: PlanId) {
    setError(null);
    if (!config || !checkoutRef.current) {
      setError(configError || "Billing isn't ready yet — please try again in a moment.");
      return;
    }
    const planId = plan === "pro" ? config.planIds.pro : config.planIds.business;
    if (!planId) {
      setError(`The ${PLANS[plan].name} plan hasn't been created in Freemius yet.`);
      return;
    }
    setLoading(plan);
    try {
      await checkoutRef.current.open({
        plan_id: planId,
        user_email: config.userEmail,
        readonly_user: true,
        purchaseCompleted: async (data) => {
          const licenseId = data?.purchase?.license_id;
          if (!licenseId) {
            setError("Purchase completed but no license was returned — please contact support.");
            setLoading(null);
            return;
          }
          try {
            const res = await fetch("/api/billing/freemius/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ licenseId, plan }),
            });
            const confirmData = await res.json();
            if (!res.ok) throw new Error(confirmData.error || "Could not confirm the purchase.");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not confirm the purchase.");
          } finally {
            setLoading(null);
          }
        },
        cancel: () => setLoading(null),
      });
    } catch {
      setError("Could not open the checkout. Please try again.");
      setLoading(null);
    }
  }

  async function cancelSubscription() {
    if (!subscription?.cancelRenewalUrl) return;
    if (!confirm("Cancel your subscription renewal? You'll keep access until the current period ends.")) return;
    setLoading("cancel");
    try {
      const res = await fetch(subscription.cancelRenewalUrl, { method: "POST" });
      if (!res.ok) throw new Error("Could not cancel the subscription. Please try again or contact support.");
      router.refresh();
      setSubscription((s) => (s ? { ...s, cancelledAt: new Date().toISOString() } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the subscription.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div
          className={clsx(
            "flex items-start gap-2.5 rounded-xl border p-3.5 text-sm",
            notice.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
            notice.type === "error" && "border-red-200 bg-red-50 text-red-800",
            notice.type === "info" && "border-[var(--color-line)] bg-[var(--color-surface-alt)] text-[var(--color-muted)]"
          )}
        >
          {notice.type === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {currentPlan !== "free" && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-alt)] p-4 text-sm">
          <div>
            <p className="font-medium text-[var(--color-ink)]">Billed via Freemius</p>
            {subscription?.cancelledAt ? (
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Cancelled — access continues {subscription.renewalDate ? `through ${new Date(subscription.renewalDate).toLocaleDateString()}` : "until the current period ends"}.
              </p>
            ) : subscription?.renewalDate ? (
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Renews {new Date(subscription.renewalDate).toLocaleDateString()} ({subscription.currency} {subscription.renewalAmount})
              </p>
            ) : planExpiresAt ? (
              <p className="text-xs text-[var(--color-muted)] mt-0.5">Access valid through {new Date(planExpiresAt).toLocaleDateString()}.</p>
            ) : null}
          </div>
          {subscription?.cancelRenewalUrl && !subscription.cancelledAt && (
            <button
              onClick={cancelSubscription}
              disabled={loading !== null}
              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50 cursor-pointer whitespace-nowrap ml-4"
            >
              {loading === "cancel" ? <Loader2 size={13} className="animate-spin" /> : "Cancel subscription"}
            </button>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {Object.values(PLANS).map((plan) => (
          <div
            key={plan.id}
            className={clsx(
              "card p-5",
              plan.id === currentPlan && "ring-2 ring-[var(--color-brand-violet)] border-[var(--color-brand-violet)]"
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--color-ink)]">{plan.name}</h3>
              {plan.id === currentPlan && (
                <span className="text-[10px] font-bold text-[var(--color-brand-violet)] bg-[var(--color-brand-violet-soft)] rounded-full px-2 py-0.5">CURRENT</span>
              )}
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--color-ink)]">
              ${plan.priceMonthlyUsd}
              <span className="text-xs font-normal text-[var(--color-muted)]">/mo</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-[var(--color-muted)]">
              <li>{plan.inspectionsPerMonth ?? "Unlimited"} inspections / month</li>
              <li>Up to {plan.maxFileSizeMb}MB files</li>
              <li>Up to {plan.maxPagesPerDocument} pages</li>
            </ul>

            {plan.id === "free" ? (
              <div className="mt-4 w-full rounded-lg border border-[var(--color-line)] py-2 text-xs font-semibold text-center text-[var(--color-muted)]">
                {currentPlan === "free" ? <span className="inline-flex items-center gap-1 justify-center w-full"><Check size={13} /> Active</span> : "Default plan"}
              </div>
            ) : plan.id === currentPlan ? (
              <div className="mt-4 w-full rounded-lg border border-[var(--color-brand-violet)] bg-[var(--color-brand-violet-soft)] py-2 text-xs font-semibold text-center text-[var(--color-brand-violet)] inline-flex items-center gap-1 justify-center">
                <Check size={13} /> Active
              </div>
            ) : (
              <button
                onClick={() => buyPlan(plan.id)}
                disabled={loading !== null || !config || (plan.id === "pro" ? !config?.plansReady.pro : !config?.plansReady.business)}
                title={configError || (config && !(plan.id === "pro" ? config.plansReady.pro : config.plansReady.business) ? "This plan hasn't been created in Freemius yet." : undefined)}
                className="mt-4 w-full rounded-lg bg-[var(--color-ink)] text-white py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading === plan.id ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                Upgrade with Freemius
              </button>
            )}
          </div>
        ))}
      </div>

      {billingProvider === "freemius" && currentPlan !== "free" && (
        <p className="text-xs text-[var(--color-muted)] flex items-center gap-1.5">
          <ExternalLink size={12} /> Manage invoices and payment method from the email receipt Freemius sent you.
        </p>
      )}
    </div>
  );
}
