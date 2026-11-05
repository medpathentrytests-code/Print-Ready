"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LinkButton } from "@/components/ui/Button";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#specs", label: "Specifications" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/"><Logo /></Link>
        <nav className="hidden lg:flex items-center gap-7">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-brand-violet)] transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <LinkButton href="/login" variant="ghost" size="sm">Log in</LinkButton>
          <LinkButton href="/register" variant="primary" size="sm">Start free</LinkButton>
        </div>
        <button className="lg:hidden p-2" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-[var(--color-line)] bg-white px-5 py-4 space-y-3 animate-fade-up">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-[var(--color-ink-soft)]">
              {l.label}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <LinkButton href="/login" variant="secondary" size="sm" className="flex-1">Log in</LinkButton>
            <LinkButton href="/register" variant="primary" size="sm" className="flex-1">Start free</LinkButton>
          </div>
        </div>
      )}
    </header>
  );
}
