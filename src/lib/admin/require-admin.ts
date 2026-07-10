import "server-only";

import { redirect } from "next/navigation";

import { isPlatformAdmin } from "@/lib/auth/roles";
import { getCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";

export async function requireAdminContext(): Promise<CurrentUserContext> {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (!isPlatformAdmin(context)) redirect("/access-required");
  return context;
}

export function assertAdminApiAccess(context: CurrentUserContext | null): Response | null {
  if (!context) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!isPlatformAdmin(context)) {
    return Response.json({ error: "Platform admin access required." }, { status: 403 });
  }

  return null;
}
