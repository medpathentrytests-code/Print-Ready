import clsx from "clsx";

type Tone = "critical" | "warning" | "success" | "info" | "neutral" | "violet";

const toneClasses: Record<Tone, string> = {
  critical: "bg-[var(--color-critical-soft)] text-[var(--color-critical)] ring-1 ring-inset ring-red-200",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] ring-1 ring-inset ring-amber-200",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)] ring-1 ring-inset ring-emerald-200",
  info: "bg-[var(--color-info-soft)] text-[var(--color-info)] ring-1 ring-inset ring-blue-200",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  violet: "bg-[var(--color-brand-violet-soft)] text-[var(--color-brand-violet)] ring-1 ring-inset ring-violet-200",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", toneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function severityTone(severity: string): Tone {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  if (severity === "info") return "info";
  return "neutral";
}
