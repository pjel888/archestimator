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

const ENSURE_SCOPE_COMMAND = "contribution_configuration.ensure_scope";
const UPSERT_ALTERNATIVE_GROUP_COMMAND = "contribution_configuration.upsert_alternative_group";
const MARK_OPTIONAL_COMMAND = "contribution_configuration.mark_optional";
const UNMARK_OPTIONAL_COMMAND = "contribution_configuration.unmark_optional";
const REMOVE_ALTERNATIVE_GROUP_COMMAND = "contribution_configuration.remove_alternative_group";
const BULK_CONFIGURATION_COMMAND = "contribution_configuration.bulk_apply";

export type ContributionConfigurationErrorCode =
  | "invalid_input"
  | "not_authorized"
  | "not_found"
  | "constraint_conflict"
  | "revision_conflict"
  | "intent_conflict"
  | "persistence_unavailable";

export class ContributionConfigurationError extends Error {
  constructor(
    readonly code: ContributionConfigurationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ContributionConfigurationError";
  }
}

type MutationBase = {
  database: D1DatabaseLike;
  actor: EstimateD1Actor;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  intentId: string;
  now?: string;
};

export type EnsureEstimateContributionScopeInput = MutationBase;

export type CreateOrReplaceEstimateAlternativeGroupInput = MutationBase & {
  groupId: string;
  name?: string;
  rowItemIds: readonly string[];
  selectedRowItemId: string;
  expectedGroupRevision: number | null;
  expectedContributionRevision: number;
};

export type MarkEstimateContributionRowOptionalInput = MutationBase & {
  rowItemId: string;
  isIncluded: boolean;
  expectedOptionalRevision: number | null;
  expectedContributionRevision: number;
};

export type UnmarkEstimateContributionRowOptionalInput = MutationBase & {
  rowItemId: string;
  expectedOptionalRevision: number;
  expectedContributionRevision: number;
};

export type RemoveEstimateAlternativeGroupInput = MutationBase & {
  groupId: string;
  expectedGroupRevision: number;
  expectedContributionRevision: number;
};

export type ApplyEstimateContributionConfigurationBulkInput = MutationBase & {
  expectedContributionRevision: number | null;
  operation:
    | {
        kind: "configure_alternatives";
        groupId: string;
        name: string;
        rowItemIds: readonly string[];
        selectedRowItemId: string;
        expectedGroupRevision: number | null;
      }
    | {
        kind: "mark_optional";
        rows: readonly {
          rowItemId: string;
          isIncluded: boolean;
          expectedOptionalRevision: number | null;
        }[];
      };
};

export type EnsureEstimateContributionScopeResult = {
  kind: "contribution_scope_ensured";
  contributionScopeId: string;
  contributionRevision: number;
  changed: boolean;
  replayed: boolean;
};

export type EstimateAlternativeGroupConfigurationResult = {
  kind: "alternative_group_configured";
  contributionScopeId: string;
  groupId: string;
  name: string;
  rowItemIds: string[];
  selectedRowItemId: string;
  groupRevision: number;
  contributionRevision: number;
  changed: boolean;
  replayed: boolean;
};

export type MarkEstimateContributionRowOptionalResult = {
  kind: "optional_row_marked";
  contributionScopeId: string;
  rowItemId: string;
  isIncluded: boolean;
  optionalRevision: number;
  contributionRevision: number;
  changed: boolean;
  replayed: boolean;
};

export type UnmarkEstimateContributionRowOptionalResult = {
  kind: "optional_row_unmarked";
  contributionScopeId: string;
  rowItemId: string;
  optionalRevision: null;
  contributionRevision: number;
  changed: true;
  replayed: boolean;
};

export type RemoveEstimateAlternativeGroupResult = {
  kind: "alternative_group_removed";
  contributionScopeId: string;
  groupId: string;
  removedRowItemIds: string[];
  groupRevision: null;
  contributionRevision: number;
  changed: true;
  replayed: boolean;
};

export type ApplyEstimateContributionConfigurationBulkResult = {
  kind: "contribution_configuration_bulk_applied";
  contributionScopeId: string;
  contributionRevision: number;
  changed: true;
  changedRowItemIds: string[];
  changedGroupIds: string[];
  replayed: boolean;
};

type ReceiptResult =
  | Omit<EnsureEstimateContributionScopeResult, "replayed">
  | Omit<EstimateAlternativeGroupConfigurationResult, "replayed">
  | Omit<MarkEstimateContributionRowOptionalResult, "replayed">
  | Omit<UnmarkEstimateContributionRowOptionalResult, "replayed">
  | Omit<RemoveEstimateAlternativeGroupResult, "replayed">
  | Omit<ApplyEstimateContributionConfigurationBulkResult, "replayed">;

type ScopeStateRow = { id: string; revision: number };
type GroupStateRow = {
  name: string;
  selected_row_item_id: string;
  group_revision: number;
  contribution_revision: number;
  member_ids_json: string;
};
type GroupRowsValidationRow = {
  contribution_revision: number;
  valid_count: number;
  node_count: number;
  root_count: number;
  unavailable_count: number;
};
type OptionalStateRow = {
  contribution_revision: number;
  optional_revision: number | null;
  is_included: number | boolean | null;
  is_root: number | boolean;
  alternative_count: number;
};

function requiredIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new ContributionConfigurationError("invalid_input", `${label} is required.`);
  return normalized;
}

function positiveRevision(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ContributionConfigurationError("invalid_input", `${label} must be a positive integer.`);
  }
  return value;
}

function nullablePositiveRevision(value: number | null, label: string) {
  return value === null ? null : positiveRevision(value, label);
}

function normalizedTimestamp(value: string | undefined) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new ContributionConfigurationError("invalid_input", "Mutation timestamp is invalid.");
  }
  return date.toISOString();
}

function readBoolean(value: number | boolean | null) {
  return value === true || value === 1;
}

function normalizeBase<T extends MutationBase>(rawInput: T) {
  const input = {
    ...rawInput,
    projectId: requiredIdentifier(rawInput.projectId, "Project"),
    estimateId: requiredIdentifier(rawInput.estimateId, "Estimate"),
    estimateTabId: requiredIdentifier(rawInput.estimateTabId, "Estimate tab"),
    contributionScopeId: requiredIdentifier(rawInput.contributionScopeId, "Contribution scope"),
    intentId: requiredIdentifier(rawInput.intentId, "Mutation intent"),
  };
  if (input.intentId.length > 128) {
    throw new ContributionConfigurationError("invalid_input", "Mutation intent is too long.");
  }
  return input;
}

function normalizeRowIds(values: readonly string[]) {
  if (!Array.isArray(values)) {
    throw new ContributionConfigurationError("invalid_input", "Alternative rows must be an array.");
  }
  const normalized = values.map((value) => requiredIdentifier(value, "Alternative row"));
  const unique = [...new Set(normalized)];
  if (unique.length < 2) {
    throw new ContributionConfigurationError("invalid_input", "An alternative group requires at least two distinct rows.");
  }
  return unique;
}

function parseStringArray(value: string, label: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) return parsed;
  } catch {}
  throw new ContributionConfigurationError("persistence_unavailable", `${label} is invalid.`);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function hasValidReceiptBase(result: Record<string, unknown>) {
  return typeof result.contributionScopeId === "string"
    && Number.isSafeInteger(result.contributionRevision)
    && typeof result.changed === "boolean";
}

function isAlternativeGroupReceipt(result: Record<string, unknown>) {
  return result.kind === "alternative_group_configured"
    && typeof result.groupId === "string"
    && typeof result.name === "string"
    && isStringArray(result.rowItemIds)
    && typeof result.selectedRowItemId === "string"
    && Number.isSafeInteger(result.groupRevision);
}

function isMarkedOptionalReceipt(result: Record<string, unknown>) {
  return result.kind === "optional_row_marked"
    && typeof result.rowItemId === "string"
    && typeof result.isIncluded === "boolean"
    && Number.isSafeInteger(result.optionalRevision);
}

function isUnmarkedOptionalReceipt(result: Record<string, unknown>) {
  return result.kind === "optional_row_unmarked"
    && typeof result.rowItemId === "string"
    && result.optionalRevision === null
    && result.changed === true;
}

function isRemovedAlternativeGroupReceipt(result: Record<string, unknown>) {
  return result.kind === "alternative_group_removed"
    && typeof result.groupId === "string"
    && isStringArray(result.removedRowItemIds)
    && result.groupRevision === null
    && result.changed === true;
}

function isBulkConfigurationReceipt(result: Record<string, unknown>) {
  return result.kind === "contribution_configuration_bulk_applied"
    && isStringArray(result.changedRowItemIds)
    && isStringArray(result.changedGroupIds)
    && result.changed === true;
}

function isContributionReceipt(result: Record<string, unknown>) {
  return [
    (value: Record<string, unknown>) => value.kind === "contribution_scope_ensured",
    isAlternativeGroupReceipt,
    isMarkedOptionalReceipt,
    isUnmarkedOptionalReceipt,
    isRemovedAlternativeGroupReceipt,
    isBulkConfigurationReceipt,
  ].some((validate) => validate(result));
}

function readReceiptResult(value: unknown): ReceiptResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContributionConfigurationError("persistence_unavailable", "The committed contribution-configuration receipt is invalid.");
  }
  const result = value as Partial<ReceiptResult> & Record<string, unknown>;
  if (!hasValidReceiptBase(result)) {
    throw new ContributionConfigurationError("persistence_unavailable", "The committed contribution-configuration receipt is invalid.");
  }
  if (isContributionReceipt(result)) return result as ReceiptResult;
  throw new ContributionConfigurationError("persistence_unavailable", "The committed contribution-configuration receipt is invalid.");
}

function mapIntentError(error: unknown): never {
  if (error instanceof ContributionConfigurationError) throw error;
  if (error instanceof MutationIntentConflictError) {
    throw new ContributionConfigurationError("intent_conflict", error.message, { cause: error });
  }
  if (error instanceof Error && error.message === "Estimate edit access denied.") {
    throw new ContributionConfigurationError("not_authorized", error.message, { cause: error });
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
      "Contribution configuration could not be saved.",
    );
  } catch (error) {
    try {
      const committed = await readConcurrentEstimateMutationReceipt<ReceiptResult>(input.database, input.context);
      if (committed) return { ...readReceiptResult(committed), replayed: true };
    } catch (receiptError) {
      mapIntentError(receiptError);
    }
    if (error instanceof MutationIntentConflictError) mapIntentError(error);
    throw error;
  }
  return null;
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

async function readGroupState(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  groupId: string;
}) {
  return input.database.prepare<GroupStateRow>(`
    SELECT group_row.name, group_row.selected_row_item_id,
           group_row.revision AS group_revision, scope.revision AS contribution_revision,
           COALESCE((
             SELECT json_group_array(row_item_id)
             FROM (
               SELECT row_item_id
               FROM estimate_alternative_members
               WHERE contribution_scope_id = scope.id AND group_id = group_row.id
               ORDER BY sort_order, row_item_id
             )
           ), '[]') AS member_ids_json
    FROM estimate_alternative_groups AS group_row
    JOIN estimate_contribution_scopes AS scope ON scope.id = group_row.contribution_scope_id
    WHERE group_row.id = ? AND scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
      AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
    LIMIT 1
  `).bind(
    input.groupId, input.contributionScopeId, input.workspaceId, input.projectId,
    input.estimateId, input.estimateTabId,
  ).first<GroupStateRow>();
}

async function validateGroupRows(input: {
  database: D1DatabaseLike;
  workspaceId: string;
  projectId: string;
  estimateId: string;
  estimateTabId: string;
  contributionScopeId: string;
  groupId: string;
  rowItemIdsJson: string;
}) {
  return input.database.prepare<GroupRowsValidationRow>(`
    WITH requested AS (
      SELECT CAST(key AS INTEGER) AS sort_order, CAST(value AS TEXT) AS row_item_id
      FROM json_each(?)
    ), valid_rows AS (
      SELECT requested.row_item_id, node.id AS node_id,
             NOT EXISTS (
               SELECT 1 FROM estimate_accessory_edges
               WHERE contribution_scope_id = scope.id AND child_row_item_id = requested.row_item_id
             ) AS is_root,
             EXISTS (
               SELECT 1 FROM estimate_optional_items
               WHERE contribution_scope_id = scope.id AND row_item_id = requested.row_item_id
             ) OR EXISTS (
               SELECT 1 FROM estimate_alternative_members
               WHERE contribution_scope_id = scope.id AND row_item_id = requested.row_item_id AND group_id <> ?
             ) AS is_unavailable
      FROM requested
      JOIN estimate_contribution_scopes AS scope ON scope.id = ?
      JOIN estimate_row_items AS row_item
        ON row_item.id = requested.row_item_id AND row_item.estimate_id = scope.estimate_id
      JOIN estimate_nodes AS node
        ON node.id = row_item.node_id AND node.estimate_id = scope.estimate_id
       AND node.estimate_tab_id = scope.estimate_tab_id
      WHERE scope.workspace_id = ? AND scope.project_id = ? AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
    )
    SELECT scope.revision AS contribution_revision,
           (SELECT COUNT(*) FROM valid_rows) AS valid_count,
           (SELECT COUNT(DISTINCT node_id) FROM valid_rows) AS node_count,
           (SELECT COUNT(*) FROM valid_rows WHERE is_root) AS root_count,
           (SELECT COUNT(*) FROM valid_rows WHERE is_unavailable) AS unavailable_count
    FROM estimate_contribution_scopes AS scope
    WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
      AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
    LIMIT 1
  `).bind(
    input.rowItemIdsJson, input.groupId, input.contributionScopeId, input.workspaceId,
    input.projectId, input.estimateId, input.estimateTabId, input.contributionScopeId,
    input.workspaceId, input.projectId, input.estimateId, input.estimateTabId,
  ).first<GroupRowsValidationRow>();
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
    SELECT scope.revision AS contribution_revision,
           optional_row.revision AS optional_revision,
           optional_row.is_included,
           NOT EXISTS (
             SELECT 1 FROM estimate_accessory_edges
             WHERE contribution_scope_id = scope.id AND child_row_item_id = row_item.id
           ) AS is_root,
           (SELECT COUNT(*) FROM estimate_alternative_members
            WHERE contribution_scope_id = scope.id AND row_item_id = row_item.id) AS alternative_count
    FROM estimate_contribution_scopes AS scope
    JOIN estimate_row_items AS row_item ON row_item.id = ? AND row_item.estimate_id = scope.estimate_id
    JOIN estimate_nodes AS node
      ON node.id = row_item.node_id AND node.estimate_id = scope.estimate_id
     AND node.estimate_tab_id = scope.estimate_tab_id
    LEFT JOIN estimate_optional_items AS optional_row
      ON optional_row.contribution_scope_id = scope.id AND optional_row.row_item_id = row_item.id
    WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
      AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
    LIMIT 1
  `).bind(
    input.rowItemId, input.contributionScopeId, input.workspaceId, input.projectId,
    input.estimateId, input.estimateTabId,
  ).first<OptionalStateRow>();
}

function appendHistory(
  statements: Array<{ sql: string; values?: readonly unknown[] }>,
  history: Awaited<ReturnType<typeof prepareHistoryEventInsert>>,
) {
  if (history.statement) statements.push(history.statement, history.outboxStatement);
}

export async function ensureEstimateContributionScope(
  rawInput: EnsureEstimateContributionScopeInput,
): Promise<EnsureEstimateContributionScopeResult> {
  const input = normalizeBase(rawInput);
  const request = {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId,
  };
  const prepared = await prepareIntent<Omit<EnsureEstimateContributionScopeResult, "replayed">>(
    input.database, input.actor, { ...input, commandKind: ENSURE_SCOPE_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };

  const state = await readScopeState({ ...input, workspaceId: prepared.context.workspaceId });
  const now = normalizedTimestamp(input.now);
  const result: Omit<EnsureEstimateContributionScopeResult, "replayed"> = {
    kind: "contribution_scope_ensured",
    contributionScopeId: state?.id ?? input.contributionScopeId,
    contributionRevision: Number(state?.revision ?? 1),
    changed: !state,
  };
  const guardSql = `
    SELECT 1 FROM estimate_contribution_scopes
    WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
  `;
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context,
    resourceType: "estimate_contribution_scope",
    resourceId: result.contributionScopeId,
    result,
    timestamp: now,
    guardSql,
    guardValues: [
      result.contributionScopeId, prepared.context.workspaceId, input.projectId,
      input.estimateId, input.estimateTabId, result.contributionRevision,
    ],
  });
  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [];
  if (!state) {
    const history = await prepareHistoryEventInsert(input.database, {
      projectId: input.projectId,
      estimateId: input.estimateId,
      workspaceId: prepared.context.workspaceId,
      estimateTabId: input.estimateTabId,
      eventType: "contribution_scope_created",
      actorUserId: input.actor.userId,
      correlationId: prepared.context.intentId,
      changedFields: ["contributionScopeId", "contributionRevision"],
      oldSnapshot: null,
      newSnapshot: result,
      payload: { contributionScopeId: result.contributionScopeId },
    });
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
        input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
        input.estimateTabId, now, now, input.estimateTabId, input.estimateId, input.projectId,
        prepared.context.workspaceId, prepared.context.workspaceId, input.projectId, input.estimateId,
        input.estimateTabId,
      ],
    }, receipt, buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId));
    appendHistory(statements, history);
  } else {
    statements.push(receipt);
  }
  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "contribution_scope_ensured") return replay;
  } catch (error) {
    const latest = await readScopeState({ ...input, workspaceId: prepared.context.workspaceId });
    if (latest && latest.id !== result.contributionScopeId) {
      throw new ContributionConfigurationError("revision_conflict", "A contribution scope was created concurrently. Refresh and try again.", { cause: error });
    }
    throw new ContributionConfigurationError("persistence_unavailable", "Contribution scope could not be saved.", { cause: error });
  }
  return { ...result, replayed: false };
}

export async function createOrReplaceEstimateAlternativeGroup(
  rawInput: CreateOrReplaceEstimateAlternativeGroupInput,
): Promise<EstimateAlternativeGroupConfigurationResult> {
  const base = normalizeBase(rawInput);
  const groupId = requiredIdentifier(rawInput.groupId, "Alternative group");
  const selectedRowItemId = requiredIdentifier(rawInput.selectedRowItemId, "Selected row");
  const rowItemIds = normalizeRowIds(rawInput.rowItemIds);
  if (!rowItemIds.includes(selectedRowItemId)) {
    throw new ContributionConfigurationError("invalid_input", "The selected row must belong to the alternative group.");
  }
  const name = (rawInput.name ?? "").trim();
  if (name.length > 160) throw new ContributionConfigurationError("invalid_input", "Alternative group name is too long.");
  const expectedGroupRevision = nullablePositiveRevision(rawInput.expectedGroupRevision, "Alternative group revision");
  const expectedContributionRevision = positiveRevision(rawInput.expectedContributionRevision, "Contribution revision");
  const input = { ...base, groupId, selectedRowItemId, rowItemIds, name, expectedGroupRevision, expectedContributionRevision };
  const request = {
    projectId: input.projectId, estimateId: input.estimateId, estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId, groupId, name, rowItemIds, selectedRowItemId,
    expectedGroupRevision, expectedContributionRevision,
  };
  const prepared = await prepareIntent<Omit<EstimateAlternativeGroupConfigurationResult, "replayed">>(
    input.database, input.actor, { ...input, commandKind: UPSERT_ALTERNATIVE_GROUP_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };

  const rowItemIdsJson = JSON.stringify(rowItemIds);
  const [state, validation] = await Promise.all([
    readGroupState({ ...input, workspaceId: prepared.context.workspaceId }),
    validateGroupRows({ ...input, workspaceId: prepared.context.workspaceId, rowItemIdsJson }),
  ]);
  if (!validation) throw new ContributionConfigurationError("not_found", "The contribution scope was not found in this estimate tab.");
  if (Number(validation.contribution_revision) !== expectedContributionRevision) {
    throw new ContributionConfigurationError("revision_conflict", "Contribution configuration changed elsewhere. Refresh and try again.");
  }
  if ((state ? Number(state.group_revision) : null) !== expectedGroupRevision) {
    throw new ContributionConfigurationError("revision_conflict", "The alternative group changed elsewhere. Refresh and try again.");
  }
  if (Number(validation.valid_count) !== rowItemIds.length) {
    throw new ContributionConfigurationError("not_found", "Every alternative row must belong to this estimate tab.");
  }
  if (Number(validation.node_count) !== 1) {
    throw new ContributionConfigurationError("constraint_conflict", "Alternative rows must belong to the same estimate node.");
  }
  if (Number(validation.root_count) !== rowItemIds.length) {
    throw new ContributionConfigurationError("constraint_conflict", "Alternative rows must be assembly roots.");
  }
  if (Number(validation.unavailable_count) > 0) {
    throw new ContributionConfigurationError("constraint_conflict", "An alternative row is already optional or belongs to another alternative group.");
  }

  const currentMembers = state ? parseStringArray(state.member_ids_json, "The persisted alternative members") : [];
  const changed = !state
    || state.name !== name
    || state.selected_row_item_id !== selectedRowItemId
    || JSON.stringify(currentMembers) !== rowItemIdsJson;
  const groupRevision = (state ? Number(state.group_revision) : 0) + (changed ? 1 : 0);
  const contributionRevision = expectedContributionRevision + (changed ? 1 : 0);
  const result: Omit<EstimateAlternativeGroupConfigurationResult, "replayed"> = {
    kind: "alternative_group_configured",
    contributionScopeId: input.contributionScopeId,
    groupId,
    name,
    rowItemIds,
    selectedRowItemId,
    groupRevision,
    contributionRevision,
    changed,
  };
  const now = normalizedTimestamp(input.now);
  const marker = guardedD1Timestamp(now, prepared.context.requestFingerprint);
  const guardSql = `
    SELECT 1 FROM estimate_alternative_groups AS group_row
    JOIN estimate_contribution_scopes AS scope ON scope.id = group_row.contribution_scope_id
    WHERE group_row.id = ? AND scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
      AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND group_row.name = ?
      AND group_row.selected_row_item_id = ? AND group_row.revision = ? AND scope.revision = ?
      ${changed ? "AND group_row.updated_at = ? AND scope.updated_at = ?" : ""}
      AND (SELECT COUNT(*) FROM estimate_alternative_members WHERE contribution_scope_id = scope.id AND group_id = group_row.id) = ?
      AND (
        SELECT COUNT(DISTINCT row_item.node_id)
        FROM estimate_alternative_members AS member
        JOIN estimate_row_items AS row_item
          ON row_item.id = member.row_item_id AND row_item.estimate_id = scope.estimate_id
        JOIN estimate_nodes AS node
          ON node.id = row_item.node_id AND node.estimate_id = scope.estimate_id
         AND node.estimate_tab_id = scope.estimate_tab_id
        WHERE member.contribution_scope_id = scope.id AND member.group_id = group_row.id
      ) = 1
      AND NOT EXISTS (
        SELECT 1 FROM estimate_alternative_members
        WHERE contribution_scope_id = scope.id AND group_id = group_row.id
          AND row_item_id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?))
      )
  `;
  const guardValues: D1Value[] = [
    groupId, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
    input.estimateId, input.estimateTabId, name, selectedRowItemId, groupRevision,
    contributionRevision, ...(changed ? [marker, marker] : []), rowItemIds.length, rowItemIdsJson,
  ];
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context,
    resourceType: "estimate_alternative_group",
    resourceId: groupId,
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
      targetRowId: selectedRowItemId,
      eventType: state ? "alternative_group_replaced" : "alternative_group_created",
      actorUserId: input.actor.userId,
      correlationId: prepared.context.intentId,
      changedFields: ["alternativeMembers", "selectedRowItemId", "contributionRevision"],
      oldSnapshot: state ? { groupId, name: state.name, rowItemIds: currentMembers, selectedRowItemId: state.selected_row_item_id, groupRevision: Number(state.group_revision) } : null,
      newSnapshot: result,
      payload: { contributionScopeId: input.contributionScopeId, groupId },
    });
    if (state) {
      statements.push({
        sql: `
          UPDATE estimate_alternative_groups
          SET name = ?, selected_row_item_id = ?, revision = revision + 1, updated_at = ?
          WHERE id = ? AND contribution_scope_id = ? AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_contribution_scopes
              WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
            )
        `,
        values: [
          name, selectedRowItemId, marker, groupId, input.contributionScopeId, expectedGroupRevision,
          input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
          input.estimateTabId, expectedContributionRevision,
        ],
      });
    } else {
      statements.push({
        sql: `
          INSERT INTO estimate_alternative_groups (
            id, contribution_scope_id, selected_row_item_id, name, revision, created_at, updated_at
          )
          SELECT ?, ?, ?, ?, 1, ?, ?
          WHERE EXISTS (
            SELECT 1 FROM estimate_contribution_scopes
            WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
          )
          AND NOT EXISTS (SELECT 1 FROM estimate_alternative_groups WHERE id = ?)
        `,
        values: [
          groupId, input.contributionScopeId, selectedRowItemId, name, now, marker,
          input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
          input.estimateTabId, expectedContributionRevision, groupId,
        ],
      });
    }
    statements.push(
      {
        sql: `
          DELETE FROM estimate_alternative_members
          WHERE contribution_scope_id = ? AND group_id = ?
            AND EXISTS (
              SELECT 1 FROM estimate_alternative_groups
              WHERE id = ? AND contribution_scope_id = ? AND revision = ? AND updated_at = ?
            )
        `,
        values: [input.contributionScopeId, groupId, groupId, input.contributionScopeId, groupRevision, marker],
      },
      {
        sql: `
          INSERT INTO estimate_alternative_members (
            contribution_scope_id, group_id, row_item_id, sort_order, created_at
          )
          SELECT ?, ?, requested.row_item_id, requested.sort_order, ?
          FROM (
            SELECT CAST(key AS INTEGER) AS sort_order, CAST(value AS TEXT) AS row_item_id
            FROM json_each(?)
          ) AS requested
          JOIN estimate_row_items AS row_item ON row_item.id = requested.row_item_id AND row_item.estimate_id = ?
          JOIN estimate_nodes AS node ON node.id = row_item.node_id AND node.estimate_id = ? AND node.estimate_tab_id = ?
          WHERE EXISTS (
            SELECT 1 FROM estimate_alternative_groups
            WHERE id = ? AND contribution_scope_id = ? AND revision = ? AND updated_at = ?
          )
          AND NOT EXISTS (
            SELECT 1 FROM estimate_accessory_edges
            WHERE contribution_scope_id = ? AND child_row_item_id = requested.row_item_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM estimate_optional_items
            WHERE contribution_scope_id = ? AND row_item_id = requested.row_item_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM estimate_alternative_members
            WHERE contribution_scope_id = ? AND row_item_id = requested.row_item_id
          )
        `,
        values: [
          input.contributionScopeId, groupId, now, rowItemIdsJson, input.estimateId, input.estimateId,
          input.estimateTabId, groupId, input.contributionScopeId, groupRevision, marker,
          input.contributionScopeId, input.contributionScopeId, input.contributionScopeId,
        ],
      },
      {
        sql: `
          UPDATE estimate_contribution_scopes
          SET revision = revision + 1, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_alternative_groups
              WHERE id = ? AND contribution_scope_id = ? AND selected_row_item_id = ? AND revision = ? AND updated_at = ?
            )
            AND (SELECT COUNT(*) FROM estimate_alternative_members WHERE contribution_scope_id = ? AND group_id = ?) = ?
            AND (
              SELECT COUNT(DISTINCT row_item.node_id)
              FROM estimate_alternative_members AS member
              JOIN estimate_row_items AS row_item
                ON row_item.id = member.row_item_id AND row_item.estimate_id = estimate_contribution_scopes.estimate_id
              JOIN estimate_nodes AS node
                ON node.id = row_item.node_id AND node.estimate_id = estimate_contribution_scopes.estimate_id
               AND node.estimate_tab_id = estimate_contribution_scopes.estimate_tab_id
              WHERE member.contribution_scope_id = estimate_contribution_scopes.id AND member.group_id = ?
            ) = 1
            AND EXISTS (
              SELECT 1 FROM estimate_alternative_members
              WHERE contribution_scope_id = ? AND group_id = ? AND row_item_id = ?
            )
        `,
        values: [
          marker, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
          input.estimateId, input.estimateTabId, expectedContributionRevision, groupId,
          input.contributionScopeId, selectedRowItemId, groupRevision, marker,
          input.contributionScopeId, groupId, rowItemIds.length, groupId,
          input.contributionScopeId, groupId, selectedRowItemId,
        ],
      },
      receipt,
      buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId),
    );
    appendHistory(statements, history);
  } else {
    statements.push(receipt);
  }
  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "alternative_group_configured") return replay;
  } catch (error) {
    const latest = await readGroupState({ ...input, workspaceId: prepared.context.workspaceId });
    if ((latest ? Number(latest.group_revision) : null) !== expectedGroupRevision) {
      throw new ContributionConfigurationError("revision_conflict", "The alternative group changed elsewhere. Refresh and try again.", { cause: error });
    }
    throw new ContributionConfigurationError("persistence_unavailable", "Alternative group could not be saved.", { cause: error });
  }
  return { ...result, replayed: false };
}

export async function markEstimateContributionRowOptional(
  rawInput: MarkEstimateContributionRowOptionalInput,
): Promise<MarkEstimateContributionRowOptionalResult> {
  if (typeof rawInput.isIncluded !== "boolean") {
    throw new ContributionConfigurationError("invalid_input", "Optional inclusion must be a boolean.");
  }
  const base = normalizeBase(rawInput);
  const rowItemId = requiredIdentifier(rawInput.rowItemId, "Optional row");
  const expectedOptionalRevision = nullablePositiveRevision(rawInput.expectedOptionalRevision, "Optional item revision");
  const expectedContributionRevision = positiveRevision(rawInput.expectedContributionRevision, "Contribution revision");
  const input = { ...base, rowItemId, expectedOptionalRevision, expectedContributionRevision, isIncluded: rawInput.isIncluded };
  const request = {
    projectId: input.projectId, estimateId: input.estimateId, estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId, rowItemId, isIncluded: input.isIncluded,
    expectedOptionalRevision, expectedContributionRevision,
  };
  const prepared = await prepareIntent<Omit<MarkEstimateContributionRowOptionalResult, "replayed">>(
    input.database, input.actor, { ...input, commandKind: MARK_OPTIONAL_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };
  const state = await readOptionalState({ ...input, workspaceId: prepared.context.workspaceId });
  if (!state) throw new ContributionConfigurationError("not_found", "The row was not found in this estimate tab.");
  if (Number(state.contribution_revision) !== expectedContributionRevision || state.optional_revision !== expectedOptionalRevision) {
    throw new ContributionConfigurationError("revision_conflict", "Optional configuration changed elsewhere. Refresh and try again.");
  }
  if (!readBoolean(state.is_root)) throw new ContributionConfigurationError("constraint_conflict", "Optional rows must be assembly roots.");
  if (Number(state.alternative_count) > 0) {
    throw new ContributionConfigurationError("constraint_conflict", "An alternative member cannot also be optional.");
  }
  const changed = state.optional_revision === null || readBoolean(state.is_included) !== input.isIncluded;
  const optionalRevision = Number(state.optional_revision ?? 0) + (changed ? 1 : 0);
  const contributionRevision = expectedContributionRevision + (changed ? 1 : 0);
  const result: Omit<MarkEstimateContributionRowOptionalResult, "replayed"> = {
    kind: "optional_row_marked", contributionScopeId: input.contributionScopeId, rowItemId,
    isIncluded: input.isIncluded, optionalRevision, contributionRevision, changed,
  };
  const now = normalizedTimestamp(input.now);
  const marker = guardedD1Timestamp(now, prepared.context.requestFingerprint);
  const guardSql = `
    SELECT 1 FROM estimate_optional_items AS optional_row
    JOIN estimate_contribution_scopes AS scope ON scope.id = optional_row.contribution_scope_id
    WHERE optional_row.contribution_scope_id = ? AND optional_row.row_item_id = ?
      AND scope.workspace_id = ? AND scope.project_id = ? AND scope.estimate_id = ? AND scope.estimate_tab_id = ?
      AND optional_row.is_included = ? AND optional_row.revision = ? AND scope.revision = ?
      ${changed ? "AND optional_row.updated_at = ? AND scope.updated_at = ?" : ""}
  `;
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context,
    resourceType: "estimate_optional_item",
    resourceId: rowItemId,
    result,
    timestamp: now,
    guardSql,
    guardValues: [
      input.contributionScopeId, rowItemId, prepared.context.workspaceId, input.projectId,
      input.estimateId, input.estimateTabId, input.isIncluded ? 1 : 0, optionalRevision,
      contributionRevision, ...(changed ? [marker, marker] : []),
    ],
  });
  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [];
  if (changed) {
    const history = await prepareHistoryEventInsert(input.database, {
      projectId: input.projectId, estimateId: input.estimateId, workspaceId: prepared.context.workspaceId,
      estimateTabId: input.estimateTabId, targetRowId: rowItemId,
      eventType: state.optional_revision === null ? "optional_row_marked" : "optional_inclusion_changed",
      actorUserId: input.actor.userId, correlationId: prepared.context.intentId,
      changedFields: ["isOptional", "isIncluded", "contributionRevision"],
      oldSnapshot: state.optional_revision === null ? null : { isIncluded: readBoolean(state.is_included), optionalRevision: state.optional_revision },
      newSnapshot: result,
      payload: { contributionScopeId: input.contributionScopeId },
    });
    if (state.optional_revision === null) {
      statements.push({
        sql: `
          INSERT INTO estimate_optional_items (
            contribution_scope_id, row_item_id, is_included, revision, created_at, updated_at
          )
          SELECT ?, ?, ?, 1, ?, ?
          WHERE EXISTS (
            SELECT 1 FROM estimate_contribution_scopes AS scope
            JOIN estimate_row_items AS row_item ON row_item.id = ? AND row_item.estimate_id = scope.estimate_id
            JOIN estimate_nodes AS node ON node.id = row_item.node_id AND node.estimate_id = scope.estimate_id AND node.estimate_tab_id = scope.estimate_tab_id
            WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
              AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ?
              AND NOT EXISTS (SELECT 1 FROM estimate_accessory_edges WHERE contribution_scope_id = scope.id AND child_row_item_id = row_item.id)
              AND NOT EXISTS (SELECT 1 FROM estimate_alternative_members WHERE contribution_scope_id = scope.id AND row_item_id = row_item.id)
          )
        `,
        values: [
          input.contributionScopeId, rowItemId, input.isIncluded ? 1 : 0, now, marker, rowItemId,
          input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
          input.estimateTabId, expectedContributionRevision,
        ],
      });
    } else {
      statements.push({
        sql: `
          UPDATE estimate_optional_items
          SET is_included = ?, revision = revision + 1, updated_at = ?
          WHERE contribution_scope_id = ? AND row_item_id = ? AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_contribution_scopes
              WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
            )
        `,
        values: [
          input.isIncluded ? 1 : 0, marker, input.contributionScopeId, rowItemId,
          expectedOptionalRevision, input.contributionScopeId, prepared.context.workspaceId,
          input.projectId, input.estimateId, input.estimateTabId, expectedContributionRevision,
        ],
      });
    }
    statements.push(
      {
        sql: `
          UPDATE estimate_contribution_scopes
          SET revision = revision + 1, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
            AND EXISTS (
              SELECT 1 FROM estimate_optional_items
              WHERE contribution_scope_id = ? AND row_item_id = ? AND is_included = ? AND revision = ? AND updated_at = ?
            )
        `,
        values: [
          marker, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
          input.estimateId, input.estimateTabId, expectedContributionRevision, input.contributionScopeId,
          rowItemId, input.isIncluded ? 1 : 0, optionalRevision, marker,
        ],
      },
      receipt,
      buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId),
    );
    appendHistory(statements, history);
  } else {
    statements.push(receipt);
  }
  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "optional_row_marked") return replay;
  } catch (error) {
    const latest = await readOptionalState({ ...input, workspaceId: prepared.context.workspaceId });
    if (!latest || latest.optional_revision !== expectedOptionalRevision || Number(latest.contribution_revision) !== expectedContributionRevision) {
      throw new ContributionConfigurationError("revision_conflict", "Optional configuration changed elsewhere. Refresh and try again.", { cause: error });
    }
    throw new ContributionConfigurationError("persistence_unavailable", "Optional configuration could not be saved.", { cause: error });
  }
  return { ...result, replayed: false };
}

export async function unmarkEstimateContributionRowOptional(
  rawInput: UnmarkEstimateContributionRowOptionalInput,
): Promise<UnmarkEstimateContributionRowOptionalResult> {
  const base = normalizeBase(rawInput);
  const rowItemId = requiredIdentifier(rawInput.rowItemId, "Optional row");
  const expectedOptionalRevision = positiveRevision(rawInput.expectedOptionalRevision, "Optional item revision");
  const expectedContributionRevision = positiveRevision(rawInput.expectedContributionRevision, "Contribution revision");
  const input = { ...base, rowItemId, expectedOptionalRevision, expectedContributionRevision };
  const request = {
    projectId: input.projectId, estimateId: input.estimateId, estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId, rowItemId, expectedOptionalRevision, expectedContributionRevision,
  };
  const prepared = await prepareIntent<Omit<UnmarkEstimateContributionRowOptionalResult, "replayed">>(
    input.database, input.actor, { ...input, commandKind: UNMARK_OPTIONAL_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };
  const state = await readOptionalState({ ...input, workspaceId: prepared.context.workspaceId });
  if (!state || state.optional_revision === null) throw new ContributionConfigurationError("not_found", "The optional row was not found in this estimate tab.");
  if (state.optional_revision !== expectedOptionalRevision || Number(state.contribution_revision) !== expectedContributionRevision) {
    throw new ContributionConfigurationError("revision_conflict", "Optional configuration changed elsewhere. Refresh and try again.");
  }
  const result: Omit<UnmarkEstimateContributionRowOptionalResult, "replayed"> = {
    kind: "optional_row_unmarked", contributionScopeId: input.contributionScopeId, rowItemId,
    optionalRevision: null, contributionRevision: expectedContributionRevision + 1, changed: true,
  };
  const now = normalizedTimestamp(input.now);
  const marker = guardedD1Timestamp(now, prepared.context.requestFingerprint);
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context, resourceType: "estimate_optional_item", resourceId: rowItemId,
    result, timestamp: now,
    guardSql: `
      SELECT 1 FROM estimate_contribution_scopes AS scope
      WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
        AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ? AND scope.updated_at = ?
        AND NOT EXISTS (
          SELECT 1 FROM estimate_optional_items WHERE contribution_scope_id = scope.id AND row_item_id = ?
        )
    `,
    guardValues: [
      input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
      input.estimateTabId, result.contributionRevision, marker, rowItemId,
    ],
  });
  const history = await prepareHistoryEventInsert(input.database, {
    projectId: input.projectId, estimateId: input.estimateId, workspaceId: prepared.context.workspaceId,
    estimateTabId: input.estimateTabId, targetRowId: rowItemId, eventType: "optional_row_unmarked",
    actorUserId: input.actor.userId, correlationId: prepared.context.intentId,
    changedFields: ["isOptional", "isIncluded", "contributionRevision"],
    oldSnapshot: { isIncluded: readBoolean(state.is_included), optionalRevision: state.optional_revision },
    newSnapshot: null, payload: { contributionScopeId: input.contributionScopeId },
  });
  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [
    {
      sql: `
        DELETE FROM estimate_optional_items
        WHERE contribution_scope_id = ? AND row_item_id = ? AND revision = ?
          AND EXISTS (
            SELECT 1 FROM estimate_contribution_scopes
            WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
          )
      `,
      values: [
        input.contributionScopeId, rowItemId, expectedOptionalRevision, input.contributionScopeId,
        prepared.context.workspaceId, input.projectId, input.estimateId, input.estimateTabId,
        expectedContributionRevision,
      ],
    },
    {
      sql: `
        UPDATE estimate_contribution_scopes
        SET revision = revision + 1, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
          AND NOT EXISTS (SELECT 1 FROM estimate_optional_items WHERE contribution_scope_id = ? AND row_item_id = ?)
      `,
      values: [
        marker, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
        input.estimateId, input.estimateTabId, expectedContributionRevision, input.contributionScopeId, rowItemId,
      ],
    },
    receipt,
    buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId),
  ];
  appendHistory(statements, history);
  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "optional_row_unmarked") return replay;
  } catch (error) {
    const latest = await readOptionalState({ ...input, workspaceId: prepared.context.workspaceId });
    if (!latest || latest.optional_revision !== expectedOptionalRevision || Number(latest.contribution_revision) !== expectedContributionRevision) {
      throw new ContributionConfigurationError("revision_conflict", "Optional configuration changed elsewhere. Refresh and try again.", { cause: error });
    }
    throw new ContributionConfigurationError("persistence_unavailable", "Optional configuration could not be removed.", { cause: error });
  }
  return { ...result, replayed: false };
}

export async function removeEstimateAlternativeGroup(
  rawInput: RemoveEstimateAlternativeGroupInput,
): Promise<RemoveEstimateAlternativeGroupResult> {
  const base = normalizeBase(rawInput);
  const groupId = requiredIdentifier(rawInput.groupId, "Alternative group");
  const expectedGroupRevision = positiveRevision(rawInput.expectedGroupRevision, "Alternative group revision");
  const expectedContributionRevision = positiveRevision(rawInput.expectedContributionRevision, "Contribution revision");
  const input = { ...base, groupId, expectedGroupRevision, expectedContributionRevision };
  const request = {
    projectId: input.projectId, estimateId: input.estimateId, estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId, groupId, expectedGroupRevision, expectedContributionRevision,
  };
  const prepared = await prepareIntent<Omit<RemoveEstimateAlternativeGroupResult, "replayed">>(
    input.database, input.actor, { ...input, commandKind: REMOVE_ALTERNATIVE_GROUP_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };
  const state = await readGroupState({ ...input, workspaceId: prepared.context.workspaceId });
  if (!state) throw new ContributionConfigurationError("not_found", "The alternative group was not found in this estimate tab.");
  if (Number(state.group_revision) !== expectedGroupRevision || Number(state.contribution_revision) !== expectedContributionRevision) {
    throw new ContributionConfigurationError("revision_conflict", "The alternative group changed elsewhere. Refresh and try again.");
  }
  const removedRowItemIds = parseStringArray(state.member_ids_json, "The persisted alternative members");
  const result: Omit<RemoveEstimateAlternativeGroupResult, "replayed"> = {
    kind: "alternative_group_removed", contributionScopeId: input.contributionScopeId, groupId,
    removedRowItemIds, groupRevision: null, contributionRevision: expectedContributionRevision + 1, changed: true,
  };
  const now = normalizedTimestamp(input.now);
  const marker = guardedD1Timestamp(now, prepared.context.requestFingerprint);
  const receipt = buildGuardedReceiptStatement({
    context: prepared.context, resourceType: "estimate_alternative_group", resourceId: groupId,
    result, timestamp: now,
    guardSql: `
      SELECT 1 FROM estimate_contribution_scopes AS scope
      WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
        AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ? AND scope.updated_at = ?
        AND NOT EXISTS (SELECT 1 FROM estimate_alternative_groups WHERE id = ?)
        AND NOT EXISTS (SELECT 1 FROM estimate_alternative_members WHERE contribution_scope_id = scope.id AND group_id = ?)
    `,
    guardValues: [
      input.contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
      input.estimateTabId, result.contributionRevision, marker, groupId, groupId,
    ],
  });
  const history = await prepareHistoryEventInsert(input.database, {
    projectId: input.projectId, estimateId: input.estimateId, workspaceId: prepared.context.workspaceId,
    estimateTabId: input.estimateTabId, targetRowId: state.selected_row_item_id,
    eventType: "alternative_group_removed", actorUserId: input.actor.userId,
    correlationId: prepared.context.intentId,
    changedFields: ["alternativeMembers", "selectedRowItemId", "contributionRevision"],
    oldSnapshot: {
      groupId, name: state.name, rowItemIds: removedRowItemIds,
      selectedRowItemId: state.selected_row_item_id, groupRevision: Number(state.group_revision),
    },
    newSnapshot: null, payload: { contributionScopeId: input.contributionScopeId, groupId },
  });
  const statements: Array<{ sql: string; values?: readonly unknown[] }> = [
    {
      sql: `
        DELETE FROM estimate_alternative_groups
        WHERE id = ? AND contribution_scope_id = ? AND revision = ?
          AND EXISTS (
            SELECT 1 FROM estimate_contribution_scopes
            WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
          )
      `,
      values: [
        groupId, input.contributionScopeId, expectedGroupRevision, input.contributionScopeId,
        prepared.context.workspaceId, input.projectId, input.estimateId, input.estimateTabId,
        expectedContributionRevision,
      ],
    },
    {
      sql: `
        UPDATE estimate_contribution_scopes
        SET revision = revision + 1, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ? AND estimate_tab_id = ? AND revision = ?
          AND NOT EXISTS (SELECT 1 FROM estimate_alternative_groups WHERE id = ?)
          AND NOT EXISTS (SELECT 1 FROM estimate_alternative_members WHERE contribution_scope_id = ? AND group_id = ?)
      `,
      values: [
        marker, input.contributionScopeId, prepared.context.workspaceId, input.projectId,
        input.estimateId, input.estimateTabId, expectedContributionRevision, groupId,
        input.contributionScopeId, groupId,
      ],
    },
    receipt,
    buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId),
  ];
  appendHistory(statements, history);
  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "alternative_group_removed") return replay;
  } catch (error) {
    const latest = await readGroupState({ ...input, workspaceId: prepared.context.workspaceId });
    if (!latest || Number(latest.group_revision) !== expectedGroupRevision || Number(latest.contribution_revision) !== expectedContributionRevision) {
      throw new ContributionConfigurationError("revision_conflict", "The alternative group changed elsewhere. Refresh and try again.", { cause: error });
    }
    throw new ContributionConfigurationError("persistence_unavailable", "Alternative group could not be removed.", { cause: error });
  }
  return { ...result, replayed: false };
}

export async function applyEstimateContributionConfigurationBulk(
  rawInput: ApplyEstimateContributionConfigurationBulkInput,
): Promise<ApplyEstimateContributionConfigurationBulkResult> {
  const input = normalizeBase(rawInput);
  const expectedContributionRevision = rawInput.expectedContributionRevision === null
    ? null
    : positiveRevision(rawInput.expectedContributionRevision, "Contribution revision");
  const operation = rawInput.operation.kind === "configure_alternatives"
    ? {
        kind: rawInput.operation.kind,
        groupId: requiredIdentifier(rawInput.operation.groupId, "Alternative group"),
        name: rawInput.operation.name.trim(),
        rowItemIds: normalizeRowIds(rawInput.operation.rowItemIds),
        selectedRowItemId: requiredIdentifier(rawInput.operation.selectedRowItemId, "Selected row"),
        expectedGroupRevision: nullablePositiveRevision(rawInput.operation.expectedGroupRevision, "Alternative group revision"),
      } as const
    : {
        kind: rawInput.operation.kind,
        rows: rawInput.operation.rows.map((row) => ({
          rowItemId: requiredIdentifier(row.rowItemId, "Optional row"),
          isIncluded: row.isIncluded,
          expectedOptionalRevision: nullablePositiveRevision(row.expectedOptionalRevision, "Optional row revision"),
        })),
      } as const;
  if (operation.kind === "configure_alternatives") {
    if (!operation.rowItemIds.includes(operation.selectedRowItemId)) {
      throw new ContributionConfigurationError("invalid_input", "The selected row must belong to the alternative group.");
    }
    if (operation.name.length > 160) {
      throw new ContributionConfigurationError("invalid_input", "Alternative group name is too long.");
    }
  } else if (operation.rows.length === 0 || new Set(operation.rows.map((row) => row.rowItemId)).size !== operation.rows.length) {
    throw new ContributionConfigurationError("invalid_input", "Bulk optional rows must be non-empty and distinct.");
  }

  const request = {
    projectId: input.projectId,
    estimateId: input.estimateId,
    estimateTabId: input.estimateTabId,
    contributionScopeId: input.contributionScopeId,
    expectedContributionRevision,
    operation,
  };
  const prepared = await prepareIntent<Omit<ApplyEstimateContributionConfigurationBulkResult, "replayed">>(
    input.database,
    input.actor,
    { ...input, commandKind: BULK_CONFIGURATION_COMMAND, request },
  );
  if (prepared.committedResult) return { ...prepared.committedResult, replayed: true };

  const scope = await readScopeState({ ...input, workspaceId: prepared.context.workspaceId });
  if (
    (scope && expectedContributionRevision !== null && Number(scope.revision) !== expectedContributionRevision)
    || (!scope && expectedContributionRevision !== null)
  ) {
    throw new ContributionConfigurationError("revision_conflict", "Contribution settings changed elsewhere. Refresh and try again.");
  }
  const contributionScopeId = scope?.id ?? input.contributionScopeId;
  const guardRevision = Number(scope?.revision ?? 1);
  const contributionRevision = guardRevision + 1;
  const now = normalizedTimestamp(input.now);
  const marker = guardedD1Timestamp(now, prepared.context.requestFingerprint);
  const changedRowItemIds = operation.kind === "configure_alternatives"
    ? operation.rowItemIds
    : operation.rows.map((row) => row.rowItemId);
  const changedGroupIds = operation.kind === "configure_alternatives" ? [operation.groupId] : [];
  const result: Omit<ApplyEstimateContributionConfigurationBulkResult, "replayed"> = {
    kind: "contribution_configuration_bulk_applied",
    contributionScopeId,
    contributionRevision,
    changed: true,
    changedRowItemIds: [...changedRowItemIds],
    changedGroupIds,
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

  let finalGuardSql: string;
  let finalGuardValues: D1Value[];
  if (operation.kind === "configure_alternatives") {
    const rowIdsJson = JSON.stringify(operation.rowItemIds);
    const groupRevision = (operation.expectedGroupRevision ?? 0) + 1;
    statements.push(
      {
        sql: `
          INSERT INTO estimate_alternative_groups (
            id, contribution_scope_id, selected_row_item_id, name, revision, created_at, updated_at
          )
          SELECT ?, ?, ?, ?, 1, ?, ?
          FROM estimate_contribution_scopes AS scope
          WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
            AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ?
            AND (
              (? IS NULL AND NOT EXISTS (SELECT 1 FROM estimate_alternative_groups WHERE id = ?))
              OR
              (? IS NOT NULL AND EXISTS (
                SELECT 1 FROM estimate_alternative_groups WHERE id = ? AND revision = ?
              ))
            )
          ON CONFLICT(id) DO UPDATE SET
            selected_row_item_id = excluded.selected_row_item_id,
            name = excluded.name,
            revision = estimate_alternative_groups.revision + 1,
            updated_at = excluded.updated_at
          WHERE ? IS NOT NULL AND estimate_alternative_groups.revision = ?
        `,
        values: [
          operation.groupId, contributionScopeId, operation.selectedRowItemId, operation.name,
          now, marker, contributionScopeId, prepared.context.workspaceId, input.projectId,
          input.estimateId, input.estimateTabId, guardRevision, operation.expectedGroupRevision,
          operation.groupId, operation.expectedGroupRevision, operation.groupId,
          operation.expectedGroupRevision, operation.expectedGroupRevision, operation.expectedGroupRevision,
        ],
      },
      {
        sql: `
          DELETE FROM estimate_alternative_members
          WHERE contribution_scope_id = ? AND group_id = ?
            AND EXISTS (
              SELECT 1 FROM estimate_alternative_groups AS group_row
              JOIN estimate_contribution_scopes AS scope ON scope.id = group_row.contribution_scope_id
              WHERE group_row.id = ? AND group_row.revision = ? AND group_row.updated_at = ?
                AND scope.revision = ?
            )
        `,
        values: [contributionScopeId, operation.groupId, operation.groupId, groupRevision, marker, guardRevision],
      },
      {
        sql: `
          INSERT INTO estimate_alternative_members (
            contribution_scope_id, group_id, row_item_id, sort_order, created_at
          )
          SELECT ?, ?, requested.row_item_id, requested.sort_order, ?
          FROM (
            SELECT CAST(key AS INTEGER) AS sort_order, CAST(value AS TEXT) AS row_item_id
            FROM json_each(?)
          ) AS requested
          JOIN estimate_row_items AS row_item ON row_item.id = requested.row_item_id AND row_item.estimate_id = ?
          JOIN estimate_nodes AS node ON node.id = row_item.node_id AND node.estimate_tab_id = ?
          WHERE EXISTS (
            SELECT 1 FROM estimate_contribution_scopes
            WHERE id = ? AND workspace_id = ? AND project_id = ? AND estimate_id = ?
              AND estimate_tab_id = ? AND revision = ?
          )
            AND NOT EXISTS (
              SELECT 1 FROM estimate_optional_items
              WHERE contribution_scope_id = ? AND row_item_id = requested.row_item_id
            )
            AND NOT EXISTS (
              SELECT 1 FROM estimate_accessory_edges
              WHERE contribution_scope_id = ? AND child_row_item_id = requested.row_item_id
            )
            AND NOT EXISTS (
              SELECT 1 FROM estimate_alternative_members
              WHERE contribution_scope_id = ? AND row_item_id = requested.row_item_id
            )
            AND 1 = (
              SELECT COUNT(DISTINCT sibling.node_id)
              FROM estimate_row_items AS sibling
              WHERE sibling.id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
                AND sibling.estimate_id = ?
            )
        `,
        values: [
          contributionScopeId, operation.groupId, now, rowIdsJson, input.estimateId, input.estimateTabId,
          contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
          input.estimateTabId, guardRevision, contributionScopeId, contributionScopeId,
          contributionScopeId, rowIdsJson, input.estimateId,
        ],
      },
    );
    finalGuardSql = `
      SELECT 1 FROM estimate_contribution_scopes AS scope
      JOIN estimate_alternative_groups AS group_row ON group_row.contribution_scope_id = scope.id
      WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
        AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ? AND scope.updated_at = ?
        AND group_row.id = ? AND group_row.revision = ? AND group_row.updated_at = ?
        AND group_row.selected_row_item_id = ? AND group_row.name = ?
        AND (SELECT COUNT(*) FROM estimate_alternative_members WHERE group_id = ?) = ?
        AND EXISTS (SELECT 1 FROM estimate_alternative_members WHERE group_id = ? AND row_item_id = ?)
    `;
    finalGuardValues = [
      contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
      input.estimateTabId, contributionRevision, marker, operation.groupId, groupRevision, marker,
      operation.selectedRowItemId, operation.name, operation.groupId, operation.rowItemIds.length,
      operation.groupId, operation.selectedRowItemId,
    ];
  } else {
    for (const row of operation.rows) {
      statements.push({
        sql: `
          INSERT INTO estimate_optional_items (
            contribution_scope_id, row_item_id, is_included, revision, created_at, updated_at
          )
          SELECT ?, ?, ?, 1, ?, ?
          FROM estimate_contribution_scopes AS scope
          JOIN estimate_row_items AS row_item ON row_item.id = ? AND row_item.estimate_id = scope.estimate_id
          JOIN estimate_nodes AS node ON node.id = row_item.node_id AND node.estimate_tab_id = scope.estimate_tab_id
          WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
            AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ?
            AND (
              (? IS NULL AND NOT EXISTS (
                SELECT 1 FROM estimate_optional_items
                WHERE contribution_scope_id = scope.id AND row_item_id = row_item.id
              ))
              OR
              (? IS NOT NULL AND EXISTS (
                SELECT 1 FROM estimate_optional_items
                WHERE contribution_scope_id = scope.id AND row_item_id = row_item.id AND revision = ?
              ))
            )
            AND NOT EXISTS (
              SELECT 1 FROM estimate_alternative_members
              WHERE contribution_scope_id = scope.id AND row_item_id = row_item.id
            )
            AND NOT EXISTS (
              SELECT 1 FROM estimate_accessory_edges
              WHERE contribution_scope_id = scope.id AND child_row_item_id = row_item.id
            )
          ON CONFLICT(contribution_scope_id, row_item_id) DO UPDATE SET
            is_included = excluded.is_included,
            revision = estimate_optional_items.revision + 1,
            updated_at = excluded.updated_at
          WHERE ? IS NOT NULL AND estimate_optional_items.revision = ?
        `,
        values: [
          contributionScopeId, row.rowItemId, row.isIncluded ? 1 : 0, now, marker,
          row.rowItemId, contributionScopeId, prepared.context.workspaceId, input.projectId,
          input.estimateId, input.estimateTabId, guardRevision, row.expectedOptionalRevision,
          row.expectedOptionalRevision, row.expectedOptionalRevision, row.expectedOptionalRevision,
          row.expectedOptionalRevision,
        ],
      });
    }
    const rowsJson = JSON.stringify(operation.rows.map((row) => row.rowItemId));
    finalGuardSql = `
      SELECT 1 FROM estimate_contribution_scopes AS scope
      WHERE scope.id = ? AND scope.workspace_id = ? AND scope.project_id = ?
        AND scope.estimate_id = ? AND scope.estimate_tab_id = ? AND scope.revision = ? AND scope.updated_at = ?
        AND (SELECT COUNT(*) FROM estimate_optional_items
             WHERE contribution_scope_id = scope.id AND row_item_id IN (SELECT CAST(value AS TEXT) FROM json_each(?))
               AND updated_at = ?) = ?
    `;
    finalGuardValues = [
      contributionScopeId, prepared.context.workspaceId, input.projectId, input.estimateId,
      input.estimateTabId, contributionRevision, marker, rowsJson, marker, operation.rows.length,
    ];
  }

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
  statements.push(buildGuardedReceiptStatement({
    context: prepared.context,
    resourceType: "estimate_contribution_scope",
    resourceId: contributionScopeId,
    result,
    timestamp: now,
    guardSql: finalGuardSql,
    guardValues: finalGuardValues,
  }));
  statements.push(buildProjectPublicationRevisionForEstimate(input.projectId, prepared.context.workspaceId, input.estimateId));
  const history = await prepareHistoryEventInsert(input.database, {
    projectId: input.projectId,
    estimateId: input.estimateId,
    workspaceId: prepared.context.workspaceId,
    estimateTabId: input.estimateTabId,
    targetRowId: changedRowItemIds[0],
    eventType: operation.kind === "configure_alternatives" ? "alternative_group_bulk_configured" : "optional_rows_bulk_marked",
    actorUserId: input.actor.userId,
    correlationId: prepared.context.intentId,
    changedFields: operation.kind === "configure_alternatives" ? ["alternativeGroup"] : ["optionalContribution"],
    oldSnapshot: null,
    newSnapshot: result,
    payload: { contributionScopeId, changedRowItemIds, changedGroupIds },
  });
  appendHistory(statements, history);

  try {
    const replay = await commitBatch({ database: input.database, statements, context: prepared.context });
    if (replay?.kind === "contribution_configuration_bulk_applied") return replay;
  } catch (error) {
    const latest = await readScopeState({ ...input, workspaceId: prepared.context.workspaceId });
    if (scope && Number(latest?.revision) !== guardRevision) {
      throw new ContributionConfigurationError("revision_conflict", "Contribution settings changed elsewhere. Refresh and try again.", { cause: error });
    }
    throw new ContributionConfigurationError("constraint_conflict", "The selected contribution roles could not be applied together.", { cause: error });
  }
  return { ...result, replayed: false };
}
