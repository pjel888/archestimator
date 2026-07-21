import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isCloudflareBetterAuthProviderEnabled } from "@/lib/auth/auth-provider-selection";
import {
  buildClosedBetaAccessPath,
  getClosedBetaAccessForEmail,
  resolveClosedBetaRuntimeEnv,
} from "@/lib/auth/closed-beta-access";
import {
  getClosedBetaAccessFromCloudflareD1,
  markClosedBetaAllowlistAcceptedInD1,
} from "@/lib/auth/closed-beta-d1-store";
import { getDevCurrentUserContext } from "@/lib/auth/dev-auth";
import { getProfileByEmailFromCloudflareD1, type AppRole, type CurrentUserProfile } from "@/lib/auth/profile-d1-store";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { traced } from "@/lib/perf/server-timing";

export type CurrentUserContext = {
  userId: string;
  email: string;
  role: AppRole;
  profile: CurrentUserProfile;
  displayName: string;
  avatarUrl: string | null;
};

type CloudflareBetterAuthRuntime = typeof import("@/lib/auth/cloudflare-better-auth-runtime");

let cloudflareBetterAuthRuntimePromise: Promise<CloudflareBetterAuthRuntime> | null = null;

function loadCloudflareBetterAuthRuntime() {
  cloudflareBetterAuthRuntimePromise ??= import("@/lib/auth/cloudflare-better-auth-runtime");
  return cloudflareBetterAuthRuntimePromise;
}

function createSyntheticBetterAuthProfile({
  avatarUrl,
  displayName,
  email,
  id,
}: {
  avatarUrl: string | null;
  displayName: string | null;
  email: string;
  id: string;
}): CurrentUserProfile {
  const now = new Date().toISOString();
  return {
    account_status: "active",
    avatar_url: avatarUrl,
    created_at: now,
    default_workspace_id: null,
    deleted_at: null,
    deletion_id: null,
    display_name: displayName,
    email,
    id,
    role: "member",
    updated_at: now,
  };
}

async function getBetterAuthCurrentUserContext(): Promise<CurrentUserContext | null> {
  const requestHeaders = new Headers(await headers());
  const { getCloudflareBetterAuthIdentityFromRequest } = await loadCloudflareBetterAuthRuntime();
  const identity = await traced("current-user.better-auth-d1-session", () =>
    getCloudflareBetterAuthIdentityFromRequest({
      headers: requestHeaders,
      requestUrl: null,
    }),
  );
  if (!identity) return null;

  const access = await traced("current-user.better-auth-closed-beta-access", async () => {
    const env = await resolveClosedBetaRuntimeEnv();
    return getClosedBetaAccessForEmail({
      email: identity.email,
      env,
      store: {
        checkAccess: getClosedBetaAccessFromCloudflareD1,
      },
    });
  });
  if (!access.allowed) redirect(buildClosedBetaAccessPath(access.status));

  if (access.status === "invited") {
    await traced("current-user.better-auth-closed-beta-promote", async () => {
      const db = await getCloudflareD1Database();
      if (!db) return;
      try {
        await markClosedBetaAllowlistAcceptedInD1(db, access.normalizedEmail);
      } catch {
        // Session remains valid; allowlist reconcile will retry.
      }
    });
  }

  const profile = await traced("current-user.better-auth-d1-profile-lookup", () =>
    getProfileByEmailFromCloudflareD1(identity.email),
  );
  const resolvedProfile = profile ?? createSyntheticBetterAuthProfile(identity);

  // Enforce account lifecycle: deleted/banned/suspended users are blocked.
  if (resolvedProfile.deleted_at) {
    redirect("/access-required?reason=deleted");
  }
  if (resolvedProfile.account_status === "banned") {
    redirect("/access-required?reason=banned");
  }
  if (resolvedProfile.account_status === "suspended") {
    redirect("/access-required?reason=suspended");
  }

  return {
    userId: resolvedProfile.id,
    email: identity.email,
    role: resolvedProfile.role,
    profile: resolvedProfile,
    displayName: resolvedProfile.display_name ?? identity.displayName ?? identity.email,
    avatarUrl: resolvedProfile.avatar_url ?? identity.avatarUrl,
  };
}

export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext | null> => {
  const devContext = await traced("current-user.dev-auth-context", () => getDevCurrentUserContext());
  if (devContext) return devContext;

  if (isCloudflareBetterAuthProviderEnabled()) {
    return getBetterAuthCurrentUserContext();
  }

  return null;
});

export async function requireCurrentUserContext(_options?: { enforceTermsAcceptance?: boolean }) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");
  return context;
}

export async function requireAuth(options?: { enforceTermsAcceptance?: boolean }) {
  return requireCurrentUserContext(options);
}

/**
 * Auth gate for workshop write mutations. Applies closed-beta maintenance mode:
 * non-platform-admins cannot mutate while `admin_maintenance_mode` is enabled.
 */
export async function requireWorkshopWriteContext(options?: { enforceTermsAcceptance?: boolean }) {
  const context = await requireCurrentUserContext(options);
  const { assertWorkshopWritable } = await import("@/lib/feature-gates/enforce");
  await assertWorkshopWritable(context);
  return context;
}
