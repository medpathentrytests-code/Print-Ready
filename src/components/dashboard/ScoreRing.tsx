"use client";

export function ScoreRing({ score, size = 128 }: { score: number; size?: number }) {
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const offset = circumference * (1 - progress);

  const color = score >= 85 ? "var(--color-success)" : score >= 60 ? "var(--color-warning)" : "var(--color-critical)";
  const label = score >= 85 ? "Print ready" : score >= 60 ? "Needs attention" : "Not ready";

  return (
    <div className="relative inline-flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--color-line)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold tabular-nums" style={{ fontSize: size * 0.27, color: "var(--color-ink)" }}>
          {score}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
}
