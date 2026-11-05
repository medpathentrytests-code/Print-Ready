import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ProjectDetail } from "@/components/dashboard/ProjectDetail";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const project = await db.getProject(user.id, id);
  if (!project) notFound();
  const inspections = await db.listInspections(user.id, id);

  return <ProjectDetail project={project} inspections={inspections} />;
}
