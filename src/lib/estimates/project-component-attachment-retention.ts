import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { getProjectComponentIdentity } from "@/lib/estimates/express-components";

const PROJECT_COMPONENT_ATTACHMENT_RESTORE_RETENTION_DAYS = 30;
const PROJECT_ATTACHMENT_RETENTION_SYSTEM_ACTOR = "system:attachment-retention";

type RetentionRow = Record<string, unknown>;

export type ProjectComponentAttachmentRetentionStatement = {
  sql: string;
  values?: D1Value[];
};

function readRecord(value: unknown): RetentionRow {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as RetentionRow;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as RetentionRow : {};
  } catch {
    return {};
  }
}

function rowId(row: RetentionRow) {
  const value = row.id ?? row.rowId;
  return typeof value === "string" && value.trim() ? value : null;
}

function rowMetadata(row: RetentionRow) {
  return readRecord(row.metadata ?? row.metadata_json);
}

function rowSourceSnapshot(row: RetentionRow) {
  return readRecord(row.sourceSnapshot ?? row.source_snapshot ?? row.source_snapshot_json);
}

function unique(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("At least one project component attachment retention value is required.");
  return values.map(() => "?").join(", ");
}

function retentionExpiry(deletedAt: string) {
  const timestamp = Date.parse(deletedAt);
  if (!Number.isFinite(timestamp)) throw new Error("Project component attachment retention timestamp is invalid.");
  return new Date(timestamp + PROJECT_COMPONENT_ATTACHMENT_RESTORE_RETENTION_DAYS * 24 * 60 * 60 * 1_000).toISOString();
}

function projectComponentIds(rows: readonly RetentionRow[]) {
  return unique(rows.map((row) => getProjectComponentIdentity(rowMetadata(row), null, rowSourceSnapshot(row))));
}

function projectComponentAttachmentIds(rows: readonly RetentionRow[]) {
  const attachmentIds: Array<string | null> = [];
  for (const row of rows) {
    const priceOptions = rowSourceSnapshot(row).priceOptions;
    if (!Array.isArray(priceOptions)) continue;
    for (const priceOption of priceOptions) {
      const attachments = readRecord(priceOption).attachments;
      if (!Array.isArray(attachments)) continue;
      for (const attachment of attachments) {
        const attachmentId = readRecord(attachment).id;
        attachmentIds.push(typeof attachmentId === "string" && attachmentId.trim() ? attachmentId : null);
      }
    }
  }
  return unique(attachmentIds);
}

const RETENTION_PROJECT_COMPONENT_IDENTITY_SQL = `
  COALESCE(
    CASE
      WHEN json_extract(row_item.source_snapshot_json, '$.sourceType') IN ('project_component', 'promoted_project_component', 'promoted_express_component', 'express_component')
      THEN NULLIF(json_extract(row_item.source_snapshot_json, '$.sourceComponentId'), '')
    END,
    CASE
      WHEN json_extract(row_item.source_snapshot_json, '$.sourceType') IN ('project_component', 'promoted_project_component', 'promoted_express_component', 'express_component')
      THEN NULLIF(json_extract(row_item.source_snapshot_json, '$.sourceEstimateRowId'), '')
    END,
    NULLIF(json_extract(row_item.metadata_json, '$.projectComponentProjection.componentId'), ''),
    NULLIF(json_extract(row_item.metadata_json, '$.expressComponent.componentId'), ''),
    NULLIF(json_extract(row_item.metadata_json, '$.expressComponent.id'), '')
  )
`;

export function buildProjectComponentAttachmentDeleteRetentionStatements(input: {
  workspaceId: string;
  projectId: string;
  sourceDeleteEventId: string;
  deletedRows: readonly RetentionRow[];
  deletedAt: string;
}): ProjectComponentAttachmentRetentionStatement[] {
  const componentIds = projectComponentIds(input.deletedRows);
  const deletedRowIds = unique(input.deletedRows.map(rowId));
  if (componentIds.length === 0 || deletedRowIds.length === 0) return [];

  return [{
    sql: `
      INSERT INTO project_component_attachment_retention_holds (
        source_delete_event_id, attachment_id, upload_asset_id, workspace_id,
        project_id, project_component_id, restore_expires_at, created_at
      )
      SELECT ?, attachment.id, attachment.upload_asset_id, attachment.workspace_id,
        attachment.project_id, attachment.project_component_id, ?, ?
      FROM component_variant_attachments attachment
      WHERE attachment.owner_scope = 'project'
        AND attachment.workspace_id = ?
        AND attachment.project_id = ?
        AND attachment.project_component_id IN (${placeholders(componentIds)})
        AND attachment.review_status <> 'superseded'
        AND NOT EXISTS (
          SELECT 1
          FROM estimate_row_items row_item
          INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
          WHERE estimate.project_id = ?
            AND ${RETENTION_PROJECT_COMPONENT_IDENTITY_SQL} = attachment.project_component_id
            AND row_item.id NOT IN (${placeholders(deletedRowIds)})
        )
      ON CONFLICT(source_delete_event_id, attachment_id) DO NOTHING
    `,
    values: [
      input.sourceDeleteEventId,
      retentionExpiry(input.deletedAt),
      input.deletedAt,
      input.workspaceId,
      input.projectId,
      ...componentIds,
      input.projectId,
      ...deletedRowIds,
    ],
  }];
}

export function buildProjectComponentAttachmentRestoreRetentionStatements(input: {
  projectId: string;
  sourceDeleteEventId: string;
  restoredRows: readonly RetentionRow[];
  restoredAt: string;
}) {
  const componentIds = projectComponentIds(input.restoredRows);
  const attachmentIds = projectComponentAttachmentIds(input.restoredRows);
  if (componentIds.length === 0) return {
    guardStatements: [] as ProjectComponentAttachmentRetentionStatement[],
    releaseStatements: [] as ProjectComponentAttachmentRetentionStatement[],
  };

  const snapshotAttachmentGuard = attachmentIds.length > 0
    ? `
      AND (
        SELECT COUNT(*)
        FROM component_variant_attachments attachment
        INNER JOIN upload_assets asset ON asset.id = attachment.upload_asset_id
        WHERE attachment.id IN (${placeholders(attachmentIds)})
          AND attachment.owner_scope = 'project'
          AND attachment.project_id = ?
          AND attachment.review_status <> 'superseded'
          AND asset.status = 'finalized'
      ) = ?
    `
    : "";
  const snapshotAttachmentValues: D1Value[] = attachmentIds.length > 0
    ? [...attachmentIds, input.projectId, attachmentIds.length]
    : [];

  return {
    guardStatements: [{
      sql: `
        SELECT CASE WHEN 1 = 1
          ${snapshotAttachmentGuard}
          AND NOT EXISTS (
            SELECT 1
            FROM project_component_attachment_retention_holds retention
            LEFT JOIN component_variant_attachments attachment ON attachment.id = retention.attachment_id
            LEFT JOIN upload_assets asset ON asset.id = retention.upload_asset_id
            WHERE retention.source_delete_event_id = ?
              AND retention.project_id = ?
              AND retention.project_component_id IN (${placeholders(componentIds)})
              AND (
                attachment.id IS NULL
                OR attachment.review_status = 'superseded'
                OR asset.id IS NULL
                OR asset.status <> 'finalized'
              )
          )
        THEN 1 ELSE json('') END AS project_attachment_restore_guard
      `,
      values: [
        ...snapshotAttachmentValues,
        input.sourceDeleteEventId,
        input.projectId,
        ...componentIds,
      ],
    }],
    releaseStatements: [{
      sql: `
        UPDATE project_component_attachment_retention_holds
        SET released_at = ?, release_reason = 'restored'
        WHERE source_delete_event_id = ?
          AND project_id = ?
          AND project_component_id IN (${placeholders(componentIds)})
          AND released_at IS NULL
      `,
      values: [input.restoredAt, input.sourceDeleteEventId, input.projectId, ...componentIds],
    }],
  };
}

export async function expireProjectComponentAttachmentRetentionHolds(
  database: D1DatabaseLike,
  options: { now?: Date; limit?: number } = {},
) {
  if (!database.batch) throw new Error("Atomic project component attachment retention cleanup is unavailable.");
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const limit = Math.min(1_000, Math.max(1, Math.trunc(options.limit ?? 100)));
  const statements: ProjectComponentAttachmentRetentionStatement[] = [
    {
      sql: `
        UPDATE project_component_attachment_retention_holds AS retention
        SET released_at = ?, release_reason = 'live_instance'
        WHERE retention.released_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM estimate_row_items row_item
            INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
            WHERE estimate.project_id = retention.project_id
              AND ${RETENTION_PROJECT_COMPONENT_IDENTITY_SQL} = retention.project_component_id
          )
      `,
      values: [timestamp],
    },
    {
      sql: `
        WITH eligible_attachments AS (
          SELECT retention.attachment_id
          FROM project_component_attachment_retention_holds retention
          WHERE retention.released_at IS NULL
            AND datetime(retention.restore_expires_at) <= datetime(?)
            AND NOT EXISTS (
              SELECT 1
              FROM project_component_attachment_retention_holds active_retention
              WHERE active_retention.attachment_id = retention.attachment_id
                AND active_retention.released_at IS NULL
                AND datetime(active_retention.restore_expires_at) > datetime(?)
            )
          GROUP BY retention.attachment_id
          ORDER BY MIN(retention.restore_expires_at), retention.attachment_id
          LIMIT ?
        )
        UPDATE project_component_attachment_retention_holds
        SET released_at = ?, release_reason = 'expired'
        WHERE released_at IS NULL
          AND attachment_id IN (SELECT attachment_id FROM eligible_attachments)
      `,
      values: [timestamp, timestamp, limit, timestamp],
    },
    {
      sql: `
        UPDATE component_variant_attachments AS attachment
        SET review_status = 'superseded',
            is_current_approved = 0,
            reviewed_by = ?,
            reviewed_at = ?,
            review_note = 'Project component attachment restore retention expired',
            review_revision = review_revision + 1,
            updated_at = ?
        WHERE attachment.owner_scope = 'project'
          AND attachment.review_status <> 'superseded'
          AND EXISTS (
            SELECT 1
            FROM project_component_attachment_retention_holds retention
            WHERE retention.attachment_id = attachment.id
              AND retention.release_reason = 'expired'
              AND retention.released_at = ?
          )
          AND NOT EXISTS (
            SELECT 1
            FROM project_component_attachment_retention_holds active_retention
            WHERE active_retention.attachment_id = attachment.id
              AND active_retention.released_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1
            FROM estimate_row_items row_item
            INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
            WHERE estimate.project_id = attachment.project_id
              AND ${RETENTION_PROJECT_COMPONENT_IDENTITY_SQL} = attachment.project_component_id
          )
      `,
      values: [PROJECT_ATTACHMENT_RETENTION_SYSTEM_ACTOR, timestamp, timestamp, timestamp],
    },
    {
      sql: `
        UPDATE upload_assets AS asset
        SET status = 'removed', updated_at = ?
        WHERE asset.status = 'finalized'
          AND EXISTS (
            SELECT 1
            FROM component_variant_attachments attachment
            INNER JOIN project_component_attachment_retention_holds retention
              ON retention.attachment_id = attachment.id
            WHERE attachment.upload_asset_id = asset.id
              AND attachment.owner_scope = 'project'
              AND attachment.review_status = 'superseded'
              AND retention.release_reason = 'expired'
              AND retention.released_at = ?
          )
          AND NOT EXISTS (
            SELECT 1
            FROM component_variant_attachments active_attachment
            WHERE active_attachment.upload_asset_id = asset.id
              AND active_attachment.review_status <> 'superseded'
          )
      `,
      values: [timestamp, timestamp],
    },
  ];
  const results = await database.batch(
    statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))),
  );
  if (results.some((result) => result.success === false)) {
    throw new Error("Project component attachment retention cleanup failed.");
  }
  return {
    liveInstanceReleaseCount: results[0]?.meta?.changes ?? 0,
    expiredReleaseCount: results[1]?.meta?.changes ?? 0,
    supersededAttachmentCount: results[2]?.meta?.changes ?? 0,
    removedAssetCount: results[3]?.meta?.changes ?? 0,
  };
}
