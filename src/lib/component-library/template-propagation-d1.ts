import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import type {
  EstimateTemplateVersionSnapshot,
  EstimateTemplateVersionSnapshotComponentRow,
  EstimateTemplateVersionSnapshotCustomRow,
} from "./template-link-types";
import { assertEstimateTemplateLinkPayloadSize } from "./template-versioning-d1";
import { assertD1MutationStatementLimit } from "@/lib/estimates/mutation-receipts";
import { prepareHistoryEventInsert } from "@/lib/estimates/d1-intents/history-events";
import { buildProjectPublicationRevisionForEstimate } from "@/lib/estimates/d1-intents/intent-context";

const TEMPLATE_PROPAGATION_MAX_ATTEMPTS = 10;
const TEMPLATE_PROPAGATION_LEASE_MS = 60_000;

type PropagationJobRow = {
  instance_id: string;
  workspace_id: string;
  template_id: string;
  target_version_number: number | string;
  attempt_count: number | string;
};

type InstanceRow = {
  id: string;
  workspace_id: string;
  template_id: string;
  project_id: string;
  estimate_id: string;
  estimate_tab_id: string;
  target_parent_node_id: string | null;
  link_state: string;
  applied_version_number: number | string;
  target_version_number: number | string;
  created_by: string | null;
};

type NodeMappingRow = {
  template_node_id: string;
  estimate_node_id: string;
  sort_order: number | string;
};

type RowMappingRow = {
  template_row_item_id: string;
  estimate_row_item_id: string;
  quantity: number | string;
  contingency_percentage: number | string;
  adjustment_percentage: number | string;
  row_revision: number | string;
};

type ComponentSourceRow = {
  id: string;
  name: string;
  description: string;
  supplier: string | null;
  supplier_id: string | null;
  brand: string | null;
  brand_id: string | null;
  category_node_id: string | null;
  lifecycle_state: string;
  current_version_number: number | string;
  updated_at: string;
  option_id: string | null;
  option_is_default: number | string | null;
  option_label: string | null;
  option_unit: string | null;
  option_unit_cost: number | string | null;
  option_misc_cost: number | string | null;
  option_supplier_id: string | null;
  option_pricing_source: string | null;
  option_updated_at: string | null;
  cost_unit_cost: number | string | null;
  cost_misc_cost: number | string | null;
  cost_entry_id: string | null;
  cost_pricing_source: string | null;
  cost_pricing_date: string | null;
  cost_source_url: string | null;
  cost_updated_at: string | null;
};

type FailureClass = "attempts_exhausted" | "component_unavailable" | "scope_integrity" | "mapping_repair_required";

class TemplatePropagationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly failureClass: FailureClass,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Template propagation read failed.");
  return result.results ?? [];
}

function removalPredicate(column: string) {
  return `${column} NOT IN (SELECT value FROM json_each(?))`;
}

function nextAttemptAt(attempt: number, now: Date) {
  const delayMs = Math.min(5 * 60_000, 2 ** Math.min(attempt, 8) * 1_000);
  return new Date(now.getTime() + delayMs).toISOString();
}

function parseSnapshot(value: unknown): EstimateTemplateVersionSnapshot {
  const parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  if (!parsed || typeof parsed !== "object") throw new TemplatePropagationError(
    "Template version snapshot is invalid.",
    "template_snapshot_invalid",
    "mapping_repair_required",
    false,
  );
  const snapshot = parsed as EstimateTemplateVersionSnapshot;
  if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.rows)) {
    throw new TemplatePropagationError(
      "Template version snapshot is unsupported.",
      "template_snapshot_unsupported",
      "mapping_repair_required",
      false,
    );
  }
  assertEstimateTemplateLinkPayloadSize(snapshot);
  return snapshot;
}

async function loadComponentSources(
  database: D1DatabaseLike,
  workspaceId: string,
  rows: EstimateTemplateVersionSnapshotComponentRow[],
) {
  const componentIds = [...new Set(rows.map((row) => row.sourceLibraryItemId))];
  if (componentIds.length === 0) return new Map<string, ComponentSourceRow>();
  const sources = await all<ComponentSourceRow>(
    database,
    `SELECT item.id, item.name, item.description, item.supplier, item.supplier_id,
            item.brand, item.brand_id, item.category_node_id, item.lifecycle_state,
            item.current_version_number, item.updated_at,
            option.id AS option_id, option.is_default AS option_is_default,
            option.label AS option_label, option.unit AS option_unit,
            option.unit_cost AS option_unit_cost, option.misc_cost AS option_misc_cost,
            option.supplier_id AS option_supplier_id, option.pricing_source AS option_pricing_source,
            option.updated_at AS option_updated_at,
            cost.id AS cost_entry_id, cost.unit_cost AS cost_unit_cost, cost.misc_cost AS cost_misc_cost,
            cost.pricing_source AS cost_pricing_source, cost.pricing_date AS cost_pricing_date,
            cost.source_url AS cost_source_url, cost.updated_at AS cost_updated_at
     FROM cost_library_items AS item
     LEFT JOIN cost_library_item_price_options AS option
       ON option.item_id = item.id AND option.workspace_id = item.workspace_id
      AND option.is_active = 1
     LEFT JOIN cost_library_item_variant_cost_entries AS cost
       ON cost.workspace_id = item.workspace_id AND cost.item_id = item.id
      AND cost.price_option_id = option.id AND cost.is_current = 1 AND cost.deleted_at IS NULL
     WHERE item.workspace_id = ? AND item.id IN (SELECT value FROM json_each(?))
     ORDER BY item.id ASC, option.is_default DESC, option.created_at ASC`,
    [workspaceId, JSON.stringify(componentIds)],
  );
  const sourcesByComponentId = new Map<string, ComponentSourceRow[]>();
  for (const source of sources) {
    const componentSources = sourcesByComponentId.get(source.id) ?? [];
    componentSources.push(source);
    sourcesByComponentId.set(source.id, componentSources);
  }
  const sourceByTemplateRowId = new Map<string, ComponentSourceRow>();
  for (const row of rows) {
    const componentSources = sourcesByComponentId.get(row.sourceLibraryItemId) ?? [];
    const source = row.selectedVariantId
      ? componentSources.find((candidate) => candidate.option_id === row.selectedVariantId)
      : componentSources.find((candidate) => numeric(candidate.option_is_default) === 1);
    if (!source || !source.option_id || source.lifecycle_state !== "available") {
      throw new TemplatePropagationError(
        "A required Component is unavailable.",
        "template_component_unavailable",
        "component_unavailable",
        false,
      );
    }
    sourceByTemplateRowId.set(row.id, source);
  }
  return sourceByTemplateRowId;
}

function buildComponentRowPayload(
  row: EstimateTemplateVersionSnapshotComponentRow,
  source: ComponentSourceRow,
  estimateRowId: string,
  estimateNodeId: string,
  existing: RowMappingRow | undefined,
) {
  const unitCost = numeric(source.cost_unit_cost ?? source.option_unit_cost);
  const miscCost = numeric(source.cost_misc_cost ?? source.option_misc_cost);
  return {
    id: estimateRowId,
    nodeId: estimateNodeId,
    templateRowItemId: row.id,
    description: source.description,
    designation: "",
    discipline: "",
    material: source.name,
    supplier: source.supplier ?? "",
    supplierId: source.option_supplier_id ?? source.supplier_id,
    quantity: existing ? numeric(existing.quantity) : row.initialTakeoffDefaults.quantity,
    unit: source.option_unit ?? "unit",
    unitCost,
    miscCost,
    contingencyPercentage: existing
      ? numeric(existing.contingency_percentage)
      : row.initialTakeoffDefaults.contingencyPercentage,
    adjustmentPercentage: existing
      ? numeric(existing.adjustment_percentage)
      : row.initialTakeoffDefaults.adjustmentPercentage,
    sourceSnapshot: {
      sourceType: "library_component",
      sourceComponentId: source.id,
      sourceLibraryItemId: source.id,
      componentVersionNumber: numeric(source.current_version_number, 1),
      sourceUpdatedAt: source.updated_at,
      priceOptionId: source.option_id,
      priceOptionLabel: source.option_label,
      pricingSource: source.cost_pricing_source ?? source.option_pricing_source,
      pricingDate: source.cost_pricing_date,
      sourceUrl: source.cost_source_url,
      brand: source.brand,
      brandId: source.brand_id,
      supplier: source.supplier,
      supplierId: source.option_supplier_id ?? source.supplier_id,
      unit: source.option_unit,
      unit_cost: unitCost,
      misc_cost: miscCost,
    },
    sortOrder: row.sortOrder,
    rowRevision: existing ? numeric(existing.row_revision, 1) + 1 : 1,
    categoryNodeId: source.category_node_id,
    sourceLibraryItemId: source.id,
    linkState: "linked-clean",
    metadata: {
      componentVersionNumber: numeric(source.current_version_number, 1),
      priceOptionId: source.option_id,
      sourceComponentId: source.id,
    },
    pricingProvenanceOrigin: "recorded",
  };
}

function buildCustomRowPayload(
  row: EstimateTemplateVersionSnapshotCustomRow,
  estimateRowId: string,
  estimateNodeId: string,
  existing: RowMappingRow | undefined,
) {
  return {
    id: estimateRowId,
    nodeId: estimateNodeId,
    templateRowItemId: row.id,
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    material: row.material,
    supplier: row.supplier,
    supplierId: row.supplierId,
    quantity: existing ? numeric(existing.quantity) : row.initialTakeoffDefaults.quantity,
    unit: row.unit,
    unitCost: row.unitCost,
    miscCost: row.miscCost,
    contingencyPercentage: existing
      ? numeric(existing.contingency_percentage)
      : row.initialTakeoffDefaults.contingencyPercentage,
    adjustmentPercentage: existing
      ? numeric(existing.adjustment_percentage)
      : row.initialTakeoffDefaults.adjustmentPercentage,
    sourceSnapshot: row.sourceSnapshot,
    sortOrder: row.sortOrder,
    rowRevision: existing ? numeric(existing.row_revision, 1) + 1 : 1,
    categoryNodeId: row.categoryNodeId,
    sourceLibraryItemId: null,
    linkState: "unlinked",
    metadata: row.metadata,
    pricingProvenanceOrigin: "inherited_snapshot",
  };
}

async function applyClaimedJob(
  database: D1DatabaseLike,
  job: PropagationJobRow,
  leaseToken: string,
  timestamp: string,
) {
  const instance = await first<InstanceRow>(
    database,
    `SELECT id, workspace_id, template_id, project_id, estimate_id, estimate_tab_id,
            target_parent_node_id, link_state, applied_version_number,
            target_version_number, created_by
     FROM estimate_template_instances
     WHERE id = ? AND workspace_id = ? AND template_id = ?
       AND link_state IN ('linked', 'updating', 'failed')
     LIMIT 1`,
    [job.instance_id, job.workspace_id, job.template_id],
  );
  if (!instance) throw new TemplatePropagationError(
    "Linked Template instance scope no longer matches.",
    "template_instance_scope_integrity",
    "scope_integrity",
    false,
  );
  const targetVersionNumber = numeric(job.target_version_number, 1);
  const version = await first<{ snapshot_json: string }>(
    database,
    `SELECT snapshot_json FROM estimate_template_versions
     WHERE template_id = ? AND workspace_id = ? AND version_number = ?
     LIMIT 1`,
    [job.template_id, job.workspace_id, targetVersionNumber],
  );
  if (!version) throw new TemplatePropagationError(
    "Linked Template version is missing.",
    "template_version_missing",
    "mapping_repair_required",
    false,
  );
  const snapshot = parseSnapshot(version.snapshot_json);
  const [nodeMappings, rowMappings] = await Promise.all([
    all<NodeMappingRow>(
      database,
      `SELECT mapping.template_node_id, mapping.estimate_node_id, node.sort_order
       FROM estimate_template_instance_nodes AS mapping
       INNER JOIN estimate_nodes AS node
         ON node.id = mapping.estimate_node_id AND node.estimate_id = mapping.estimate_id
       WHERE mapping.instance_id = ? AND mapping.workspace_id = ? AND mapping.estimate_id = ?`,
      [instance.id, instance.workspace_id, instance.estimate_id],
    ),
    all<RowMappingRow>(
      database,
      `SELECT mapping.template_row_item_id, mapping.estimate_row_item_id,
              row_item.quantity, row_item.contingency_percentage,
              row_item.adjustment_percentage, row_item.row_revision
       FROM estimate_template_instance_rows AS mapping
       INNER JOIN estimate_row_items AS row_item
         ON row_item.id = mapping.estimate_row_item_id AND row_item.estimate_id = mapping.estimate_id
       WHERE mapping.instance_id = ? AND mapping.workspace_id = ? AND mapping.estimate_id = ?`,
      [instance.id, instance.workspace_id, instance.estimate_id],
    ),
  ]);
  const nodeMappingByTemplateId = new Map(nodeMappings.map((mapping) => [mapping.template_node_id, mapping]));
  const rowMappingByTemplateId = new Map(rowMappings.map((mapping) => [mapping.template_row_item_id, mapping]));
  const estimateNodeIdByTemplateId = new Map(snapshot.nodes.map((node) => [
    node.id,
    nodeMappingByTemplateId.get(node.id)?.estimate_node_id ?? globalThis.crypto.randomUUID(),
  ]));
  const rootIds = new Set(snapshot.nodes.filter((node) => !node.parentId).map((node) => node.id));
  const maxSibling = await first<{ sort_order: number | string | null }>(
    database,
    `SELECT COALESCE(MAX(sort_order), 0) AS sort_order
     FROM estimate_nodes
     WHERE estimate_id = ? AND estimate_tab_id = ? AND parent_id IS ?`,
    [instance.estimate_id, instance.estimate_tab_id, instance.target_parent_node_id],
  );
  let addedRootRank = 0;
  const nodePayload = snapshot.nodes.map((node) => {
    const existing = nodeMappingByTemplateId.get(node.id);
    const isRoot = rootIds.has(node.id);
    const rootSortOrder = existing
      ? numeric(existing.sort_order)
      : numeric(maxSibling?.sort_order) + (++addedRootRank * 10);
    return {
      id: estimateNodeIdByTemplateId.get(node.id)!,
      templateNodeId: node.id,
      parentId: isRoot
        ? instance.target_parent_node_id
        : estimateNodeIdByTemplateId.get(node.parentId ?? "") ?? null,
      kind: node.kind,
      name: node.name,
      sortOrder: isRoot ? rootSortOrder : node.sortOrder,
      metadata: node.metadata,
    };
  });
  const componentRows = snapshot.rows.filter((row): row is EstimateTemplateVersionSnapshotComponentRow => row.rowKind === "component");
  const componentSources = await loadComponentSources(database, instance.workspace_id, componentRows);
  const componentSourceGuardPayload = [...new Map(
    [...componentSources.values()].map((source) => [`${source.id}:${source.option_id}`, {
      itemId: source.id,
      itemVersionNumber: numeric(source.current_version_number, 1),
      itemUpdatedAt: source.updated_at,
      lifecycleState: source.lifecycle_state,
      optionId: source.option_id,
      optionUpdatedAt: source.option_updated_at,
      optionUnitCost: source.option_unit_cost,
      optionMiscCost: source.option_misc_cost,
      costEntryId: source.cost_entry_id,
      costEntryUpdatedAt: source.cost_updated_at,
      costUnitCost: source.cost_unit_cost,
      costMiscCost: source.cost_misc_cost,
    }]),
  ).values()];
  const estimateRowGuardPayload = rowMappings.map((mapping) => ({
    id: mapping.estimate_row_item_id,
    rowRevision: numeric(mapping.row_revision, 1),
    quantity: numeric(mapping.quantity),
    contingencyPercentage: numeric(mapping.contingency_percentage),
    adjustmentPercentage: numeric(mapping.adjustment_percentage),
  }));
  const rowPayload = snapshot.rows.map((row) => {
    const estimateNodeId = estimateNodeIdByTemplateId.get(row.templateNodeId);
    if (!estimateNodeId) throw new TemplatePropagationError(
      "Template row no longer maps to a node.",
      "template_row_mapping_invalid",
      "mapping_repair_required",
      false,
    );
    const existing = rowMappingByTemplateId.get(row.id);
    const estimateRowId = existing?.estimate_row_item_id ?? globalThis.crypto.randomUUID();
    return row.rowKind === "component"
      ? buildComponentRowPayload(row, componentSources.get(row.id)!, estimateRowId, estimateNodeId, existing)
      : buildCustomRowPayload(row, estimateRowId, estimateNodeId, existing);
  });
  assertEstimateTemplateLinkPayloadSize({ nodePayload, rowPayload });
  const nodePayloadJson = JSON.stringify(nodePayload);
  const rowPayloadJson = JSON.stringify(rowPayload);
  const targetTemplateNodeIds = snapshot.nodes.map((node) => node.id);
  const targetTemplateRowIds = snapshot.rows.map((row) => row.id);
  const history = await prepareHistoryEventInsert(database, {
    workspaceId: instance.workspace_id,
    projectId: instance.project_id,
    estimateId: instance.estimate_id,
    estimateTabId: instance.estimate_tab_id,
    estimateNodeId: instance.target_parent_node_id,
    eventType: "linked_template_instance_updated",
    correlationId: `template-propagation:${instance.id}:${targetVersionNumber}`,
    actorUserId: instance.created_by,
    payload: {
      instanceId: instance.id,
      templateId: instance.template_id,
      fromVersionNumber: numeric(instance.applied_version_number, 1),
      toVersionNumber: targetVersionNumber,
      nodeCount: nodePayload.length,
      rowCount: rowPayload.length,
    },
  });
  const publicationRevision = buildProjectPublicationRevisionForEstimate(
    instance.project_id,
    instance.workspace_id,
    instance.estimate_id,
  );
  const statements: Array<{ sql: string; values?: D1Value[] }> = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM estimate_template_propagation_jobs AS job
        INNER JOIN estimate_template_instances AS instance ON instance.id = job.instance_id
        INNER JOIN estimate_templates AS template ON template.id = job.template_id
        WHERE job.instance_id = ? AND job.workspace_id = ? AND job.template_id = ?
          AND job.state = 'processing' AND job.lease_token = ?
          AND job.target_version_number = ?
          AND instance.link_state IN ('linked', 'updating', 'failed')
          AND instance.target_version_number = ?
      ) THEN 1 ELSE json('') END AS template_propagation_guard`,
      values: [instance.id, instance.workspace_id, instance.template_id, leaseToken, targetVersionNumber, targetVersionNumber],
    },
    ...(componentSourceGuardPayload.length > 0 ? [{
      sql: `SELECT CASE WHEN NOT EXISTS (
        SELECT 1
        FROM json_each(?) AS expected
        WHERE NOT EXISTS (
          SELECT 1
          FROM cost_library_items AS item
          INNER JOIN cost_library_item_price_options AS option
            ON option.id = json_extract(expected.value, '$.optionId')
           AND option.item_id = item.id AND option.workspace_id = item.workspace_id
           AND option.is_active = 1
          LEFT JOIN cost_library_item_variant_cost_entries AS cost
            ON cost.workspace_id = item.workspace_id AND cost.item_id = item.id
           AND cost.price_option_id = option.id AND cost.is_current = 1 AND cost.deleted_at IS NULL
          WHERE item.id = json_extract(expected.value, '$.itemId')
            AND item.workspace_id = ?
            AND item.current_version_number = json_extract(expected.value, '$.itemVersionNumber')
            AND item.updated_at IS json_extract(expected.value, '$.itemUpdatedAt')
            AND item.lifecycle_state IS json_extract(expected.value, '$.lifecycleState')
            AND item.lifecycle_state = 'available'
            AND option.updated_at IS json_extract(expected.value, '$.optionUpdatedAt')
            AND option.unit_cost IS json_extract(expected.value, '$.optionUnitCost')
            AND option.misc_cost IS json_extract(expected.value, '$.optionMiscCost')
            AND cost.id IS json_extract(expected.value, '$.costEntryId')
            AND cost.updated_at IS json_extract(expected.value, '$.costEntryUpdatedAt')
            AND cost.unit_cost IS json_extract(expected.value, '$.costUnitCost')
            AND cost.misc_cost IS json_extract(expected.value, '$.costMiscCost')
        )
      ) THEN 1 ELSE json('') END AS template_component_source_guard`,
      values: [JSON.stringify(componentSourceGuardPayload), instance.workspace_id],
    }] : []),
    ...(estimateRowGuardPayload.length > 0 ? [{
      sql: `SELECT CASE WHEN NOT EXISTS (
        SELECT 1
        FROM json_each(?) AS expected
        WHERE NOT EXISTS (
          SELECT 1
          FROM estimate_row_items AS row_item
          WHERE row_item.id = json_extract(expected.value, '$.id')
            AND row_item.estimate_id = ?
            AND row_item.row_revision = json_extract(expected.value, '$.rowRevision')
            AND row_item.quantity IS json_extract(expected.value, '$.quantity')
            AND row_item.contingency_percentage IS json_extract(expected.value, '$.contingencyPercentage')
            AND row_item.adjustment_percentage IS json_extract(expected.value, '$.adjustmentPercentage')
        )
      ) THEN 1 ELSE json('') END AS template_estimate_row_revision_guard`,
      values: [JSON.stringify(estimateRowGuardPayload), instance.estimate_id],
    }] : []),
    {
      sql: `DELETE FROM estimate_row_items
        WHERE estimate_id = ? AND id IN (
          SELECT mapping.estimate_row_item_id
          FROM estimate_template_instance_rows AS mapping
          WHERE mapping.instance_id = ? AND mapping.workspace_id = ?
            AND ${removalPredicate("mapping.template_row_item_id")}
        )`,
      values: [instance.estimate_id, instance.id, instance.workspace_id, JSON.stringify(targetTemplateRowIds)],
    },
    {
      sql: `DELETE FROM estimate_template_instance_rows
        WHERE instance_id = ? AND workspace_id = ?
          AND ${removalPredicate("template_row_item_id")}`,
      values: [instance.id, instance.workspace_id, JSON.stringify(targetTemplateRowIds)],
    },
    {
      sql: `DELETE FROM estimate_nodes
        WHERE estimate_id = ? AND id IN (
          SELECT mapping.estimate_node_id
          FROM estimate_template_instance_nodes AS mapping
          WHERE mapping.instance_id = ? AND mapping.workspace_id = ?
            AND ${removalPredicate("mapping.template_node_id")}
        )`,
      values: [instance.estimate_id, instance.id, instance.workspace_id, JSON.stringify(targetTemplateNodeIds)],
    },
    {
      sql: `DELETE FROM estimate_template_instance_nodes
        WHERE instance_id = ? AND workspace_id = ?
          AND ${removalPredicate("template_node_id")}`,
      values: [instance.id, instance.workspace_id, JSON.stringify(targetTemplateNodeIds)],
    },
    {
      sql: `INSERT INTO estimate_nodes (
        id, estimate_id, estimate_tab_id, parent_id, kind, name,
        sort_order, metadata_json, created_at, updated_at
      )
      SELECT json_extract(value, '$.id'), ?, ?, json_extract(value, '$.parentId'),
             json_extract(value, '$.kind'), json_extract(value, '$.name'),
             json_extract(value, '$.sortOrder'), json_extract(value, '$.metadata'), ?, ?
      FROM json_each(?) WHERE 1
      ON CONFLICT(id) DO UPDATE SET
        parent_id = excluded.parent_id, kind = excluded.kind, name = excluded.name,
        sort_order = excluded.sort_order, metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at`,
      values: [instance.estimate_id, instance.estimate_tab_id, timestamp, timestamp, nodePayloadJson],
    },
    {
      sql: `INSERT INTO estimate_row_items (
        id, estimate_id, node_id, description, designation, discipline, material,
        supplier, supplier_id, quantity, unit, unit_cost, misc_cost,
        contingency_percentage, adjustment_percentage, source_snapshot_json,
        sort_order, row_revision, category_node_id, source_library_item_id,
        link_state, metadata_json, pricing_provenance_origin, created_at, updated_at
      )
      SELECT json_extract(value, '$.id'), ?, json_extract(value, '$.nodeId'),
             json_extract(value, '$.description'), json_extract(value, '$.designation'),
             json_extract(value, '$.discipline'), json_extract(value, '$.material'),
             json_extract(value, '$.supplier'), json_extract(value, '$.supplierId'),
             json_extract(value, '$.quantity'), json_extract(value, '$.unit'),
             json_extract(value, '$.unitCost'), json_extract(value, '$.miscCost'),
             json_extract(value, '$.contingencyPercentage'), json_extract(value, '$.adjustmentPercentage'),
             json_extract(value, '$.sourceSnapshot'), json_extract(value, '$.sortOrder'),
             json_extract(value, '$.rowRevision'), json_extract(value, '$.categoryNodeId'),
             json_extract(value, '$.sourceLibraryItemId'), json_extract(value, '$.linkState'),
             json_extract(value, '$.metadata'), json_extract(value, '$.pricingProvenanceOrigin'), ?, ?
      FROM json_each(?) WHERE 1
      ON CONFLICT(id) DO UPDATE SET
        node_id = excluded.node_id, description = excluded.description,
        designation = excluded.designation, discipline = excluded.discipline,
        material = excluded.material, supplier = excluded.supplier,
        supplier_id = excluded.supplier_id, unit = excluded.unit,
        unit_cost = excluded.unit_cost, misc_cost = excluded.misc_cost,
        source_snapshot_json = excluded.source_snapshot_json, sort_order = excluded.sort_order,
        row_revision = excluded.row_revision, category_node_id = excluded.category_node_id,
        source_library_item_id = excluded.source_library_item_id, link_state = excluded.link_state,
        metadata_json = excluded.metadata_json,
        pricing_provenance_origin = excluded.pricing_provenance_origin,
        updated_at = excluded.updated_at`,
      values: [instance.estimate_id, timestamp, timestamp, rowPayloadJson],
    },
    {
      sql: `INSERT INTO estimate_template_instance_nodes (
        instance_id, workspace_id, estimate_id, template_node_id,
        estimate_node_id, created_at, updated_at
      )
      SELECT ?, ?, ?, json_extract(value, '$.templateNodeId'),
             json_extract(value, '$.id'), ?, ?
      FROM json_each(?) WHERE 1
      ON CONFLICT(instance_id, template_node_id) DO UPDATE SET
        estimate_node_id = excluded.estimate_node_id, updated_at = excluded.updated_at`,
      values: [instance.id, instance.workspace_id, instance.estimate_id, timestamp, timestamp, nodePayloadJson],
    },
    {
      sql: `INSERT INTO estimate_template_instance_rows (
        instance_id, workspace_id, estimate_id, template_row_item_id,
        estimate_row_item_id, created_at, updated_at
      )
      SELECT ?, ?, ?, json_extract(value, '$.templateRowItemId'),
             json_extract(value, '$.id'), ?, ?
      FROM json_each(?) WHERE 1
      ON CONFLICT(instance_id, template_row_item_id) DO UPDATE SET
        estimate_row_item_id = excluded.estimate_row_item_id, updated_at = excluded.updated_at`,
      values: [instance.id, instance.workspace_id, instance.estimate_id, timestamp, timestamp, rowPayloadJson],
    },
    {
      sql: publicationRevision.sql,
      values: [...(publicationRevision.values ?? [])] as D1Value[],
    },
    ...(history.statement && history.outboxStatement ? [
      { sql: history.statement.sql, values: [...(history.statement.values ?? [])] as D1Value[] },
      { sql: history.outboxStatement.sql, values: [...(history.outboxStatement.values ?? [])] as D1Value[] },
    ] : []),
    {
      sql: `UPDATE estimate_template_instances
        SET applied_version_number = ?, target_version_number = ?, link_state = 'linked',
            last_error_code = NULL, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND template_id = ?
          AND link_state IN ('linked', 'updating', 'failed')
          AND target_version_number = ?`,
      values: [targetVersionNumber, targetVersionNumber, timestamp, instance.id, instance.workspace_id, instance.template_id, targetVersionNumber],
    },
    {
      sql: `UPDATE estimate_template_propagation_jobs
        SET state = 'completed', lease_token = NULL, lease_expires_at = NULL,
            last_error_code = NULL, failure_class = NULL, retryable = NULL,
            completed_at = ?, updated_at = ?
        WHERE instance_id = ? AND state = 'processing' AND lease_token = ?
          AND target_version_number = ?`,
      values: [timestamp, timestamp, instance.id, leaseToken, targetVersionNumber],
    },
  ];
  assertD1MutationStatementLimit(statements.length);
  if (!database.batch) throw new Error("Something went wrong. Try again in a moment.");
  const results = await database.batch(statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []))));
  if (results.some((result) => result.success === false)) throw new Error("Template propagation batch failed.");
  if ((results.at(-1)?.meta?.changes ?? 0) !== 1) throw new Error("Template propagation acknowledgement lost its lease.");
}

async function recordJobFailure(
  database: D1DatabaseLike,
  job: PropagationJobRow,
  leaseToken: string,
  error: unknown,
  now: Date,
) {
  const attemptCount = numeric(job.attempt_count) + 1;
  const known = error instanceof TemplatePropagationError ? error : null;
  const exhausted = !known && attemptCount >= TEMPLATE_PROPAGATION_MAX_ATTEMPTS;
  const terminal = Boolean(known && !known.retryable) || exhausted;
  const failureClass: FailureClass | null = terminal
    ? known?.failureClass ?? "attempts_exhausted"
    : null;
  const errorCode = known?.code ?? (error instanceof Error ? error.name : "template_propagation_failed");
  const timestamp = now.toISOString();
  if (!database.batch) throw new Error("Something went wrong. Try again in a moment.");
  const statements = [
    database.prepare(`SELECT CASE WHEN EXISTS (
      SELECT 1 FROM estimate_template_propagation_jobs
      WHERE instance_id = ? AND state = 'processing' AND lease_token = ?
    ) THEN 1 ELSE json('') END AS propagation_failure_lease_guard`).bind(job.instance_id, leaseToken),
    database.prepare(`
      UPDATE estimate_template_propagation_jobs
      SET state = ?, available_at = ?, lease_token = NULL, lease_expires_at = NULL,
          last_error_code = ?, failure_class = ?, retryable = ?, updated_at = ?
      WHERE instance_id = ? AND state = 'processing' AND lease_token = ?
    `).bind(
      terminal ? "dead" : "pending",
      terminal ? timestamp : nextAttemptAt(attemptCount, now),
      errorCode,
      failureClass,
      terminal ? (failureClass === "attempts_exhausted" ? 1 : 0) : null,
      timestamp,
      job.instance_id,
      leaseToken,
    ),
    database.prepare(`
      UPDATE estimate_template_instances
      SET link_state = ?, last_error_code = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ? AND template_id = ?
        AND link_state IN ('linked', 'updating', 'failed')
    `).bind(
      terminal ? "failed" : "updating",
      errorCode,
      timestamp,
      job.instance_id,
      job.workspace_id,
      job.template_id,
    ),
  ];
  const results = await database.batch(statements);
  if (results.some((result) => result.success === false)) {
    throw new Error("Template propagation retry scheduling failed.");
  }
  if ((results[1]?.meta?.changes ?? 0) !== 1 || (results[2]?.meta?.changes ?? 0) !== 1) {
    throw new Error("Template propagation failure transition lost its lease or instance.");
  }
  return terminal;
}

export async function reconcileTemplatePropagationJobs(
  database: D1DatabaseLike | null | undefined,
  options: { limit?: number; now?: Date } = {},
) {
  if (!database?.batch) return { scanned: 0, completed: 0, deferred: 0, dead: 0 };
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
  const selected = await all<PropagationJobRow>(
    database,
    `SELECT instance_id, workspace_id, template_id, target_version_number, attempt_count
     FROM estimate_template_propagation_jobs
     WHERE (state = 'pending' AND available_at <= ?)
        OR (state = 'processing' AND lease_expires_at <= ?)
     ORDER BY available_at ASC, updated_at ASC, instance_id ASC
     LIMIT ?`,
    [timestamp, timestamp, limit],
  );
  let completed = 0;
  let deferred = 0;
  let dead = 0;
  for (const job of selected) {
    const leaseToken = globalThis.crypto.randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + TEMPLATE_PROPAGATION_LEASE_MS).toISOString();
    const claim = await database.prepare(`
      UPDATE estimate_template_propagation_jobs
      SET state = 'processing', attempt_count = attempt_count + 1,
          lease_token = ?, lease_expires_at = ?, last_error_code = NULL, updated_at = ?
      WHERE instance_id = ?
        AND ((state = 'pending' AND available_at <= ?)
          OR (state = 'processing' AND lease_expires_at <= ?))
    `).bind(leaseToken, leaseExpiresAt, timestamp, job.instance_id, timestamp, timestamp).run();
    if (claim.success === false) throw new Error("Template propagation lease claim failed.");
    if ((claim.meta?.changes ?? 0) !== 1) continue;
    try {
      await applyClaimedJob(database, job, leaseToken, timestamp);
      completed += 1;
    } catch (error) {
      const isDead = await recordJobFailure(database, job, leaseToken, error, now);
      if (isDead) dead += 1;
      else deferred += 1;
    }
  }
  return { scanned: selected.length, completed, deferred, dead };
}

export async function retryTemplatePropagationJobs(
  database: D1DatabaseLike,
  input: { workspaceId: string; instanceIds: string[] },
) {
  const instanceIds = [...new Set(input.instanceIds)];
  if (instanceIds.length === 0) return { retried: 0 };
  const timestamp = new Date().toISOString();
  const result = await database.prepare(`
    UPDATE estimate_template_propagation_jobs
    SET state = 'pending', attempt_count = 0, available_at = ?,
        lease_token = NULL, lease_expires_at = NULL, last_error_code = NULL,
        failure_class = NULL, retryable = NULL, completed_at = NULL, updated_at = ?
    WHERE workspace_id = ? AND instance_id IN (SELECT value FROM json_each(?))
      AND state = 'dead' AND retryable = 1
  `).bind(timestamp, timestamp, input.workspaceId, JSON.stringify(instanceIds)).run();
  if (result.success === false) throw new Error("Could not retry linked Template updates.");
  return { retried: result.meta?.changes ?? 0 };
}
