import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { analyzeSchema } from "@/lib/validation";
import { analyzeWithPdfService, PdfServiceError, deletePdfServiceJob } from "@/lib/pdf/service";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { rateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = clientKeyFromHeaders(req.headers, `analyze:${user.id}`);
  if (!rateLimit(key, 15, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many inspection requests. Please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 });
  }

  const plan = getPlan(user.plan);
  const usage = await db.getUsage(user.id);
  if (usage.inspectionsLimit != null && usage.inspectionsUsed >= usage.inspectionsLimit) {
    return NextResponse.json({
      error: `You've used all ${usage.inspectionsLimit} inspections included in your ${plan.name} plan this month. Upgrade to continue.`,
      limitReached: true,
    }, { status: 403 });
  }

  const { jobId, specKey, customWidthIn, customHeightIn, bleedIn, marginIn, documentName, projectId } = parsed.data;

  let result: any;
  try {
    result = await analyzeWithPdfService({
      job_id: jobId,
      spec_key: specKey,
      custom_width_in: customWidthIn ?? null,
      custom_height_in: customHeightIn ?? null,
      bleed_in: bleedIn,
      margin_in: marginIn,
    });
  } catch (err) {
    if (err instanceof PdfServiceError) {
      await db.recordProcessingFailure(`analyze:${err.message}`);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    await db.recordProcessingFailure(`analyze:unexpected:${String(err)}`);
    return NextResponse.json({ error: "Analysis failed unexpectedly. Please try again." }, { status: 503 });
  }

  if (result.page_count > plan.maxPagesPerDocument) {
    await deletePdfServiceJob(jobId);
    return NextResponse.json({
      error: `This document has ${result.page_count} pages, exceeding your plan's ${plan.maxPagesPerDocument}-page limit. Upgrade your plan or split the document.`,
    }, { status: 413 });
  }

  const inspection = await db.createInspection({
    id: randomUUID(),
    userId: user.id,
    projectId: projectId || null,
    jobId,
    documentName,
    fileSizeBytes: result.file_size_bytes,
    specKey: result.spec_key,
    specLabel: result.spec_label,
    targetWidthIn: result.target_width_in,
    targetHeightIn: result.target_height_in,
    bleedIn: result.bleed_in,
    marginIn: result.margin_in,
    pageCount: result.page_count,
    score: result.score,
    criticalCount: result.critical_count,
    warningCount: result.warning_count,
    infoCount: result.info_count,
    passedChecks: result.passed_checks,
    totalChecks: result.total_checks,
    issues: result.issues,
    pages: result.pages,
    thumbnails: result.thumbnails,
    isEncrypted: result.is_encrypted,
    blocked: result.blocked,
  });

  await db.incrementUsage(user.id);

  return NextResponse.json({ inspection });
}
