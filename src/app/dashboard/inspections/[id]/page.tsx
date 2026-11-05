import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { InspectionView } from "@/components/dashboard/InspectionView";
import type { ResultsData } from "@/components/dashboard/ResultsDashboard";

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [inspection, projects] = await Promise.all([db.getInspection(user.id, id), db.listProjects(user.id)]);
  if (!inspection) notFound();

  const data: ResultsData = {
    documentName: inspection.documentName,
    specLabel: inspection.specLabel,
    pageCount: inspection.pageCount,
    score: inspection.score,
    criticalCount: inspection.criticalCount,
    warningCount: inspection.warningCount,
    infoCount: inspection.infoCount,
    passedChecks: inspection.passedChecks,
    totalChecks: inspection.totalChecks,
    issues: inspection.issues,
    thumbnails: inspection.thumbnails,
    thumbnailBaseUrl: `/api/files/thumbnails/${inspection.jobId}/`,
    bleedIn: inspection.bleedIn,
    marginIn: inspection.marginIn,
  };

  return (
    <div>
      <InspectionView
        inspectionId={inspection.id}
        data={data}
        projects={projects}
        currentProjectId={inspection.projectId}
        blocked={inspection.blocked}
      />
    </div>
  );
}
