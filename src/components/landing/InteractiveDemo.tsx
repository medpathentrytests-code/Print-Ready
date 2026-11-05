"use client";
import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Container, SectionLabel } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Dropzone } from "@/components/dashboard/Dropzone";
import { SpecSelector, SpecValue, DEFAULT_SPEC } from "@/components/dashboard/SpecSelector";
import { ResultsDashboard, ResultsData } from "@/components/dashboard/ResultsDashboard";

const SAMPLES = [
  { file: "clean-manuscript-6x9.pdf", label: "Clean manuscript", desc: "A tidy 6×9 novel interior" },
  { file: "flawed-manuscript-sample.pdf", label: "Flawed manuscript", desc: "Blank page, low-res image, margin issue" },
  { file: "inconsistent-page-sizes-sample.pdf", label: "Mixed trim sizes", desc: "One page exported at the wrong size" },
];

export function InteractiveDemo() {
  const [spec, setSpec] = useState<SpecValue>(DEFAULT_SPEC);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultsData | null>(null);

  async function runDemo(selectedFile?: File) {
    const target = selectedFile || file;
    if (!target) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", target);
      form.append("specKey", spec.specKey);
      form.append("bleedIn", String(spec.bleedIn));
      form.append("marginIn", String(spec.marginIn));
      const res = await fetch("/api/demo/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      const r = data.result;
      setResult({
        documentName: data.documentName,
        specLabel: r.spec_label,
        pageCount: r.page_count,
        score: r.score,
        criticalCount: r.critical_count,
        warningCount: r.warning_count,
        infoCount: r.info_count,
        passedChecks: r.passed_checks,
        totalChecks: r.total_checks,
        issues: r.issues,
        bleedIn: r.bleed_in,
        marginIn: r.margin_in,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSample(filename: string) {
    setError(null);
    const res = await fetch(`/api/files/samples/${filename}`);
    const blob = await res.blob();
    const sampleFile = new File([blob], filename, { type: "application/pdf" });
    setFile(sampleFile);
    runDemo(sampleFile);
  }

  return (
    <section id="demo" className="py-20 sm:py-28 bg-[var(--color-surface-alt)]">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel><Sparkles size={12} className="inline -mt-0.5" /> Live interactive demo</SectionLabel>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
            Try a real inspection, right now
          </h2>
          <p className="mt-4 text-[var(--color-muted)] leading-relaxed">
            This runs the actual PrintReady analysis engine — no account required. Upload your own PDF or try one of
            our sample files.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-[340px_1fr] gap-6 items-start">
          <div className="card p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-3">1. Try a sample file</h3>
              <div className="space-y-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.file}
                    onClick={() => loadSample(s.file)}
                    disabled={loading}
                    className="w-full text-left rounded-xl border border-[var(--color-line)] px-3.5 py-2.5 hover:border-[var(--color-brand-violet)] hover:bg-[var(--color-brand-violet-soft)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <div className="text-sm font-semibold text-[var(--color-ink)]">{s.label}</div>
                    <div className="text-xs text-[var(--color-muted)]">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-3">Or upload your own</h3>
              <Dropzone file={file} onFileSelected={setFile} onClear={() => { setFile(null); setResult(null); }} maxSizeMb={15} disabled={loading} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-3">2. Print specification</h3>
              <SpecSelector value={spec} onChange={setSpec} />
            </div>
            <Button onClick={() => runDemo()} disabled={!file || loading} className="w-full" size="lg">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Inspecting…</> : "Run inspection"}
            </Button>
            {error && <p className="text-sm font-medium text-[var(--color-critical)]">{error}</p>}
            <p className="text-[11px] text-[var(--color-muted-soft)] leading-relaxed">
              Demo uploads are capped at 15MB / 40 pages, rate-limited, and never saved. Create a free account for full
              limits, saved history, and downloadable reports.
            </p>
          </div>

          <div className="min-h-[300px]">
            {loading && (
              <div className="card p-16 flex flex-col items-center justify-center gap-3 text-[var(--color-muted)]">
                <Loader2 className="animate-spin text-[var(--color-brand-violet)]" size={28} />
                <p className="text-sm font-medium">Running 10 quality checks…</p>
              </div>
            )}
            {!loading && result && <ResultsDashboard data={result} />}
            {!loading && !result && !error && (
              <div className="card p-16 flex flex-col items-center justify-center gap-2 text-center text-[var(--color-muted)]">
                <Sparkles size={26} className="text-[var(--color-brand-violet)]" />
                <p className="text-sm font-medium">Choose a sample or upload a PDF to see real results here.</p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
