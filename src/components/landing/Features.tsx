import {
  Ruler, Layers, ImageDown, AlignVerticalSpaceAround, Scissors,
  Type, FileX2, Copy, ShieldAlert, Palette,
} from "lucide-react";
import { Container, SectionLabel } from "@/components/ui/Container";

const CHECKS = [
  { icon: Ruler, title: "Page Dimensions", desc: "Flags pages that don't match your selected trim size." },
  { icon: Layers, title: "Page Size Consistency", desc: "Detects mixed trim sizes within a single document." },
  { icon: ImageDown, title: "Image Resolution", desc: "Measures effective DPI for every placed image at print size." },
  { icon: AlignVerticalSpaceAround, title: "Margins & Safe Area", desc: "Warns when text or art sits too close to the trim edge." },
  { icon: Scissors, title: "Bleed & Trim Box", desc: "Verifies bleed is present and meets your configured amount." },
  { icon: Type, title: "Font Embedding", desc: "Checks whether fonts are embedded or may be substituted." },
  { icon: FileX2, title: "Blank Pages", desc: "Finds pages with no text, image, or vector content." },
  { icon: Copy, title: "Duplicate Pages", desc: "Identifies pages that are accidentally repeated." },
  { icon: ShieldAlert, title: "Structure & Integrity", desc: "Detects corruption, encryption, and malformed PDFs." },
  { icon: Palette, title: "Color & Transparency", desc: "Notes RGB images and transparency effects to review." },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>The Quality Inspector</SectionLabel>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
            10 automated checks, run on every upload
          </h2>
          <p className="mt-4 text-[var(--color-muted)] leading-relaxed">
            Every issue found is tied to a page number, a plain-English explanation, and a recommended fix —
            so you know exactly what to change before you print.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CHECKS.map((c) => (
            <div key={c.title} className="card card-hover p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-violet-soft)] text-[var(--color-brand-violet)]">
                <c.icon size={19} strokeWidth={2.1} />
              </div>
              <h3 className="mt-3.5 font-semibold text-sm text-[var(--color-ink)]">{c.title}</h3>
              <p className="mt-1.5 text-xs text-[var(--color-muted)] leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
