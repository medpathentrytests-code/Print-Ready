"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { LayoutGrid, ScanSearch, Settings, ShieldCheck, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import type { AppUser } from "@/lib/db/types";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/inspect", label: "New Inspection", icon: ScanSearch },
  { href: "/dashboard/settings", label: "Settings & Billing", icon: Settings },
];

export function Sidebar({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[var(--color-line)] bg-[var(--color-surface-alt)] h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-[var(--color-line)]">
        <Link href="/"><Logo size={26} /></Link>
      </div>
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white shadow-sm text-[var(--color-brand-violet)] ring-1 ring-[var(--color-line)]" : "text-[var(--color-ink-soft)] hover:bg-white/70"
              )}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          );
        })}
        {user.isAdmin && (
          <Link
            href="/dashboard/admin"
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/dashboard/admin" ? "bg-white shadow-sm text-[var(--color-brand-violet)] ring-1 ring-[var(--color-line)]" : "text-[var(--color-ink-soft)] hover:bg-white/70"
            )}
          >
            <ShieldCheck size={17} />
            Admin
          </Link>
        )}
      </nav>
      <div className="p-4 border-t border-[var(--color-line)]">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-white shrink-0">
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--color-ink)]">{user.name || "Your account"}</div>
            <div className="truncate text-xs text-[var(--color-muted)]">{user.email}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-muted)] hover:bg-white/70 cursor-pointer">
          <LogOut size={16} /> Log out
        </button>
      </div>
    </aside>
  );
}
