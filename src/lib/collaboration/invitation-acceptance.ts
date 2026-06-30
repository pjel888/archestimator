import "server-only";

import type { CurrentUserContext } from "@/lib/auth/session";
import {
  acceptCollaborationInvitationByIdInCloudflareD1,
  acceptCollaborationInvitationTokenInCloudflareD1,
} from "@/lib/collaboration/invitation-d1-store";
import { isUuid } from "@/lib/ids";

type InvitationAcceptanceState = Record<string, unknown>;

type InvitationAcceptanceResponse = {
  data: InvitationAcceptanceState | null;
  error: unknown | null;
};

function normalizeActor(user: CurrentUserContext | null) {
  const email = user?.email.trim().toLowerCase() ?? "";
  if (!user || !isUuid(user.userId) || !email) return null;
  return {
    email,
    userId: user.userId,
  };
}

function invalidResponse(): InvitationAcceptanceResponse {
  return {
    data: { state: "invalid" },
    error: null,
  };
}

function normalizeRpcResult(data: unknown, error: unknown): InvitationAcceptanceResponse {
  if (error) return { data: null, error };
  return {
    data: data && typeof data === "object" && !Array.isArray(data) ? data as InvitationAcceptanceState : null,
    error: null,
  };
}

export async function acceptInvitationTokenForUser({
  invitationTokenHash,
  user,
}: {
  clientInfo: string;
  invitationTokenHash: string;
  user: CurrentUserContext | null;
}): Promise<InvitationAcceptanceResponse> {
  const actor = normalizeActor(user);
  if (!actor) return invalidResponse();

  const { data, error } = await acceptCollaborationInvitationTokenInCloudflareD1({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    invitationTokenHash,
  });

  return normalizeRpcResult(data, error);
}

export async function acceptInvitationByIdForUser({
  invitationId,
  user,
}: {
  clientInfo: string;
  invitationId: string;
  user: CurrentUserContext | null;
}): Promise<InvitationAcceptanceResponse> {
  const actor = normalizeActor(user);
  if (!actor) return invalidResponse();

  const { data, error } = await acceptCollaborationInvitationByIdInCloudflareD1({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    invitationId,
  });

  return normalizeRpcResult(data, error);
}
