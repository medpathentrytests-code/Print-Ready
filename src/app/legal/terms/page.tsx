import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Container } from "@/components/ui/Container";

export default function TermsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="flex-1 py-16">
        <Container className="max-w-3xl prose-content">
          <h1 className="text-3xl font-bold text-[var(--color-ink)] mb-2">Terms of Service</h1>
          <p className="text-sm text-[var(--color-muted)] mb-8">Template document — replace with counsel-reviewed terms before commercial launch.</p>
          <div className="space-y-5 text-sm text-[var(--color-ink-soft)] leading-relaxed">
            <p>
              PrintReady (&quot;the Service&quot;) provides automated analysis of PDF documents to help identify common
              print-readiness issues. The Service is provided &quot;as is&quot; without warranties of any kind, express or
              implied.
            </p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] pt-2">No guarantee of print acceptance</h2>
            <p>
              PrintReady is an independent tool and is not affiliated with, endorsed by, or certified by Amazon KDP,
              IngramSpark, or any printing platform. Passing PrintReady&apos;s automated checks does not guarantee that a
              document will be accepted by any specific printer, nor does it guarantee print quality. Always review
              your printer&apos;s specific requirements and a physical proof before a full print run.
            </p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] pt-2">Your content</h2>
            <p>
              You retain all rights to documents you upload. Uploaded files are used solely to generate your
              inspection results and are processed and stored in accordance with our Privacy Policy.
            </p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] pt-2">Acceptable use</h2>
            <p>
              You agree not to upload malicious files, attempt to disrupt the Service, or exceed the usage limits of
              your plan through automated means.
            </p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] pt-2">Changes</h2>
            <p>We may update these terms from time to time. Continued use of the Service constitutes acceptance of the updated terms.</p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
