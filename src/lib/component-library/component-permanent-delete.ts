import { createHash } from "node:crypto";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import type {
  BulkActionExecutionResult,
  BulkActionIssue,
  BulkActionPreviewResult,
  StorageCleanupTarget,
} from "@/lib/mass-deletion/bulk-action";
import { getUploadRemovalCleanupNotBefore } from "@/lib/uploads/removal-claims";

export const MAX_PERMANENT_DELETE_DEPENDENTS = 400;

type ComponentDeleteComponentIdentity = {
  id: string;
  lifecycleState: string;
  name: string;
  snapshot: Record<string, unknown>;
  updatedAt: string;
  versionNumber: number;
};

type ComponentDeletePriceOptionIdentity = {
  id: string;
  imageAssetId: string | null;
  imagePath: string | null;
  itemId: string;
  snapshot: Record<string, unknown>;
  thumbnailPath: string | null;
  updatedAt: string;
};

type ComponentDeleteEstimateRowIdentity = {
  adjustmentPercentage: number;
  componentId: string;
  contingencyPercentage: number;
  description: string;
  estimateId: string;
  material: string;
  metadata: Record<string, unknown>;
  miscCost: number;
  nodeId: string | null;
  projectId: string;
  quantity: number;
  rowId: string;
  rowRevision: number;
  snapshot: Record<string, unknown>;
  sourceSnapshot: Record<string, unknown>;
  tabId: string | null;
  unit: string;
  unitCost: number;
  updatedAt: string;
};

type ComponentDeleteTemplateRowIdentity = {
  componentId: string;
  description: string;
  material: string;
  metadata: Record<string, unknown>;
  sourceSnapshot: Record<string, unknown> | null;
  snapshot: Record<string, unknown>;
  templateId: string;
  templateNodeId: string;
  templateRowId: string;
  updatedAt: string;
};

type ComponentDeleteAttachmentIdentity = {
  attachmentId: string;
  componentId: string;
  priceOptionId: string;
  reviewRevision: number;
  reviewStatus: string;
  snapshot: Record<string, unknown>;
  storageBucket: string;
  storagePath: string;
  updatedAt: string;
  uploadAssetId: string;
};

type ComponentDeleteAssetIdentity = {
  cleanup: boolean;
  id: string;
  retainedByAnotherOwner: boolean;
  status: string;
  storageBucket: string | null;
  storagePath: string | null;
  snapshot: Record<string, unknown>;
  thumbnailPath: string | null;
  updatedAt: string;
};

export type ComponentPermanentDeleteImpact = {
  assets: ComponentDeleteAssetIdentity[];
  attachments: ComponentDeleteAttachmentIdentity[];
  components: ComponentDeleteComponentIdentity[];
  estimateRows: ComponentDeleteEstimateRowIdentity[];
  priceOptions: ComponentDeletePriceOptionIdentity[];
  requestedIds: string[];
  storageTargets: StorageCleanupTarget[];
  templateRows: ComponentDeleteTemplateRowIdentity[];
  workspaceId: string;
};

export type ComponentPermanentDeleteReceiptRow = {
  actor_user_id: string;
  blocked_json: string;
  correlation_id: string;
  id: string;
  metadata_json: string;
  preview_hash: string;
  status: string;
  storage_targets_json: string;
  summary_json: string;
  target_ids_json: string;
};

type ComponentRow = {
  current_version_number: number | string;
  id: string;
  lifecycle_state: string;
  name: string;
  updated_at: string;
} & Record<string, D1Value>;

type PriceOptionRow = {
  id: string;
  image_asset_id: string | null;
  image_path: string | null;
  item_id: string;
  thumbnail_path: string | null;
  updated_at: string;
} & Record<string, D1Value>;

type EstimateRow = {
  adjustment_percentage: number | string | null;
  component_id: string;
  contingency_percentage: number | string | null;
  description: string;
  estimate_id: string;
  material: string;
  metadata_json: string;
  misc_cost: number | string | null;
  node_id: string | null;
  project_id: string;
  quantity: number | string | null;
  row_id: string;
  row_revision: number | string;
  source_snapshot_json: string;
  tab_id: string | null;
  unit: string;
  unit_cost: number | string | null;
  updated_at: string;
} & Record<string, D1Value>;

type TemplateRow = {
  component_id: string;
  description: string;
  material: string;
  metadata: string;
  source_snapshot: string | null;
  template_id: string;
  template_node_id: string;
  template_row_id: string;
  updated_at: string;
} & Record<string, D1Value>;

type AttachmentRow = {
  attachment_id: string;
  component_id: string;
  price_option_id: string;
  review_revision: number | string;
  review_status: string;
  storage_bucket: string;
  storage_path: string;
  updated_at: string;
  upload_asset_id: string;
} & Record<string, D1Value>;

type AssetRow = {
  id: string;
  retained_by_another_owner: number | string;
  status: string;
  storage_bucket: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  updated_at: string;
} & Record<string, D1Value>;

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function snapshotD1Row(row: Record<string, D1Value>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    value instanceof ArrayBuffer ? Array.from(new Uint8Array(value)) : value,
  ]));
}

function dedupeStorageTargets(targets: StorageCleanupTarget[]) {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.bucket}:${target.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[] = []) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Something went wrong. Try again in a moment.");
  return result.results ?? [];
}

export async function loadComponentPermanentDeleteImpact(
  database: D1DatabaseLike,
  workspaceId: string,
  requestedIds: string[],
): Promise<ComponentPermanentDeleteImpact> {
  const sortedIds = [...requestedIds].sort();
  const targetIdsJson = JSON.stringify(sortedIds);
  const [componentRows, priceOptionRows, estimateRows, templateRows, attachmentRows, assetRows] = await Promise.all([
    all<ComponentRow>(database, `
      SELECT item.*
      FROM cost_library_items item
      WHERE item.workspace_id = ?
        AND item.id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
      ORDER BY id
    `, [workspaceId, targetIdsJson]),
    all<PriceOptionRow>(database, `
      SELECT
        price_option.*,
        json_extract(price_option.metadata_json, '$.imageMetadata.assetId') AS image_asset_id,
        json_extract(price_option.metadata_json, '$.imagePath') AS image_path,
        json_extract(price_option.metadata_json, '$.thumbnailPath') AS thumbnail_path
      FROM cost_library_item_price_options price_option
      WHERE price_option.workspace_id = ?
        AND price_option.item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
      ORDER BY item_id, id
    `, [workspaceId, targetIdsJson]),
    all<EstimateRow>(database, `
      SELECT
        row_item.*,
        row_item.id AS row_id,
        row_item.source_library_item_id AS component_id,
        row_item.row_revision,
        row_item.updated_at,
        row_item.estimate_id,
        estimate.project_id,
        row_item.node_id,
        node.estimate_tab_id AS tab_id,
        row_item.material,
        row_item.description,
        row_item.quantity,
        row_item.unit,
        row_item.unit_cost,
        row_item.misc_cost,
        row_item.contingency_percentage,
        row_item.adjustment_percentage,
        row_item.source_snapshot_json,
        row_item.metadata_json
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      INNER JOIN projects project ON project.id = estimate.project_id
      LEFT JOIN estimate_nodes node
        ON node.id = row_item.node_id
        AND node.estimate_id = row_item.estimate_id
      WHERE project.workspace_id = ?
        AND row_item.source_library_item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
      ORDER BY estimate.project_id, row_item.estimate_id, row_item.id
    `, [workspaceId, targetIdsJson]),
    all<TemplateRow>(database, `
      SELECT
        row_item.*,
        row_item.id AS template_row_id,
        row_item.template_id,
        row_item.template_node_id,
        row_item.source_library_item_id AS component_id,
        row_item.updated_at,
        row_item.material,
        row_item.description,
        row_item.source_snapshot,
        row_item.metadata
      FROM estimate_template_row_items row_item
      INNER JOIN estimate_templates template ON template.id = row_item.template_id
      WHERE template.workspace_id = ?
        AND row_item.source_library_item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
      ORDER BY row_item.template_id, row_item.id
    `, [workspaceId, targetIdsJson]),
    all<AttachmentRow>(database, `
      SELECT
        attachment.*,
        attachment.id AS attachment_id,
        attachment.item_id AS component_id,
        attachment.price_option_id,
        attachment.upload_asset_id,
        attachment.storage_bucket,
        attachment.storage_path,
        attachment.review_status,
        attachment.review_revision,
        attachment.updated_at
      FROM component_variant_attachments attachment
      WHERE attachment.workspace_id = ?
        AND attachment.owner_scope = 'library'
        AND attachment.item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
      ORDER BY attachment.item_id, attachment.price_option_id, attachment.id
    `, [workspaceId, targetIdsJson]),
    all<AssetRow>(database, `
      WITH target_ids(id) AS (
        SELECT CAST(value AS TEXT) FROM json_each(?)
      ),
      target_assets(id) AS (
        SELECT DISTINCT attachment.upload_asset_id
        FROM component_variant_attachments attachment
        INNER JOIN target_ids target ON target.id = attachment.item_id
        WHERE attachment.workspace_id = ?
          AND attachment.owner_scope = 'library'
        UNION
        SELECT DISTINCT json_extract(price_option.metadata_json, '$.imageMetadata.assetId')
        FROM cost_library_item_price_options price_option
        INNER JOIN target_ids target ON target.id = price_option.item_id
        WHERE price_option.workspace_id = ?
          AND json_type(price_option.metadata_json, '$.imageMetadata.assetId') = 'text'
      )
      SELECT
        asset.*,
        CASE WHEN EXISTS (
          SELECT 1
          FROM component_variant_attachments attachment
          WHERE attachment.upload_asset_id = asset.id
            AND (
              attachment.workspace_id <> ?
              OR attachment.owner_scope <> 'library'
              OR attachment.item_id NOT IN (SELECT id FROM target_ids)
            )
        ) OR EXISTS (
          SELECT 1
          FROM cost_library_item_price_options price_option
          WHERE json_extract(price_option.metadata_json, '$.imageMetadata.assetId') = asset.id
            AND (
              price_option.workspace_id <> ?
              OR price_option.item_id NOT IN (SELECT id FROM target_ids)
            )
        ) OR EXISTS (
          SELECT 1
          FROM upload_assets other_asset
          WHERE other_asset.id NOT IN (SELECT id FROM target_assets)
            AND (
              (asset.storage_bucket IS NOT NULL AND other_asset.storage_bucket = asset.storage_bucket AND (
                other_asset.storage_path = asset.storage_path
                OR other_asset.thumbnail_path = asset.storage_path
              ))
              OR (asset.thumbnail_path IS NOT NULL AND other_asset.storage_bucket = asset.storage_bucket AND (
                other_asset.storage_path = asset.thumbnail_path
                OR other_asset.thumbnail_path = asset.thumbnail_path
              ))
            )
        ) THEN 1 ELSE 0 END AS retained_by_another_owner
      FROM upload_assets asset
      INNER JOIN target_assets target_asset ON target_asset.id = asset.id
      ORDER BY asset.id
    `, [targetIdsJson, workspaceId, workspaceId, workspaceId, workspaceId]),
  ]);

  const assets = assetRows.map((row): ComponentDeleteAssetIdentity => {
    const retainedByAnotherOwner = numberValue(row.retained_by_another_owner) === 1;
    const cleanup = !retainedByAnotherOwner
      && row.status !== "removed"
      && row.status !== "deleted"
      && Boolean(row.storage_bucket && row.storage_path);
    return {
      cleanup,
      id: row.id,
      retainedByAnotherOwner,
      snapshot: snapshotD1Row(row),
      status: row.status,
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      thumbnailPath: row.thumbnail_path,
      updatedAt: row.updated_at,
    };
  });
  const storageTargets = dedupeStorageTargets(assets.flatMap((asset) => {
    if (!asset.cleanup || !asset.storageBucket || !asset.storagePath) return [];
    const targets = [{ bucket: asset.storageBucket, path: asset.storagePath }];
    if (asset.thumbnailPath) targets.push({ bucket: asset.storageBucket, path: asset.thumbnailPath });
    return targets;
  }));

  return {
    workspaceId,
    requestedIds: sortedIds,
    components: componentRows.map((row) => ({
      id: row.id,
      lifecycleState: row.lifecycle_state,
      name: row.name,
      snapshot: snapshotD1Row(row),
      updatedAt: row.updated_at,
      versionNumber: numberValue(row.current_version_number, 1),
    })),
    priceOptions: priceOptionRows.map((row) => ({
      id: row.id,
      imageAssetId: row.image_asset_id,
      imagePath: row.image_path,
      itemId: row.item_id,
      snapshot: snapshotD1Row(row),
      thumbnailPath: row.thumbnail_path,
      updatedAt: row.updated_at,
    })),
    estimateRows: estimateRows.map((row) => ({
      adjustmentPercentage: numberValue(row.adjustment_percentage),
      componentId: row.component_id,
      contingencyPercentage: numberValue(row.contingency_percentage),
      description: row.description,
      estimateId: row.estimate_id,
      material: row.material,
      metadata: parseJsonObject(row.metadata_json),
      miscCost: numberValue(row.misc_cost),
      nodeId: row.node_id,
      projectId: row.project_id,
      quantity: numberValue(row.quantity),
      rowId: row.row_id,
      rowRevision: numberValue(row.row_revision),
      snapshot: snapshotD1Row(row),
      sourceSnapshot: parseJsonObject(row.source_snapshot_json),
      tabId: row.tab_id,
      unit: row.unit,
      unitCost: numberValue(row.unit_cost),
      updatedAt: row.updated_at,
    })),
    templateRows: templateRows.map((row) => ({
      componentId: row.component_id,
      description: row.description,
      material: row.material,
      metadata: parseJsonObject(row.metadata),
      sourceSnapshot: row.source_snapshot ? parseJsonObject(row.source_snapshot) : null,
      snapshot: snapshotD1Row(row),
      templateId: row.template_id,
      templateNodeId: row.template_node_id,
      templateRowId: row.template_row_id,
      updatedAt: row.updated_at,
    })),
    attachments: attachmentRows.map((row) => ({
      attachmentId: row.attachment_id,
      componentId: row.component_id,
      priceOptionId: row.price_option_id,
      reviewRevision: numberValue(row.review_revision, 1),
      reviewStatus: row.review_status,
      snapshot: snapshotD1Row(row),
      storageBucket: row.storage_bucket,
      storagePath: row.storage_path,
      updatedAt: row.updated_at,
      uploadAssetId: row.upload_asset_id,
    })),
    assets,
    storageTargets,
  };
}

export function createComponentPermanentDeletePreviewHash(impact: ComponentPermanentDeleteImpact) {
  return createHash("sha256").update(JSON.stringify({
    schemaVersion: "library_component_permanent_delete.v1",
    workspaceId: impact.workspaceId,
    requestedIds: impact.requestedIds,
    components: impact.components,
    priceOptions: impact.priceOptions,
    estimateRows: impact.estimateRows,
    templateRows: impact.templateRows,
    attachments: impact.attachments,
    assets: impact.assets,
    storageTargets: impact.storageTargets,
  })).digest("hex");
}

export function buildComponentPermanentDeletePreview(
  impact: ComponentPermanentDeleteImpact,
): BulkActionPreviewResult {
  const componentById = new Map(impact.components.map((component) => [component.id, component]));
  const missingIssues: BulkActionIssue[] = impact.requestedIds.flatMap((id) => componentById.has(id)
    ? []
    : [{ id, code: "not_found", message: "Component was not found in this workspace." }]);
  const dependentRowCount = impact.estimateRows.length + impact.templateRows.length;
  const limitIssues: BulkActionIssue[] = dependentRowCount > MAX_PERMANENT_DELETE_DEPENDENTS
    ? [{
        code: "batch_limit_exceeded",
        message: `Permanent delete is limited to ${MAX_PERMANENT_DELETE_DEPENDENTS} linked estimate and template rows. Archive this component instead.`,
        details: {
          dependentRowCount,
          maximumDependentRowCount: MAX_PERMANENT_DELETE_DEPENDENTS,
          recommendedAction: "archive",
        },
      }]
    : [];
  const issues = [...missingIssues, ...limitIssues];
  const estimateOwnerCount = new Set(impact.estimateRows.map((row) => row.estimateId)).size;
  const templateOwnerCount = new Set(impact.templateRows.map((row) => row.templateId)).size;
  const summary = {
    requestedCount: impact.requestedIds.length,
    eligibleCount: impact.components.length,
    blockedCount: issues.length,
    estimateRowCount: impact.estimateRows.length,
    templateRowCount: impact.templateRows.length,
    dependentRowCount,
    estimateOwnerCount,
    templateOwnerCount,
    attachmentCount: impact.attachments.length,
    retainedAssetCount: impact.assets.filter((asset) => asset.retainedByAnotherOwner).length,
    storageCleanupTargetCount: impact.storageTargets.length,
    maximumDependentRowCount: MAX_PERMANENT_DELETE_DEPENDENTS,
    nonRestorable: true,
  };
  return {
    ok: impact.components.length > 0 && issues.length === 0,
    targetType: "library_component",
    ids: impact.requestedIds,
    eligibleIds: impact.components.map((component) => component.id),
    previewHash: createComponentPermanentDeletePreviewHash(impact),
    summary,
    issues,
    blocked: issues,
    storageTargets: impact.storageTargets,
  };
}

function exactSetGuardSql(input: {
  actualSql: string;
  comparisons: string[];
  expectedColumns: string[];
  expectedJsonPathByColumn: Record<string, string>;
  guardName: string;
}) {
  const expectedProjection = input.expectedColumns.map((column) => (
    `json_extract(value, '${input.expectedJsonPathByColumn[column]}') AS ${column}`
  )).join(",\n          ");
  return `
    WITH expected AS (
      SELECT
          ${expectedProjection}
      FROM json_each(?)
    ),
    actual AS (
      ${input.actualSql}
    )
    SELECT CASE WHEN
      (SELECT COUNT(*) FROM expected) = (SELECT COUNT(*) FROM actual)
      AND NOT EXISTS (
        SELECT 1
        FROM expected
        LEFT JOIN actual ON actual.id = expected.id
        WHERE actual.id IS NULL
          OR ${input.comparisons.join("\n          OR ")}
      )
    THEN 1 ELSE json('') END AS ${input.guardName}
  `;
}

export function buildComponentPermanentDeleteStatements(input: {
  actorUserId: string;
  correlationId: string;
  eventId: string;
  impact: ComponentPermanentDeleteImpact;
  preview: BulkActionPreviewResult;
  previewHash: string;
  timestamp: string;
}): Array<{ sql: string; values: D1Value[] }> {
  const { impact } = input;
  const targetIdsJson = JSON.stringify(impact.components.map((component) => component.id));
  const componentsJson = JSON.stringify(impact.components);
  const priceOptionsJson = JSON.stringify(impact.priceOptions);
  const estimateRowsJson = JSON.stringify(impact.estimateRows);
  const templateRowsJson = JSON.stringify(impact.templateRows);
  const attachmentsJson = JSON.stringify(impact.attachments);
  const assetsJson = JSON.stringify(impact.assets);
  const cleanupAssetIdsJson = JSON.stringify(impact.assets.filter((asset) => asset.cleanup).map((asset) => asset.id));
  const cleanupNotBefore = getUploadRemovalCleanupNotBefore(new Date(input.timestamp));
  const storageTargetsJson = JSON.stringify(impact.storageTargets);
  const componentIds = impact.components.map((component) => component.id);
  const receiptMetadata = {
    schemaVersion: "library_component_permanent_delete.v1",
    nonRestorable: true,
    components: impact.components,
    priceOptions: impact.priceOptions,
    estimateRows: impact.estimateRows,
    templateRows: impact.templateRows,
    attachments: impact.attachments,
    assets: impact.assets,
    estimateOwners: [...new Set(impact.estimateRows.map((row) => row.estimateId))],
    templateOwners: [...new Set(impact.templateRows.map((row) => row.templateId))],
  };

  return [
    {
      sql: exactSetGuardSql({
        actualSql: `
          SELECT
            id,
            current_version_number AS version_number,
            updated_at,
            lifecycle_state
          FROM cost_library_items
          WHERE workspace_id = ?
            AND id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
        `,
        comparisons: [
          "actual.version_number <> expected.version_number",
          "actual.updated_at <> expected.updated_at",
          "actual.lifecycle_state <> expected.lifecycle_state",
        ],
        expectedColumns: ["id", "version_number", "updated_at", "lifecycle_state"],
        expectedJsonPathByColumn: {
          id: "$.id",
          version_number: "$.versionNumber",
          updated_at: "$.updatedAt",
          lifecycle_state: "$.lifecycleState",
        },
        guardName: "component_permanent_delete_component_guard",
      }),
      values: [componentsJson, impact.workspaceId, targetIdsJson],
    },
    {
      sql: exactSetGuardSql({
        actualSql: `
          SELECT
            id,
            item_id,
            updated_at,
            json_extract(metadata_json, '$.imageMetadata.assetId') AS image_asset_id,
            json_extract(metadata_json, '$.imagePath') AS image_path,
            json_extract(metadata_json, '$.thumbnailPath') AS thumbnail_path
          FROM cost_library_item_price_options
          WHERE workspace_id = ?
            AND item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
        `,
        comparisons: [
          "actual.item_id <> expected.item_id",
          "actual.updated_at <> expected.updated_at",
          "actual.image_asset_id IS NOT expected.image_asset_id",
          "actual.image_path IS NOT expected.image_path",
          "actual.thumbnail_path IS NOT expected.thumbnail_path",
        ],
        expectedColumns: ["id", "item_id", "updated_at", "image_asset_id", "image_path", "thumbnail_path"],
        expectedJsonPathByColumn: {
          id: "$.id",
          item_id: "$.itemId",
          updated_at: "$.updatedAt",
          image_asset_id: "$.imageAssetId",
          image_path: "$.imagePath",
          thumbnail_path: "$.thumbnailPath",
        },
        guardName: "component_permanent_delete_price_option_guard",
      }),
      values: [priceOptionsJson, impact.workspaceId, targetIdsJson],
    },
    {
      sql: exactSetGuardSql({
        actualSql: `
          SELECT
            row_item.id,
            row_item.source_library_item_id AS component_id,
            row_item.row_revision,
            row_item.updated_at,
            row_item.estimate_id,
            estimate.project_id,
            row_item.node_id,
            node.estimate_tab_id AS tab_id
          FROM estimate_row_items row_item
          INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
          INNER JOIN projects project ON project.id = estimate.project_id
          LEFT JOIN estimate_nodes node
            ON node.id = row_item.node_id
            AND node.estimate_id = row_item.estimate_id
          WHERE project.workspace_id = ?
            AND row_item.source_library_item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
        `,
        comparisons: [
          "actual.component_id <> expected.component_id",
          "actual.row_revision <> expected.row_revision",
          "actual.updated_at <> expected.updated_at",
          "actual.estimate_id <> expected.estimate_id",
          "actual.project_id <> expected.project_id",
          "actual.node_id IS NOT expected.node_id",
          "actual.tab_id IS NOT expected.tab_id",
        ],
        expectedColumns: ["id", "component_id", "row_revision", "updated_at", "estimate_id", "project_id", "node_id", "tab_id"],
        expectedJsonPathByColumn: {
          id: "$.rowId",
          component_id: "$.componentId",
          row_revision: "$.rowRevision",
          updated_at: "$.updatedAt",
          estimate_id: "$.estimateId",
          project_id: "$.projectId",
          node_id: "$.nodeId",
          tab_id: "$.tabId",
        },
        guardName: "component_permanent_delete_estimate_row_guard",
      }),
      values: [estimateRowsJson, impact.workspaceId, targetIdsJson],
    },
    {
      sql: exactSetGuardSql({
        actualSql: `
          SELECT
            row_item.id,
            row_item.template_id,
            row_item.template_node_id,
            row_item.source_library_item_id AS component_id,
            row_item.updated_at
          FROM estimate_template_row_items row_item
          INNER JOIN estimate_templates template ON template.id = row_item.template_id
          WHERE template.workspace_id = ?
            AND row_item.source_library_item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
        `,
        comparisons: [
          "actual.template_id <> expected.template_id",
          "actual.template_node_id <> expected.template_node_id",
          "actual.component_id <> expected.component_id",
          "actual.updated_at <> expected.updated_at",
        ],
        expectedColumns: ["id", "template_id", "template_node_id", "component_id", "updated_at"],
        expectedJsonPathByColumn: {
          id: "$.templateRowId",
          template_id: "$.templateId",
          template_node_id: "$.templateNodeId",
          component_id: "$.componentId",
          updated_at: "$.updatedAt",
        },
        guardName: "component_permanent_delete_template_row_guard",
      }),
      values: [templateRowsJson, impact.workspaceId, targetIdsJson],
    },
    {
      sql: exactSetGuardSql({
        actualSql: `
          SELECT
            attachment.id,
            attachment.item_id AS component_id,
            attachment.price_option_id,
            attachment.upload_asset_id,
            attachment.storage_bucket,
            attachment.storage_path,
            attachment.review_status,
            attachment.review_revision,
            attachment.updated_at
          FROM component_variant_attachments attachment
          WHERE attachment.workspace_id = ?
            AND attachment.owner_scope = 'library'
            AND attachment.item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
        `,
        comparisons: [
          "actual.component_id <> expected.component_id",
          "actual.price_option_id <> expected.price_option_id",
          "actual.upload_asset_id <> expected.upload_asset_id",
          "actual.storage_bucket <> expected.storage_bucket",
          "actual.storage_path <> expected.storage_path",
          "actual.review_status <> expected.review_status",
          "actual.review_revision <> expected.review_revision",
          "actual.updated_at <> expected.updated_at",
        ],
        expectedColumns: ["id", "component_id", "price_option_id", "upload_asset_id", "storage_bucket", "storage_path", "review_status", "review_revision", "updated_at"],
        expectedJsonPathByColumn: {
          id: "$.attachmentId",
          component_id: "$.componentId",
          price_option_id: "$.priceOptionId",
          upload_asset_id: "$.uploadAssetId",
          storage_bucket: "$.storageBucket",
          storage_path: "$.storagePath",
          review_status: "$.reviewStatus",
          review_revision: "$.reviewRevision",
          updated_at: "$.updatedAt",
        },
        guardName: "component_permanent_delete_attachment_guard",
      }),
      values: [attachmentsJson, impact.workspaceId, targetIdsJson],
    },
    {
      sql: `
        WITH target_ids(id) AS (
          SELECT CAST(value AS TEXT) FROM json_each(?)
        ),
        expected AS (
          SELECT
            json_extract(value, '$.id') AS id,
            json_extract(value, '$.status') AS status,
            json_extract(value, '$.storageBucket') AS storage_bucket,
            json_extract(value, '$.storagePath') AS storage_path,
            json_extract(value, '$.thumbnailPath') AS thumbnail_path,
            json_extract(value, '$.updatedAt') AS updated_at,
            json_extract(value, '$.retainedByAnotherOwner') AS retained_by_another_owner,
            json_extract(value, '$.cleanup') AS cleanup
          FROM json_each(?)
        ),
        target_assets(id) AS (
          SELECT DISTINCT attachment.upload_asset_id
          FROM component_variant_attachments attachment
          INNER JOIN target_ids target ON target.id = attachment.item_id
          WHERE attachment.workspace_id = ?
            AND attachment.owner_scope = 'library'
          UNION
          SELECT DISTINCT json_extract(price_option.metadata_json, '$.imageMetadata.assetId')
          FROM cost_library_item_price_options price_option
          INNER JOIN target_ids target ON target.id = price_option.item_id
          WHERE price_option.workspace_id = ?
            AND json_type(price_option.metadata_json, '$.imageMetadata.assetId') = 'text'
        ),
        actual AS (
          SELECT
            asset.id,
            asset.status,
            asset.storage_bucket,
            asset.storage_path,
            asset.thumbnail_path,
            asset.updated_at,
            CASE WHEN EXISTS (
              SELECT 1
              FROM component_variant_attachments attachment
              WHERE attachment.upload_asset_id = asset.id
                AND (
                  attachment.workspace_id <> ?
                  OR attachment.owner_scope <> 'library'
                  OR attachment.item_id NOT IN (SELECT id FROM target_ids)
                )
            ) OR EXISTS (
              SELECT 1
              FROM cost_library_item_price_options price_option
              WHERE json_extract(price_option.metadata_json, '$.imageMetadata.assetId') = asset.id
                AND (
                  price_option.workspace_id <> ?
                  OR price_option.item_id NOT IN (SELECT id FROM target_ids)
                )
            ) OR EXISTS (
              SELECT 1
              FROM upload_assets other_asset
              WHERE other_asset.id NOT IN (SELECT id FROM target_assets)
                AND (
                  (asset.storage_bucket IS NOT NULL AND other_asset.storage_bucket = asset.storage_bucket AND (
                    other_asset.storage_path = asset.storage_path
                    OR other_asset.thumbnail_path = asset.storage_path
                  ))
                  OR (asset.thumbnail_path IS NOT NULL AND other_asset.storage_bucket = asset.storage_bucket AND (
                    other_asset.storage_path = asset.thumbnail_path
                    OR other_asset.thumbnail_path = asset.thumbnail_path
                  ))
                )
            ) THEN 1 ELSE 0 END AS retained_by_another_owner,
            CASE WHEN
              asset.status NOT IN ('removed', 'deleted')
              AND asset.storage_bucket IS NOT NULL
              AND asset.storage_path IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM component_variant_attachments attachment
                WHERE attachment.upload_asset_id = asset.id
                  AND (
                    attachment.workspace_id <> ?
                    OR attachment.owner_scope <> 'library'
                    OR attachment.item_id NOT IN (SELECT id FROM target_ids)
                  )
              )
              AND NOT EXISTS (
                SELECT 1
                FROM cost_library_item_price_options price_option
                WHERE json_extract(price_option.metadata_json, '$.imageMetadata.assetId') = asset.id
                  AND (
                    price_option.workspace_id <> ?
                    OR price_option.item_id NOT IN (SELECT id FROM target_ids)
                  )
              )
              AND NOT EXISTS (
                SELECT 1
                FROM upload_assets other_asset
                WHERE other_asset.id NOT IN (SELECT id FROM target_assets)
                  AND (
                    (asset.storage_bucket IS NOT NULL AND other_asset.storage_bucket = asset.storage_bucket AND (
                      other_asset.storage_path = asset.storage_path
                      OR other_asset.thumbnail_path = asset.storage_path
                    ))
                    OR (asset.thumbnail_path IS NOT NULL AND other_asset.storage_bucket = asset.storage_bucket AND (
                      other_asset.storage_path = asset.thumbnail_path
                      OR other_asset.thumbnail_path = asset.thumbnail_path
                    ))
                  )
              )
            THEN 1 ELSE 0 END AS cleanup
          FROM upload_assets asset
          INNER JOIN target_assets target_asset ON target_asset.id = asset.id
        )
        SELECT CASE WHEN
          (SELECT COUNT(*) FROM expected) = (SELECT COUNT(*) FROM actual)
          AND NOT EXISTS (
            SELECT 1
            FROM expected
            LEFT JOIN actual ON actual.id = expected.id
            WHERE actual.id IS NULL
              OR actual.status <> expected.status
              OR actual.storage_bucket IS NOT expected.storage_bucket
              OR actual.storage_path IS NOT expected.storage_path
              OR actual.thumbnail_path IS NOT expected.thumbnail_path
              OR actual.updated_at <> expected.updated_at
              OR actual.retained_by_another_owner <> expected.retained_by_another_owner
              OR actual.cleanup <> expected.cleanup
          )
        THEN 1 ELSE json('') END AS component_permanent_delete_asset_guard
      `,
      values: [
        targetIdsJson,
        assetsJson,
        impact.workspaceId,
        impact.workspaceId,
        impact.workspaceId,
        impact.workspaceId,
        impact.workspaceId,
        impact.workspaceId,
      ],
    },
    {
      sql: `
        WITH expected(row_json) AS (
          SELECT value FROM json_each(?)
        ),
        grouped AS (
          SELECT
            json_extract(row_json, '$.estimateId') AS estimate_id,
            json_extract(row_json, '$.projectId') AS project_id,
            COUNT(*) AS row_count,
            json_group_array(json(row_json)) AS rows_json
          FROM expected
          GROUP BY estimate_id, project_id
        )
        INSERT INTO estimate_sheet_events (
          id, estimate_id, workspace_id, project_id, estimate_node_id, estimate_tab_id,
          target_row_id, event_type, event_source, correlation_id, actor_user_id,
          changed_fields, row_context, old_snapshot, new_snapshot, payload, metadata,
          total_delta, created_at
        )
        SELECT
          lower(hex(randomblob(16))),
          estimate_id,
          ?,
          project_id,
          NULL,
          NULL,
          NULL,
          'library_component_rows_permanently_deleted',
          'server_action',
          ? || ':estimate:' || estimate_id,
          ?,
          '["deleted_rows"]',
          json_object('rowCount', row_count),
          json_object('rows', json(rows_json), 'nonRestorable', json('true')),
          json_object('rows', json('[]'), 'nonRestorable', json('true')),
          json_object('componentIds', json(?), 'rowCount', row_count, 'nonRestorable', json('true')),
          json_object('source', 'component-permanent-delete', 'massDeletionEventId', ?),
          NULL,
          ?
        FROM grouped
      `,
      values: [estimateRowsJson, impact.workspaceId, input.correlationId, input.actorUserId, JSON.stringify(componentIds), input.eventId, input.timestamp],
    },
    {
      sql: `
        INSERT INTO activity_event_outbox (
          id, workspace_id, event_id, status, attempt_count, available_at, created_at, updated_at
        )
        SELECT lower(hex(randomblob(16))), ?, event.id, 'pending', 0, ?, ?, ?
        FROM estimate_sheet_events event
        WHERE event.workspace_id = ?
          AND event.event_type = 'library_component_rows_permanently_deleted'
          AND json_extract(event.metadata, '$.massDeletionEventId') = ?
        ON CONFLICT(event_id) DO NOTHING
      `,
      values: [impact.workspaceId, input.timestamp, input.timestamp, input.timestamp, impact.workspaceId, input.eventId],
    },
    {
      sql: `
        WITH expected(row_json) AS (
          SELECT value FROM json_each(?)
        ),
        grouped AS (
          SELECT
            json_extract(row_json, '$.templateId') AS template_id,
            COUNT(*) AS row_count,
            json_group_array(json_extract(row_json, '$.templateRowId')) AS row_ids_json
          FROM expected
          GROUP BY template_id
        )
        INSERT INTO component_library_telemetry_events (
          id, actor_user_id, workspace_id, project_id, estimate_id, event_name,
          schema_version, surface, kind, resource_kind, action, reason, payload_json, created_at
        )
        SELECT
          lower(hex(randomblob(16))),
          ?,
          ?,
          NULL,
          NULL,
          'estimate_template_rows_permanently_deleted',
          'v1',
          'component-library',
          'permanent-delete',
          'estimate_template',
          'delete',
          'library_component_deleted',
          json_object(
            'templateId', template_id,
            'rowCount', row_count,
            'rowIds', json(row_ids_json),
            'massDeletionEventId', ?,
            'nonRestorable', json('true')
          ),
          ?
        FROM grouped
      `,
      values: [templateRowsJson, input.actorUserId, impact.workspaceId, input.eventId, input.timestamp],
    },
    {
      sql: `
        UPDATE projects
        SET publication_source_revision = publication_source_revision + 1
        WHERE workspace_id = ?
          AND id IN (
            SELECT DISTINCT json_extract(value, '$.projectId')
            FROM json_each(?)
          )
      `,
      values: [impact.workspaceId, estimateRowsJson],
    },
    {
      sql: `
        UPDATE estimate_templates
        SET updated_at = ?
        WHERE workspace_id = ?
          AND id IN (
            SELECT DISTINCT json_extract(value, '$.templateId')
            FROM json_each(?)
          )
      `,
      values: [input.timestamp, impact.workspaceId, templateRowsJson],
    },
    {
      sql: `
        DELETE FROM estimate_row_items
        WHERE id IN (
          SELECT json_extract(value, '$.rowId') FROM json_each(?)
        )
      `,
      values: [estimateRowsJson],
    },
    {
      sql: `
        DELETE FROM estimate_template_row_items
        WHERE id IN (
          SELECT json_extract(value, '$.templateRowId') FROM json_each(?)
        )
      `,
      values: [templateRowsJson],
    },
    {
      sql: `
        UPDATE upload_assets
        SET status = 'removed',
            removal_claim_id = ?,
            removal_claimed_at = ?,
            cleanup_not_before = ?,
            purge_state = 'pending',
            purged_at = NULL,
            target_entity_type = 'mass-deletion',
            target_entity_id = ?,
            metadata_json = json_set(
              metadata_json,
              '$.massDeletionEventId', ?,
              '$.cleanupRequestedAt', ?,
              '$.cleanupReason', 'library_component_permanent_delete'
            ),
            updated_at = ?
        WHERE id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
          AND workspace_id = ?
          AND status NOT IN ('removed', 'deleted')
      `,
      values: [
        input.eventId,
        input.timestamp,
        cleanupNotBefore,
        input.eventId,
        input.eventId,
        input.timestamp,
        input.timestamp,
        cleanupAssetIdsJson,
        impact.workspaceId,
      ],
    },
    {
      sql: `
        DELETE FROM cost_library_items
        WHERE workspace_id = ?
          AND id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
      `,
      values: [impact.workspaceId, targetIdsJson],
    },
    {
      sql: `
        INSERT INTO mass_deletion_events (
          id, workspace_id, actor_user_id, target_type, action, target_ids_json,
          preview_hash, correlation_id, status, summary_json, blocked_json,
          storage_targets_json, metadata_json, created_at, updated_at
        )
        VALUES (?, ?, ?, 'library_component', 'delete', ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)
      `,
      values: [
        input.eventId,
        impact.workspaceId,
        input.actorUserId,
        targetIdsJson,
        input.previewHash,
        input.correlationId,
        impact.storageTargets.length > 0 ? "storage_cleanup_pending" : "completed",
        JSON.stringify(input.preview.summary),
        storageTargetsJson,
        JSON.stringify(receiptMetadata),
        input.timestamp,
        input.timestamp,
      ],
    },
  ];
}

export async function readComponentPermanentDeleteReceipt(
  database: D1DatabaseLike,
  workspaceId: string,
  correlationId: string,
) {
  return database.prepare<ComponentPermanentDeleteReceiptRow>(`
    SELECT
      id,
      actor_user_id,
      target_ids_json,
      preview_hash,
      correlation_id,
      status,
      summary_json,
      blocked_json,
      storage_targets_json,
      metadata_json
    FROM mass_deletion_events
    WHERE workspace_id = ?
      AND target_type = 'library_component'
      AND action = 'delete'
      AND correlation_id = ?
    LIMIT 1
  `).bind(workspaceId, correlationId).first<ComponentPermanentDeleteReceiptRow>();
}

export function componentPermanentDeleteReceiptResult(input: {
  actorUserId: string;
  expectedPreviewHash: string;
  itemIds: string[];
  receipt: ComponentPermanentDeleteReceiptRow;
}): BulkActionExecutionResult {
  const requestedIds = [...input.itemIds].sort();
  const receiptIds = parseJsonArray<string>(input.receipt.target_ids_json).filter((id) => typeof id === "string").sort();
  if (
    input.receipt.actor_user_id !== input.actorUserId
    || input.receipt.preview_hash !== input.expectedPreviewHash
    || JSON.stringify(requestedIds) !== JSON.stringify(receiptIds)
  ) {
    return {
      ok: false,
      targetType: "library_component",
      ids: requestedIds,
      deletedIds: [],
      previewHash: input.expectedPreviewHash,
      summary: {
        requestedCount: requestedIds.length,
        eligibleCount: 0,
        blockedCount: 1,
      },
      issues: [{
        code: "stale_preview",
        message: "This deletion intent no longer matches its committed receipt. Start a new preview.",
      }],
      blocked: [],
    };
  }
  return {
    ok: true,
    targetType: "library_component",
    ids: receiptIds,
    deletedIds: receiptIds,
    auditEventId: input.receipt.id,
    previewHash: input.receipt.preview_hash,
    summary: parseJsonObject(input.receipt.summary_json) as BulkActionExecutionResult["summary"],
    issues: [],
    blocked: parseJsonArray<BulkActionIssue>(input.receipt.blocked_json),
    storageTargets: parseJsonArray<StorageCleanupTarget>(input.receipt.storage_targets_json),
  };
}

export function getComponentPermanentDeleteReceiptOwners(
  receipt: ComponentPermanentDeleteReceiptRow,
) {
  const metadata = parseJsonObject(receipt.metadata_json);
  const estimateRows = Array.isArray(metadata.estimateRows) ? metadata.estimateRows : [];
  const templateRows = Array.isArray(metadata.templateRows) ? metadata.templateRows : [];
  const affectedEstimateKeys = new Set<string>();
  const affectedEstimates: Array<{ estimateId: string; projectId: string }> = [];
  for (const candidate of estimateRows) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const estimateId = typeof candidate.estimateId === "string" ? candidate.estimateId : "";
    const projectId = typeof candidate.projectId === "string" ? candidate.projectId : "";
    const key = `${projectId}:${estimateId}`;
    if (!estimateId || !projectId || affectedEstimateKeys.has(key)) continue;
    affectedEstimateKeys.add(key);
    affectedEstimates.push({ estimateId, projectId });
  }
  return {
    affectedEstimates,
    hasTemplateRows: templateRows.length > 0,
  };
}
