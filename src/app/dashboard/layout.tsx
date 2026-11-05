import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { isDemoMode } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      <Sidebar user={user} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav user={user} />
        {isDemoMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs font-medium text-amber-800">
            Demo mode — running on local storage. Connect Supabase to go to production (see docs/DEPLOYMENT.md).
          </div>
        )}
        <main className="flex-1 p-5 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
