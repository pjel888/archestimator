import "server-only";

import { redirect } from "next/navigation";

import { isPlatformAdmin } from "@/lib/auth/roles";
import { getCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";

export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
} as const;

export async function requireAdminContext(): Promise<CurrentUserContext> {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  if (!isPlatformAdmin(context)) redirect("/access-required");
  return context;
}

export function assertAdminApiAccess(context: CurrentUserContext | null): Response | null {
  if (!context) {
    return Response.json({ error: "Authentication required." }, { status: 401, headers: NO_STORE_HEADERS });
  }

  if (!isPlatformAdmin(context)) {
    return Response.json({ error: "Platform admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
  }

  return null;
}

/**
 * Verifies that a mutation request originates from the same site.
 * Blocks cross-site (CSRF) requests on admin API POST/PUT/DELETE routes.
 * Allows same-origin and same-site requests; rejects missing/mismatched origin.
 */
export function assertAdminApiOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // If there's no origin header at all, reject (admin mutations must be
  // same-origin). This is stricter than the publication surface because admin
  // mutations are high-privilege.
  if (!origin || !host) {
    return Response.json({ error: "Same-origin request required." }, { status: 403, headers: NO_STORE_HEADERS });
  }

  // Parse the origin and compare host (handles http/https port variants).
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    return Response.json({ error: "Invalid origin." }, { status: 403, headers: NO_STORE_HEADERS });
  }

  if (originHost !== host) {
    return Response.json({ error: "Cross-origin request blocked." }, { status: 403, headers: NO_STORE_HEADERS });
  }

  return null;
}

/**
 * Combined gate for admin API GET routes: checks auth + platform admin.
 * Returns the user context on success, or a Response on failure.
 */
export async function gateAdminApiGet(): Promise<{ ok: true; context: CurrentUserContext } | { ok: false; response: Response }> {
  const context = await getCurrentUserContext();
  const error = assertAdminApiAccess(context);
  if (error) return { ok: false, response: error };
  // assertAdminApiAccess returns null only when context is non-null and admin.
  return { ok: true, context: context! };
}

/**
 * Combined gate for admin API mutation routes: checks auth + platform admin +
 * same-origin (CSRF). Returns the user context on success, or a Response on failure.
 */
export async function gateAdminApiMutation(request: Request): Promise<{ ok: true; context: CurrentUserContext } | { ok: false; response: Response }> {
  const originError = assertAdminApiOrigin(request);
  if (originError) return { ok: false, response: originError };

  const context = await getCurrentUserContext();
  const error = assertAdminApiAccess(context);
  if (error) return { ok: false, response: error };
  return { ok: true, context: context! };
}
