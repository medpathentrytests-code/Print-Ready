// Server-to-server client for the PrintReady Python PDF processing service.
// Never called from the browser — only from Next.js route handlers.
const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || "http://localhost:8000";

export class PdfServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function uploadToPdfService(file: Blob, filename: string): Promise<{ job_id: string; size_bytes: number; original_filename: string }> {
  const form = new FormData();
  form.append("file", file, filename);
  const res = await fetch(`${PDF_SERVICE_URL}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Upload failed." }));
    throw new PdfServiceError(body.detail || "Upload failed.", res.status);
  }
  return res.json();
}

export async function analyzeWithPdfService(params: {
  job_id: string;
  spec_key: string;
  custom_width_in?: number | null;
  custom_height_in?: number | null;
  bleed_in: number;
  margin_in: number;
}): Promise<any> {
  const form = new FormData();
  form.append("job_id", params.job_id);
  form.append("spec_key", params.spec_key);
  if (params.custom_width_in != null) form.append("custom_width_in", String(params.custom_width_in));
  if (params.custom_height_in != null) form.append("custom_height_in", String(params.custom_height_in));
  form.append("bleed_in", String(params.bleed_in));
  form.append("margin_in", String(params.margin_in));

  const res = await fetch(`${PDF_SERVICE_URL}/analyze`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Analysis failed." }));
    throw new PdfServiceError(body.detail || "Analysis failed.", res.status);
  }
  return res.json();
}

export async function generateReportPdf(documentName: string, result: any, generatedFor?: string): Promise<Buffer> {
  const res = await fetch(`${PDF_SERVICE_URL}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_name: documentName, result, generated_for: generatedFor }),
  });
  if (!res.ok) throw new PdfServiceError("Report generation failed.", res.status);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deletePdfServiceJob(jobId: string): Promise<void> {
  await fetch(`${PDF_SERVICE_URL}/job/${jobId}`, { method: "DELETE" }).catch(() => {});
}

export function thumbnailDiskPath(jobId: string, filename: string): string {
  const storageDir = process.env.PRINTREADY_STORAGE_DIR || require("path").join(process.cwd(), "..", "storage");
  return require("path").join(storageDir, "thumbnails", jobId, filename);
}
