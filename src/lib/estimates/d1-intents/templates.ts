import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  assertD1MutationStatementLimit,
  createMutationRequestFingerprint,
  D1_MUTATION_HARD_STATEMENT_LIMIT,
} from "@/lib/estimates/mutation-receipts";
import type { Json } from "@/lib/types/json";

import { allD1Rows, firstD1Row, runD1Batch, type D1IntentStatement } from "./database";
import { prepareHistoryEventInsert } from "./history-events";
import {
  buildEstimateMutationReceiptStatement,
  buildProjectPublicationRevisionForEstimate,
  prepareEstimateMutationIntent,
  readConcurrentEstimateMutationReceipt,
  type EstimateD1Actor,
} from "./intent-context";
import { getEstimateNodeForProject } from "./nodes";

type TemplateUnavailableSourcePolicy = "cancel" | "use_saved_snapshot_unlinked";

type TemplateNodeRow = {
  id: string;
  template_id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number | string | null;
  metadata: Json | string | null;
  updated_at: string;
};

type TemplateRowItemRow = {
  id: string;
  template_id: string;
  template_node_id: string;
  sort_order: number | string | null;
  source_library_item_id: string | null;
  source_snapshot: Json | string | null;
  pricing_provenance_origin?: "recorded" | "inherited_snapshot" | "synthesized_fallback" | "missing" | null;
  category_node_id: string | null;
  supplier_id: string | null;
  material: string | null;
  description: string | null;
  supplier: string | null;
  unit: string | null;
  quantity: number | string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage: number | string | null;
  discipline: string | null;
  designation: string | null;
  link_state: string | null;
  metadata: Json | string | null;
  updated_at: string;
};

type TemplateHeaderRow = {
  id: string;
  workspace_id: string;
  updated_at: string;
};

type TemplateLibraryItemRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  supplier: string | null;
  supplier_id: string | null;
  brand: string | null;
  brand_id: string | null;
  category: string;
  category_node_id: string | null;
  unit: string;
  unit_cost: number | string;
  misc_cost: number | string;
  pricing_source: string | null;
  pricing_date: string | null;
  metadata_json: Json | string | null;
  thumbnail_path: string | null;
  current_version_number: number | string;
  lifecycle_state: string;
  updated_at: string;
};

type TemplatePriceOptionRow = {
  id: string;
  workspace_id: string;
  item_id: string;
  label: string;
  unit: string;
  unit_cost: number | string;
  misc_cost: number | string;
  currency: string;
  supplier_id: string | null;
  pricing_source: string | null;
  metadata_json: Json | string | null;
  is_active: number | boolean;
  is_default: number | boolean;
  created_at: string;
  updated_at: string;
};

type TemplateCostEntryRow = {
  id: string;
  workspace_id: string;
  item_id: string;
  price_option_id: string;
  unit_cost: number | string;
  misc_cost: number | string;
  currency: string;
  pricing_source: string | null;
  pricing_date: string | null;
  source_url: string | null;
  updated_at: string;
};

type TemplateCopyScope = {
  projectId: string;
  estimateId: string;
  correlationId: string;
  targetParentNodeId: string;
  targetTabId?: string;
  unavailableSourcePolicy: TemplateUnavailableSourcePolicy;
};

type TemplateUnavailableSource = {
  templateRowId: string;
  material: string;
  reason: string;
};

type TemplateConfirmationResult = {
  status: "requires_saved_snapshot_confirmation";
  unavailableSourceCount: number;
  unavailableRows: TemplateUnavailableSource[];
};

type TemplateInsertedResult = {
  status: "inserted";
  eventId: string;
  insertedRootNodeIds: string[];
  inserted_root_node_ids: string[];
  insertedRootNodeId: string | null;
  inserted_root_node_id: string | null;
  estimateTabId: string | null;
  estimate_tab_id: string | null;
  insertedNodeCount: number;
  insertedRowItemCount: number;
  sourceFingerprint: string;
  statementCount: number;
};

type TemplateCopyResult = TemplateConfirmationResult | TemplateInsertedResult;

function nowIso() {
  return new Date().toISOString();
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("At least one SQL placeholder is required.");
  return values.map(() => "?").join(", ");
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readJson(value: unknown, fallback: Json): Json {
  if (typeof value === "string") {
    try {
      return readJson(JSON.parse(value) as unknown, fallback);
    } catch {
      return fallback;
    }
  }
  if (value === null || typeof value === "number" || typeof value === "boolean" || Array.isArray(value)) {
    return value as Json;
  }
  if (value && typeof value === "object") return value as Json;
  return fallback;
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  const parsed = readJson(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};
}

function readSnapshotText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readSnapshotBoolean(value: unknown) {
  return value === true || value === 1;
}

function buildCurrentPriceOptionSnapshot(
  option: TemplatePriceOptionRow,
  currentCostEntry: TemplateCostEntryRow | undefined,
) {
  const metadata = readJsonRecord(option.metadata_json);
  return {
    id: option.id,
    label: option.label,
    sku: readSnapshotText(metadata, "sku"),
    variantDescription: readSnapshotText(metadata, "variantDescription"),
    variantSortOrder: readNumber(metadata.variantSortOrder),
    unit: option.unit,
    unitCost: readNumber(currentCostEntry?.unit_cost ?? option.unit_cost),
    miscCost: readNumber(currentCostEntry?.misc_cost ?? option.misc_cost),
    currency: currentCostEntry?.currency ?? option.currency ?? "PHP",
    pricingSource: currentCostEntry?.pricing_source ?? option.pricing_source,
    pricingDate: currentCostEntry?.pricing_date ?? readSnapshotText(metadata, "pricingDate"),
    sourceUrl: currentCostEntry?.source_url ?? readSnapshotText(metadata, "sourceUrl"),
    supplierId: option.supplier_id,
    thumbnailPath: readSnapshotText(metadata, "thumbnailPath"),
    isActive: readSnapshotBoolean(option.is_active),
    isDefault: readSnapshotBoolean(option.is_default),
    createdAt: option.created_at,
    updatedAt: option.updated_at,
  };
}

function buildCurrentSourceSnapshot(input: {
  savedSnapshot: Record<string, unknown>;
  item: TemplateLibraryItemRow;
  selectedOption: TemplatePriceOptionRow;
  currentCostEntry?: TemplateCostEntryRow;
  activeOptions: TemplatePriceOptionRow[];
  currentCostEntryByOptionId: ReadonlyMap<string, TemplateCostEntryRow>;
}) {
  const itemMetadata = readJsonRecord(input.item.metadata_json);
  const selectedOptionSnapshot = buildCurrentPriceOptionSnapshot(input.selectedOption, input.currentCostEntry);
  return {
    ...input.savedSnapshot,
    source: "library",
    sourceType: "library_component",
    sourceComponentId: input.item.id,
    sourceLibraryItemId: input.item.id,
    sourceUpdatedAt: input.item.updated_at,
    category: input.item.category,
    categoryNodeId: input.item.category_node_id,
    brand: input.item.brand,
    brandId: input.item.brand_id,
    supplier: input.item.supplier,
    supplierId: input.selectedOption.supplier_id ?? input.item.supplier_id,
    componentVersionNumber: readNumber(input.item.current_version_number),
    lifecycleState: input.item.lifecycle_state,
    priceOptionId: input.selectedOption.id,
    priceOptionLabel: input.selectedOption.label,
    priceOptions: input.activeOptions.slice(0, 50).map((option) => buildCurrentPriceOptionSnapshot(
      option,
      input.currentCostEntryByOptionId.get(option.id),
    )),
    pricingDate: selectedOptionSnapshot.pricingDate ?? input.item.pricing_date,
    pricingSource: selectedOptionSnapshot.pricingSource ?? input.item.pricing_source,
    sourceUrl: selectedOptionSnapshot.sourceUrl,
    imageUrl: selectedOptionSnapshot.thumbnailPath ?? input.item.thumbnail_path,
    tags: Array.isArray(itemMetadata.tags) ? itemMetadata.tags : [],
    unit: selectedOptionSnapshot.unit,
    unit_cost: selectedOptionSnapshot.unitCost,
    misc_cost: selectedOptionSnapshot.miscCost,
    currency: selectedOptionSnapshot.currency,
    templateSourceResolution: "current_library_component",
  };
}

function buildSavedSourceSnapshot(row: TemplateRowItemRow, reason: string) {
  return {
    ...readJsonRecord(row.source_snapshot),
    source: "project",
    sourceType: "template_saved_snapshot",
    sourceComponentId: null,
    sourceLibraryItemId: null,
    savedSourceLibraryItemId: row.source_library_item_id,
    templateSourceResolution: "saved_snapshot_unlinked",
    templateSourceUnavailableReason: reason,
  };
}

function latestSourceUpdate(rows: Array<{ updated_at?: string | null }>) {
  return rows.reduce(
    (latest, row) => String(row.updated_at ?? "") > latest ? String(row.updated_at ?? "") : latest,
    "",
  );
}

function assertTemplateCopyStatementLimit(statementCount: number) {
  try {
    assertD1MutationStatementLimit(statementCount);
  } catch {
    const error = new Error(
      `selection_too_large: Narrow the selection so the atomic copy uses at most ${D1_MUTATION_HARD_STATEMENT_LIMIT} D1 statements.`,
    ) as Error & { code: string; statementCount: number };
    error.code = "selection_too_large";
    error.statementCount = statementCount;
    throw error;
  }
}

function validateCopyTopology(
  templateIds: string[],
  templateNodes: TemplateNodeRow[],
  templateRows: TemplateRowItemRow[],
  nodesToCopy: TemplateNodeRow[],
  rowsToCopy: TemplateRowItemRow[],
) {
  if (nodesToCopy.length === 0) throw new Error("Estimate template source has no nodes to insert.");
  const templateIdSet = new Set(templateIds);
  const nodeById = new Map<string, TemplateNodeRow>();
  for (const node of templateNodes) {
    if (!templateIdSet.has(node.template_id) || nodeById.has(node.id)) {
      throw new Error("Estimate template source topology is invalid.");
    }
    nodeById.set(node.id, node);
  }
  for (const templateId of templateIds) {
    if (!templateNodes.some((node) => node.template_id === templateId)) {
      throw new Error("Estimate template source has no nodes to insert.");
    }
  }
  for (const node of templateNodes) {
    if (node.parent_id) {
      const parent = nodeById.get(node.parent_id);
      if (!parent || parent.template_id !== node.template_id) {
        throw new Error("Estimate template source contains a node whose parent is unavailable.");
      }
    }
    const visited = new Set<string>();
    let cursor: TemplateNodeRow | undefined = node;
    while (cursor) {
      if (visited.has(cursor.id)) throw new Error("Estimate template source contains a cyclic node graph.");
      visited.add(cursor.id);
      cursor = cursor.parent_id ? nodeById.get(cursor.parent_id) : undefined;
    }
  }
  const rowIds = new Set<string>();
  for (const row of templateRows) {
    const node = nodeById.get(row.template_node_id);
    if (rowIds.has(row.id) || !node || node.template_id !== row.template_id) {
      throw new Error("Estimate template source contains a row without a valid node.");
    }
    rowIds.add(row.id);
  }
  const copiedNodeIds = new Set(nodesToCopy.map((node) => node.id));
  if (rowsToCopy.some((row) => !copiedNodeIds.has(row.template_node_id))) {
    throw new Error("Estimate template source selection is incomplete.");
  }
}

function collectDescendantNodeIds(nodes: TemplateNodeRow[], rootNodeId: string) {
  const childrenByParent = new Map<string | null, string[]>();
  for (const node of nodes) {
    const children = childrenByParent.get(node.parent_id) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parent_id, children);
  }
  const result: string[] = [];
  const queue = [rootNodeId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }
  return result;
}

function buildNodeInsert(input: {
  id: string;
  estimateId: string;
  estimateTabId: string | null;
  parentId: string | null;
  kind: string;
  name: string;
  sortOrder: number;
  metadata: Json;
  timestamp: string;
}): D1IntentStatement {
  return {
    sql: `
      INSERT INTO estimate_nodes (
        id, estimate_id, estimate_tab_id, parent_id, kind, name,
        sort_order, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      input.id,
      input.estimateId,
      input.estimateTabId,
      input.parentId,
      input.kind,
      input.name,
      input.sortOrder,
      input.metadata,
      input.timestamp,
      input.timestamp,
    ],
  };
}

function buildRowInsert(input: {
  id: string;
  estimateId: string;
  nodeId: string;
  row: TemplateRowItemRow;
  sourceLibraryItemId: string | null;
  sourceSnapshot: Record<string, unknown>;
  categoryNodeId: string | null;
  supplierId: string | null;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  unitCost: number;
  miscCost: number;
  linkState: string;
  timestamp: string;
}): D1IntentStatement {
  return {
    sql: `
      INSERT INTO estimate_row_items (
        id, estimate_id, node_id, description, designation, discipline,
        material, supplier, supplier_id, quantity, quantity_base,
        quantity_contingency_amount, unit, unit_cost, misc_cost,
        contingency_percentage, adjustment_percentage, source_snapshot_json,
        sort_order, row_revision, category_node_id, source_library_item_id,
        link_state, metadata_json, pricing_provenance_origin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      input.id,
      input.estimateId,
      input.nodeId,
      input.description,
      input.row.designation ?? "",
      input.row.discipline ?? "",
      input.material,
      input.supplier,
      input.supplierId,
      readNumber(input.row.quantity),
      null,
      null,
      input.unit,
      input.unitCost,
      input.miscCost,
      readNumber(input.row.contingency_percentage),
      readNumber(input.row.adjustment_percentage),
      input.sourceSnapshot,
      readNumber(input.row.sort_order),
      1,
      input.categoryNodeId,
      input.sourceLibraryItemId,
      input.linkState,
      readJson(input.row.metadata, {}),
      input.row.pricing_provenance_origin ?? "inherited_snapshot",
      input.timestamp,
      input.timestamp,
    ],
  };
}

async function copyTemplateNodes(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TemplateCopyScope & { templateIds: string[]; templateNodeId?: string },
): Promise<TemplateCopyResult> {
  if (!database.batch) throw new Error("Estimate template insertion requires atomic D1 batch support.");
  const templateIds = [...new Set(input.templateIds.filter(Boolean))];
  if (templateIds.length === 0) throw new Error("At least one estimate template is required.");
  if (input.templateNodeId && templateIds.length !== 1) {
    throw new Error("A template subtree insert requires exactly one template.");
  }

  const { context: intent, committedResult } = await prepareEstimateMutationIntent<TemplateInsertedResult>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: "estimate.template.copy",
      request: {
        projectId: input.projectId,
        estimateId: input.estimateId,
        targetParentNodeId: input.targetParentNodeId,
        requestedTargetTabId: input.targetTabId ?? null,
        templateIds,
        sourceRootNodeId: input.templateNodeId ?? null,
      },
    },
  );
  if (committedResult) return committedResult;

  const parentNode = await getEstimateNodeForProject(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    nodeId: input.targetParentNodeId,
  });
  if (!parentNode) throw new Error("Estimate tree node not found in the current project.");
  const targetTabId = parentNode.estimate_tab_id ?? null;
  if (input.targetTabId !== undefined && input.targetTabId !== targetTabId) {
    throw new Error("Template insert target tab does not match the selected estimate node.");
  }

  const templateHeaders = await allD1Rows<TemplateHeaderRow>(
    database,
    `
      SELECT id, workspace_id, updated_at
      FROM estimate_templates
      WHERE workspace_id = ?
        AND id IN (${placeholders(templateIds)})
    `,
    [intent.workspaceId, ...templateIds],
  );
  if (templateHeaders.length !== templateIds.length) {
    throw new Error("Estimate template not found in the current workspace.");
  }

  const [unsortedTemplateNodes, unsortedTemplateRows] = await Promise.all([
    allD1Rows<TemplateNodeRow>(
      database,
      `SELECT * FROM estimate_template_nodes WHERE template_id IN (${placeholders(templateIds)})`,
      templateIds,
    ),
    allD1Rows<TemplateRowItemRow>(
      database,
      `SELECT * FROM estimate_template_row_items WHERE template_id IN (${placeholders(templateIds)})`,
      templateIds,
    ),
  ]);
  const templateRank = new Map(templateIds.map((templateId, index) => [templateId, index]));
  const templateNodes = [...unsortedTemplateNodes].sort((left, right) => (
    (templateRank.get(left.template_id) ?? 0) - (templateRank.get(right.template_id) ?? 0)
    || readNumber(left.sort_order) - readNumber(right.sort_order)
    || left.id.localeCompare(right.id)
  ));
  const templateRows = [...unsortedTemplateRows].sort((left, right) => (
    (templateRank.get(left.template_id) ?? 0) - (templateRank.get(right.template_id) ?? 0)
    || readNumber(left.sort_order) - readNumber(right.sort_order)
    || left.id.localeCompare(right.id)
  ));
  const rootTemplateId = templateIds[0]!;
  const rootTemplateNodes = templateNodes.filter((node) => node.template_id === rootTemplateId);
  if (input.templateNodeId && !rootTemplateNodes.some((node) => node.id === input.templateNodeId)) {
    throw new Error("Estimate template node not found in the current template.");
  }
  const allowedNodeIds = input.templateNodeId
    ? new Set(collectDescendantNodeIds(rootTemplateNodes, input.templateNodeId))
    : new Set(templateNodes.map((node) => node.id));
  const nodesToCopy = templateNodes.filter((node) => allowedNodeIds.has(node.id));
  const rowsToCopy = templateRows.filter((row) => allowedNodeIds.has(row.template_node_id));
  validateCopyTopology(templateIds, templateNodes, templateRows, nodesToCopy, rowsToCopy);

  const linkedSourceIds = [...new Set(rowsToCopy.flatMap((row) => (
    row.source_library_item_id ? [row.source_library_item_id] : []
  )))];
  const [libraryItems, priceOptions, currentCostEntries] = linkedSourceIds.length > 0
    ? await Promise.all([
        allD1Rows<TemplateLibraryItemRow>(
          database,
          `SELECT * FROM cost_library_items WHERE workspace_id = ? AND id IN (${placeholders(linkedSourceIds)})`,
          [intent.workspaceId, ...linkedSourceIds],
        ),
        allD1Rows<TemplatePriceOptionRow>(
          database,
          `
            SELECT * FROM cost_library_item_price_options
            WHERE workspace_id = ?
              AND item_id IN (${placeholders(linkedSourceIds)})
              AND is_active = 1
            ORDER BY item_id ASC, is_default DESC, created_at ASC
          `,
          [intent.workspaceId, ...linkedSourceIds],
        ),
        allD1Rows<TemplateCostEntryRow>(
          database,
          `
            SELECT * FROM cost_library_item_variant_cost_entries
            WHERE workspace_id = ?
              AND item_id IN (${placeholders(linkedSourceIds)})
              AND is_current = 1
              AND deleted_at IS NULL
          `,
          [intent.workspaceId, ...linkedSourceIds],
        ),
      ])
    : [[], [], []];
  const libraryItemById = new Map(libraryItems.map((item) => [item.id, item]));
  const priceOptionById = new Map(priceOptions.map((option) => [option.id, option]));
  const priceOptionsByItemId = new Map<string, TemplatePriceOptionRow[]>();
  for (const option of priceOptions) {
    const itemOptions = priceOptionsByItemId.get(option.item_id) ?? [];
    itemOptions.push(option);
    priceOptionsByItemId.set(option.item_id, itemOptions);
  }
  const currentCostEntryByOptionId = new Map(
    currentCostEntries.map((entry) => [entry.price_option_id, entry]),
  );

  const unavailableRows = rowsToCopy.flatMap((row): TemplateUnavailableSource[] => {
    if (!row.source_library_item_id) return [];
    const savedSnapshot = readJsonRecord(row.source_snapshot);
    const selectedPriceOptionId = readSnapshotText(savedSnapshot, "priceOptionId");
    const item = libraryItemById.get(row.source_library_item_id);
    let reason: string | null = null;
    if (!item) reason = "component_not_found_in_workspace";
    else if (item.lifecycle_state !== "available") reason = `component_${item.lifecycle_state}`;
    else if (!selectedPriceOptionId) reason = "selected_variant_identity_missing";
    else {
      const option = priceOptionById.get(selectedPriceOptionId);
      if (!option || option.item_id !== item.id) reason = "selected_variant_unavailable";
    }
    return reason ? [{ templateRowId: row.id, material: row.material ?? "", reason }] : [];
  });
  const unavailableReasonByRowId = new Map(
    unavailableRows.map((row) => [row.templateRowId, row.reason]),
  );
  if (unavailableRows.length > 0 && input.unavailableSourcePolicy === "cancel") {
    return {
      status: "requires_saved_snapshot_confirmation",
      unavailableSourceCount: unavailableRows.length,
      unavailableRows: unavailableRows.slice(0, 20),
    };
  }

  const sibling = await firstD1Row<{ sort_order: number | string | null }>(
    database,
    `
      SELECT COALESCE(MAX(sort_order), 0) AS sort_order
      FROM estimate_nodes
      WHERE estimate_id = ?
        AND estimate_tab_id IS ?
        AND parent_id = ?
    `,
    [intent.estimateId, targetTabId, input.targetParentNodeId],
  );
  const expectedMaxSiblingSortOrder = readNumber(sibling?.sort_order, 0);
  const sourceRoots = nodesToCopy.filter((node) => !node.parent_id || !allowedNodeIds.has(node.parent_id));
  if (sourceRoots.length === 0) throw new Error("Estimate template source has no root nodes to insert.");
  const exactStatementCount = 1 + nodesToCopy.length + rowsToCopy.length + 1 + 1 + 1 + 1;
  assertTemplateCopyStatementLimit(exactStatementCount);

  const sourceFingerprint = createMutationRequestFingerprint({
    templateHeaders,
    templateNodes,
    templateRows,
    libraryItems,
    priceOptions,
    currentCostEntries,
    sourceRootNodeId: input.templateNodeId ?? null,
  });
  const linkedSourceGuard = linkedSourceIds.length > 0
    ? `
        AND (SELECT COUNT(*) FROM cost_library_items WHERE workspace_id = ? AND id IN (${placeholders(linkedSourceIds)})) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM cost_library_items WHERE workspace_id = ? AND id IN (${placeholders(linkedSourceIds)})), '') = ?
        AND (SELECT COUNT(*) FROM cost_library_item_price_options WHERE workspace_id = ? AND item_id IN (${placeholders(linkedSourceIds)}) AND is_active = 1) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM cost_library_item_price_options WHERE workspace_id = ? AND item_id IN (${placeholders(linkedSourceIds)}) AND is_active = 1), '') = ?
        AND (SELECT COUNT(*) FROM cost_library_item_variant_cost_entries WHERE workspace_id = ? AND item_id IN (${placeholders(linkedSourceIds)}) AND is_current = 1 AND deleted_at IS NULL) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM cost_library_item_variant_cost_entries WHERE workspace_id = ? AND item_id IN (${placeholders(linkedSourceIds)}) AND is_current = 1 AND deleted_at IS NULL), '') = ?
      `
    : "";
  const linkedSourceGuardValues = linkedSourceIds.length > 0
    ? [
        intent.workspaceId, ...linkedSourceIds, libraryItems.length,
        intent.workspaceId, ...linkedSourceIds, latestSourceUpdate(libraryItems),
        intent.workspaceId, ...linkedSourceIds, priceOptions.length,
        intent.workspaceId, ...linkedSourceIds, latestSourceUpdate(priceOptions),
        intent.workspaceId, ...linkedSourceIds, currentCostEntries.length,
        intent.workspaceId, ...linkedSourceIds, latestSourceUpdate(currentCostEntries),
      ]
    : [];
  const sourceGuard: D1IntentStatement = {
    sql: `
      SELECT CASE WHEN
        EXISTS (
          SELECT 1 FROM estimate_nodes
          WHERE id = ? AND estimate_id = ? AND estimate_tab_id IS ? AND updated_at = ?
        )
        AND COALESCE((
          SELECT MAX(sort_order) FROM estimate_nodes
          WHERE estimate_id = ? AND estimate_tab_id IS ? AND parent_id = ?
        ), 0) = ?
        AND (SELECT COUNT(*) FROM estimate_templates WHERE workspace_id = ? AND id IN (${placeholders(templateIds)})) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_templates WHERE workspace_id = ? AND id IN (${placeholders(templateIds)})), '') = ?
        AND (SELECT COUNT(*) FROM estimate_template_nodes WHERE template_id IN (${placeholders(templateIds)})) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_template_nodes WHERE template_id IN (${placeholders(templateIds)})), '') = ?
        AND (SELECT COUNT(*) FROM estimate_template_row_items WHERE template_id IN (${placeholders(templateIds)})) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_template_row_items WHERE template_id IN (${placeholders(templateIds)})), '') = ?
        ${linkedSourceGuard}
      THEN 1 ELSE json('') END AS estimate_template_copy_source_guard
    `,
    values: [
      input.targetParentNodeId,
      intent.estimateId,
      targetTabId,
      String(parentNode.updated_at ?? ""),
      intent.estimateId,
      targetTabId,
      input.targetParentNodeId,
      expectedMaxSiblingSortOrder,
      intent.workspaceId,
      ...templateIds,
      templateHeaders.length,
      intent.workspaceId,
      ...templateIds,
      latestSourceUpdate(templateHeaders),
      ...templateIds,
      templateNodes.length,
      ...templateIds,
      latestSourceUpdate(templateNodes),
      ...templateIds,
      templateRows.length,
      ...templateIds,
      latestSourceUpdate(templateRows),
      ...linkedSourceGuardValues,
    ],
  };

  const copiedAt = nowIso();
  const nodeIdBySource = new Map(nodesToCopy.map((node) => [node.id, randomUUID()]));
  const sourceRootIds = new Set(sourceRoots.map((root) => root.id));
  const sourceRootRankById = new Map(sourceRoots.map((root, index) => [root.id, index + 1]));
  const insertedRootNodeIds = sourceRoots.map((root) => nodeIdBySource.get(root.id)!);
  const nodeStatements = nodesToCopy.map((node) => {
    const isRoot = sourceRootIds.has(node.id);
    return buildNodeInsert({
      id: nodeIdBySource.get(node.id)!,
      estimateId: intent.estimateId,
      estimateTabId: targetTabId,
      parentId: isRoot ? input.targetParentNodeId : nodeIdBySource.get(node.parent_id ?? "") ?? null,
      kind: node.kind,
      name: node.name,
      sortOrder: isRoot
        ? expectedMaxSiblingSortOrder + (sourceRootRankById.get(node.id) ?? 1) * 1_000
        : readNumber(node.sort_order),
      metadata: readJson(node.metadata, {}),
      timestamp: copiedAt,
    });
  });
  const rowStatements = rowsToCopy.map((row) => {
    const nodeId = nodeIdBySource.get(row.template_node_id);
    if (!nodeId) throw new Error("Estimate template source selection is incomplete.");
    const savedSnapshot = readJsonRecord(row.source_snapshot);
    const unavailableReason = unavailableReasonByRowId.get(row.id);
    const currentItem = row.source_library_item_id
      ? libraryItemById.get(row.source_library_item_id)
      : undefined;
    const selectedPriceOptionId = readSnapshotText(savedSnapshot, "priceOptionId");
    const selectedOption = selectedPriceOptionId ? priceOptionById.get(selectedPriceOptionId) : undefined;
    const currentSnapshot = currentItem && selectedOption && !unavailableReason
      ? buildCurrentSourceSnapshot({
          savedSnapshot,
          item: currentItem,
          selectedOption,
          currentCostEntry: currentCostEntryByOptionId.get(selectedOption.id),
          activeOptions: priceOptionsByItemId.get(currentItem.id) ?? [selectedOption],
          currentCostEntryByOptionId,
        })
      : null;
    const effectiveCostEntry = selectedOption
      ? currentCostEntryByOptionId.get(selectedOption.id)
      : undefined;
    return buildRowInsert({
      id: randomUUID(),
      estimateId: intent.estimateId,
      nodeId,
      row,
      sourceLibraryItemId: currentSnapshot ? currentItem!.id : null,
      sourceSnapshot: currentSnapshot
        ?? (unavailableReason ? buildSavedSourceSnapshot(row, unavailableReason) : savedSnapshot),
      categoryNodeId: currentSnapshot ? currentItem!.category_node_id : row.category_node_id,
      supplierId: currentSnapshot
        ? selectedOption!.supplier_id ?? currentItem!.supplier_id
        : row.supplier_id,
      material: currentSnapshot ? currentItem!.name : row.material ?? "",
      description: currentSnapshot ? currentItem!.description : row.description ?? "",
      supplier: currentSnapshot ? currentItem!.supplier ?? "" : row.supplier ?? "",
      unit: currentSnapshot ? selectedOption!.unit : row.unit ?? "unit",
      unitCost: currentSnapshot
        ? readNumber(effectiveCostEntry?.unit_cost ?? selectedOption!.unit_cost)
        : readNumber(row.unit_cost),
      miscCost: currentSnapshot
        ? readNumber(effectiveCostEntry?.misc_cost ?? selectedOption!.misc_cost)
        : readNumber(row.misc_cost),
      linkState: currentSnapshot ? "linked-clean" : "unlinked",
      timestamp: copiedAt,
    });
  });
  const history = await prepareHistoryEventInsert(database, {
    projectId: intent.projectId,
    estimateId: intent.estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: input.targetParentNodeId,
    estimateTabId: targetTabId,
    eventType: input.templateNodeId ? "template_node_subtree_inserted" : "template_inserted",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    payload: {
      inserted_root_node_ids: insertedRootNodeIds,
      inserted_node_count: nodeStatements.length,
      inserted_row_item_count: rowStatements.length,
      sourceTemplateIds: templateIds,
      sourceTemplateId: templateIds.length === 1 ? templateIds[0] : null,
      sourceTemplateNodeId: input.templateNodeId ?? null,
      savedSnapshotUnlinkedRowCount: unavailableRows.length,
      sourceFingerprint,
      statementCount: exactStatementCount,
    },
  });
  if (!history.statement || !history.outboxStatement) {
    throw new Error("Template insert intent has activity history without a committed mutation receipt.");
  }
  const result: TemplateInsertedResult = {
    status: "inserted",
    eventId: history.eventId,
    insertedRootNodeIds,
    inserted_root_node_ids: insertedRootNodeIds,
    insertedRootNodeId: insertedRootNodeIds[0] ?? null,
    inserted_root_node_id: insertedRootNodeIds[0] ?? null,
    estimateTabId: targetTabId,
    estimate_tab_id: targetTabId,
    insertedNodeCount: nodeStatements.length,
    insertedRowItemCount: rowStatements.length,
    sourceFingerprint,
    statementCount: exactStatementCount,
  };
  const statements: D1IntentStatement[] = [
    sourceGuard,
    ...nodeStatements,
    ...rowStatements,
    buildProjectPublicationRevisionForEstimate(intent.projectId, intent.workspaceId, intent.estimateId),
    history.statement,
    history.outboxStatement,
    buildEstimateMutationReceiptStatement(
      intent,
      "estimate_node",
      insertedRootNodeIds[0] ?? null,
      result,
      copiedAt,
    ),
  ];
  assertTemplateCopyStatementLimit(statements.length);
  try {
    await runD1Batch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<TemplateInsertedResult>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    throw error;
  }
  return result;
}

export async function insertEstimateTemplateIntoEstimateWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TemplateCopyScope & { templateId: string },
) {
  return copyTemplateNodes(database, actor, { ...input, templateIds: [input.templateId] });
}

export async function insertEstimateTemplatesIntoEstimateWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TemplateCopyScope & { templateIds: string[] },
) {
  return copyTemplateNodes(database, actor, input);
}

export async function insertEstimateTemplateNodeIntoEstimateWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TemplateCopyScope & { templateId: string; templateNodeId: string },
) {
  return copyTemplateNodes(database, actor, {
    ...input,
    templateIds: [input.templateId],
    templateNodeId: input.templateNodeId,
  });
}
