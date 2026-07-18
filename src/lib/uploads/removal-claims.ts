import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";

import type { UploadSurface } from "./policy";

const REMOVAL_DELAY_MS = 5 * 60 * 1000;

export function getUploadRemovalCleanupNotBefore(now: Date) {
  return new Date(now.getTime() + REMOVAL_DELAY_MS).toISOString();
}

type ClaimedAssetRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
};

type RemovalClaimDiagnosticRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  is_referenced: number | boolean | null;
  is_already_removed: number | boolean | null;
};

export type UploadRemovalClaimStatus =
  | "claimed"
  | "partial"
  | "referenced"
  | "already_claimed"
  | "not_found";

export type UploadRemovalClaimResult = {
  status: UploadRemovalClaimStatus;
  claimedAssetIds: string[];
  claimedPaths: string[];
  blockedAssetIds: string[];
  blockedPaths: string[];
  alreadyRemovedAssetIds: string[];
  alreadyRemovedPaths: string[];
};

export type ClaimUploadAssetsForRemovalInput = {
  workspaceId: string | readonly string[];
  actorUserId?: string | null;
  surface: UploadSurface;
  bucket: string;
  paths: readonly string[];
  claimId?: string;
  now?: Date;
};

function jsonTextReferencePredicate(tableAlias: string, jsonColumn: string, assetAlias: string) {
  return `
    EXISTS (
      SELECT 1
      FROM json_tree(
        CASE
          WHEN json_valid(${tableAlias}.${jsonColumn}) THEN ${tableAlias}.${jsonColumn}
          ELSE '{}'
        END
      ) AS reference_value
      WHERE reference_value.type = 'text'
        AND reference_value.value IN (
          ${assetAlias}.id,
          ${assetAlias}.upload_session_id,
          ${assetAlias}.storage_path,
          ${assetAlias}.thumbnail_path,
          '/api/component-library/images?path=' || replace(${assetAlias}.storage_path, '/', '%2F'),
          '/api/component-library/images?path=' || replace(${assetAlias}.thumbnail_path, '/', '%2F'),
          '/api/projects/images?path=' || replace(${assetAlias}.storage_path, '/', '%2F'),
          '/api/projects/images?path=' || replace(${assetAlias}.thumbnail_path, '/', '%2F')
        )
    )
  `;
}

export function uploadAssetAcceptedReferencePredicate(assetAlias: string) {
  return `
    EXISTS (
      SELECT 1
      FROM component_variant_attachments attachment
      WHERE attachment.upload_asset_id = ${assetAlias}.id
    )
    OR EXISTS (
      SELECT 1
      FROM project_component_attachment_retention_holds retention
      WHERE retention.upload_asset_id = ${assetAlias}.id
        AND retention.released_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM upload_assets other_asset
      WHERE other_asset.id <> ${assetAlias}.id
        AND other_asset.workspace_id = ${assetAlias}.workspace_id
        AND other_asset.storage_bucket = ${assetAlias}.storage_bucket
        AND other_asset.status IN ('reserved', 'pending', 'finalized')
        AND other_asset.purge_state <> 'purged'
        AND (
          other_asset.storage_path IN (${assetAlias}.storage_path, ${assetAlias}.thumbnail_path)
          OR other_asset.thumbnail_path IN (${assetAlias}.storage_path, ${assetAlias}.thumbnail_path)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM projects project
      WHERE project.workspace_id = ${assetAlias}.workspace_id
        AND ${jsonTextReferencePredicate("project", "metadata", assetAlias)}
    )
    OR EXISTS (
      SELECT 1
      FROM cost_library_items item
      WHERE item.workspace_id = ${assetAlias}.workspace_id
        AND (
          item.thumbnail_path IN (
            ${assetAlias}.storage_path,
            ${assetAlias}.thumbnail_path,
            '/api/component-library/images?path=' || replace(${assetAlias}.storage_path, '/', '%2F'),
            '/api/component-library/images?path=' || replace(${assetAlias}.thumbnail_path, '/', '%2F')
          )
          OR ${jsonTextReferencePredicate("item", "metadata_json", assetAlias)}
        )
    )
    OR EXISTS (
      SELECT 1
      FROM cost_library_item_price_options price_option
      WHERE price_option.workspace_id = ${assetAlias}.workspace_id
        AND ${jsonTextReferencePredicate("price_option", "metadata_json", assetAlias)}
    )
    OR EXISTS (
      SELECT 1
      FROM estimate_row_items estimate_row
      WHERE ${jsonTextReferencePredicate("estimate_row", "source_snapshot_json", assetAlias)}
         OR ${jsonTextReferencePredicate("estimate_row", "metadata_json", assetAlias)}
    )
    OR EXISTS (
      SELECT 1
      FROM estimate_template_row_items template_row
      WHERE ${jsonTextReferencePredicate("template_row", "source_snapshot", assetAlias)}
         OR ${jsonTextReferencePredicate("template_row", "metadata", assetAlias)}
    )
    OR EXISTS (
      SELECT 1
      FROM cost_library_item_versions item_version
      WHERE item_version.workspace_id = ${assetAlias}.workspace_id
        AND ${jsonTextReferencePredicate("item_version", "snapshot_json", assetAlias)}
    )
    OR EXISTS (
      SELECT 1
      FROM cost_library_item_price_history price_history
      WHERE price_history.workspace_id = ${assetAlias}.workspace_id
        AND (
          ${jsonTextReferencePredicate("price_history", "old_snapshot", assetAlias)}
          OR ${jsonTextReferencePredicate("price_history", "new_snapshot", assetAlias)}
        )
    )
    OR EXISTS (
      SELECT 1
      FROM estimate_sheet_events estimate_event
      WHERE estimate_event.workspace_id = ${assetAlias}.workspace_id
        AND (
          ${jsonTextReferencePredicate("estimate_event", "old_snapshot", assetAlias)}
          OR ${jsonTextReferencePredicate("estimate_event", "new_snapshot", assetAlias)}
          OR ${jsonTextReferencePredicate("estimate_event", "row_context", assetAlias)}
          OR ${jsonTextReferencePredicate("estimate_event", "payload", assetAlias)}
          OR ${jsonTextReferencePredicate("estimate_event", "metadata", assetAlias)}
        )
    )
    OR EXISTS (
      SELECT 1
      FROM project_publications publication
      WHERE publication.workspace_id = ${assetAlias}.workspace_id
        AND ${jsonTextReferencePredicate("publication", "snapshot_json", assetAlias)}
    )
  `;
}

function normalizeStrings(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeWorkspaceIds(value: string | readonly string[]) {
  return normalizeStrings(typeof value === "string" ? [value] : value);
}

function matchedAssetCte(actorScoped: boolean) {
  return `
    WITH requested_paths(path) AS (
      SELECT CAST(value AS TEXT)
      FROM json_each(?)
    ),
    matched_assets(id) AS (
      SELECT asset.id
      FROM upload_assets asset
      WHERE asset.workspace_id IN (
          SELECT CAST(value AS TEXT)
          FROM json_each(?)
        )
        ${actorScoped ? "AND asset.actor_user_id = ?" : ""}
        AND asset.surface = ?
        AND asset.storage_bucket = ?
        AND (
          asset.storage_path IN (SELECT path FROM requested_paths)
          OR asset.thumbnail_path IN (SELECT path FROM requested_paths)
        )
        AND (
          (
            asset.status IN ('pending', 'finalized')
            AND asset.purge_state = 'active'
          )
          OR asset.status IN ('removed', 'deleted')
          OR asset.purge_state <> 'active'
        )
    )
  `;
}

function matchedAssetValues(
  input: ClaimUploadAssetsForRemovalInput,
  paths: string[],
  workspaceIds: string[],
): D1Value[] {
  return [
    JSON.stringify(paths),
    JSON.stringify(workspaceIds),
    ...(input.actorUserId ? [input.actorUserId] : []),
    input.surface,
    input.bucket,
  ];
}

function emptyClaimResult(status: "not_found"): UploadRemovalClaimResult {
  return {
    status,
    claimedAssetIds: [],
    claimedPaths: [],
    blockedAssetIds: [],
    blockedPaths: [],
    alreadyRemovedAssetIds: [],
    alreadyRemovedPaths: [],
  };
}

function assetObjectPaths(rows: readonly ClaimedAssetRow[]) {
  return normalizeStrings(
    rows.flatMap((row) => [row.storage_path, row.thumbnail_path ?? ""]),
  );
}

function deriveClaimStatus({
  claimedAssetIds,
  blockedAssetIds,
  alreadyRemovedAssetIds,
}: Pick<
  UploadRemovalClaimResult,
  "claimedAssetIds" | "blockedAssetIds" | "alreadyRemovedAssetIds"
>): UploadRemovalClaimStatus {
  if (claimedAssetIds.length > 0) {
    return blockedAssetIds.length > 0 || alreadyRemovedAssetIds.length > 0
      ? "partial"
      : "claimed";
  }
  if (blockedAssetIds.length > 0) return "referenced";
  if (alreadyRemovedAssetIds.length > 0) return "already_claimed";
  return "not_found";
}

export async function claimUploadAssetsForRemoval(
  db: D1DatabaseLike,
  input: ClaimUploadAssetsForRemovalInput,
): Promise<UploadRemovalClaimResult> {
  const paths = normalizeStrings(input.paths);
  const workspaceIds = normalizeWorkspaceIds(input.workspaceId);
  if (paths.length === 0 || workspaceIds.length === 0) return emptyClaimResult("not_found");

  const actorScoped = Boolean(input.actorUserId);
  const now = input.now ?? new Date();
  const claimedAt = now.toISOString();
  const cleanupNotBefore = getUploadRemovalCleanupNotBefore(now);
  const claimId = input.claimId?.trim() || randomUUID();
  const cte = matchedAssetCte(actorScoped);
  const baseValues = matchedAssetValues(input, paths, workspaceIds);
  const referencePredicate = uploadAssetAcceptedReferencePredicate("candidate");

  const claimResult = await db.prepare<ClaimedAssetRow>(
    `
      ${cte}
      UPDATE upload_assets AS asset
      SET status = 'removed',
          removal_claim_id = ?,
          removal_claimed_at = ?,
          cleanup_not_before = ?,
          purge_state = 'pending',
          purged_at = NULL,
          updated_at = ?
      WHERE asset.id IN (SELECT id FROM matched_assets)
        AND asset.status IN ('pending', 'finalized')
        AND asset.purge_state = 'active'
        AND NOT EXISTS (
          SELECT 1
          FROM upload_assets candidate
          WHERE candidate.id = asset.id
            AND (${referencePredicate})
        )
      RETURNING id, storage_path, thumbnail_path
    `,
  ).bind(
    ...baseValues,
    claimId,
    claimedAt,
    cleanupNotBefore,
    claimedAt,
  ).all<ClaimedAssetRow>();

  if (claimResult.success === false) throw new Error("Could not claim upload assets for removal.");
  const claimedRows = claimResult.results ?? [];
  const claimedAssetIds = normalizeStrings(claimedRows.map((row) => row.id));
  const claimedPaths = assetObjectPaths(claimedRows);
  const claimedAssetIdSet = new Set(claimedAssetIds);
  const claimedPathSet = new Set(claimedPaths);

  const diagnosticResult = await db.prepare<RemovalClaimDiagnosticRow>(
    `
      ${cte}
      SELECT
        asset.id,
        asset.storage_path,
        asset.thumbnail_path,
        CASE WHEN (${uploadAssetAcceptedReferencePredicate("asset")}) THEN 1 ELSE 0 END AS is_referenced,
        CASE
          WHEN asset.status IN ('removed', 'deleted') OR asset.purge_state <> 'active'
          THEN 1
          ELSE 0
        END AS is_already_removed
      FROM upload_assets asset
      WHERE asset.id IN (SELECT id FROM matched_assets)
        AND asset.id NOT IN (
          SELECT CAST(value AS TEXT)
          FROM json_each(?)
        )
    `,
  ).bind(...baseValues, JSON.stringify(claimedAssetIds)).all<RemovalClaimDiagnosticRow>();

  if (diagnosticResult.success === false) {
    throw new Error("Could not classify upload assets after removal claim.");
  }

  const blockedRows: ClaimedAssetRow[] = [];
  const alreadyRemovedRows: ClaimedAssetRow[] = [];
  const classifiedAssetIds = new Set(claimedAssetIdSet);
  for (const row of diagnosticResult.results ?? []) {
    const id = row.id.trim();
    if (!id || classifiedAssetIds.has(id)) continue;
    const assetRow: ClaimedAssetRow = {
      id,
      storage_path: row.storage_path,
      thumbnail_path: row.thumbnail_path,
    };
    if (Boolean(row.is_referenced)) {
      blockedRows.push(assetRow);
      classifiedAssetIds.add(id);
      continue;
    }
    if (Boolean(row.is_already_removed)) {
      alreadyRemovedRows.push(assetRow);
      classifiedAssetIds.add(id);
      continue;
    }
    throw new Error("Could not classify an unmatched upload asset after removal claim.");
  }

  const blockedAssetIds = normalizeStrings(blockedRows.map((row) => row.id));
  const blockedPaths = assetObjectPaths(blockedRows).filter(
    (path) => !claimedPathSet.has(path),
  );
  const blockedPathSet = new Set(blockedPaths);
  const alreadyRemovedAssetIds = normalizeStrings(
    alreadyRemovedRows.map((row) => row.id),
  );
  const alreadyRemovedPaths = assetObjectPaths(alreadyRemovedRows).filter(
    (path) => !claimedPathSet.has(path) && !blockedPathSet.has(path),
  );
  const resultSets = {
    claimedAssetIds,
    claimedPaths,
    blockedAssetIds,
    blockedPaths,
    alreadyRemovedAssetIds,
    alreadyRemovedPaths,
  };

  return {
    status: deriveClaimStatus(resultSets),
    ...resultSets,
  };
}
