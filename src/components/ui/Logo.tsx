import clsx from "clsx";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pr-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B63F6" />
          <stop offset="1" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#pr-grad)" />
      <rect x="10.5" y="8.5" width="14" height="18" rx="2.2" fill="white" fillOpacity="0.35" />
      <rect x="13.5" y="11.5" width="14" height="18" rx="2.2" fill="white" />
      <rect x="16.3" y="15.2" width="8.4" height="1.6" rx="0.8" fill="#7C5CFF" fillOpacity="0.55" />
      <rect x="16.3" y="18.6" width="8.4" height="1.6" rx="0.8" fill="#7C5CFF" fillOpacity="0.35" />
      <rect x="16.3" y="22" width="5.2" height="1.6" rx="0.8" fill="#7C5CFF" fillOpacity="0.35" />
      <circle cx="27.5" cy="27.5" r="7" fill="#0B1220" />
      <circle cx="27.5" cy="27.5" r="7" fill="url(#pr-grad)" />
      <path d="M24.3 27.6L26.6 29.9L31 25.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 28, className, withWordmark = true }: { size?: number; className?: string; withWordmark?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5 select-none", className)}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-semibold tracking-tight text-[var(--color-ink)]" style={{ fontSize: size * 0.62 }}>
          PrintReady
        </span>
      )}
    </span>
  );
}
