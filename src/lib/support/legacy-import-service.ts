import "server-only";

import { canAccessProjectInD1, readProjectInWorkspaceFromD1 } from "@/lib/authz/d1-access";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { isUuid } from "@/lib/ids";
import { matchAuthenticatedRouteTemplate, supportSha256Hex } from "@/lib/support/intake-request";
import {
  readSupportPrivacyFence,
  requireOpenSupportPrivacyFence,
} from "@/lib/support/privacy-fence";

type LegacyFeedbackRow = {
  created_at: string;
  feedback_type: string;
  id: string;
  message: string;
  page_path: string | null;
  project_id: string | null;
  severity: string;
  status: "new" | "reviewing" | "resolved" | "archived";
  user_id: string;
  workspace_id: string | null;
};

type StableLegacyIds = {
  conversationId: string;
  feedbackId: string;
  messageId: string;
};

export type LegacyImportMode = "dry-run" | "apply";

export type LegacyImportResult = {
  candidates: StableLegacyIds[];
  counts: {
    eligible: number;
    examined: number;
    failed: number;
    imported: number;
    recoveredExisting: number;
    skippedFenced: number;
    skippedMissingUser: number;
  };
  mode: LegacyImportMode;
  nextCursor: string | null;
};

export class LegacySupportImportError extends Error {
  constructor(message: string, readonly status: 400 | 503) {
    super(message);
  }
}

function statement(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare(sql).bind(...values);
}

function parseLimit(value: number | null | undefined) {
  const limit = value ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new LegacySupportImportError("Legacy import limit must be between 1 and 50.", 400);
  }
  return limit;
}

function parseCursor(value: string | null | undefined) {
  const cursor = value?.trim() ?? "";
  if (!cursor) return null;
  if (cursor.length > 128 || /[\u0000-\u001f\u007f]/u.test(cursor)) {
    throw new LegacySupportImportError("Legacy import cursor is invalid.", 400);
  }
  return cursor;
}

async function stableUuid(kind: "conversation" | "message", feedbackId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`archestimator-support-legacy-v1\u001f${kind}\u001f${feedbackId}`),
  );
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function stableIds(feedbackId: string): Promise<StableLegacyIds> {
  return {
    conversationId: await stableUuid("conversation", feedbackId),
    feedbackId,
    messageId: await stableUuid("message", feedbackId),
  };
}

function canonicalStatus(status: LegacyFeedbackRow["status"]) {
  if (status === "resolved") return "resolved" as const;
  if (status === "archived") return "archived" as const;
  return "open" as const;
}

async function validatedLegacyResources(database: D1DatabaseLike, row: LegacyFeedbackRow) {
  const workspaceId = row.workspace_id?.trim() ?? "";
  const projectId = row.project_id?.trim() ?? "";
  if (!isUuid(workspaceId)) return { workspaceId: null, projectId: null };
  const workspaceMember = await database
    .prepare<{ allowed: number }>(
      `SELECT 1 AS allowed FROM workspace_members
       WHERE workspace_id = ? AND user_id = ? LIMIT 1`,
    )
    .bind(workspaceId, row.user_id)
    .first<{ allowed: number }>();
  if (!workspaceMember) return { workspaceId: null, projectId: null };
  if (!projectId || !isUuid(projectId)) return { workspaceId, projectId: null };
  const project = await readProjectInWorkspaceFromD1(database, projectId, workspaceId);
  const canAccess = project && await canAccessProjectInD1(database, projectId, { userId: row.user_id });
  return canAccess ? { workspaceId, projectId } : { workspaceId, projectId: null };
}

function importGateSql() {
  return `EXISTS (
    SELECT 1 FROM support_subject_privacy_fences import_fence
    WHERE import_fence.user_id = ?
      AND import_fence.generation = ?
      AND import_fence.state = 'open'
  )`;
}

async function buildImportStatements(input: {
  database: D1DatabaseLike;
  generation: number;
  ids: StableLegacyIds;
  importedAt: string;
  projectId: string | null;
  row: LegacyFeedbackRow;
  workspaceId: string | null;
}) {
  const { database, generation, ids, importedAt, row } = input;
  const gate = importGateSql();
  const gateValues: D1Value[] = [row.user_id, generation];
  const timestamp = Number.isFinite(Date.parse(row.created_at)) ? row.created_at : importedAt;
  const routeTemplate = matchAuthenticatedRouteTemplate(row.page_path);
  const metadata = JSON.stringify({
    legacyFeedback: {
      classification: row.feedback_type,
      severityLabel: row.severity,
      source: "beta_feedback_submission",
    },
  });
  const statements: D1PreparedStatementLike[] = [];
  statements.push(statement(
    database,
    `INSERT INTO support_conversations (
       id, user_id, requester_email, requester_name, subject, status, channel,
       mailbox_address, routing_token, last_message_at, unread_for_admin,
       unread_for_user, created_at, updated_at
     )
     SELECT ?, ?, lower(trim(profile.email)), NULLIF(trim(profile.display_name), ''),
            'Legacy feedback', ?, 'in_app', NULL, ?, ?, 1, 0, ?, ?
     FROM profiles profile
     WHERE profile.id = ?
       AND ${gate}
       AND NOT EXISTS (
         SELECT 1 FROM support_legacy_feedback_imports existing_mapping
         WHERE existing_mapping.feedback_id = ?
       )`,
    [
      ids.conversationId,
      row.user_id,
      canonicalStatus(row.status),
      (await supportSha256Hex(`legacy-routing\u001f${row.id}`)).slice(0, 24),
      timestamp,
      timestamp,
      timestamp,
      row.user_id,
      ...gateValues,
      row.id,
    ],
  ));
  statements.push(statement(
    database,
    `INSERT INTO support_messages (
       id, conversation_id, sender_role, author_user_id, body_text, body_html,
       email_message_id, client_message_id, send_status, direction, transport,
       attachment_count, warning_flags_json, created_at
     )
     SELECT ?, ?, 'user', ?, ?, NULL, NULL, NULL, 'sent', 'inbound', 'in_app',
            0, ?, ?
     WHERE ${gate}
       AND NOT EXISTS (
         SELECT 1 FROM support_legacy_feedback_imports existing_mapping
         WHERE existing_mapping.feedback_id = ?
       )`,
    [
      ids.messageId,
      ids.conversationId,
      row.user_id,
      row.message,
      metadata,
      timestamp,
      ...gateValues,
      row.id,
    ],
  ));
  statements.push(statement(
    database,
    `INSERT INTO support_message_context (
       message_id, workspace_id, project_id, estimate_id, route_template,
       app_release, viewport_width, viewport_height, timezone, browser_family,
       os_family, diagnostics_shared, created_at
     )
     SELECT ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?
     WHERE ${gate}
       AND NOT EXISTS (
         SELECT 1 FROM support_legacy_feedback_imports existing_mapping
         WHERE existing_mapping.feedback_id = ?
       )`,
    [
      ids.messageId,
      input.workspaceId,
      input.projectId,
      routeTemplate,
      input.workspaceId || input.projectId ? 1 : 0,
      timestamp,
      ...gateValues,
      row.id,
    ],
  ));
  statements.push(statement(
    database,
    `INSERT INTO support_legacy_feedback_imports (
       feedback_id, conversation_id, message_id, user_visible_at,
       activated_by_message_id, imported_at
     )
     SELECT ?, ?, ?, NULL, NULL, ?
     WHERE ${gate}`,
    [row.id, ids.conversationId, ids.messageId, importedAt, ...gateValues],
  ));
  return statements;
}

async function existingMapping(database: D1DatabaseLike, feedbackId: string) {
  return database
    .prepare<{ conversation_id: string; message_id: string }>(
      `SELECT conversation_id, message_id
       FROM support_legacy_feedback_imports
       WHERE feedback_id = ?
       LIMIT 1`,
    )
    .bind(feedbackId)
    .first<{ conversation_id: string; message_id: string }>();
}

export async function runLegacySupportImport(input: {
  cursor?: string | null;
  database: D1DatabaseLike;
  limit?: number | null;
  mode: LegacyImportMode;
}): Promise<LegacyImportResult> {
  if (input.mode !== "dry-run" && input.mode !== "apply") {
    throw new LegacySupportImportError("Legacy import mode must be dry-run or apply.", 400);
  }
  const cursor = parseCursor(input.cursor);
  const limit = parseLimit(input.limit);
  const values: D1Value[] = [];
  const cursorSql = cursor ? "AND feedback.id > ?" : "";
  if (cursor) values.push(cursor);
  values.push(limit + 1);
  const result = await input.database
    .prepare<LegacyFeedbackRow>(
      `SELECT feedback.id, feedback.user_id, feedback.workspace_id,
              feedback.project_id, feedback.feedback_type, feedback.severity,
              feedback.page_path, feedback.message, feedback.status,
              feedback.created_at
       FROM beta_feedback_submissions feedback
       LEFT JOIN support_legacy_feedback_imports mapping ON mapping.feedback_id = feedback.id
       WHERE mapping.feedback_id IS NULL
         ${cursorSql}
       ORDER BY feedback.id ASC
       LIMIT ?`,
    )
    .bind(...values)
    .all<LegacyFeedbackRow>();
  if (result.success === false) throw new LegacySupportImportError("Legacy feedback could not be read.", 503);
  const allRows = result.results ?? [];
  const rows = allRows.slice(0, limit);
  const response: LegacyImportResult = {
    candidates: [],
    counts: {
      eligible: 0,
      examined: rows.length,
      failed: 0,
      imported: 0,
      recoveredExisting: 0,
      skippedFenced: 0,
      skippedMissingUser: 0,
    },
    mode: input.mode,
    nextCursor: allRows.length > rows.length ? rows.at(-1)?.id ?? null : null,
  };

  for (const row of rows) {
    const profile = await input.database
      .prepare<{ id: string }>("SELECT id FROM profiles WHERE id = ? LIMIT 1")
      .bind(row.user_id)
      .first<{ id: string }>();
    if (!profile) {
      response.counts.skippedMissingUser += 1;
      continue;
    }
    const existingFence = await readSupportPrivacyFence(input.database, row.user_id);
    if (existingFence && existingFence.state !== "open") {
      response.counts.skippedFenced += 1;
      continue;
    }
    const ids = await stableIds(row.id);
    response.candidates.push(ids);
    response.counts.eligible += 1;
    if (input.mode === "dry-run") continue;

    try {
      const fence = await requireOpenSupportPrivacyFence(input.database, row.user_id);
      const resources = await validatedLegacyResources(input.database, row);
      const statements = await buildImportStatements({
        database: input.database,
        generation: fence.generation,
        ids,
        importedAt: new Date().toISOString(),
        projectId: resources.projectId,
        row,
        workspaceId: resources.workspaceId,
      });
      const results = await runRequiredD1Batch(
        input.database,
        statements,
        "Legacy feedback import failed.",
      );
      if (results.length !== statements.length || results.some((entry) => entry.meta?.changes !== 1)) {
        const mapping = await existingMapping(input.database, row.id);
        if (mapping?.conversation_id === ids.conversationId && mapping.message_id === ids.messageId) {
          response.counts.recoveredExisting += 1;
        } else {
          response.counts.failed += 1;
        }
      } else {
        response.counts.imported += 1;
      }
    } catch {
      const mapping = await existingMapping(input.database, row.id).catch(() => null);
      if (mapping?.conversation_id === ids.conversationId && mapping.message_id === ids.messageId) {
        response.counts.recoveredExisting += 1;
        continue;
      }
      const fence = await readSupportPrivacyFence(input.database, row.user_id).catch(() => null);
      if (fence && fence.state !== "open") response.counts.skippedFenced += 1;
      else response.counts.failed += 1;
    }
  }
  return response;
}
