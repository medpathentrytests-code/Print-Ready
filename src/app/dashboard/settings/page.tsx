import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db, isDemoMode } from "@/lib/db";
import { getPlan, isLiveBillingEnabled } from "@/lib/plans";
import { PlanSwitcher } from "@/components/dashboard/PlanSwitcher";
import { BillingPanel } from "@/components/dashboard/BillingPanel";
import { Info } from "lucide-react";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const usage = await db.getUsage(user.id);
  const plan = getPlan(user.plan);
  const liveBilling = isLiveBillingEnabled();

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">Settings & Billing</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">Manage your account and subscription plan.</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-[var(--color-ink)] mb-4">Account</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[var(--color-muted)]">Name</dt>
            <dd className="font-medium text-[var(--color-ink)]">{user.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Email</dt>
            <dd className="font-medium text-[var(--color-ink)]">{user.email}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Member since</dt>
            <dd className="font-medium text-[var(--color-ink)]">{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">This month&apos;s usage</dt>
            <dd className="font-medium text-[var(--color-ink)]">{usage.inspectionsUsed} / {usage.inspectionsLimit ?? "∞"} inspections</dd>
          </div>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-[var(--color-ink)] mb-1">Plan</h2>
        <p className="text-sm text-[var(--color-muted)] mb-5">You&apos;re currently on the <strong>{plan.name}</strong> plan.</p>

        {liveBilling ? (
          <Suspense fallback={null}>
            <BillingPanel
              currentPlan={user.plan}
              planExpiresAt={user.planExpiresAt ?? null}
              billingProvider={user.billingProvider ?? null}
            />
          </Suspense>
        ) : (
          <>
            <PlanSwitcher currentPlan={user.plan} />
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-alt)] p-3.5 text-xs text-[var(--color-muted)]">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                Plan switching here is a demo control with no real payment — it lets you evaluate every tier&apos;s limits.
                Real checkout via Freemius is already built (see <code>docs/BILLING_SETUP.md</code>); it activates
                automatically once FREEMIUS_PRODUCT_ID / FREEMIUS_PUBLIC_KEY / FREEMIUS_API_KEY / FREEMIUS_SECRET_KEY
                are set in the environment.
              </span>
            </div>
          </>
        )}
      </div>

      {isDemoMode && (
        <div className="card p-6 border-amber-200 bg-[var(--color-warning-soft)]">
          <h2 className="font-semibold text-amber-900 mb-1.5">Demo mode</h2>
          <p className="text-sm text-amber-800">
            This instance is running on the local SQLite adapter. Connect a Supabase project (see docs/DEPLOYMENT.md)
            to switch to production-grade Postgres + Auth with zero code changes.
          </p>
        </div>
      )}
    </div>
  );
}
