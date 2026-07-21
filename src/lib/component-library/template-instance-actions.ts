"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { canAccessEstimateInD1, canEditEstimateStrictInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { insertEstimateTemplateIntoEstimateWithHistory } from "@/lib/estimates/d1-intents/templates";
import { prepareHistoryEventInsert } from "@/lib/estimates/d1-intents/history-events";
import { buildProjectPublicationRevisionForEstimate } from "@/lib/estimates/d1-intents/intent-context";
import { runD1Batch, type D1IntentStatement } from "@/lib/estimates/d1-intents/database";
import {
  buildCommittedMutationReceiptStatement,
  createMutationRequestFingerprint,
  readCommittedMutationReceipt,
} from "@/lib/estimates/mutation-receipts";
import { isUuid } from "@/lib/ids";
import { reconcileTemplatePropagationJobs } from "./template-propagation-d1";

type InstanceActionRow = {
  id: string;
  workspace_id: string;
  template_id: string;
  template_name: string;
  project_id: string;
  project_name: string;
  estimate_id: string;
  estimate_name: string;
  estimate_tab_id: string;
  target_parent_node_id: string | null;
  link_state: "linked" | "updating" | "failed";
  applied_version_number: number | string;
  target_version_number: number | string;
  failure_class: string | null;
  retryable: boolean | number | string | null;
};

type TemplateInstanceStatusRow = {
  id: string;
  link_state: "linked" | "updating" | "failed";
  applied_version_number: number | string;
  target_version_number: number | string;
};

async function requireDatabase() {
  const database = await getCloudflareD1Database();
  if (!database?.batch) throw new Error("Something went wrong. Try again in a moment.");
  return database;
}

async function first<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  return database.prepare<T>(sql).bind(...values).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: D1Value[]) {
  const result = await database.prepare<T>(sql).bind(...values).all<T>();
  if (result.success === false) throw new Error("Could not read linked Template instance content.");
  return result.results ?? [];
}

async function readInstance(database: D1DatabaseLike, instanceId: string) {
  if (!isUuid(instanceId)) throw new Error("Linked Template instance not found.");
  const instance = await first<InstanceActionRow>(
    database,
    `SELECT instance.id, instance.workspace_id, instance.template_id,
            template.name AS template_name, instance.project_id,
            project.name AS project_name, instance.estimate_id,
            estimate.name AS estimate_name, instance.estimate_tab_id,
            instance.target_parent_node_id, instance.link_state,
            instance.applied_version_number, instance.target_version_number,
            job.failure_class, job.retryable
     FROM estimate_template_instances AS instance
     INNER JOIN estimate_templates AS template
       ON template.id = instance.template_id AND template.workspace_id = instance.workspace_id
     INNER JOIN projects AS project
       ON project.id = instance.project_id AND project.workspace_id = instance.workspace_id
     INNER JOIN estimates AS estimate
       ON estimate.id = instance.estimate_id AND estimate.project_id = instance.project_id
     LEFT JOIN estimate_template_propagation_jobs AS job ON job.instance_id = instance.id
     WHERE instance.id = ? AND instance.link_state IN ('linked', 'updating', 'failed')
     LIMIT 1`,
    [instanceId],
  );
  if (!instance) throw new Error("Linked Template instance not found.");
  return instance;
}

async function authorizeInstance(database: D1DatabaseLike, instanceId: string) {
  const [instance, currentUser] = await Promise.all([
    readInstance(database, instanceId),
    requireCurrentUserContext(),
  ]);
  if (!await canEditEstimateStrictInD1(database, instance.estimate_id, currentUser)) {
    throw new Error("Estimate edit access denied.");
  }
  return { instance, currentUser };
}

async function readRootIds(database: D1DatabaseLike, instance: InstanceActionRow) {
  const result = await database.prepare<{ estimate_node_id: string }>(
    `SELECT mapping.estimate_node_id
     FROM estimate_template_instance_nodes AS mapping
     INNER JOIN estimate_nodes AS node
       ON node.id = mapping.estimate_node_id AND node.estimate_id = mapping.estimate_id
     WHERE mapping.instance_id = ? AND mapping.workspace_id = ?
       AND node.parent_id IS ?
     ORDER BY node.sort_order ASC, mapping.template_node_id ASC`,
  ).bind(instance.id, instance.workspace_id, instance.target_parent_node_id).all<{ estimate_node_id: string }>();
  if (result.success === false) throw new Error("Could not read linked Template roots.");
  return (result.results ?? []).map((row) => row.estimate_node_id);
}

function revalidateInstanceSurfaces(instance: InstanceActionRow) {
  revalidatePath(`/workshop/projects/${instance.project_id}/estimates/${instance.estimate_id}`);
  revalidatePath("/workshop/library/templates");
}

export async function previewEstimateTemplateInstanceAction(input: { instanceId: string }) {
  const database = await requireDatabase();
  const { instance } = await authorizeInstance(database, input.instanceId);
  const rootIds = await readRootIds(database, instance);
  return {
    instanceId: instance.id,
    templateId: instance.template_id,
    templateName: instance.template_name,
    projectName: instance.project_name,
    estimateName: instance.estimate_name,
    rootCount: rootIds.length,
    linkState: instance.link_state,
    appliedVersionNumber: Number(instance.applied_version_number),
    targetVersionNumber: Number(instance.target_version_number),
    failureClass: instance.failure_class,
    retryable: Number(instance.retryable) === 1,
  };
}

export async function readEstimateTemplateInstanceStatuses(input: {
  estimateId: string;
  instanceIds: string[];
}) {
  if (!isUuid(input.estimateId)) throw new Error("Estimate not found.");
  const instanceIds = [...new Set(input.instanceIds.filter(isUuid))].slice(0, 250);
  if (instanceIds.length === 0) return [];
  const [database, currentUser] = await Promise.all([requireDatabase(), requireCurrentUserContext()]);
  if (!await canAccessEstimateInD1(database, input.estimateId, currentUser)) {
    throw new Error("Estimate access denied.");
  }
  const rows = await all<TemplateInstanceStatusRow>(
    database,
    `SELECT id, link_state, applied_version_number, target_version_number
     FROM estimate_template_instances
     WHERE estimate_id = ?
       AND id IN (${instanceIds.map(() => "?").join(", ")})
       AND link_state IN ('linked', 'updating', 'failed')`,
    [input.estimateId, ...instanceIds],
  );
  return rows.map((row) => ({
    instanceId: row.id,
    linkState: row.link_state,
    appliedVersionNumber: Number(row.applied_version_number),
    targetVersionNumber: Number(row.target_version_number),
  }));
}

export async function detachEstimateTemplateInstance(input: {
  instanceId: string;
  expectedAppliedVersionNumber: number;
  expectedTargetVersionNumber: number;
}) {
  const database = await requireDatabase();
  const { instance, currentUser } = await authorizeInstance(database, input.instanceId);
  const appliedVersionNumber = Number(instance.applied_version_number);
  const targetVersionNumber = Number(instance.target_version_number);
  if (
    appliedVersionNumber !== input.expectedAppliedVersionNumber
    || targetVersionNumber !== input.expectedTargetVersionNumber
  ) {
    throw new Error("This linked Template instance changed. Review the latest version status and confirm again.");
  }
  const rootIds = await readRootIds(database, instance);
  const timestamp = new Date().toISOString();
  const history = await prepareHistoryEventInsert(database, {
    workspaceId: instance.workspace_id,
    projectId: instance.project_id,
    estimateId: instance.estimate_id,
    estimateTabId: instance.estimate_tab_id,
    estimateNodeId: rootIds[0] ?? instance.target_parent_node_id,
    eventType: "linked_template_instance_detached",
    correlationId: `template-instance-detach:${instance.id}:${randomUUID()}`,
    actorUserId: currentUser.userId,
    payload: {
      instanceId: instance.id,
      templateId: instance.template_id,
      templateName: instance.template_name,
      appliedVersionNumber,
      abandonedTargetVersionNumber: targetVersionNumber,
      rootIds,
    },
  });
  const statements: D1IntentStatement[] = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_template_instances
        WHERE id = ? AND workspace_id = ? AND template_id = ?
          AND estimate_id = ? AND link_state IN ('linked', 'updating', 'failed')
          AND applied_version_number = ? AND target_version_number = ?
      ) THEN 1 ELSE json('') END AS template_instance_detach_guard`,
      values: [instance.id, instance.workspace_id, instance.template_id, instance.estimate_id, appliedVersionNumber, targetVersionNumber],
    },
    { sql: "DELETE FROM estimate_template_propagation_jobs WHERE instance_id = ?", values: [instance.id] },
    { sql: "DELETE FROM estimate_template_instance_rows WHERE instance_id = ? AND workspace_id = ?", values: [instance.id, instance.workspace_id] },
    { sql: "DELETE FROM estimate_template_instance_nodes WHERE instance_id = ? AND workspace_id = ?", values: [instance.id, instance.workspace_id] },
    {
      sql: `UPDATE estimate_template_instances
            SET template_id = NULL, link_state = 'detached', last_error_code = NULL,
                detached_at = ?, detached_by = ?, detached_root_ids_json = ?, updated_at = ?
            WHERE id = ? AND workspace_id = ? AND template_id = ?
              AND applied_version_number = ? AND target_version_number = ?`,
      values: [timestamp, currentUser.userId, JSON.stringify(rootIds), timestamp, instance.id, instance.workspace_id, instance.template_id, appliedVersionNumber, targetVersionNumber],
    },
    buildProjectPublicationRevisionForEstimate(instance.project_id, instance.workspace_id, instance.estimate_id),
    ...(history.statement && history.outboxStatement ? [history.statement, history.outboxStatement] : []),
  ];
  await runD1Batch(database, statements);
  try {
    await reconcileTemplatePropagationJobs(database, { limit: 25 });
  } catch (error) {
    console.warn("[template-links] Immediate retry drain failed; scheduled recovery remains active.", error);
  }
  revalidateInstanceSurfaces(instance);
  return { instanceId: instance.id, rootIds, appliedVersionNumber, abandonedTargetVersionNumber: targetVersionNumber };
}

export async function retryEstimateTemplateInstance(input: { instanceId: string }) {
  const database = await requireDatabase();
  const { instance, currentUser } = await authorizeInstance(database, input.instanceId);
  const timestamp = new Date().toISOString();
  const history = await prepareHistoryEventInsert(database, {
    workspaceId: instance.workspace_id,
    projectId: instance.project_id,
    estimateId: instance.estimate_id,
    estimateTabId: instance.estimate_tab_id,
    estimateNodeId: instance.target_parent_node_id,
    eventType: "linked_template_instance_retry_requested",
    correlationId: `template-instance-retry:${instance.id}:${randomUUID()}`,
    actorUserId: currentUser.userId,
    payload: { instanceId: instance.id, templateId: instance.template_id, targetVersionNumber: Number(instance.target_version_number) },
  });
  const statements: D1IntentStatement[] = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_template_propagation_jobs AS job
        INNER JOIN estimate_template_instances AS instance ON instance.id = job.instance_id
        WHERE job.instance_id = ? AND instance.workspace_id = ?
          AND instance.link_state = 'failed'
          AND (job.state = 'pending' OR (job.state = 'dead' AND job.retryable = 1))
      ) THEN 1 ELSE json('') END AS template_instance_retry_guard`,
      values: [instance.id, instance.workspace_id],
    },
    {
      sql: `UPDATE estimate_template_propagation_jobs
            SET state = 'pending', attempt_count = CASE WHEN state = 'dead' THEN 0 ELSE attempt_count END,
                available_at = ?, lease_token = NULL, lease_expires_at = NULL,
                last_error_code = NULL, failure_class = NULL, retryable = NULL,
                completed_at = NULL, updated_at = ?
            WHERE instance_id = ? AND workspace_id = ?
              AND (state = 'pending' OR (state = 'dead' AND retryable = 1))`,
      values: [timestamp, timestamp, instance.id, instance.workspace_id],
    },
    {
      sql: `UPDATE estimate_template_instances
            SET link_state = 'updating', last_error_code = NULL, updated_at = ?
            WHERE id = ? AND workspace_id = ? AND template_id = ? AND link_state = 'failed'`,
      values: [timestamp, instance.id, instance.workspace_id, instance.template_id],
    },
    ...(history.statement && history.outboxStatement ? [history.statement, history.outboxStatement] : []),
  ];
  await runD1Batch(database, statements);
  revalidateInstanceSurfaces(instance);
  return { instanceId: instance.id, targetVersionNumber: Number(instance.target_version_number) };
}

export async function deleteEstimateTemplateInstance(input: {
  instanceId: string;
  expectedAppliedVersionNumber: number;
  expectedTargetVersionNumber: number;
}) {
  const database = await requireDatabase();
  const { instance, currentUser } = await authorizeInstance(database, input.instanceId);
  const appliedVersionNumber = Number(instance.applied_version_number);
  const targetVersionNumber = Number(instance.target_version_number);
  if (appliedVersionNumber !== input.expectedAppliedVersionNumber || targetVersionNumber !== input.expectedTargetVersionNumber) {
    throw new Error("This linked Template instance changed. Review it and confirm deletion again.");
  }
  const rootIds = await readRootIds(database, instance);
  if (rootIds.length === 0) throw new Error("Linked Template roots are unavailable; detach the instance instead.");
  const rootIdsJson = JSON.stringify(rootIds);
  const history = await prepareHistoryEventInsert(database, {
    workspaceId: instance.workspace_id,
    projectId: instance.project_id,
    estimateId: instance.estimate_id,
    estimateTabId: instance.estimate_tab_id,
    estimateNodeId: instance.target_parent_node_id,
    eventType: "linked_template_instance_deleted",
    correlationId: `template-instance-delete:${instance.id}:${randomUUID()}`,
    actorUserId: currentUser.userId,
    payload: { instanceId: instance.id, templateId: instance.template_id, rootIds },
  });
  const subtreeCte = `WITH RECURSIVE subtree(id) AS (
    SELECT value FROM json_each(?)
    UNION ALL
    SELECT node.id FROM estimate_nodes AS node
    INNER JOIN subtree AS parent ON node.parent_id = parent.id
    WHERE node.estimate_id = ?
  )`;
  const statements: D1IntentStatement[] = [
    {
      sql: `SELECT CASE WHEN EXISTS (
        SELECT 1 FROM estimate_template_instances
        WHERE id = ? AND workspace_id = ? AND template_id = ?
          AND estimate_id = ? AND link_state IN ('linked', 'updating', 'failed')
          AND applied_version_number = ? AND target_version_number = ?
      ) THEN 1 ELSE json('') END AS template_instance_delete_guard`,
      values: [instance.id, instance.workspace_id, instance.template_id, instance.estimate_id, appliedVersionNumber, targetVersionNumber],
    },
    ...(history.statement && history.outboxStatement ? [history.statement, history.outboxStatement] : []),
    { sql: `${subtreeCte} DELETE FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (SELECT id FROM subtree)`, values: [rootIdsJson, instance.estimate_id, instance.estimate_id] },
    { sql: `${subtreeCte} DELETE FROM estimate_nodes WHERE estimate_id = ? AND id IN (SELECT id FROM subtree)`, values: [rootIdsJson, instance.estimate_id, instance.estimate_id] },
    { sql: "DELETE FROM estimate_template_instances WHERE id = ? AND workspace_id = ? AND template_id = ?", values: [instance.id, instance.workspace_id, instance.template_id] },
    buildProjectPublicationRevisionForEstimate(instance.project_id, instance.workspace_id, instance.estimate_id),
  ];
  await runD1Batch(database, statements);
  revalidateInstanceSurfaces(instance);
  return { instanceId: instance.id, deletedRootIds: rootIds };
}

export async function duplicateEstimateTemplateInstance(input: {
  instanceId: string;
  intentId: string;
  mode: "linked" | "copy";
}) {
  const database = await requireDatabase();
  const { instance, currentUser } = await authorizeInstance(database, input.instanceId);
  if (!isUuid(input.intentId)) throw new Error("Template duplicate intent is invalid.");
  if (!instance.target_parent_node_id) throw new Error("This linked Template instance cannot be duplicated at its current placement.");
  if (input.mode === "copy") {
    const result = await duplicateMaterializedTemplateInstance(database, instance, currentUser.userId, input.intentId);
    revalidateInstanceSurfaces(instance);
    return result;
  }
  const result = await insertEstimateTemplateIntoEstimateWithHistory(database, currentUser, {
    projectId: instance.project_id,
    estimateId: instance.estimate_id,
    targetParentNodeId: instance.target_parent_node_id,
    targetTabId: instance.estimate_tab_id,
    templateId: instance.template_id,
    correlationId: input.intentId,
    unavailableSourcePolicy: "cancel",
    mode: input.mode,
  });
  revalidateInstanceSurfaces(instance);
  return result;
}

type MaterializedNodeRow = {
  id: string;
  parent_id: string | null;
  kind: "group" | "area";
  name: string;
  sort_order: number | string | null;
  metadata_json: string | null;
  updated_at: string;
};

type MaterializedRowItemRow = {
  id: string;
  node_id: string;
  description: string | null;
  designation: string | null;
  discipline: string | null;
  material: string | null;
  supplier: string | null;
  supplier_id: string | null;
  quantity: number | string | null;
  unit: string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage: number | string | null;
  source_snapshot_json: string | null;
  sort_order: number | string | null;
  row_revision: number | string | null;
  category_node_id: string | null;
  source_library_item_id: string | null;
  link_state: string | null;
  metadata_json: string | null;
  pricing_provenance_origin: string | null;
  updated_at: string;
};

function parseJsonText(value: string | null, fallback: unknown) {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

async function duplicateMaterializedTemplateInstance(
  database: D1DatabaseLike,
  instance: InstanceActionRow,
  actorUserId: string,
  intentId: string,
) {
  const identity = {
    workspaceId: instance.workspace_id,
    commandKind: "estimate.template.instance.duplicate.copy",
    intentId,
    actorUserId,
    requestFingerprint: createMutationRequestFingerprint({ instanceId: instance.id, mode: "copy" }),
  };
  const parseResult = (value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("The duplicate Template receipt is invalid.");
    const result = value as Record<string, unknown>;
    if (!Array.isArray(result.insertedRootNodeIds)) throw new Error("The duplicate Template receipt is invalid.");
    return {
      status: "inserted" as const,
      insertedRootNodeIds: result.insertedRootNodeIds.filter((id): id is string => typeof id === "string"),
      insertedNodeCount: Number(result.insertedNodeCount ?? 0),
      insertedRowItemCount: Number(result.insertedRowItemCount ?? 0),
    };
  };
  const replay = await readCommittedMutationReceipt(database, identity, parseResult);
  if (replay) return replay;

  const [nodes, rows, sibling] = await Promise.all([
    all<MaterializedNodeRow>(
      database,
      `SELECT node.id, node.parent_id, node.kind, node.name, node.sort_order,
              node.metadata_json, node.updated_at
       FROM estimate_template_instance_nodes AS mapping
       INNER JOIN estimate_nodes AS node
         ON node.id = mapping.estimate_node_id AND node.estimate_id = mapping.estimate_id
       WHERE mapping.instance_id = ? AND mapping.workspace_id = ? AND mapping.estimate_id = ?
       ORDER BY node.sort_order ASC, node.id ASC`,
      [instance.id, instance.workspace_id, instance.estimate_id],
    ),
    all<MaterializedRowItemRow>(
      database,
      `SELECT row_item.id, row_item.node_id, row_item.description, row_item.designation,
              row_item.discipline, row_item.material, row_item.supplier, row_item.supplier_id,
              row_item.quantity, row_item.unit, row_item.unit_cost, row_item.misc_cost,
              row_item.contingency_percentage, row_item.adjustment_percentage,
              row_item.source_snapshot_json, row_item.sort_order, row_item.row_revision,
              row_item.category_node_id, row_item.source_library_item_id, row_item.link_state,
              row_item.metadata_json, row_item.pricing_provenance_origin, row_item.updated_at
       FROM estimate_template_instance_rows AS mapping
       INNER JOIN estimate_row_items AS row_item
         ON row_item.id = mapping.estimate_row_item_id AND row_item.estimate_id = mapping.estimate_id
       WHERE mapping.instance_id = ? AND mapping.workspace_id = ? AND mapping.estimate_id = ?
       ORDER BY row_item.sort_order ASC, row_item.id ASC`,
      [instance.id, instance.workspace_id, instance.estimate_id],
    ),
    first<{ sort_order: number | string | null }>(
      database,
      `SELECT COALESCE(MAX(sort_order), 0) AS sort_order
       FROM estimate_nodes
       WHERE estimate_id = ? AND estimate_tab_id = ? AND parent_id = ?`,
      [instance.estimate_id, instance.estimate_tab_id, instance.target_parent_node_id],
    ),
  ]);
  if (nodes.length === 0) throw new Error("Linked Template instance content is unavailable.");
  const nodeIdBySource = new Map(nodes.map((node) => [node.id, randomUUID()]));
  const rootNodes = nodes.filter((node) => node.parent_id === instance.target_parent_node_id);
  if (rootNodes.length === 0) throw new Error("Linked Template instance roots are unavailable.");
  const rootIds = new Set(rootNodes.map((node) => node.id));
  const rootRank = new Map(rootNodes.map((node, index) => [node.id, index + 1]));
  const maxSiblingSortOrder = Number(sibling?.sort_order ?? 0);
  const timestamp = new Date().toISOString();
  const nodePayload = nodes.map((node) => ({
    id: nodeIdBySource.get(node.id)!,
    sourceId: node.id,
    parentId: rootIds.has(node.id) ? instance.target_parent_node_id : nodeIdBySource.get(node.parent_id ?? "") ?? null,
    kind: node.kind,
    name: node.name,
    sortOrder: rootIds.has(node.id) ? maxSiblingSortOrder + (rootRank.get(node.id) ?? 1) * 1_000 : Number(node.sort_order ?? 0),
    metadata: parseJsonText(node.metadata_json, {}),
    updatedAt: node.updated_at,
  }));
  const rowPayload = rows.map((row) => ({
    id: randomUUID(),
    sourceId: row.id,
    nodeId: nodeIdBySource.get(row.node_id),
    description: row.description,
    designation: row.designation,
    discipline: row.discipline,
    material: row.material,
    supplier: row.supplier,
    supplierId: row.supplier_id,
    quantity: Number(row.quantity ?? 0),
    unit: row.unit,
    unitCost: Number(row.unit_cost ?? 0),
    miscCost: Number(row.misc_cost ?? 0),
    contingencyPercentage: Number(row.contingency_percentage ?? 0),
    adjustmentPercentage: Number(row.adjustment_percentage ?? 0),
    sourceSnapshot: parseJsonText(row.source_snapshot_json, null),
    sortOrder: Number(row.sort_order ?? 0),
    categoryNodeId: row.category_node_id,
    sourceLibraryItemId: row.source_library_item_id,
    linkState: row.link_state,
    metadata: parseJsonText(row.metadata_json, {}),
    pricingProvenanceOrigin: row.pricing_provenance_origin,
    sourceRowRevision: Number(row.row_revision ?? 0),
    rowRevision: 1,
    updatedAt: row.updated_at,
  }));
  if (rowPayload.some((row) => !row.nodeId)) throw new Error("Linked Template row mapping is incomplete.");
  const result = {
    status: "inserted" as const,
    insertedRootNodeIds: rootNodes.map((node) => nodeIdBySource.get(node.id)!),
    insertedNodeCount: nodePayload.length,
    insertedRowItemCount: rowPayload.length,
  };
  const history = await prepareHistoryEventInsert(database, {
    workspaceId: instance.workspace_id,
    projectId: instance.project_id,
    estimateId: instance.estimate_id,
    estimateTabId: instance.estimate_tab_id,
    estimateNodeId: instance.target_parent_node_id,
    eventType: "linked_template_instance_duplicated_as_copy",
    correlationId: intentId,
    actorUserId,
    payload: { instanceId: instance.id, templateId: instance.template_id, ...result },
  });
  const statements: D1IntentStatement[] = [
    {
      sql: `SELECT CASE WHEN
        EXISTS (SELECT 1 FROM estimate_template_instances WHERE id = ? AND workspace_id = ? AND estimate_id = ? AND link_state IN ('linked', 'updating', 'failed'))
        AND NOT EXISTS (
          SELECT 1 FROM json_each(?) AS expected
          WHERE NOT EXISTS (
            SELECT 1 FROM estimate_nodes AS node
            WHERE node.id = json_extract(expected.value, '$.sourceId')
              AND node.estimate_id = ? AND node.updated_at = json_extract(expected.value, '$.updatedAt')
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM json_each(?) AS expected
          WHERE NOT EXISTS (
            SELECT 1 FROM estimate_row_items AS row_item
            WHERE row_item.id = json_extract(expected.value, '$.sourceId')
              AND row_item.estimate_id = ? AND row_item.row_revision = json_extract(expected.value, '$.sourceRowRevision')
              AND row_item.updated_at = json_extract(expected.value, '$.updatedAt')
          )
        )
      THEN 1 ELSE json('') END AS duplicate_materialized_template_guard`,
      values: [instance.id, instance.workspace_id, instance.estimate_id, JSON.stringify(nodePayload), instance.estimate_id, JSON.stringify(rowPayload), instance.estimate_id],
    },
    {
      sql: `INSERT INTO estimate_nodes (
        id, estimate_id, estimate_tab_id, parent_id, kind, name,
        sort_order, metadata_json, created_at, updated_at
      )
      SELECT json_extract(value, '$.id'), ?, ?, json_extract(value, '$.parentId'),
             json_extract(value, '$.kind'), json_extract(value, '$.name'),
             json_extract(value, '$.sortOrder'), json_extract(value, '$.metadata'), ?, ?
      FROM json_each(?)`,
      values: [instance.estimate_id, instance.estimate_tab_id, timestamp, timestamp, JSON.stringify(nodePayload)],
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
      FROM json_each(?)`,
      values: [instance.estimate_id, timestamp, timestamp, JSON.stringify(rowPayload)],
    },
    buildProjectPublicationRevisionForEstimate(instance.project_id, instance.workspace_id, instance.estimate_id),
    ...(history.statement && history.outboxStatement ? [history.statement, history.outboxStatement] : []),
    buildCommittedMutationReceiptStatement({
      ...identity,
      resourceType: "estimate_template_instance",
      resourceId: instance.id,
      result,
      timestamp,
    }),
  ];
  try {
    await runD1Batch(database, statements);
  } catch (error) {
    const committed = await readCommittedMutationReceipt(database, identity, parseResult);
    if (committed) return committed;
    throw error;
  }
  return result;
}
