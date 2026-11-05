import { NextRequest, NextResponse } from "next/server";
import { uploadToPdfService, analyzeWithPdfService, deletePdfServiceJob, PdfServiceError } from "@/lib/pdf/service";
import { rateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";

// Public, unauthenticated endpoint powering the landing-page interactive
// demo. Real analysis (no fabricated results), but intentionally
// constrained: strict rate limiting, small file-size cap, nothing persisted
// to the database, and the temp file is deleted immediately after analysis.
const DEMO_MAX_BYTES = 15 * 1024 * 1024;
const DEMO_MAX_PAGES = 40;

export async function POST(req: NextRequest) {
  const key = clientKeyFromHeaders(req.headers, "demo-analyze");
  if (!rateLimit(key, 8, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Demo limit reached. Please try again in a few minutes, or create a free account for full access." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  const specKey = (form?.get("specKey") as string) || "6x9";
  const bleedIn = parseFloat((form?.get("bleedIn") as string) || "0.125");
  const marginIn = parseFloat((form?.get("marginIn") as string) || "0.5");

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > DEMO_MAX_BYTES) {
    return NextResponse.json({ error: "Demo uploads are limited to 15MB. Create a free account for larger files." }, { status: 413 });
  }

  let jobId: string | null = null;
  try {
    const upload = await uploadToPdfService(file, file.name);
    jobId = upload.job_id;
    const result = await analyzeWithPdfService({
      job_id: jobId,
      spec_key: specKey,
      bleed_in: isNaN(bleedIn) ? 0.125 : bleedIn,
      margin_in: isNaN(marginIn) ? 0.5 : marginIn,
    });

    if (result.page_count > DEMO_MAX_PAGES) {
      return NextResponse.json({ error: `Demo mode supports documents up to ${DEMO_MAX_PAGES} pages. Create a free account to inspect larger files.` }, { status: 413 });
    }

    return NextResponse.json({ result, documentName: file.name });
  } catch (err) {
    if (err instanceof PdfServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "The demo inspector is temporarily unavailable. Please try again shortly." }, { status: 503 });
  } finally {
    if (jobId) await deletePdfServiceJob(jobId);
  }
}
