import "server-only";

import { getCloudflareD1Database } from "@/lib/cloudflare/d1";
import type { CurrentUserContext } from "@/lib/auth/session";
import type { BetaFeedbackPayload, BetaFeedbackStatus } from "@/lib/workshop/beta-feedback";
import type { BetaFeedbackReviewRow } from "@/lib/workshop/beta-feedback-review";

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

export async function saveBetaFeedbackToD1(payload: BetaFeedbackPayload, context: CurrentUserContext) {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Cloudflare D1 is not available for beta feedback writes.");

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const workspaceId = context.profile.default_workspace_id;

  await db
    .prepare(
      `
        INSERT INTO beta_feedback_submissions (
          id,
          user_id,
          workspace_id,
          project_id,
          user_email,
          feedback_type,
          severity,
          page_path,
          message,
          metadata_json,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
      `,
    )
    .bind(
      id,
      context.userId,
      workspaceId,
      payload.projectId,
      context.email,
      payload.feedbackType,
      payload.severity,
      payload.pagePath,
      payload.message,
      JSON.stringify({ source: "workshop_feedback_form" }),
      now,
      now,
    )
    .run();
}

export async function readBetaFeedbackReviewQueueFromD1(status: BetaFeedbackStatus | null): Promise<BetaFeedbackReviewRow[]> {
  const db = await getCloudflareD1Database();
  if (!db) throw new Error("Cloudflare D1 is not available for beta feedback reads.");

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
  if (!db) throw new Error("Cloudflare D1 is not available for beta feedback writes.");

  const now = new Date().toISOString();
  const update = await db
    .prepare(
      `
        UPDATE beta_feedback_submissions
        SET status = ?, updated_at = ?
        WHERE id = ?
      `,
    )
    .bind(status, now, id)
    .run();

  if ((update.meta?.changes ?? 0) === 0) throw new Error("Beta feedback status was not updated.");

  await db
    .prepare(
      `
        INSERT INTO beta_feedback_status_events (
          id,
          feedback_id,
          status,
          actor_user_id,
          created_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(feedback_id, status) DO NOTHING
      `,
    )
    .bind(crypto.randomUUID(), id, status, actorUserId, now)
    .run();
}
