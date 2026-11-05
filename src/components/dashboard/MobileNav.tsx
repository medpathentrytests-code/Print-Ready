"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, LayoutGrid, ScanSearch, Settings, ShieldCheck, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import type { AppUser } from "@/lib/db/types";

export function MobileNav({ user }: { user: AppUser }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="lg:hidden sticky top-0 z-40 border-b border-[var(--color-line)] bg-white/90 backdrop-blur-md">
      <div className="h-14 flex items-center justify-between px-4">
        <Link href="/dashboard"><Logo size={24} /></Link>
        <button onClick={() => setOpen((v) => !v)} className="p-2" aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-[var(--color-line)] bg-white px-4 py-3 space-y-1">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium"><LayoutGrid size={16} /> Overview</Link>
          <Link href="/dashboard/inspect" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium"><ScanSearch size={16} /> New Inspection</Link>
          <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium"><Settings size={16} /> Settings</Link>
          {user.isAdmin && <Link href="/dashboard/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium"><ShieldCheck size={16} /> Admin</Link>}
          <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-muted)] cursor-pointer"><LogOut size={16} /> Log out</button>
        </div>
      )}
    </div>
  );
}
