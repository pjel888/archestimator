import "server-only";

import { createHash } from "node:crypto";

import {
  sanitizeAccountSecurityMetadata,
  type AccountSecurityEventType,
} from "@/lib/auth/account-data";
import {
  recordAccountSecurityEventInCloudflareD1,
  type AccountSecurityAuditRow,
} from "@/lib/auth/account-audit-d1-store";

type AccountSecurityAuditInput = {
  eventType: AccountSecurityEventType | (string & {});
  userId?: string | null;
  workspaceId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function hashAccountSecurityValue(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
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
  } catch {
    // Account security audit writes are best effort and must not leak auth
    // provider or database details into the user-facing authentication flow.
  }
}
