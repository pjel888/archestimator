import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike } from "@/lib/cloudflare/d1";
import {
  assertD1MutationStatementLimit,
  createMutationRequestFingerprint,
} from "@/lib/estimates/mutation-receipts";
import { buildProjectComponentAttachmentDeleteRetentionStatements } from "@/lib/estimates/project-component-attachment-retention";
import type { Json } from "@/lib/types/json";

import {
  allD1Rows,
  firstD1Row,
  runD1Batch,
  runD1Statement,
  type D1IntentStatement,
} from "./database";
import { prepareHistoryEventInsert, runMutationWithHistory } from "./history-events";
import {
  assertEstimateEditIntent,
  buildEstimateMutationReceiptStatement,
  buildProjectPublicationRevisionForEstimate,
  prepareEstimateMutationIntent,
  readConcurrentEstimateMutationReceipt,
  type EstimateD1Actor,
  type EstimateIntentContext,
} from "./intent-context";

type EstimateTabRow = {
  id: string;
  estimate_id: string;
  name: string;
  sort_order: number | string | null;
  is_default: number | boolean | null;
  archived_at: string | null;
  metadata: Json | string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type EstimateNodeRow = {
  id: string;
  estimate_id: string;
  estimate_tab_id: string | null;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number | string | null;
  metadata_json: Json | string | null;
  created_at: string;
  updated_at: string;
};

type EstimateRowItemRow = {
  id: string;
  estimate_id: string;
  node_id: string | null;
  description: string | null;
  designation: string | null;
  discipline: string | null;
  material: string | null;
  supplier: string | null;
  supplier_id: string | null;
  quantity: number | string | null;
  quantity_base: number | string | null;
  quantity_contingency_amount: number | string | null;
  unit: string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage: number | string | null;
  source_snapshot_json: Json | string | null;
  sort_order: number | string | null;
  row_revision: number | string | null;
  category_node_id: string | null;
  source_library_item_id: string | null;
  link_state: string | null;
  metadata_json: Json | string | null;
  pricing_provenance_origin: string | null;
  created_at: string;
  updated_at: string;
};

type TabMutationScope = {
  projectId: string;
  estimateId: string;
  correlationId: string;
};

function nowIso() {
  return new Date().toISOString();
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("Something went wrong. Try again in a moment.");
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

function serializeTab(row: EstimateTabRow): EstimateTabRow {
  return {
    ...row,
    is_default: row.is_default === true || row.is_default === 1,
    metadata: readJson(row.metadata, {}),
    sort_order: readNumber(row.sort_order),
  };
}

function serializeNode(row: EstimateNodeRow): EstimateNodeRow {
  return {
    ...row,
    metadata_json: readJson(row.metadata_json, {}),
    sort_order: readNumber(row.sort_order),
  };
}

function serializeRow(row: EstimateRowItemRow): EstimateRowItemRow {
  return {
    ...row,
    quantity: readNumber(row.quantity),
    quantity_base: row.quantity_base === null ? null : readNumber(row.quantity_base),
    quantity_contingency_amount: row.quantity_contingency_amount === null
      ? null
      : readNumber(row.quantity_contingency_amount),
    unit_cost: readNumber(row.unit_cost),
    misc_cost: readNumber(row.misc_cost),
    contingency_percentage: readNumber(row.contingency_percentage),
    adjustment_percentage: readNumber(row.adjustment_percentage),
    sort_order: readNumber(row.sort_order),
    row_revision: Math.max(1, Math.trunc(readNumber(row.row_revision, 1))),
    source_snapshot_json: row.source_snapshot_json === null ? null : readJson(row.source_snapshot_json, {}),
    metadata_json: readJson(row.metadata_json, {}),
    link_state: row.link_state || "unlinked",
  };
}

function compareSortOrderThenId(
  left: { id: string; sort_order: number | string | null },
  right: { id: string; sort_order: number | string | null },
) {
  return readNumber(left.sort_order) - readNumber(right.sort_order) || left.id.localeCompare(right.id);
}

function validateCopiedTabTopology(nodes: EstimateNodeRow[], rows: EstimateRowItemRow[]) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    if (node.parent_id && !nodesById.has(node.parent_id)) {
      throw new Error("Estimate tab contains a node whose parent is outside the source tab.");
    }
    const visited = new Set<string>();
    let cursor: EstimateNodeRow | undefined = node;
    while (cursor) {
      if (visited.has(cursor.id)) throw new Error("Estimate tab contains a cyclic node graph.");
      visited.add(cursor.id);
      cursor = cursor.parent_id ? nodesById.get(cursor.parent_id) : undefined;
    }
  }
  for (const row of rows) {
    if (!row.node_id || !nodesById.has(row.node_id)) {
      throw new Error("Estimate tab contains a row without a valid source node.");
    }
  }
}

async function requireScopedEstimate(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: { projectId: string; estimateId: string },
): Promise<EstimateIntentContext> {
  const context = await assertEstimateEditIntent(database, actor, input.estimateId);
  if (context.projectId !== input.projectId) throw new Error("Estimate not found in the current project.");
  return context;
}

async function readTabById(database: D1DatabaseLike, estimateId: string, tabId: string) {
  const row = await firstD1Row<EstimateTabRow>(
    database,
    `
      SELECT *
      FROM estimate_tabs
      WHERE estimate_id = ?
        AND id = ?
      LIMIT 1
    `,
    [estimateId, tabId],
  );
  return row ? serializeTab(row) : null;
}

function buildTabInsert(input: {
  id: string;
  estimateId: string;
  name: string;
  sortOrder: number;
  isDefault: boolean | number;
  metadata: Json;
  createdBy: string;
  timestamp: string;
}): D1IntentStatement {
  return {
    sql: `
      INSERT INTO estimate_tabs (
        id, estimate_id, name, sort_order, is_default, archived_at,
        metadata, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `,
    values: [
      input.id,
      input.estimateId,
      input.name,
      input.sortOrder,
      input.isDefault,
      input.metadata,
      input.createdBy,
      input.timestamp,
      input.timestamp,
    ],
  };
}

function buildNodeInsert(input: {
  id: string;
  estimateId: string;
  tabId: string;
  parentId: string | null;
  source: EstimateNodeRow;
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
      input.tabId,
      input.parentId,
      input.source.kind,
      input.source.name,
      readNumber(input.source.sort_order),
      readJson(input.source.metadata_json, {}),
      input.timestamp,
      input.timestamp,
    ],
  };
}

function buildRowInsert(input: {
  id: string;
  estimateId: string;
  nodeId: string;
  source: EstimateRowItemRow;
  timestamp: string;
}): D1IntentStatement {
  const row = input.source;
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
      row.description,
      row.designation,
      row.discipline,
      row.material,
      row.supplier,
      row.supplier_id,
      readNumber(row.quantity),
      row.quantity_base === null ? null : readNumber(row.quantity_base),
      row.quantity_contingency_amount === null ? null : readNumber(row.quantity_contingency_amount),
      row.unit,
      readNumber(row.unit_cost),
      readNumber(row.misc_cost),
      readNumber(row.contingency_percentage),
      readNumber(row.adjustment_percentage),
      row.source_snapshot_json === null ? null : readJson(row.source_snapshot_json, {}),
      readNumber(row.sort_order),
      1,
      row.category_node_id,
      row.source_library_item_id,
      row.link_state || (row.source_library_item_id ? "linked-clean" : "unlinked"),
      readJson(row.metadata_json, {}),
      row.pricing_provenance_origin ?? "missing",
      input.timestamp,
      input.timestamp,
    ],
  };
}

export async function createDefaultEstimateTab(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: { projectId: string; estimateId: string },
): Promise<{ id: string }> {
  await requireScopedEstimate(database, actor, input);
  const id = randomUUID();
  const insert = buildTabInsert({
    id,
    estimateId: input.estimateId,
    name: "Main",
    sortOrder: 0,
    isDefault: true,
    metadata: {},
    createdBy: actor.userId,
    timestamp: nowIso(),
  });
  await runD1Statement(database, insert.sql, insert.values);
  return { id };
}

export async function readEstimateTabsForDuplication(
  database: D1DatabaseLike,
  input: { estimateId: string },
) {
  const rows = await allD1Rows<EstimateTabRow>(
    database,
    `
      SELECT *
      FROM estimate_tabs
      WHERE estimate_id = ? AND archived_at IS NULL
      ORDER BY sort_order ASC, id ASC
    `,
    [input.estimateId],
  );
  return rows.map(serializeTab);
}

export async function insertEstimateTabsForDuplication(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: {
    projectId: string;
    estimateId: string;
    tabs: ReadonlyArray<Pick<EstimateTabRow, "id" | "name" | "sort_order" | "is_default" | "metadata">>;
  },
) {
  await requireScopedEstimate(database, actor, input);
  const timestamp = nowIso();
  const tabIdBySourceId = new Map<string, string>();
  const statements = input.tabs.map((tab) => {
    const id = randomUUID();
    tabIdBySourceId.set(tab.id, id);
    return buildTabInsert({
      id,
      estimateId: input.estimateId,
      name: tab.name,
      sortOrder: readNumber(tab.sort_order),
      isDefault: tab.is_default === true || tab.is_default === 1,
      metadata: readJson(tab.metadata, {}),
      createdBy: actor.userId,
      timestamp,
    });
  });
  await runD1Batch(database, statements);
  return { tabIdBySourceId };
}

export async function createEstimateTabWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TabMutationScope & { name: string },
) {
  const context = await requireScopedEstimate(database, actor, input);
  const maxRow = await firstD1Row<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_tabs WHERE estimate_id = ?",
    [input.estimateId],
  );
  const tabId = randomUUID();
  const timestamp = nowIso();
  const insert = buildTabInsert({
    id: tabId,
    estimateId: input.estimateId,
    name: input.name || "New Tab",
    sortOrder: readNumber(maxRow?.max_sort_order, -1000) + 1000,
    isDefault: false,
    metadata: {},
    createdBy: actor.userId,
    timestamp,
  });
  await runMutationWithHistory(database, [
    insert,
    buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId),
  ], {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: tabId,
    eventType: "estimate_tab_created",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    payload: { tabId, name: input.name },
  });
  return { estimateTabId: tabId, tabId };
}

export async function renameEstimateTabWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TabMutationScope & { tabId: string; name: string },
) {
  const context = await requireScopedEstimate(database, actor, input);
  const tab = await readTabById(database, input.estimateId, input.tabId);
  if (!tab) throw new Error("Estimate tab not found in the current estimate.");
  const name = input.name.trim();
  if (!name) throw new Error("Estimate tab name is required.");
  if (name === tab.name) return { estimateTabId: input.tabId };
  const updatedAt = nowIso();
  await runMutationWithHistory(database, [
    {
      sql: "UPDATE estimate_tabs SET name = ?, updated_at = ? WHERE id = ? AND estimate_id = ? AND updated_at = ?",
      values: [name, updatedAt, input.tabId, input.estimateId, tab.updated_at],
    },
    buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId),
  ], {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.tabId,
    eventType: "estimate_tab_renamed",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    changedFields: ["name"],
    oldSnapshot: tab,
    newSnapshot: { name },
    payload: { tabId: input.tabId, name },
  });
  return { estimateTabId: input.tabId };
}

export async function reorderEstimateTabsWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TabMutationScope & { updates: Array<{ id: string; sortOrder: number }> },
) {
  const context = await requireScopedEstimate(database, actor, input);
  if (input.updates.length === 0) throw new Error("At least one estimate tab update is required.");
  const updateIds = new Set<string>();
  for (const update of input.updates) {
    if (!update.id) throw new Error("Estimate tab update id is required.");
    if (updateIds.has(update.id)) throw new Error(`Duplicate estimate tab update: ${update.id}.`);
    if (!Number.isFinite(update.sortOrder) || update.sortOrder < 0) {
      throw new Error("Estimate tab sort order must be a non-negative number.");
    }
    updateIds.add(update.id);
  }
  const currentTabs = await allD1Rows<Pick<EstimateTabRow, "id" | "sort_order">>(
    database,
    `SELECT id, sort_order FROM estimate_tabs WHERE estimate_id = ? AND id IN (${placeholders(input.updates)})`,
    [input.estimateId, ...input.updates.map((update) => update.id)],
  );
  const currentById = new Map(currentTabs.map((tab) => [tab.id, readNumber(tab.sort_order)]));
  const missingId = input.updates.find((update) => !currentById.has(update.id))?.id;
  if (missingId) throw new Error(`Estimate tab not found in the current estimate: ${missingId}.`);
  const changedUpdates = input.updates.filter((update) => currentById.get(update.id) !== update.sortOrder);
  if (changedUpdates.length === 0) return { estimateTabId: input.updates[0]!.id };
  const updatedAt = nowIso();
  const currentStateClauses = changedUpdates.map(() => "(id = ? AND sort_order = ?)").join(" OR ");
  const statements: D1IntentStatement[] = [{
    sql: `
      SELECT CASE WHEN (
        SELECT COUNT(*)
        FROM estimate_tabs
        WHERE estimate_id = ?
          AND (${currentStateClauses})
      ) = ? THEN 1 ELSE json('') END AS estimate_tab_reorder_guard
    `,
    values: [
      input.estimateId,
      ...changedUpdates.flatMap((update) => [update.id, currentById.get(update.id)!]),
      changedUpdates.length,
    ],
  }, ...changedUpdates.map((update) => ({
    sql: "UPDATE estimate_tabs SET sort_order = ?, updated_at = ? WHERE id = ? AND estimate_id = ?",
    values: [update.sortOrder, updatedAt, update.id, input.estimateId],
  })), buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId)];
  await runMutationWithHistory(database, statements, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    eventType: "estimate_tabs_reordered",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    changedFields: ["sort_order"],
    payload: { updates: changedUpdates.map((update) => ({ id: update.id, sort_order: update.sortOrder })) },
  });
  return { estimateTabId: changedUpdates[0]!.id };
}

export async function duplicateEstimateTabWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TabMutationScope & { sourceTabId: string; name?: string },
) {
  if (!database.batch) throw new Error("Something went wrong. Try again in a moment.");
  const requestedName = typeof input.name === "string" && input.name.trim() ? input.name.trim() : null;
  const { context: intent, committedResult } = await prepareEstimateMutationIntent<Record<string, unknown>>(
    database,
    actor,
    {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.correlationId,
      commandKind: "estimate.tab.duplicate",
      request: { sourceTabId: input.sourceTabId, requestedName },
    },
  );
  if (committedResult) return committedResult;

  const sourceTab = await readTabById(database, intent.estimateId, input.sourceTabId);
  if (!sourceTab) throw new Error("Estimate tab not found in the current estimate.");
  const sourceNodes = (await allD1Rows<EstimateNodeRow>(
    database,
    "SELECT * FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ? ORDER BY sort_order ASC, id ASC",
    [intent.estimateId, input.sourceTabId],
  )).map(serializeNode).sort(compareSortOrderThenId);
  const sourceNodeIds = sourceNodes.map((node) => node.id);
  const sourceRows = sourceNodeIds.length > 0
    ? (await allD1Rows<EstimateRowItemRow>(
        database,
        `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(sourceNodeIds)}) ORDER BY sort_order ASC, id ASC`,
        [intent.estimateId, ...sourceNodeIds],
      )).map(serializeRow).sort(compareSortOrderThenId)
    : [];
  validateCopiedTabTopology(sourceNodes, sourceRows);
  assertD1MutationStatementLimit(1 + sourceNodes.length + sourceRows.length + 1 + 2 + 1 + 1);

  const sourceFingerprint = createMutationRequestFingerprint({ tab: sourceTab, nodes: sourceNodes, rows: sourceRows });
  const maxRow = await firstD1Row<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_tabs WHERE estimate_id = ?",
    [intent.estimateId],
  );
  const expectedMaxTabSortOrder = readNumber(maxRow?.max_sort_order, -1000);
  const sourceNodeUpdatedAt = sourceNodes.reduce(
    (latest, node) => String(node.updated_at ?? "") > latest ? String(node.updated_at ?? "") : latest,
    "",
  );
  const sourceRowUpdatedAt = sourceRows.reduce(
    (latest, row) => String(row.updated_at ?? "") > latest ? String(row.updated_at ?? "") : latest,
    "",
  );
  const sourceRowRevisionTotal = sourceRows.reduce(
    (total, row) => total + Math.max(1, Math.trunc(readNumber(row.row_revision, 1))),
    0,
  );
  const copiedAt = nowIso();
  const nextTabId = randomUUID();
  const nodeIdBySource = new Map(sourceNodes.map((node) => [node.id, randomUUID()]));
  const rowIdBySource = new Map(sourceRows.map((row) => [row.id, randomUUID()]));
  const tabInsert = buildTabInsert({
    id: nextTabId,
    estimateId: intent.estimateId,
    name: requestedName ?? `${sourceTab.name} Copy`,
    sortOrder: expectedMaxTabSortOrder + 1000,
    isDefault: false,
    metadata: readJson(sourceTab.metadata, {}),
    createdBy: intent.actorUserId,
    timestamp: copiedAt,
  });
  const nodeInserts = sourceNodes.map((node) => buildNodeInsert({
    id: nodeIdBySource.get(node.id)!,
    estimateId: intent.estimateId,
    tabId: nextTabId,
    parentId: node.parent_id ? nodeIdBySource.get(node.parent_id) ?? null : null,
    source: node,
    timestamp: copiedAt,
  }));
  const rowInserts = sourceRows.map((row) => buildRowInsert({
    id: rowIdBySource.get(row.id)!,
    estimateId: intent.estimateId,
    nodeId: nodeIdBySource.get(row.node_id!)!,
    source: row,
    timestamp: copiedAt,
  }));
  const history = await prepareHistoryEventInsert(database, {
    projectId: intent.projectId,
    estimateId: intent.estimateId,
    workspaceId: intent.workspaceId,
    estimateTabId: nextTabId,
    eventType: "estimate_tab_duplicated",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    payload: {
      sourceTabId: input.sourceTabId,
      tabId: nextTabId,
      sourceFingerprint,
      copiedNodeCount: sourceNodes.length,
      copiedRowCount: sourceRows.length,
    },
  });
  if (!history.statement || !history.outboxStatement) {
    throw new Error("Estimate tab duplicate intent has history without a committed mutation receipt.");
  }
  const result = {
    estimateTabId: nextTabId,
    sourceTabId: input.sourceTabId,
    sourceFingerprint,
    copiedNodeCount: sourceNodes.length,
    copiedRowCount: sourceRows.length,
    eventId: history.eventId,
  };
  const sourceGuard: D1IntentStatement = {
    sql: `
      SELECT CASE WHEN
        EXISTS (
          SELECT 1 FROM estimate_tabs
          WHERE estimate_id = ? AND id = ? AND updated_at = ?
        )
        AND (SELECT COUNT(*) FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?), '') = ?
        AND (
          SELECT COUNT(*) FROM estimate_row_items row_item
          JOIN estimate_nodes node ON node.id = row_item.node_id AND node.estimate_id = row_item.estimate_id
          WHERE row_item.estimate_id = ? AND node.estimate_tab_id = ?
        ) = ?
        AND COALESCE((
          SELECT MAX(row_item.updated_at) FROM estimate_row_items row_item
          JOIN estimate_nodes node ON node.id = row_item.node_id AND node.estimate_id = row_item.estimate_id
          WHERE row_item.estimate_id = ? AND node.estimate_tab_id = ?
        ), '') = ?
        AND COALESCE((
          SELECT SUM(row_item.row_revision) FROM estimate_row_items row_item
          JOIN estimate_nodes node ON node.id = row_item.node_id AND node.estimate_id = row_item.estimate_id
          WHERE row_item.estimate_id = ? AND node.estimate_tab_id = ?
        ), 0) = ?
        AND COALESCE((SELECT MAX(sort_order) FROM estimate_tabs WHERE estimate_id = ?), -1000) = ?
      THEN 1 ELSE json('') END AS estimate_tab_duplicate_source_guard
    `,
    values: [
      intent.estimateId, input.sourceTabId, sourceTab.updated_at,
      intent.estimateId, input.sourceTabId, sourceNodes.length,
      intent.estimateId, input.sourceTabId, sourceNodeUpdatedAt,
      intent.estimateId, input.sourceTabId, sourceRows.length,
      intent.estimateId, input.sourceTabId, sourceRowUpdatedAt,
      intent.estimateId, input.sourceTabId, sourceRowRevisionTotal,
      intent.estimateId, expectedMaxTabSortOrder,
    ],
  };
  const statements: D1IntentStatement[] = [
    sourceGuard,
    tabInsert,
    ...nodeInserts,
    ...rowInserts,
    buildProjectPublicationRevisionForEstimate(intent.projectId, intent.workspaceId, intent.estimateId),
    history.statement,
    history.outboxStatement,
    buildEstimateMutationReceiptStatement(intent, "estimate_tab", nextTabId, result, copiedAt),
  ];
  assertD1MutationStatementLimit(statements.length);
  try {
    await runD1Batch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt<typeof result>(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    throw error;
  }
  return result;
}

export async function archiveEstimateTabWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TabMutationScope & { tabId: string },
) {
  const context = await requireScopedEstimate(database, actor, input);
  const tab = await readTabById(database, input.estimateId, input.tabId);
  if (!tab) throw new Error("Estimate tab not found in the current estimate.");
  if (tab.archived_at) return { estimateTabId: input.tabId };
  const archivedAt = nowIso();
  await runMutationWithHistory(database, [
    {
      sql: "UPDATE estimate_tabs SET archived_at = ?, updated_at = ? WHERE id = ? AND estimate_id = ? AND updated_at = ?",
      values: [archivedAt, archivedAt, input.tabId, input.estimateId, tab.updated_at],
    },
    buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId),
  ], {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.tabId,
    eventType: "estimate_tab_archived",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    payload: { tabId: input.tabId },
  });
  return { estimateTabId: input.tabId };
}

export async function deleteEstimateTabWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: TabMutationScope & { tabId: string },
) {
  const context = await requireScopedEstimate(database, actor, input);
  const tab = await readTabById(database, input.estimateId, input.tabId);
  if (!tab) throw new Error("Estimate tab not found in the current estimate.");
  const replacement = await firstD1Row<{ id: string }>(
    database,
    "SELECT id FROM estimate_tabs WHERE estimate_id = ? AND id <> ? AND archived_at IS NULL ORDER BY is_default DESC, sort_order ASC LIMIT 1",
    [input.estimateId, input.tabId],
  );
  if (!replacement) throw new Error("At least one active estimate tab is required.");
  const nodes = await allD1Rows<{ id: string }>(
    database,
    "SELECT id FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?",
    [input.estimateId, input.tabId],
  );
  const nodeIds = nodes.map((node) => node.id);
  const deletedRows = nodeIds.length > 0
    ? await allD1Rows<EstimateRowItemRow>(
        database,
        `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(nodeIds)})`,
        [input.estimateId, ...nodeIds],
      )
    : [];
  const deletedAt = nowIso();
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: context.workspaceId,
    estimateTabId: input.tabId,
    eventType: "estimate_tab_deleted",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    oldSnapshot: { rows: deletedRows.map(serializeRow) },
    payload: { tabId: input.tabId, replacementTabId: replacement.id, deletedNodeIds: nodeIds },
  });
  const statements: D1IntentStatement[] = [{
    sql: `
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_tabs
        WHERE id = ? AND estimate_id = ? AND updated_at = ?
      ) THEN 1 ELSE json('') END AS estimate_tab_delete_guard
    `,
    values: [input.tabId, input.estimateId, tab.updated_at],
  }, ...buildProjectComponentAttachmentDeleteRetentionStatements({
    workspaceId: context.workspaceId,
    projectId: input.projectId,
    sourceDeleteEventId: history.eventId,
    deletedRows,
    deletedAt,
  })];
  if (nodeIds.length > 0) {
    statements.push(
      {
        sql: `DELETE FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(nodeIds)})`,
        values: [input.estimateId, ...nodeIds],
      },
      {
        sql: `DELETE FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(nodeIds)})`,
        values: [input.estimateId, ...nodeIds],
      },
    );
  }
  statements.push(
    { sql: "DELETE FROM estimate_tabs WHERE id = ? AND estimate_id = ?", values: [input.tabId, input.estimateId] },
    buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId),
  );
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  assertD1MutationStatementLimit(statements.length);
  await runD1Batch(database, statements);
  return {
    estimateTabId: input.tabId,
    replacementTabId: replacement.id,
    deletedNodeCount: nodeIds.length,
    deletedRowCount: deletedRows.length,
  };
}
