import { redirect } from "next/navigation";
import { Users, FileStack, AlertOctagon, HardDrive, Activity, Settings2, DollarSign } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { PLANS } from "@/lib/plans";
import { InspectionsChart } from "@/components/dashboard/InspectionsChart";

async function checkPdfServiceHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${process.env.PDF_SERVICE_URL || "http://localhost:8000"}/health`, { cache: "no-store" });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    return { ok: true, detail: "Responding normally" };
  } catch {
    return { ok: false, detail: "Unreachable" };
  }
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) {
    return (
      <div className="card p-10 text-center max-w-md mx-auto mt-12">
        <AlertOctagon className="mx-auto text-[var(--color-critical)]" size={28} />
        <p className="mt-3 font-semibold text-[var(--color-ink)]">Admin access required</p>
        <p className="text-sm text-[var(--color-muted)] mt-1">Your account doesn&apos;t have administrator privileges.</p>
      </div>
    );
  }

  const [stats, users, health] = await Promise.all([db.getAdminStats(), db.listAllUsers(), checkPdfServiceHealth()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">Admin Dashboard</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">System overview — visible to administrators only.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Registered users" value={stats.totalUsers} icon={Users} tone="violet" />
        <StatCard label="Total inspections" value={stats.totalInspections} icon={FileStack} tone="neutral" />
        <StatCard label="Processing failures" value={stats.processingFailures} icon={AlertOctagon} tone={stats.processingFailures > 0 ? "critical" : "success"} />
        <StatCard label="Storage used" value={`${stats.storageUsedMb} MB`} icon={HardDrive} tone="neutral" />
        <StatCard label="Revenue (lifetime)" value={`$${stats.totalRevenueUsd.toLocaleString()}`} icon={DollarSign} tone="success" />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-[var(--color-ink)] mb-1">Inspections — last 14 days</h2>
        <p className="text-xs text-[var(--color-muted)] mb-2">Daily inspection volume across all accounts.</p>
        <InspectionsChart data={stats.dailyInspections} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold text-[var(--color-ink)] mb-4 flex items-center gap-2"><Activity size={16} /> System Health</h2>
          <div className="flex items-center justify-between py-2 border-b border-[var(--color-line)]">
            <span className="text-sm text-[var(--color-muted)]">PDF processing service</span>
            <Badge tone={health.ok ? "success" : "critical"}>{health.ok ? "Operational" : "Down"}</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--color-line)]">
            <span className="text-sm text-[var(--color-muted)]">Data layer</span>
            <Badge tone="success">{process.env.NEXT_PUBLIC_SUPABASE_URL ? "Supabase (production)" : "Local SQLite (demo)"}</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-[var(--color-muted)]">Inspections (last 30 days)</span>
            <span className="text-sm font-semibold text-[var(--color-ink)]">{stats.inspectionsLast30Days}</span>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-[var(--color-ink)] mb-4 flex items-center gap-2"><Settings2 size={16} /> Subscription Configuration</h2>
          <div className="space-y-3">
            {Object.values(PLANS).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--color-ink)]">{p.name}</span>
                <span className="text-[var(--color-muted)]">${p.priceMonthlyUsd}/mo · {p.inspectionsPerMonth ?? "∞"} inspections · {stats.planBreakdown[p.id] || 0} users</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold text-[var(--color-ink)] mb-4">Recent Users</h2>
          <div className="space-y-2">
            {users.slice(0, 10).map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--color-line-soft)] last:border-0">
                <span className="truncate text-[var(--color-ink)]">{u.email}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone="neutral">{u.plan}</Badge>
                  {u.isAdmin && <Badge tone="violet">admin</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-[var(--color-ink)] mb-4">Recent Inspections</h2>
          <div className="space-y-2">
            {stats.recentInspections.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--color-line-soft)] last:border-0">
                <span className="truncate text-[var(--color-ink)]">{r.documentName}</span>
                <Badge tone={r.score >= 85 ? "success" : r.score >= 60 ? "warning" : "critical"}>{r.score}</Badge>
              </div>
            ))}
            {stats.recentInspections.length === 0 && <p className="text-sm text-[var(--color-muted)]">No inspections yet.</p>}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-[var(--color-ink)] mb-1 flex items-center gap-2"><DollarSign size={16} /> Recent Payments</h2>
        <p className="text-xs text-[var(--color-muted)] mb-4">Real, completed charges only — nothing on this page is simulated.</p>
        <div className="space-y-2">
          {stats.recentPayments.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--color-line-soft)] last:border-0">
              <span className="truncate text-[var(--color-ink)]">{p.email}</span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone="neutral">{p.provider}</Badge>
                <Badge tone="violet">{p.plan}</Badge>
                <span className="text-[var(--color-muted)] text-xs">{p.currency === "USD" ? "$" : "Rs "}{p.amount.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {stats.recentPayments.length === 0 && <p className="text-sm text-[var(--color-muted)]">No payments recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
