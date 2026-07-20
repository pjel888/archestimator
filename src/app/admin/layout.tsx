import type { ReactNode } from "react";
import { appendFileSync } from "node:fs";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminDashboardEnabled } from "@/lib/admin/feature-flags";
import { isPlatformAdmin } from "@/lib/auth/roles";
import { getCurrentUserContext } from "@/lib/auth/session";

function agentDebugLog(payload: Record<string, unknown>) {
  // #region agent log
  const body = {
    sessionId: "154617",
    timestamp: Date.now(),
    ...payload,
  };
  fetch("http://127.0.0.1:7643/ingest/53e8ba5d-5fe3-4f03-a730-a626c9b45a5a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "154617" },
    body: JSON.stringify(body),
  }).catch(() => {});
  try {
    appendFileSync(
      "/Users/philiplewis/archestimator/.cursor/debug-154617.log",
      `${JSON.stringify(body)}\n`,
    );
  } catch {
    // ignore debug file write failures
  }
  // #endregion
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Fetch user context and feature flag in parallel — they are independent.
  const [currentUser, dashboardEnabled] = await Promise.all([
    getCurrentUserContext(),
    isAdminDashboardEnabled(),
  ]);

  const platformAdmin = currentUser
    ? isPlatformAdmin({ role: currentUser.role, email: currentUser.email })
    : false;
  agentDebugLog({
    runId: "post-fix",
    hypothesisId: "A-B-C-D",
    location: "src/app/admin/layout.tsx:AdminLayout",
    message: "admin layout gate decision",
    data: {
      hasUser: Boolean(currentUser),
      role: currentUser?.role ?? null,
      emailIsPhilip: currentUser?.email?.trim().toLowerCase() === "philipjonlewis@gmail.com",
      platformAdmin,
      dashboardEnabled,
      nextBranch: !currentUser
        ? "login"
        : !platformAdmin
          ? "access-required"
          : !dashboardEnabled
            ? "workshop"
            : "allow",
    },
  });

  if (!currentUser) redirect("/login?next=/admin");

  if (!isPlatformAdmin({ role: currentUser.role, email: currentUser.email })) {
    redirect("/access-required");
  }

  if (!dashboardEnabled) {
    redirect("/workshop");
  }

  return (
    <AdminShell displayName={currentUser.displayName} email={currentUser.email}>
      {children}
    </AdminShell>
  );
}
