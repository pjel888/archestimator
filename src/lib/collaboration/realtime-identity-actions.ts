"use server";

/**
 * Realtime identity envelope — server action (T1.2).
 *
 * Teamspace Improvement Plan, task T1.2: sender-bound realtime identity.
 * Addresses finding 05 §5 (HIGH: realtime cursor/presence spoofing + XSS via
 * attacker-controlled displayName), closing gaps G3 / G19, per decision R-18.
 *
 * Clients call {@link issueRealtimeIdentity} to obtain a short-lived,
 * sender-bound envelope (signed for the AUTHENTICATED user, never the requested
 * id) plus the raw public key to cache for local verification. The core
 * security property is the `sub` binding: the envelope is always issued for the
 * caller's own auth user id, so it cannot be used to impersonate anyone else.
 */

import { getCurrentUserContext } from "@/lib/auth/session";
import {
  canEditProjectEstimateContentRole,
  isPlatformAdmin,
  type ProjectEstimateCollaborationRole,
} from "@/lib/auth/roles";
import { readCollaborationTopicAccessInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { issueRealtimeIdentityEnvelope } from "@/lib/collaboration/realtime-identity-server";
import type { RealtimeIdentityEnvelope } from "@/lib/collaboration/realtime-identity";
import {
  issueRealtimeRoomToken,
  readCollaborationRoomTokenSecret,
  readRealtimeRoomTokenSecret,
  type RealtimeRoomCapability,
} from "@/lib/collaboration/realtime-room-token";
import { getCurrentUserTermsAcceptanceStatus } from "@/lib/legal/terms-acceptance";
import {
  canAccessVisibleSupportConversationInD1,
  getSupportConversationInD1,
} from "@/lib/repositories/support-conversations-repository";

/** Topic must be `project:<uuid>` or `estimate:<uuid>` (36-char uuid form). */
const TOPIC_PATTERN = /^(project|estimate):([0-9a-f-]{36})$/;
const GLOBAL_PRESENCE_TOPIC = "global-presence";
const SUPPORT_CONVERSATION_TOPIC_PATTERN = /^[a-zA-Z0-9:_-]{3,200}$/;
const REALTIME_RUNTIME_SECRET_NAMES = [
  "REALTIME_ROOM_TOKEN_SECRET",
  "REALTIME_IDENTITY_SIGNING_KEY",
] as const;

type CloudflareRealtimeContext = {
  env?: Record<string, unknown>;
};

/** OpenNext keeps Worker secrets on the request context, not process.env. */
async function readRealtimeRuntimeEnv(): Promise<NodeJS.ProcessEnv> {
  const runtimeEnv = { ...process.env };
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true }) as unknown as CloudflareRealtimeContext;
    for (const name of REALTIME_RUNTIME_SECRET_NAMES) {
      const value = context.env?.[name];
      if (typeof value === "string" && value.trim()) runtimeEnv[name] = value.trim();
    }
  } catch {
    // Local/test callers continue with process.env; production callers fail
    // closed below when a required realtime secret is unavailable.
  }
  return runtimeEnv;
}

function capabilitiesForCollaborationRole(role: ProjectEstimateCollaborationRole): RealtimeRoomCapability[] {
  const capabilities: RealtimeRoomCapability[] = ["presence:read", "presence:write"];
  if (canEditProjectEstimateContentRole(role)) {
    capabilities.push("broadcast:cursor", "broadcast:row-update");
  }
  return capabilities;
}

export type IssueRealtimeIdentityResult = {
  envelope: RealtimeIdentityEnvelope;
  /** Raw base64url public key for the client to cache and verify with. */
  publicKey: string;
  /** Short-lived room admission token for the Cloudflare Durable Object. */
  roomToken: string;
  /** Authenticated sender id, returned so cursor layers do not need route-time profile props. */
  userId: string;
  /** Escaped by React at render sites; used only as a best-effort collaboration label. */
  displayName: string | null;
};

export type IssueRealtimeRoomTokenResult = {
  roomToken: string;
  userId: string;
};

/**
 * Issue a sender-bound realtime identity envelope for the current user.
 *
 * Returns null when the caller is unauthenticated or the topic is malformed.
 * The envelope `sub` is ALWAYS the authenticated user's id — the topic is the
 * only client-supplied input, and it is format-validated before use.
 *
 * The effective role is resolved from D1 through the canonical collaboration
 * policy. An estimate-only member is never admitted to a project topic.
 */
export async function issueRealtimeIdentity({
  topic,
}: {
  topic: string;
}): Promise<IssueRealtimeIdentityResult | null> {
  const normalizedTopic = typeof topic === "string" ? topic.trim().toLowerCase() : "";
  const topicMatch = TOPIC_PATTERN.exec(normalizedTopic);
  if (!topicMatch) return null;
  const [, topicKind, objectId] = topicMatch;

  const user = await getCurrentUserContext();
  if (!user) return null;
  const acceptanceStatus = await getCurrentUserTermsAcceptanceStatus(user.userId);
  if (acceptanceStatus.requiresAcceptance) return null;

  const database = await getCloudflareD1Database();
  if (!database) return null;

  try {
    const runtimeEnv = await readRealtimeRuntimeEnv();
    const access = await readCollaborationTopicAccessInD1(database, {
      kind: topicKind as "project" | "estimate",
      resourceId: objectId,
    }, user);
    if (!access?.role) return null;

    const roomTokenSecret = readCollaborationRoomTokenSecret(runtimeEnv);
    if (!roomTokenSecret) return null;

    const { envelope, publicKey } = await issueRealtimeIdentityEnvelope({
      sub: user.userId,
      topic: normalizedTopic,
      role: access.role,
      env: runtimeEnv,
    });
    const roomToken = await issueRealtimeRoomToken({
      capabilities: capabilitiesForCollaborationRole(access.role),
      secret: roomTokenSecret,
      sub: user.userId,
      topic: normalizedTopic,
    });

    return { envelope, publicKey, roomToken, userId: user.userId, displayName: user.displayName ?? null };
  } catch {
    return null;
  }
}

async function issueRoomTokenForUser({
  audience,
  capabilities,
  topic,
  userId,
  env,
}: {
  audience?: "support-inbox";
  capabilities?: readonly RealtimeRoomCapability[];
  topic: string;
  userId: string;
  env: NodeJS.ProcessEnv;
}): Promise<IssueRealtimeRoomTokenResult | null> {
  const roomTokenSecret = readRealtimeRoomTokenSecret(env);
  if (!roomTokenSecret) return null;

  const roomToken = await issueRealtimeRoomToken({
    audience,
    capabilities,
    secret: roomTokenSecret,
    sub: userId,
    topic,
  });

  return { roomToken, userId };
}

export async function issueGlobalPresenceRealtimeToken(): Promise<IssueRealtimeRoomTokenResult | null> {
  const user = await getCurrentUserContext();
  if (!user || !isPlatformAdmin(user)) return null;
  const acceptanceStatus = await getCurrentUserTermsAcceptanceStatus(user.userId);
  if (acceptanceStatus.requiresAcceptance) return null;
  const runtimeEnv = await readRealtimeRuntimeEnv();

  return issueRoomTokenForUser({
    topic: GLOBAL_PRESENCE_TOPIC,
    userId: user.userId,
    env: runtimeEnv,
  });
}

export async function issueSupportInboxRealtimeToken({
  conversationId,
}: {
  conversationId: string;
}): Promise<IssueRealtimeRoomTokenResult | null> {
  const normalizedConversationId = typeof conversationId === "string" ? conversationId.trim() : "";
  if (!SUPPORT_CONVERSATION_TOPIC_PATTERN.test(normalizedConversationId)) return null;

  const user = await getCurrentUserContext();
  if (!user) return null;
  const acceptanceStatus = await getCurrentUserTermsAcceptanceStatus(user.userId);
  if (acceptanceStatus.requiresAcceptance) return null;
  const runtimeEnv = await readRealtimeRuntimeEnv();

  const database = await getCloudflareD1Database();
  if (!database) return null;
  try {
    if (isPlatformAdmin(user)) {
      if (!await getSupportConversationInD1(database, normalizedConversationId)) return null;
    } else {
      const allowed = await canAccessVisibleSupportConversationInD1({
        conversationId: normalizedConversationId,
        database,
        userId: user.userId,
      });
      if (!allowed) return null;
    }
  } catch {
    return null;
  }

  return issueRoomTokenForUser({
    audience: "support-inbox",
    capabilities: ["support:subscribe"],
    topic: normalizedConversationId,
    userId: user.userId,
    env: runtimeEnv,
  });
}
