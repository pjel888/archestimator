import "server-only";

import { createHmac } from "node:crypto";

import {
  sanitizeAccountSecurityMetadata,
  type AccountSecurityEventType,
} from "@/lib/auth/account-data";
import {
  recordAccountSecurityEventInCloudflareD1,
  type AccountSecurityAuditRow,
} from "@/lib/auth/account-audit-d1-store";
import { emitLogRecord } from "@/lib/observability/logger";

type AccountSecurityAuditInput = {
  eventType: AccountSecurityEventType | (string & {});
  userId?: string | null;
  workspaceId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * P0.6 (Security & Compliance Program) — account audit hashing uses HMAC-SHA-256
 * keyed by a server-side pepper so that DB disclosure alone cannot reverse IP /
 * user-agent pseudonyms. Mirrors the proven pattern in publication/security.ts
 * (createHmac with a Worker secret). Legacy rows persisted as plain `sha256:` are
 * treated as pseudonymous personal data; rotation plan lives in the plan pack.
 *
 * Production requires AUTH_AUDIT_HASH_PEPPER. Dev/test falls back to a fixed,
 * non-secret value so existing unit tests do not need explicit pepper wiring.
 */
const HMAC_AUDIT_PREFIX = "hmac-sha256";
const DEV_FALLBACK_PEPPER = "archestimator.audit.dev-fallback-not-for-production";

function resolveAuditHashPepper(): string {
  const pepper = process.env.AUTH_AUDIT_HASH_PEPPER;
  if (pepper && pepper.length > 0) return pepper;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_AUDIT_HASH_PEPPER is required in production.");
  }
  return DEV_FALLBACK_PEPPER;
}

export function hashAccountSecurityValueWithPepper(value: string, pepper: string) {
  return `${HMAC_AUDIT_PREFIX}:${createHmac("sha256", pepper).update(value).digest("hex")}`;
}

export function hashAccountSecurityValue(value: string) {
  return hashAccountSecurityValueWithPepper(value, resolveAuditHashPepper());
}

/**
 * Legacy plain SHA-256 prefix still referenced by historical rows in D1. Kept as
 * a constant so the migration / rotation plan can recognize pre-P0.6 digests.
 */
export const LEGACY_PLAIN_SHA256_PREFIX = "sha256";
export function isLegacyPlainSha256Digest(digest: string | null | undefined): boolean {
  return Boolean(digest) && digest!.startsWith(`${LEGACY_PLAIN_SHA256_PREFIX}:`);
}

export function buildAccountSecurityAuditRow(
  input: AccountSecurityAuditInput,
): AccountSecurityAuditRow {
  const eventType = input.eventType.trim();
  if (!eventType) throw new Error("Account security event type is required.");

  return {
    event_type: eventType,
    user_id: input.userId ?? null,
    workspace_id: input.workspaceId ?? null,
    request_id: input.requestId ?? null,
    ip_hash: input.ipAddress ? hashAccountSecurityValue(input.ipAddress) : null,
    user_agent_hash: input.userAgent ? hashAccountSecurityValue(input.userAgent) : null,
    metadata_json: sanitizeAccountSecurityMetadata(input.metadata ?? {}),
  };
}

export async function recordAccountSecurityEvent(input: AccountSecurityAuditInput) {
  try {
    await recordAccountSecurityEventInCloudflareD1(buildAccountSecurityAuditRow(input));
  } catch (error) {
    // Keep this opaque: auth audit failures can carry provider/DB detail.
    emitLogRecord({
      level: "error",
      event: "account_security_audit_write_failed",
      message: "Account security audit write failed",
      context: {
        event_type: input.eventType,
        // Stable, redacted fields only. No error.message, no stack, no raw error.
        error_name: error instanceof Error ? error.name : "unknown",
      },
    });
  }
}
