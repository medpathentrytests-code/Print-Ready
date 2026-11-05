import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Container } from "@/components/ui/Container";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="flex-1 py-16">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-bold text-[var(--color-ink)] mb-2">Privacy Policy</h1>
          <p className="text-sm text-[var(--color-muted)] mb-8">Template document — replace with counsel-reviewed policy before commercial launch.</p>
          <div className="space-y-5 text-sm text-[var(--color-ink-soft)] leading-relaxed">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">What we collect</h2>
            <p>
              We collect the information you provide when creating an account (name, email) and the PDF files you
              upload for inspection, along with the analysis results and project metadata you choose to save.
            </p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] pt-2">How we use your files</h2>
            <p>
              Uploaded PDFs are processed to generate inspection results, page previews, and downloadable reports.
              Temporary processing files are automatically cleaned up; saved inspection history (score, detected
              issues, thumbnails) remains in your account until you delete it.
            </p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] pt-2">Data storage</h2>
            <p>
              Account and inspection data is stored using Supabase (Postgres) infrastructure in production
              deployments. See our Architecture documentation for details on data handling and security controls.
            </p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] pt-2">Your rights</h2>
            <p>You may delete any project, inspection, or your account at any time from your dashboard.</p>
            <h2 className="text-lg font-semibold text-[var(--color-ink)] pt-2">Contact</h2>
            <p>For privacy questions, contact the site operator listed in your account settings.</p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
