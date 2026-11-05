import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ShieldCheck, ScanSearch, FileCheck2 } from "lucide-react";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-20 py-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/"><Logo /></Link>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-[var(--color-ink)]">{title}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-brand items-center justify-center p-16">
        <div className="absolute inset-0 bg-grid opacity-[0.15]" />
        <div className="relative max-w-sm text-white">
          <h2 className="text-3xl font-bold leading-tight">Catch costly printing mistakes before you publish.</h2>
          <div className="mt-10 space-y-5">
            {[
              { icon: ScanSearch, text: "10 automated structural & visual print checks" },
              { icon: FileCheck2, text: "Color-coded dashboard with page-by-page detail" },
              { icon: ShieldCheck, text: "Your files are processed securely and cleaned up automatically" },
            ].map((f) => (
              <div key={f.text} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <f.icon size={18} />
                </div>
                <p className="text-sm text-white/90 pt-1.5">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
