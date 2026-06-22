import { createHash } from "node:crypto";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json } from "@/lib/supabase/types";

/**
 * rate-limit.ts — Postgres sliding-window rate limiter for landing form
 * submissions (MASTER-IMPLEMENTATION-PLAN §10 L-FUN-4 / doc 15).
 *
 * PROJECT POSITION: Postgres (`security_rate_limit_events` table), NOT Redis.
 * This clones the proven pattern in `src/lib/ai/rate-limit.ts` (same table,
 * same composite-key hashing, same sliding-window count) scoped to the
 * landing funnels: `/contact`, `/signup` (magic link), `/signup` (Google start).
 *
 * FAIL-OPEN POLICY: if the DB call errors, the limiter logs + ALLOWS the
 * request (returns `allowed: true` with `dbHealthy: false`). Rationale: a
 * Postgres outage must not lock legitimate users out of a public form. The
 * closed-beta gate (RPC fail-closed) + the honeypot are the real abuse
 * defense; rate-limit is throttling, not enforcement. The caller may
 * escalate (e.g. require Turnstile) when `dbHealthy === false`.
 */

export type LandingRateLimitScope =
  | "landing_contact"
  | "landing_signup"
  | "landing_signup_google";

export interface LandingRateLimitIdentifier {
  ip?: string | null;
  email?: string | null;
}

export interface LandingRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  /** False when the DB call errored (fail-open). Callers may escalate. */
  dbHealthy: boolean;
}

type LandingRateLimitWindow = {
  limit: number;
  seconds: number;
};

// Default windows — tuned for a public form. Per-IP is the primary throttle;
// per-email is the abuse backstop. Make tighter via env if abuse surfaces.
const LANDING_RATE_LIMIT_WINDOWS: Record<LandingRateLimitScope, LandingRateLimitWindow[]> = {
  landing_contact: [
    { seconds: 60, limit: 3 },
    { seconds: 60 * 60, limit: 10 },
  ],
  landing_signup: [
    { seconds: 60, limit: 3 },
    { seconds: 60 * 60, limit: 10 },
  ],
  landing_signup_google: [
    { seconds: 60, limit: 5 },
    { seconds: 60 * 60, limit: 20 },
  ],
};

function hashLandingKey(scope: LandingRateLimitScope, identifier: LandingRateLimitIdentifier) {
  // Composite key: scope + ip + email (either may be null). Hashed so the
  // table never stores raw PII; the hash is for counting, not lookup.
  return createHash("sha256")
    .update(
      [scope, identifier.ip?.trim() || "-", identifier.email?.trim().toLowerCase() || "-"].join(
        "\u001f",
      ),
    )
    .digest("base64url");
}

export async function checkLandingSubmissionQuota(
  scope: LandingRateLimitScope,
  identifier: LandingRateLimitIdentifier,
): Promise<LandingRateLimitResult> {
  const supabase = createSupabaseServiceRoleClient("landing-rate-limit");
  const windows = LANDING_RATE_LIMIT_WINDOWS[scope];
  const now = Date.now();
  const maxWindowSeconds = Math.max(...windows.map((w) => w.seconds));
  const keyHash = hashLandingKey(scope, identifier);

  try {
    // Best-effort cleanup of expired rows (keeps the table small; not load-bearing).
    await supabase
      .from("security_rate_limit_events")
      .delete()
      .lt("expires_at", new Date(now).toISOString());

    const { error: insertError } = await supabase.from("security_rate_limit_events").insert({
      scope,
      key_hash: keyHash,
      metadata_json: { route: scope } satisfies Json,
      expires_at: new Date(now + maxWindowSeconds * 1000).toISOString(),
    });
    if (insertError) throw insertError;

    let blocked: { retryAfter: number; limit: number } | null = null;
    let remaining = Number.POSITIVE_INFINITY;

    for (const window of windows) {
      const since = new Date(now - window.seconds * 1000).toISOString();
      const { count, error } = await supabase
        .from("security_rate_limit_events")
        .select("id", { count: "exact", head: true })
        .eq("scope", scope)
        .eq("key_hash", keyHash)
        .gte("occurred_at", since);
      if (error) throw error;
      const observed = count ?? 0;
      remaining = Math.min(remaining, Math.max(0, window.limit - observed));
      if (observed > window.limit) {
        blocked = { retryAfter: window.seconds, limit: window.limit };
        break;
      }
    }

    if (blocked) {
      return {
        allowed: false,
        retryAfterSeconds: blocked.retryAfter,
        remaining: 0,
        dbHealthy: true,
      };
    }
    return { allowed: true, retryAfterSeconds: 0, remaining, dbHealthy: true };
  } catch {
    // FAIL-OPEN: log-worthy, but do not block a legitimate user on a DB hiccup.
    // The closed-beta RPC gate + honeypot remain the abuse defense.
    return { allowed: true, retryAfterSeconds: 0, remaining: Number.POSITIVE_INFINITY, dbHealthy: false };
  }
}

/**
 * getClientIpLanding — landing-scoped IP extraction with validation
 * (MASTER-IMPLEMENTATION-PLAN §9 R-7). Does NOT extend the shared
 * `getClientIp` symbol (blast-radius containment — that one serves the
 * publication surface). Validates the raw header against a strict pattern.
 */
const IP_VALIDATION_PATTERN = /^[A-Za-z0-9.:_-]+$/;
const IP_MAX_LENGTH = 45;

export function getClientIpLanding(headers: Headers): string | null {
  const raw = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!raw) return null;
  if (raw.length > IP_MAX_LENGTH) return null;
  if (!IP_VALIDATION_PATTERN.test(raw)) return null;
  return raw;
}
