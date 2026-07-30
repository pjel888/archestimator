import "server-only";

import { randomUUID } from "node:crypto";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Value } from "@/lib/cloudflare/d1";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import { assertD1MutationStatementLimit, MutationIntentConflictError } from "@/lib/estimates/mutation-receipts";

import { serializeAssemblyQuantityRule, type AssemblyQuantityRule } from "./assembly-quantity-rule";
import { prepareHistoryEventInsert } from "./d1-intents/history-events";
import {
  buildProjectPublicationRevisionForEstimate,
  prepareEstimateMutationIntent,
  readConcurrentEstimateMutationReceipt,
  type EstimateD1Actor,
  type EstimateMutationIntentContext,
} from "./d1-intents/intent-context";

const CREATE_ACCESSORY_EDGE_COMMAND = "material_assembly.create_accessory_edge";
const UPDATE_ACCESSORY_EDGE_COMMAND = "material_assembly.update_accessory_edge";
const DELETE_ACCESSORY_EDGE_COMMAND = "material_assembly.delete_accessory_edge";
const BULK_ASSEMBLY_COMMAND = "material_assembly.bulk_apply";

export type MaterialAssemblyEdgeMode = "required" | "optional";

export type MaterialAssemblyMutationErrorCode =
  | "invalid_input"
  | "not_authorized"
  | "not_found"
  | "revision_conflict"
  | "intent_conflict"
  | "persistence_unavailable";

export class MaterialAssemblyMutationError extends Error {
  constructor(
    readonly code: MaterialAssemblyMutationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "MaterialAssemblyMutationError";
  }
}

export type MaterialAssemblyEdgeSnapshot = {
  edgeId: string;
  contributionScopeId: string;
  parentRowItemId: string;
  childRowItemId: string;
  mode: MaterialAssemblyEdgeMode;
  isIncluded: boolean;
  quantityRule: AssemblyQuantityRule;
  edgeRevision: number;
  contributionRevision: number;
};

export type CreateMaterialAssemblyEdgeResult = MaterialAssemblyEdgeSnapshot & {
  kind: "accessory_edge_created";
  replayed: boolean;
};

export type UpdateMaterialAssemblyEdgeResult = MaterialAssemblyEdgeSnapshot & {
  kind: "accessory_edge_updated";
  changed: boolean;
  replayed: boolean;
};

export type DeleteMaterialAssemblyEdgeResult = {
  kind: "accessory_edge_deleted";
  edgeId: string;
  contributionScopeId: string;
  contributionRevision: number;
  replayed: boolean;
};

type MaterialAssemblyReceiptResult =
  | Omit<CreateMaterialAssemblyEdgeResult, "replayed">
  | Omit<UpdateMaterialAssemblyEdgeResult, "replayed">
  | Omit<DeleteMaterialAssemblyEdgeResult, "replayed">
  | Omit<ApplyMaterialAssemblyBulkResult, "replayed">;

type MaterialAssemblyMutationBase = {
  database: D1DatabaseLike;
  actor: EstimateD1Actor;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  edgeId: string;
  intentId: string;
  now?: string;
};

type MaterialAssemblyEdgeWrite = {
  parentRowItemId: string;
  childRowItemId: string;
  mode: MaterialAssemblyEdgeMode;
  isIncluded: boolean;
  quantityRule: unknown;
};

export type CreateMaterialAssemblyEdgeInput = MaterialAssemblyMutationBase
  & MaterialAssemblyEdgeWrite
  & { expectedContributionRevision: number };

export type UpdateMaterialAssemblyEdgeInput = MaterialAssemblyMutationBase
  & MaterialAssemblyEdgeWrite
  & { expectedEdgeRevision: number; expectedContributionRevision: number };

export type DeleteMaterialAssemblyEdgeInput = MaterialAssemblyMutationBase & {
  expectedEdgeRevision: number;
  expectedContributionRevision: number;
};

export type ApplyMaterialAssemblyBulkInput = Omit<MaterialAssemblyMutationBase, "edgeId"> & {
  expectedContributionRevision: number | null;
  operation:
    | {
        kind: "configure_accessories";
        edges: readonly (MaterialAssemblyEdgeWrite & {
          edgeId: string;
          expectedEdgeRevision: number | null;
        })[];
      }
    | {
        kind: "remove_roles";
        changedRowItemIds: readonly string[];
        groups: readonly { groupId: string; expectedGroupRevision: number }[];
        optionalRows: readonly { rowItemId: string; expectedOptionalRevision: number }[];
        edges: readonly { edgeId: string; expectedEdgeRevision: number }[];
      };
};

export type ApplyMaterialAssemblyBulkResult = {
  kind: "material_assembly_bulk_applied";
  contributionScopeId: string;
  contributionRevision: number;
  changed: boolean;
  changedRowItemIds: string[];
  changedGroupIds: string[];
  changedEdgeIds: string[];
  replayed: boolean;
};

type EndpointScopeRow = {
  contribution_revision: number;
};

type ScopeStateRow = { id: string; revision: number };

type EdgeStateRow = {
  parent_row_item_id: string;
  child_row_item_id: string;
  mode: MaterialAssemblyEdgeMode;
  is_included: number | boolean;
  quantity_rule_json: string;
  edge_revision: number;
  contribution_revision: number;
};

function requiredIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new MaterialAssemblyMutationError("invalid_input", `${label} is required.`);
  return normalized;
}

function positiveRevision(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new MaterialAssemblyMutationError("invalid_input", `${label} must be a positive integer.`);
  }
  return value;
}

function normalizedTimestamp(value: string | undefined) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new MaterialAssemblyMutationError("invalid_input", "Mutation timestamp is invalid.");
  }
  return date.toISOString();
}

function guardedTimestamp(now: string, requestFingerprint: string) {
  const suffix = (Number.parseInt(requestFingerprint.slice(0, 12), 16) % 1_000_000_000_000)
    .toString()
    .padStart(12, "0");
  return `${now.slice(0, -1)}${suffix}Z`;
}

function d1Value(value: unknown): D1Value {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
    || value instanceof ArrayBuffer
  ) return value;
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function prepare(
  database: D1DatabaseLike,
  statement: { sql: string; values?: readonly unknown[] },
): D1PreparedStatementLike {
  return database.prepare(statement.sql).bind(...(statement.values ?? []).map(d1Value));
}

function readBoolean(value: number | boolean) {
  return value === true || value === 1;
}

function readQuantityRule(value: string) {
  try {
    const serialized = serializeAssemblyQuantityRule(JSON.parse(value) as unknown);
    if (serialized.ok) return serialized.rule;
  } catch {
  }
  throw new MaterialAssemblyMutationError("persistence_unavailable", "The stored accessory quantity rule is invalid.");
}

function normalizeMode(mode: MaterialAssemblyEdgeMode) {
  if (mode !== "required" && mode !== "optional") {
    throw new MaterialAssemblyMutationError("invalid_input", "Accessory mode must be required or optional.");
  }
  return mode;
}

function normalizeIncluded(mode: MaterialAssemblyEdgeMode, isIncluded: boolean) {
  if (typeof isIncluded !== "boolean") {
    throw new MaterialAssemblyMutationError("invalid_input", "Accessory inclusion must be a boolean.");
  }
  if (mode === "required" && !isIncluded) {
    throw new MaterialAssemblyMutationError("invalid_input", "Required accessories must be included.");
  }
  return isIncluded;
}

function normalizeQuantityRule(value: unknown) {
  const serialized = serializeAssemblyQuantityRule(value);
  if (!serialized.ok) {
    throw new MaterialAssemblyMutationError("invalid_input", serialized.error.message);
  }
  return serialized;
}

function normalizeBase<T extends MaterialAssemblyMutationBase>(rawInput: T) {
  const input = {
    ...rawInput,
    projectId: requiredIdentifier(rawInput.projectId, "Project"),
    estimateId: requiredIdentifier(rawInput.estimateId, "Estimate"),
    estimateTabId: requiredIdentifier(rawInput.estimateTabId, "Estimate tab"),
    contributionScopeId: requiredIdentifier(rawInput.contributionScopeId, "Contribution scope"),
    edgeId: requiredIdentifier(rawInput.edgeId, "Accessory edge"),
    intentId: requiredIdentifier(rawInput.intentId, "Mutation intent"),
  };
  if (input.intentId.length > 128) {
    throw new MaterialAssemblyMutationError("invalid_input", "Mutation intent is too long.");
  }
  return input;
}

function normalizeEdgeWrite<T extends MaterialAssemblyEdgeWrite>(rawInput: T) {
  const mode = normalizeMode(rawInput.mode);
  const parentRowItemId = requiredIdentifier(rawInput.parentRowItemId, "Parent row");
  const childRowItemId = requiredIdentifier(rawInput.childRowItemId, "Child row");
  if (parentRowItemId === childRowItemId) {
    throw new MaterialAssemblyMutationError("invalid_input", "An accessory cannot be attached to itself.");
  }
  const quantityRule = normalizeQuantityRule(rawInput.quantityRule);
  return {
    parentRowItemId,
    childRowItemId,
    mode,
    isIncluded: normalizeIncluded(mode, rawInput.isIncluded),
    quantityRule,
  };
}

function isReceiptBase(value: { edgeId?: unknown; contributionScopeId?: unknown; contributionRevision?: unknown }) {
  return typeof value.edgeId === "string"
    && typeof value.contributionScopeId === "string"
    && Number.isSafeInteger(value.contributionRevision);
}

function readReceiptResult(value: unknown): MaterialAssemblyReceiptResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MaterialAssemblyMutationError("persistence_unavailable", "The committed material-assembly receipt is invalid.");
  }
  const result = value as Partial<MaterialAssemblyReceiptResult>;
  if (result.kind === "material_assembly_bulk_applied") {
    if (
      typeof result.contributionScopeId === "string"
      && Number.isSafeInteger(result.contributionRevision)
      && typeof result.changed === "boolean"
      && Array.isArray(result.changedRowItemIds)
      && result.changedRowItemIds.every((entry) => typeof entry === "string")
      && Array.isArray(result.changedGroupIds)
      && result.changedGroupIds.every((entry) => typeof entry === "string")
      && Array.isArray(result.changedEdgeIds)
      && result.changedEdgeIds.every((entry) => typeof entry === "string")
    ) return result as Omit<ApplyMaterialAssemblyBulkResult, "replayed">;
  }
  if (result.kind === "accessory_edge_deleted") {
    if (isReceiptBase(result)) return result as Omit<DeleteMaterialAssemblyEdgeResult, "replayed">;
  } else if (result.kind === "accessory_edge_created") {
    if (
      isReceiptBase(result)
      && typeof result.parentRowItemId === "string"
      && typeof result.childRowItemId === "string"
      && (result.mode === "required" || result.mode === "optional")
      && typeof result.isIncluded === "boolean"
      && Number.isSafeInteger(result.edgeRevision)
      && serializeAssemblyQuantityRule(result.quantityRule).ok
    ) return result as Omit<CreateMaterialAssemblyEdgeResult, "replayed">;
  } else if (result.kind === "accessory_edge_updated") {
    if (
      isReceiptBase(result)
      && typeof result.parentRowItemId === "string"
      && typeof result.childRowItemId === "string"
      && (result.mode === "required" || result.mode === "optional")
      && typeof result.isIncluded === "boolean"
      && Number.isSafeInteger(result.edgeRevision)
      && serializeAssemblyQuantityRule(result.quantityRule).ok
      && typeof result.changed === "boolean"
    ) return result as Omit<UpdateMaterialAssemblyEdgeResult, "replayed">;
  }
  throw new MaterialAssemblyMutationError("persistence_unavailable", "The committed material-assembly receipt is invalid.");
}

function mapIntentError(error: unknown): never {
  if (error instanceof MaterialAssemblyMutationError) throw error;
  if (error instanceof MutationIntentConflictError) {
    throw new MaterialAssemblyMutationError("intent_conflict", error.message, { cause: error });
  }
  if (error instanceof Error && error.message === "Estimate edit access denied.") {
    throw new MaterialAssemblyMutationError("not_authorized", error.message, { cause: error });
  }
  throw error;
}

async function prepareIntent<T extends MaterialAssemblyReceiptResult>(
  database: D1DatabaseLike,
  actor: EstimateD1Actor,
  input: {
    projectId: string;
    estimateId: string;
    intentId: string;
    commandKind: string;
    request: unknown;
  },
) {
  try {
    const prepared = await prepareEstimateMutationIntent<T>(database, actor, {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.intentId,
      commandKind: input.commandKind,
      request: input.request,
    });
    return {
      context: prepared.context,
      committedResult: prepared.committedResult ? readReceiptResult(prepared.committedResult) as T : null,
    };
  } catch (error) {
    mapIntentError(error);
  }
}

function buildGuardedReceiptStatement(input: {
  context: EstimateMutationIntentContext;
  resourceId: string;
  result: MaterialAssemblyReceiptResult;
  timestamp: string;
  guardSql: string;
  guardValues: readonly D1Value[];
  resourceType?: "estimate_accessory_edge" | "estimate_contribution_scope";
}) {
  return {
    sql: `
      INSERT INTO estimate_mutation_receipts (
        id, workspace_id, command_kind, intent_id, actor_user_id,
        resource_type, resource_id, request_fingerprint, status,
        result_json, created_at, updated_at
      )
      VALUES (
        ?, ?, ?, ?,
        (SELECT ? WHERE EXISTS (${input.guardSql})),
        ?, ?, ?, 'committed', ?, ?, ?
      )
    `,
    values: [
      randomUUID(),
      input.context.workspaceId,
      input.context.commandKind,
      input.context.intentId,
      input.context.actorUserId,
      ...input.guardValues,
      input.resourceType ?? "estimate_accessory_edge",
      input.resourceId,
      input.context.requestFingerprint,
      JSON.stringify(input.result),
      input.timestamp,
      input.timestamp,
    ] satisfies D1Value[],
  };
}

async function readConcurrentReceipt<T extends MaterialAssemblyReceiptResult>(
  database: D1DatabaseLike,
  context: EstimateMutationIntentContext,
): Promise<T | null> {
  try {
    const result = await readConcurrentEstimateMutationReceipt<T>(database, context);
    return result ? readReceiptResult(result) as T : null;
  } catch (error) {
    mapIntentError(error);
  }
}

async function readScopeState(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
}) {
  return input.database.prepare<ScopeStateRow>(`
    SELECT id, revision
    FROM estimate_contribution_scopes
    WHERE workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ?
    LIMIT 1
  `).bind(input.workspaceId, input.projectId, input.estimateId, input.estimateTabId).first<ScopeStateRow>();
}

async function readEndpointScope(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  parentRowItemId: string;
  childRowItemId: string;
}) {
  return input.database.prepare<EndpointScopeRow>(`
    SELECT scope.revision AS contribution_revision
    FROM estimate_contribution_scopes AS scope
    JOIN estimate_row_items AS parent_row
      ON parent_row.id = ? AND parent_row.estimate_id = scope.estimate_id
    JOIN estimate_row_items AS child_row
      ON child_row.id = ? AND child_row.estimate_id = scope.estimate_id
    JOIN estimate_nodes AS parent_node
      ON parent_node.id = parent_row.node_id
     AND parent_node.estimate_id = scope.estimate_id
     AND parent_node.estimate_tab_id = scope.estimate_tab_id
    JOIN estimate_nodes AS child_node
      ON child_node.id = child_row.node_id
     AND child_node.estimate_id = scope.estimate_id
     AND child_node.estimate_tab_id = scope.estimate_tab_id
    WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
      AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
      AND parent_row.node_id IS NOT NULL AND parent_row.node_id = child_row.node_id
    LIMIT 1
  `).bind(
    input.parentRowItemId,
    input.childRowItemId,
    input.contributionScopeId,
    input.workspaceId,
    input.projectId,
    input.estimateId,
    input.estimateTabId,
  ).first<EndpointScopeRow>();
}

async function readEdgeState(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  edgeId: string;
}) {
  return input.database.prepare<EdgeStateRow>(`
    SELECT edge.parent_row_item_id, edge.child_row_item_id, edge.mode,
           edge.is_included, edge.quantity_rule_json,
           edge.revision AS edge_revision, scope.revision AS contribution_revision
    FROM estimate_accessory_edges AS edge
    JOIN estimate_contribution_scopes AS scope ON scope.id = edge.contribution_scope_id
    JOIN estimate_row_items AS parent_row
      ON parent_row.id = edge.parent_row_item_id AND parent_row.estimate_id = scope.estimate_id
    JOIN estimate_row_items AS child_row
      ON child_row.id = edge.child_row_item_id AND child_row.estimate_id = scope.estimate_id
    JOIN estimate_nodes AS parent_node
      ON parent_node.id = parent_row.node_id AND parent_node.estimate_tab_id = scope.estimate_tab_id
    JOIN estimate_nodes AS child_node
      ON child_node.id = child_row.node_id AND child_node.estimate_tab_id = scope.estimate_tab_id
    WHERE edge.id = ? AND edge.contribution_scope_id = ?
      AND edge.workspace_id = ? AND edge.project_id = ?
      AND edge.estimate_id = ? AND edge.estimate_tab_id = ?
      AND scope.workspace_id = ? AND scope.project_id = ?
      AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
      AND parent_row.node_id IS NOT NULL AND parent_row.node_id = child_row.node_id
    LIMIT 1
  `).bind(
    input.edgeId,
    input.contributionScopeId,
    input.workspaceId,
    input.projectId,
    input.estimateId,
    input.estimateTabId,
    input.workspaceId,
    input.projectId,
    input.estimateId,
    input.estimateTabId,
  ).first<EdgeStateRow>();
}

function edgeSnapshot(input: {
  edgeId: string;
  contributionScopeId: string;
  parentRowItemId: string;
  childRowItemId: string;
  mode: MaterialAssemblyEdgeMode;
  isIncluded: boolean;
  quantityRule: AssemblyQuantityRule;
  edgeRevision: number;
  contributionRevision: number;
}): MaterialAssemblyEdgeSnapshot {
  return input;
}

function stateSnapshot(
  edgeId: string,
  contributionScopeId: string,
  state: EdgeStateRow,
): MaterialAssemblyEdgeSnapshot {
  return edgeSnapshot({
    edgeId,
    contributionScopeId,
    parentRowItemId: state.parent_row_item_id,
    childRowItemId: state.child_row_item_id,
    mode: state.mode,
    isIncluded: readBoolean(state.is_included),
    quantityRule: readQuantityRule(state.quantity_rule_json),
    edgeRevision: Number(state.edge_revision),
    contributionRevision: Number(state.contribution_revision),
  });
}

async function commitBatch(input: {
  database: D1DatabaseLike;
  statements: Array<{ sql: string; values?: readonly unknown[] }>;
  context: EstimateMutationIntentContext;
}) {
  assertD1MutationStatementLimit(input.statements.length);
  try {
    await runRequiredD1Batch(
      input.database,
      input.statements.map((statement) => prepare(input.database, statement)),
      "Material assembly changes could not be saved.",
    );
  } catch (error) {
    const committed = await readConcurrentReceipt<MaterialAssemblyReceiptResult>(input.database, input.context);
    if (committed) return { ...committed, replayed: true } as
      | CreateMaterialAssemblyEdgeResult
      | UpdateMaterialAssemblyEdgeResult
      | DeleteMaterialAssemblyEdgeResult
      | ApplyMaterialAssemblyBulkResult;
    if (error instanceof MutationIntentConflictError) mapIntentError(error);
    throw error;
  }
  return null;
}

function revisionConflict(message: string, cause?: unknown): MaterialAssemblyMutationError {
  return new MaterialAssemblyMutationError("revision_conflict", message, cause === undefined ? undefined : { cause });
}

export async function createMaterialAssemblyEdge(
  rawInput: CreateMaterialAssemblyEdgeInput,
): Promise<CreateMaterialAssemblyEdgeResult> {
  const input = normalizeBase(rawInput);
  const write = normalizeEdgeWrite(rawInput);
  const expectedContributionRevision = positiveRevision(rawInput.expectedContributionRevision, "Contribution revision");
  const request = {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId,
    edgeId: input.edgeId,
    parentRowItemId: write.parentRowItemId,
    childRowItemId: write.childRowItemId,
    mode: write.mode,
    isIncluded: write.isIncluded,
    quantityRule: write.quantityRule.rule,
    expectedContributionRevision,
  };
  const prepared = await prepareIntent<Omit<CreateMaterialAssemblyEdgeResult, "replayed">>(
    input.database,
    input.actor,
    { ...input, commandKind: CREATE_ACCESSORY_EDGE_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };

  const scope = await readEndpointScope({ ...input, ...write, workspaceId: prepared.context.workspaceId });
  if (!scope) {
    throw new MaterialAssemblyMutationError("not_found", "Accessory endpoints must exist in the same estimate tab and node.");
  }
  if (Number(scope.contribution_revision) !== expectedContributionRevision) {
    throw revisionConflict("Material assembly changed elsewhere. Refresh and try again.");
  }

  const now = normalizedTimestamp(input.now);
  const marker = guardedTimestamp(now, prepared.context.requestFingerprint);
  const result: Omit<CreateMaterialAssemblyEdgeResult, "replayed"> = {
    kind: "accessory_edge_created",
    ...edgeSnapshot({
      edgeId: input.edgeId,
      contributionScopeId: input.contributionScopeId,
      parentRowItemId: write.parentRowItemId,
      childRowItemId: write.childRowItemId,
      mode: write.mode,
      isIncluded: write.isIncluded,
      quantityRule: write.quantityRule.rule,
      edgeRevision: 1,
      contributionRevision: expectedContributionRevision + 1,
    }),
  };
  const guardSql = `
    SELECT 1 FROM estimate_accessory_edges AS edge
    JOIN estimate_contribution_scopes AS scope ON scope.id = edge.contribution_scope_id
    WHERE edge.id = ? AND edge.contribution_scope_id = ?
      AND edge.workspace_id = ? AND edge.project_id = ?
      AND edge.estimate_id = ? AND edge.estimate_tab_id = ?
      AND edge.parent_row_item_id = ? AND edge.child_row_item_id = ?
      AND edge.mode = ? AND edge.is_included = ? AND edge.quantity_rule_json = ?
      AND edge.revision = 1 AND edge.updated_at = ?
      AND scope.revision = ? AND scope.updated_at = ?
  `;
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context,
    resourceId: input.edgeId,
    result,
    timestamp: now,
    guardSql,
    guardValues: [
      input.edgeId, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
      input.estimateId, input.estimateTabId, write.parentRowItemId, write.childRowItemId,
      write.mode, write.isIncluded ? 1 : 0, write.quantityRule.json, marker,
      result.contributionRevision, marker,
    ],
  });
  const history = await prepareHistoryEventInsert(input.database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: prepared.context.workspaceId,
    estimateTabId: input.estimateTabId,
    targetRowId: write.childRowItemId,
    eventType: "accessory_edge_created",
    actorUserId: input.actor.userId,
    correlationId: prepared.context.intentId,
    changedFields: ["accessoryParent", "quantityRule", "isIncluded"],
    oldSnapshot: null,
    newSnapshot: result,
    payload: { contributionScopeId: input.contributionScopeId, edgeId: input.edgeId },
  });
  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [
    {
      sql: `
        INSERT INTO estimate_accessory_edges (
          id, contribution_scope_id, workspace_id, project_id, estimate_id, estimate_tab_id,
          parent_row_item_id, child_row_item_id, mode, is_included, quantity_rule_json,
          revision, created_by, updated_by, created_at, updated_at
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM estimate_contribution_scopes AS scope
          JOIN estimate_row_items AS parent_row ON parent_row.id = ? AND parent_row.estimate_id = scope.estimate_id
          JOIN estimate_row_items AS child_row ON child_row.id = ? AND child_row.estimate_id = scope.estimate_id
          JOIN estimate_nodes AS parent_node ON parent_node.id = parent_row.node_id AND parent_node.estimate_tab_id = scope.estimate_tab_id
          JOIN estimate_nodes AS child_node ON child_node.id = child_row.node_id AND child_node.estimate_tab_id = scope.estimate_tab_id
          WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
            AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ?
            AND parent_row.node_id IS NOT NULL AND parent_row.node_id = child_row.node_id
        )
      `,
      values: [
        input.edgeId, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
        input.estimateId, input.estimateTabId, write.parentRowItemId, write.childRowItemId,
        write.mode, write.isIncluded ? 1 : 0, write.quantityRule.json, input.actor.userId,
        input.actor.userId, now, marker, write.parentRowItemId, write.childRowItemId,
        input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
        input.estimateTabId, expectedContributionRevision,
      ],
    },
    {
      sql: `
        UPDATE estimate_contribution_scopes
        SET revision = revision + 1, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ?
          AND revision = ?
          AND EXISTS (
            SELECT 1 FROM estimate_accessory_edges
            WHERE id = ? AND contribution_scope_id = ? AND revision = 1 AND updated_at = ?
          )
      `,
      values: [
        marker, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
        input.estimateId, input.estimateTabId, expectedContributionRevision,
        input.edgeId, input.contributionScopeId, marker,
      ],
    },
    receipt,
    buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);

  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "accessory_edge_created") return replay;
  } catch (error) {
    const latest = await readEdgeState({ ...input, workspaceId: prepared.context.workspaceId });
    if (latest || Number((await readEndpointScope({ ...input, ...write, workspaceId: prepared.context.workspaceId }))?.contribution_revision) !== expectedContributionRevision) {
      throw revisionConflict("Material assembly changed elsewhere. Refresh and try again.", error);
    }
    throw new MaterialAssemblyMutationError("persistence_unavailable", "Material assembly changes could not be saved.", { cause: error });
  }
  return { ...result, replayed: false };
}

export async function updateMaterialAssemblyEdge(
  rawInput: UpdateMaterialAssemblyEdgeInput,
): Promise<UpdateMaterialAssemblyEdgeResult> {
  const input = normalizeBase(rawInput);
  const write = normalizeEdgeWrite(rawInput);
  const expectedEdgeRevision = positiveRevision(rawInput.expectedEdgeRevision, "Accessory edge revision");
  const expectedContributionRevision = positiveRevision(rawInput.expectedContributionRevision, "Contribution revision");
  const request = {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId,
    edgeId: input.edgeId,
    parentRowItemId: write.parentRowItemId,
    childRowItemId: write.childRowItemId,
    mode: write.mode,
    isIncluded: write.isIncluded,
    quantityRule: write.quantityRule.rule,
    expectedEdgeRevision,
    expectedContributionRevision,
  };
  const prepared = await prepareIntent<Omit<UpdateMaterialAssemblyEdgeResult, "replayed">>(
    input.database,
    input.actor,
    { ...input, commandKind: UPDATE_ACCESSORY_EDGE_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };

  const [state, endpoints] = await Promise.all([
    readEdgeState({ ...input, workspaceId: prepared.context.workspaceId }),
    readEndpointScope({ ...input, ...write, workspaceId: prepared.context.workspaceId }),
  ]);
  if (!state || !endpoints) {
    throw new MaterialAssemblyMutationError("not_found", "The accessory edge or requested endpoints were not found in the same estimate tab and node.");
  }
  if (
    Number(state.edge_revision) !== expectedEdgeRevision
    || Number(state.contribution_revision) !== expectedContributionRevision
    || Number(endpoints.contribution_revision) !== expectedContributionRevision
  ) throw revisionConflict("Material assembly changed elsewhere. Refresh and try again.");

  const current = stateSnapshot(input.edgeId, input.contributionScopeId, state);
  const changed = current.parentRowItemId !== write.parentRowItemId
    || current.childRowItemId !== write.childRowItemId
    || current.mode !== write.mode
    || current.isIncluded !== write.isIncluded
    || JSON.stringify(current.quantityRule) !== write.quantityRule.json;
  const now = normalizedTimestamp(input.now);
  const marker = guardedTimestamp(now, prepared.context.requestFingerprint);
  const result: Omit<UpdateMaterialAssemblyEdgeResult, "replayed"> = {
    kind: "accessory_edge_updated",
    ...edgeSnapshot({
      edgeId: input.edgeId,
      contributionScopeId: input.contributionScopeId,
      parentRowItemId: write.parentRowItemId,
      childRowItemId: write.childRowItemId,
      mode: write.mode,
      isIncluded: write.isIncluded,
      quantityRule: write.quantityRule.rule,
      edgeRevision: expectedEdgeRevision + (changed ? 1 : 0),
      contributionRevision: expectedContributionRevision + (changed ? 1 : 0),
    }),
    changed,
  };
  const guardSql = `
    SELECT 1 FROM estimate_accessory_edges AS edge
    JOIN estimate_contribution_scopes AS scope ON scope.id = edge.contribution_scope_id
    WHERE edge.id = ? AND edge.contribution_scope_id = ?
      AND edge.parent_row_item_id = ? AND edge.child_row_item_id = ?
      AND edge.mode = ? AND edge.is_included = ? AND edge.quantity_rule_json = ?
      AND edge.revision = ? AND scope.revision = ?
      ${changed ? "AND edge.updated_at = ? AND scope.updated_at = ?" : ""}
  `;
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context,
    resourceId: input.edgeId,
    result,
    timestamp: now,
    guardSql,
    guardValues: [
      input.edgeId, input.contributionScopeId, write.parentRowItemId, write.childRowItemId,
      write.mode, write.isIncluded ? 1 : 0, write.quantityRule.json,
      result.edgeRevision, result.contributionRevision, ...(changed ? [marker, marker] : []),
    ],
  });
  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [];
  if (changed) {
    const history = await prepareHistoryEventInsert(input.database, {
      projectId: input.projectId,
      estimateId: input.estimateId,
      workspaceId: prepared.context.workspaceId,
      estimateTabId: input.estimateTabId,
      targetRowId: write.childRowItemId,
      eventType: "accessory_edge_updated",
      actorUserId: input.actor.userId,
      correlationId: prepared.context.intentId,
      changedFields: ["accessoryParent", "quantityRule", "isIncluded"],
      oldSnapshot: current,
      newSnapshot: result,
      payload: { contributionScopeId: input.contributionScopeId, edgeId: input.edgeId },
    });
    statements.push(
      {
        sql: `
          UPDATE estimate_accessory_edges
          SET parent_row_item_id = ?, child_row_item_id = ?, mode = ?, is_included = ?,
              quantity_rule_json = ?, revision = revision + 1, updated_by = ?, updated_at = ?
          WHERE id = ? AND contribution_scope_id = ? AND workspace_id = ? AND project_id = ?
            AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_contribution_scopes AS scope
              JOIN estimate_row_items AS parent_row ON parent_row.id = ? AND parent_row.estimate_id = scope.estimate_id
              JOIN estimate_row_items AS child_row ON child_row.id = ? AND child_row.estimate_id = scope.estimate_id
              JOIN estimate_nodes AS parent_node ON parent_node.id = parent_row.node_id AND parent_node.estimate_tab_id = scope.estimate_tab_id
              JOIN estimate_nodes AS child_node ON child_node.id = child_row.node_id AND child_node.estimate_tab_id = scope.estimate_tab_id
              WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
                AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ?
                AND parent_row.node_id IS NOT NULL AND parent_row.node_id = child_row.node_id
            )
        `,
        values: [
          write.parentRowItemId, write.childRowItemId, write.mode, write.isIncluded ? 1 : 0,
          write.quantityRule.json, input.actor.userId, marker, input.edgeId, input.contributionScopeId,
          prepared.context.workspaceId, input.projectId, input.estimateId, input.estimateTabId,
          expectedEdgeRevision, write.parentRowItemId, write.childRowItemId, input.contributionScopeId,
          prepared.context.workspaceId, input.projectId, input.estimateId, input.estimateTabId,
          expectedContributionRevision,
        ],
      },
      {
        sql: `
          UPDATE estimate_contribution_scopes
          SET revision = revision + 1, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ?
            AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_accessory_edges
              WHERE id = ? AND contribution_scope_id = ? AND revision = ? AND updated_at = ?
            )
        `,
        values: [
          marker, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
          input.estimateId, input.estimateTabId, expectedContributionRevision,
          input.edgeId, input.contributionScopeId, result.edgeRevision, marker,
        ],
      },
      receipt,
      buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId),
    );
    if (history.statement) statements.push(history.statement, history.outboxStatement);
  } else {
    statements.push(receipt);
  }

  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "accessory_edge_updated") return replay;
  } catch (error) {
    const latest = await readEdgeState({ ...input, workspaceId: prepared.context.workspaceId });
    if (
      !latest
      || Number(latest.edge_revision) !== expectedEdgeRevision
      || Number(latest.contribution_revision) !== expectedContributionRevision
    ) throw revisionConflict("Material assembly changed elsewhere. Refresh and try again.", error);
    throw new MaterialAssemblyMutationError("persistence_unavailable", "Material assembly changes could not be saved.", { cause: error });
  }
  return { ...result, replayed: false };
}

export async function deleteMaterialAssemblyEdge(
  rawInput: DeleteMaterialAssemblyEdgeInput,
): Promise<DeleteMaterialAssemblyEdgeResult> {
  const input = normalizeBase(rawInput);
  const expectedEdgeRevision = positiveRevision(rawInput.expectedEdgeRevision, "Accessory edge revision");
  const expectedContributionRevision = positiveRevision(rawInput.expectedContributionRevision, "Contribution revision");
  const request = {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId,
    edgeId: input.edgeId,
    expectedEdgeRevision,
    expectedContributionRevision,
  };
  const prepared = await prepareIntent<Omit<DeleteMaterialAssemblyEdgeResult, "replayed">>(
    input.database,
    input.actor,
    { ...input, commandKind: DELETE_ACCESSORY_EDGE_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };

  const state = await readEdgeState({ ...input, workspaceId: prepared.context.workspaceId });
  if (!state) throw new MaterialAssemblyMutationError("not_found", "The accessory edge was not found in this estimate tab.");
  if (
    Number(state.edge_revision) !== expectedEdgeRevision
    || Number(state.contribution_revision) !== expectedContributionRevision
  ) throw revisionConflict("Material assembly changed elsewhere. Refresh and try again.");

  const current = stateSnapshot(input.edgeId, input.contributionScopeId, state);
  const now = normalizedTimestamp(input.now);
  const marker = guardedTimestamp(now, prepared.context.requestFingerprint);
  const result: Omit<DeleteMaterialAssemblyEdgeResult, "replayed"> = {
    kind: "accessory_edge_deleted",
    edgeId: input.edgeId,
    contributionScopeId: input.contributionScopeId,
    contributionRevision: expectedContributionRevision + 1,
  };
  const guardSql = `
    SELECT 1 FROM estimate_contribution_scopes AS scope
    WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
      AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
      AND scope.revision = ? AND scope.updated_at = ?
      AND NOT EXISTS (SELECT 1 FROM estimate_accessory_edges WHERE id = ?)
  `;
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context,
    resourceId: input.edgeId,
    result,
    timestamp: now,
    guardSql,
    guardValues: [
      input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
      input.estimateTabId, result.contributionRevision, marker, input.edgeId,
    ],
  });
  const history = await prepareHistoryEventInsert(input.database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: prepared.context.workspaceId,
    estimateTabId: input.estimateTabId,
    targetRowId: state.child_row_item_id,
    eventType: "accessory_edge_deleted",
    actorUserId: input.actor.userId,
    correlationId: prepared.context.intentId,
    changedFields: ["accessoryParent", "quantityRule", "isIncluded"],
    oldSnapshot: current,
    newSnapshot: null,
    payload: { contributionScopeId: input.contributionScopeId, edgeId: input.edgeId },
  });
  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [
    {
      sql: `
        DELETE FROM estimate_accessory_edges
        WHERE id = ? AND contribution_scope_id = ? AND workspace_id = ? AND project_id = ?
          AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
          AND EXISTS (
            SELECT 1 FROM estimate_contribution_scopes
            WHERE id = ? AND workspace_id = ? AND project_id = ?
              AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
          )
      `,
      values: [
        input.edgeId, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
        input.estimateId, input.estimateTabId, expectedEdgeRevision, input.contributionScopeId,
        prepared.context.workspaceId, input.projectId, input.estimateId, input.estimateTabId,
        expectedContributionRevision,
      ],
    },
    {
      sql: `
        UPDATE estimate_contribution_scopes
        SET revision = revision + 1, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ?
          AND revision = ?
          AND NOT EXISTS (SELECT 1 FROM estimate_accessory_edges WHERE id = ?)
      `,
      values: [
        marker, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
        input.estimateId, input.estimateTabId, expectedContributionRevision, input.edgeId,
      ],
    },
    receipt,
    buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);

  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "accessory_edge_deleted") return replay;
  } catch (error) {
    const latest = await readEdgeState({ ...input, workspaceId: prepared.context.workspaceId });
    if (
      !latest
      || Number(latest.edge_revision) !== expectedEdgeRevision
      || Number(latest.contribution_revision) !== expectedContributionRevision
    ) throw revisionConflict("Material assembly changed elsewhere. Refresh and try again.", error);
    throw new MaterialAssemblyMutationError("persistence_unavailable", "Material assembly changes could not be saved.", { cause: error });
  }
  return { ...result, replayed: false };
}

export async function applyMaterialAssemblyBulk(
  rawInput: ApplyMaterialAssemblyBulkInput,
): Promise<ApplyMaterialAssemblyBulkResult> {
  const input = {
    ...rawInput,
    projectId: requiredIdentifier(rawInput.projectId, "Project"),
    estimateId: requiredIdentifier(rawInput.estimateId, "Estimate"),
    estimateTabId: requiredIdentifier(rawInput.estimateTabId, "Estimate tab"),
    contributionScopeId: requiredIdentifier(rawInput.contributionScopeId, "Contribution scope"),
    intentId: requiredIdentifier(rawInput.intentId, "Mutation intent"),
  };
  if (input.intentId.length > 128) {
    throw new MaterialAssemblyMutationError("invalid_input", "Mutation intent is too long.");
  }
  const expectedContributionRevision = rawInput.expectedContributionRevision === null
    ? null
    : positiveRevision(rawInput.expectedContributionRevision, "Contribution revision");
  const operation = rawInput.operation.kind === "configure_accessories"
    ? {
        kind: rawInput.operation.kind,
        edges: rawInput.operation.edges.map((edge) => ({
          edgeId: requiredIdentifier(edge.edgeId, "Accessory edge"),
          ...normalizeEdgeWrite(edge),
          expectedEdgeRevision: edge.expectedEdgeRevision === null
            ? null
            : positiveRevision(edge.expectedEdgeRevision, "Accessory edge revision"),
        })),
      } as const
    : {
        kind: rawInput.operation.kind,
        changedRowItemIds: [...new Set(rawInput.operation.changedRowItemIds.map((id) => requiredIdentifier(id, "Changed row")))],
        groups: rawInput.operation.groups.map((group) => ({
          groupId: requiredIdentifier(group.groupId, "Alternative group"),
          expectedGroupRevision: positiveRevision(group.expectedGroupRevision, "Alternative group revision"),
        })),
        optionalRows: rawInput.operation.optionalRows.map((row) => ({
          rowItemId: requiredIdentifier(row.rowItemId, "Optional row"),
          expectedOptionalRevision: positiveRevision(row.expectedOptionalRevision, "Optional row revision"),
        })),
        edges: rawInput.operation.edges.map((edge) => ({
          edgeId: requiredIdentifier(edge.edgeId, "Accessory edge"),
          expectedEdgeRevision: positiveRevision(edge.expectedEdgeRevision, "Accessory edge revision"),
        })),
      } as const;
  if (operation.kind === "configure_accessories") {
    if (operation.edges.length === 0 || new Set(operation.edges.map((edge) => edge.edgeId)).size !== operation.edges.length) {
      throw new MaterialAssemblyMutationError("invalid_input", "Bulk accessory edges must be non-empty and distinct.");
    }
    if (new Set(operation.edges.map((edge) => edge.childRowItemId)).size !== operation.edges.length) {
      throw new MaterialAssemblyMutationError("invalid_input", "Each accessory row may have only one parent.");
    }
  }

  const request = {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId,
    expectedContributionRevision,
    operation,
  };
  const prepared = await prepareIntent<Omit<ApplyMaterialAssemblyBulkResult, "replayed">>(
    input.database,
    input.actor,
    { ...input, commandKind: BULK_ASSEMBLY_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };

  const scope = await readScopeState({ ...input, workspaceId: prepared.context.workspaceId });
  if (
    (scope && expectedContributionRevision !== null && Number(scope.revision) !== expectedContributionRevision)
    || (!scope && expectedContributionRevision !== null)
    || (!scope && operation.kind === "remove_roles")
  ) throw revisionConflict("Material assembly changed elsewhere. Refresh and try again.");
  const contributionScopeId = scope?.id ?? input.contributionScopeId;
  const guardRevision = Number(scope?.revision ?? 1);
  const changedGroupIds = operation.kind === "remove_roles" ? operation.groups.map((group) => group.groupId) : [];
  const changedEdgeIds = operation.edges.map((edge) => edge.edgeId);
  const changed = operation.kind === "configure_accessories"
    || changedGroupIds.length > 0
    || operation.optionalRows.length > 0
    || changedEdgeIds.length > 0;
  const changedRowItemIds = operation.kind === "configure_accessories"
    ? [...new Set(operation.edges.flatMap((edge) => [edge.parentRowItemId, edge.childRowItemId]))]
    : [...operation.changedRowItemIds];
  const contributionRevision = guardRevision + (changed ? 1 : 0);
  const now = normalizedTimestamp(input.now);
  const marker = guardedTimestamp(now, prepared.context.requestFingerprint);
  const result: Omit<ApplyMaterialAssemblyBulkResult, "replayed"> = {
    kind: "material_assembly_bulk_applied",
    contributionScopeId,
    contributionRevision,
    changed,
    changedRowItemIds,
    changedGroupIds,
    changedEdgeIds,
  };
  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [];
  if (!scope) {
    statements.push({
      sql: `
        INSERT INTO estimate_contribution_scopes (
          id, workspace_id, project_id, estimate_id, estimate_tab_id, revision, created_at, updated_at
        )
        SELECT ?, ?, ?, ?, ?, 1, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM estimate_tabs AS tab
          JOIN estimates AS estimate ON estimate.id = tab.estimate_id
          JOIN projects AS project ON project.id = estimate.project_id
          WHERE tab.id = ? AND estimate.id = ? AND project.id = ? AND project.workspace_id = ?
        )
        AND NOT EXISTS (
          SELECT 1 FROM estimate_contribution_scopes
          WHERE workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ?
        )
      `,
      values: [
        contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
        input.estimateTabId, now, now, input.estimateTabId, input.estimateId, input.projectId,
        prepared.context.workspaceId, prepared.context.workspaceId, input.projectId, input.estimateId,
        input.estimateTabId,
      ],
    });
  }

  if (operation.kind === "configure_accessories") {
    for (const edge of operation.edges) {
      if (edge.expectedEdgeRevision === null) {
        statements.push({
          sql: `
            INSERT INTO estimate_accessory_edges (
              id, contribution_scope_id, workspace_id, project_id, estimate_id, estimate_tab_id,
              parent_row_item_id, child_row_item_id, mode, is_included, quantity_rule_json,
              revision, created_by, updated_by, created_at, updated_at
            )
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?
            FROM estimate_contribution_scopes AS scope
            WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
              AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ?
              AND NOT EXISTS (SELECT 1 FROM estimate_accessory_edges WHERE id = ? OR child_row_item_id = ?)
          `,
          values: [
            edge.edgeId, contributionScopeId, prepared.context.workspaceId, input.projectId,
            input.estimateId, input.estimateTabId, edge.parentRowItemId, edge.childRowItemId,
            edge.mode, edge.isIncluded ? 1 : 0, edge.quantityRule.json, input.actor.userId,
            input.actor.userId, now, marker, contributionScopeId, prepared.context.workspaceId,
            input.projectId, input.estimateId, input.estimateTabId, guardRevision, edge.edgeId,
            edge.childRowItemId,
          ],
        });
      } else {
        statements.push({
          sql: `
            UPDATE estimate_accessory_edges
            SET parent_row_item_id = ?, child_row_item_id = ?, mode = ?, is_included = ?,
                quantity_rule_json = ?, revision = revision + 1, updated_by = ?, updated_at = ?
            WHERE id = ? AND contribution_scope_id = ? AND workspace_id = ? AND project_id = ?
              AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
              AND EXISTS (
                SELECT 1 FROM estimate_contribution_scopes
                WHERE id = ? AND revision = ?
              )
          `,
          values: [
            edge.parentRowItemId, edge.childRowItemId, edge.mode, edge.isIncluded ? 1 : 0,
            edge.quantityRule.json, input.actor.userId, marker, edge.edgeId, contributionScopeId,
            prepared.context.workspaceId, input.projectId, input.estimateId, input.estimateTabId,
            edge.expectedEdgeRevision, contributionScopeId, guardRevision,
          ],
        });
      }
    }
  } else {
    for (const group of operation.groups) {
      statements.push({
        sql: `
          DELETE FROM estimate_alternative_groups
          WHERE id = ? AND contribution_scope_id = ? AND revision = ?
            AND EXISTS (SELECT 1 FROM estimate_contribution_scopes WHERE id = ? AND revision = ?)
        `,
        values: [group.groupId, contributionScopeId, group.expectedGroupRevision, contributionScopeId, guardRevision],
      });
    }
    for (const row of operation.optionalRows) {
      statements.push({
        sql: `
          DELETE FROM estimate_optional_items
          WHERE contribution_scope_id = ? AND row_item_id = ? AND revision = ?
            AND EXISTS (SELECT 1 FROM estimate_contribution_scopes WHERE id = ? AND revision = ?)
        `,
        values: [contributionScopeId, row.rowItemId, row.expectedOptionalRevision, contributionScopeId, guardRevision],
      });
    }
    for (const edge of operation.edges) {
      statements.push({
        sql: `
          DELETE FROM estimate_accessory_edges
          WHERE id = ? AND contribution_scope_id = ? AND revision = ?
            AND EXISTS (SELECT 1 FROM estimate_contribution_scopes WHERE id = ? AND revision = ?)
        `,
        values: [edge.edgeId, contributionScopeId, edge.expectedEdgeRevision, contributionScopeId, guardRevision],
      });
    }
  }

  if (changed) {
    statements.push({
      sql: `
        UPDATE estimate_contribution_scopes
        SET revision = revision + 1, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ?
          AND revision = ?
      `,
      values: [
        marker, contributionScopeId, prepared.context.workspaceId, input.projectId,
        input.estimateId, input.estimateTabId, guardRevision,
      ],
    });
  }
  const finalGuardSql = operation.kind === "configure_accessories"
    ? `
        SELECT 1 FROM estimate_contribution_scopes AS scope
        WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
          AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ? AND scope.updated_at = ?
          AND (SELECT COUNT(*) FROM estimate_accessory_edges
               WHERE contribution_scope_id = scope.id
                 AND id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
                 AND updated_at = ?) = ?
      `
    : `
        SELECT 1 FROM estimate_contribution_scopes AS scope
        WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
          AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ?
          ${changed ? "AND scope.updated_at = ?" : ""}
          AND NOT EXISTS (SELECT 1 FROM estimate_alternative_groups WHERE contribution_scope_id = scope.id AND id IN (SELECT CAST(value AS TEXT) FROM json_each(?)))
          AND NOT EXISTS (SELECT 1 FROM estimate_optional_items WHERE contribution_scope_id = scope.id AND row_item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?)))
          AND NOT EXISTS (SELECT 1 FROM estimate_accessory_edges WHERE contribution_scope_id = scope.id AND id IN (SELECT CAST(value AS TEXT) FROM json_each(?)))
      `;
  const finalGuardValues: D1Value[] = operation.kind === "configure_accessories"
    ? [
        contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
        input.estimateTabId, contributionRevision, marker, JSON.stringify(changedEdgeIds), marker,
        changedEdgeIds.length,
      ]
    : [
        contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
        input.estimateTabId, contributionRevision, ...(changed ? [marker] : []),
        JSON.stringify(changedGroupIds), JSON.stringify(operation.optionalRows.map((row) => row.rowItemId)),
        JSON.stringify(changedEdgeIds),
      ];
  statements.push(buildGuardedReceiptStatement({
    context: prepared.context,
    resourceType: "estimate_contribution_scope",
    resourceId: contributionScopeId,
    result,
    timestamp: now,
    guardSql: finalGuardSql,
    guardValues: finalGuardValues,
  }));
  if (changed) {
    statements.push(buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId));
    const history = await prepareHistoryEventInsert(input.database, {
      projectId: input.projectId,
      estimateId: input.estimateId,
      workspaceId: prepared.context.workspaceId,
      estimateTabId: input.estimateTabId,
      targetRowId: changedRowItemIds[0],
      eventType: operation.kind === "configure_accessories" ? "accessory_edges_bulk_configured" : "contribution_roles_bulk_removed",
      actorUserId: input.actor.userId,
      correlationId: prepared.context.intentId,
      changedFields: operation.kind === "configure_accessories" ? ["accessoryParent", "quantityRule", "isIncluded"] : ["alternativeGroup", "optionalContribution", "accessoryParent"],
      oldSnapshot: null,
      newSnapshot: result,
      payload: { contributionScopeId, changedRowItemIds, changedGroupIds, changedEdgeIds },
    });
    if (history.statement) statements.push(history.statement, history.outboxStatement);
  }

  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "material_assembly_bulk_applied") return replay;
  } catch (error) {
    const latest = await readScopeState({ ...input, workspaceId: prepared.context.workspaceId });
    if (scope && Number(latest?.revision) !== guardRevision) {
      throw revisionConflict("Material assembly changed elsewhere. Refresh and try again.", error);
    }
    throw new MaterialAssemblyMutationError("persistence_unavailable", "The selected contribution roles could not be saved atomically.", { cause: error });
  }
  return { ...result, replayed: false };
}
