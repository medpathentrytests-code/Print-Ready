import { Container, SectionLabel } from "@/components/ui/Container";
import { UploadCloud, SlidersHorizontal, ScanSearch, FileCheck2 } from "lucide-react";

const STEPS = [
  { icon: UploadCloud, title: "Upload your PDF", desc: "Drag and drop your manuscript, cover, or print file. Files are stored securely and removed automatically." },
  { icon: SlidersHorizontal, title: "Choose your print spec", desc: "Pick a standard trim size or enter custom dimensions, bleed, and safe margins." },
  { icon: ScanSearch, title: "Automated inspection", desc: "PrintReady runs 10 structural and visual checks across every page in seconds." },
  { icon: FileCheck2, title: "Review & export", desc: "Get a color-coded dashboard and a downloadable PDF report with fixes for every issue." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[var(--color-surface-alt)]">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
            From upload to print-ready in under a minute
          </h2>
        </div>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="card p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-sm">
                    <s.icon size={20} />
                  </div>
                  <span className="text-xs font-bold text-[var(--color-muted-soft)]">STEP {i + 1}</span>
                </div>
                <h3 className="font-semibold text-[var(--color-ink)]">{s.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--color-muted)] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
