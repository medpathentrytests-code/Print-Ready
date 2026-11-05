import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const STORAGE_DIR = process.env.PRINTREADY_STORAGE_DIR || path.join(process.cwd(), "..", "storage");

// Thumbnails are only ever served for inspections owned by the requesting
// user (we check the job_id against that user's inspection records) to
// prevent cross-account enumeration of another user's document previews.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string; filename: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId, filename } = await params;

  if (!/^[a-zA-Z0-9-]+$/.test(jobId) || !/^page-\d+\.png$/.test(filename)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const owns = (await db.listInspections(user.id)).some((i) => i.jobId === jobId);
  if (!owns) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const filePath = path.join(STORAGE_DIR, "thumbnails", jobId, filename);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const data = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" } });
}
