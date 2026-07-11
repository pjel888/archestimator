import "server-only";

import {
  type PendingInviteBridge,
} from "@/lib/collaboration/pending-invite";
import { getCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";
import { acceptInvitationTokenForUser } from "@/lib/collaboration/invitation-acceptance";

export type WorkshopInviteBannerState =
  | { kind: "none" }
  | {
      kind: "accepted";
      projectName?: string | null;
      roleLabel?: string | null;
      scope: "project" | "estimate";
      targetHref: string;
      targetLabel: string;
    }
  | { kind: "wrong-account" }
  | { kind: "unavailable"; reason: "expired" | "revoked" | "invalid" | "already-used" | "error" };

function mapUnavailableReason(state: string): WorkshopInviteBannerState {
  if (state === "expired") return { kind: "unavailable", reason: "expired" };
  if (state === "revoked") return { kind: "unavailable", reason: "revoked" };
  if (state === "already_used") return { kind: "unavailable", reason: "already-used" };
  return { kind: "unavailable", reason: "invalid" };
}

export async function acceptPendingInviteBridge(
  bridge: PendingInviteBridge,
  currentUserOverride?: CurrentUserContext | null,
): Promise<WorkshopInviteBannerState> {
  try {
    const currentUser = currentUserOverride === undefined
      ? await getCurrentUserContext()
      : currentUserOverride;
    const { data, error } = await acceptInvitationTokenForUser({
      clientInfo: "archestimator-pending-invite-cookie-accept",
      invitationTokenHash: bridge.tokenHash,
      user: currentUser,
    });

    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return { kind: "unavailable", reason: "error" };
    }

    const result = data as Record<string, unknown>;
    const state = typeof result.state === "string" ? result.state : "invalid";
    const projectId = typeof result.project_id === "string" ? result.project_id : null;
    const estimateId = typeof result.estimate_id === "string" ? result.estimate_id : null;
    if (state === "wrong_account") {
      return { kind: "wrong-account" };
    }
    if (state === "accepted" || state === "already_member") {
      const targetHref = estimateId && projectId
        ? `/workshop/projects/${projectId}/estimates/${estimateId}`
        : projectId
          ? `/workshop/projects/${projectId}`
          : "/workshop/projects";
      return {
        kind: "accepted",
        scope: estimateId ? "estimate" : "project",
        targetHref,
        targetLabel: estimateId ? "Open estimate" : "Open project",
      };
    }

    return mapUnavailableReason(state);
  } catch {
    return { kind: "unavailable", reason: "error" };
  }
}
