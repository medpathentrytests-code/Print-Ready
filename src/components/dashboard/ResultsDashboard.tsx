"use client";
import { useMemo, useState } from "react";
import { FileWarning, ShieldCheck, AlertTriangle, AlertCircle, Download, FileText, Layers } from "lucide-react";
import { StatCard } from "./StatCard";
import { ScoreRing } from "./ScoreRing";
import { IssueGroupCard } from "./IssueGroupCard";
import { groupIssues } from "@/lib/issueGrouping";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { IssueRecord } from "@/lib/db/types";

export interface ResultsData {
  documentName: string;
  specLabel: string | null;
  pageCount: number;
  score: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passedChecks: number;
  totalChecks: number;
  issues: IssueRecord[];
  thumbnails?: string[];
  thumbnailBaseUrl?: string; // e.g. /api/files/thumbnails/{jobId}/
  bleedIn?: number | null;
  marginIn?: number | null;
}

type FilterTab = "all" | "critical" | "warning" | "info";

export function ResultsDashboard({
  data,
  onDownloadReport,
  blocked,
}: {
  data: ResultsData;
  onDownloadReport?: () => void;
  blocked?: boolean;
}) {
  const [tab, setTab] = useState<FilterTab>("all");
  const grouped = useMemo(() => groupIssues(data.issues), [data.issues]);
  const filtered = tab === "all" ? grouped : grouped.filter((g) => g.severity === tab);

  return (
    <div className="space-y-6">
      {blocked && (
        <div className="card border-red-200 bg-[var(--color-critical-soft)] p-4 flex items-center gap-3">
          <FileWarning className="text-[var(--color-critical)]" size={20} />
          <p className="text-sm font-medium text-red-800">
            This document could not be fully inspected (it may be password-protected or structurally damaged). Resolve the issue below and re-upload.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="card p-6 flex flex-col md:flex-row md:items-center gap-6">
        <ScoreRing score={data.score} size={118} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] mb-1">
            <FileText size={14} /> <span className="truncate max-w-[280px]">{data.documentName}</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--color-ink)]">Inspection Results</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {data.specLabel && <Badge tone="violet"><Layers size={12} /> {data.specLabel}</Badge>}
            <Badge tone="neutral">{data.pageCount} pages</Badge>
            {data.bleedIn != null && <Badge tone="neutral">{data.bleedIn}in bleed</Badge>}
            {data.marginIn != null && <Badge tone="neutral">{data.marginIn}in margin</Badge>}
          </div>
        </div>
        {onDownloadReport && (
          <Button variant="secondary" onClick={onDownloadReport} className="shrink-0">
            <Download size={16} /> Download Report
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Critical Issues" value={data.criticalCount} icon={AlertTriangle} tone={data.criticalCount > 0 ? "critical" : "neutral"} />
        <StatCard label="Warnings" value={data.warningCount} icon={AlertCircle} tone={data.warningCount > 0 ? "warning" : "neutral"} />
        <StatCard label="Checks Passed" value={`${data.passedChecks}/${data.totalChecks}`} icon={ShieldCheck} tone="success" />
        <StatCard label="Pages Inspected" value={data.pageCount} icon={Layers} tone="violet" />
      </div>

      {/* Page previews */}
      {data.thumbnails && data.thumbnails.length > 0 && data.thumbnailBaseUrl && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-[var(--color-ink)] mb-3">Page Previews</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
            {data.thumbnails.map((t, i) =>
              t ? (
                <div key={i} className="shrink-0 w-24 rounded-lg overflow-hidden border border-[var(--color-line)] bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${data.thumbnailBaseUrl}${t}`} alt={`Page ${i + 1}`} className="w-full h-auto" loading="lazy" />
                  <div className="text-center text-[10px] text-[var(--color-muted)] py-1 border-t border-[var(--color-line)]">p.{i + 1}</div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Issues */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-[var(--color-ink)]">Detected Issues</h3>
          <div className="flex gap-1 rounded-lg bg-[var(--color-surface-alt)] p-1">
            {(["all", "critical", "warning", "info"] as FilterTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize cursor-pointer transition-colors ${
                  tab === t ? "bg-white shadow-sm text-[var(--color-ink)]" : "text-[var(--color-muted)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <ShieldCheck className="mx-auto mb-2 text-[var(--color-success)]" size={28} />
            <p className="text-sm font-medium text-[var(--color-ink)]">
              {grouped.length === 0 ? "No issues detected — this document passed every automated check." : "No issues in this category."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((g) => (
              <IssueGroupCard key={g.key} issue={g} defaultOpen={g.severity === "critical"} />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--color-muted-soft)] leading-relaxed pt-2 border-t border-[var(--color-line)]">
        PrintReady&apos;s automated checks help identify common print-readiness problems. They do not guarantee acceptance by
        any specific printer or publishing platform, and PrintReady is not affiliated with or certified by Amazon KDP or
        any print-on-demand service. Always review a physical proof before a full print run.
      </p>
    </div>
  );
}
