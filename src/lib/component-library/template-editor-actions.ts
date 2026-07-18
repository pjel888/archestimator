"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import {
  getCloudflareD1Database,
  type D1DatabaseLike,
  type D1Value,
} from "@/lib/cloudflare/d1";
import type { EstimateRowItem, EstimateRowLinkState } from "@/lib/estimates/types";
import { sanitizeEstimateRowSourceSnapshot } from "@/lib/estimates/image-url";
import { sanitizeEstimateRowPriceOptionsSnapshot } from "@/lib/estimates/source-snapshot-price-options";
import { assertD1MutationStatementLimit } from "@/lib/estimates/mutation-receipts";
import { isUuid } from "@/lib/ids";
import { ensureDefaultWorkspace } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/types/json";
import { throwActionError } from "./action-errors";
import {
  assertEstimateTemplateMutationConfirmation,
  readEstimateTemplateMutationImpact,
  type EstimateTemplateMutationConfirmation,
  type EstimateTemplateMutationImpact,
} from "./template-link-impact-d1";
import { buildLinkedTemplateMutationStatements } from "./template-linked-mutation-d1";
import {
  reconcileTemplatePropagationJobs,
  retryTemplatePropagationJobs,
} from "./template-propagation-d1";
import { reconcileExpiredTemplateMutationIntents } from "./template-intent-recovery-d1";
import {
  buildTemplateMutationReceiptStatement,
  buildTemplateMutationTelemetryStatement,
  createTemplateMutationIdentity,
  normalizeTemplatePricingProvenance,
  readCommittedTemplateMutation,
  runTemplateAtomicBatch,
  toDetachedTemplatePricingProvenance,
  type TemplateMutationIdentity,
  type TemplateMutationStatement,
  type TemplatePricingProvenanceOrigin,
} from "./template-mutations";

type CurrentUserContext = Awaited<ReturnType<typeof requireCurrentUserContext>>;

export type TemplateNodeKind = "group" | "area";

export type TemplateEditorRowPatch = Partial<{
  material: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  miscCost: number;
  contingencyPercentage: number;
  adjustmentPercentage: number;
}>;

type EstimateTemplateRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  category: string;
  current_version_number: number;
  updated_at: string;
  archived_at: string | null;
};

type EstimateTemplateNodeD1Row = {
  id: string;
  template_id: string;
  parent_id: string | null;
  kind: TemplateNodeKind;
  name: string;
  sort_order: number;
  metadata: string | Json | null;
  created_at: string;
  updated_at: string;
};

type EstimateTemplateNode = Omit<EstimateTemplateNodeD1Row, "metadata"> & {
  metadata: Json;
};

type EstimateTemplateRowItemD1Row = {
  id: string;
  template_id: string;
  template_node_id: string;
  sort_order: number;
  source_library_item_id: string | null;
  source_snapshot: string | Json | null;
  pricing_provenance_origin: TemplatePricingProvenanceOrigin | null;
  category_node_id: string | null;
  supplier_id: string | null;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  misc_cost: number;
  contingency_percentage: number;
  adjustment_percentage: number;
  discipline: string;
  designation: string;
  link_state: EstimateRowLinkState;
  metadata: string | Json | null;
  created_at: string;
  updated_at: string;
};

type EstimateTemplateRowItem = Omit<EstimateTemplateRowItemD1Row, "source_snapshot" | "metadata"> & {
  source_snapshot: Json | null;
  metadata: Json;
};

type TemplateRowInsert = Omit<EstimateTemplateRowItem, "id" | "created_at" | "updated_at">;

type TemplateRowUpdate = Partial<
  Pick<
    EstimateTemplateRowItem,
    | "material"
    | "description"
    | "quantity"
    | "unit"
    | "unit_cost"
    | "misc_cost"
    | "adjustment_percentage"
  >
>;

function revalidateTemplateEditorPaths(templateId: string) {
  revalidatePath("/workshop/library/templates");
  revalidatePath(`/workshop/library/templates/${templateId}`);
}

function nowIso() {
  return new Date().toISOString();
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("At least one SQL placeholder is required.");
  return values.map(() => "?").join(", ");
}

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseJsonValue(value: unknown, fallback: Json): Json {
  if (typeof value === "string") {
    try {
      return parseJsonValue(JSON.parse(value) as Json, fallback);
    } catch {
      return fallback;
    }
  }
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    Array.isArray(value) ||
    (value && typeof value === "object")
  ) {
    return value as Json;
  }
  return fallback;
}

function jsonObjectText(value: unknown) {
  const parsed = parseJsonValue(value, {});
  return JSON.stringify(isJsonObject(parsed) ? parsed : {});
}

function nullableJsonText(value: unknown) {
  if (value === null || value === undefined) return null;
  return JSON.stringify(parseJsonValue(value, null));
}

function toTemplateNode(row: EstimateTemplateNodeD1Row): EstimateTemplateNode {
  return {
    ...row,
    sort_order: Number(row.sort_order ?? 0),
    metadata: parseJsonValue(row.metadata, {}),
  };
}

function toTemplateRowItem(row: EstimateTemplateRowItemD1Row): EstimateTemplateRowItem {
  return {
    ...row,
    sort_order: Number(row.sort_order ?? 0),
    quantity: Number(row.quantity ?? 0),
    unit_cost: Number(row.unit_cost ?? 0),
    misc_cost: Number(row.misc_cost ?? 0),
    contingency_percentage: Number(row.contingency_percentage ?? 0),
    adjustment_percentage: Number(row.adjustment_percentage ?? 0),
    pricing_provenance_origin: normalizeTemplatePricingProvenance(row.pricing_provenance_origin),
    source_snapshot: parseJsonValue(row.source_snapshot, null),
    metadata: parseJsonValue(row.metadata, {}),
  };
}

async function requireTemplateEditorD1Database() {
  const database = await getCloudflareD1Database();
  if (!database) {
    throw new Error("Cloudflare D1 ARCH_DB binding is required for template editor actions.");
  }
  return database;
}

async function first<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
  userMessage = "Could not read template data.",
) {
  try {
    return await database
      .prepare<T>(sql)
      .bind(...values)
      .first<T>();
  } catch (error) {
    throwActionError(userMessage, error);
  }
}

async function all<T>(
  database: D1DatabaseLike,
  sql: string,
  values: D1Value[] = [],
  userMessage = "Could not read template data.",
) {
  try {
    const result = await database
      .prepare<T>(sql)
      .bind(...values)
      .all<T>();
    return result.results ?? [];
  } catch (error) {
    throwActionError(userMessage, error);
  }
}

async function commitTemplateMutation<T>(
  database: D1DatabaseLike,
  identity: TemplateMutationIdentity,
  retention: TemplateMutationRetention,
  statements: TemplateMutationStatement[],
  result: T,
  parseResult: (value: unknown) => T,
  userMessage: string,
): Promise<T> {
  assertD1MutationStatementLimit(statements.length);
  await retainTemplateMutationIntent(database, identity, retention);
  try {
    await runTemplateAtomicBatch(database, statements);
    try {
      await reconcileTemplatePropagationJobs(database, { limit: 25 });
    } catch (error) {
      console.warn("[template-links] Immediate propagation drain failed; scheduled recovery remains active.", error);
    }
    return result;
  } catch (error) {
    let committed: T | null;
    try {
      committed = await readCommittedTemplateMutation(database, identity, parseResult);
    } catch (resolutionError) {
      throwActionError(
        "We couldn't confirm whether the linked Template updated. Retry this same action to resolve its retained intent.",
        resolutionError,
      );
    }
    if (committed) {
      try {
        await reconcileTemplatePropagationJobs(database, { limit: 25 });
      } catch (drainError) {
        console.warn("[template-links] Immediate propagation recovery drain failed; scheduled recovery remains active.", drainError);
      }
      return committed;
    }
    await markTemplateMutationNotApplied(database, identity, "batch_not_committed");
    throwActionError(userMessage, error);
  }
}

async function markTemplateMutationNotApplied(
  database: D1DatabaseLike,
  identity: TemplateMutationIdentity,
  code: string,
) {
  const timestamp = nowIso();
  const result = await database.prepare(`
    UPDATE estimate_template_mutation_intents
    SET state = 'not_applied', execution_lease_token = NULL,
        execution_lease_expires_at = NULL, not_applied_code = ?,
        updated_at = ?, resolved_at = ?
    WHERE intent_id = ? AND workspace_id = ? AND created_by = ?
      AND state = 'pending' AND execution_lease_token = ?
  `).bind(
    code,
    timestamp,
    timestamp,
    identity.intentId,
    identity.workspaceId,
    identity.actorUserId,
    identity.executionLeaseToken,
  ).run();
  if (result.success === false) {
    throw new Error("Could not resolve the retained Template update intent.");
  }
}

type TemplateMutationRetention = {
  workspaceId: string;
  templateId: string;
  actorUserId: string;
  impact: EstimateTemplateMutationImpact;
};

async function retainTemplateMutationIntent(
  database: D1DatabaseLike,
  identity: TemplateMutationIdentity,
  retention: TemplateMutationRetention,
) {
  const timestamp = nowIso();
  const leaseExpiresAt = new Date(Date.now() + 120_000).toISOString();
  const normalizedPayloadJson = JSON.stringify(identity.normalizedRequest);
  if (new TextEncoder().encode(normalizedPayloadJson).byteLength > 262_144) {
    throw new Error("This Template update is too large to retain safely. Split it into smaller changes.");
  }
  const result = await database.prepare(`
    INSERT INTO estimate_template_mutation_intents (
      intent_id, workspace_id, template_id, created_by, request_fingerprint,
      normalized_payload_json, expected_version_number, impact_fingerprint,
      state, execution_lease_token, execution_lease_expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    ON CONFLICT(intent_id) DO UPDATE SET
      execution_lease_token = excluded.execution_lease_token,
      execution_lease_expires_at = excluded.execution_lease_expires_at,
      updated_at = excluded.updated_at
    WHERE estimate_template_mutation_intents.workspace_id = excluded.workspace_id
      AND estimate_template_mutation_intents.template_id = excluded.template_id
      AND estimate_template_mutation_intents.created_by = excluded.created_by
      AND estimate_template_mutation_intents.request_fingerprint = excluded.request_fingerprint
      AND estimate_template_mutation_intents.expected_version_number = excluded.expected_version_number
      AND estimate_template_mutation_intents.impact_fingerprint = excluded.impact_fingerprint
      AND estimate_template_mutation_intents.state = 'pending'
      AND estimate_template_mutation_intents.execution_lease_expires_at <= excluded.updated_at
  `).bind(
    identity.intentId,
    retention.workspaceId,
    retention.templateId,
    retention.actorUserId,
    identity.requestFingerprint,
    normalizedPayloadJson,
    retention.impact.currentVersionNumber,
    retention.impact.fingerprint,
    identity.executionLeaseToken,
    leaseExpiresAt,
    timestamp,
    timestamp,
  ).run();
  if (result.success === false) throw new Error("Could not retain the shared Template update intent.");
  const retained = await first<{
    request_fingerprint: string;
    expected_version_number: number | string;
    impact_fingerprint: string;
    state: string;
    execution_lease_token: string | null;
    execution_lease_expires_at: string | null;
  }>(
    database,
    `SELECT request_fingerprint, expected_version_number, impact_fingerprint, state,
            execution_lease_token, execution_lease_expires_at
     FROM estimate_template_mutation_intents
     WHERE intent_id = ? AND workspace_id = ? AND template_id = ?
     LIMIT 1`,
    [identity.intentId, retention.workspaceId, retention.templateId],
    "Could not resolve the shared Template update intent.",
  );
  if (
    !retained
    || retained.request_fingerprint !== identity.requestFingerprint
    || Number(retained.expected_version_number) !== retention.impact.currentVersionNumber
    || retained.impact_fingerprint !== retention.impact.fingerprint
    || retained.state !== "pending"
    || retained.execution_lease_token !== identity.executionLeaseToken
    || retained.execution_lease_expires_at !== leaseExpiresAt
  ) {
    throw new Error("This Template update intent conflicts with or is already running for an earlier request. Refresh and try again.");
  }
}

async function requireTemplateEditorAccess(
  database: D1DatabaseLike,
  workspaceId: string,
  currentUser: CurrentUserContext,
) {
  let canManage = false;
  try {
    canManage = await isWorkspaceEditorInD1(database, workspaceId, currentUser);
  } catch (error) {
    throwActionError("Could not verify template editor access.", error);
  }
  if (!canManage) throw new Error("Only workspace editors/admins can edit estimate templates.");
}

export async function previewEstimateTemplateMutation(input: { templateId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  if (!isUuid(input.templateId)) throw new Error("Template not found in the current workspace.");
  return readEstimateTemplateMutationImpact(database, workspace.id, input.templateId);
}

export async function resolveEstimateTemplateMutationIntent(input: { templateId: string; intentId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  if (!isUuid(input.templateId) || !isUuid(input.intentId)) {
    throw new Error("Retained Template update intent not found.");
  }
  await reconcileExpiredTemplateMutationIntents(database, { intentId: input.intentId, limit: 1 });
  const intent = await first<{
    state: "pending" | "committed" | "not_applied";
    committed_version_number: number | string | null;
    result_json: string | null;
    not_applied_code: string | null;
  }>(
    database,
    `SELECT state, committed_version_number, result_json, not_applied_code
     FROM estimate_template_mutation_intents
     WHERE intent_id = ? AND workspace_id = ? AND template_id = ? AND created_by = ?
     LIMIT 1`,
    [input.intentId, workspace.id, input.templateId, currentUser.userId],
    "Could not check the retained Template update intent.",
  );
  if (!intent) throw new Error("Retained Template update intent not found.");
  return {
    state: intent.state,
    committedVersionNumber: intent.committed_version_number === null ? null : Number(intent.committed_version_number),
    result: intent.result_json ? parseJsonValue(intent.result_json, {}) : null,
    notAppliedCode: intent.not_applied_code,
  };
}

export async function loadEstimateTemplateLinkedInstanceStatus(input: { templateId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  const template = await requireWorkspaceTemplate(database, workspace.id, input.templateId);
  const instances = await all<{
    id: string;
    project_id: string;
    project_name: string;
    estimate_id: string;
    estimate_name: string;
    root_node_id: string | null;
    link_state: "linked" | "updating" | "failed";
    applied_version_number: number | string;
    target_version_number: number | string;
    failure_class: string | null;
    retryable: number | string | null;
  }>(
    database,
    `SELECT instance.id, instance.project_id, project.name AS project_name,
            instance.estimate_id, estimate.name AS estimate_name,
            instance.link_state, instance.applied_version_number, instance.target_version_number,
            job.failure_class, job.retryable,
            (
              SELECT mapping.estimate_node_id
              FROM estimate_template_instance_nodes AS mapping
              INNER JOIN estimate_nodes AS node
                ON node.id = mapping.estimate_node_id AND node.estimate_id = mapping.estimate_id
              WHERE mapping.instance_id = instance.id
                AND node.parent_id IS instance.target_parent_node_id
              ORDER BY node.sort_order ASC, mapping.template_node_id ASC
              LIMIT 1
            ) AS root_node_id
     FROM estimate_template_instances AS instance
     INNER JOIN projects AS project
       ON project.id = instance.project_id AND project.workspace_id = instance.workspace_id
     INNER JOIN estimates AS estimate
       ON estimate.id = instance.estimate_id AND estimate.project_id = instance.project_id
     LEFT JOIN estimate_template_propagation_jobs AS job ON job.instance_id = instance.id
     WHERE instance.workspace_id = ? AND instance.template_id = ?
       AND instance.link_state IN ('linked', 'updating', 'failed')
     ORDER BY project.name ASC, estimate.name ASC, instance.id ASC
     LIMIT 200`,
    [workspace.id, template.id],
    "Could not load linked Template status.",
  );
  const items = instances.map((instance) => ({
    instanceId: instance.id,
    projectId: instance.project_id,
    projectName: instance.project_name,
    estimateId: instance.estimate_id,
    estimateName: instance.estimate_name,
    rootNodeId: instance.root_node_id,
    linkState: instance.link_state,
    appliedVersionNumber: Number(instance.applied_version_number),
    targetVersionNumber: Number(instance.target_version_number),
    failureClass: instance.failure_class,
    retryable: Number(instance.retryable) === 1,
  }));
  return {
    templateId: template.id,
    currentVersionNumber: Number(template.current_version_number),
    activeCount: items.length,
    currentCount: items.filter((item) => item.linkState === "linked" && item.appliedVersionNumber === item.targetVersionNumber).length,
    updatingCount: items.filter((item) => item.linkState === "updating").length,
    failedCount: items.filter((item) => item.linkState === "failed").length,
    retryableCount: items.filter((item) => item.linkState === "failed" && item.retryable).length,
    items,
  };
}

export async function retryEstimateTemplateLinkedInstances(input: { templateId: string }) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  const template = await requireWorkspaceTemplate(database, workspace.id, input.templateId);
  const rows = await all<{ id: string }>(
    database,
    `SELECT instance.id
     FROM estimate_template_instances AS instance
     INNER JOIN estimate_template_propagation_jobs AS job ON job.instance_id = instance.id
     WHERE instance.workspace_id = ? AND instance.template_id = ?
       AND instance.link_state = 'failed' AND job.state = 'dead' AND job.retryable = 1
     ORDER BY instance.id ASC LIMIT 100`,
    [workspace.id, template.id],
    "Could not load retryable linked Template instances.",
  );
  const retried = await retryTemplatePropagationJobs(database, {
    workspaceId: workspace.id,
    instanceIds: rows.map((row) => row.id),
  });
  try {
    await reconcileTemplatePropagationJobs(database, { limit: 25 });
  } catch (error) {
    console.warn("[template-links] Immediate bulk retry drain failed; scheduled recovery remains active.", error);
  }
  return retried;
}

async function requireWorkspaceTemplate(database: D1DatabaseLike, workspaceId: string, templateId: string) {
  if (!isUuid(templateId)) throw new Error("Template not found in the current workspace.");
  const template = await first<EstimateTemplateRow>(
    database,
    `
      SELECT id, workspace_id, name, description, category,
             current_version_number, updated_at, archived_at
      FROM estimate_templates
      WHERE id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [templateId, workspaceId],
    "Could not load the template.",
  );
  if (!template) throw new Error("Template not found in the current workspace.");
  if (template.archived_at) throw new Error("Restore this Template before editing it.");
  return template;
}

async function prepareTemplateEditorMutationContext(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  templateId: string;
  identity: TemplateMutationIdentity;
  actorUserId: string;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [template, impact] = await Promise.all([
    requireWorkspaceTemplate(input.database, input.workspaceId, input.templateId),
    readEstimateTemplateMutationImpact(input.database, input.workspaceId, input.templateId),
  ]);
  assertEstimateTemplateMutationConfirmation(impact, input.confirmation);
  const normalizedPayloadJson = JSON.stringify(input.identity.normalizedRequest);
  if (new TextEncoder().encode(normalizedPayloadJson).byteLength > 262_144) {
    throw new Error("This Template update is too large to retain safely. Split it into smaller changes.");
  }
  return {
    template,
    impact,
    retention: {
      workspaceId: input.workspaceId,
      templateId: input.templateId,
      actorUserId: input.actorUserId,
      impact,
    } satisfies TemplateMutationRetention,
  };
}

type TemplateNodeMutationReceipt = {
  templateId: string;
  nodeId: string;
  name?: string;
  parentId?: string | null;
};

type TemplateHeaderMutationReceipt = {
  templateId: string;
  name?: string;
  category?: string;
};

type TemplateNodeListMutationReceipt = {
  templateId: string;
  nodeIds: string[];
};

type TemplateRowMutationReceipt = {
  templateId: string;
  rowId: string;
};

type TemplateRowListMutationReceipt = {
  templateId: string;
  rowIds: string[];
};

function receiptRecord(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("The committed Template editor receipt is invalid.");
  return value as Record<string, unknown>;
}

function receiptUuid(value: unknown) {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new Error("The committed Template editor receipt is invalid.");
  }
  return value;
}

function receiptUuidList(value: unknown) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !isUuid(entry))) {
    throw new Error("The committed Template editor receipt is invalid.");
  }
  return value as string[];
}

function parseTemplateNodeMutationReceipt(value: unknown): TemplateNodeMutationReceipt {
  const result = receiptRecord(value);
  const parentId = result.parentId === null ? null : result.parentId === undefined ? undefined : receiptUuid(result.parentId);
  return {
    templateId: receiptUuid(result.templateId),
    nodeId: receiptUuid(result.nodeId),
    name: typeof result.name === "string" ? result.name : undefined,
    parentId,
  };
}

function parseTemplateNodeListMutationReceipt(value: unknown): TemplateNodeListMutationReceipt {
  const result = receiptRecord(value);
  return {
    templateId: receiptUuid(result.templateId),
    nodeIds: receiptUuidList(result.nodeIds),
  };
}

function parseTemplateRowMutationReceipt(value: unknown): TemplateRowMutationReceipt {
  const result = receiptRecord(value);
  return {
    templateId: receiptUuid(result.templateId),
    rowId: receiptUuid(result.rowId),
  };
}

function parseTemplateRowListMutationReceipt(value: unknown): TemplateRowListMutationReceipt {
  const result = receiptRecord(value);
  return {
    templateId: receiptUuid(result.templateId),
    rowIds: receiptUuidList(result.rowIds),
  };
}

function parseTemplateHeaderMutationReceipt(value: unknown): TemplateHeaderMutationReceipt {
  const result = receiptRecord(value);
  if (typeof result.name !== "string" && typeof result.category !== "string") {
    throw new Error("The committed Template editor receipt is invalid.");
  }
  return {
    templateId: receiptUuid(result.templateId),
    name: typeof result.name === "string" ? result.name : undefined,
    category: typeof result.category === "string" ? result.category : undefined,
  };
}

function buildTemplateEditorMutationStatements(input: {
  template: EstimateTemplateRow;
  impact: EstimateTemplateMutationImpact;
  identity: TemplateMutationIdentity;
  actorUserId: string;
  action: string;
  timestamp: string;
  result: object;
  statements: TemplateMutationStatement[];
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const linkedMutationStatements = buildLinkedTemplateMutationStatements({
    template: input.template,
    impact: input.impact,
    identity: input.identity,
    actorUserId: input.actorUserId,
    action: input.action,
    timestamp: input.timestamp,
    result: input.result,
  });
  return [
    linkedMutationStatements[0],
    ...input.statements,
    ...linkedMutationStatements.slice(1),
    buildTemplateMutationTelemetryStatement({
      actorUserId: input.actorUserId,
      workspaceId: input.template.workspace_id,
      templateId: input.template.id,
      action: input.action,
      intentId: input.identity.intentId,
      timestamp: input.timestamp,
      metadata: input.metadata,
    }),
    buildTemplateMutationReceiptStatement({
      ...input.identity,
      templateId: input.template.id,
      result: input.result,
      timestamp: input.timestamp,
    }),
  ] satisfies TemplateMutationStatement[];
}

function latestUpdatedAt(rows: Array<{ updated_at: string }>) {
  return rows.reduce((latest, row) => row.updated_at > latest ? row.updated_at : latest, "");
}

async function requireTemplateNode(database: D1DatabaseLike, templateId: string, nodeId: string) {
  if (!isUuid(nodeId)) throw new Error("Template node not found.");
  const node = await first<EstimateTemplateNodeD1Row>(
    database,
    `
      SELECT id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at
      FROM estimate_template_nodes
      WHERE id = ?
        AND template_id = ?
      LIMIT 1
    `,
    [nodeId, templateId],
    "Could not load the template node.",
  );
  if (!node) throw new Error("Template node not found.");
  return toTemplateNode(node);
}

async function nextSiblingSortOrder(database: D1DatabaseLike, templateId: string, parentId: string | null) {
  const row = await first<{ sort_order: number | null }>(
    database,
    parentId === null
      ? `
          SELECT sort_order
          FROM estimate_template_nodes
          WHERE template_id = ?
            AND parent_id IS NULL
          ORDER BY sort_order DESC
          LIMIT 1
        `
      : `
          SELECT sort_order
          FROM estimate_template_nodes
          WHERE template_id = ?
            AND parent_id = ?
          ORDER BY sort_order DESC
          LIMIT 1
        `,
    parentId === null ? [templateId] : [templateId, parentId],
    "Could not read sibling order.",
  );
  return Number(row?.sort_order ?? -1) + 1;
}

async function readAllTemplateNodes(database: D1DatabaseLike, templateId: string) {
  return all<EstimateTemplateNodeD1Row>(
    database,
    `
      SELECT id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at
      FROM estimate_template_nodes
      WHERE template_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [templateId],
    "Could not load the template tree.",
  );
}

async function readTemplateRowItem(database: D1DatabaseLike, templateId: string, rowId: string) {
  const row = await first<EstimateTemplateRowItemD1Row>(
    database,
    `
      SELECT *
      FROM estimate_template_row_items
      WHERE id = ?
        AND template_id = ?
      LIMIT 1
    `,
    [rowId, templateId],
    "Could not load the template row.",
  );
  return row ? toTemplateRowItem(row) : null;
}

async function readTemplateRowItemsByIds(database: D1DatabaseLike, templateId: string, rowIds: string[]) {
  if (rowIds.length === 0) return [];
  const rows = await all<EstimateTemplateRowItemD1Row>(
    database,
    `
      SELECT *
      FROM estimate_template_row_items
      WHERE template_id = ?
        AND id IN (${placeholders(rowIds)})
    `,
    [templateId, ...rowIds],
    "Could not load the template rows.",
  );
  const rowById = new Map(rows.map((row) => [row.id, toTemplateRowItem(row)]));
  const orderedRows = rowIds.map((rowId) => rowById.get(rowId)).filter((row): row is EstimateTemplateRowItem => Boolean(row));
  if (orderedRows.length !== rowIds.length) throw new Error("One or more committed Template rows no longer exist.");
  return orderedRows;
}

function templateNodeInsertStatement(input: {
  id: string;
  templateId: string;
  parentId: string | null;
  kind: TemplateNodeKind;
  name: string;
  sortOrder: number;
  metadata?: Json;
  now: string;
}) {
  return {
    sql: `
      INSERT INTO estimate_template_nodes (
        id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      input.id,
      input.templateId,
      input.parentId,
      input.kind,
      input.name,
      input.sortOrder,
      jsonObjectText(input.metadata ?? {}),
      input.now,
      input.now,
    ] as D1Value[],
  };
}

function templateRowItemInsertStatement(input: EstimateTemplateRowItem & { now: string }) {
  return {
    sql: `
      INSERT INTO estimate_template_row_items (
        id,
        template_id,
        template_node_id,
        sort_order,
        source_library_item_id,
        source_snapshot,
        pricing_provenance_origin,
        category_node_id,
        supplier_id,
        material,
        description,
        supplier,
        unit,
        quantity,
        unit_cost,
        misc_cost,
        contingency_percentage,
        adjustment_percentage,
        discipline,
        designation,
        link_state,
        metadata,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values: [
      input.id,
      input.template_id,
      input.template_node_id,
      input.sort_order,
      input.source_library_item_id,
      nullableJsonText(input.source_snapshot),
      normalizeTemplatePricingProvenance(input.pricing_provenance_origin),
      input.category_node_id,
      input.supplier_id,
      input.material,
      input.description,
      input.supplier,
      input.unit,
      input.quantity,
      input.unit_cost,
      input.misc_cost,
      input.contingency_percentage,
      input.adjustment_percentage,
      input.discipline,
      input.designation,
      input.link_state,
      jsonObjectText(input.metadata),
      input.now,
      input.now,
    ] as D1Value[],
  };
}

export async function renameLinkedEstimateTemplate(input: {
  intentId?: string;
  templateId: string;
  name: string;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  const name = input.name.trim();
  if (!name) throw new Error("Template name is required.");
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template.rename",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, name },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
  if (replay) return { templateId: replay.templateId, name: replay.name ?? name };
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database,
    workspaceId: workspace.id,
    templateId: input.templateId,
    identity,
    actorUserId: currentUser.userId,
    confirmation: input.confirmation,
  });
  if (template.name === name) return { templateId: template.id, name };
  const timestamp = nowIso();
  const result: TemplateHeaderMutationReceipt = { templateId: template.id, name };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "rename",
    timestamp,
    result,
    metadata: { previousName: template.name, name },
    statements: [{
      sql: `UPDATE estimate_templates SET name = ?, updated_at = ?
            WHERE id = ? AND workspace_id = ? AND current_version_number = ? AND updated_at = ?`,
      values: [name, timestamp, template.id, workspace.id, template.current_version_number, template.updated_at],
    }],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateHeaderMutationReceipt,
    "Could not rename the Template.",
  );
  revalidateTemplateEditorPaths(template.id);
  return { templateId: committed.templateId, name: committed.name ?? name };
}

export async function moveLinkedEstimateTemplateToCategory(input: {
  intentId?: string;
  templateId: string;
  category: string;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  const category = input.category.trim();
  if (!category) throw new Error("Group name is required.");
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template.move_category",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, category },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateHeaderMutationReceipt);
  if (replay) return { templateId: replay.templateId, category: replay.category ?? category };
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database,
    workspaceId: workspace.id,
    templateId: input.templateId,
    identity,
    actorUserId: currentUser.userId,
    confirmation: input.confirmation,
  });
  if (template.category === category) return { templateId: template.id, category };
  const timestamp = nowIso();
  const result: TemplateHeaderMutationReceipt = { templateId: template.id, category };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "move_category",
    timestamp,
    result,
    metadata: { previousCategory: template.category, category },
    statements: [{
      sql: `UPDATE estimate_templates SET category = ?, updated_at = ?
            WHERE id = ? AND workspace_id = ? AND current_version_number = ? AND updated_at = ?`,
      values: [category, timestamp, template.id, workspace.id, template.current_version_number, template.updated_at],
    }],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateHeaderMutationReceipt,
    "Could not move the Template.",
  );
  revalidateTemplateEditorPaths(template.id);
  return { templateId: committed.templateId, category: committed.category ?? category };
}

export async function createEstimateTemplateNode(input: {
  intentId?: string;
  templateId: string;
  parentId: string | null;
  kind: TemplateNodeKind;
  name: string;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);

  const name = input.name.trim();
  if (!name) throw new Error("Node name is required.");
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template_editor.create_node",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, parentId: input.parentId, kind: input.kind, name },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateNodeMutationReceipt);
  if (replay) {
    return { node: await requireTemplateNode(database, replay.templateId, replay.nodeId) };
  }
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database, workspaceId: workspace.id, templateId: input.templateId, identity,
    actorUserId: currentUser.userId, confirmation: input.confirmation,
  });
  if (input.parentId === null && input.kind !== "group") {
    throw new Error("Only groups can sit at the template root.");
  }
  if (input.parentId !== null) {
    const parent = await requireTemplateNode(database, input.templateId, input.parentId);
    if (parent.kind !== "group") throw new Error("Groups and areas can only be added under a group.");
  }

  const now = nowIso();
  const nodeId = randomUUID();
  const sortOrder = await nextSiblingSortOrder(database, input.templateId, input.parentId);
  const result: TemplateNodeMutationReceipt = { templateId: template.id, nodeId };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "create_node",
    timestamp: now,
    result,
    metadata: { nodeId, kind: input.kind },
    statements: [templateNodeInsertStatement({
      id: nodeId,
      templateId: input.templateId,
      parentId: input.parentId,
      kind: input.kind,
      name,
      sortOrder,
      now,
    })],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateNodeMutationReceipt,
    `Could not add the ${input.kind}.`,
  );

  const node = await requireTemplateNode(database, committed.templateId, committed.nodeId);
  revalidateTemplateEditorPaths(input.templateId);
  return { node };
}

export async function renameEstimateTemplateNode(input: {
  intentId?: string;
  templateId: string;
  nodeId: string;
  name: string;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);

  const name = input.name.trim();
  if (!name) throw new Error("Node name is required.");
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template_editor.rename_node",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, nodeId: input.nodeId, name },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateNodeMutationReceipt);
  if (replay) return { nodeId: replay.nodeId, name: replay.name ?? name };
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database, workspaceId: workspace.id, templateId: input.templateId, identity,
    actorUserId: currentUser.userId, confirmation: input.confirmation,
  });
  const node = await requireTemplateNode(database, template.id, input.nodeId);
  const timestamp = nowIso();
  const result: TemplateNodeMutationReceipt = { templateId: template.id, nodeId: node.id, name };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "rename_node",
    timestamp,
    result,
    metadata: { nodeId: node.id },
    statements: [{
      sql: `
      UPDATE estimate_template_nodes
      SET name = ?, updated_at = ?
      WHERE id = ?
        AND template_id = ?
        AND updated_at = ?
    `,
      values: [name, timestamp, node.id, template.id, node.updated_at],
    }],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateNodeMutationReceipt,
    "Could not rename the node.",
  );

  revalidateTemplateEditorPaths(input.templateId);
  return { nodeId: committed.nodeId, name: committed.name ?? name };
}

export async function deleteEstimateTemplateNode(input: {
  intentId?: string;
  templateId: string;
  nodeId: string;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template_editor.delete_node",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, nodeId: input.nodeId },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateNodeListMutationReceipt);
  if (replay) return { deletedNodeIds: replay.nodeIds };
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database, workspaceId: workspace.id, templateId: input.templateId, identity,
    actorUserId: currentUser.userId, confirmation: input.confirmation,
  });
  await requireTemplateNode(database, template.id, input.nodeId);

  const allNodes = await readAllTemplateNodes(database, input.templateId);
  const childrenByParent = new Map<string | null, string[]>();
  for (const node of allNodes) {
    const siblings = childrenByParent.get(node.parent_id) ?? [];
    siblings.push(node.id);
    childrenByParent.set(node.parent_id, siblings);
  }
  const subtreeIds: string[] = [];
  const queue = [input.nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    subtreeIds.push(current);
    queue.push(...(childrenByParent.get(current) ?? []));
  }

  const timestamp = nowIso();
  const result: TemplateNodeListMutationReceipt = { templateId: template.id, nodeIds: subtreeIds };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "delete_node",
    timestamp,
    result,
    metadata: { rootNodeId: input.nodeId, deletedNodeCount: subtreeIds.length },
    statements: [
      {
        sql: `
          DELETE FROM estimate_template_row_items
          WHERE template_id = ?
            AND template_node_id IN (${placeholders(subtreeIds)})
        `,
        values: [template.id, ...subtreeIds],
      },
      {
        sql: `
          DELETE FROM estimate_template_nodes
          WHERE template_id = ?
            AND id IN (${placeholders(subtreeIds)})
        `,
        values: [template.id, ...subtreeIds],
      },
    ],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateNodeListMutationReceipt,
    "Could not delete the node.",
  );

  revalidateTemplateEditorPaths(input.templateId);
  return { deletedNodeIds: committed.nodeIds };
}

export async function moveEstimateTemplateNode(input: {
  intentId?: string;
  templateId: string;
  nodeId: string;
  parentId: string | null;
  /** Sibling ids under the new parent, in final order, including the moved node. */
  orderedSiblingIds: string[];
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template_editor.move_node",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: {
      templateId: input.templateId,
      nodeId: input.nodeId,
      parentId: input.parentId,
      orderedSiblingIds: input.orderedSiblingIds,
    },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateNodeMutationReceipt);
  if (replay) return { nodeId: replay.nodeId, parentId: replay.parentId ?? null };
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database, workspaceId: workspace.id, templateId: input.templateId, identity,
    actorUserId: currentUser.userId, confirmation: input.confirmation,
  });
  const node = await requireTemplateNode(database, template.id, input.nodeId);
  const allNodes = (await readAllTemplateNodes(database, template.id)).map(toTemplateNode);

  if (input.parentId === null && node.kind !== "group") {
    throw new Error("Only groups can sit at the template root.");
  }
  if (input.parentId !== null) {
    if (input.parentId === input.nodeId) throw new Error("A node cannot be its own parent.");
    const parent = allNodes.find((entry) => entry.id === input.parentId);
    if (!parent) throw new Error("Template node not found.");
    if (parent.kind !== "group") throw new Error("Groups and areas can only be moved under a group.");

    const parentById = new Map(allNodes.map((entry) => [entry.id, entry.parent_id]));
    let ancestor: string | null = input.parentId;
    while (ancestor) {
      if (ancestor === input.nodeId) throw new Error("A node cannot move into its own subtree.");
      ancestor = parentById.get(ancestor) ?? null;
    }
  }

  if (input.orderedSiblingIds.some((siblingId) => !isUuid(siblingId))) {
    throw new Error("The sibling order contains an invalid node.");
  }
  const orderedSiblingIds = [...input.orderedSiblingIds];
  if (new Set(orderedSiblingIds).size !== orderedSiblingIds.length) {
    throw new Error("The sibling order contains duplicate nodes.");
  }
  const expectedSiblingIds = allNodes
    .filter((entry) => entry.parent_id === input.parentId && entry.id !== node.id)
    .map((entry) => entry.id)
    .concat(node.id);
  if (
    orderedSiblingIds.length !== expectedSiblingIds.length
    || expectedSiblingIds.some((siblingId) => !orderedSiblingIds.includes(siblingId))
  ) {
    throw new Error("The sibling order no longer matches the target group.");
  }

  const timestamp = nowIso();
  const result: TemplateNodeMutationReceipt = {
    templateId: template.id,
    nodeId: node.id,
    parentId: input.parentId,
  };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "move_node",
    timestamp,
    result,
    metadata: { nodeId: node.id, siblingCount: orderedSiblingIds.length },
    statements: [
      {
        sql: `
          UPDATE estimate_template_nodes
          SET parent_id = ?, updated_at = ?
          WHERE id = ?
            AND template_id = ?
            AND updated_at = ?
        `,
        values: [input.parentId, timestamp, node.id, template.id, node.updated_at],
      },
      ...orderedSiblingIds.map((siblingId, index) => ({
        sql: `
          UPDATE estimate_template_nodes
          SET sort_order = ?, updated_at = ?
          WHERE id = ?
            AND template_id = ?
        `,
        values: [index, timestamp, siblingId, template.id] as D1Value[],
      })),
    ],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateNodeMutationReceipt,
    "Could not move the node.",
  );

  revalidateTemplateEditorPaths(input.templateId);
  return { nodeId: committed.nodeId, parentId: committed.parentId ?? null };
}

function buildTemplateRowInsert(input: {
  templateId: string;
  nodeId: string;
  sortOrder: number;
  libraryItem: EstimateRowItem;
}): TemplateRowInsert {
  const item = input.libraryItem;
  const sourceLibraryItemId = item.sourceLibraryItemId ?? (item.source === "library" ? item.id : null);
  const priceOptions = sanitizeEstimateRowPriceOptionsSnapshot(item.priceOptions ?? []);
  const sourceSnapshot = sanitizeEstimateRowSourceSnapshot({
    source: item.source,
    sourceType: sourceLibraryItemId ? "library_component" : null,
    sourceComponentId: sourceLibraryItemId,
    sourceLibraryItemId,
    sourceUpdatedAt: item.updatedAt ?? null,
    category: item.category,
    categoryNodeId: item.categoryNodeId ?? null,
    categoryPath: item.categoryPath ?? [],
    brand: item.brand ?? null,
    brandId: item.brandId ?? null,
    supplier: item.supplier ?? null,
    supplierId: item.supplierId ?? null,
    componentVersionId: item.componentVersionId ?? null,
    componentVersionNumber: item.componentVersionNumber ?? null,
    lifecycleState: item.lifecycleState ?? null,
    priceOptionId: item.priceOptionId ?? null,
    priceOptionLabel: item.priceOptionLabel ?? null,
    priceOptions: priceOptions ?? [],
    pricingDate: item.pricingDate,
    pricingSource: item.pricingSource,
    sourceUrl: item.sourceUrl ?? null,
    imageUrl: item.imageUrl ?? null,
    tags: item.tags ?? [],
    unit: item.unit,
    unit_cost: item.itemCost,
    misc_cost: item.miscCost,
    currency: item.currency ?? "PHP",
  }) as Json;
  return {
    template_id: input.templateId,
    template_node_id: input.nodeId,
    sort_order: input.sortOrder,
    source_library_item_id: sourceLibraryItemId,
    source_snapshot: sourceSnapshot,
    pricing_provenance_origin: sourceLibraryItemId ? "recorded" : "missing",
    category_node_id: item.categoryNodeId ?? null,
    supplier_id: item.supplierId ?? null,
    material: item.name?.trim() || item.material,
    description: item.description ?? "",
    supplier: item.supplier ?? "",
    unit: item.unit || "unit",
    quantity: item.quantity > 0 ? item.quantity : 1,
    unit_cost: item.itemCost ?? 0,
    misc_cost: item.miscCost ?? 0,
    contingency_percentage: 0,
    adjustment_percentage: item.adjustmentPercentage ?? item.contingencyPercentage ?? 0,
    discipline: item.discipline ?? "",
    designation: item.designation ?? "",
    link_state: sourceLibraryItemId ? "linked-clean" : "unlinked",
    metadata: {},
  };
}

export async function addEstimateTemplateRowItems(input: {
  intentId?: string;
  templateId: string;
  nodeId: string;
  libraryItems: EstimateRowItem[];
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  if (input.libraryItems.length === 0) throw new Error("No components to add.");
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template_editor.add_component_rows",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, nodeId: input.nodeId, libraryItems: input.libraryItems },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateRowListMutationReceipt);
  if (replay) {
    return { rows: await readTemplateRowItemsByIds(database, replay.templateId, replay.rowIds) };
  }
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database, workspaceId: workspace.id, templateId: input.templateId, identity,
    actorUserId: currentUser.userId, confirmation: input.confirmation,
  });
  const node = await requireTemplateNode(database, template.id, input.nodeId);
  if (node.kind !== "area") throw new Error("Components can only be added to an area.");

  const lastRow = await first<{ sort_order: number | null }>(
    database,
    `
      SELECT sort_order
      FROM estimate_template_row_items
      WHERE template_node_id = ?
      ORDER BY sort_order DESC
      LIMIT 1
    `,
    [input.nodeId],
    "Could not read the row order.",
  );
  const baseSortOrder = Number(lastRow?.sort_order ?? -1) + 1;
  const now = nowIso();
  const inserts = input.libraryItems.map((libraryItem, index) => ({
    id: randomUUID(),
    created_at: now,
    updated_at: now,
    ...buildTemplateRowInsert({
      templateId: input.templateId,
      nodeId: input.nodeId,
      sortOrder: baseSortOrder + index,
      libraryItem,
    }),
  }));

  const result: TemplateRowListMutationReceipt = {
    templateId: template.id,
    rowIds: inserts.map((row) => row.id),
  };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "add_component_rows",
    timestamp: now,
    result,
    metadata: { nodeId: node.id, rowCount: inserts.length },
    statements: inserts.map((row) => templateRowItemInsertStatement({ ...row, now })),
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateRowListMutationReceipt,
    "Could not add the rows.",
  );
  const rows = await readTemplateRowItemsByIds(database, committed.templateId, committed.rowIds);

  revalidateTemplateEditorPaths(input.templateId);
  return { rows };
}

export async function createEstimateTemplateAllowanceRow(input: {
  intentId?: string;
  templateId: string;
  nodeId: string;
  material: string;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);

  const material = input.material.trim();
  if (!material) throw new Error("Row name is required.");
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template_editor.create_allowance_row",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, nodeId: input.nodeId, material },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateRowMutationReceipt);
  if (replay) {
    const row = await readTemplateRowItem(database, replay.templateId, replay.rowId);
    if (!row) throw new Error("The committed Template row no longer exists.");
    return { row };
  }
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database, workspaceId: workspace.id, templateId: input.templateId, identity,
    actorUserId: currentUser.userId, confirmation: input.confirmation,
  });
  const node = await requireTemplateNode(database, template.id, input.nodeId);
  if (node.kind !== "area") throw new Error("Rows can only be added to an area.");

  const lastRow = await first<{ sort_order: number | null }>(
    database,
    `
      SELECT sort_order
      FROM estimate_template_row_items
      WHERE template_node_id = ?
      ORDER BY sort_order DESC
      LIMIT 1
    `,
    [input.nodeId],
    "Could not read the row order.",
  );
  const now = nowIso();
  const row: EstimateTemplateRowItem = {
    id: randomUUID(),
    template_id: input.templateId,
    template_node_id: input.nodeId,
    sort_order: Number(lastRow?.sort_order ?? -1) + 1,
    source_library_item_id: null,
    source_snapshot: null,
    pricing_provenance_origin: "missing",
    category_node_id: null,
    supplier_id: null,
    material,
    description: "",
    supplier: "",
    unit: "unit",
    quantity: 1,
    unit_cost: 0,
    misc_cost: 0,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    discipline: "",
    designation: "",
    link_state: "unlinked",
    metadata: {},
    created_at: now,
    updated_at: now,
  };

  const result: TemplateRowMutationReceipt = { templateId: template.id, rowId: row.id };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "create_allowance_row",
    timestamp: now,
    result,
    metadata: { nodeId: node.id, rowId: row.id },
    statements: [templateRowItemInsertStatement({ ...row, now })],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateRowMutationReceipt,
    "Could not add the allowance row.",
  );
  const insertedRow = await readTemplateRowItem(database, committed.templateId, committed.rowId);
  if (!insertedRow) throwActionError("Could not add the allowance row.");

  revalidateTemplateEditorPaths(input.templateId);
  return { row: insertedRow };
}

export async function updateEstimateTemplateRowItem(input: {
  intentId?: string;
  templateId: string;
  rowId: string;
  patch: TemplateEditorRowPatch;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  if (!isUuid(input.rowId)) throw new Error("Template row not found.");
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template_editor.update_row",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, rowId: input.rowId, patch: input.patch },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateRowMutationReceipt);
  if (replay) {
    const row = await readTemplateRowItem(database, replay.templateId, replay.rowId);
    if (!row) throw new Error("The committed Template row no longer exists.");
    return { row };
  }
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database, workspaceId: workspace.id, templateId: input.templateId, identity,
    actorUserId: currentUser.userId, confirmation: input.confirmation,
  });
  const currentRow = await readTemplateRowItem(database, template.id, input.rowId);
  if (!currentRow) throw new Error("Template row not found.");

  const update: TemplateRowUpdate = {};
  if (input.patch.material !== undefined) {
    const material = input.patch.material.trim();
    if (!material) throw new Error("Row name is required.");
    update.material = material;
  }
  if (input.patch.description !== undefined) update.description = input.patch.description.trim();
  if (input.patch.unit !== undefined) {
    const unit = input.patch.unit.trim();
    if (!unit) throw new Error("Unit is required.");
    update.unit = unit;
  }
  if (input.patch.quantity !== undefined) {
    if (!Number.isFinite(input.patch.quantity) || input.patch.quantity < 0) throw new Error("Quantity must be a non-negative number.");
    update.quantity = input.patch.quantity;
  }
  if (input.patch.unitCost !== undefined) {
    if (!Number.isFinite(input.patch.unitCost) || input.patch.unitCost < 0) throw new Error("Unit cost must be a non-negative number.");
    update.unit_cost = input.patch.unitCost;
  }
  if (input.patch.miscCost !== undefined) {
    if (!Number.isFinite(input.patch.miscCost) || input.patch.miscCost < 0) throw new Error("Misc cost must be a non-negative number.");
    update.misc_cost = input.patch.miscCost;
  }
  if (input.patch.contingencyPercentage !== undefined) {
    if (!Number.isFinite(input.patch.contingencyPercentage) || Math.abs(input.patch.contingencyPercentage) > 100) {
      throw new Error("Adjustment must stay between -100 and 100 percent.");
    }
    update.adjustment_percentage = input.patch.contingencyPercentage;
  }
  if (input.patch.adjustmentPercentage !== undefined) {
    if (!Number.isFinite(input.patch.adjustmentPercentage) || Math.abs(input.patch.adjustmentPercentage) > 100) {
      throw new Error("Adjustment must stay between -100 and 100 percent.");
    }
    update.adjustment_percentage = input.patch.adjustmentPercentage;
  }
  const entries = Object.entries(update) as Array<[keyof TemplateRowUpdate, D1Value]>;
  if (entries.length === 0) throw new Error("Nothing to update.");
  const nonAdjustmentEntries = entries.filter(([column]) => column !== "adjustment_percentage");
  const canonicalAdjustment = update.adjustment_percentage
    ?? (currentRow.adjustment_percentage !== 0 || currentRow.contingency_percentage === 0
      ? currentRow.adjustment_percentage
      : currentRow.contingency_percentage);
  const timestamp = nowIso();
  const result: TemplateRowMutationReceipt = { templateId: template.id, rowId: currentRow.id };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "update_row",
    timestamp,
    result,
    metadata: { rowId: currentRow.id },
    statements: [{
      sql: `
      UPDATE estimate_template_row_items
      SET ${nonAdjustmentEntries.map(([column]) => `${column} = ?, `).join("")}adjustment_percentage = ?, contingency_percentage = 0, updated_at = ?
      WHERE id = ?
        AND template_id = ?
        AND updated_at = ?
    `,
      values: [
        ...nonAdjustmentEntries.map(([, value]) => value),
        canonicalAdjustment,
        timestamp,
        currentRow.id,
        template.id,
        currentRow.updated_at,
      ],
    }],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateRowMutationReceipt,
    "Could not update the row.",
  );
  const row = await readTemplateRowItem(database, committed.templateId, committed.rowId);
  if (!row) throw new Error("Template row not found.");

  revalidateTemplateEditorPaths(input.templateId);
  return { row };
}

export async function removeEstimateTemplateRowItem(input: {
  intentId?: string;
  templateId: string;
  rowId: string;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  if (!isUuid(input.rowId)) throw new Error("Template row not found.");
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template_editor.remove_row",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: { templateId: input.templateId, rowId: input.rowId },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateRowMutationReceipt);
  if (replay) return { rowId: replay.rowId };
  const { template, impact, retention } = await prepareTemplateEditorMutationContext({
    database, workspaceId: workspace.id, templateId: input.templateId, identity,
    actorUserId: currentUser.userId, confirmation: input.confirmation,
  });

  const row = await readTemplateRowItem(database, template.id, input.rowId);
  if (!row) throw new Error("Template row not found.");
  const timestamp = nowIso();
  const result: TemplateRowMutationReceipt = { templateId: template.id, rowId: row.id };
  const statements = buildTemplateEditorMutationStatements({
    template,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "remove_row",
    timestamp,
    result,
    metadata: { rowId: row.id },
    statements: [{
      sql: `
      DELETE FROM estimate_template_row_items
      WHERE id = ?
        AND template_id = ?
        AND updated_at = ?
    `,
      values: [row.id, template.id, row.updated_at],
    }],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateRowMutationReceipt,
    "Could not remove the row.",
  );

  revalidateTemplateEditorPaths(input.templateId);
  return { rowId: committed.rowId };
}

/**
 * Copies another template's subtree into the target template (composition,
 * Phase 3.5). Copy semantics mean cycles cannot form; self-insert is still
 * rejected as a footgun.
 */
export async function insertTemplateIntoTemplate(input: {
  intentId?: string;
  targetTemplateId: string;
  targetNodeId: string | null;
  sourceTemplateId: string;
  /** Copy only this node's subtree instead of the whole source template. */
  sourceNodeId?: string | null;
  confirmation?: EstimateTemplateMutationConfirmation;
}) {
  const [{ workspace }, currentUser] = await Promise.all([ensureDefaultWorkspace(), requireCurrentUserContext()]);
  const database = await requireTemplateEditorD1Database();
  await requireTemplateEditorAccess(database, workspace.id, currentUser);
  if (input.targetTemplateId === input.sourceTemplateId) {
    throw new Error("A template cannot be inserted into itself.");
  }
  const identity = createTemplateMutationIdentity({
    workspaceId: workspace.id,
    commandKind: "template_editor.insert_template",
    intentId: input.intentId,
    actorUserId: currentUser.userId,
    request: {
      targetTemplateId: input.targetTemplateId,
      targetNodeId: input.targetNodeId,
      sourceTemplateId: input.sourceTemplateId,
      sourceNodeId: input.sourceNodeId ?? null,
    },
  });
  const replay = await readCommittedTemplateMutation(database, identity, parseTemplateNodeListMutationReceipt);
  if (replay) return { insertedNodeIds: replay.nodeIds };
  const [{ template: targetTemplate, impact, retention }, sourceTemplate] = await Promise.all([
    prepareTemplateEditorMutationContext({
      database,
      workspaceId: workspace.id,
      templateId: input.targetTemplateId,
      identity,
      actorUserId: currentUser.userId,
      confirmation: input.confirmation,
    }),
    requireWorkspaceTemplate(database, workspace.id, input.sourceTemplateId),
  ]);
  if (input.targetNodeId !== null) {
    const target = await requireTemplateNode(database, targetTemplate.id, input.targetNodeId);
    if (target.kind !== "group") throw new Error("Templates can only be inserted under a group.");
  }

  const [sourceNodes, sourceRows] = await Promise.all([
    all<EstimateTemplateNodeD1Row>(
      database,
      `
        SELECT id, template_id, parent_id, kind, name, sort_order, metadata, created_at, updated_at
        FROM estimate_template_nodes
        WHERE template_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [input.sourceTemplateId],
      "Could not load the source template.",
    ),
    all<EstimateTemplateRowItemD1Row>(
      database,
      `
        SELECT *
        FROM estimate_template_row_items
        WHERE template_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
      [input.sourceTemplateId],
      "Could not load the source rows.",
    ),
  ]);

  let nodesToCopy = sourceNodes.map(toTemplateNode);
  let rowsToCopy = sourceRows.map(toTemplateRowItem);
  if (input.sourceNodeId) {
    const childrenByParent = new Map<string | null, EstimateTemplateNode[]>();
    for (const node of nodesToCopy) {
      const siblings = childrenByParent.get(node.parent_id) ?? [];
      siblings.push(node);
      childrenByParent.set(node.parent_id, siblings);
    }
    const subtree: EstimateTemplateNode[] = [];
    const root = nodesToCopy.find((node) => node.id === input.sourceNodeId);
    if (!root) throw new Error("The source template node no longer exists.");
    const queue = [root];
    while (queue.length > 0) {
      const node = queue.shift()!;
      subtree.push(node);
      queue.push(...(childrenByParent.get(node.id) ?? []));
    }
    const subtreeIds = new Set(subtree.map((node) => node.id));
    nodesToCopy = subtree.map((node) => (node.id === root.id ? { ...node, parent_id: null } : node));
    rowsToCopy = rowsToCopy.filter((row) => subtreeIds.has(row.template_node_id));
  }
  if (nodesToCopy.length === 0) throw new Error("The source template has no structure to insert.");

  const baseSortOrder = await nextSiblingSortOrder(database, input.targetTemplateId, input.targetNodeId);
  const idMap = new Map<string, string>(nodesToCopy.map((node) => [node.id, randomUUID()]));
  const now = nowIso();
  const nodeInserts = nodesToCopy.map((node, index) =>
    templateNodeInsertStatement({
      id: idMap.get(node.id)!,
      templateId: input.targetTemplateId,
      parentId: node.parent_id ? idMap.get(node.parent_id) ?? null : input.targetNodeId,
      kind: node.kind,
      name: node.name,
      sortOrder: node.parent_id ? node.sort_order : baseSortOrder + index,
      metadata: node.metadata,
      now,
    }),
  );

  const rowInserts = rowsToCopy.map((row) => {
    const copiedNodeId = idMap.get(row.template_node_id);
    if (!copiedNodeId) throw new Error("The source template row no longer has a matching node.");
    return templateRowItemInsertStatement({
      ...row,
      id: randomUUID(),
      template_id: input.targetTemplateId,
      template_node_id: copiedNodeId,
      pricing_provenance_origin: toDetachedTemplatePricingProvenance(row.pricing_provenance_origin),
      contingency_percentage: 0,
      adjustment_percentage: row.adjustment_percentage !== 0 || row.contingency_percentage === 0
        ? row.adjustment_percentage
        : row.contingency_percentage,
      created_at: now,
      updated_at: now,
      now,
    });
  });

  const sourceGuard: TemplateMutationStatement = {
    sql: `
      SELECT CASE WHEN
        EXISTS (
          SELECT 1 FROM estimate_templates
          WHERE id = ? AND workspace_id = ? AND updated_at = ?
        )
        AND (SELECT COUNT(*) FROM estimate_template_nodes WHERE template_id = ?) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_template_nodes WHERE template_id = ?), '') = ?
        AND (SELECT COUNT(*) FROM estimate_template_row_items WHERE template_id = ?) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_template_row_items WHERE template_id = ?), '') = ?
      THEN 1 ELSE json('') END AS template_composition_source_guard
    `,
    values: [
      sourceTemplate.id,
      workspace.id,
      sourceTemplate.updated_at,
      sourceTemplate.id,
      sourceNodes.length,
      sourceTemplate.id,
      latestUpdatedAt(sourceNodes),
      sourceTemplate.id,
      sourceRows.length,
      sourceTemplate.id,
      latestUpdatedAt(sourceRows),
    ],
  };
  const result: TemplateNodeListMutationReceipt = {
    templateId: targetTemplate.id,
    nodeIds: Array.from(idMap.values()),
  };
  const statements = buildTemplateEditorMutationStatements({
    template: targetTemplate,
    impact,
    identity,
    actorUserId: currentUser.userId,
    action: "insert_template",
    timestamp: now,
    result,
    metadata: {
      sourceTemplateId: sourceTemplate.id,
      insertedNodeCount: nodeInserts.length,
      insertedRowCount: rowInserts.length,
    },
    statements: [sourceGuard, ...nodeInserts, ...rowInserts],
  });
  const committed = await commitTemplateMutation(
    database,
    identity,
    retention,
    statements,
    result,
    parseTemplateNodeListMutationReceipt,
    "Could not insert the template.",
  );

  revalidateTemplateEditorPaths(input.targetTemplateId);
  return { insertedNodeIds: committed.nodeIds };
}
