"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAccountSecurityEvent } from "@/lib/auth/account-audit";
import { readFirstAccountWorkspaceMembership } from "@/lib/auth/account-membership";
// react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field -- Server action module; service-role client import is never browser-bundled.
import { createAccountServiceRoleClient } from "@/lib/auth/account-service-role";
import {
  canManageWorkspaceAccountSettings,
  parseOnboardingSubmission,
  parseProfileSettingsSubmission,
  parseWorkspaceSettingsSubmission,
  type ProfileSettingsPayload,
  type WorkspaceSettingsPayload,
} from "@/lib/auth/account-data";
import { DEFAULT_AUTH_DESTINATION, sanitizeNextPath } from "@/lib/auth/redirects";
import { requireCurrentUserContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type WorkspaceRole = Tables<"workspace_members">["role"];

export type AccountSetupState = {
  profile: ProfileSettingsPayload | null;
  workspace: WorkspaceSettingsPayload | null;
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
  invitedCollaborator: boolean;
  canManageWorkspace: boolean;
};

async function completeOnboarding(formData: FormData) {
  const next = sanitizeNextPath(formData.get("next"));
  const context = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();
  const accountMembership = await readFirstAccountWorkspaceMembership(
    supabase,
    context.userId,
  );
  const invitedCollaborator = !context.profile.default_workspace_id && Boolean(accountMembership);
  const parsed = parseOnboardingSubmission(formData, { invitedCollaborator });

  if (!parsed.ok) {
    redirect(onboardingErrorUrl("missing_fields", next));
  }

  await saveProfileSettings(supabase, context.userId, parsed.profile, true);

  if (parsed.workspace) {
    const workspaceId = await resolveWritableWorkspaceId(
      supabase,
      context.userId,
      context.profile.default_workspace_id,
      parsed.workspace.organization_name,
    );

    await saveWorkspaceSettings(supabase, workspaceId, parsed.workspace);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ default_workspace_id: workspaceId })
      .eq("id", context.userId);

    if (profileError) throw profileError;

    await recordAccountSecurityEvent({
      eventType: "onboarding_completed",
      userId: context.userId,
      workspaceId,
      metadata: { path: "self_serve_workspace" },
    });
  } else {
    if (accountMembership?.workspaceId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ default_workspace_id: accountMembership.workspaceId })
        .eq("id", context.userId);

      if (profileError) throw profileError;
    }

    await recordAccountSecurityEvent({
      eventType: "onboarding_completed",
      userId: context.userId,
      workspaceId: accountMembership?.workspaceId ?? null,
      metadata: { path: "invited_collaborator" },
    });
  }

  revalidatePath("/workshop");
  revalidatePath("/workshop/settings");
  // react-doctor-disable-next-line react-doctor/clickjacking-redirect-risk -- `next` is constrained by sanitizeNextPath to an internal path, with auth callback and unsafe nested next values rejected.
  redirect(next);
}

export async function updateProfileSettings(formData: FormData) {
  const parsed = parseProfileSettingsSubmission(formData);

  if (!parsed.ok) {
    redirect("/workshop/settings/profile?error=missing_fields");
  }

  const context = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();

  await saveProfileSettings(supabase, context.userId, parsed.profile, false);
  await recordAccountSecurityEvent({
    eventType: "profile_settings_updated",
    userId: context.userId,
  });

  revalidatePath("/workshop/settings/profile");
  redirect("/workshop/settings/profile?saved=1");
}

export async function updateWorkspaceSettings(formData: FormData) {
  const parsed = parseWorkspaceSettingsSubmission(formData);

  if (!parsed.ok) {
    redirect("/workshop/settings/workspace?error=missing_fields");
  }

  const context = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();
  const workspaceIdValue = formData.get("workspace_id");
  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue.trim() : "";
  const targetWorkspaceId = workspaceId || context.profile.default_workspace_id;

  if (!targetWorkspaceId) {
    redirect("/workshop/settings/workspace?error=no_workspace");
  }

  const role = await getWorkspaceRole(supabase, targetWorkspaceId, context.userId);
  if (!canManageWorkspaceAccountSettings(role)) {
    redirect("/workshop/settings/workspace?error=forbidden");
  }

  await saveWorkspaceSettings(supabase, targetWorkspaceId, parsed.workspace);
  await recordAccountSecurityEvent({
    eventType: "workspace_settings_updated",
    userId: context.userId,
    workspaceId: targetWorkspaceId,
  });

  revalidatePath("/workshop/settings/workspace");
  redirect("/workshop/settings/workspace?saved=1");
}

export async function getAccountSetupState(): Promise<AccountSetupState> {
  const context = await requireCurrentUserContext();
  const supabase = await createSupabaseServerClient();
  const [profileResult, accountMembership] = await Promise.all([
    supabase
      .from("user_onboarding_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle(),
    readFirstAccountWorkspaceMembership(supabase, context.userId),
  ]);

  if (profileResult.error) throw profileResult.error;

  const workspaceId = context.profile.default_workspace_id ?? accountMembership?.workspaceId ?? null;
  const workspaceRole = workspaceId
    ? await getWorkspaceRole(supabase, workspaceId, context.userId)
    : null;
  const workspace = workspaceId ? await getWorkspaceSettings(supabase, workspaceId) : null;

  return {
    profile: profileResult.data
      ? {
          display_name: profileResult.data.display_name,
          user_category: profileResult.data.user_category as ProfileSettingsPayload["user_category"],
          country_region: profileResult.data.country_region,
          primary_use: profileResult.data.primary_use as ProfileSettingsPayload["primary_use"],
          student_educator_detail: profileResult.data.student_educator_detail,
          marketing_consent_at: profileResult.data.marketing_consent_at,
        }
      : {
          display_name: context.displayName,
          user_category: "architect",
          country_region: "",
          primary_use: null,
          student_educator_detail: null,
          marketing_consent_at: null,
        },
    workspace,
    workspaceId,
    workspaceRole,
    invitedCollaborator: !context.profile.default_workspace_id && Boolean(accountMembership),
    canManageWorkspace: canManageWorkspaceAccountSettings(workspaceRole),
  };
}

async function saveProfileSettings(
  supabase: SupabaseServerClient,
  userId: string,
  profile: ProfileSettingsPayload,
  completed: boolean,
) {
  const completedAt = completed ? new Date().toISOString() : undefined;
  const accountAdmin = createAccountServiceRoleClient();

  const [profileResult, onboardingResult] = await Promise.all([
    supabase.from("profiles").update({ display_name: profile.display_name }).eq("id", userId),
    accountAdmin.from("user_onboarding_profiles").upsert(
      {
        user_id: userId,
        display_name: profile.display_name,
        user_category: profile.user_category,
        country_region: profile.country_region,
        primary_use: profile.primary_use,
        student_educator_detail: profile.student_educator_detail,
        marketing_consent_at: profile.marketing_consent_at,
        ...(completedAt ? { onboarding_completed_at: completedAt } : {}),
      },
      { onConflict: "user_id" },
    ),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (onboardingResult.error) throw onboardingResult.error;
}

async function saveWorkspaceSettings(
  supabase: SupabaseServerClient,
  workspaceId: string,
  workspace: WorkspaceSettingsPayload,
) {
  const [workspaceResult, settingsResult] = await Promise.all([
    supabase
      .from("workspaces")
      .update({ name: workspace.organization_name })
      .eq("id", workspaceId),
    supabase.from("workspace_account_settings").upsert(
      {
        workspace_id: workspaceId,
        organization_name: workspace.organization_name,
        organization_type: workspace.organization_type,
        country_region: workspace.country_region,
        company_size: workspace.company_size,
        default_currency: workspace.default_currency,
        primary_use: workspace.primary_use,
      },
      { onConflict: "workspace_id" },
    ),
  ]);

  if (workspaceResult.error) throw workspaceResult.error;
  if (settingsResult.error) throw settingsResult.error;
}

async function resolveWritableWorkspaceId(
  supabase: SupabaseServerClient,
  userId: string,
  defaultWorkspaceId: string | null,
  organizationName: string,
) {
  if (defaultWorkspaceId) return defaultWorkspaceId;

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (membership?.workspace_id && canManageWorkspaceAccountSettings(membership.role)) {
    return membership.workspace_id;
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: organizationName, slug: null, created_by: userId })
    .select("id")
    .single();

  if (workspaceError) throw workspaceError;
  return workspace.id;
}

async function getWorkspaceRole(
  supabase: SupabaseServerClient,
  workspaceId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role ?? null;
}

async function getWorkspaceSettings(
  supabase: SupabaseServerClient,
  workspaceId: string,
): Promise<WorkspaceSettingsPayload | null> {
  const [workspaceResult, settingsResult] = await Promise.all([
    supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
    supabase
      .from("workspace_account_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  if (workspaceResult.error) throw workspaceResult.error;
  if (settingsResult.error) throw settingsResult.error;

  return {
    organization_name:
      settingsResult.data?.organization_name ?? workspaceResult.data?.name ?? "",
    organization_type:
      (settingsResult.data?.organization_type as WorkspaceSettingsPayload["organization_type"]) ??
      "architecture_design",
    country_region: settingsResult.data?.country_region ?? "",
    company_size:
      (settingsResult.data?.company_size as WorkspaceSettingsPayload["company_size"]) ?? null,
    default_currency: settingsResult.data?.default_currency ?? "PHP",
    primary_use:
      (settingsResult.data?.primary_use as WorkspaceSettingsPayload["primary_use"]) ?? null,
  };
}

function onboardingErrorUrl(code: string, next: string) {
  const params = new URLSearchParams({
    error: code,
    next: sanitizeNextPath(next, DEFAULT_AUTH_DESTINATION),
  });
  return `/workshop/onboarding?${params.toString()}`;
}
