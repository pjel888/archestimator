import "server-only";

import { emitLogRecord } from "@/lib/observability/logger";

const COLLABORATION_ROOM_PATH_PREFIX = "/__cloudflare/collaboration-room/";
const CONTROL_SECRET_HEADER = "x-collaboration-room-control-secret";
const TOPIC_PATTERN = /^(project|estimate):[0-9a-f-]{36}$/i;

type DurableObjectStubLike = {
  fetch(request: Request): Promise<Response> | Response;
};

type DurableObjectNamespaceLike = {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
};

export type CollaborationRoomRevocationEnv = {
  COLLABORATION_ROOM_CONTROL_SECRET?: unknown;
  COLLAB_ROOMS?: DurableObjectNamespaceLike | null;
};

export type CollaborationRoomRevocationResult = "revoked" | "unavailable" | "failed";

function isValidInput(topic: string, subject: string) {
  return TOPIC_PATTERN.test(topic) && /^[0-9a-f-]{36}$/i.test(subject);
}

/**
 * Sends a direct, secret-authenticated revocation to the named collaboration
 * room. The Durable Object remains the sole verifier of the control request.
 */
export async function revokeCollaborationRoomSubjectInEnv({
  env,
  subject,
  topic,
}: {
  env: CollaborationRoomRevocationEnv;
  subject: string;
  topic: string;
}): Promise<CollaborationRoomRevocationResult> {
  const secret = typeof env.COLLABORATION_ROOM_CONTROL_SECRET === "string"
    ? env.COLLABORATION_ROOM_CONTROL_SECRET.trim()
    : "";
  if (!secret || !env.COLLAB_ROOMS || !isValidInput(topic, subject)) return "unavailable";

  try {
    const room = env.COLLAB_ROOMS.get(env.COLLAB_ROOMS.idFromName(topic));
    const response = await room.fetch(new Request(
      `https://collaboration.internal${COLLABORATION_ROOM_PATH_PREFIX}${encodeURIComponent(topic)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [CONTROL_SECRET_HEADER]: secret,
        },
        body: JSON.stringify({ type: "revoke-subject", sub: subject }),
      },
    ));
    if (!response.ok) return "failed";
    const payload = await response.json().catch(() => null);
    return payload && typeof payload === "object" && (payload as { ok?: unknown }).ok === true
      ? "revoked"
      : "failed";
  } catch (error) {
    emitLogRecord({
      level: "warn",
      event: "collaboration_room_revoke_subject_failed",
      message: "Collaboration-room subject revocation could not be delivered.",
      context: { error_name: error instanceof Error ? error.name : "unknown" },
    });
    return "failed";
  }
}

export async function revokeCollaborationRoomSubject({
  subject,
  topic,
}: {
  subject: string;
  topic: string;
}): Promise<CollaborationRoomRevocationResult> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true }) as { env?: CollaborationRoomRevocationEnv };
    return revokeCollaborationRoomSubjectInEnv({ env: context.env ?? {}, subject, topic });
  } catch (error) {
    emitLogRecord({
      level: "warn",
      event: "collaboration_room_revoke_context_unavailable",
      message: "Collaboration-room revocation runtime is unavailable.",
      context: { error_name: error instanceof Error ? error.name : "unknown" },
    });
    return "unavailable";
  }
}
