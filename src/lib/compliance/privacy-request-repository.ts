import "server-only";

import { getCloudflareD1Database, type D1DatabaseLike } from "@/lib/cloudflare/d1";
import { hashAccountSecurityValue } from "@/lib/auth/account-audit";
import { anonymizeActivityActor, type ActivityOutboxDatabase } from "@/lib/activity/activity-outbox";
import { eraseActivationPrivacyData, exportActivationPrivacyData } from "@/lib/onboarding/activation-retention";
import { getSupportUploadsR2 } from "@/lib/email/support-outbound-attachments";
import {
  deleteSupportDraftsForPrivacyRequestInD1,
  listSupportDraftAttachmentKeysForPrivacyRequestInD1,
} from "@/lib/repositories/support-drafts-d1";
import {
  eraseSupportDataForPrivacyRequest,
  listSupportDataForPrivacyRequest,
} from "@/lib/repositories/support-conversations-repository";

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
  subjectVerification?: {
    method: "authenticated_session" | "admin_verified";
    verifiedByUserId: string;
  } | null;
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
  execution_revision: number;
  subject_verified_at: string | null;
  subject_verified_by: string | null;
  subject_verification_method: "authenticated_session" | "admin_verified" | null;
  execution_started_at: string | null;
  execution_error_code: string | null;
};

export type SupportPrivacyExportRow = {
  privacy_request_id: string;
  user_id: string;
  status: "ready" | "deleted";
  r2_key: string | null;
  sha256: string | null;
  size_bytes: number | null;
  created_at: string;
  expires_at: string;
  downloaded_at: string | null;
  deleted_at: string | null;
};

export type PrivacyRequestListRow = PrivacyRequestRow & {
  support_export_created_at: string | null;
  support_export_expires_at: string | null;
  support_export_ready: number;
};

export type CreatePrivacyRequestResult = {
  id: string;
  status: PrivacyRequestStatus;
  createdAt: string;
};

const REQUESTER_NAME_MAX = 200;
const REQUESTER_USER_ID_MAX = 128;
const WORKSPACE_ID_MAX = 128;
const USER_AGENT_MAX = 512;
const METADATA_MAX_KEYS = 16;
const METADATA_KEY_MAX = 64;
const METADATA_STRING_MAX = 512;
const METADATA_JSON_MAX = 4096;

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

function normalizeOptionalString(
  value: string | null | undefined,
  field: string,
  maxLength: number,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer`);
  }
  return trimmed;
}

function sanitizeMetadata(
  value: PrivacyRequestInput["metadata"],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  // Defense in depth — never trust caller filtering for secret-shaped keys.
  const entries = Object.entries(value);
  if (entries.length > METADATA_MAX_KEYS) {
    throw new Error(`metadata must contain ${METADATA_MAX_KEYS} keys or fewer`);
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    if (k.length === 0 || k.length > METADATA_KEY_MAX) {
      throw new Error(`metadata keys must be ${METADATA_KEY_MAX} characters or fewer`);
    }
    if (/token|secret|password|cookie|authorization/i.test(k)) continue;
    if (v == null || typeof v === "boolean") {
      out[k] = v;
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v;
      continue;
    }
    if (typeof v === "string") {
      if (v.length > METADATA_STRING_MAX) {
        throw new Error(`metadata string values must be ${METADATA_STRING_MAX} characters or fewer`);
      }
      out[k] = v;
      continue;
    }
    throw new Error("metadata values must be strings, finite numbers, booleans, or null");
  }
  if (JSON.stringify(out).length > METADATA_JSON_MAX) {
    throw new Error(`metadata JSON must be ${METADATA_JSON_MAX} characters or fewer`);
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
  const requesterName = normalizeOptionalString(input.requesterName, "requesterName", REQUESTER_NAME_MAX);
  const requesterUserId = normalizeOptionalString(input.requesterUserId, "requesterUserId", REQUESTER_USER_ID_MAX);
  const workspaceId = normalizeOptionalString(input.workspaceId, "workspaceId", WORKSPACE_ID_MAX);
  const userAgent = normalizeOptionalString(input.userAgent, "userAgent", USER_AGENT_MAX);
  const metadataJson = JSON.stringify(sanitizeMetadata(input.metadata));
  const subjectVerification = input.subjectVerification ?? null;
  if (subjectVerification && !requesterUserId) {
    throw new Error("Verified privacy requests require requesterUserId");
  }

  const db = dbOverride ?? (await getCloudflareD1Database());
  if (!db) {
    throw new Error("Something went wrong. Try again in a moment.");
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
          created_at, updated_at,
          subject_verified_at, subject_verified_by, subject_verification_method
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      id,
      input.requestKind,
      "submitted",
      optionalEmailHash(input.requesterEmail ?? null),
      requesterName,
      requesterUserId,
      description,
      workspaceId,
      input.ipAddress ? hashAccountSecurityValue(input.ipAddress) : null,
      userAgent ? hashAccountSecurityValue(userAgent) : null,
      metadataJson,
      now,
      now,
      subjectVerification ? now : null,
      subjectVerification?.verifiedByUserId ?? null,
      subjectVerification?.method ?? null,
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

export async function getPrivacyRequestById(
  id: string,
  dbOverride?: D1DatabaseLike,
): Promise<PrivacyRequestRow | null> {
  const db = dbOverride ?? (await getCloudflareD1Database());
  if (!db) return null;
  return db
    .prepare<PrivacyRequestRow>("SELECT * FROM privacy_requests WHERE id = ? LIMIT 1")
    .bind(id)
    .first<PrivacyRequestRow>();
}

export async function listPrivacyRequestsForUser(
  requesterUserId: string,
  dbOverride?: D1DatabaseLike,
): Promise<PrivacyRequestListRow[]> {
  const db = dbOverride ?? (await getCloudflareD1Database());
  if (!db) return [];
  const now = new Date().toISOString();
  const result = await db
    .prepare<PrivacyRequestListRow>(
      `SELECT request.*,
              export.created_at AS support_export_created_at,
              export.expires_at AS support_export_expires_at,
              CASE
                WHEN export.status = 'ready' AND export.expires_at > ? THEN 1
                ELSE 0
              END AS support_export_ready
       FROM privacy_requests request
       LEFT JOIN support_privacy_exports export
         ON export.privacy_request_id = request.id
       WHERE request.requester_user_id = ?
         AND request.subject_verified_at IS NOT NULL
       ORDER BY request.created_at DESC
       LIMIT 100`,
    )
    .bind(now, requesterUserId)
    .all<PrivacyRequestListRow>();
  return result.results ?? [];
}

export async function getSupportPrivacyExportByRequestId(
  privacyRequestId: string,
  dbOverride?: D1DatabaseLike,
): Promise<SupportPrivacyExportRow | null> {
  const db = dbOverride ?? (await getCloudflareD1Database());
  if (!db) return null;
  return db
    .prepare<SupportPrivacyExportRow>(
      `SELECT privacy_request_id, user_id, status, r2_key, sha256, size_bytes,
              created_at, expires_at, downloaded_at, deleted_at
       FROM support_privacy_exports
       WHERE privacy_request_id = ?
       LIMIT 1`,
    )
    .bind(privacyRequestId)
    .first<SupportPrivacyExportRow>();
}

export async function verifyPrivacyRequestSubject(input: {
  adminUserId: string;
  expectedRevision: number;
  privacyRequestId: string;
  requesterUserId: string;
  dbOverride?: D1DatabaseLike;
}): Promise<PrivacyRequestRow | null> {
  const db = input.dbOverride ?? (await getCloudflareD1Database());
  if (!db) throw new Error("Something went wrong. Try again in a moment.");
  const requesterUserId = normalizeOptionalString(
    input.requesterUserId,
    "requesterUserId",
    REQUESTER_USER_ID_MAX,
  );
  if (!requesterUserId) throw new Error("requesterUserId is required");
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE privacy_requests
       SET requester_user_id = ?,
           subject_verified_at = ?,
           subject_verified_by = ?,
           subject_verification_method = 'admin_verified',
           status = CASE WHEN status = 'submitted' THEN 'in_triage' ELSE status END,
           triaged_at = COALESCE(triaged_at, ?),
           triaged_by = COALESCE(triaged_by, ?),
           execution_revision = execution_revision + 1,
           updated_at = ?
       WHERE id = ?
         AND execution_revision = ?
         AND status IN ('submitted', 'in_triage')
         AND subject_verified_at IS NULL
         AND EXISTS (SELECT 1 FROM profiles profile WHERE profile.id = ?)`,
    )
    .bind(
      requesterUserId,
      now,
      input.adminUserId,
      now,
      input.adminUserId,
      now,
      input.privacyRequestId,
      input.expectedRevision,
      requesterUserId,
    )
    .run();
  if ((result.meta?.changes ?? 0) !== 1) return null;
  return getPrivacyRequestById(input.privacyRequestId, db);
}

export async function exportPrivacyRequestSupportData(requesterUserId: string, dbOverride?: D1DatabaseLike) {
  return listSupportDataForPrivacyRequest(requesterUserId, dbOverride);
}

export async function erasePrivacyRequestSupportData(requesterUserId: string, dbOverride?: D1DatabaseLike) {
  const db = dbOverride ?? await getCloudflareD1Database();
  if (!db) {
    return {
      data: { conversationsUpdated: 0, messagesUpdated: 0, draftsDeleted: 0 },
      error: "Support data could not be erased for privacy request.",
    };
  }

  const draftKeys = await listSupportDraftAttachmentKeysForPrivacyRequestInD1(db, requesterUserId);
  if (draftKeys.length > 0) {
    const r2 = await getSupportUploadsR2();
    if (!r2?.delete) {
      return {
        data: { conversationsUpdated: 0, messagesUpdated: 0, draftsDeleted: 0 },
        error: "Support draft storage is unavailable for privacy erasure.",
      };
    }
    try {
      await r2.delete(draftKeys);
    } catch {
      return {
        data: { conversationsUpdated: 0, messagesUpdated: 0, draftsDeleted: 0 },
        error: "Support draft attachments could not be erased.",
      };
    }
  }

  const erased = await eraseSupportDataForPrivacyRequest(requesterUserId, db);
  if (erased.error) return { data: { ...erased.data, draftsDeleted: 0 }, error: erased.error };
  try {
    const draftsDeleted = await deleteSupportDraftsForPrivacyRequestInD1(db, requesterUserId);
    return { data: { ...erased.data, draftsDeleted }, error: null };
  } catch {
    return {
      data: { ...erased.data, draftsDeleted: 0 },
      error: "Support draft rows could not be erased after attachment deletion.",
    };
  }
}

export type PrivacyActivityExportRow = {
  id: string;
  event_type: string;
  created_at: string;
  estimate_id: string;
  project_id: string;
};

export async function exportPrivacyRequestActivityData(
  input: { requesterUserId: string; workspaceId: string },
  dbOverride?: D1DatabaseLike,
): Promise<PrivacyActivityExportRow[]> {
  const db = dbOverride ?? await getCloudflareD1Database();
  if (!db) return [];
  const result = await db.prepare<PrivacyActivityExportRow>(
    `SELECT id, event_type, created_at, estimate_id, project_id
     FROM estimate_sheet_events
     WHERE workspace_id = ? AND actor_user_id = ?
     ORDER BY created_at ASC, id ASC`,
  ).bind(input.workspaceId, input.requesterUserId).all<PrivacyActivityExportRow>();
  return result.results ?? [];
}

export async function erasePrivacyRequestActivityData(
  input: { requesterUserId: string; workspaceId: string },
  dbOverride?: D1DatabaseLike,
): Promise<number> {
  const db = dbOverride ?? await getCloudflareD1Database();
  if (!db) return 0;
  return anonymizeActivityActor(db as unknown as ActivityOutboxDatabase, {
    actorUserId: input.requesterUserId,
    workspaceId: input.workspaceId,
  });
}

export async function exportPrivacyRequestActivationData(
  input: { requesterUserId: string; workspaceId: string },
  dbOverride?: D1DatabaseLike,
) {
  return exportActivationPrivacyData(dbOverride ?? await getCloudflareD1Database(), {
    userId: input.requesterUserId,
    workspaceId: input.workspaceId,
  });
}

export async function erasePrivacyRequestActivationData(
  input: { requesterUserId: string; workspaceId: string },
  dbOverride?: D1DatabaseLike,
) {
  return eraseActivationPrivacyData(dbOverride ?? await getCloudflareD1Database(), {
    userId: input.requesterUserId,
    workspaceId: input.workspaceId,
  });
}
