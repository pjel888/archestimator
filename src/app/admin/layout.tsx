import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminDashboardEnabled } from "@/lib/admin/feature-flags";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { getCurrentUserContext } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) redirect("/login?next=/admin");

  if (!isPlatformAdmin({ role: currentUser.role, email: currentUser.email })) {
    redirect("/access-required");
  }

  if (!(await isAdminDashboardEnabled())) {
    redirect("/workshop");
  }

  return (
    <AdminShell displayName={currentUser.displayName} email={currentUser.email}>
      {children}
    </AdminShell>
  );
}
