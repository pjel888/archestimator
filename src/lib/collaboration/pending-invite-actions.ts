"use server";

import { redirect } from "next/navigation";

import { DEFAULT_AUTH_DESTINATION, LOGIN_PATH } from "@/lib/auth/redirects";
import { isUuid } from "@/lib/ids";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function unavailableInvitePath(reason: "expired" | "revoked" | "already-used" | "invalid" | "error") {
  return `/workshop?invite=unavailable&reason=${reason}`;
}

function acceptedInvitePath(result: Record<string, unknown>) {
  const projectId = typeof result.project_id === "string" ? result.project_id : null;
  const estimateId = typeof result.estimate_id === "string" ? result.estimate_id : null;
  const targetHref = estimateId && projectId
    ? `/workshop/projects/${projectId}/estimates/${estimateId}`
    : projectId
      ? `/workshop/projects/${projectId}`
      : "/workshop/projects";
  const params = new URLSearchParams({
    invite: "accepted",
    scope: estimateId ? "estimate" : "project",
    targetHref,
    targetLabel: estimateId ? "Open estimate" : "Open project",
  });

  return `/workshop?${params.toString()}`;
}

export async function signOutForPendingInvite() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`${LOGIN_PATH}?next=${encodeURIComponent(DEFAULT_AUTH_DESTINATION)}`);
}

export async function acceptPendingInvitationById(formData: FormData) {
  const invitationId = formData.get("invitationId");
  if (typeof invitationId !== "string" || !isUuid(invitationId)) {
    redirect(unavailableInvitePath("invalid"));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_collaboration_invitation_by_id", {
    target_invitation_id: invitationId,
  });

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    redirect(unavailableInvitePath("error"));
  }

  const result = data as Record<string, unknown>;
  const state = typeof result.state === "string" ? result.state : "invalid";

  if (state === "accepted" || state === "already_member") {
    redirect(acceptedInvitePath(result));
  }

  if (state === "wrong_account") {
    const invitedEmail = typeof result.invited_email === "string" ? result.invited_email : "";
    const params = new URLSearchParams({ invite: "wrong-account" });
    if (invitedEmail) params.set("email", invitedEmail);
    redirect(`/workshop?${params.toString()}`);
  }

  if (state === "expired") redirect(unavailableInvitePath("expired"));
  if (state === "revoked") redirect(unavailableInvitePath("revoked"));
  if (state === "already_used") redirect(unavailableInvitePath("already-used"));
  redirect(unavailableInvitePath("invalid"));
}
