import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { InspectFlow } from "@/components/dashboard/InspectFlow";

export default async function NewInspectionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [projects, usage] = await Promise.all([db.listProjects(user.id), db.getUsage(user.id)]);
  const plan = getPlan(user.plan);

  const limitReached = usage.inspectionsLimit != null && usage.inspectionsUsed >= usage.inspectionsLimit;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-ink)]">New Inspection</h1>
      <p className="text-sm text-[var(--color-muted)] mt-1 mb-8">Upload a PDF and choose your print specification to run all 10 quality checks.</p>

      {limitReached ? (
        <div className="card p-8 max-w-xl border-amber-200 bg-[var(--color-warning-soft)]">
          <p className="font-semibold text-amber-900">You&apos;ve used all {usage.inspectionsLimit} inspections in your {plan.name} plan this month.</p>
          <p className="text-sm text-amber-800 mt-1.5">Upgrade your plan from Settings to continue inspecting documents.</p>
        </div>
      ) : (
        <InspectFlow projects={projects} maxFileSizeMb={plan.maxFileSizeMb} />
      )}
    </div>
  );
}
