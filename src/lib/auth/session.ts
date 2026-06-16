import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserTermsAcceptanceStatus } from "@/lib/legal/terms-acceptance";
import { buildTermsAcceptanceRedirectPath } from "@/lib/legal/terms-gate";
import { buildClosedBetaAccessPath, getClosedBetaAccessForEmail } from "@/lib/auth/closed-beta-access";
import { getDevCurrentUserContext } from "@/lib/auth/dev-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type CurrentUserContext = {
  userId: string;
  email: string;
  role: Tables<"profiles">["role"];
  profile: Tables<"profiles">;
  displayName: string;
  avatarUrl: string | null;
};

type EnsureCurrentUserProfileRpcClient = {
  rpc: (
    functionName: "ensure_current_user_profile",
    args: { profile_display_name: string | null; profile_avatar_url: string | null },
  ) => PromiseLike<{
    data: Tables<"profiles"> | null;
    error: { message?: string } | null;
  }>;
};

function hasSupabaseServerEnv(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext | null> => {
  const devContext = await getDevCurrentUserContext();
  if (devContext) return devContext;

  if (!hasSupabaseServerEnv()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const email = user.email?.toLowerCase() ?? "";
  const access = await getClosedBetaAccessForEmail({
    email,
    supabase,
  });
  if (!access.allowed) redirect(buildClosedBetaAccessPath(access.status));

  const metadata = user.user_metadata ?? {};
  const metadataName = typeof metadata.display_name === "string" ? metadata.display_name : typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : null;
  const avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (profile) {
    return {
      userId: user.id,
      email,
      role: profile.role,
      profile,
      displayName: profile.display_name ?? metadataName ?? email,
      avatarUrl: profile.avatar_url ?? avatarUrl,
    };
  }

  const { data: createdProfile, error } = await (supabase as EnsureCurrentUserProfileRpcClient).rpc(
    "ensure_current_user_profile",
    {
      profile_avatar_url: avatarUrl,
      profile_display_name: metadataName,
    },
  );

  if (error) throw error;
  if (!createdProfile) throw new Error("Authenticated profile could not be created.");
  return {
    userId: user.id,
    email,
    role: createdProfile.role,
    profile: createdProfile,
    displayName: createdProfile.display_name ?? metadataName ?? email,
    avatarUrl: createdProfile.avatar_url ?? avatarUrl,
  };
});

type RequireCurrentUserContextOptions = {
  enforceTermsAcceptance?: boolean;
  nextPath?: string | null;
};

type RequireCurrentUserContextResult =
  | { ok: true; context: CurrentUserContext }
  | { ok: false; reason: "unauthenticated" | "terms_acceptance_required"; redirectPath: string };

export async function getRequiredCurrentUserContextResult(options: RequireCurrentUserContextOptions = {}): Promise<RequireCurrentUserContextResult> {
  const context = await getCurrentUserContext();
  if (!context) return { ok: false, reason: "unauthenticated", redirectPath: "/login" };

  if (options.enforceTermsAcceptance ?? true) {
    const acceptanceStatus = await getCurrentUserTermsAcceptanceStatus(context.userId);
    if (acceptanceStatus.requiresAcceptance) {
      return {
        ok: false,
        reason: "terms_acceptance_required",
        redirectPath: buildTermsAcceptanceRedirectPath(options.nextPath ?? null),
      };
    }
  }

  return { ok: true, context };
}

export async function requireCurrentUserContext(options: RequireCurrentUserContextOptions = {}) {
  const result = await getRequiredCurrentUserContextResult(options);
  if (!result.ok) redirect(result.redirectPath);
  return result.context;
}
