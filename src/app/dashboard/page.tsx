import Link from "next/link";
import { ScanSearch, FolderOpen, ArrowRight, FileText, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NewProjectButton } from "@/components/dashboard/NewProjectButton";

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [usage, projects, inspections] = await Promise.all([
    db.getUsage(user.id),
    db.listProjects(user.id),
    db.listInspections(user.id),
  ]);
  const plan = getPlan(user.plan);
  const recent = inspections.slice(0, 6);
  const pct = usage.inspectionsLimit ? Math.min(100, Math.round((usage.inspectionsUsed / usage.inspectionsLimit) * 100)) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Here&apos;s what&apos;s happening with your print projects.</p>
        </div>
        <LinkButton href="/dashboard/inspect" size="md"><ScanSearch size={16} /> New Inspection</LinkButton>
      </div>

      {/* Usage card */}
      <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge tone="violet">{plan.name} plan</Badge>
            <span className="text-xs text-[var(--color-muted)]">Resets monthly</span>
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
            {usage.inspectionsUsed} of {usage.inspectionsLimit ?? "∞"} inspections used this month
          </p>
          {usage.inspectionsLimit != null && (
            <div className="mt-2 h-2 w-full max-w-sm rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
              <div className="h-full bg-gradient-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        {plan.id === "free" && (
          <LinkButton href="/dashboard/settings" variant="secondary" size="sm"><Sparkles size={14} /> Upgrade plan</LinkButton>
        )}
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--color-ink)]">Projects</h2>
          <NewProjectButton />
        </div>
        {projects.length === 0 ? (
          <div className="card p-10 text-center">
            <FolderOpen className="mx-auto text-[var(--color-muted-soft)]" size={28} />
            <p className="mt-2 text-sm text-[var(--color-muted)]">No projects yet. Create one to organize your inspection history.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="card card-hover p-5 block">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-violet-soft)] text-[var(--color-brand-violet)]">
                    <FolderOpen size={17} />
                  </div>
                  {p.latestScore != null && (
                    <Badge tone={p.latestScore >= 85 ? "success" : p.latestScore >= 60 ? "warning" : "critical"}>{p.latestScore}/100</Badge>
                  )}
                </div>
                <h3 className="mt-3 font-semibold text-sm text-[var(--color-ink)] truncate">{p.name}</h3>
                <p className="text-xs text-[var(--color-muted)] mt-1">{p.inspectionCount ?? 0} inspection{(p.inspectionCount ?? 0) !== 1 ? "s" : ""}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent inspections */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[var(--color-ink)]">Recent Inspections</h2>
          {inspections.length > 6 && <span className="text-xs text-[var(--color-muted)]">{inspections.length} total</span>}
        </div>
        {recent.length === 0 ? (
          <div className="card p-10 text-center">
            <FileText className="mx-auto text-[var(--color-muted-soft)]" size={28} />
            <p className="mt-2 text-sm text-[var(--color-muted)]">No inspections yet. Upload your first PDF to get started.</p>
            <LinkButton href="/dashboard/inspect" size="sm" className="mt-4"><ScanSearch size={14} /> Run an inspection</LinkButton>
          </div>
        ) : (
          <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
            {recent.map((i) => (
              <Link key={i.id} href={`/dashboard/inspections/${i.id}`} className="flex items-center gap-4 p-4 hover:bg-[var(--color-surface-alt)] transition-colors">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <FileText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">{i.documentName}</p>
                  <p className="text-xs text-[var(--color-muted)]">{i.pageCount} pages · {new Date(i.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge tone={i.score >= 85 ? "success" : i.score >= 60 ? "warning" : "critical"}>{i.score}/100</Badge>
                <ArrowRight size={16} className="text-[var(--color-muted-soft)] shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
