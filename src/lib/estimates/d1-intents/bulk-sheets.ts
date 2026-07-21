import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { buildProjectComponentAttachmentDeleteRetentionStatements } from "@/lib/estimates/project-component-attachment-retention";
import type {
  BulkActionExecutionResult,
  BulkActionIssue,
  BulkActionPreviewResult,
  BulkPreviewSummary,
} from "@/lib/mass-deletion/bulk-action";

import { canEditEstimate } from "./access";
import { allD1Rows, firstD1Row, runD1Batch, type D1IntentStatement } from "./database";
import {
  buildProjectPublicationRevisionForProject,
  readEstimateIntentProjectContext,
  type EstimateD1Actor,
} from "./intent-context";

function nowIso() {
  return new Date().toISOString();
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("Something went wrong. Try again in a moment.");
  return values.map(() => "?").join(", ");
}

function createEstimateDeletePreviewHash(input: {
  eligibleIds: string[];
  blocked: BulkActionIssue[];
  summary: BulkPreviewSummary;
}) {
  return createHash("sha256")
    .update(JSON.stringify({
      targetType: "estimate_sheet",
      action: "delete",
      ids: input.eligibleIds,
      blocked: input.blocked,
      summary: input.summary,
    }))
    .digest("hex");
}

export async function previewBulkDeleteEstimateSheets(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: { projectId: string; estimateIds: string[] },
): Promise<BulkActionPreviewResult> {
  const estimateIds = input.estimateIds.filter((id): id is string => typeof id === "string");
  const rows = estimateIds.length > 0
    ? await allD1Rows<{ id: string }>(
        database,
        `
          SELECT estimate.id
          FROM estimates estimate
          JOIN projects project ON project.id = estimate.project_id
          WHERE estimate.project_id = ?
            AND estimate.id IN (${placeholders(estimateIds)})
        `,
        [input.projectId, ...estimateIds],
      )
    : [];
  const rowIds = new Set(rows.map((row) => row.id));
  const eligibleIds: string[] = [];
  const blocked: BulkActionIssue[] = [];
  for (const id of [...estimateIds].sort()) {
    if (!rowIds.has(id)) {
      blocked.push({ id, code: "not_found", message: "Estimate was not found in this project." });
      continue;
    }
    if (!await canEditEstimate(database, actor, id)) {
      blocked.push({ id, code: "forbidden", message: "Estimate edit access denied." });
      continue;
    }
    eligibleIds.push(id);
  }
  const summary: BulkPreviewSummary = {
    requestedCount: estimateIds.length,
    eligibleCount: eligibleIds.length,
    blockedCount: blocked.length,
  };
  return {
    ok: eligibleIds.length > 0 && blocked.length === 0,
    targetType: "estimate_sheet",
    ids: [...estimateIds].sort(),
    eligibleIds,
    previewHash: createEstimateDeletePreviewHash({ eligibleIds, blocked, summary }),
    summary,
    issues: blocked,
    blocked,
  };
}

export async function executeBulkDeleteEstimateSheets(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: {
    projectId: string;
    estimateIds: string[];
    expectedPreviewHash: string;
    correlationId: string;
  },
): Promise<BulkActionExecutionResult> {
  const preview = await previewBulkDeleteEstimateSheets(database, actor, input);
  if (preview.previewHash !== input.expectedPreviewHash) {
    return {
      ...preview,
      ok: false,
      issues: [
        ...preview.issues,
        { code: "stale_preview", message: "Preview changed; refresh the deletion preview." },
      ],
      deletedIds: [],
    };
  }
  if (!preview.ok) return { ...preview, deletedIds: [] };
  if (!database.batch) {
    throw new Error("Atomic estimate sheet bulk deletion is unavailable.");
  }

  const eligibleIds = preview.eligibleIds;
  const project = await readEstimateIntentProjectContext(database, input.projectId);
  if (!project) throw new Error("Project not found in the current workspace.");
  const deletedRows = await allD1Rows<Record<string, unknown>>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id IN (${placeholders(eligibleIds)})`,
    eligibleIds,
  );
  const correlationId = input.correlationId || randomUUID();
  const existingAuditEvent = await firstD1Row<{ id: string }>(
    database,
    `
      SELECT id
      FROM mass_deletion_events
      WHERE workspace_id = ?
        AND target_type = 'estimate_sheet'
        AND action = 'delete'
        AND correlation_id = ?
      LIMIT 1
    `,
    [project.workspaceId, correlationId],
  );
  const eventId = existingAuditEvent?.id ?? randomUUID();
  const timestamp = nowIso();
  const estimateSql = placeholders(eligibleIds);
  const statements: D1IntentStatement[] = [
    ...buildProjectComponentAttachmentDeleteRetentionStatements({
      workspaceId: project.workspaceId,
      projectId: input.projectId,
      sourceDeleteEventId: eventId,
      deletedRows,
      deletedAt: timestamp,
    }),
    buildProjectPublicationRevisionForProject(input.projectId, project.workspaceId),
    { sql: `DELETE FROM estimate_sheet_user_preferences WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_sheet_access_settings WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_sheet_members WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_sheet_adjustments WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_sheet_events WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_row_items WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_nodes WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_tabs WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_favorites WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    {
      sql: `DELETE FROM estimates WHERE project_id = ? AND id IN (${estimateSql})`,
      values: [input.projectId, ...eligibleIds],
    },
    {
      sql: `
        INSERT INTO mass_deletion_events (
          id,
          workspace_id,
          actor_user_id,
          target_type,
          action,
          target_ids_json,
          preview_hash,
          correlation_id,
          status,
          summary_json,
          blocked_json,
          storage_targets_json,
          metadata_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id, target_type, action, correlation_id) DO UPDATE SET
          target_ids_json = excluded.target_ids_json,
          preview_hash = excluded.preview_hash,
          status = excluded.status,
          summary_json = excluded.summary_json,
          blocked_json = excluded.blocked_json,
          updated_at = excluded.updated_at
      `,
      values: [
        eventId,
        project.workspaceId,
        actor.userId,
        "estimate_sheet",
        "delete",
        JSON.stringify(eligibleIds),
        input.expectedPreviewHash,
        correlationId,
        "completed",
        JSON.stringify(preview.summary),
        JSON.stringify(preview.blocked),
        "[]",
        "{}",
        timestamp,
        timestamp,
      ],
    },
  ];
  await runD1Batch(database, statements);
  return {
    ok: true,
    targetType: "estimate_sheet",
    ids: preview.ids,
    deletedIds: eligibleIds,
    auditEventId: eventId,
    previewHash: input.expectedPreviewHash,
    summary: preview.summary,
    issues: [],
    blocked: [],
  };
}
