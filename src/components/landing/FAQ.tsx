"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Container, SectionLabel } from "@/components/ui/Container";

const FAQS = [
  {
    q: "Does PrintReady guarantee my file will be accepted by Amazon KDP or another printer?",
    a: "No. PrintReady is an independent quality-assurance tool that checks for common, well-documented print-readiness problems — wrong dimensions, low-resolution images, missing bleed, and more. It is not affiliated with, endorsed by, or certified by Amazon KDP, IngramSpark, or any other printing platform, and passing our checks does not guarantee acceptance. Always review your printer's specific requirements and a physical proof before a full print run.",
  },
  {
    q: "What file types can I upload?",
    a: "PrintReady currently inspects PDF files, which is the standard format accepted by virtually all print-on-demand and offset printers.",
  },
  {
    q: "How is image resolution actually measured?",
    a: "For every image placed in your PDF, we read its true pixel dimensions and the exact size it's displayed at on the page, then calculate the effective DPI (dots per inch) at that print size — the same math a printer uses to judge sharpness.",
  },
  {
    q: "Is my file stored permanently?",
    a: "Uploaded files are stored temporarily to generate your report and page previews, then automatically cleaned up. You control your inspection history and can delete any project or report at any time.",
  },
  {
    q: "What happens when I reach my monthly inspection limit?",
    a: "Free accounts include 2 inspections per month. Once you reach your limit, you can upgrade to Pro or Business for more inspections, larger files, and longer project history — no action is required mid-inspection.",
  },
  {
    q: "Can I re-inspect a file after fixing issues?",
    a: "Yes. Upload the corrected file to the same project and PrintReady will run a fresh inspection you can compare against your previous report.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section id="faq" className="py-20 sm:py-28 bg-[var(--color-surface-alt)]">
      <Container className="max-w-3xl">
        <div className="text-center">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-ink)]">Frequently asked questions</h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="card overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left cursor-pointer"
              >
                <span className="font-semibold text-sm text-[var(--color-ink)]">{f.q}</span>
                <ChevronDown size={18} className={clsx("shrink-0 text-[var(--color-muted)] transition-transform", openIndex === i && "rotate-180")} />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 -mt-1 text-sm text-[var(--color-muted)] leading-relaxed animate-fade-up">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
