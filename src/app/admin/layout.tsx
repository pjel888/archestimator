import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminDevBindingsBanner } from "@/components/admin/AdminDevBindingsBanner";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminDashboardEnabled } from "@/lib/admin/feature-flags";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { getCurrentUserContext } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Fetch user context and feature flag in parallel — they are independent.
  const [currentUser, dashboardEnabled] = await Promise.all([
    getCurrentUserContext(),
    isAdminDashboardEnabled(),
  ]);

  if (!currentUser) redirect("/login?next=/admin");

  if (!isPlatformAdmin({ role: currentUser.role, email: currentUser.email })) {
    redirect("/access-required");
  }

  if (!dashboardEnabled) {
    redirect("/workshop");
  }

  return (
    <AdminShell displayName={currentUser.displayName} email={currentUser.email}>
      <AdminDevBindingsBanner />
      {children}
    </AdminShell>
  );
}
