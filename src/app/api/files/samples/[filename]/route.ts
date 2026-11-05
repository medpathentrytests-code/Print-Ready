import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STORAGE_DIR = process.env.PRINTREADY_STORAGE_DIR || path.join(process.cwd(), "..", "storage");
const ALLOWED = new Set([
  "clean-manuscript-6x9.pdf",
  "flawed-manuscript-sample.pdf",
  "inconsistent-page-sizes-sample.pdf",
]);

// Public, read-only sample PDFs used by the landing page demo and bundled
// with the acquisition package — intentionally not behind auth.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!ALLOWED.has(filename)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const filePath = path.join(STORAGE_DIR, "samples", filename);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const data = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"` },
  });
}
