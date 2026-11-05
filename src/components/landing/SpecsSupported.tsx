import { Container, SectionLabel } from "@/components/ui/Container";
import { SPEC_OPTIONS } from "@/lib/specOptions";

export function SpecsSupported() {
  return (
    <section id="specs" className="py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Supported specifications</SectionLabel>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
            Built around the trim sizes self-publishers actually use
          </h2>
          <p className="mt-4 text-[var(--color-muted)] leading-relaxed">
            Choose a standard size or enter fully custom dimensions, bleed, and margins.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {SPEC_OPTIONS.map((s) => (
            <div key={s.key} className="card p-4 text-center">
              <div className="font-bold text-[var(--color-ink)]">{s.label}</div>
              <div className="text-xs text-[var(--color-muted)] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-[var(--color-muted-soft)] max-w-lg mx-auto">
          PrintReady checks your file against the dimensions you select. It does not certify or guarantee acceptance by
          Amazon KDP, IngramSpark, or any other specific printing platform.
        </p>
      </Container>
    </section>
  );
}
