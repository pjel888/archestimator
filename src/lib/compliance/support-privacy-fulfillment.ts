import "server-only";

import { createHash } from "node:crypto";

import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import {
  getPrivacyRequestById,
  getSupportPrivacyExportByRequestId,
  type PrivacyRequestRow,
  type SupportPrivacyExportRow,
} from "@/lib/compliance/privacy-request-repository";
import {
  getSupportUploadsR2,
  type SupportR2BucketLike,
} from "@/lib/email/support-outbound-attachments";
import { createSupportPrivacyTarStream, type SupportPrivacyTarEntry } from "@/lib/compliance/support-privacy-tar";
import { SUPPORT_SCREENSHOT_OUTPUT_LIMIT } from "@/lib/support/intake-request";
import { readSupportPrivacyFence } from "@/lib/support/privacy-fence";
import {
  deleteSupportSubjectR2ObjectStatement,
  forgetSupportSubjectR2Object,
  markSupportSubjectR2ObjectStoredStatement,
  reserveSupportPrivacyExportR2Object,
  SUPPORT_SCREENSHOT_NORMALIZATION_SCHEMA,
} from "@/lib/support/subject-r2-registry";

const EXPORT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLAIM_QUIET_PERIOD_MS = 24 * 60 * 60 * 1000;
const EXECUTION_ATTEMPT_LEASE_MS = 60 * 60 * 1000;
const EXPORT_PREFIX = "support-privacy-export";
const EXPORT_ATTACHMENT_MAX_COUNT = 100;
const EXPORT_ATTACHMENT_TOTAL_LIMIT = 64 * 1024 * 1024;
const EXPORT_MANIFEST_LIMIT = 16 * 1024 * 1024;
const EXPORT_ARCHIVE_LIMIT = 96 * 1024 * 1024;
const ERASURE_MARKER = "[erased for verified privacy request]";
const LEGACY_ERASURE_MARKER = "[erased legacy feedback]";

export type SupportPrivacyExecutionKind = "access" | "portability" | "erasure";

export class SupportPrivacyFulfillmentError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 404 | 409 | 500 | 503 = 409,
  ) {
    super(code);
  }
}

type ActiveExecution = {
  attemptExpiresAt: string;
  attemptToken: string;
  generation: number;
  operation: "exporting" | "erasing";
  request: PrivacyRequestRow;
};

type ExportConversation = {
  channel: string;
  created_at: string;
  id: string;
  last_message_at: string;
  status: string;
  subject: string | null;
  updated_at: string;
};

type ExportMessage = {
  attachment_count: number;
  body_text: string;
  conversation_id: string;
  created_at: string;
  direction: string;
  id: string;
  sender_role: string;
  transport: string;
};

type ExportContext = {
  browser_family: string | null;
  created_at: string;
  diagnostics_shared: number;
  estimate_id: string | null;
  message_id: string;
  os_family: string | null;
  project_id: string | null;
  route_template: string;
  timezone: string | null;
  viewport_height: number | null;
  viewport_width: number | null;
  workspace_id: string | null;
};

type ExportTriage = {
  conversation_id: string;
  labels: string[];
  snoozed_until: string | null;
  starred_for_admin: number;
};

type ExportLegacyFeedback = {
  created_at: string;
  feedback_type: string;
  id: string;
  message: string;
  page_path: string | null;
  severity: string;
  status: string;
};

type ExportClaimSummary = {
  created_at: string;
  has_attachment: number;
  kind: string;
  state: string;
  updated_at: string;
};

type ExportAttachment = {
  content_type: string;
  created_at: string;
  filename: string;
  id: string;
  message_id: string;
  r2_key: string;
  sha256: string;
  size_bytes: number;
};

type SupportExportSnapshot = {
  attachments: ExportAttachment[];
  claims: ExportClaimSummary[];
  contexts: ExportContext[];
  conversations: ExportConversation[];
  draftCount: number;
  excludedAttachmentCount: number;
  legacyFeedback: ExportLegacyFeedback[];
  messages: ExportMessage[];
  triage: ExportTriage[];
};

type ErasureSnapshot = {
  betaFeedbackIds: string[];
  conversationIds: string[];
  objectKeys: string[];
  registryAttachmentIds: string[];
  registryKeys: string[];
  registryMessageIds: string[];
};

type ReconcileSummary = {
  candidates: number;
  completed: number;
  failed: number;
  skippedFenced: number;
};

function statement(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  return database.prepare(sql).bind(...values);
}

function casPreflight(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return statement(
    database,
    `SELECT CASE WHEN EXISTS (${sql}) THEN 1 ELSE json('support_privacy_cas_failed') END AS ok`,
    values,
  );
}

function logPrivacyOperation(
  event: string,
  context: { code?: string; generation?: number; operation?: string; privacyRequestId: string },
) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: context.code ? "warn" : "info",
    event,
    privacy_request_id: context.privacyRequestId,
    operation: context.operation,
    generation: context.generation,
    code: context.code,
  }));
}

function isExecutableKind(value: string): value is SupportPrivacyExecutionKind {
  return value === "access" || value === "portability" || value === "erasure";
}

function expectedFenceState(kind: SupportPrivacyExecutionKind) {
  return kind === "erasure" ? "erasing" as const : "exporting" as const;
}

function normalizeFailureCode(error: unknown) {
  if (error instanceof SupportPrivacyFulfillmentError) return error.code;
  return "support_privacy_operation_failed";
}

function createExecutionAttemptLease() {
  const now = new Date();
  return {
    expiresAt: new Date(now.getTime() + EXECUTION_ATTEMPT_LEASE_MS).toISOString(),
    startedAt: now.toISOString(),
    token: crypto.randomUUID(),
  };
}

async function assertActiveExecutionAttempt(input: {
  active: ActiveExecution;
  database: D1DatabaseLike;
}) {
  const active = await input.database.prepare<{ ok: number }>(
    `SELECT 1 AS ok
     FROM privacy_requests request
     INNER JOIN support_privacy_execution_attempts attempt
       ON attempt.privacy_request_id = request.id
     INNER JOIN support_subject_privacy_fences fence
       ON fence.user_id = request.requester_user_id
     WHERE request.id = ? AND request.status = 'in_progress'
       AND request.execution_revision = ?
       AND attempt.attempt_token = ?
       AND attempt.execution_revision = request.execution_revision
       AND attempt.lease_expires_at > ?
       AND fence.generation = ? AND fence.state = ?
       AND fence.privacy_request_id = request.id
     LIMIT 1`,
  ).bind(
    input.active.request.id,
    input.active.request.execution_revision,
    input.active.attemptToken,
    new Date().toISOString(),
    input.active.generation,
    input.active.operation,
  ).first<{ ok: number }>();
  if (!active) {
    throw new SupportPrivacyFulfillmentError("support_privacy_attempt_conflict", 409);
  }
}

async function assertNoReservedSubjectObjects(
  database: D1DatabaseLike,
  userId: string,
) {
  const row = await database.prepare<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM support_subject_r2_objects
     WHERE user_id = ? AND status = 'reserved'`,
  ).bind(userId).first<{ count: number }>();
  if ((row?.count ?? 0) > 0) {
    throw new SupportPrivacyFulfillmentError(
      "support_privacy_object_reconciliation_required",
      409,
    );
  }
}

async function startOrResumeExecution(input: {
  database: D1DatabaseLike;
  expectedRevision: number;
  privacyRequestId: string;
}): Promise<ActiveExecution> {
  const current = await getPrivacyRequestById(input.privacyRequestId, input.database);
  if (!current) throw new SupportPrivacyFulfillmentError("support_privacy_request_not_found", 404);
  if (!isExecutableKind(current.request_kind)) {
    throw new SupportPrivacyFulfillmentError("support_privacy_kind_not_executable", 400);
  }
  if (
    !current.requester_user_id
    || !current.subject_verified_at
    || !current.subject_verified_by
    || !current.subject_verification_method
  ) {
    throw new SupportPrivacyFulfillmentError("support_privacy_subject_unverified", 409);
  }
  if (current.execution_revision !== input.expectedRevision) {
    throw new SupportPrivacyFulfillmentError("support_privacy_revision_conflict", 409);
  }

  const operation = expectedFenceState(current.request_kind);
  const attempt = createExecutionAttemptLease();
  if (current.status === "in_progress") {
    const fence = await readSupportPrivacyFence(input.database, current.requester_user_id);
    if (
      !fence
      || fence.state !== operation
      || fence.privacy_request_id !== current.id
    ) {
      throw new SupportPrivacyFulfillmentError("support_privacy_fence_mismatch", 409);
    }
    const resumableSql = `(
      (request.execution_error_code IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM support_privacy_execution_attempts missing_attempt
        WHERE missing_attempt.privacy_request_id = request.id
      ))
      OR EXISTS (
        SELECT 1 FROM support_privacy_execution_attempts expired_attempt
        WHERE expired_attempt.privacy_request_id = request.id
          AND expired_attempt.execution_revision = request.execution_revision
          AND expired_attempt.lease_expires_at <= ?
      )
    )`;
    const preflight = casPreflight(
      input.database,
      `SELECT 1
       FROM privacy_requests request
       INNER JOIN support_subject_privacy_fences active_fence
         ON active_fence.user_id = request.requester_user_id
       WHERE request.id = ? AND request.execution_revision = ?
         AND request.status = 'in_progress'
         AND active_fence.state = ?
         AND active_fence.privacy_request_id = request.id
         AND ${resumableSql}`,
      [
        input.privacyRequestId,
        input.expectedRevision,
        operation,
        attempt.startedAt,
      ],
    );
    const updateRequest = statement(
      input.database,
      `UPDATE privacy_requests AS request
       SET execution_revision = execution_revision + 1,
           execution_started_at = ?, execution_error_code = NULL, updated_at = ?
       WHERE request.id = ? AND request.execution_revision = ?
         AND request.status = 'in_progress'
         AND ${resumableSql}`,
      [
        attempt.startedAt,
        attempt.startedAt,
        input.privacyRequestId,
        input.expectedRevision,
        attempt.startedAt,
      ],
    );
    const claimAttempt = statement(
      input.database,
      `INSERT INTO support_privacy_execution_attempts (
         privacy_request_id, attempt_token, execution_revision,
         lease_expires_at, created_at, updated_at
       )
       SELECT request.id, ?, request.execution_revision, ?, ?, ?
       FROM privacy_requests request
       INNER JOIN support_subject_privacy_fences active_fence
         ON active_fence.user_id = request.requester_user_id
       WHERE request.id = ? AND request.execution_revision = ?
         AND request.status = 'in_progress'
         AND active_fence.state = ?
         AND active_fence.privacy_request_id = request.id
       ON CONFLICT(privacy_request_id) DO UPDATE SET
         attempt_token = excluded.attempt_token,
         execution_revision = excluded.execution_revision,
         lease_expires_at = excluded.lease_expires_at,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at
       WHERE support_privacy_execution_attempts.execution_revision = ?
         AND support_privacy_execution_attempts.lease_expires_at <= ?`,
      [
        attempt.token,
        attempt.expiresAt,
        attempt.startedAt,
        attempt.startedAt,
        input.privacyRequestId,
        input.expectedRevision + 1,
        operation,
        input.expectedRevision,
        attempt.startedAt,
      ],
    );
    const results = await runRequiredD1Batch(
      input.database,
      [preflight, updateRequest, claimAttempt],
      "Privacy execution could not be resumed.",
    ).catch(() => {
      throw new SupportPrivacyFulfillmentError("support_privacy_attempt_conflict", 409);
    });
    if ((results[1]?.meta?.changes ?? 0) !== 1 || (results[2]?.meta?.changes ?? 0) !== 1) {
      throw new SupportPrivacyFulfillmentError("support_privacy_attempt_conflict", 409);
    }
    const request = await getPrivacyRequestById(input.privacyRequestId, input.database);
    if (!request || request.execution_revision !== input.expectedRevision + 1) {
      throw new SupportPrivacyFulfillmentError("support_privacy_attempt_conflict", 409);
    }
    logPrivacyOperation("support_privacy_execution_resumed", {
      generation: fence.generation,
      operation,
      privacyRequestId: request.id,
    });
    return {
      attemptExpiresAt: attempt.expiresAt,
      attemptToken: attempt.token,
      generation: fence.generation,
      operation,
      request,
    };
  }
  if (current.status !== "submitted" && current.status !== "in_triage") {
    throw new SupportPrivacyFulfillmentError("support_privacy_request_not_executable", 409);
  }

  const preflight = casPreflight(
    input.database,
    `SELECT 1
     FROM privacy_requests request
     WHERE request.id = ?
       AND request.execution_revision = ?
       AND request.status IN ('submitted', 'in_triage')
       AND request.requester_user_id IS NOT NULL
       AND request.subject_verified_at IS NOT NULL
       AND request.subject_verified_by IS NOT NULL
       AND request.subject_verification_method IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM support_privacy_execution_attempts active_attempt
         WHERE active_attempt.privacy_request_id = request.id
       )
       AND (
         NOT EXISTS (
           SELECT 1 FROM support_subject_privacy_fences missing_fence
           WHERE missing_fence.user_id = request.requester_user_id
         )
         OR EXISTS (
           SELECT 1 FROM support_subject_privacy_fences open_fence
           WHERE open_fence.user_id = request.requester_user_id
             AND open_fence.state = 'open'
         )
       )`,
    [input.privacyRequestId, input.expectedRevision],
  );
  const updateRequest = statement(
    input.database,
    `UPDATE privacy_requests
     SET status = 'in_progress', execution_revision = execution_revision + 1,
         execution_started_at = ?, execution_error_code = NULL, updated_at = ?
     WHERE id = ? AND execution_revision = ? AND status IN ('submitted', 'in_triage')`,
    [attempt.startedAt, attempt.startedAt, input.privacyRequestId, input.expectedRevision],
  );
  const updateFence = statement(
    input.database,
    `INSERT INTO support_subject_privacy_fences (
       user_id, generation, state, privacy_request_id, updated_at
     )
     SELECT requester_user_id, 1, ?, id, ?
     FROM privacy_requests
     WHERE id = ? AND execution_revision = ? AND status = 'in_progress'
     ON CONFLICT(user_id) DO UPDATE SET
       generation = support_subject_privacy_fences.generation + 1,
       state = excluded.state,
       privacy_request_id = excluded.privacy_request_id,
       updated_at = excluded.updated_at
     WHERE support_subject_privacy_fences.state = 'open'`,
    [operation, attempt.startedAt, input.privacyRequestId, input.expectedRevision + 1],
  );
  const claimAttempt = statement(
    input.database,
    `INSERT INTO support_privacy_execution_attempts (
       privacy_request_id, attempt_token, execution_revision,
       lease_expires_at, created_at, updated_at
     )
     SELECT request.id, ?, request.execution_revision, ?, ?, ?
     FROM privacy_requests request
     INNER JOIN support_subject_privacy_fences active_fence
       ON active_fence.user_id = request.requester_user_id
     WHERE request.id = ? AND request.execution_revision = ?
       AND request.status = 'in_progress'
       AND active_fence.state = ?
       AND active_fence.privacy_request_id = request.id`,
    [
      attempt.token,
      attempt.expiresAt,
      attempt.startedAt,
      attempt.startedAt,
      input.privacyRequestId,
      input.expectedRevision + 1,
      operation,
    ],
  );
  const results = await runRequiredD1Batch(
    input.database,
    [preflight, updateRequest, updateFence, claimAttempt],
    "Privacy execution could not be started.",
  ).catch(() => {
    throw new SupportPrivacyFulfillmentError("support_privacy_revision_conflict", 409);
  });
  if (
    (results[1]?.meta?.changes ?? 0) !== 1
    || (results[2]?.meta?.changes ?? 0) !== 1
    || (results[3]?.meta?.changes ?? 0) !== 1
  ) {
    throw new SupportPrivacyFulfillmentError("support_privacy_revision_conflict", 409);
  }

  const [request, fence] = await Promise.all([
    getPrivacyRequestById(input.privacyRequestId, input.database),
    readSupportPrivacyFence(input.database, current.requester_user_id),
  ]);
  if (!request || !fence || fence.state !== operation || fence.privacy_request_id !== request.id) {
    throw new SupportPrivacyFulfillmentError("support_privacy_fence_mismatch", 409);
  }
  logPrivacyOperation("support_privacy_execution_started", {
    generation: fence.generation,
    operation,
    privacyRequestId: request.id,
  });
  return {
    attemptExpiresAt: attempt.expiresAt,
    attemptToken: attempt.token,
    generation: fence.generation,
    operation,
    request,
  };
}

async function recordExecutionFailure(input: {
  active: ActiveExecution;
  code: string;
  database: D1DatabaseLike;
}) {
  const now = new Date().toISOString();
  const preflight = casPreflight(
    input.database,
    `SELECT 1
     FROM privacy_requests request
     INNER JOIN support_privacy_execution_attempts attempt
       ON attempt.privacy_request_id = request.id
     INNER JOIN support_subject_privacy_fences fence
       ON fence.user_id = request.requester_user_id
     WHERE request.id = ? AND request.status = 'in_progress'
       AND request.execution_revision = ?
       AND attempt.attempt_token = ?
       AND attempt.execution_revision = request.execution_revision
       AND fence.generation = ? AND fence.state = ?
       AND fence.privacy_request_id = request.id`,
    [
      input.active.request.id,
      input.active.request.execution_revision,
      input.active.attemptToken,
      input.active.generation,
      input.active.operation,
    ],
  );
  const updateRequest = statement(
    input.database,
    `UPDATE privacy_requests
     SET execution_error_code = ?, execution_revision = execution_revision + 1,
         updated_at = ?
     WHERE id = ? AND status = 'in_progress' AND execution_revision = ?
       AND EXISTS (
         SELECT 1 FROM support_privacy_execution_attempts attempt
         WHERE attempt.privacy_request_id = privacy_requests.id
           AND attempt.attempt_token = ?
           AND attempt.execution_revision = privacy_requests.execution_revision
       )`,
    [
      input.code.slice(0, 100),
      now,
      input.active.request.id,
      input.active.request.execution_revision,
      input.active.attemptToken,
    ],
  );
  const clearAttempt = statement(
    input.database,
    `DELETE FROM support_privacy_execution_attempts
     WHERE privacy_request_id = ? AND attempt_token = ? AND execution_revision = ?`,
    [
      input.active.request.id,
      input.active.attemptToken,
      input.active.request.execution_revision,
    ],
  );
  const results = await runRequiredD1Batch(
    input.database,
    [preflight, updateRequest, clearAttempt],
    "Privacy execution failure could not be recorded.",
  ).catch(() => []);
  if ((results[1]?.meta?.changes ?? 0) === 1 && (results[2]?.meta?.changes ?? 0) === 1) {
    input.active.request.execution_revision += 1;
    input.active.request.execution_error_code = input.code;
  }
  logPrivacyOperation("support_privacy_execution_failed", {
    code: input.code,
    generation: input.active.generation,
    operation: input.active.operation,
    privacyRequestId: input.active.request.id,
  });
}

async function completeExecution(input: { active: ActiveExecution; database: D1DatabaseLike }) {
  const now = new Date().toISOString();
  const preflight = casPreflight(
    input.database,
    `SELECT 1
     FROM privacy_requests request
     INNER JOIN support_privacy_execution_attempts attempt
       ON attempt.privacy_request_id = request.id
     INNER JOIN support_subject_privacy_fences fence
       ON fence.user_id = request.requester_user_id
     WHERE request.id = ? AND request.status = 'in_progress'
       AND request.execution_revision = ?
       AND attempt.attempt_token = ?
       AND attempt.execution_revision = request.execution_revision
       AND attempt.lease_expires_at > ?
       AND fence.generation = ? AND fence.state = ?
       AND fence.privacy_request_id = request.id`,
    [
      input.active.request.id,
      input.active.request.execution_revision,
      input.active.attemptToken,
      now,
      input.active.generation,
      input.active.operation,
    ],
  );
  const updateRequest = statement(
    input.database,
    `UPDATE privacy_requests
     SET status = 'completed', resolved_at = ?, execution_error_code = NULL,
         execution_revision = execution_revision + 1, updated_at = ?
     WHERE id = ? AND status = 'in_progress' AND execution_revision = ?`,
    [now, now, input.active.request.id, input.active.request.execution_revision],
  );
  const reopenFence = statement(
    input.database,
    `UPDATE support_subject_privacy_fences
     SET generation = generation + 1, state = 'open', privacy_request_id = NULL,
         updated_at = ?
     WHERE user_id = ? AND generation = ? AND state = ? AND privacy_request_id = ?`,
    [
      now,
      input.active.request.requester_user_id!,
      input.active.generation,
      input.active.operation,
      input.active.request.id,
    ],
  );
  const clearAttempt = statement(
    input.database,
    `DELETE FROM support_privacy_execution_attempts
     WHERE privacy_request_id = ? AND attempt_token = ? AND execution_revision = ?`,
    [
      input.active.request.id,
      input.active.attemptToken,
      input.active.request.execution_revision,
    ],
  );
  const results = await runRequiredD1Batch(
    input.database,
    [preflight, updateRequest, reopenFence, clearAttempt],
    "Privacy execution could not be completed.",
  );
  if (
    (results[1]?.meta?.changes ?? 0) !== 1
    || (results[2]?.meta?.changes ?? 0) !== 1
    || (results[3]?.meta?.changes ?? 0) !== 1
  ) {
    throw new SupportPrivacyFulfillmentError("support_privacy_completion_conflict", 409);
  }
  const completed = await getPrivacyRequestById(input.active.request.id, input.database);
  if (!completed || completed.status !== "completed") {
    throw new SupportPrivacyFulfillmentError("support_privacy_completion_unconfirmed", 500);
  }
  logPrivacyOperation("support_privacy_execution_completed", {
    generation: input.active.generation + 1,
    operation: input.active.operation,
    privacyRequestId: input.active.request.id,
  });
  return completed;
}

async function rows<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new SupportPrivacyFulfillmentError("support_privacy_enumeration_failed", 500);
  return result.results ?? [];
}

async function enumerateSupportExport(database: D1DatabaseLike, userId: string): Promise<SupportExportSnapshot> {
  const [
    attachments,
    claims,
    contexts,
    conversations,
    draftCountRows,
    excludedAttachmentRows,
    labels,
    legacyFeedback,
    messages,
    triageRows,
  ] = await Promise.all([
    rows<ExportAttachment>(database, `
      SELECT attachment.id, attachment.message_id, attachment.r2_key,
             attachment.filename, attachment.content_type, attachment.size_bytes,
             attachment.sha256, attachment.created_at
      FROM support_message_attachments attachment
      INNER JOIN support_messages message ON message.id = attachment.message_id
      INNER JOIN support_conversations conversation ON conversation.id = message.conversation_id
      WHERE conversation.user_id = ? AND attachment.storage_status = 'stored'
        AND attachment.content_type = 'image/webp' AND attachment.sha256 IS NOT NULL
        AND attachment.normalization_schema = ?
      ORDER BY attachment.created_at ASC, attachment.id ASC
      LIMIT ?`, [userId, SUPPORT_SCREENSHOT_NORMALIZATION_SCHEMA, EXPORT_ATTACHMENT_MAX_COUNT + 1]),
    rows<ExportClaimSummary>(database, `
      SELECT kind, state, CASE WHEN attachment_r2_key IS NULL THEN 0 ELSE 1 END AS has_attachment,
             created_at, updated_at
      FROM support_user_intake_claims
      WHERE user_id = ?
      ORDER BY created_at ASC, client_message_id ASC`, [userId]),
    rows<ExportContext>(database, `
      SELECT context.message_id, context.workspace_id, context.project_id,
             context.estimate_id, context.route_template, context.viewport_width,
             context.viewport_height, context.timezone, context.browser_family,
             context.os_family, context.diagnostics_shared, context.created_at
      FROM support_message_context context
      INNER JOIN support_messages message ON message.id = context.message_id
      INNER JOIN support_conversations conversation ON conversation.id = message.conversation_id
      WHERE conversation.user_id = ?
      ORDER BY context.created_at ASC, context.message_id ASC`, [userId]),
    rows<ExportConversation>(database, `
      SELECT id, status, channel, subject, last_message_at, created_at, updated_at
      FROM support_conversations WHERE user_id = ?
      ORDER BY created_at ASC, id ASC`, [userId]),
    rows<{ count: number }>(database, `
      SELECT COUNT(*) AS count
      FROM support_drafts draft
      INNER JOIN support_conversations conversation ON conversation.id = draft.conversation_id
      WHERE conversation.user_id = ?`, [userId]),
    rows<{ count: number }>(database, `
      SELECT COUNT(*) AS count
      FROM support_message_attachments attachment
      INNER JOIN support_messages message ON message.id = attachment.message_id
      INNER JOIN support_conversations conversation ON conversation.id = message.conversation_id
      WHERE conversation.user_id = ?
        AND NOT (
          attachment.storage_status = 'stored'
          AND attachment.content_type = 'image/webp'
          AND attachment.sha256 IS NOT NULL
          AND attachment.normalization_schema = ?
        )`, [userId, SUPPORT_SCREENSHOT_NORMALIZATION_SCHEMA]),
    rows<{ conversation_id: string; label: string }>(database, `
      SELECT label.conversation_id, label.label
      FROM support_conversation_labels label
      INNER JOIN support_conversations conversation ON conversation.id = label.conversation_id
      WHERE conversation.user_id = ?
      ORDER BY label.conversation_id ASC, label.label ASC`, [userId]),
    rows<ExportLegacyFeedback>(database, `
      SELECT id, feedback_type, severity, status, page_path, message, created_at
      FROM beta_feedback_submissions
      WHERE user_id = ?
      ORDER BY created_at ASC, id ASC`, [userId]),
    rows<ExportMessage>(database, `
      SELECT message.id, message.conversation_id, message.sender_role,
             message.body_text, message.direction, message.transport,
             message.attachment_count, message.created_at
      FROM support_messages message
      INNER JOIN support_conversations conversation ON conversation.id = message.conversation_id
      WHERE conversation.user_id = ? AND message.direction <> 'internal'
      ORDER BY message.created_at ASC, message.id ASC`, [userId]),
    rows<Omit<ExportTriage, "labels">>(database, `
      SELECT triage.conversation_id, triage.snoozed_until, triage.starred_for_admin
      FROM support_conversation_triage triage
      INNER JOIN support_conversations conversation ON conversation.id = triage.conversation_id
      WHERE conversation.user_id = ?
      ORDER BY triage.conversation_id ASC`, [userId]),
  ]);
  const labelsByConversation = new Map<string, string[]>();
  for (const row of labels) {
    const existing = labelsByConversation.get(row.conversation_id) ?? [];
    existing.push(row.label);
    labelsByConversation.set(row.conversation_id, existing);
  }
  if (attachments.length > EXPORT_ATTACHMENT_MAX_COUNT) {
    throw new SupportPrivacyFulfillmentError("support_privacy_export_attachment_count_limit", 409);
  }
  let attachmentBytes = 0;
  for (const attachment of attachments) {
    if (
      !Number.isInteger(attachment.size_bytes)
      || attachment.size_bytes <= 0
      || attachment.size_bytes > SUPPORT_SCREENSHOT_OUTPUT_LIMIT
      || !/^[a-f0-9]{64}$/u.test(attachment.sha256)
    ) {
      throw new SupportPrivacyFulfillmentError("support_privacy_export_attachment_invalid", 409);
    }
    attachmentBytes += attachment.size_bytes;
    if (attachmentBytes > EXPORT_ATTACHMENT_TOTAL_LIMIT) {
      throw new SupportPrivacyFulfillmentError("support_privacy_export_attachment_total_limit", 409);
    }
  }
  return {
    attachments,
    claims,
    contexts,
    conversations,
    draftCount: draftCountRows[0]?.count ?? 0,
    excludedAttachmentCount: excludedAttachmentRows[0]?.count ?? 0,
    legacyFeedback,
    messages,
    triage: triageRows.map((row) => ({
      ...row,
      labels: labelsByConversation.get(row.conversation_id) ?? [],
    })),
  };
}

function snapshotFingerprint(snapshot: SupportExportSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

async function confirmExportAttachments(r2: SupportR2BucketLike, attachments: ExportAttachment[]) {
  for (const attachment of attachments) {
    const object = await r2.get(attachment.r2_key);
    if (!object || (typeof object.size === "number" && object.size !== attachment.size_bytes)) {
      throw new SupportPrivacyFulfillmentError("support_privacy_attachment_missing", 409);
    }
    await object.body?.cancel().catch(() => undefined);
  }
}

function exportManifest(input: {
  active: ActiveExecution;
  createdAt: string;
  expiresAt: string;
  snapshot: SupportExportSnapshot;
}) {
  return {
    schema: "archestimator.support-privacy-export",
    version: 1,
    privacyRequest: {
      id: input.active.request.id,
      kind: input.active.request.request_kind,
      submittedAt: input.active.request.created_at,
      verifiedAt: input.active.request.subject_verified_at,
    },
    export: {
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      format: "application/x-tar",
      attachmentPolicy: "authorized normalized WebP only",
      attachmentLimits: {
        count: EXPORT_ATTACHMENT_MAX_COUNT,
        perFileBytes: SUPPORT_SCREENSHOT_OUTPUT_LIMIT,
        totalBytes: EXPORT_ATTACHMENT_TOTAL_LIMIT,
      },
    },
    support: {
      conversations: input.snapshot.conversations,
      messages: input.snapshot.messages,
      disclosedContexts: input.snapshot.contexts,
      triage: input.snapshot.triage,
      legacyFeedback: input.snapshot.legacyFeedback,
      intakeClaims: input.snapshot.claims,
      internalDraftCount: input.snapshot.draftCount,
      excludedAttachmentCount: input.snapshot.excludedAttachmentCount,
      attachments: input.snapshot.attachments.map((attachment) => ({
        id: attachment.id,
        messageId: attachment.message_id,
        path: `attachments/${attachment.id}.webp`,
        filename: attachment.filename,
        contentType: attachment.content_type,
        sizeBytes: attachment.size_bytes,
        sha256: attachment.sha256,
        createdAt: attachment.created_at,
      })),
    },
  };
}

async function* exportTarEntries(input: {
  manifestBytes: Uint8Array;
  r2: SupportR2BucketLike;
  snapshot: SupportExportSnapshot;
  timestamp: Date;
}): AsyncIterable<SupportPrivacyTarEntry> {
  yield {
    body: input.manifestBytes,
    modifiedAt: input.timestamp,
    path: "manifest.json",
    size: input.manifestBytes.byteLength,
  };
  for (const attachment of input.snapshot.attachments) {
    const object = await input.r2.get(attachment.r2_key);
    if (!object?.body) {
      throw new SupportPrivacyFulfillmentError("support_privacy_attachment_stream_unavailable", 503);
    }
    yield {
      body: object.body as ReadableStream<Uint8Array>,
      modifiedAt: new Date(attachment.created_at),
      path: `attachments/${attachment.id}.webp`,
      size: attachment.size_bytes,
    };
  }
}

async function deleteAndConfirmObject(r2: SupportR2BucketLike, key: string) {
  if (!r2.delete) throw new SupportPrivacyFulfillmentError("support_privacy_storage_delete_unavailable", 503);
  await r2.delete(key);
  const remaining = await r2.get(key);
  if (remaining) {
    await remaining.body?.cancel().catch(() => undefined);
    throw new SupportPrivacyFulfillmentError("support_privacy_object_delete_unconfirmed", 500);
  }
}

async function removeExistingRequestExport(input: {
  active: ActiveExecution;
  database: D1DatabaseLike;
  r2: SupportR2BucketLike;
}) {
  const existing = await getSupportPrivacyExportByRequestId(input.active.request.id, input.database);
  if (!existing || existing.status !== "ready" || !existing.r2_key) return;
  await assertActiveExecutionAttempt(input);
  await deleteAndConfirmObject(input.r2, existing.r2_key);
  const now = new Date().toISOString();
  const updateExport = input.database.prepare(
    `UPDATE support_privacy_exports
     SET status = 'deleted', r2_key = NULL, sha256 = NULL, size_bytes = NULL,
         deleted_at = ?
     WHERE privacy_request_id = ? AND status = 'ready' AND r2_key = ?
       AND EXISTS (
         SELECT 1
         FROM support_privacy_execution_attempts attempt
         WHERE attempt.privacy_request_id = support_privacy_exports.privacy_request_id
           AND attempt.attempt_token = ?
           AND attempt.execution_revision = ?
           AND attempt.lease_expires_at > ?
       )`,
  ).bind(
    now,
    input.active.request.id,
    existing.r2_key,
    input.active.attemptToken,
    input.active.request.execution_revision,
    now,
  );
  const deleteRegistry = deleteSupportSubjectR2ObjectStatement({
    database: input.database,
    r2Key: existing.r2_key,
    userId: existing.user_id,
  });
  const results = await runRequiredD1Batch(
    input.database,
    [updateExport, deleteRegistry],
    "Previous privacy export could not be retired.",
  );
  if ((results[0]?.meta?.changes ?? 0) !== 1) {
    throw new SupportPrivacyFulfillmentError("support_privacy_export_retire_conflict", 409);
  }
}

async function executeExport(input: {
  active: ActiveExecution;
  database: D1DatabaseLike;
  r2: SupportR2BucketLike;
}) {
  const userId = input.active.request.requester_user_id!;
  await assertActiveExecutionAttempt(input);
  await removeExistingRequestExport({
    active: input.active,
    database: input.database,
    r2: input.r2,
  });
  await assertNoReservedSubjectObjects(input.database, userId);
  const snapshot = await enumerateSupportExport(input.database, userId);
  await confirmExportAttachments(input.r2, snapshot.attachments);
  const timestamp = new Date();
  const createdAt = timestamp.toISOString();
  const expiresAt = new Date(timestamp.getTime() + EXPORT_RETENTION_MS).toISOString();
  const manifestBytes = new TextEncoder().encode(`${JSON.stringify(exportManifest({
    active: input.active,
    createdAt,
    expiresAt,
    snapshot,
  }), null, 2)}\n`);
  if (manifestBytes.byteLength > EXPORT_MANIFEST_LIMIT) {
    throw new SupportPrivacyFulfillmentError("support_privacy_export_manifest_limit", 409);
  }
  const existingReservation = await input.database.prepare<{ r2_key: string }>(
    `SELECT r2_key
     FROM support_subject_r2_objects
     WHERE user_id = ? AND source_kind = 'privacy_export' AND source_id = ?
     LIMIT 1`,
  ).bind(userId, input.active.request.id).first<{ r2_key: string }>();
  const objectKey = existingReservation?.r2_key
    ?? `${EXPORT_PREFIX}/${input.active.request.id}/${crypto.randomUUID()}.tar`;
  await reserveSupportPrivacyExportR2Object({
    attemptToken: input.active.attemptToken,
    database: input.database,
    executionRevision: input.active.request.execution_revision,
    generation: input.active.generation,
    privacyRequestId: input.active.request.id,
    r2Key: objectKey,
    userId,
  });
  const hash = createHash("sha256");
  let sizeBytes = 0;
  const meter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (sizeBytes + chunk.byteLength > EXPORT_ARCHIVE_LIMIT) {
        throw new SupportPrivacyFulfillmentError("support_privacy_export_archive_limit", 409);
      }
      hash.update(chunk);
      sizeBytes += chunk.byteLength;
      controller.enqueue(chunk);
    },
  });
  try {
    const tar = createSupportPrivacyTarStream(exportTarEntries({
      manifestBytes,
      r2: input.r2,
      snapshot,
      timestamp,
    }));
    await input.r2.put(objectKey, tar.pipeThrough(meter), {
      httpMetadata: { contentType: "application/x-tar", cacheControl: "private, no-store" },
    });
    const sha256 = hash.digest("hex");
    const secondSnapshot = await enumerateSupportExport(input.database, userId);
    if (snapshotFingerprint(secondSnapshot) !== snapshotFingerprint(snapshot)) {
      throw new SupportPrivacyFulfillmentError("support_privacy_export_enumeration_changed", 409);
    }
    await confirmExportAttachments(input.r2, secondSnapshot.attachments);
    const recordExport = input.database.prepare(
      `INSERT INTO support_privacy_exports (
         privacy_request_id, user_id, status, r2_key, sha256, size_bytes,
         created_at, expires_at, downloaded_at, deleted_at
       )
       SELECT ?, ?, 'ready', ?, ?, ?, ?, ?, NULL, NULL
       WHERE EXISTS (
         SELECT 1
         FROM support_subject_privacy_fences export_fence
         INNER JOIN support_privacy_execution_attempts export_attempt
           ON export_attempt.privacy_request_id = export_fence.privacy_request_id
         WHERE export_fence.user_id = ? AND export_fence.generation = ?
           AND export_fence.state = ? AND export_fence.privacy_request_id = ?
           AND export_attempt.attempt_token = ?
           AND export_attempt.execution_revision = ?
           AND export_attempt.lease_expires_at > ?
       )
       ON CONFLICT(privacy_request_id) DO UPDATE SET
         user_id = excluded.user_id, status = 'ready', r2_key = excluded.r2_key,
         sha256 = excluded.sha256, size_bytes = excluded.size_bytes,
         created_at = excluded.created_at, expires_at = excluded.expires_at,
         downloaded_at = NULL, deleted_at = NULL`,
    ).bind(
      input.active.request.id,
      userId,
      objectKey,
      sha256,
      sizeBytes,
      createdAt,
      expiresAt,
      userId,
      input.active.generation,
      input.active.operation,
      input.active.request.id,
      input.active.attemptToken,
      input.active.request.execution_revision,
      new Date().toISOString(),
    );
    const markStored = markSupportSubjectR2ObjectStoredStatement({
      database: input.database,
      r2Key: objectKey,
      sourceId: input.active.request.id,
      sourceKind: "privacy_export",
      storedAt: createdAt,
      userId,
    });
    const results = await runRequiredD1Batch(
      input.database,
      [recordExport, markStored],
      "Privacy export could not be recorded.",
    );
    if (results.some((result) => (result.meta?.changes ?? 0) !== 1)) {
      throw new SupportPrivacyFulfillmentError("support_privacy_export_record_conflict", 409);
    }
  } catch (error) {
    try {
      await deleteAndConfirmObject(input.r2, objectKey);
      await forgetSupportSubjectR2Object({
        database: input.database,
        r2Key: objectKey,
        userId,
      });
    } catch {
      // The durable reservation remains discoverable by erasure/cleanup.
    }
    throw error;
  }
}

async function stageErasureClaims(input: { active: ActiveExecution; database: D1DatabaseLike }) {
  await assertActiveExecutionAttempt(input);
  const now = new Date();
  const nowIso = now.toISOString();
  const quietAt = new Date(now.getTime() + CLAIM_QUIET_PERIOD_MS).toISOString();
  const quietCutoff = new Date(now.getTime() - CLAIM_QUIET_PERIOD_MS).toISOString();
  await input.database.prepare(
    `UPDATE support_user_intake_claims
     SET state = 'cleanup_fenced', lease_token = NULL, lease_expires_at = NULL,
         cleanup_not_before = COALESCE(cleanup_not_before, ?), updated_at = ?
     WHERE user_id = ? AND state IN ('reserved', 'abandoned')
       AND EXISTS (
         SELECT 1 FROM support_subject_privacy_fences fence
         WHERE fence.user_id = support_user_intake_claims.user_id
           AND fence.generation = ? AND fence.state = 'erasing'
           AND fence.privacy_request_id = ?
       )`,
  ).bind(
    quietAt,
    nowIso,
    input.active.request.requester_user_id!,
    input.active.generation,
    input.active.request.id,
  ).run();
  const pending = await input.database.prepare<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM support_user_intake_claims
     WHERE user_id = ? AND state = 'cleanup_fenced'
       AND cleanup_not_before > ?`,
  ).bind(input.active.request.requester_user_id!, nowIso).first<{ count: number }>();
  if ((pending?.count ?? 0) > 0) {
    throw new SupportPrivacyFulfillmentError("support_privacy_claim_quiet_period", 409);
  }
  const pendingObjects = await input.database.prepare<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM support_subject_r2_objects
     WHERE user_id = ? AND status = 'reserved' AND updated_at > ?`,
  ).bind(
    input.active.request.requester_user_id!,
    quietCutoff,
  ).first<{ count: number }>();
  if ((pendingObjects?.count ?? 0) > 0) {
    throw new SupportPrivacyFulfillmentError("support_privacy_object_quiet_period", 409);
  }
}

async function enumerateErasureSnapshot(
  database: D1DatabaseLike,
  userId: string,
): Promise<ErasureSnapshot> {
  const [conversationRows, betaRows, objectRows, registryRows, registryMessageRows] = await Promise.all([
    rows<{ id: string }>(database, "SELECT id FROM support_conversations WHERE user_id = ? ORDER BY id", [userId]),
    rows<{ id: string }>(database, "SELECT id FROM beta_feedback_submissions WHERE user_id = ? ORDER BY id", [userId]),
    rows<{ r2_key: string }>(database, `
      SELECT attachment.r2_key
      FROM support_message_attachments attachment
      INNER JOIN support_messages message ON message.id = attachment.message_id
      INNER JOIN support_conversations conversation ON conversation.id = message.conversation_id
      WHERE conversation.user_id = ?
      UNION
      SELECT attachment.r2_key
      FROM support_draft_attachments attachment
      INNER JOIN support_drafts draft ON draft.id = attachment.draft_id
      INNER JOIN support_conversations conversation ON conversation.id = draft.conversation_id
      WHERE conversation.user_id = ?
      UNION
      SELECT attachment_r2_key
      FROM support_user_intake_claims
      WHERE user_id = ? AND attachment_r2_key IS NOT NULL
      UNION
      SELECT r2_key
      FROM support_privacy_exports
      WHERE user_id = ? AND status = 'ready' AND r2_key IS NOT NULL
      ORDER BY r2_key`, [userId, userId, userId, userId]),
    rows<{ r2_key: string; source_id: string; source_kind: string }>(database, `
      SELECT r2_key, source_id, source_kind
      FROM support_subject_r2_objects
      WHERE user_id = ?
      ORDER BY r2_key`, [userId]),
    rows<{ message_id: string }>(database, `
      SELECT DISTINCT attachment.message_id
      FROM support_subject_r2_objects registry
      INNER JOIN support_message_attachments attachment
        ON attachment.id = registry.source_id
      WHERE registry.user_id = ?
        AND registry.source_kind IN (
          'user_screenshot', 'message_attachment',
          'inbound_attachment', 'outbound_attachment'
        )
      ORDER BY attachment.message_id`, [userId]),
  ]);
  const registryKeys = registryRows.map((row) => row.r2_key);
  return {
    betaFeedbackIds: betaRows.map((row) => row.id),
    conversationIds: conversationRows.map((row) => row.id),
    objectKeys: [...new Set([
      ...objectRows.map((row) => row.r2_key),
      ...registryKeys,
    ])].sort(),
    registryAttachmentIds: registryRows
      .filter((row) => [
        "user_screenshot",
        "message_attachment",
        "inbound_attachment",
        "outbound_attachment",
      ].includes(row.source_kind))
      .map((row) => row.source_id),
    registryKeys,
    registryMessageIds: registryMessageRows.map((row) => row.message_id),
  };
}

function placeholders(values: string[]) {
  return values.map(() => "?").join(", ");
}

function durableRateKey(scope: string, userId: string) {
  return createHash("sha256").update(`${scope}\u001f${userId}`).digest("base64url");
}

async function redactErasureData(input: {
  active: ActiveExecution;
  database: D1DatabaseLike;
  snapshot: ErasureSnapshot;
}) {
  const userId = input.active.request.requester_user_id!;
  const now = new Date().toISOString();
  const conversationSql = input.snapshot.conversationIds.length > 0
    ? placeholders(input.snapshot.conversationIds)
    : "NULL";
  const betaSql = input.snapshot.betaFeedbackIds.length > 0
    ? placeholders(input.snapshot.betaFeedbackIds)
    : "NULL";
  const registrySql = input.snapshot.registryKeys.length > 0
    ? placeholders(input.snapshot.registryKeys)
    : "NULL";
  const preflight = casPreflight(
    input.database,
    `SELECT 1
     FROM support_subject_privacy_fences fence
     INNER JOIN support_privacy_execution_attempts attempt
       ON attempt.privacy_request_id = fence.privacy_request_id
     WHERE fence.user_id = ? AND fence.generation = ? AND fence.state = 'erasing'
       AND fence.privacy_request_id = ?
       AND attempt.attempt_token = ? AND attempt.execution_revision = ?
       AND attempt.lease_expires_at > ?`,
    [
      userId,
      input.active.generation,
      input.active.request.id,
      input.active.attemptToken,
      input.active.request.execution_revision,
      now,
    ],
  );
  const statements: D1PreparedStatementLike[] = [preflight];
  statements.push(statement(input.database,
    `DELETE FROM support_message_context
     WHERE message_id IN (SELECT id FROM support_messages WHERE conversation_id IN (${conversationSql}))`,
    input.snapshot.conversationIds,
  ));
  statements.push(statement(input.database,
    `UPDATE support_messages
     SET attachment_count = (
       SELECT COUNT(*)
       FROM support_message_attachments retained_attachment
       WHERE retained_attachment.message_id = support_messages.id
         AND retained_attachment.id NOT IN (
           SELECT registry.source_id
           FROM support_subject_r2_objects registry
           WHERE registry.user_id = ?
             AND registry.source_kind IN (
               'user_screenshot', 'message_attachment',
               'inbound_attachment', 'outbound_attachment'
             )
         )
     )
     WHERE EXISTS (
       SELECT 1
       FROM support_message_attachments owned_attachment
       INNER JOIN support_subject_r2_objects registry
         ON registry.source_id = owned_attachment.id
       WHERE owned_attachment.message_id = support_messages.id
         AND registry.user_id = ?
         AND registry.source_kind IN (
           'user_screenshot', 'message_attachment',
           'inbound_attachment', 'outbound_attachment'
         )
     )`,
    [userId, userId],
  ));
  statements.push(statement(input.database,
    `DELETE FROM support_message_attachments
     WHERE id IN (
       SELECT registry.source_id
       FROM support_subject_r2_objects registry
       WHERE registry.user_id = ?
         AND registry.source_kind IN (
           'user_screenshot', 'message_attachment',
           'inbound_attachment', 'outbound_attachment'
         )
     )`,
    [userId],
  ));
  statements.push(statement(input.database,
    `DELETE FROM support_message_attachments
     WHERE message_id IN (SELECT id FROM support_messages WHERE conversation_id IN (${conversationSql}))`,
    input.snapshot.conversationIds,
  ));
  statements.push(statement(input.database,
    `DELETE FROM support_subject_r2_objects
     WHERE user_id = ? AND r2_key IN (${registrySql})`,
    [userId, ...input.snapshot.registryKeys],
  ));
  statements.push(statement(input.database,
    `DELETE FROM support_drafts WHERE conversation_id IN (${conversationSql})`,
    input.snapshot.conversationIds,
  ));
  statements.push(statement(input.database,
    "DELETE FROM support_user_intake_claims WHERE user_id = ?",
    [userId],
  ));
  statements.push(statement(input.database,
    `DELETE FROM support_conversation_labels WHERE conversation_id IN (${conversationSql})`,
    input.snapshot.conversationIds,
  ));
  statements.push(statement(input.database,
    `DELETE FROM support_conversation_triage WHERE conversation_id IN (${conversationSql})`,
    input.snapshot.conversationIds,
  ));
  statements.push(statement(input.database,
    `UPDATE support_messages
     SET author_user_id = NULL, body_text = ?, body_html = NULL,
         email_message_id = NULL, client_message_id = NULL,
         mailbox_address = NULL, from_address = NULL, from_name = NULL,
         to_json = NULL, cc_json = NULL, internet_message_id = NULL,
         in_reply_to = NULL, references_json = NULL, ingest_key = NULL,
         attachment_count = 0, provider_name = NULL, warning_flags_json = NULL
     WHERE conversation_id IN (${conversationSql})`,
    [ERASURE_MARKER, ...input.snapshot.conversationIds],
  ));
  statements.push(statement(input.database,
    `UPDATE support_conversations
     SET user_id = NULL, requester_email = NULL, requester_name = NULL,
         subject = ?, routing_token = NULL, status = 'archived', unread_for_admin = 0,
         unread_for_user = 0, updated_at = ?
     WHERE id IN (${conversationSql}) AND user_id = ?`,
    [ERASURE_MARKER, now, ...input.snapshot.conversationIds, userId],
  ));
  statements.push(statement(input.database,
    `UPDATE beta_feedback_submissions
     SET user_id = '[erased]', workspace_id = NULL, project_id = NULL,
         user_email = '[erased]', page_path = NULL, message = ?,
         metadata_json = '{}', updated_at = ?
     WHERE id IN (${betaSql}) AND user_id = ?`,
    [LEGACY_ERASURE_MARKER, now, ...input.snapshot.betaFeedbackIds, userId],
  ));
  statements.push(statement(input.database,
    `UPDATE admin_action_items
     SET title = 'Erased support request', detail = NULL, href = NULL,
         status = 'resolved', snooze_until = NULL,
         resolved_at = COALESCE(resolved_at, ?), updated_at = ?
     WHERE source_kind = 'support' AND source_id IN (${conversationSql})`,
    [now, now, ...input.snapshot.conversationIds],
  ));
  statements.push(statement(input.database,
    `DELETE FROM security_rate_limit_events
     WHERE (scope = 'support:user-message' AND key_hash = ?)
        OR (scope = 'support:user-screenshot' AND key_hash = ?)`,
    [
      durableRateKey("support:user-message", userId),
      durableRateKey("support:user-screenshot", userId),
    ],
  ));
  statements.push(statement(input.database,
    `UPDATE support_privacy_exports
     SET status = 'deleted', r2_key = NULL, sha256 = NULL, size_bytes = NULL,
         deleted_at = COALESCE(deleted_at, ?)
     WHERE user_id = ?`,
    [now, userId],
  ));
  statements.push(statement(input.database,
    `UPDATE privacy_requests
     SET requester_email_hash = NULL, requester_name = NULL, description = ?,
         workspace_id = NULL, ip_hash = NULL, user_agent_hash = NULL,
         metadata_json = '{}', updated_at = ?
     WHERE id = ? AND status = 'in_progress' AND execution_revision = ?`,
    [ERASURE_MARKER, now, input.active.request.id, input.active.request.execution_revision],
  ));
  await runRequiredD1Batch(input.database, statements, "Privacy erasure could not be committed.");
}

async function verifyErasureD1(input: {
  active: ActiveExecution;
  database: D1DatabaseLike;
  snapshot: ErasureSnapshot;
}) {
  const userId = input.active.request.requester_user_id!;
  const conversationSql = input.snapshot.conversationIds.length > 0
    ? placeholders(input.snapshot.conversationIds)
    : "NULL";
  const betaSql = input.snapshot.betaFeedbackIds.length > 0
    ? placeholders(input.snapshot.betaFeedbackIds)
    : "NULL";
  const registryAttachmentSql = input.snapshot.registryAttachmentIds.length > 0
    ? placeholders(input.snapshot.registryAttachmentIds)
    : "NULL";
  const registryMessageSql = input.snapshot.registryMessageIds.length > 0
    ? placeholders(input.snapshot.registryMessageIds)
    : "NULL";
  const checks = await Promise.all([
    input.database.prepare<{ count: number }>(
      "SELECT COUNT(*) AS count FROM support_conversations WHERE user_id = ?",
    ).bind(userId).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(
      "SELECT COUNT(*) AS count FROM support_user_intake_claims WHERE user_id = ?",
    ).bind(userId).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(
      "SELECT COUNT(*) AS count FROM beta_feedback_submissions WHERE user_id = ?",
    ).bind(userId).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count FROM support_conversations
      WHERE id IN (${conversationSql})
        AND (user_id IS NOT NULL OR requester_email IS NOT NULL
          OR requester_name IS NOT NULL OR routing_token IS NOT NULL OR subject <> ?)
    `).bind(...input.snapshot.conversationIds, ERASURE_MARKER).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count FROM support_messages
      WHERE conversation_id IN (${conversationSql})
        AND (body_text <> ? OR body_html IS NOT NULL OR author_user_id IS NOT NULL
          OR email_message_id IS NOT NULL OR client_message_id IS NOT NULL
          OR mailbox_address IS NOT NULL OR from_address IS NOT NULL
          OR from_name IS NOT NULL OR to_json IS NOT NULL OR cc_json IS NOT NULL
          OR internet_message_id IS NOT NULL OR in_reply_to IS NOT NULL
          OR references_json IS NOT NULL OR ingest_key IS NOT NULL
          OR provider_name IS NOT NULL OR warning_flags_json IS NOT NULL
          OR attachment_count <> 0)
    `).bind(...input.snapshot.conversationIds, ERASURE_MARKER).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM support_message_context context
      INNER JOIN support_messages message ON message.id = context.message_id
      WHERE message.conversation_id IN (${conversationSql})
    `).bind(...input.snapshot.conversationIds).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM support_message_attachments attachment
      INNER JOIN support_messages message ON message.id = attachment.message_id
      WHERE message.conversation_id IN (${conversationSql})
    `).bind(...input.snapshot.conversationIds).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM support_message_attachments
      WHERE id IN (${registryAttachmentSql})
    `).bind(...input.snapshot.registryAttachmentIds).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM support_messages message
      WHERE message.id IN (${registryMessageSql})
        AND message.attachment_count <> (
          SELECT COUNT(*) FROM support_message_attachments attachment
          WHERE attachment.message_id = message.id
        )
    `).bind(...input.snapshot.registryMessageIds).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count FROM support_drafts WHERE conversation_id IN (${conversationSql})
    `).bind(...input.snapshot.conversationIds).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(`
      SELECT COUNT(*) AS count FROM beta_feedback_submissions
      WHERE id IN (${betaSql})
        AND (user_id <> '[erased]' OR user_email <> '[erased]' OR page_path IS NOT NULL
          OR message <> ? OR metadata_json <> '{}')
    `).bind(...input.snapshot.betaFeedbackIds, LEGACY_ERASURE_MARKER).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(
      "SELECT COUNT(*) AS count FROM support_privacy_exports WHERE user_id = ? AND (status <> 'deleted' OR r2_key IS NOT NULL)",
    ).bind(userId).first<{ count: number }>(),
    input.database.prepare<{ count: number }>(
      "SELECT COUNT(*) AS count FROM support_subject_r2_objects WHERE user_id = ?",
    ).bind(userId).first<{ count: number }>(),
  ]);
  if (checks.some((check) => (check?.count ?? 0) !== 0)) {
    throw new SupportPrivacyFulfillmentError("support_privacy_erasure_residue", 500);
  }
}

async function executeErasure(input: {
  active: ActiveExecution;
  database: D1DatabaseLike;
  r2: SupportR2BucketLike;
}) {
  await stageErasureClaims({ active: input.active, database: input.database });
  const snapshot = await enumerateErasureSnapshot(
    input.database,
    input.active.request.requester_user_id!,
  );
  for (const key of snapshot.objectKeys) {
    await assertActiveExecutionAttempt(input);
    await deleteAndConfirmObject(input.r2, key);
  }
  await assertActiveExecutionAttempt(input);
  await redactErasureData({ active: input.active, database: input.database, snapshot });
  await verifyErasureD1({ active: input.active, database: input.database, snapshot });
  for (const key of snapshot.objectKeys) {
    const remaining = await input.r2.get(key);
    if (remaining) {
      await remaining.body?.cancel().catch(() => undefined);
      throw new SupportPrivacyFulfillmentError("support_privacy_erasure_object_residue", 500);
    }
  }
  const second = await enumerateErasureSnapshot(
    input.database,
    input.active.request.requester_user_id!,
  );
  if (
    second.objectKeys.length > 0
    || second.registryKeys.length > 0
    || second.conversationIds.length > 0
    || second.betaFeedbackIds.length > 0
  ) {
    throw new SupportPrivacyFulfillmentError("support_privacy_erasure_reenumeration_failed", 500);
  }
}

export async function executeSupportPrivacyRequest(input: {
  database: D1DatabaseLike;
  expectedRevision: number;
  privacyRequestId: string;
}): Promise<PrivacyRequestRow> {
  const active = await startOrResumeExecution(input);
  const r2 = await getSupportUploadsR2();
  if (!r2) {
    await recordExecutionFailure({
      active,
      code: "support_privacy_storage_unavailable",
      database: input.database,
    });
    throw new SupportPrivacyFulfillmentError("support_privacy_storage_unavailable", 503);
  }
  try {
    if (active.operation === "erasing") {
      await executeErasure({ active, database: input.database, r2 });
    } else {
      await executeExport({ active, database: input.database, r2 });
    }
    return await completeExecution({ active, database: input.database });
  } catch (error) {
    const code = normalizeFailureCode(error);
    await recordExecutionFailure({ active, code, database: input.database });
    if (error instanceof SupportPrivacyFulfillmentError) throw error;
    throw new SupportPrivacyFulfillmentError(code, 500);
  }
}

async function expiredExportCandidates(database: D1DatabaseLike, now: string, limit: number) {
  return rows<SupportPrivacyExportRow>(database, `
    SELECT privacy_request_id, user_id, status, r2_key, sha256, size_bytes,
           created_at, expires_at, downloaded_at, deleted_at
    FROM support_privacy_exports
    WHERE status = 'ready' AND expires_at <= ? AND r2_key IS NOT NULL
    ORDER BY expires_at ASC, privacy_request_id ASC
    LIMIT ?`, [now, limit]);
}

async function orphanedExportReservationCandidates(
  database: D1DatabaseLike,
  now: string,
  limit: number,
) {
  const quietCutoff = new Date(Date.parse(now) - CLAIM_QUIET_PERIOD_MS).toISOString();
  return rows<{ r2_key: string; user_id: string }>(database, `
    SELECT registry.r2_key, registry.user_id
    FROM support_subject_r2_objects registry
    WHERE registry.source_kind = 'privacy_export'
      AND registry.updated_at <= ?
      AND NOT EXISTS (
        SELECT 1 FROM support_privacy_exports privacy_export
        WHERE privacy_export.privacy_request_id = registry.source_id
          AND privacy_export.status = 'ready'
          AND privacy_export.r2_key = registry.r2_key
      )
      AND NOT EXISTS (
        SELECT 1 FROM support_privacy_execution_attempts attempt
        WHERE attempt.privacy_request_id = registry.source_id
          AND attempt.lease_expires_at > ?
      )
    ORDER BY registry.updated_at ASC, registry.r2_key ASC
    LIMIT ?`, [quietCutoff, now, limit]);
}

async function staleSubjectObjectCandidates(
  database: D1DatabaseLike,
  now: string,
  limit: number,
) {
  const quietCutoff = new Date(Date.parse(now) - CLAIM_QUIET_PERIOD_MS).toISOString();
  return rows<{ r2_key: string; user_id: string }>(database, `
    SELECT registry.r2_key, registry.user_id
    FROM support_subject_r2_objects registry
    INNER JOIN support_subject_privacy_fences fence
      ON fence.user_id = registry.user_id
    WHERE registry.source_kind <> 'privacy_export'
      AND registry.updated_at <= ?
      AND fence.state = 'open'
      AND (
        registry.status = 'reserved'
        OR (
          registry.status = 'stored'
          AND registry.source_kind = 'admin_draft_attachment'
          AND (
            NOT EXISTS (
              SELECT 1 FROM support_draft_attachments draft_attachment
              WHERE draft_attachment.id = registry.source_id
            )
            OR EXISTS (
              SELECT 1
              FROM support_draft_attachments draft_attachment
              INNER JOIN support_drafts draft ON draft.id = draft_attachment.draft_id
              WHERE draft_attachment.id = registry.source_id
                AND draft.lifecycle = 'consumed'
            )
          )
        )
        OR (
          registry.status = 'stored'
          AND registry.source_kind IN (
            'user_screenshot', 'message_attachment',
            'inbound_attachment', 'outbound_attachment'
          )
          AND NOT EXISTS (
            SELECT 1 FROM support_message_attachments message_attachment
            WHERE message_attachment.id = registry.source_id
          )
        )
      )
    ORDER BY registry.updated_at ASC, registry.r2_key ASC
    LIMIT ?`, [quietCutoff, limit]);
}

async function reconcileStaleSubjectObjects(input: {
  database: D1DatabaseLike;
  dryRun: boolean;
  limit: number;
  now: string;
  r2: SupportR2BucketLike | null;
}): Promise<ReconcileSummary> {
  const candidates = await staleSubjectObjectCandidates(
    input.database,
    input.now,
    input.limit,
  );
  const summary: ReconcileSummary = {
    candidates: candidates.length,
    completed: 0,
    failed: 0,
    skippedFenced: 0,
  };
  if (input.dryRun) return summary;
  if (!input.r2) return { ...summary, failed: candidates.length };
  for (const candidate of candidates) {
    try {
      await deleteAndConfirmObject(input.r2, candidate.r2_key);
      const result = await deleteSupportSubjectR2ObjectStatement({
        database: input.database,
        r2Key: candidate.r2_key,
        userId: candidate.user_id,
      }).run();
      if ((result.meta?.changes ?? 0) === 1) summary.completed += 1;
      else summary.failed += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

async function reconcileExpiredExports(input: {
  database: D1DatabaseLike;
  dryRun: boolean;
  limit: number;
  now: string;
  r2: SupportR2BucketLike | null;
}): Promise<ReconcileSummary> {
  const candidates = await expiredExportCandidates(input.database, input.now, input.limit);
  const orphaned = await orphanedExportReservationCandidates(
    input.database,
    input.now,
    Math.max(0, input.limit - candidates.length),
  );
  const summary: ReconcileSummary = {
    candidates: candidates.length + orphaned.length,
    completed: 0,
    failed: 0,
    skippedFenced: 0,
  };
  if (input.dryRun) return summary;
  if (!input.r2) return { ...summary, failed: summary.candidates };
  for (const candidate of candidates) {
    if (!candidate.r2_key) continue;
    try {
      await deleteAndConfirmObject(input.r2, candidate.r2_key);
      const updateExport = input.database.prepare(
        `UPDATE support_privacy_exports
         SET status = 'deleted', r2_key = NULL, sha256 = NULL, size_bytes = NULL,
             deleted_at = ?
         WHERE privacy_request_id = ? AND status = 'ready' AND r2_key = ? AND expires_at <= ?`,
      ).bind(input.now, candidate.privacy_request_id, candidate.r2_key, input.now);
      const deleteRegistry = deleteSupportSubjectR2ObjectStatement({
        database: input.database,
        r2Key: candidate.r2_key,
        userId: candidate.user_id,
      });
      const results = await runRequiredD1Batch(
        input.database,
        [updateExport, deleteRegistry],
        "Expired privacy export could not be retired.",
      );
      if ((results[0]?.meta?.changes ?? 0) === 1) summary.completed += 1;
      else summary.failed += 1;
    } catch {
      summary.failed += 1;
    }
  }
  for (const candidate of orphaned) {
    try {
      await deleteAndConfirmObject(input.r2, candidate.r2_key);
      const result = await deleteSupportSubjectR2ObjectStatement({
        database: input.database,
        r2Key: candidate.r2_key,
        userId: candidate.user_id,
      }).run();
      if ((result.meta?.changes ?? 0) === 1) summary.completed += 1;
      else summary.failed += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

async function reconcileStaleClaims(input: {
  database: D1DatabaseLike;
  dryRun: boolean;
  limit: number;
  now: string;
  r2: SupportR2BucketLike | null;
}): Promise<ReconcileSummary> {
  const leaseCutoff = new Date(Date.parse(input.now) - CLAIM_QUIET_PERIOD_MS).toISOString();
  const reserveCandidates = await rows<{
    attachment_r2_key: string | null;
    client_message_id: string;
    privacy_generation: number;
    user_id: string;
  }>(input.database, `
    SELECT claim.user_id, claim.client_message_id, claim.attachment_r2_key, claim.privacy_generation
    FROM support_user_intake_claims claim
    INNER JOIN support_subject_privacy_fences fence ON fence.user_id = claim.user_id
    WHERE claim.state = 'reserved' AND claim.lease_expires_at < ?
      AND claim.updated_at < ? AND fence.state = 'open'
      AND fence.generation = claim.privacy_generation
    ORDER BY claim.updated_at ASC
    LIMIT ?`, [input.now, leaseCutoff, input.limit]);
  const cleanupCandidates = await rows<{
    attachment_r2_key: string | null;
    client_message_id: string;
    privacy_generation: number;
    user_id: string;
  }>(input.database, `
    SELECT claim.user_id, claim.client_message_id, claim.attachment_r2_key, claim.privacy_generation
    FROM support_user_intake_claims claim
    INNER JOIN support_subject_privacy_fences fence ON fence.user_id = claim.user_id
    WHERE claim.state = 'cleanup_fenced' AND claim.cleanup_not_before <= ?
      AND fence.state = 'open' AND fence.generation = claim.privacy_generation
    ORDER BY claim.cleanup_not_before ASC
    LIMIT ?`, [input.now, input.limit]);
  const summary: ReconcileSummary = {
    candidates: reserveCandidates.length + cleanupCandidates.length,
    completed: 0,
    failed: 0,
    skippedFenced: 0,
  };
  if (input.dryRun) return summary;

  for (const candidate of reserveCandidates) {
    const result = await input.database.prepare(
      `UPDATE support_user_intake_claims
       SET state = 'cleanup_fenced', lease_token = NULL, lease_expires_at = NULL,
           cleanup_not_before = ?, updated_at = ?
       WHERE user_id = ? AND client_message_id = ? AND state = 'reserved'
         AND privacy_generation = ?
         AND EXISTS (
           SELECT 1 FROM support_subject_privacy_fences fence
           WHERE fence.user_id = support_user_intake_claims.user_id
             AND fence.state = 'open' AND fence.generation = support_user_intake_claims.privacy_generation
         )`,
    ).bind(
      new Date(Date.parse(input.now) + CLAIM_QUIET_PERIOD_MS).toISOString(),
      input.now,
      candidate.user_id,
      candidate.client_message_id,
      candidate.privacy_generation,
    ).run();
    if ((result.meta?.changes ?? 0) === 1) summary.completed += 1;
    else summary.skippedFenced += 1;
  }

  for (const candidate of cleanupCandidates) {
    try {
      if (candidate.attachment_r2_key) {
        if (!input.r2) throw new Error("r2_unavailable");
        await deleteAndConfirmObject(input.r2, candidate.attachment_r2_key);
      }
      const deleteClaim = input.database.prepare(
        `DELETE FROM support_user_intake_claims
         WHERE user_id = ? AND client_message_id = ? AND state = 'cleanup_fenced'
           AND cleanup_not_before <= ? AND privacy_generation = ?
           AND EXISTS (
             SELECT 1 FROM support_subject_privacy_fences fence
             WHERE fence.user_id = support_user_intake_claims.user_id
               AND fence.state = 'open' AND fence.generation = support_user_intake_claims.privacy_generation
           )`,
      ).bind(
        candidate.user_id,
        candidate.client_message_id,
        input.now,
        candidate.privacy_generation,
      );
      const statements = [deleteClaim];
      if (candidate.attachment_r2_key) {
        statements.push(deleteSupportSubjectR2ObjectStatement({
          database: input.database,
          r2Key: candidate.attachment_r2_key,
          userId: candidate.user_id,
        }));
      }
      const results = await runRequiredD1Batch(
        input.database,
        statements,
        "Stale support intake claim could not be removed.",
      );
      if ((results[0]?.meta?.changes ?? 0) === 1) summary.completed += 1;
      else summary.skippedFenced += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

async function reconcileStaleDraftSends(input: {
  database: D1DatabaseLike;
  dryRun: boolean;
  limit: number;
  now: string;
}): Promise<ReconcileSummary> {
  const cutoff = new Date(Date.parse(input.now) - 6 * 60 * 60 * 1000).toISOString();
  const candidates = await rows<{
    id: string;
    outbound_message_id: string;
    privacy_generation: number | null;
    user_id: string | null;
  }>(input.database, `
    SELECT draft.id, draft.outbound_message_id, conversation.user_id,
           fence.generation AS privacy_generation
    FROM support_drafts draft
    LEFT JOIN support_conversations conversation ON conversation.id = draft.conversation_id
    LEFT JOIN support_subject_privacy_fences fence ON fence.user_id = conversation.user_id
    WHERE draft.lifecycle = 'sending' AND draft.outbound_message_id IS NOT NULL
      AND draft.updated_at < ?
      AND (conversation.user_id IS NULL OR fence.state = 'open')
    ORDER BY draft.updated_at ASC, draft.id ASC
    LIMIT ?`, [cutoff, input.limit]);
  const summary: ReconcileSummary = { candidates: candidates.length, completed: 0, failed: 0, skippedFenced: 0 };
  if (input.dryRun) return summary;
  for (const candidate of candidates) {
    const gateSql = candidate.user_id
      ? `EXISTS (
           SELECT 1 FROM support_subject_privacy_fences fence
           WHERE fence.user_id = ? AND fence.generation = ? AND fence.state = 'open'
         )`
      : "1 = 1";
    const gateValues: D1Value[] = candidate.user_id
      ? [candidate.user_id, candidate.privacy_generation ?? -1]
      : [];
    try {
      const message = statement(input.database,
        `UPDATE support_messages SET send_status = 'send_failed'
         WHERE id = ? AND send_status = 'pending' AND ${gateSql}`,
        [candidate.outbound_message_id, ...gateValues],
      );
      const draft = statement(input.database,
        `UPDATE support_drafts
         SET lifecycle = 'consumed', revision = revision + 1, updated_at = ?
         WHERE id = ? AND lifecycle = 'sending' AND outbound_message_id = ?
           AND ${gateSql}`,
        [input.now, candidate.id, candidate.outbound_message_id, ...gateValues],
      );
      const results = await runRequiredD1Batch(
        input.database,
        [message, draft],
        "Stale support draft could not be reconciled.",
      );
      if ((results[1]?.meta?.changes ?? 0) === 1) summary.completed += 1;
      else summary.skippedFenced += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

export async function reconcileSupportPrivacyCleanup(input: {
  database: D1DatabaseLike;
  dryRun: boolean;
  limit: number;
}) {
  const now = new Date().toISOString();
  const r2 = await getSupportUploadsR2();
  const [claims, drafts, exports, reservations] = await Promise.all([
    reconcileStaleClaims({ ...input, now, r2 }),
    reconcileStaleDraftSends({ ...input, now }),
    reconcileExpiredExports({ ...input, now, r2 }),
    reconcileStaleSubjectObjects({ ...input, now, r2 }),
  ]);
  return { claims, drafts, exports, reservations };
}
