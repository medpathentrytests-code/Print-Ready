import { CheckCircle2 } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Container";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(124,92,255,0.12),transparent_60%)]" />
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <SectionLabel>PDF Preflight &amp; Print QA</SectionLabel>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--color-ink)] leading-[1.08]">
            Your PDFs deserve a <span className="text-gradient-brand">perfect first print.</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--color-muted)] leading-relaxed max-w-2xl mx-auto">
            Inspect, analyse and improve your publishing files before sending them to print. Catch costly mistakes —
            wrong trim size, low-resolution images, missing bleed — in seconds.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <LinkButton href="/register" size="lg">Start free — 2 inspections / month</LinkButton>
            <LinkButton href="#demo" variant="secondary" size="lg">Try the live demo</LinkButton>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--color-muted)]">
            {["No credit card required", "10 automated quality checks", "Downloadable PDF report"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[var(--color-success)]" /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
