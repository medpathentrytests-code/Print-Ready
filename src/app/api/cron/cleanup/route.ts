import { NextRequest, NextResponse } from "next/server";

// Scheduled temp-file hygiene endpoint. Deploy behind a scheduler:
//   - Vercel: add to vercel.json `crons` hitting this path hourly.
//   - Any other host: hit this URL from an external scheduler (cron-job.org,
//     GitHub Actions schedule, etc.) with the CRON_SECRET header.
// Protected by a shared secret so it can't be triggered by arbitrary traffic.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const res = await fetch(`${process.env.PDF_SERVICE_URL || "http://localhost:8000"}/cleanup?max_age_hours=2`, { method: "POST" });
    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch {
    return NextResponse.json({ ok: false, error: "PDF service unreachable." }, { status: 503 });
  }
}
