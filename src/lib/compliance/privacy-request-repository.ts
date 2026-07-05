import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { hashAccountSecurityValue } from "@/lib/auth/account-audit";

export const PRIVACY_REQUEST_KINDS = [
  "access",
  "rectification",
  "erasure",
  "restriction",
  "portability",
  "objection",
  "other",
] as const;
export type PrivacyRequestKind = (typeof PRIVACY_REQUEST_KINDS)[number];

export const PRIVACY_REQUEST_STATUSES = [
  "submitted",
  "in_triage",
  "in_progress",
  "completed",
  "rejected",
] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export type PrivacyRequestInput = {
  requestKind: PrivacyRequestKind;
  description: string;
  requesterEmail?: string | null;
  requesterName?: string | null;
  requesterUserId?: string | null;
  workspaceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type PrivacyRequestRow = {
  id: string;
  request_kind: PrivacyRequestKind;
  status: PrivacyRequestStatus;
  requester_email_hash: string | null;
  requester_name: string | null;
  requester_user_id: string | null;
  description: string;
  workspace_id: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  triaged_at: string | null;
  resolved_at: string | null;
  triaged_by: string | null;
};

export type CreatePrivacyRequestResult = {
  id: string;
  status: PrivacyRequestStatus;
  createdAt: string;
};

function assertRequestKind(
  value: PrivacyRequestInput["requestKind"],
): asserts value is PrivacyRequestKind {
  if (!PRIVACY_REQUEST_KINDS.includes(value)) {
    throw new Error(`Invalid request_kind: ${String(value)}`);
  }
}

function normalizeDescription(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("description is required");
  }
  if (trimmed.length > 4000) {
    throw new Error("description must be 4000 characters or fewer");
  }
  return trimmed;
}

function sanitizeMetadata(
  value: PrivacyRequestInput["metadata"],
): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  // Defense in depth — never trust caller filtering for secret-shaped keys.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (/token|secret|password|cookie|authorization/i.test(k)) continue;
    out[k] = v;
  }
  return out;
}

function optionalEmailHash(value: string | null | undefined): string | null {
  if (!value || value.trim().length === 0) return null;
  return hashAccountSecurityValue(value.trim().toLowerCase());
}

export async function createPrivacyRequest(
  input: PrivacyRequestInput,
  dbOverride?: D1DatabaseLike,
): Promise<CreatePrivacyRequestResult> {
  assertRequestKind(input.requestKind);
  const description = normalizeDescription(input.description);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const metadataJson = JSON.stringify(sanitizeMetadata(input.metadata));

  const db = dbOverride ?? (await getCloudflareD1Database());
  if (!db) {
    throw new Error("D1 database binding unavailable; privacy request not persisted.");
  }

  await db
    .prepare(
      `
        INSERT INTO privacy_requests (
          id, request_kind, status,
          requester_email_hash, requester_name, requester_user_id,
          description, workspace_id,
          ip_hash, user_agent_hash,
          metadata_json,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      id,
      input.requestKind,
      "submitted",
      optionalEmailHash(input.requesterEmail ?? null),
      input.requesterName?.trim() || null,
      input.requesterUserId || null,
      description,
      input.workspaceId || null,
      input.ipAddress ? hashAccountSecurityValue(input.ipAddress) : null,
      input.userAgent ? hashAccountSecurityValue(input.userAgent) : null,
      metadataJson,
      now,
      now,
    )
    .run();

  return { id, status: "submitted", createdAt: now };
}

export async function listPrivacyRequests(
  options: { status?: PrivacyRequestStatus; limit?: number } = {},
  dbOverride?: D1DatabaseLike,
): Promise<PrivacyRequestRow[]> {
  const db = dbOverride ?? (await getCloudflareD1Database());
  if (!db) return [];
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const sql = options.status
    ? `SELECT * FROM privacy_requests WHERE status = ? ORDER BY created_at DESC LIMIT ${limit}`
    : `SELECT * FROM privacy_requests ORDER BY created_at DESC LIMIT ${limit}`;
  const stmt = db.prepare(sql);
  const bound = options.status ? stmt.bind(options.status) : stmt;
  const result = await bound.all<Record<string, unknown>>();
  return (result.results ?? []) as unknown as PrivacyRequestRow[];
}
