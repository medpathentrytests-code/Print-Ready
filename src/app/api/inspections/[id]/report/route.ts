import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generateReportPdf } from "@/lib/pdf/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const inspection = await db.getInspection(user.id, id);
  if (!inspection) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const resultPayload = {
    score: inspection.score,
    critical_count: inspection.criticalCount,
    warning_count: inspection.warningCount,
    info_count: inspection.infoCount,
    passed_checks: inspection.passedChecks,
    total_checks: inspection.totalChecks,
    page_count: inspection.pageCount,
    spec_label: inspection.specLabel,
    bleed_in: inspection.bleedIn,
    margin_in: inspection.marginIn,
    issues: inspection.issues,
  };

  try {
    const pdfBuffer = await generateReportPdf(inspection.documentName, resultPayload, user.email);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PrintReady-Report-${inspection.documentName.replace(/[^a-zA-Z0-9.-]/g, "_")}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Report generation failed." }, { status: 503 });
  }
}
