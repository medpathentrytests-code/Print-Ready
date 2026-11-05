"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanSearch } from "lucide-react";
import { Dropzone } from "./Dropzone";
import { SpecSelector } from "./SpecSelector";
import { DEFAULT_SPEC, SpecValue } from "@/lib/specOptions";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/lib/db/types";

export function InspectFlow({ projects, maxFileSizeMb }: { projects: Project[]; maxFileSizeMb: number }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [spec, setSpec] = useState<SpecValue>(DEFAULT_SPEC);
  const [projectId, setProjectId] = useState<string>("");
  const [stage, setStage] = useState<"idle" | "uploading" | "analyzing">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function uploadWithProgress(file: File): Promise<{ job_id: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append("file", file);
      xhr.open("POST", "/api/inspect/upload");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || "Upload failed."));
        } catch {
          reject(new Error("Upload failed."));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed. Please check your connection."));
      xhr.send(form);
    });
  }

  async function handleRun() {
    if (!file) return;
    setError(null);
    setStage("uploading");
    setProgress(0);
    try {
      const uploadData = await uploadWithProgress(file);

      setStage("analyzing");
      const analyzeRes = await fetch("/api/inspect/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: uploadData.job_id,
          specKey: spec.specKey,
          customWidthIn: spec.customWidthIn,
          customHeightIn: spec.customHeightIn,
          bleedIn: spec.bleedIn,
          marginIn: spec.marginIn,
          documentName: file.name,
          projectId: projectId || null,
        }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Analysis failed.");

      router.push(`/dashboard/inspections/${analyzeData.inspection.id}`);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setStage("idle");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-2">1. Upload your PDF</h3>
        <Dropzone file={file} onFileSelected={setFile} onClear={() => setFile(null)} maxSizeMb={maxFileSizeMb} disabled={stage !== "idle"} />
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-4">2. Print specification</h3>
        <SpecSelector value={spec} onChange={setSpec} />
      </div>

      {projects.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-2">3. Assign to a project (optional)</h3>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]"
          >
            <option value="">No project (unassigned)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm font-medium text-[var(--color-critical)]">{error}</p>}

      {stage === "uploading" && (
        <div className="max-w-xs">
          <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
            <div className="h-full bg-gradient-brand rounded-full transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-[var(--color-muted)]">Uploading… {progress}%</p>
        </div>
      )}

      <Button onClick={handleRun} disabled={!file || stage !== "idle"} size="lg" className="w-full sm:w-auto">
        {stage === "uploading" && <><Loader2 size={16} className="animate-spin" /> Uploading…</>}
        {stage === "analyzing" && <><Loader2 size={16} className="animate-spin" /> Running quality checks…</>}
        {stage === "idle" && <><ScanSearch size={16} /> Run inspection</>}
      </Button>
    </div>
  );
}
