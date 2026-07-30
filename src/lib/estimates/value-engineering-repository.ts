import "server-only";

import type { D1DatabaseLike, D1Value } from "@/lib/cloudflare/d1";
import { runRequiredD1Batch } from "@/lib/cloudflare/d1-batch";
import { assertD1MutationStatementLimit, MutationIntentConflictError } from "@/lib/estimates/mutation-receipts";

import { prepareHistoryEventInsert } from "./d1-intents/history-events";
import { guardedD1Timestamp, prepareStatement } from "./d1-intents/database";
import { buildGuardedReceiptStatement } from "./d1-intents/guarded-receipt";
import {
  buildProjectPublicationRevisionForEstimate,
  prepareParsedEstimateMutationIntent,
  readConcurrentEstimateMutationReceipt,
  type EstimateD1Actor,
  type EstimateMutationIntentContext,
} from "./d1-intents/intent-context";

const SELECT_ALTERNATIVE_COMMAND = "value_engineering.select_alternative";
const SET_OPTIONAL_INCLUSION_COMMAND = "value_engineering.set_optional_inclusion";

export type ValueEngineeringMutationErrorCode =
  | "invalid_input"
  | "not_authorized"
  | "not_found"
  | "revision_conflict"
  | "intent_conflict"
  | "persistence_unavailable";

export class ValueEngineeringMutationError extends Error {
  constructor(
    readonly code: ValueEngineeringMutationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ValueEngineeringMutationError";
  }
}

export type SelectAlternativeResult = {
  kind: "alternative_selection";
  contributionScopeId: string;
  groupId: string;
  selectedRowItemId: string;
  groupRevision: number;
  contributionRevision: number;
  changed: boolean;
  replayed: boolean;
};

export type SetOptionalInclusionResult = {
  kind: "optional_inclusion";
  contributionScopeId: string;
  rowItemId: string;
  isIncluded: boolean;
  optionalRevision: number;
  contributionRevision: number;
  changed: boolean;
  replayed: boolean;
};

export type SelectAlternativeInput = {
  database: D1DatabaseLike;
  actor: EstimateD1Actor;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  groupId: string;
  selectedRowItemId: string;
  expectedGroupRevision: number;
  expectedContributionRevision: number;
  intentId: string;
  now?: string;
};

export type SetOptionalInclusionInput = {
  database: D1DatabaseLike;
  actor: EstimateD1Actor;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  rowItemId: string;
  isIncluded: boolean;
  expectedOptionalRevision: number;
  expectedContributionRevision: number;
  intentId: string;
  now?: string;
};

type AlternativeStateRow = {
  group_revision: number;
  selected_row_item_id: string;
  contribution_revision: number;
  requested_member_exists: number | boolean;
};

type OptionalStateRow = {
  optional_revision: number;
  is_included: number | boolean;
  contribution_revision: number;
};

type AlternativeReceiptResult = Omit<SelectAlternativeResult, "replayed">;
type OptionalInclusionReceiptResult = Omit<SetOptionalInclusionResult, "replayed">;
type ReceiptResult = AlternativeReceiptResult | OptionalInclusionReceiptResult;

function requiredIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new ValueEngineeringMutationError("invalid_input", `${label} is required.`);
  return normalized;
}

function positiveRevision(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ValueEngineeringMutationError("invalid_input", `${label} must be a positive integer.`);
  }
  return value;
}

function normalizedTimestamp(value: string | undefined) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new ValueEngineeringMutationError("invalid_input", "Mutation timestamp is invalid.");
  }
  return date.toISOString();
}

function readBoolean(value: number | boolean) {
  return value === true || value === 1;
}

function isAlternativeReceipt(result: Record<string, unknown>) {
  return result.kind === "alternative_selection"
    && typeof result.contributionScopeId === "string"
    && typeof result.groupId === "string"
    && typeof result.selectedRowItemId === "string"
    && Number.isSafeInteger(result.groupRevision)
    && Number.isSafeInteger(result.contributionRevision)
    && typeof result.changed === "boolean";
}

function isOptionalInclusionReceipt(result: Record<string, unknown>) {
  return result.kind === "optional_inclusion"
    && typeof result.contributionScopeId === "string"
    && typeof result.rowItemId === "string"
    && typeof result.isIncluded === "boolean"
    && Number.isSafeInteger(result.optionalRevision)
    && Number.isSafeInteger(result.contributionRevision)
    && typeof result.changed === "boolean";
}

function readReceiptResult(value: unknown): ReceiptResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValueEngineeringMutationError("persistence_unavailable", "The committed value-engineering receipt is invalid.");
  }
  const result = value as Partial<ReceiptResult> & Record<string, unknown>;
  if (isAlternativeReceipt(result)) return result as AlternativeReceiptResult;
  if (isOptionalInclusionReceipt(result)) return result as OptionalInclusionReceiptResult;
  throw new ValueEngineeringMutationError("persistence_unavailable", "The committed value-engineering receipt is invalid.");
}

function mapIntentError(error: unknown): never {
  if (error instanceof ValueEngineeringMutationError) throw error;
  if (error instanceof MutationIntentConflictError) {
    throw new ValueEngineeringMutationError("intent_conflict", error.message, { cause: error });
  }
  if (error instanceof Error && error.message === "Estimate edit access denied.") {
    throw new ValueEngineeringMutationError("not_authorized", error.message, { cause: error });
  }
  throw error;
}

async function prepareIntent<T extends ReceiptResult>(
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
    return await prepareParsedEstimateMutationIntent<T>(database, actor, {
      projectId: input.projectId,
      estimateId: input.estimateId,
      correlationId: input.intentId,
      commandKind: input.commandKind,
      request: input.request,
    }, (value) => readReceiptResult(value) as T);
  } catch (error) {
    mapIntentError(error);
  }
}

async function readConcurrentReceipt<T extends ReceiptResult>(
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

async function readAlternativeState(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  groupId: string;
  selectedRowItemId: string;
}) {
  return input.database.prepare<AlternativeStateRow>(`
    SELECT group_row.revision AS group_revision,
           group_row.selected_row_item_id,
           scope.revision AS contribution_revision,
           EXISTS (
             SELECT 1
             FROM estimate_alternative_members AS member
             JOIN estimate_row_items AS row_item
               ON row_item.id = member.row_item_id
              AND row_item.estimate_id = scope.estimate_id
             JOIN estimate_nodes AS node
               ON node.id = row_item.node_id
              AND node.estimate_id = scope.estimate_id
              AND node.estimate_tab_id = scope.estimate_tab_id
             WHERE member.contribution_scope_id = scope.id
               AND member.group_id = group_row.id
               AND member.row_item_id = ?
           ) AS requested_member_exists
    FROM estimate_alternative_groups AS group_row
    JOIN estimate_contribution_scopes AS scope ON scope.id = group_row.contribution_scope_id
    WHERE group_row.id = ?
      AND scope.id = ?
      AND scope.workspace_id = ?
      AND scope.project_id = ?
      AND scope.estimate_id = ?
      AND scope.estimate_tab_id = ?
    LIMIT 1
  `).bind(
    input.selectedRowItemId,
    input.groupId,
    input.contributionScopeId,
    input.workspaceId,
    input.projectId,
    input.estimateId,
    input.estimateTabId,
  ).first<AlternativeStateRow>();
}

async function readOptionalState(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  rowItemId: string;
}) {
  return input.database.prepare<OptionalStateRow>(`
    SELECT optional_row.revision AS optional_revision,
           optional_row.is_included,
           scope.revision AS contribution_revision
    FROM estimate_optional_items AS optional_row
    JOIN estimate_contribution_scopes AS scope ON scope.id = optional_row.contribution_scope_id
    JOIN estimate_row_items AS row_item
      ON row_item.id = optional_row.row_item_id
     AND row_item.estimate_id = scope.estimate_id
    JOIN estimate_nodes AS node
      ON node.id = row_item.node_id
     AND node.estimate_id = scope.estimate_id
     AND node.estimate_tab_id = scope.estimate_tab_id
    WHERE optional_row.contribution_scope_id = ?
      AND optional_row.row_item_id = ?
      AND scope.workspace_id = ?
      AND scope.project_id = ?
      AND scope.estimate_id = ?
      AND scope.estimate_tab_id = ?
    LIMIT 1
  `).bind(
    input.contributionScopeId,
    input.rowItemId,
    input.workspaceId,
    input.projectId,
    input.estimateId,
    input.estimateTabId,
  ).first<OptionalStateRow>();
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
      input.statements.map((statement) => prepareStatement(input.database, statement)),
      "Value-engineering changes could not be saved.",
    );
  } catch (error) {
    const committed = await readConcurrentReceipt<ReceiptResult>(input.database, input.context);
    if (committed) return { ...committed, replayed: true } as SelectAlternativeResult | SetOptionalInclusionResult;
    if (error instanceof MutationIntentConflictError) mapIntentError(error);
    throw error;
  }
  return null;
}

/** Selects exactly one existing member of an alternative group with entity and scope CAS guards. */
export async function selectValueEngineeringAlternative(
  rawInput: SelectAlternativeInput,
): Promise<SelectAlternativeResult> {
  const input = {
    ...rawInput,
    projectId: requiredIdentifier(rawInput.projectId, "Project"),
    estimateId: requiredIdentifier(rawInput.estimateId, "Estimate"),
    estimateTabId: requiredIdentifier(rawInput.estimateTabId, "Estimate tab"),
    contributionScopeId: requiredIdentifier(rawInput.contributionScopeId, "Contribution scope"),
    groupId: requiredIdentifier(rawInput.groupId, "Alternative group"),
    selectedRowItemId: requiredIdentifier(rawInput.selectedRowItemId, "Selected row"),
    intentId: requiredIdentifier(rawInput.intentId, "Mutation intent"),
    expectedGroupRevision: positiveRevision(rawInput.expectedGroupRevision, "Alternative group revision"),
    expectedContributionRevision: positiveRevision(rawInput.expectedContributionRevision, "Contribution revision"),
  };
  if (input.intentId.length > 128) {
    throw new ValueEngineeringMutationError("invalid_input", "Mutation intent is too long.");
  }
  const request = {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId,
    groupId: input.groupId,
    selectedRowItemId: input.selectedRowItemId,
    expectedGroupRevision: input.expectedGroupRevision,
    expectedContributionRevision: input.expectedContributionRevision,
  };
  const prepared = await prepareIntent<AlternativeReceiptResult>(
    input.database,
    input.actor,
    { ...input, commandKind: SELECT_ALTERNATIVE_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };

  const state = await readAlternativeState({ ...input, workspaceId: prepared.context.workspaceId });
  if (!state || !readBoolean(state.requested_member_exists)) {
    throw new ValueEngineeringMutationError("not_found", "The alternative group or requested member was not found in this estimate tab.");
  }
  if (
    Number(state.group_revision) !== input.expectedGroupRevision
    || Number(state.contribution_revision) !== input.expectedContributionRevision
  ) throw new ValueEngineeringMutationError("revision_conflict", "Value-engineering selections changed elsewhere. Refresh and try again.");

  const changed = state.selected_row_item_id !== input.selectedRowItemId;
  const result: AlternativeReceiptResult = {
    kind: "alternative_selection",
    contributionScopeId: input.contributionScopeId,
    groupId: input.groupId,
    selectedRowItemId: input.selectedRowItemId,
    groupRevision: input.expectedGroupRevision + (changed ? 1 : 0),
    contributionRevision: input.expectedContributionRevision + (changed ? 1 : 0),
    changed,
  };
  const now = normalizedTimestamp(input.now);
  const marker = guardedD1Timestamp(now, prepared.context.requestFingerprint);
  const guardSql = `
    SELECT 1
    FROM estimate_alternative_groups AS group_row
    JOIN estimate_contribution_scopes AS scope ON scope.id = group_row.contribution_scope_id
    WHERE group_row.id = ? AND scope.id = ?
      AND scope.workspace_id = ? AND scope.project_id = ?
      AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
      AND group_row.selected_row_item_id = ?
      AND group_row.revision = ? AND scope.revision = ?
      ${changed ? "AND group_row.updated_at = ? AND scope.updated_at = ?" : ""}
  `;
  const guardValues: D1Value[] = [
    input.groupId,
    input.contributionScopeId,
    prepared.context.workspaceId,
    input.projectId,
    input.estimateId,
    input.estimateTabId,
    input.selectedRowItemId,
    result.groupRevision,
    result.contributionRevision,
    ...(changed ? [marker, marker] : []),
  ];
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context,
    resourceType: "estimate_alternative_group",
    resourceId: input.groupId,
    result,
    timestamp: now,
    guardSql,
    guardValues,
  });

  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [];
  if (changed) {
    const history = await prepareHistoryEventInsert(input.database, {
      projectId: input.projectId,
      estimateId: input.estimateId,
      workspaceId: prepared.context.workspaceId,
      estimateTabId: input.estimateTabId,
      targetRowId: input.selectedRowItemId,
      eventType: "alternative_selection_changed",
      actorUserId: input.actor.userId,
      correlationId: prepared.context.intentId,
      changedFields: ["selectedRowItemId", "contributionRevision"],
      oldSnapshot: { selectedRowItemId: state.selected_row_item_id, groupRevision: Number(state.group_revision) },
      newSnapshot: { selectedRowItemId: input.selectedRowItemId, groupRevision: result.groupRevision },
      payload: { contributionScopeId: input.contributionScopeId, groupId: input.groupId },
    });
    statements.push(
      {
        sql: `
          UPDATE estimate_alternative_groups
          SET selected_row_item_id = ?, revision = revision + 1, updated_at = ?
          WHERE id = ? AND contribution_scope_id = ? AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_contribution_scopes
              WHERE id = ? AND workspace_id = ? AND project_id = ?
                AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
            )
            AND EXISTS (
              SELECT 1 FROM estimate_alternative_members AS member
              JOIN estimate_row_items AS row_item ON row_item.id = member.row_item_id AND row_item.estimate_id = ?
              JOIN estimate_nodes AS node ON node.id = row_item.node_id AND node.estimate_id = ? AND node.estimate_tab_id = ?
              WHERE member.contribution_scope_id = ? AND member.group_id = ? AND member.row_item_id = ?
            )
        `,
        values: [
          input.selectedRowItemId, marker, input.groupId, input.contributionScopeId, input.expectedGroupRevision,
          input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
          input.estimateTabId, input.expectedContributionRevision, input.estimateId, input.estimateId,
          input.estimateTabId, input.contributionScopeId, input.groupId, input.selectedRowItemId,
        ],
      },
      {
        sql: `
          UPDATE estimate_contribution_scopes
          SET revision = revision + 1, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ?
            AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_alternative_groups
              WHERE id = ? AND contribution_scope_id = ? AND selected_row_item_id = ?
                AND revision = ? AND updated_at = ?
            )
        `,
        values: [
          marker, input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
          input.estimateTabId, input.expectedContributionRevision, input.groupId, input.contributionScopeId,
          input.selectedRowItemId, result.groupRevision, marker,
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
    if (replay?.kind === "alternative_selection") return replay;
  } catch (error) {
    const latest = await readAlternativeState({ ...input, workspaceId: prepared.context.workspaceId });
    if (
      !latest
      || Number(latest.group_revision) !== input.expectedGroupRevision
      || Number(latest.contribution_revision) !== input.expectedContributionRevision
    ) throw new ValueEngineeringMutationError("revision_conflict", "Value-engineering selections changed elsewhere. Refresh and try again.", { cause: error });
    throw new ValueEngineeringMutationError("persistence_unavailable", "Value-engineering changes could not be saved.", { cause: error });
  }
  return { ...result, replayed: false };
}

/** Includes or excludes one persisted optional row with entity and scope CAS guards. */
export async function setValueEngineeringOptionalInclusion(
  rawInput: SetOptionalInclusionInput,
): Promise<SetOptionalInclusionResult> {
  if (typeof rawInput.isIncluded !== "boolean") {
    throw new ValueEngineeringMutationError("invalid_input", "Optional inclusion must be a boolean.");
  }
  const input = {
    ...rawInput,
    projectId: requiredIdentifier(rawInput.projectId, "Project"),
    estimateId: requiredIdentifier(rawInput.estimateId, "Estimate"),
    estimateTabId: requiredIdentifier(rawInput.estimateTabId, "Estimate tab"),
    contributionScopeId: requiredIdentifier(rawInput.contributionScopeId, "Contribution scope"),
    rowItemId: requiredIdentifier(rawInput.rowItemId, "Optional row"),
    intentId: requiredIdentifier(rawInput.intentId, "Mutation intent"),
    expectedOptionalRevision: positiveRevision(rawInput.expectedOptionalRevision, "Optional item revision"),
    expectedContributionRevision: positiveRevision(rawInput.expectedContributionRevision, "Contribution revision"),
  };
  if (input.intentId.length > 128) {
    throw new ValueEngineeringMutationError("invalid_input", "Mutation intent is too long.");
  }
  const request = {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId,
    rowItemId: input.rowItemId,
    isIncluded: input.isIncluded,
    expectedOptionalRevision: input.expectedOptionalRevision,
    expectedContributionRevision: input.expectedContributionRevision,
  };
  const prepared = await prepareIntent<OptionalInclusionReceiptResult>(
    input.database,
    input.actor,
    { ...input, commandKind: SET_OPTIONAL_INCLUSION_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };

  const state = await readOptionalState({ ...input, workspaceId: prepared.context.workspaceId });
  if (!state) throw new ValueEngineeringMutationError("not_found", "The optional row was not found in this estimate tab.");
  if (
    Number(state.optional_revision) !== input.expectedOptionalRevision
    || Number(state.contribution_revision) !== input.expectedContributionRevision
  ) throw new ValueEngineeringMutationError("revision_conflict", "Value-engineering inclusion changed elsewhere. Refresh and try again.");

  const changed = readBoolean(state.is_included) !== input.isIncluded;
  const result: OptionalInclusionReceiptResult = {
    kind: "optional_inclusion",
    contributionScopeId: input.contributionScopeId,
    rowItemId: input.rowItemId,
    isIncluded: input.isIncluded,
    optionalRevision: input.expectedOptionalRevision + (changed ? 1 : 0),
    contributionRevision: input.expectedContributionRevision + (changed ? 1 : 0),
    changed,
  };
  const now = normalizedTimestamp(input.now);
  const marker = guardedD1Timestamp(now, prepared.context.requestFingerprint);
  const guardSql = `
    SELECT 1
    FROM estimate_optional_items AS optional_row
    JOIN estimate_contribution_scopes AS scope ON scope.id = optional_row.contribution_scope_id
    WHERE optional_row.contribution_scope_id = ? AND optional_row.row_item_id = ?
      AND scope.workspace_id = ? AND scope.project_id = ?
      AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
      AND optional_row.is_included = ?
      AND optional_row.revision = ? AND scope.revision = ?
      ${changed ? "AND optional_row.updated_at = ? AND scope.updated_at = ?" : ""}
  `;
  const guardValues: D1Value[] = [
    input.contributionScopeId,
    input.rowItemId,
    prepared.context.workspaceId,
    input.projectId,
    input.estimateId,
    input.estimateTabId,
    input.isIncluded ? 1 : 0,
    result.optionalRevision,
    result.contributionRevision,
    ...(changed ? [marker, marker] : []),
  ];
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context,
    resourceType: "estimate_optional_item",
    resourceId: input.rowItemId,
    result,
    timestamp: now,
    guardSql,
    guardValues,
  });

  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [];
  if (changed) {
    const history = await prepareHistoryEventInsert(input.database, {
      projectId: input.projectId,
      estimateId: input.estimateId,
      workspaceId: prepared.context.workspaceId,
      estimateTabId: input.estimateTabId,
      targetRowId: input.rowItemId,
      eventType: "optional_inclusion_changed",
      actorUserId: input.actor.userId,
      correlationId: prepared.context.intentId,
      changedFields: ["isIncluded", "contributionRevision"],
      oldSnapshot: { isIncluded: readBoolean(state.is_included), optionalRevision: Number(state.optional_revision) },
      newSnapshot: { isIncluded: input.isIncluded, optionalRevision: result.optionalRevision },
      payload: { contributionScopeId: input.contributionScopeId },
    });
    statements.push(
      {
        sql: `
          UPDATE estimate_optional_items
          SET is_included = ?, revision = revision + 1, updated_at = ?
          WHERE contribution_scope_id = ? AND row_item_id = ? AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_contribution_scopes
              WHERE id = ? AND workspace_id = ? AND project_id = ?
                AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
            )
            AND EXISTS (
              SELECT 1 FROM estimate_row_items AS row_item
              JOIN estimate_nodes AS node ON node.id = row_item.node_id
              WHERE row_item.id = ? AND row_item.estimate_id = ?
                AND node.estimate_id = ? AND node.estimate_tab_id = ?
            )
        `,
        values: [
          input.isIncluded ? 1 : 0, marker, input.contributionScopeId, input.rowItemId,
          input.expectedOptionalRevision, input.contributionScopeId, prepared.context.workspaceId,
          input.projectId, input.estimateId, input.estimateTabId, input.expectedContributionRevision,
          input.rowItemId, input.estimateId, input.estimateId, input.estimateTabId,
        ],
      },
      {
        sql: `
          UPDATE estimate_contribution_scopes
          SET revision = revision + 1, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ?
            AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_optional_items
              WHERE contribution_scope_id = ? AND row_item_id = ? AND is_included = ?
                AND revision = ? AND updated_at = ?
            )
        `,
        values: [
          marker, input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
          input.estimateTabId, input.expectedContributionRevision, input.contributionScopeId,
          input.rowItemId, input.isIncluded ? 1 : 0, result.optionalRevision, marker,
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
    if (replay?.kind === "optional_inclusion") return replay;
  } catch (error) {
    const latest = await readOptionalState({ ...input, workspaceId: prepared.context.workspaceId });
    if (
      !latest
      || Number(latest.optional_revision) !== input.expectedOptionalRevision
      || Number(latest.contribution_revision) !== input.expectedContributionRevision
    ) throw new ValueEngineeringMutationError("revision_conflict", "Value-engineering inclusion changed elsewhere. Refresh and try again.", { cause: error });
    throw new ValueEngineeringMutationError("persistence_unavailable", "Value-engineering changes could not be saved.", { cause: error });
  }
  return { ...result, replayed: false };
}
