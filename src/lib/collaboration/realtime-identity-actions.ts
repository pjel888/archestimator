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
import { issueRealtimeIdentityEnvelope } from "@/lib/collaboration/realtime-identity-server";
import { getCurrentUserTermsAcceptanceStatus } from "@/lib/legal/terms-acceptance";
import type { RealtimeIdentityEnvelope } from "@/lib/collaboration/realtime-identity";

/** Topic must be `project:<uuid>` or `estimate:<uuid>` (36-char uuid form). */
const TOPIC_PATTERN = /^(project|estimate):[0-9a-f-]{36}$/;

export type IssueRealtimeIdentityResult = {
  envelope: RealtimeIdentityEnvelope;
  /** Raw base64url public key for the client to cache and verify with. */
  publicKey: string;
};

/**
 * Issue a sender-bound realtime identity envelope for the current user.
 *
 * Returns null when the caller is unauthenticated or the topic is malformed.
 * The envelope `sub` is ALWAYS the authenticated user's id — the topic is the
 * only client-supplied input, and it is format-validated before use.
 *
 * Role lookup is intentionally minimal here ("member"): the security guarantee
 * is the `sub` + `topic` + expiry binding, not the role string. A richer
 * per-topic role can be layered on later without changing the wire format.
 */
export async function issueRealtimeIdentity({
  topic,
}: {
  topic: string;
}): Promise<IssueRealtimeIdentityResult | null> {
  const normalizedTopic = typeof topic === "string" ? topic.trim().toLowerCase() : "";
  if (!TOPIC_PATTERN.test(normalizedTopic)) return null;

  const user = await getCurrentUserContext();
  if (!user) return null;

  const termsStatus = await getCurrentUserTermsAcceptanceStatus(user.userId);
  if (termsStatus.requiresAcceptance) return null;

  const { envelope, publicKey } = await issueRealtimeIdentityEnvelope({
    sub: user.userId,
    topic: normalizedTopic,
    role: "member",
  });

  return { envelope, publicKey };
}
