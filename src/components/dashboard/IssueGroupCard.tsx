"use client";
import { useState } from "react";
import { ChevronDown, AlertTriangle, AlertCircle, Info, Wrench } from "lucide-react";
import clsx from "clsx";
import { GroupedIssue, formatPageList } from "@/lib/issueGrouping";

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: "var(--color-critical)", bg: "var(--color-critical-soft)", label: "Critical" },
  warning: { icon: AlertCircle, color: "var(--color-warning)", bg: "var(--color-warning-soft)", label: "Warning" },
  info: { icon: Info, color: "var(--color-info)", bg: "var(--color-info-soft)", label: "Info" },
};

export function IssueGroupCard({ issue, defaultOpen = false }: { issue: GroupedIssue; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = SEVERITY_CONFIG[issue.severity];
  const Icon = cfg.icon;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3.5 p-4 text-left cursor-pointer"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: cfg.bg, color: cfg.color }}>
          <Icon size={17} strokeWidth={2.3} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[var(--color-ink)]">{issue.title}</span>
            {issue.count > 1 && (
              <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: cfg.bg, color: cfg.color }}>
                {issue.count}×
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--color-muted)] mt-0.5 flex items-center gap-2">
            <span>{issue.categoryLabel}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-line)]" />
            <span>{formatPageList(issue.pages)}</span>
          </div>
        </div>
        <ChevronDown size={17} className={clsx("shrink-0 text-[var(--color-muted)] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4 pl-[3.6rem] -mt-1 space-y-2.5 animate-fade-up">
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">{issue.explanation}</p>
          <div className="flex gap-2 rounded-lg bg-[var(--color-success-soft)] p-2.5 text-sm text-emerald-800">
            <Wrench size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <span className="leading-relaxed">{issue.recommendation}</span>
          </div>
        </div>
      )}
    </div>
  );
}
