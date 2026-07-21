import "server-only";

import { redirect } from "next/navigation";

import { isPlatformAdmin } from "@/lib/auth/roles";
import { requireCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";

/**
 * Fail-closed gate for platform-admin workshop settings and ops pages.
 * Prefer redirect over soft-deny so beta members cannot probe ops URLs.
 */
export async function requirePlatformAdminPage(
  deniedPath = "/access-required",
): Promise<CurrentUserContext> {
  const context = await requireCurrentUserContext();
  if (!isPlatformAdmin(context)) {
    redirect(deniedPath);
  }
  return context;
}
