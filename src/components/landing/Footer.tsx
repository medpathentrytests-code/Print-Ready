import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface-alt)]">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Logo />
            <p className="mt-3 text-sm text-[var(--color-muted)] max-w-xs leading-relaxed">
              Automated PDF preflight and quality inspection for self-publishers and print-on-demand creators.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-[var(--color-ink-soft)]">
              <li><a href="#features" className="hover:text-[var(--color-brand-violet)]">Features</a></li>
              <li><a href="#specs" className="hover:text-[var(--color-brand-violet)]">Specifications</a></li>
              <li><a href="#pricing" className="hover:text-[var(--color-brand-violet)]">Pricing</a></li>
              <li><a href="#faq" className="hover:text-[var(--color-brand-violet)]">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-[var(--color-ink-soft)]">
              <li><Link href="/register" className="hover:text-[var(--color-brand-violet)]">Create account</Link></li>
              <li><Link href="/login" className="hover:text-[var(--color-brand-violet)]">Log in</Link></li>
              <li><Link href="/dashboard" className="hover:text-[var(--color-brand-violet)]">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-[var(--color-ink-soft)]">
              <li><Link href="/legal/terms" className="hover:text-[var(--color-brand-violet)]">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-[var(--color-brand-violet)]">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-[var(--color-line)] pt-6">
          <p className="text-xs text-[var(--color-muted-soft)]">© {new Date().getFullYear()} PrintReady. All rights reserved.</p>
          <p className="text-xs text-[var(--color-muted-soft)] max-w-xl">
            PrintReady is an independent quality-assurance tool and is not affiliated with, endorsed by, or certified by
            Amazon KDP, IngramSpark, or any printing platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
