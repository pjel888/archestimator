"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/session";
import { DEFAULT_AUTH_DESTINATION, LOGIN_PATH } from "@/lib/auth/redirects";
import { createCloudflareBetterAuthForRequest } from "@/lib/auth/cloudflare-better-auth-runtime";
import { acceptInvitationByIdForUser } from "@/lib/collaboration/invitation-acceptance";
import { isUuid } from "@/lib/ids";

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
  await requireAuth();
  const requestHeaders = new Headers(await headers());
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const origin = `${proto}://${host}`;
  requestHeaders.set("origin", origin);
  const signOutRequest = new Request(`${origin}/api/auth/sign-out`, {
    method: "POST",
    headers: requestHeaders,
  });
  const auth = await createCloudflareBetterAuthForRequest(signOutRequest);
  if (auth) await auth.handler(signOutRequest);
  const cookieStore = await cookies();
  cookieStore.set("better-auth.session_token", "", { maxAge: 0, path: "/" });
  cookieStore.set("__Secure-better-auth.session_token", "", { maxAge: 0, path: "/" });
  redirect(`${LOGIN_PATH}?next=${encodeURIComponent(DEFAULT_AUTH_DESTINATION)}`);
}

export async function acceptPendingInvitationById(formData: FormData) {
  const currentUser = await requireAuth();
  const invitationId = formData.get("invitationId");
  if (typeof invitationId !== "string" || !isUuid(invitationId)) {
    redirect(unavailableInvitePath("invalid"));
  }

  const { data, error } = await acceptInvitationByIdForUser({
    clientInfo: "archestimator-pending-invite-accept",
    invitationId,
    user: currentUser,
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
