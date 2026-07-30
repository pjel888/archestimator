import "server-only";

import { canEditEstimateStrictInD1, canEditProjectStrictInD1 } from "@/lib/authz/d1-access";
import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import { isEstimateRowProjectImageStoragePath } from "@/lib/uploads/material-image-contract";

import { firstD1Row } from "./database";
import type { EstimateD1Actor } from "./intent-context";

export type EstimateRowImageAssetDescriptor = {
  kind: "upload-asset";
  schemaVersion: 1;
  assetId: string;
  uploadSessionId: string;
  bucket: string;
  path: string;
  thumbnailPath: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  scanStatus: string;
  width: number | null;
  height: number | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
};

export type EstimateActivityRetentionMetrics = {
  workspaceEventBytes: number;
  workspaceVersionBytes: number;
  largestEventPayloadBytes: number;
  maxEstimateEventCount: number;
  estimatesOverEventThreshold: number;
  workspaceStorageOverThreshold: boolean;
};

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function canEditEstimate(
  database: D1DatabaseLike,
  actor: EstimateD1Actor | null,
  estimateId: string,
): Promise<boolean> {
  if (!actor) return false;
  return canEditEstimateStrictInD1(database, estimateId, actor);
}

export async function canEditProject(
  database: D1DatabaseLike,
  actor: EstimateD1Actor | null,
  projectId: string,
): Promise<boolean> {
  if (!actor) return false;
  return canEditProjectStrictInD1(database, projectId, actor);
}

export async function validateEstimateRowImageAsset(
  database: D1DatabaseLike,
  input: {
    projectId: string;
    estimateId: string;
    rowId: string;
    assetId: string;
    uploadSessionId: string;
  },
): Promise<EstimateRowImageAssetDescriptor | null> {
  const row = await firstD1Row<{
    id: string;
    workspace_id: string;
    actor_user_id: string;
    bucket: string | null;
    path: string | null;
    thumbnail_path: string | null;
    file_name: string;
    content_type: string;
    size_bytes: number | string;
    scan_status: string | null;
    metadata_json: string | null;
  }>(
    database,
    `
      SELECT asset.id, asset.workspace_id, asset.actor_user_id,
             asset.storage_bucket AS bucket, asset.storage_path AS path,
             asset.thumbnail_path, asset.file_name, asset.content_type,
             asset.size_bytes, asset.scan_status, asset.metadata_json
      FROM upload_assets AS asset
      JOIN projects AS project ON project.id = asset.project_id
      WHERE asset.id = ?
        AND asset.upload_session_id = ?
        AND asset.project_id = ?
        AND asset.estimate_id = ?
        AND asset.target_entity_id = ?
        AND asset.workspace_id = project.workspace_id
        AND asset.surface = 'project-image'
        AND asset.storage_bucket = 'project-images'
        AND asset.target_entity_type = 'estimate-row'
        AND asset.status = 'finalized'
        AND asset.purge_state = 'active'
      LIMIT 1
    `,
    [input.assetId, input.uploadSessionId, input.projectId, input.estimateId, input.rowId],
  );
  if (
    !row?.id
    || row.bucket !== "project-images"
    || row.content_type !== "image/webp"
    || !isEstimateRowProjectImageStoragePath(row.path, {
      workspaceId: row.workspace_id,
      actorUserId: row.actor_user_id,
      projectId: input.projectId,
      estimateId: input.estimateId,
    })
    || row.thumbnail_path !== row.path.replace(/\.webp$/, "-thumb.webp")
    || !isEstimateRowProjectImageStoragePath(row.thumbnail_path, {
      workspaceId: row.workspace_id,
      actorUserId: row.actor_user_id,
      projectId: input.projectId,
      estimateId: input.estimateId,
    })
  ) return null;
  const metadata = readJsonRecord(row.metadata_json);
  return {
    kind: "upload-asset",
    schemaVersion: 1,
    assetId: row.id,
    uploadSessionId: input.uploadSessionId,
    bucket: row.bucket,
    path: row.path,
    thumbnailPath: row.thumbnail_path ?? null,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: readNumber(row.size_bytes),
    scanStatus: row.scan_status ?? "pending",
    width: typeof metadata.width === "number" ? metadata.width : null,
    height: typeof metadata.height === "number" ? metadata.height : null,
    thumbnailWidth: typeof metadata.thumbnailWidth === "number" ? metadata.thumbnailWidth : null,
    thumbnailHeight: typeof metadata.thumbnailHeight === "number" ? metadata.thumbnailHeight : null,
  };
}

export async function getEstimateActivityRetentionMetrics(
  database: D1DatabaseLike,
  input: { projectId: string },
): Promise<EstimateActivityRetentionMetrics | null> {
  const row = await firstD1Row<{
    workspace_event_bytes: number;
    workspace_version_bytes: number;
    largest_event_payload_bytes: number;
    max_estimate_event_count: number;
    estimates_over_event_threshold: number;
    workspace_storage_over_threshold: number | boolean;
  }>(
    database,
    `
      SELECT
        COALESCE(SUM(length(payload) + length(COALESCE(old_snapshot, '')) + length(COALESCE(new_snapshot, ''))), 0) AS workspace_event_bytes,
        0 AS workspace_version_bytes,
        COALESCE(MAX(length(payload)), 0) AS largest_event_payload_bytes,
        COALESCE(MAX(event_count), 0) AS max_estimate_event_count,
        COALESCE(SUM(CASE WHEN event_count > 5000 THEN 1 ELSE 0 END), 0) AS estimates_over_event_threshold,
        0 AS workspace_storage_over_threshold
      FROM (
        SELECT event.estimate_id, COUNT(*) AS event_count, event.payload, event.old_snapshot, event.new_snapshot
        FROM estimate_sheet_events event
        WHERE event.project_id = ?
        GROUP BY event.estimate_id, event.id
      )
    `,
    [input.projectId],
  );
  if (!row) return null;
  return {
    workspaceEventBytes: readNumber(row.workspace_event_bytes),
    workspaceVersionBytes: readNumber(row.workspace_version_bytes),
    largestEventPayloadBytes: readNumber(row.largest_event_payload_bytes),
    maxEstimateEventCount: readNumber(row.max_estimate_event_count),
    estimatesOverEventThreshold: readNumber(row.estimates_over_event_threshold),
    workspaceStorageOverThreshold: row.workspace_storage_over_threshold === true
      || readNumber(row.workspace_storage_over_threshold) > 0,
  };
}
