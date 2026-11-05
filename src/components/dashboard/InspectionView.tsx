"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, FolderInput, RefreshCw, Loader2 } from "lucide-react";
import { ResultsDashboard, ResultsData } from "./ResultsDashboard";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/lib/db/types";

export function InspectionView({
  inspectionId,
  data,
  projects,
  currentProjectId,
  blocked,
}: {
  inspectionId: string;
  data: ResultsData;
  projects: Project[];
  currentProjectId: string | null;
  blocked: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  function downloadReport() {
    window.open(`/api/inspections/${inspectionId}/report`, "_blank");
  }

  async function handleDelete() {
    if (!confirm("Delete this inspection? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/inspections/${inspectionId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  async function handleReassign(newProjectId: string) {
    setReassigning(true);
    await fetch(`/api/inspections/${inspectionId}/reassign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: newProjectId || null }),
    });
    router.refresh();
    setReassigning(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderInput size={15} className="text-[var(--color-muted)]" />
          <select
            value={currentProjectId || ""}
            onChange={(e) => handleReassign(e.target.value)}
            disabled={reassigning}
            className="rounded-lg border border-[var(--color-line)] px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard/inspect")}>
            <RefreshCw size={14} /> Re-inspect
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
          </Button>
        </div>
      </div>
      <ResultsDashboard data={data} onDownloadReport={downloadReport} blocked={blocked} />
    </div>
  );
}
