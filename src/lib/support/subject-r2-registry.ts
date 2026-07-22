import "server-only";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
} from "@/lib/cloudflare/d1";
import type { SupportPrivacyWriteGate } from "@/lib/support/privacy-fence";

export const SUPPORT_SCREENSHOT_NORMALIZATION_SCHEMA = "support_screenshot_webp_v1";

export type SupportSubjectR2SourceKind =
  | "user_screenshot"
  | "message_attachment"
  | "admin_draft_attachment"
  | "privacy_export"
  | "inbound_attachment"
  | "outbound_attachment";

export class SupportSubjectR2ReservationError extends Error {
  readonly code = "support_subject_r2_reservation_conflict";

  constructor() {
    super("Subject-owned support storage could not be reserved.");
  }
}

async function requireReservation(
  statement: D1PreparedStatementLike,
) {
  const result = await statement.run();
  if (result.success === false || (result.meta?.changes ?? 0) !== 1) {
    throw new SupportSubjectR2ReservationError();
  }
}

function reservationUpsertSql(gateSql: string) {
  return `INSERT INTO support_subject_r2_objects (
            r2_key, user_id, source_kind, source_id, status, created_at, updated_at
          )
          SELECT ?, ?, ?, ?, 'reserved', ?, ?
          WHERE ${gateSql}
          ON CONFLICT(r2_key) DO UPDATE SET
            status = 'reserved',
            updated_at = excluded.updated_at
          WHERE support_subject_r2_objects.user_id = excluded.user_id
            AND support_subject_r2_objects.source_kind = excluded.source_kind
            AND support_subject_r2_objects.source_id = excluded.source_id
            AND support_subject_r2_objects.status IN ('reserved', 'stored')`;
}

/**
 * Reserve a subject-owned object guarded by the captured open privacy
 * generation. Inbound/outbound attachment writers can use the same API before
 * their R2 puts once their caller ownership is updated.
 */
export async function reserveOpenSupportSubjectR2Object(input: {
  database: D1DatabaseLike;
  privacyGate: Exclude<SupportPrivacyWriteGate, null>;
  r2Key: string;
  sourceId: string;
  sourceKind: Exclude<SupportSubjectR2SourceKind, "user_screenshot" | "privacy_export">;
}) {
  const now = new Date().toISOString();
  await requireReservation(input.database.prepare(
    reservationUpsertSql(`EXISTS (
      SELECT 1 FROM support_subject_privacy_fences reservation_fence
      WHERE reservation_fence.user_id = ?
        AND reservation_fence.generation = ?
        AND reservation_fence.state = 'open'
    )`),
  ).bind(
    input.r2Key,
    input.privacyGate.userId,
    input.sourceKind,
    input.sourceId,
    now,
    now,
    input.privacyGate.userId,
    input.privacyGate.generation,
  ));
}

export async function reserveSupportIntakeScreenshotR2Object(input: {
  attachmentId: string;
  clientMessageId: string;
  database: D1DatabaseLike;
  leaseToken: string;
  privacyGeneration: number;
  r2Key: string;
  userId: string;
}) {
  const now = new Date().toISOString();
  await requireReservation(input.database.prepare(
    reservationUpsertSql(`EXISTS (
      SELECT 1
      FROM support_user_intake_claims reservation_claim
      INNER JOIN support_subject_privacy_fences reservation_fence
        ON reservation_fence.user_id = reservation_claim.user_id
      WHERE reservation_claim.user_id = ?
        AND reservation_claim.client_message_id = ?
        AND reservation_claim.state = 'reserved'
        AND reservation_claim.lease_token = ?
        AND reservation_claim.lease_expires_at > ?
        AND reservation_claim.privacy_generation = ?
        AND reservation_fence.generation = reservation_claim.privacy_generation
        AND reservation_fence.state = 'open'
    )`),
  ).bind(
    input.r2Key,
    input.userId,
    "user_screenshot",
    input.attachmentId,
    now,
    now,
    input.userId,
    input.clientMessageId,
    input.leaseToken,
    now,
    input.privacyGeneration,
  ));
}

export async function reserveSupportPrivacyExportR2Object(input: {
  attemptToken: string;
  database: D1DatabaseLike;
  executionRevision: number;
  generation: number;
  privacyRequestId: string;
  r2Key: string;
  userId: string;
}) {
  const now = new Date().toISOString();
  await requireReservation(input.database.prepare(
    reservationUpsertSql(`EXISTS (
      SELECT 1
      FROM privacy_requests reservation_request
      INNER JOIN support_privacy_execution_attempts reservation_attempt
        ON reservation_attempt.privacy_request_id = reservation_request.id
      INNER JOIN support_subject_privacy_fences reservation_fence
        ON reservation_fence.user_id = reservation_request.requester_user_id
      WHERE reservation_request.id = ?
        AND reservation_request.requester_user_id = ?
        AND reservation_request.status = 'in_progress'
        AND reservation_request.execution_revision = ?
        AND reservation_attempt.attempt_token = ?
        AND reservation_attempt.execution_revision = reservation_request.execution_revision
        AND reservation_attempt.lease_expires_at > ?
        AND reservation_fence.generation = ?
        AND reservation_fence.state = 'exporting'
        AND reservation_fence.privacy_request_id = reservation_request.id
    )`),
  ).bind(
    input.r2Key,
    input.userId,
    "privacy_export",
    input.privacyRequestId,
    now,
    now,
    input.privacyRequestId,
    input.userId,
    input.executionRevision,
    input.attemptToken,
    now,
    input.generation,
  ));
}

export function markSupportSubjectR2ObjectStoredStatement(input: {
  database: D1DatabaseLike;
  r2Key: string;
  sourceId: string;
  sourceKind: SupportSubjectR2SourceKind;
  storedAt: string;
  userId: string;
}) {
  return input.database.prepare(
    `UPDATE support_subject_r2_objects
     SET status = 'stored', updated_at = ?
     WHERE r2_key = ? AND user_id = ? AND source_kind = ? AND source_id = ?
       AND status IN ('reserved', 'stored')`,
  ).bind(
    input.storedAt,
    input.r2Key,
    input.userId,
    input.sourceKind,
    input.sourceId,
  );
}

export function deleteSupportSubjectR2ObjectStatement(input: {
  database: D1DatabaseLike;
  r2Key: string;
  userId: string;
}) {
  return input.database.prepare(
    "DELETE FROM support_subject_r2_objects WHERE r2_key = ? AND user_id = ?",
  ).bind(input.r2Key, input.userId);
}

export async function forgetSupportSubjectR2Object(input: {
  database: D1DatabaseLike;
  r2Key: string;
  userId: string;
}) {
  const result = await deleteSupportSubjectR2ObjectStatement(input).run();
  if (result.success === false) throw new SupportSubjectR2ReservationError();
}
