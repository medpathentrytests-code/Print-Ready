import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deletePdfServiceJob } from "@/lib/pdf/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const inspection = await db.getInspection(user.id, id);
  if (!inspection) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ inspection });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const inspection = await db.getInspection(user.id, id);
  const ok = await db.deleteInspection(user.id, id);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (inspection) await deletePdfServiceJob(inspection.jobId);
  return NextResponse.json({ ok: true });
}
