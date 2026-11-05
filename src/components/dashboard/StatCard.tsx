import clsx from "clsx";
import { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: "neutral" | "critical" | "warning" | "success" | "violet";
}) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-600",
    critical: "bg-[var(--color-critical-soft)] text-[var(--color-critical)]",
    warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
    success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
    violet: "bg-[var(--color-brand-violet-soft)] text-[var(--color-brand-violet)]",
  };
  return (
    <div className="card p-4 flex items-center gap-3.5">
      {Icon && (
        <div className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-tight text-[var(--color-ink)] tabular-nums">{value}</div>
        <div className="text-xs font-medium text-[var(--color-muted)] truncate">{label}</div>
      </div>
    </div>
  );
}
