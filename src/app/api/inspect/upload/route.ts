import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { uploadToPdfService, PdfServiceError } from "@/lib/pdf/service";
import { rateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { getPlan } from "@/lib/plans";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = clientKeyFromHeaders(req.headers, `upload:${user.id}`);
  if (!rateLimit(key, 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many uploads. Please slow down and try again shortly." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }

  const plan = getPlan(user.plan);
  const maxBytes = plan.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `File exceeds your plan's ${plan.maxFileSizeMb}MB limit. Upgrade your plan for larger files.` }, { status: 413 });
  }

  const usage = await db.getUsage(user.id);
  if (usage.inspectionsLimit != null && usage.inspectionsUsed >= usage.inspectionsLimit) {
    return NextResponse.json({
      error: `You've used all ${usage.inspectionsLimit} inspections included in your ${plan.name} plan this month. Upgrade to continue.`,
      limitReached: true,
    }, { status: 403 });
  }

  try {
    const result = await uploadToPdfService(file, file.name);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PdfServiceError) {
      await db.recordProcessingFailure(`upload:${err.message}`);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    await db.recordProcessingFailure(`upload:unexpected:${String(err)}`);
    return NextResponse.json({ error: "The processing service is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
