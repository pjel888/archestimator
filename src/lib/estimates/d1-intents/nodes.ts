import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike } from "@/lib/cloudflare/d1";
import { validateProjectedEstimateTreeReorder } from "@/lib/estimates/estimate-tree-reorder";
import { assertD1MutationStatementLimit } from "@/lib/estimates/mutation-receipts";
import {
  buildProjectComponentAttachmentDeleteRetentionStatements,
  buildProjectComponentAttachmentRestoreRetentionStatements,
} from "@/lib/estimates/project-component-attachment-retention";
import { normalizeEstimateTreeNodeKind } from "@/lib/estimates/tree-hierarchy";
import { prepareActivationOutboxIntent } from "@/lib/onboarding/activation-outbox";
import { validateActivationProducerIntent } from "@/lib/onboarding/activation-producer-contract";
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
  buildProjectPublicationRevisionForEstimate,
  type EstimateD1Actor,
  type EstimateIntentContext,
} from "./intent-context";

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

type EstimateTabRow = {
  id: string;
  archived_at: string | null;
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

type EstimateEventRow = {
  id: string;
  estimate_id: string;
  project_id: string;
  event_type: string;
  old_snapshot: Json | string | null;
};

type NodeMutationScope = {
  projectId: string;
  estimateId: string;
  correlationId: string;
};

const RESTORE_INSERT_CHUNK_SIZE = 40;

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
    source_snapshot_json: row.source_snapshot_json === null ? null : readJson(row.source_snapshot_json, {}),
    sort_order: readNumber(row.sort_order),
    row_revision: Math.max(1, Math.trunc(readNumber(row.row_revision, 1))),
    metadata_json: readJson(row.metadata_json, {}),
    link_state: row.link_state || "unlinked",
  };
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

async function readNodeById(database: D1DatabaseLike, estimateId: string, nodeId: string) {
  const node = await firstD1Row<EstimateNodeRow>(
    database,
    `
      SELECT *
      FROM estimate_nodes
      WHERE estimate_id = ? AND id = ?
      LIMIT 1
    `,
    [estimateId, nodeId],
  );
  return node ? serializeNode(node) : null;
}

async function readTabById(database: D1DatabaseLike, estimateId: string, tabId: string) {
  return firstD1Row<EstimateTabRow>(
    database,
    `
      SELECT id, archived_at
      FROM estimate_tabs
      WHERE estimate_id = ? AND id = ?
      LIMIT 1
    `,
    [estimateId, tabId],
  );
}

function buildNodeInsert(input: {
  id: string;
  estimateId: string;
  tabId: string | null;
  parentId: string | null;
  kind: string;
  name: string;
  sortOrder: number;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
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
      input.kind,
      input.name,
      input.sortOrder,
      input.metadata,
      input.createdAt,
      input.updatedAt,
    ],
  };
}

function buildRowInsert(input: Record<string, unknown>): D1IntentStatement {
  const timestamp = nowIso();
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
      input.estimate_id,
      input.node_id,
      input.description ?? null,
      input.designation ?? null,
      input.discipline ?? null,
      input.material ?? null,
      input.supplier ?? null,
      input.supplier_id ?? null,
      readNumber(input.quantity),
      input.quantity_base === null || input.quantity_base === undefined ? null : readNumber(input.quantity_base),
      input.quantity_contingency_amount === null || input.quantity_contingency_amount === undefined
        ? null
        : readNumber(input.quantity_contingency_amount),
      input.unit ?? null,
      readNumber(input.unit_cost),
      readNumber(input.misc_cost),
      readNumber(input.contingency_percentage),
      readNumber(input.adjustment_percentage),
      input.source_snapshot_json === null || input.source_snapshot === null
        ? null
        : readJson(input.source_snapshot_json ?? input.source_snapshot, {}),
      readNumber(input.sort_order),
      Math.max(1, Math.trunc(readNumber(input.row_revision, 1))),
      input.category_node_id ?? null,
      input.source_library_item_id ?? null,
      input.link_state ?? (input.source_library_item_id ? "linked-clean" : "unlinked"),
      readJson(input.metadata_json ?? input.metadata, {}),
      input.pricing_provenance_origin ?? "missing",
      input.created_at ?? timestamp,
      input.updated_at ?? timestamp,
    ],
  };
}

function buildPackedNodeInserts(records: readonly Record<string, unknown>[]) {
  const statements: D1IntentStatement[] = [];
  for (let index = 0; index < records.length; index += RESTORE_INSERT_CHUNK_SIZE) {
    const chunk = records.slice(index, index + RESTORE_INSERT_CHUNK_SIZE);
    const singles = chunk.map((record) => buildNodeInsert({
      id: String(record.id),
      estimateId: String(record.estimate_id),
      tabId: typeof record.estimate_tab_id === "string" ? record.estimate_tab_id : null,
      parentId: typeof record.parent_id === "string" ? record.parent_id : null,
      kind: String(record.kind ?? "area"),
      name: String(record.name ?? ""),
      sortOrder: readNumber(record.sort_order),
      metadata: readJson(record.metadata_json ?? record.metadata, {}),
      createdAt: typeof record.created_at === "string" ? record.created_at : nowIso(),
      updatedAt: typeof record.updated_at === "string" ? record.updated_at : nowIso(),
    }));
    statements.push({
      sql: `
        INSERT INTO estimate_nodes (
          id, estimate_id, estimate_tab_id, parent_id, kind, name,
          sort_order, metadata_json, created_at, updated_at
        ) VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
      `,
      values: singles.flatMap((statement) => [...(statement.values ?? [])]),
    });
  }
  return statements;
}

function buildPackedRowInserts(records: readonly Record<string, unknown>[]) {
  const statements: D1IntentStatement[] = [];
  for (let index = 0; index < records.length; index += RESTORE_INSERT_CHUNK_SIZE) {
    const chunk = records.slice(index, index + RESTORE_INSERT_CHUNK_SIZE);
    const singles = chunk.map(buildRowInsert);
    statements.push({
      sql: `
        INSERT INTO estimate_row_items (
          id, estimate_id, node_id, description, designation, discipline,
          material, supplier, supplier_id, quantity, quantity_base,
          quantity_contingency_amount, unit, unit_cost, misc_cost,
          contingency_percentage, adjustment_percentage, source_snapshot_json,
          sort_order, row_revision, category_node_id, source_library_item_id,
          link_state, metadata_json, pricing_provenance_origin, created_at, updated_at
        ) VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
      `,
      values: singles.flatMap((statement) => [...(statement.values ?? [])]),
    });
  }
  return statements;
}

export async function getEstimateNodeForProject(
  database: D1DatabaseLike,
  input: { projectId: string; estimateId: string; nodeId: string },
) {
  const node = await firstD1Row<EstimateNodeRow>(
    database,
    `
      SELECT node.*
      FROM estimate_nodes node
      JOIN estimates estimate ON estimate.id = node.estimate_id
      WHERE node.id = ?
        AND node.estimate_id = ?
        AND estimate.project_id = ?
      LIMIT 1
    `,
    [input.nodeId, input.estimateId, input.projectId],
  );
  return node ? serializeNode(node) : null;
}

async function assertNodesAreNotActivelyTemplateLinked(
  database: D1DatabaseLike,
  estimateId: string,
  nodeIds: string[],
  message: string,
) {
  if (nodeIds.length === 0) return;
  const mapping = await firstD1Row<{ instance_id: string }>(
    database,
    `SELECT mapping.instance_id
     FROM estimate_template_instance_nodes AS mapping
     INNER JOIN estimate_template_instances AS instance
       ON instance.id = mapping.instance_id
      AND instance.workspace_id = mapping.workspace_id
      AND instance.estimate_id = mapping.estimate_id
     WHERE mapping.estimate_id = ?
       AND mapping.estimate_node_id IN (${placeholders(nodeIds)})
       AND instance.link_state IN ('linked', 'updating', 'failed')
     LIMIT 1`,
    [estimateId, ...nodeIds],
  );
  if (mapping) throw new Error(message);
}

export async function createEstimateNodeWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: NodeMutationScope & {
    parentNodeId: string | null;
    estimateTabId: string | null;
    kind: "group" | "area";
    name: string;
  },
) {
  const context = await requireScopedEstimate(database, actor, input);
  const parentNode = input.parentNodeId
    ? await readNodeById(database, input.estimateId, input.parentNodeId)
    : null;
  if (input.parentNodeId && !parentNode) {
    throw new Error("Parent estimate node not found in the current estimate.");
  }
  if (parentNode && !normalizeEstimateTreeNodeKind(parentNode.kind)) {
    throw new Error("Unsupported estimate node kind.");
  }
  if (parentNode) {
    await assertNodesAreNotActivelyTemplateLinked(
      database,
      input.estimateId,
      [parentNode.id],
      "This structure is owned by a linked Template. Detach the instance before adding local Areas inside it.",
    );
  }
  const estimateTabId = parentNode?.estimate_tab_id ?? input.estimateTabId;
  if (parentNode && input.estimateTabId && parentNode.estimate_tab_id !== input.estimateTabId) {
    throw new Error("Estimate tree nodes cannot be created across tabs.");
  }
  if (estimateTabId) {
    const tab = await readTabById(database, input.estimateId, estimateTabId);
    if (!tab) throw new Error("Estimate tab not found in the current estimate.");
    if (tab.archived_at) throw new Error("Estimate tree nodes cannot be created in an archived tab.");
  }
  if (!["group", "area"].includes(input.kind)) throw new Error("Estimate tree node kind is invalid.");
  const maxRow = await firstD1Row<{ max_sort_order: number | null }>(
    database,
    `
      SELECT MAX(sort_order) AS max_sort_order
      FROM estimate_nodes
      WHERE estimate_id = ?
        AND estimate_tab_id IS ?
        AND parent_id IS ?
    `,
    [input.estimateId, estimateTabId, input.parentNodeId],
  );
  const nodeId = randomUUID();
  const timestamp = nowIso();
  const insert = buildNodeInsert({
    id: nodeId,
    estimateId: input.estimateId,
    tabId: estimateTabId,
    parentId: input.parentNodeId,
    kind: input.kind,
    name: input.name || "Untitled",
    sortOrder: readNumber(maxRow?.max_sort_order, -1000) + 1000,
    metadata: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const activationStatements: D1PreparedStatementLike[] = [];
  if (input.kind === "area") {
    const activationIntent = validateActivationProducerIntent({
      domainMutationId: nodeId,
      estimateId: input.estimateId,
      milestone: "first_area_created",
      occurredAt: timestamp,
      projectId: input.projectId,
      source: "estimate",
      userId: actor.userId,
      workspaceId: context.workspaceId,
    });
    if (activationIntent.status !== "accepted") throw new Error("Activation area intent is invalid.");
    activationStatements.push(prepareActivationOutboxIntent(database, {
      domainMutationId: nodeId,
      dedupeKey: activationIntent.dedupeKey,
      estimateId: input.estimateId,
      milestone: "first_area_created",
      occurredAt: timestamp,
      projectId: input.projectId,
      source: "estimate",
      userId: actor.userId,
      workspaceId: context.workspaceId,
    }));
  }
  const eventId = await runMutationWithHistory(database, [
    insert,
    buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId),
  ], {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateNodeId: nodeId,
    estimateTabId,
    eventType: "estimate_node_created",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    payload: { nodeId, name: input.name, kind: input.kind, parentNodeId: input.parentNodeId, estimateTabId },
  }, activationStatements);
  return { nodeId, eventId, payload: { nodeId } };
}

export async function renameEstimateNodeWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: NodeMutationScope & { nodeId: string; name: string },
) {
  const context = await requireScopedEstimate(database, actor, input);
  const node = await readNodeById(database, input.estimateId, input.nodeId);
  if (!node) throw new Error("Estimate tree node not found in the current project.");
  await assertNodesAreNotActivelyTemplateLinked(
    database,
    input.estimateId,
    [input.nodeId],
    "This Area is owned by a linked Template. Rename it in the Template or detach the instance first.",
  );
  const name = input.name.trim();
  if (!name) throw new Error("Estimate tree node name is required.");
  if (name === node.name) return { nodeId: input.nodeId };
  const updatedAt = nowIso();
  await runMutationWithHistory(database, [{
    sql: "UPDATE estimate_nodes SET name = ?, updated_at = ? WHERE id = ? AND estimate_id = ? AND updated_at = ?",
    values: [name, updatedAt, input.nodeId, input.estimateId, node.updated_at ?? null],
  }, buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId)], {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateNodeId: input.nodeId,
    estimateTabId: node.estimate_tab_id,
    eventType: "estimate_node_renamed",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    changedFields: ["name"],
    oldSnapshot: node,
    newSnapshot: { name },
    payload: { nodeId: input.nodeId, name },
  });
  return { nodeId: input.nodeId };
}

export async function reorderEstimateNodesWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: NodeMutationScope & { updates: Array<{ id: string; parentId: string | null; sortOrder: number }> },
) {
  const context = await requireScopedEstimate(database, actor, input);
  if (input.updates.length === 0) throw new Error("At least one estimate tree node update is required.");
  const updateIds = new Set<string>();
  for (const update of input.updates) {
    if (updateIds.has(update.id)) throw new Error(`Duplicate estimate tree node update: ${update.id}.`);
    updateIds.add(update.id);
    if (!Number.isFinite(update.sortOrder) || update.sortOrder < 0) {
      throw new Error("Estimate tree node sort order must be a non-negative number.");
    }
  }
  const currentNodes = await allD1Rows<Pick<EstimateNodeRow, "id" | "estimate_id" | "estimate_tab_id" | "parent_id" | "sort_order">>(
    database,
    "SELECT id, estimate_id, estimate_tab_id, parent_id, sort_order FROM estimate_nodes WHERE estimate_id = ?",
    [input.estimateId],
  );
  const validation = validateProjectedEstimateTreeReorder({
    estimateId: input.estimateId,
    nodes: currentNodes.map((node) => ({
      id: node.id,
      estimateId: node.estimate_id,
      parentId: node.parent_id,
      tabId: node.estimate_tab_id,
    })),
    updates: input.updates.map((update) => ({ id: update.id, parentId: update.parentId })),
  });
  if (!validation.ok) throw new Error(validation.message);
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  const changedUpdates = input.updates.filter((update) => {
    const current = currentById.get(update.id)!;
    return current.parent_id !== update.parentId || readNumber(current.sort_order) !== update.sortOrder;
  });
  if (changedUpdates.length === 0) return { updatedNodeCount: 0 };
  await assertNodesAreNotActivelyTemplateLinked(
    database,
    input.estimateId,
    [...new Set(changedUpdates.flatMap((update) => [update.id, ...(update.parentId ? [update.parentId] : [])]))],
    "Linked Template structure cannot be moved locally. Detach the instance before changing its placement.",
  );
  const affectedTabIds = [...new Set(changedUpdates.flatMap((update) => {
    const nodeTabId = currentById.get(update.id)?.estimate_tab_id;
    const parentTabId = update.parentId ? currentById.get(update.parentId)?.estimate_tab_id : nodeTabId;
    return [nodeTabId, parentTabId].filter((tabId): tabId is string => Boolean(tabId));
  }))];
  if (affectedTabIds.length > 0) {
    const activeTabs = await allD1Rows<EstimateTabRow>(
      database,
      `SELECT id, archived_at FROM estimate_tabs WHERE estimate_id = ? AND id IN (${placeholders(affectedTabIds)})`,
      [input.estimateId, ...affectedTabIds],
    );
    if (activeTabs.length !== affectedTabIds.length || activeTabs.some((tab) => tab.archived_at !== null)) {
      throw new Error("Estimate tree nodes cannot be reordered in an archived or missing tab.");
    }
  }
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: context.workspaceId,
    eventType: "estimate_nodes_reordered",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    changedFields: ["parent_id", "sort_order"],
    payload: {
      updates: changedUpdates.map((update) => ({
        id: update.id,
        parent_id: update.parentId,
        sort_order: update.sortOrder,
      })),
    },
  });
  const currentStateClauses = changedUpdates.map(() => "(id = ? AND parent_id IS ? AND sort_order = ?)").join(" OR ");
  const updatedAt = nowIso();
  const statements: D1IntentStatement[] = [{
    sql: `
      SELECT CASE WHEN (
        SELECT COUNT(*) FROM estimate_nodes
        WHERE estimate_id = ? AND (${currentStateClauses})
      ) = ? THEN 1 ELSE json('') END AS estimate_node_reorder_guard
    `,
    values: [
      input.estimateId,
      ...changedUpdates.flatMap((update) => {
        const current = currentById.get(update.id)!;
        return [update.id, current.parent_id, readNumber(current.sort_order)];
      }),
      changedUpdates.length,
    ],
  }, ...changedUpdates.map((update) => ({
    sql: "UPDATE estimate_nodes SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ? AND estimate_id = ?",
    values: [update.parentId, update.sortOrder, updatedAt, update.id, input.estimateId],
  })), buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId)];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  assertD1MutationStatementLimit(statements.length);
  await runD1Batch(database, statements);
  return { updatedNodeCount: changedUpdates.length };
}

export async function resolveEstimateActivityNodeScope(
  database: D1DatabaseLike,
  input: { projectId: string; estimateId: string; nodeId: string; includeDescendants: boolean },
): Promise<{ nodeIds: string[]; rowIds: string[] }> {
  const node = await getEstimateNodeForProject(database, input);
  if (!node) throw new Error("Estimate activity node not found in the current estimate.");
  if (!input.includeDescendants) return { nodeIds: [input.nodeId], rowIds: [] };

  const nodes = await allD1Rows<Pick<EstimateNodeRow, "id" | "parent_id">>(
    database,
    "SELECT id, parent_id FROM estimate_nodes WHERE estimate_id = ?",
    [input.estimateId],
  );
  const childrenByParent = new Map<string | null, string[]>();
  for (const candidate of nodes) {
    const children = childrenByParent.get(candidate.parent_id) ?? [];
    children.push(candidate.id);
    childrenByParent.set(candidate.parent_id, children);
  }
  const nodeIds: string[] = [];
  const queue = [input.nodeId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    nodeIds.push(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }
  const rows = nodeIds.length > 0
    ? await allD1Rows<{ id: string }>(
        database,
        `SELECT id FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(nodeIds)})`,
        [input.estimateId, ...nodeIds],
      )
    : [];
  return { nodeIds, rowIds: rows.map((row) => row.id) };
}

export async function readEstimateNodesForDuplication(
  database: D1DatabaseLike,
  input: { estimateId: string; tabIds: readonly string[] },
) {
  const rows = await allD1Rows<EstimateNodeRow>(
    database,
    `
      SELECT *
      FROM estimate_nodes
      WHERE estimate_id = ?
        ${input.tabIds.length > 0 ? `AND estimate_tab_id IN (${placeholders(input.tabIds)})` : ""}
      ORDER BY sort_order ASC, id ASC
    `,
    [input.estimateId, ...input.tabIds],
  );
  return rows.map(serializeNode);
}

export async function insertEstimateNodesForDuplication(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: {
    projectId: string;
    estimateId: string;
    nodes: readonly EstimateNodeRow[];
    tabIdBySourceId: ReadonlyMap<string, string>;
    fallbackTabId: string;
  },
) {
  await requireScopedEstimate(database, actor, input);
  const nodeIdBySourceId = new Map<string, string>();
  const pending = [...input.nodes];
  while (pending.length > 0) {
    const nextIndex = pending.findIndex((node) => node.parent_id === null || nodeIdBySourceId.has(node.parent_id));
    if (nextIndex === -1) throw new Error("Could not duplicate estimate tree because the source hierarchy is invalid.");
    const [node] = pending.splice(nextIndex, 1);
    const id = randomUUID();
    nodeIdBySourceId.set(node.id, id);
    const timestamp = nowIso();
    const statement = buildNodeInsert({
      id,
      estimateId: input.estimateId,
      tabId: (node.estimate_tab_id ? input.tabIdBySourceId.get(node.estimate_tab_id) : undefined) ?? input.fallbackTabId,
      parentId: node.parent_id ? nodeIdBySourceId.get(node.parent_id) ?? null : null,
      kind: node.kind,
      name: node.name,
      sortOrder: readNumber(node.sort_order),
      metadata: readJson(node.metadata_json, {}),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await runD1Statement(database, statement.sql, statement.values);
  }
  return { nodeIdBySourceId };
}

async function collectDescendantNodeIds(
  database: D1DatabaseLike,
  estimateId: string,
  rootIds: readonly string[],
) {
  const nodes = await allD1Rows<Pick<EstimateNodeRow, "id" | "parent_id">>(
    database,
    "SELECT id, parent_id FROM estimate_nodes WHERE estimate_id = ?",
    [estimateId],
  );
  const childrenByParent = new Map<string | null, string[]>();
  for (const node of nodes) {
    const children = childrenByParent.get(node.parent_id) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parent_id, children);
  }
  const result: string[] = [];
  const queue = [...rootIds];
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

export async function deleteEstimateNodesWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: NodeMutationScope & { nodeIds: string[] },
) {
  const context = await requireScopedEstimate(database, actor, input);
  const rootIds = [...new Set(input.nodeIds.map((id) => id.trim()).filter(Boolean))];
  if (rootIds.length === 0) throw new Error("At least one estimate tree node is required for delete.");
  const rootNodes = await allD1Rows<Pick<EstimateNodeRow, "id" | "estimate_tab_id">>(
    database,
    `SELECT id, estimate_tab_id FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(rootIds)})`,
    [input.estimateId, ...rootIds],
  );
  const rootNodeIds = new Set(rootNodes.map((node) => node.id));
  const missingRootId = rootIds.find((rootId) => !rootNodeIds.has(rootId));
  if (missingRootId) throw new Error(`Estimate tree node not found in the current estimate: ${missingRootId}.`);
  const rootTabIds = new Set(rootNodes.map((node) => node.estimate_tab_id));
  if (rootTabIds.size !== 1) throw new Error("Estimate tree nodes cannot be deleted across tabs in one action.");
  const rootTabId = rootNodes[0]?.estimate_tab_id ?? null;
  const deletedNodeIds = await collectDescendantNodeIds(database, input.estimateId, rootIds);
  await assertNodesAreNotActivelyTemplateLinked(
    database,
    input.estimateId,
    deletedNodeIds,
    "Linked Template structure cannot be deleted locally. Delete the whole instance or detach it first.",
  );
  const deletedNodes = deletedNodeIds.length > 0
    ? await allD1Rows<EstimateNodeRow>(
        database,
        `SELECT * FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(deletedNodeIds)})`,
        [input.estimateId, ...deletedNodeIds],
      )
    : [];
  const deletedRows = deletedNodeIds.length > 0
    ? await allD1Rows<EstimateRowItemRow>(
        database,
        `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(deletedNodeIds)})`,
        [input.estimateId, ...deletedNodeIds],
      )
    : [];
  const remainingNodes = await allD1Rows<Pick<EstimateNodeRow, "id" | "sort_order">>(
    database,
    "SELECT id, sort_order FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id IS ? ORDER BY sort_order ASC, id ASC",
    [input.estimateId, rootTabId],
  );
  const deletedNodeIdSet = new Set(deletedNodeIds);
  const fallbackNodeId = remainingNodes.find((node) => !deletedNodeIdSet.has(node.id))?.id ?? null;
  const deletedAt = nowIso();
  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: context.workspaceId,
    estimateNodeId: rootIds[0] ?? null,
    eventType: rootIds.length > 1 ? "estimate_nodes_deleted" : "estimate_node_deleted",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    oldSnapshot: {
      nodeIds: deletedNodeIds,
      nodes: deletedNodes.map(serializeNode),
      rows: deletedRows.map(serializeRow),
    },
    payload: {
      deletedNodeIds,
      deletedNodeCount: deletedNodeIds.length,
      deletedRowCount: deletedRows.length,
      fallbackNodeId,
    },
  });
  const statements: D1IntentStatement[] = [{
    sql: `
      WITH RECURSIVE subtree(id) AS (
        SELECT id FROM estimate_nodes
        WHERE estimate_id = ? AND id IN (${placeholders(rootIds)})
        UNION
        SELECT node.id FROM estimate_nodes node
        JOIN subtree parent ON node.parent_id = parent.id
        WHERE node.estimate_id = ?
      )
      SELECT CASE WHEN
        (SELECT COUNT(*) FROM subtree) = ?
        AND (SELECT COUNT(*) FROM subtree WHERE id IN (${placeholders(deletedNodeIds)})) = ?
      THEN 1 ELSE json('') END AS estimate_node_delete_topology_guard
    `,
    values: [
      input.estimateId,
      ...rootIds,
      input.estimateId,
      deletedNodeIds.length,
      ...deletedNodeIds,
      deletedNodeIds.length,
    ],
  }, ...buildProjectComponentAttachmentDeleteRetentionStatements({
    workspaceId: context.workspaceId,
    projectId: input.projectId,
    sourceDeleteEventId: history.eventId,
    deletedRows,
    deletedAt,
  })];
  if (deletedNodeIds.length > 0) {
    statements.push(
      {
        sql: `DELETE FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(deletedNodeIds)})`,
        values: [input.estimateId, ...deletedNodeIds],
      },
      {
        sql: `DELETE FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(deletedNodeIds)})`,
        values: [input.estimateId, ...deletedNodeIds],
      },
    );
  }
  statements.push(buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId));
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  assertD1MutationStatementLimit(statements.length);
  await runD1Batch(database, statements);
  const payload = {
    deletedNodeIds,
    deletedNodeCount: deletedNodeIds.length,
    deletedRowCount: deletedRows.length,
    fallbackNodeId,
  };
  return { eventId: history.eventId, ...payload, payload };
}

function validateRestoreTopology(nodes: EstimateNodeRow[], rows: EstimateRowItemRow[]) {
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

export async function restoreDeletedEstimateNodesWithHistory(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: NodeMutationScope & { sourceEventId: string; nodeIds?: string[] },
) {
  const context = await requireScopedEstimate(database, actor, input);
  const sourceEvent = await firstD1Row<EstimateEventRow>(
    database,
    `
      SELECT id, estimate_id, project_id, event_type, old_snapshot
      FROM estimate_sheet_events
      WHERE id = ? AND estimate_id = ? AND project_id = ?
      LIMIT 1
    `,
    [input.sourceEventId, input.estimateId, input.projectId],
  );
  if (!sourceEvent || !["estimate_node_deleted", "estimate_nodes_deleted"].includes(sourceEvent.event_type)) {
    throw new Error("Deleted node history snapshot was not found in the current estimate.");
  }
  const snapshot = readJsonRecord(sourceEvent.old_snapshot);
  const snapshotNodes = Array.isArray(snapshot.nodes)
    ? snapshot.nodes.map(readJsonRecord).filter((node) => typeof node.id === "string" && node.estimate_id === input.estimateId)
    : [];
  const snapshotRows = Array.isArray(snapshot.rows)
    ? snapshot.rows.map(readJsonRecord).filter((row) => typeof row.id === "string" && row.estimate_id === input.estimateId)
    : [];
  if (snapshotNodes.length === 0) throw new Error("Deleted node history snapshot does not contain restorable nodes.");

  const snapshotNodeIds = new Set(snapshotNodes.map((node) => String(node.id)));
  const requestedRootIds = [...new Set((input.nodeIds ?? []).map((id) => id.trim()).filter(Boolean))];
  const unknownRequestedRootId = requestedRootIds.find((id) => !snapshotNodeIds.has(id));
  if (unknownRequestedRootId) {
    throw new Error(`Deleted node history does not contain requested node: ${unknownRequestedRootId}.`);
  }
  const restoredRootNodeIds = requestedRootIds.length > 0
    ? requestedRootIds
    : snapshotNodes
        .filter((node) => typeof node.parent_id !== "string" || !snapshotNodeIds.has(node.parent_id))
        .map((node) => String(node.id));
  const restoredNodeIdSet = new Set<string>();
  const nodesById = new Map(snapshotNodes.map((node) => [String(node.id), node]));
  const nodesToRestore: Record<string, unknown>[] = [];
  const pendingIds = [...restoredRootNodeIds];
  while (pendingIds.length > 0) {
    const nodeId = pendingIds.shift();
    if (!nodeId || restoredNodeIdSet.has(nodeId)) continue;
    const node = nodesById.get(nodeId);
    if (!node) continue;
    restoredNodeIdSet.add(nodeId);
    nodesToRestore.push(node);
    for (const child of snapshotNodes) {
      if (child.parent_id === nodeId) pendingIds.push(String(child.id));
    }
  }
  const rowsToRestore = snapshotRows.filter((row) => restoredNodeIdSet.has(String(row.node_id ?? "")));
  const restoredNodeIds = nodesToRestore.map((node) => String(node.id));
  const restoredRowIds = rowsToRestore.map((row) => String(row.id));
  validateRestoreTopology(
    nodesToRestore.map((node) => ({
      id: String(node.id),
      estimate_id: input.estimateId,
      estimate_tab_id: typeof node.estimate_tab_id === "string" ? node.estimate_tab_id : null,
      parent_id: typeof node.parent_id === "string" && restoredNodeIdSet.has(node.parent_id) ? node.parent_id : null,
      kind: String(node.kind ?? "area"),
      name: String(node.name ?? ""),
      sort_order: readNumber(node.sort_order),
      metadata_json: readJson(node.metadata_json ?? node.metadata, {}),
      created_at: String(node.created_at ?? ""),
      updated_at: String(node.updated_at ?? ""),
    })),
    rowsToRestore.map((row) => ({
      id: String(row.id),
      estimate_id: input.estimateId,
      node_id: typeof row.node_id === "string" ? row.node_id : null,
      description: null,
      designation: null,
      discipline: null,
      material: null,
      supplier: null,
      supplier_id: null,
      quantity: 0,
      quantity_base: null,
      quantity_contingency_amount: null,
      unit: null,
      unit_cost: 0,
      misc_cost: 0,
      contingency_percentage: 0,
      adjustment_percentage: 0,
      source_snapshot_json: null,
      sort_order: readNumber(row.sort_order),
      row_revision: 1,
      category_node_id: null,
      source_library_item_id: null,
      link_state: "unlinked",
      metadata_json: {},
      pricing_provenance_origin: "missing",
      created_at: "",
      updated_at: "",
    })),
  );

  const collidingNodes = await allD1Rows<{ id: string }>(
    database,
    `SELECT id FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(restoredNodeIds)})`,
    [input.estimateId, ...restoredNodeIds],
  );
  if (collidingNodes.length > 0) throw new Error("One or more estimate nodes to restore already exist.");
  const collidingRows = restoredRowIds.length > 0
    ? await allD1Rows<{ id: string }>(
        database,
        `SELECT id FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)})`,
        [input.estimateId, ...restoredRowIds],
      )
    : [];
  if (collidingRows.length > 0) throw new Error("One or more estimate rows to restore already exist.");

  const existingNodes = await allD1Rows<Pick<EstimateNodeRow, "id" | "estimate_tab_id" | "parent_id" | "sort_order">>(
    database,
    "SELECT id, estimate_tab_id, parent_id, sort_order FROM estimate_nodes WHERE estimate_id = ?",
    [input.estimateId],
  );
  const existingNodesById = new Map(existingNodes.map((node) => [node.id, node]));
  const restoredNodesById = new Map(nodesToRestore.map((node) => [String(node.id), node]));
  const restoreTabIds = [...new Set(nodesToRestore.flatMap((node) => (
    typeof node.estimate_tab_id === "string" && node.estimate_tab_id ? [node.estimate_tab_id] : []
  )))];
  if (restoreTabIds.length > 0) {
    const activeTabs = await allD1Rows<EstimateTabRow>(
      database,
      `SELECT id, archived_at FROM estimate_tabs WHERE estimate_id = ? AND id IN (${placeholders(restoreTabIds)})`,
      [input.estimateId, ...restoreTabIds],
    );
    if (activeTabs.length !== restoreTabIds.length || activeTabs.some((tab) => tab.archived_at !== null)) {
      throw new Error("Deleted estimate nodes cannot be restored into an archived or missing tab.");
    }
  }
  for (const node of nodesToRestore) {
    const nodeId = String(node.id);
    const nodeTabId = typeof node.estimate_tab_id === "string" ? node.estimate_tab_id : null;
    const parentId = typeof node.parent_id === "string" && node.parent_id ? node.parent_id : null;
    const parentNode = parentId ? restoredNodesById.get(parentId) ?? existingNodesById.get(parentId) : null;
    if (parentId && !parentNode) throw new Error(`Deleted estimate node parent is no longer available: ${nodeId}.`);
    const parentTabId = parentNode && typeof parentNode.estimate_tab_id === "string"
      ? parentNode.estimate_tab_id
      : null;
    if (parentNode && parentTabId !== nodeTabId) throw new Error("Deleted estimate nodes cannot be restored across tabs.");
    const sortCollision = existingNodes.some((existingNode) => (
      (existingNode.estimate_tab_id ?? null) === nodeTabId
      && existingNode.parent_id === parentId
      && readNumber(existingNode.sort_order) === readNumber(node.sort_order)
    ));
    if (sortCollision) throw new Error(`Estimate tree restore sort position is already occupied: ${nodeId}.`);
  }

  const history = await prepareHistoryEventInsert(database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: context.workspaceId,
    estimateNodeId: restoredRootNodeIds[0] ?? null,
    eventType: "estimate_nodes_restored",
    actorUserId: actor.userId,
    correlationId: input.correlationId || randomUUID(),
    newSnapshot: { nodes: nodesToRestore, rows: rowsToRestore },
    payload: {
      sourceEventId: input.sourceEventId,
      restoredNodeIds,
      restoredRootNodeIds,
      restoredNodeCount: restoredNodeIds.length,
      restoredRowIds,
      restoredRowCount: restoredRowIds.length,
    },
  });
  const restoredAt = nowIso();
  const attachmentRetention = buildProjectComponentAttachmentRestoreRetentionStatements({
    projectId: input.projectId,
    sourceDeleteEventId: input.sourceEventId,
    restoredRows: rowsToRestore,
    restoredAt,
  });
  const collisionGuard: D1IntentStatement = {
    sql: `
      SELECT CASE WHEN
        (SELECT COUNT(*) FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(restoredNodeIds)})) = 0
        ${restoredRowIds.length > 0
          ? `AND (SELECT COUNT(*) FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)})) = 0`
          : ""}
      THEN 1 ELSE json('') END AS estimate_node_restore_collision_guard
    `,
    values: [
      input.estimateId,
      ...restoredNodeIds,
      ...(restoredRowIds.length > 0 ? [input.estimateId, ...restoredRowIds] : []),
    ],
  };
  const restoreGuards: D1IntentStatement[] = [collisionGuard];
  if (restoreTabIds.length > 0) {
    restoreGuards.push({
      sql: `
        SELECT CASE WHEN (
          SELECT COUNT(*) FROM estimate_tabs
          WHERE estimate_id = ? AND archived_at IS NULL
            AND id IN (${placeholders(restoreTabIds)})
        ) = ? THEN 1 ELSE json('') END AS estimate_node_restore_tab_guard
      `,
      values: [input.estimateId, ...restoreTabIds, restoreTabIds.length],
    });
  }
  const externalParents = [...new Map(nodesToRestore.flatMap((node) => {
    const parentId = typeof node.parent_id === "string" && node.parent_id ? node.parent_id : null;
    if (!parentId || restoredNodeIdSet.has(parentId)) return [];
    const tabId = typeof node.estimate_tab_id === "string" ? node.estimate_tab_id : null;
    return [[`${parentId}:${tabId ?? "legacy"}`, { parentId, tabId }] as const];
  })).values()];
  if (externalParents.length > 0) {
    const clauses = externalParents.map(() => "(id = ? AND estimate_tab_id IS ?)").join(" OR ");
    restoreGuards.push({
      sql: `
        SELECT CASE WHEN (
          SELECT COUNT(*) FROM estimate_nodes
          WHERE estimate_id = ? AND (${clauses})
        ) = ? THEN 1 ELSE json('') END AS estimate_node_restore_parent_guard
      `,
      values: [
        input.estimateId,
        ...externalParents.flatMap((parent) => [parent.parentId, parent.tabId]),
        externalParents.length,
      ],
    });
  }
  const sortClauses = nodesToRestore.map(() => "(estimate_tab_id IS ? AND parent_id IS ? AND sort_order = ?)").join(" OR ");
  restoreGuards.push({
    sql: `
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM estimate_nodes
        WHERE estimate_id = ? AND (${sortClauses})
      ) THEN 1 ELSE json('') END AS estimate_node_restore_sort_guard
    `,
    values: [
      input.estimateId,
      ...nodesToRestore.flatMap((node) => [
        typeof node.estimate_tab_id === "string" ? node.estimate_tab_id : null,
        typeof node.parent_id === "string" && node.parent_id ? node.parent_id : null,
        readNumber(node.sort_order),
      ]),
    ],
  });
  const statements: D1IntentStatement[] = [
    ...restoreGuards,
    ...attachmentRetention.guardStatements,
    ...buildPackedNodeInserts(nodesToRestore),
    ...buildPackedRowInserts(rowsToRestore),
    ...attachmentRetention.releaseStatements,
    buildProjectPublicationRevisionForEstimate(input.projectId, context.workspaceId, input.estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  assertD1MutationStatementLimit(statements.length);
  await runD1Batch(database, statements);
  return {
    eventId: history.eventId,
    sourceEventId: input.sourceEventId,
    restoredNodeIds,
    restoredRootNodeIds,
    restoredNodeCount: restoredNodeIds.length,
    restoredRowIds,
    restoredRowCount: restoredRowIds.length,
  };
}
