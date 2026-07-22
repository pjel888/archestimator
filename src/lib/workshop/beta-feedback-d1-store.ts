import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import type { BetaFeedbackStatus } from "@/lib/workshop/beta-feedback";
import type { BetaFeedbackReviewRow } from "@/lib/workshop/beta-feedback-review";
import { requireOpenSupportPrivacyFence } from "@/lib/support/privacy-fence";

type BetaFeedbackD1Row = {
  created_at: string;
  feedback_type: string;
  id: string;
  message: string;
  page_path: string | null;
  project_id: string | null;
  severity: string;
  status: string;
  updated_at: string;
  user_email: string;
  workspace_id: string | null;
};

function toReviewRow(row: BetaFeedbackD1Row): BetaFeedbackReviewRow {
  return {
    created_at: row.created_at,
    feedback_type: row.feedback_type,
    id: row.id,
    message: row.message,
    page_path: row.page_path,
    project_id: row.project_id,
    severity: row.severity,
    status: row.status,
    updated_at: row.updated_at,
    user_email: row.user_email,
    workspace_id: row.workspace_id,
  } as BetaFeedbackReviewRow;
}

export async function readBetaFeedbackReviewQueueFromD1(status: BetaFeedbackStatus | null): Promise<BetaFeedbackReviewRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");

  const statusFilter = status ? "WHERE status = ?" : "";
  const statement = db.prepare<BetaFeedbackD1Row>(
    `
      SELECT id, created_at, updated_at, feedback_type, severity, status, user_email, workspace_id, project_id, page_path, message
      FROM beta_feedback_submissions
      ${statusFilter}
      ORDER BY created_at DESC
      LIMIT 50
    `,
  );

  const result = status ? await statement.bind(status).all<BetaFeedbackD1Row>() : await statement.all<BetaFeedbackD1Row>();
  return (result.results ?? []).map(toReviewRow);
}

/** Read one legacy record for an authorized admin deep link, independent of
 * the review queue's status filter and display limit. */
export async function readBetaFeedbackReviewByIdFromD1(id: string): Promise<BetaFeedbackReviewRow | null> {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");

  const row = await db
    .prepare<BetaFeedbackD1Row>(
      `
        SELECT id, created_at, updated_at, feedback_type, severity, status,
               user_email, workspace_id, project_id, page_path, message
        FROM beta_feedback_submissions
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(id)
    .first<BetaFeedbackD1Row>();
  return row ? toReviewRow(row) : null;
}

/** Resolve an old feedback-review deep link to its canonical support thread
 * after the exact-once import mapping exists. */
export async function readCanonicalSupportConversationIdForFeedbackFromD1(id: string): Promise<string | null> {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");

  const row = await db
    .prepare<{ conversation_id: string }>(
      `SELECT mapping.conversation_id
       FROM support_legacy_feedback_imports mapping
       INNER JOIN support_conversations conversation
         ON conversation.id = mapping.conversation_id
       WHERE mapping.feedback_id = ?
       LIMIT 1`,
    )
    .bind(id)
    .first<{ conversation_id: string }>();
  return row?.conversation_id ?? null;
}

export async function updateBetaFeedbackReviewStatusInD1({
  actorUserId,
  id,
  status,
}: {
  actorUserId: string;
  id: string;
  status: BetaFeedbackStatus;
}) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Something went wrong. Try again in a moment.");

  const feedback = await db.prepare<{ user_id: string }>(
    "SELECT user_id FROM beta_feedback_submissions WHERE id = ? LIMIT 1",
  ).bind(id).first<{ user_id: string }>();
  if (!feedback) throw new Error("Beta feedback status was not updated.");
  const fence = await requireOpenSupportPrivacyFence(db, feedback.user_id);
  const now = new Date().toISOString();
  const update = db.prepare(
      `
        UPDATE beta_feedback_submissions
        SET status = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
          AND EXISTS (
            SELECT 1 FROM support_subject_privacy_fences feedback_fence
            WHERE feedback_fence.user_id = beta_feedback_submissions.user_id
              AND feedback_fence.generation = ?
              AND feedback_fence.state = 'open'
          )
      `,
    )
    .bind(status, now, id, feedback.user_id, fence.generation);
  const event = db.prepare(
      `
        INSERT INTO beta_feedback_status_events (
          id,
          feedback_id,
          status,
          actor_user_id,
          created_at
        )
        SELECT ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM beta_feedback_submissions feedback
          INNER JOIN support_subject_privacy_fences feedback_fence
            ON feedback_fence.user_id = feedback.user_id
          WHERE feedback.id = ? AND feedback.user_id = ?
            AND feedback_fence.generation = ? AND feedback_fence.state = 'open'
        )
        ON CONFLICT(feedback_id, status) DO NOTHING
      `,
    )
    .bind(
      crypto.randomUUID(),
      id,
      status,
      actorUserId,
      now,
      id,
      feedback.user_id,
      fence.generation,
    );
  const results = await runRequiredD1Batch(db, [update, event], "Beta feedback status was not updated.");
  if ((results[0]?.meta?.changes ?? 0) !== 1) throw new Error("Beta feedback status was not updated.");
}
