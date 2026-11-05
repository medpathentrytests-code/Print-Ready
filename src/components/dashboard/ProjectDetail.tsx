"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Edit2, Trash2, FileText, GitCompareArrows, Loader2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Inspection, Project } from "@/lib/db/types";

export function ProjectDetail({ project, inspections }: { project: Project; inspections: Inspection[] }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleRename() {
    if (!name.trim() || name === project.name) { setRenaming(false); return; }
    setBusy(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setBusy(false);
    setRenaming(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete project "${project.name}"? Inspections will be kept but unassigned.`)) return;
    setBusy(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]));
  }

  const compareA = inspections.find((i) => i.id === selected[0]);
  const compareB = inspections.find((i) => i.id === selected[1]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {renaming ? (
            <>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className="text-2xl font-bold border-b-2 border-[var(--color-brand-violet)] focus:outline-none" />
              <Button size="sm" onClick={handleRename} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : "Save"}</Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[var(--color-ink)]">{project.name}</h1>
              <button onClick={() => setRenaming(true)} className="p-1.5 text-[var(--color-muted)] hover:text-[var(--color-brand-violet)] cursor-pointer"><Edit2 size={15} /></button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/inspect`}><Button variant="secondary" size="sm">Add inspection</Button></Link>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={busy}><Trash2 size={14} /> Delete project</Button>
        </div>
      </div>

      {inspections.length >= 2 && (
        <div className="card p-4 bg-[var(--color-brand-violet-soft)] border-violet-200">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
            <GitCompareArrows size={16} className="text-[var(--color-brand-violet)]" />
            Select two inspections below to compare their results.
          </div>
        </div>
      )}

      {compareA && compareB && (
        <div className="card p-6">
          <h3 className="font-semibold text-sm text-[var(--color-ink)] mb-4">Comparison</h3>
          <div className="grid grid-cols-2 gap-6">
            {[compareA, compareB].map((insp) => (
              <div key={insp.id}>
                <p className="text-xs text-[var(--color-muted)]">{new Date(insp.createdAt).toLocaleString()}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-3xl font-bold text-[var(--color-ink)]">{insp.score}</span>
                  <span className="text-xs text-[var(--color-muted)]">/ 100</span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--color-muted)]">Critical</span><span className="font-semibold text-[var(--color-critical)]">{insp.criticalCount}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-muted)]">Warnings</span><span className="font-semibold text-[var(--color-warning)]">{insp.warningCount}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-muted)]">Passed checks</span><span className="font-semibold text-[var(--color-success)]">{insp.passedChecks}/{insp.totalChecks}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--color-line)] text-sm font-medium">
            {compareB.score > compareA.score ? (
              <span className="text-[var(--color-success)]">Score improved by {compareB.score - compareA.score} points ✓</span>
            ) : compareB.score < compareA.score ? (
              <span className="text-[var(--color-critical)]">Score decreased by {compareA.score - compareB.score} points</span>
            ) : (
              <span className="text-[var(--color-muted)]">No change in score</span>
            )}
          </div>
        </div>
      )}

      {inspections.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText className="mx-auto text-[var(--color-muted-soft)]" size={28} />
          <p className="mt-2 text-sm text-[var(--color-muted)]">No inspections in this project yet.</p>
          <Link href="/dashboard/inspect">
            <Button size="sm" className="mt-4"><ScanSearch size={14} /> Run an inspection</Button>
          </Link>
        </div>
      ) : (
      <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
        {inspections.map((i) => (
          <div key={i.id} className="flex items-center gap-4 p-4 hover:bg-[var(--color-surface-alt)] transition-colors">
            {inspections.length >= 2 && (
              <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggleSelect(i.id)} className="h-4 w-4 accent-[var(--color-brand-violet)]" />
            )}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <FileText size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-ink)]">{i.documentName}</p>
              <p className="text-xs text-[var(--color-muted)]">{i.pageCount} pages · {new Date(i.createdAt).toLocaleString()}</p>
            </div>
            <Badge tone={i.score >= 85 ? "success" : i.score >= 60 ? "warning" : "critical"}>{i.score}/100</Badge>
            <Link href={`/dashboard/inspections/${i.id}`} className="shrink-0"><ArrowRight size={16} className="text-[var(--color-muted-soft)]" /></Link>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
