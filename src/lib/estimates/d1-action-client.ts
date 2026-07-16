import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { requireCurrentUserContext, type CurrentUserContext } from "@/lib/auth/session";
import { canEditEstimateInD1, canEditProjectInD1, isWorkspaceEditorInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1PreparedStatementLike, type D1Value } from "@/lib/cloudflare/d1";
import { computeEstimateRowCostParts, ESTIMATE_CALCULATION_CURRENCY_SCALE } from "@/lib/estimates/estimate-row-total";
import { ESTIMATE_ROW_REVISION_CONFLICT_CODE } from "@/lib/estimates/row-revision-conflict";
import { validateProjectedEstimateTreeReorder } from "@/lib/estimates/estimate-tree-reorder";
import { getProjectComponentIdentity } from "@/lib/estimates/express-components";
import {
  assertD1MutationStatementLimit,
  buildCommittedMutationReceiptStatement,
  createMutationRequestFingerprint,
  readCommittedMutationReceipt,
} from "@/lib/estimates/mutation-receipts";
import {
  buildProjectComponentAttachmentDeleteRetentionStatements,
  buildProjectComponentAttachmentRestoreRetentionStatements,
} from "@/lib/estimates/project-component-attachment-retention";
import { isUuid } from "@/lib/ids";
import { prepareActivationOutboxIntent } from "@/lib/onboarding/activation-outbox";
import { validateActivationProducerIntent } from "@/lib/onboarding/activation-producer-contract";
import type { Json } from "@/lib/types/json";

type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

type QueryRowsResult<T> = {
  data: T[] | null;
  error: Error | null;
};

type Filter =
  | { op: "eq"; column: string; value: unknown }
  | { op: "in"; column: string; values: unknown[] }
  | { op: "is"; column: string; value: unknown }
  | { op: "not"; column: string; operator: string; value: string }
  | { op: "gte"; column: string; value: unknown }
  | { op: "lte"; column: string; value: unknown }
  | { op: "or"; value: string };

type Order = {
  column: string;
  ascending: boolean;
};

type InsertPayload = Record<string, unknown> | Array<Record<string, unknown>>;

type EstimateRow = {
  id: string;
  project_id: string;
  name: string;
  created_by: string | null;
  sheet_code?: string | null;
  revision_label?: string | null;
  notes?: string | null;
  project_budget?: number | null;
  currency_code?: string | null;
  metadata?: Json | string | null;
  created_at: string;
  updated_at: string;
};

type ProjectContextRow = {
  id: string;
  workspace_id: string;
};

type EstimateContextRow = {
  id: string;
  project_id: string;
  workspace_id: string;
};

type EstimateTabRow = {
  id: string;
  estimate_id: string;
  name: string;
  sort_order: number | string | null;
  is_default: number | boolean | null;
  archived_at: string | null;
  metadata?: Json | string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

type EstimateNodeRow = {
  id: string;
  estimate_id: string;
  estimate_tab_id?: string | null;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number | string | null;
  metadata?: Json | string | null;
  metadata_json?: string | null;
  created_at?: string;
  updated_at?: string;
};

type EstimateRowItemRow = {
  id: string;
  estimate_id: string;
  node_id: string | null;
  description: string | null;
  designation: string | null;
  discipline: string | null;
  material: string | null;
  supplier?: string | null;
  supplier_id?: string | null;
  quantity: number | string | null;
  quantity_base?: number | string | null;
  quantity_contingency_amount?: number | string | null;
  unit: string | null;
  unit_cost: number | string | null;
  misc_cost: number | string | null;
  contingency_percentage: number | string | null;
  adjustment_percentage?: number | string | null;
  source_snapshot?: Json | string | null;
  source_snapshot_json?: string | null;
  pricing_provenance_origin?: "recorded" | "inherited_snapshot" | "synthesized_fallback" | "missing" | null;
  sort_order: number | string | null;
  row_revision?: number | string | null;
  category_node_id?: string | null;
  source_library_item_id?: string | null;
  link_state?: string | null;
  metadata?: Json | string | null;
  metadata_json?: string | null;
  created_at?: string;
  updated_at?: string;
};

type EstimateEventRow = {
  id: string;
  estimate_id: string;
  workspace_id: string;
  project_id: string;
  estimate_node_id: string | null;
  estimate_tab_id: string | null;
  target_row_id: string | null;
  event_type: string;
  event_source: string;
  correlation_id: string;
  actor_user_id: string | null;
  changed_fields: Json | string | null;
  row_context: Json | string | null;
  old_snapshot: Json | string | null;
  new_snapshot: Json | string | null;
  payload: Json | string | null;
  metadata: Json | string | null;
  total_delta: number | string | null;
  created_at: string;
};

type ExistingEstimateEventRow = Pick<
  EstimateEventRow,
  "id" | "estimate_id" | "estimate_node_id" | "estimate_tab_id" | "target_row_id" | "event_type" | "payload" | "new_snapshot"
>;

export type HistoryEventInput = {
  projectId: string;
  estimateId: string;
  workspaceId?: string | null;
  estimateNodeId?: string | null;
  estimateTabId?: string | null;
  targetRowId?: string | null;
  eventType: string;
  actorUserId?: string | null;
  correlationId: string;
  changedFields?: string[];
  rowContext?: Record<string, unknown>;
  oldSnapshot?: unknown;
  newSnapshot?: unknown;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  totalDelta?: number | null;
};

type RowHistoryResult = {
  rowId: string;
  eventId?: string;
  row: {
    id: string;
    nodeId: string;
    material: string;
    description: string;
    supplier: string;
    unit: string;
    quantity: number;
    quantityBase: number | null;
    quantityContingencyAmount: number | null;
    unitCost: number;
    contingencyPercentage: number;
    contingencyValue: number;
    adjustmentPercentage: number;
    adjustmentValue: number;
    miscCost: number;
    sourceLibraryItemId: string | null;
    sourceSnapshot: Json | null;
    metadata: Json;
    linkState: string;
    rowRevision: number;
  };
};

export type EstimateComponentEditImpactEstimate = {
  projectId: string;
  projectName: string;
  estimateId: string;
  estimateName: string;
  instanceCount: number;
  optionUsageCounts: Record<string, number>;
};

export type EstimateComponentEditImpact = {
  componentKind: "library" | "project";
  fingerprint: string;
  instanceCount: number;
  projectCount: number;
  estimateCount: number;
  optionUsageCounts: Record<string, number>;
  affectedEstimates: EstimateComponentEditImpactEstimate[];
};

type TemplateNodeRow = {
  id: string;
  template_id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number | string | null;
  metadata: string | null;
  updated_at: string;
};

type TemplateRowItemRow = {
  id: string;
  template_id: string;
  template_node_id: string;
  sort_order: number | string | null;
  source_library_item_id: string | null;
  source_snapshot: string | null;
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
  metadata: string | null;
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
  metadata_json: string | null;
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
  metadata_json: string | null;
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

function nowIso() {
  return new Date().toISOString();
}

function normalizeD1Value(value: unknown): D1Value {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof ArrayBuffer) {
    return value;
  }
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function placeholders(values: readonly unknown[]) {
  if (values.length === 0) throw new Error("At least one SQL placeholder is required.");
  return values.map(() => "?").join(", ");
}

function readNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const ESTIMATE_MINOR_UNIT_FACTOR = 10 ** ESTIMATE_CALCULATION_CURRENCY_SCALE;

function estimateRowTotalMinorUnits(row: EstimateRowItemRow) {
  const total = computeEstimateRowCostParts(row);
  if (!total.ok) throw new Error(`Estimate row total is invalid (${total.code}:${total.field}).`);
  return total.value.totalMinorUnits;
}

function minorUnitsToAmount(minorUnits: number) {
  if (!Number.isSafeInteger(minorUnits)) throw new Error("Estimate history total is outside the supported range.");
  return minorUnits / ESTIMATE_MINOR_UNIT_FACTOR;
}

function sumEstimateRowTotalMinorUnits(rows: readonly EstimateRowItemRow[]) {
  return rows.reduce((total, row) => {
    const next = total + estimateRowTotalMinorUnits(row);
    if (!Number.isSafeInteger(next)) throw new Error("Estimate history total is outside the supported range.");
    return next;
  }, 0);
}

function readJson(value: unknown, fallback: Json): Json {
  if (typeof value === "string") {
    try {
      return readJson(JSON.parse(value) as unknown, fallback);
    } catch {
      return fallback;
    }
  }
  if (value === null || typeof value === "number" || typeof value === "boolean" || Array.isArray(value)) return value as Json;
  if (value && typeof value === "object") return value as Json;
  return fallback;
}

function readJsonRecord(value: unknown): Record<string, unknown> {
  const parsed = readJson(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function readRequiredJsonRecord(value: unknown, label: string) {
  const parsed = typeof value === "string" ? readJson(value, null) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function normalizeEstimateRowJsonObject(value: unknown, label: string) {
  if (value === null || value === undefined) return {};
  return readRequiredJsonRecord(value, label);
}

function normalizeEstimateRowSourceLinkState(sourceLibraryItemIdValue: unknown, linkStateValue: unknown) {
  const sourceLibraryItemId = typeof sourceLibraryItemIdValue === "string" && sourceLibraryItemIdValue.trim()
    ? sourceLibraryItemIdValue.trim()
    : null;
  const linkState = typeof linkStateValue === "string" && linkStateValue.trim()
    ? linkStateValue.trim()
    : sourceLibraryItemId
      ? "linked-clean"
      : "unlinked";
  if (linkState === "unlinked") {
    if (sourceLibraryItemId) throw new Error("Unlinked estimate rows cannot retain a live source identity.");
    return { sourceLibraryItemId: null, linkState };
  }
  if (!["linked-clean", "linked-overridden", "source-changed", "detached"].includes(linkState)) {
    throw new Error("Estimate row link state is invalid.");
  }
  if (!sourceLibraryItemId) throw new Error("Linked and detached estimate rows require a source identity.");
  return { sourceLibraryItemId, linkState };
}

function normalizeEstimateRowPricingProvenance(value: unknown) {
  const provenance = typeof value === "string" && value.trim() ? value.trim() : "missing";
  if (!["recorded", "inherited_snapshot", "synthesized_fallback", "missing"].includes(provenance)) {
    throw new Error("Estimate row pricing provenance is invalid.");
  }
  return provenance;
}

function jsonString(value: unknown, fallback: Json = {}) {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? fallback);
}

function rowLinkState(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : "unlinked";
}

function rowMetadata(row: EstimateRowItemRow): Json {
  return readJson(row.metadata ?? row.metadata_json, {});
}

function rowSourceSnapshot(row: EstimateRowItemRow): Json | null {
  const value = row.source_snapshot ?? row.source_snapshot_json;
  if (value === null || value === undefined) return null;
  return readJson(value, null);
}

function rowItemHistoryResult(row: EstimateRowItemRow, eventId?: string): RowHistoryResult {
  const quantity = readNumber(row.quantity);
  const unitCost = readNumber(row.unit_cost);
  const base = quantity * unitCost;
  const contingencyPercentage = readNumber(row.contingency_percentage);
  const adjustmentPercentage = readNumber(row.adjustment_percentage, contingencyPercentage);
  return {
    rowId: row.id,
    eventId,
    row: {
      id: row.id,
      nodeId: row.node_id ?? "",
      material: row.material ?? "",
      description: row.description ?? "",
      supplier: row.supplier ?? "",
      unit: row.unit ?? "unit",
      quantity,
      quantityBase: row.quantity_base === null || row.quantity_base === undefined ? null : readNumber(row.quantity_base),
      quantityContingencyAmount: row.quantity_contingency_amount === null || row.quantity_contingency_amount === undefined ? null : readNumber(row.quantity_contingency_amount),
      unitCost,
      contingencyPercentage,
      contingencyValue: (base * contingencyPercentage) / 100,
      adjustmentPercentage,
      adjustmentValue: (base * adjustmentPercentage) / 100,
      miscCost: readNumber(row.misc_cost),
      sourceLibraryItemId: row.source_library_item_id ?? null,
      sourceSnapshot: rowSourceSnapshot(row),
      metadata: rowMetadata(row),
      linkState: rowLinkState(row.link_state),
      rowRevision: Math.max(1, Math.trunc(readNumber(row.row_revision, 1))),
    },
  };
}

function serializeEstimateRow(row: EstimateRow): EstimateRow {
  return {
    ...row,
    sheet_code: row.sheet_code ?? row.revision_label ?? "",
    notes: row.notes ?? null,
    project_budget: row.project_budget ?? null,
    currency_code: row.currency_code ?? "PHP",
    metadata: readJson(row.metadata, {}),
  };
}

function serializeTabRow(row: EstimateTabRow): EstimateTabRow {
  return {
    ...row,
    is_default: row.is_default === true || row.is_default === 1,
    metadata: readJson(row.metadata, {}),
    sort_order: readNumber(row.sort_order),
  };
}

function serializeNodeRow(row: EstimateNodeRow): EstimateNodeRow {
  return {
    ...row,
    metadata: readJson(row.metadata ?? row.metadata_json, {}),
    sort_order: readNumber(row.sort_order),
  };
}

function serializeRowItem(row: EstimateRowItemRow): EstimateRowItemRow {
  return {
    ...row,
    quantity: readNumber(row.quantity),
    quantity_base: row.quantity_base === null || row.quantity_base === undefined ? null : readNumber(row.quantity_base),
    quantity_contingency_amount: row.quantity_contingency_amount === null || row.quantity_contingency_amount === undefined ? null : readNumber(row.quantity_contingency_amount),
    unit_cost: readNumber(row.unit_cost),
    misc_cost: readNumber(row.misc_cost),
    contingency_percentage: readNumber(row.contingency_percentage),
    adjustment_percentage: readNumber(row.adjustment_percentage),
    sort_order: readNumber(row.sort_order),
    row_revision: Math.max(1, Math.trunc(readNumber(row.row_revision, 1))),
    source_snapshot: rowSourceSnapshot(row),
    metadata: rowMetadata(row),
    link_state: rowLinkState(row.link_state),
  };
}

function serializeEventRow(row: EstimateEventRow): EstimateEventRow {
  return {
    ...row,
    changed_fields: readJson(row.changed_fields, []),
    row_context: readJson(row.row_context, {}),
    old_snapshot: row.old_snapshot === null ? null : readJson(row.old_snapshot, null),
    new_snapshot: row.new_snapshot === null ? null : readJson(row.new_snapshot, null),
    payload: readJson(row.payload, {}),
    metadata: readJson(row.metadata, {}),
    total_delta: row.total_delta === null ? null : readNumber(row.total_delta),
  };
}

async function first<T>(database: D1DatabaseLike, sql: string, values: unknown[] = []) {
  return database.prepare<T>(sql).bind(...values.map(normalizeD1Value)).first<T>();
}

async function all<T>(database: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const result = await database.prepare<T>(sql).bind(...values.map(normalizeD1Value)).all<T>();
  if (result.success === false) throw new Error("Cloudflare D1 estimate action read failed.");
  return result.results ?? [];
}

async function run(database: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const result = await database.prepare(sql).bind(...values.map(normalizeD1Value)).run();
  if (result.success === false) throw new Error("Cloudflare D1 estimate action write failed.");
  return result;
}

async function runBatch(database: D1DatabaseLike, statements: Array<{ sql: string; values?: unknown[] }>) {
  if (statements.length === 0) return;
  if (database.batch) {
    const results = await database.batch(
      statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []).map(normalizeD1Value))),
    );
    if (results.some((result) => result.success === false)) throw new Error("Cloudflare D1 estimate action batch failed.");
    return;
  }
  for (const statement of statements) await run(database, statement.sql, statement.values ?? []);
}

async function runBatchWithPreparedStatements(
  database: D1DatabaseLike,
  statements: Array<{ sql: string; values?: unknown[] }>,
  preparedStatements: D1PreparedStatementLike[],
) {
  if (preparedStatements.length === 0) {
    await runBatch(database, statements);
    return;
  }
  if (database.batch) {
    const results = await database.batch([
      ...statements.map((statement) => database.prepare(statement.sql).bind(...(statement.values ?? []).map(normalizeD1Value))),
      ...preparedStatements,
    ]);
    if (results.some((result) => result.success === false)) throw new Error("Cloudflare D1 estimate action batch failed.");
    return;
  }
  await runBatch(database, statements);
  for (const statement of preparedStatements) {
    const result = await statement.run();
    if (result.success === false) throw new Error("Cloudflare D1 estimate action write failed.");
  }
}

async function readProjectContext(database: D1DatabaseLike, projectId: string) {
  return first<ProjectContextRow>(
    database,
    `
      SELECT id, workspace_id
      FROM projects
      WHERE id = ?
      LIMIT 1
    `,
    [projectId],
  );
}

async function readEstimateContext(database: D1DatabaseLike, estimateId: string, projectId?: string | null) {
  const values = projectId ? [estimateId, projectId] : [estimateId];
  return first<EstimateContextRow>(
    database,
    `
      SELECT estimate.id, estimate.project_id, project.workspace_id
      FROM estimates estimate
      JOIN projects project ON project.id = estimate.project_id
      WHERE estimate.id = ?
        ${projectId ? "AND estimate.project_id = ?" : ""}
      LIMIT 1
    `,
    values,
  );
}

type EstimateMutationIntentContext = {
  projectId: string;
  estimateId: string;
  workspaceId: string;
  actorUserId: string;
  commandKind: string;
  intentId: string;
  requestFingerprint: string;
};

function readEstimateMutationReceiptResult(value: unknown) {
  return readRequiredJsonRecord(value, "Estimate mutation receipt result");
}

async function prepareEstimateMutationIntent(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
  commandKind: string,
  request: unknown,
) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const intentId = String(args.correlation_id ?? randomUUID()).trim();
  if (!intentId) throw new Error("Estimate mutation intent is required.");
  const context: EstimateMutationIntentContext = {
    projectId,
    estimateId,
    workspaceId: estimate.workspace_id,
    actorUserId: currentUser.userId,
    commandKind,
    intentId,
    requestFingerprint: createMutationRequestFingerprint(request),
  };
  const committedResult = await readCommittedMutationReceipt(
    database,
    context,
    readEstimateMutationReceiptResult,
  );
  return { context, committedResult };
}

function buildEstimateMutationReceiptStatement(
  context: EstimateMutationIntentContext,
  resourceType: string,
  resourceId: string | null,
  result: unknown,
  timestamp: string,
) {
  return buildCommittedMutationReceiptStatement({
    ...context,
    resourceType,
    resourceId,
    result,
    timestamp,
  });
}

function buildProjectPublicationRevisionStatement(context: EstimateMutationIntentContext) {
  return buildProjectPublicationRevisionForScope(context.projectId, context.workspaceId, context.estimateId);
}

function buildProjectPublicationRevisionForScope(projectId: string, workspaceId: string, estimateId: string) {
  return {
    sql: `
      UPDATE projects
      SET publication_source_revision = publication_source_revision + 1
      WHERE id = ?
        AND workspace_id = ?
        AND EXISTS (
          SELECT 1
          FROM estimates
          WHERE estimates.id = ?
            AND estimates.project_id = projects.id
        )
    `,
    values: [projectId, workspaceId, estimateId],
  };
}

function buildProjectPublicationRevisionForProject(projectId: string, workspaceId: string) {
  return {
    sql: `
      UPDATE projects
      SET publication_source_revision = publication_source_revision + 1
      WHERE id = ?
        AND workspace_id = ?
    `,
    values: [projectId, workspaceId],
  };
}

function validateCopiedEstimateTabTopology(nodes: EstimateNodeRow[], rows: EstimateRowItemRow[]) {
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

function compareSortOrderThenId(
  left: { id: string; sort_order: number | string | null },
  right: { id: string; sort_order: number | string | null },
) {
  return readNumber(left.sort_order) - readNumber(right.sort_order) || left.id.localeCompare(right.id);
}

async function readConcurrentEstimateMutationReceipt(
  database: D1DatabaseLike,
  context: EstimateMutationIntentContext,
) {
  return readCommittedMutationReceipt(database, context, readEstimateMutationReceiptResult);
}

export async function prepareHistoryEventInsert(database: D1DatabaseLike, input: HistoryEventInput) {
  const existing = await first<{ id: string; payload: string }>(
    database,
    `
      SELECT id, payload
      FROM estimate_sheet_events
      WHERE estimate_id = ?
        AND correlation_id = ?
      LIMIT 1
    `,
    [input.estimateId, input.correlationId],
  );
  if (existing) return { eventId: existing.id, statement: null, outboxStatement: null };

  const project = input.workspaceId ? null : await readProjectContext(database, input.projectId);
  const workspaceId = input.workspaceId ?? project?.workspace_id;
  if (!workspaceId) throw new Error("Estimate history event workspace could not be resolved.");
  const eventId = randomUUID();
  const createdAt = nowIso();
  return {
    eventId,
    statement: {
      sql: `
        INSERT INTO estimate_sheet_events (
          id,
          estimate_id,
          workspace_id,
          project_id,
          estimate_node_id,
          estimate_tab_id,
          target_row_id,
          event_type,
          event_source,
          correlation_id,
          actor_user_id,
          changed_fields,
          row_context,
          old_snapshot,
          new_snapshot,
          payload,
          metadata,
          total_delta,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values: [
        eventId,
        input.estimateId,
        workspaceId,
        input.projectId,
        input.estimateNodeId ?? null,
        input.estimateTabId ?? null,
        input.targetRowId ?? null,
        input.eventType,
        "server_action",
        input.correlationId,
        input.actorUserId ?? null,
        JSON.stringify(input.changedFields ?? []),
        JSON.stringify(input.rowContext ?? {}),
        input.oldSnapshot === undefined ? null : JSON.stringify(input.oldSnapshot),
        input.newSnapshot === undefined ? null : JSON.stringify(input.newSnapshot),
        JSON.stringify(input.payload ?? {}),
        JSON.stringify(input.metadata ?? {}),
        input.totalDelta ?? null,
        createdAt,
      ],
    },
    outboxStatement: {
      sql: `
        INSERT INTO activity_event_outbox (
          id, workspace_id, event_id, status, attempt_count, available_at, created_at, updated_at
        )
        VALUES (?, ?, ?, 'pending', 0, ?, ?, ?)
        ON CONFLICT(event_id) DO NOTHING
      `,
      values: [randomUUID(), workspaceId, eventId, createdAt, createdAt, createdAt],
    },
  };
}

export async function insertHistoryEvent(database: D1DatabaseLike, input: HistoryEventInput) {
  const prepared = await prepareHistoryEventInsert(database, input);
  if (prepared.statement) {
    await runBatch(database, [prepared.statement, prepared.outboxStatement]);
  }
  return prepared.eventId;
}

/**
 * Keeps a domain mutation and its activity event/outbox durable in the same
 * D1 batch. A retry may repeat an idempotent mutation, but never creates a
 * second event because the correlation ID is unique per estimate.
 */
export async function runMutationWithHistory(
  database: D1DatabaseLike,
  mutationStatements: Array<{ sql: string; values?: unknown[] }>,
  historyInput: HistoryEventInput,
  preparedStatements: D1PreparedStatementLike[] = [],
) {
  const prepared = await prepareHistoryEventInsert(database, historyInput);
  const statements = prepared.statement
    ? [...mutationStatements, prepared.statement, prepared.outboxStatement]
    : mutationStatements;
  await runBatchWithPreparedStatements(database, statements, preparedStatements);
  return prepared.eventId;
}

async function readExistingHistoryEvent(database: D1DatabaseLike, estimateId: string, correlationId: string) {
  const event = await first<ExistingEstimateEventRow>(
    database,
    `
      SELECT id, estimate_id, estimate_node_id, estimate_tab_id, target_row_id, event_type, payload, new_snapshot
      FROM estimate_sheet_events
      WHERE estimate_id = ?
        AND correlation_id = ?
      LIMIT 1
    `,
    [estimateId, correlationId],
  );
  return event ? serializeEventRow(event as EstimateEventRow) as ExistingEstimateEventRow : null;
}

function createEstimateDeletePreviewHash(input: {
  eligibleIds: string[];
  blocked: unknown[];
  summary: Record<string, unknown>;
}) {
  return createHash("sha256")
    .update(JSON.stringify({
      targetType: "estimate_sheet",
      action: "delete",
      ids: input.eligibleIds,
      blocked: input.blocked,
      summary: input.summary,
    }))
    .digest("hex");
}

function quoteColumn(column: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) throw new Error(`Unsupported D1 column: ${column}`);
  return column;
}

function assignInsertDefaults(table: string, payload: Record<string, unknown>) {
  const now = nowIso();
  const next = { ...payload };
  if (!next.id) next.id = randomUUID();
  if (!next.created_at) next.created_at = now;
  if (!next.updated_at) next.updated_at = now;
  if (table === "estimates") {
    if (next.metadata === undefined) next.metadata = {};
    if (next.currency_code === undefined) next.currency_code = "PHP";
    if (next.sheet_code === undefined) next.sheet_code = "";
  }
  if (table === "estimate_tabs") {
    if (next.metadata === undefined) next.metadata = {};
    if (next.archived_at === undefined) next.archived_at = null;
    if (next.is_default === undefined) next.is_default = false;
  }
  if (table === "estimate_nodes") {
    if (next.metadata !== undefined && next.metadata_json === undefined) next.metadata_json = next.metadata;
    delete next.metadata;
  }
  if (table === "estimate_row_items") {
    next.source_snapshot_json = normalizeEstimateRowJsonObject(
      next.source_snapshot_json ?? next.source_snapshot,
      "Estimate row source snapshot",
    );
    next.metadata_json = normalizeEstimateRowJsonObject(next.metadata_json ?? next.metadata, "Estimate row metadata");
    const sourceLinkState = normalizeEstimateRowSourceLinkState(next.source_library_item_id, next.link_state);
    next.source_library_item_id = sourceLinkState.sourceLibraryItemId;
    next.link_state = sourceLinkState.linkState;
    delete next.source_snapshot;
    delete next.metadata;
    if (next.row_revision === undefined) next.row_revision = 1;
    next.pricing_provenance_origin = normalizeEstimateRowPricingProvenance(next.pricing_provenance_origin);
  }
  return next;
}

function insertColumnsForTable(table: string, payload: Record<string, unknown>) {
  const allowed = new Set<string>();
  if (table === "estimates") {
    ["id", "project_id", "created_by", "name", "notes", "project_budget", "sheet_code", "currency_code", "metadata", "created_at", "updated_at"].forEach((key) => allowed.add(key));
  } else if (table === "estimate_tabs") {
    ["id", "estimate_id", "name", "sort_order", "is_default", "archived_at", "metadata", "created_by", "created_at", "updated_at"].forEach((key) => allowed.add(key));
  } else if (table === "estimate_nodes") {
    ["id", "estimate_id", "estimate_tab_id", "parent_id", "kind", "name", "sort_order", "metadata_json", "created_at", "updated_at"].forEach((key) => allowed.add(key));
  } else if (table === "estimate_row_items") {
    [
      "id",
      "estimate_id",
      "node_id",
      "description",
      "designation",
      "discipline",
      "material",
      "supplier",
      "supplier_id",
      "quantity",
      "quantity_base",
      "quantity_contingency_amount",
      "unit",
      "unit_cost",
      "misc_cost",
      "contingency_percentage",
      "adjustment_percentage",
      "source_snapshot_json",
      "sort_order",
      "row_revision",
      "category_node_id",
      "source_library_item_id",
      "link_state",
      "metadata_json",
      "pricing_provenance_origin",
      "created_at",
      "updated_at",
    ].forEach((key) => allowed.add(key));
  } else {
    throw new Error(`Unsupported D1 insert table: ${table}`);
  }
  return Object.keys(payload).filter((key) => allowed.has(key));
}

/** Cloudflare D1 rejects batches larger than 1000 statements. */
const D1_MAX_BATCH_STATEMENTS = 1000;
/** Pack restore inserts so large subtrees stay under the D1 batch limit. */
const D1_RESTORE_INSERT_CHUNK_SIZE = 40;
const MAX_RESTORABLE_ROW_BATCH_SIZE = 100;

function buildInsertRecordStatement(table: string, payload: Record<string, unknown>) {
  const record = assignInsertDefaults(table, payload);
  const columns = insertColumnsForTable(table, record);
  return {
    record,
    sql: `INSERT INTO ${table} (${columns.map(quoteColumn).join(", ")}) VALUES (${placeholders(columns)})`,
    values: columns.map((column) => record[column]),
  };
}

function buildPackedInsertStatements(
  table: string,
  payloads: Record<string, unknown>[],
  chunkSize = D1_RESTORE_INSERT_CHUNK_SIZE,
) {
  if (payloads.length === 0) return [] as Array<{ sql: string; values: unknown[] }>;
  const records = payloads.map((payload) => assignInsertDefaults(table, payload));
  const columns = insertColumnsForTable(table, records[0]!);
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  for (let index = 0; index < records.length; index += chunkSize) {
    const chunk = records.slice(index, index + chunkSize);
    const valueGroups = chunk.map(() => `(${placeholders(columns)})`).join(", ");
    statements.push({
      sql: `INSERT INTO ${table} (${columns.map(quoteColumn).join(", ")}) VALUES ${valueGroups}`,
      values: chunk.flatMap((record) => columns.map((column) => record[column])),
    });
  }
  return statements;
}

async function insertRecord(database: D1DatabaseLike, table: string, payload: Record<string, unknown>) {
  const { record, sql, values } = buildInsertRecordStatement(table, payload);
  await run(database, sql, values);
  return record;
}

function mapColumn(table: string, column: string) {
  if (column === "estimates.project_id" || column === "estimate_nodes.estimates.project_id") return "estimate.project_id";
  if (table === "estimate_nodes") {
    if (column === "id") return "node.id";
    if (column === "estimate_id") return "node.estimate_id";
    if (column === "parent_id") return "node.parent_id";
    if (column === "estimate_tab_id") return "node.estimate_tab_id";
  }
  if (table === "estimate_row_items") {
    if (column === "id") return "row_item.id";
    if (column === "estimate_id") return "row_item.estimate_id";
    if (column === "node_id") return "row_item.node_id";
    if (column === "estimate_nodes.estimates.project_id") return "estimate.project_id";
  }
  if (table === "estimate_tabs") {
    if (column === "id") return "tab.id";
    if (column === "estimate_id") return "tab.estimate_id";
    if (column === "archived_at") return "tab.archived_at";
  }
  if (table === "estimate_sheet_events") {
    if (column === "id") return "event.id";
    if (column === "estimate_id") return "event.estimate_id";
    if (column === "target_row_id") return "event.target_row_id";
    if (column === "estimate_node_id") return "event.estimate_node_id";
    if (column === "event_type") return "event.event_type";
    if (column === "created_at") return "event.created_at";
  }
  return quoteColumn(column);
}

function applyFilters(table: string, filters: Filter[], where: string[], values: unknown[]) {
  for (const filter of filters) {
    if (filter.op === "eq") {
      where.push(`${mapColumn(table, filter.column)} = ?`);
      values.push(filter.value);
    } else if (filter.op === "in") {
      if (filter.values.length === 0) {
        where.push("1 = 0");
      } else {
        where.push(`${mapColumn(table, filter.column)} IN (${placeholders(filter.values)})`);
        values.push(...filter.values);
      }
    } else if (filter.op === "is") {
      where.push(`${mapColumn(table, filter.column)} IS ${filter.value === null ? "NULL" : "NOT NULL"}`);
    } else if (filter.op === "gte") {
      where.push(`${mapColumn(table, filter.column)} >= ?`);
      values.push(filter.value);
    } else if (filter.op === "lte") {
      where.push(`${mapColumn(table, filter.column)} <= ?`);
      values.push(filter.value);
    } else if (filter.op === "not" && filter.column === "event_type" && filter.operator === "in") {
      const eventTypes = filter.value.replace(/[()]/g, "").split(",").map((value) => value.trim()).filter(Boolean);
      if (eventTypes.length > 0) {
        where.push(`event.event_type NOT IN (${placeholders(eventTypes)})`);
        values.push(...eventTypes);
      }
    } else if (filter.op === "or") {
      applyOrFilter(table, filter.value, where, values);
    }
  }
}

function applyOrFilter(table: string, value: string, where: string[], values: unknown[]) {
  if (table !== "estimate_sheet_events") return;
  const cursorMatch = value.match(/^created_at\.lt\.([^,]+),and\(created_at\.eq\.([^,]+),id\.lt\.([^)]+)\)$/);
  if (cursorMatch) {
    where.push("(event.created_at < ? OR (event.created_at = ? AND event.id < ?))");
    values.push(cursorMatch[1], cursorMatch[2], cursorMatch[3]);
    return;
  }

  const disjunctions: string[] = [];
  const nodeMatch = value.match(/estimate_node_id\.in\.\(([^)]*)\)/);
  if (nodeMatch) {
    const ids = nodeMatch[1].split(",").map((item) => item.trim()).filter(Boolean);
    if (ids.length > 0) {
      disjunctions.push(`event.estimate_node_id IN (${placeholders(ids)})`);
      values.push(...ids);
    }
  }
  const rowMatch = value.match(/target_row_id\.in\.\(([^)]*)\)/);
  if (rowMatch) {
    const ids = rowMatch[1].split(",").map((item) => item.trim()).filter(Boolean);
    if (ids.length > 0) {
      disjunctions.push(`event.target_row_id IN (${placeholders(ids)})`);
      values.push(...ids);
    }
  }
  const ilikeMatch = value.match(/\.ilike\.%([^,%]+)%/);
  if (ilikeMatch) {
    const pattern = `%${ilikeMatch[1].toLowerCase()}%`;
    disjunctions.push(
      "LOWER(event.event_type) LIKE ?",
      "LOWER(COALESCE(json_extract(event.row_context, '$.material'), '')) LIKE ?",
      "LOWER(COALESCE(json_extract(event.row_context, '$.supplier'), '')) LIKE ?",
      "LOWER(COALESCE(json_extract(event.payload, '$.material'), '')) LIKE ?",
      "LOWER(COALESCE(json_extract(event.payload, '$.name'), '')) LIKE ?",
    );
    values.push(pattern, pattern, pattern, pattern, pattern);
  }
  if (disjunctions.length > 0) where.push(`(${disjunctions.join(" OR ")})`);
}

function orderSql(table: string, orders: Order[]) {
  if (orders.length === 0) return "";
  return ` ORDER BY ${orders.map((order) => `${mapColumn(table, order.column)} ${order.ascending ? "ASC" : "DESC"}`).join(", ")}`;
}

class EstimateActionD1Query {
  private selectedColumns = "*";
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private rowLimit: number | null = null;
  private insertPayload: InsertPayload | null = null;

  constructor(
    private readonly database: D1DatabaseLike,
    private readonly table: string,
  ) {}

  select(columns: string) {
    this.selectedColumns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ op: "in", column, values });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ op: "is", column, value });
    return this;
  }

  not(column: string, operator: string, value: string) {
    this.filters.push({ op: "not", column, operator, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ op: "gte", column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ op: "lte", column, value });
    return this;
  }

  or(value: string) {
    this.filters.push({ op: "or", value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  insert(payload: InsertPayload) {
    this.insertPayload = payload;
    return this;
  }

  async maybeSingle<T>() {
    const result = await this.execute<T>();
    if (result.error) return { data: null, error: result.error };
    return { data: (result.data ?? [])[0] ?? null, error: null };
  }

  async single<T>() {
    const result = await this.maybeSingle<T>();
    if (result.error) return result;
    if (!result.data) return { data: null, error: new Error(`No ${this.table} row returned.`) };
    return result;
  }

  then<TResult1 = QueryRowsResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryRowsResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute<T = unknown>(): Promise<QueryRowsResult<T>> {
    try {
      if (this.insertPayload) {
        const records = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload];
        const inserted: Record<string, unknown>[] = [];
        for (const payload of records) {
          inserted.push(await insertRecord(this.database, this.table, payload));
        }
        if (this.selectedColumns === "*" || this.selectedColumns.length > 0) {
          const ids = inserted.map((record) => record.id).filter((id): id is string => typeof id === "string");
          if (ids.length > 0 && ["estimates", "estimate_tabs", "estimate_nodes", "estimate_row_items"].includes(this.table)) {
            this.filters.push({ op: "in", column: "id", values: ids });
            return this.selectRows<T>();
          }
        }
        return { data: inserted as T[], error: null };
      }
      return this.selectRows<T>();
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  private async selectRows<T = unknown>(): Promise<QueryRowsResult<T>> {
    const values: unknown[] = [];
    const where: string[] = [];
    applyFilters(this.table, this.filters, where, values);
    const whereSql = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
    const limitSql = this.rowLimit ? ` LIMIT ${this.rowLimit}` : "";

    if (this.table === "profiles") {
      const rows = await all<T>(this.database, `SELECT id, display_name, email FROM profiles${whereSql}${limitSql}`, values);
      return { data: rows, error: null };
    }
    if (this.table === "cost_library_items") {
      const rows = await all<T>(this.database, `SELECT id, updated_at, lifecycle_state FROM cost_library_items${whereSql}${limitSql}`, values);
      return { data: rows, error: null };
    }
    if (this.table === "estimates") {
      const rows = await all<EstimateRow>(this.database, `SELECT * FROM estimates${whereSql}${orderSql(this.table, this.orders)}${limitSql}`, values);
      return { data: rows.map(serializeEstimateRow) as T[], error: null };
    }
    if (this.table === "estimate_tabs") {
      const rows = await all<EstimateTabRow>(
        this.database,
        `SELECT id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_by, created_at, updated_at FROM estimate_tabs tab${whereSql}${orderSql(this.table, this.orders)}${limitSql}`,
        values,
      );
      return { data: rows.map(serializeTabRow) as T[], error: null };
    }
    if (this.table === "estimate_nodes") {
      const rows = await all<EstimateNodeRow>(
        this.database,
        `
          SELECT node.id, node.estimate_id, node.estimate_tab_id, node.parent_id, node.kind, node.name, node.sort_order, node.metadata_json, node.created_at, node.updated_at
          FROM estimate_nodes node
          JOIN estimates estimate ON estimate.id = node.estimate_id
          ${whereSql}
          ${orderSql(this.table, this.orders)}
          ${limitSql}
        `,
        values,
      );
      return { data: rows.map(serializeNodeRow) as T[], error: null };
    }
    if (this.table === "estimate_row_items") {
      const rows = await all<EstimateRowItemRow>(
        this.database,
        `
          SELECT row_item.*, row_item.source_snapshot_json, row_item.metadata_json
          FROM estimate_row_items row_item
          LEFT JOIN estimate_nodes node ON node.id = row_item.node_id AND node.estimate_id = row_item.estimate_id
          JOIN estimates estimate ON estimate.id = row_item.estimate_id
          ${whereSql}
          ${orderSql(this.table, this.orders)}
          ${limitSql}
        `,
        values,
      );
      return { data: rows.map(serializeRowItem) as T[], error: null };
    }
    if (this.table === "estimate_sheet_events") {
      const rows = await all<EstimateEventRow>(
        this.database,
        `
          SELECT event.*
          FROM estimate_sheet_events event
          ${whereSql}
          ${orderSql(this.table, this.orders)}
          ${limitSql}
        `,
        values,
      );
      return { data: rows.map(serializeEventRow) as T[], error: null };
    }
    throw new Error(`Unsupported D1 select table: ${this.table}`);
  }
}

const ESTIMATE_EDIT_ACTIONS = new Set([
  "archive_estimate_tab_with_history",
  "create_estimate_node_with_history",
  "create_estimate_tab_with_history",
  "delete_estimate_node_with_history",
  "delete_estimate_nodes_bulk_with_history",
  "delete_estimate_row_item_with_history",
  "delete_estimate_row_items_bulk_with_history",
  "delete_estimate_tab_with_history",
  "duplicate_estimate_row_item_with_history",
  "duplicate_estimate_tab_with_history",
  "insert_estimate_row_item_with_history",
  "insert_estimate_template_into_estimate_with_history",
  "insert_estimate_templates_into_estimate_with_history",
  "insert_estimate_template_node_into_estimate_with_history",
  "move_estimate_row_component_with_history",
  "move_estimate_row_item_with_history",
  "preview_estimate_component_edit_impact",
  "rename_estimate_node_with_history",
  "rename_estimate_tab_with_history",
  "reorder_estimate_nodes_with_history",
  "reorder_estimate_tabs_with_history",
  "replace_estimate_row_item_with_history",
  "restore_deleted_estimate_rows_with_history",
  "restore_deleted_estimate_nodes_with_history",
  "update_estimate_details_with_history",
  "update_estimate_row_item_with_history",
  "update_estimate_sheet_adjustment_with_history",
]);

async function resolveCurrentUserContext(currentUserOverride?: CurrentUserContext | null) {
  if (currentUserOverride !== undefined) return currentUserOverride;
  return requireCurrentUserContext().catch(() => null);
}

export class EstimateActionsD1Client {
  constructor(
    readonly database: D1DatabaseLike,
    private readonly currentUserOverride?: CurrentUserContext | null,
  ) {}

  from(table: string) {
    return new EstimateActionD1Query(this.database, table);
  }

  async call<T = unknown>(name: string, args: Record<string, unknown>): Promise<QueryResult<T>> {
    try {
      const data = await callEstimateAction<T>(this.database, name, args, this.currentUserOverride);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}

export async function createEstimateActionsD1Client() {
  const database = await getCloudflareD1Database();
  if (!database) throw new Error("Cloudflare D1 ARCH_DB binding is required for estimate actions.");
  return new EstimateActionsD1Client(database);
}

async function readRowById(database: D1DatabaseLike, estimateId: string, rowId: string) {
  const row = await first<EstimateRowItemRow>(
    database,
    `
      SELECT *
      FROM estimate_row_items
      WHERE estimate_id = ?
        AND id = ?
      LIMIT 1
    `,
    [estimateId, rowId],
  );
  return row ? serializeRowItem(row) : null;
}

async function readNodeById(database: D1DatabaseLike, estimateId: string, nodeId: string) {
  const node = await first<EstimateNodeRow>(
    database,
    `
      SELECT *
      FROM estimate_nodes
      WHERE estimate_id = ?
        AND id = ?
      LIMIT 1
    `,
    [estimateId, nodeId],
  );
  return node ? serializeNodeRow(node) : null;
}

type EstimateDestinationNodeRow = {
  id: string;
  estimate_tab_id: string | null;
  kind: string;
  archived_at: string | null;
};

async function validateEstimateDestinationNodes(
  database: D1DatabaseLike,
  estimateId: string,
  nodeIds: readonly string[],
  activeTabId?: string | null,
) {
  const uniqueNodeIds = [...new Set(nodeIds.filter(Boolean))];
  if (uniqueNodeIds.length === 0) throw new Error("An estimate row destination is required.");
  const nodes = await all<EstimateDestinationNodeRow>(
    database,
    `
      SELECT node.id, node.estimate_tab_id, node.kind, tab.archived_at
      FROM estimate_nodes node
      LEFT JOIN estimate_tabs tab
        ON tab.id = node.estimate_tab_id
       AND tab.estimate_id = node.estimate_id
      WHERE node.estimate_id = ?
        AND node.id IN (${placeholders(uniqueNodeIds)})
    `,
    [estimateId, ...uniqueNodeIds],
  );
  if (nodes.length !== uniqueNodeIds.length) throw new Error("Estimate row destination was not found in the current estimate.");
  for (const node of nodes) {
    if (!["group", "area"].includes(node.kind)) throw new Error("Estimate row destination kind is invalid.");
    if (node.estimate_tab_id && node.archived_at !== null) throw new Error("Estimate rows cannot be moved into an archived tab.");
    if (activeTabId && node.estimate_tab_id !== activeTabId) throw new Error("Estimate rows cannot move across tabs.");
  }
  return {
    nodes,
    guard: {
      sql: `
        SELECT CASE WHEN (
          SELECT COUNT(*)
          FROM estimate_nodes node
          LEFT JOIN estimate_tabs tab
            ON tab.id = node.estimate_tab_id
           AND tab.estimate_id = node.estimate_id
          WHERE node.estimate_id = ?
            AND node.id IN (${placeholders(uniqueNodeIds)})
            AND node.kind IN ('group', 'area')
            AND (node.estimate_tab_id IS NULL OR (tab.id IS NOT NULL AND tab.archived_at IS NULL))
            AND (? IS NULL OR node.estimate_tab_id = ?)
        ) = ? THEN 1 ELSE json('') END AS estimate_destination_guard
      `,
      values: [estimateId, ...uniqueNodeIds, activeTabId ?? null, activeTabId ?? null, uniqueNodeIds.length],
    },
  };
}

function buildEstimateNodeTabGuardStatement(
  estimateId: string,
  nodeIds: readonly string[],
  expectedTabId: string | null,
) {
  const uniqueNodeIds = [...new Set(nodeIds.filter(Boolean))];
  if (uniqueNodeIds.length === 0) throw new Error("Estimate row topology guard requires at least one node.");
  return {
    sql: `
      SELECT CASE WHEN (
        SELECT COUNT(*)
        FROM estimate_nodes
        WHERE estimate_id = ?
          AND id IN (${placeholders(uniqueNodeIds)})
          AND estimate_tab_id IS ?
      ) = ? THEN 1 ELSE json('') END AS estimate_node_tab_guard
    `,
    values: [estimateId, ...uniqueNodeIds, expectedTabId, uniqueNodeIds.length],
  };
}

async function readTabById(database: D1DatabaseLike, estimateId: string, tabId: string) {
  const tab = await first<EstimateTabRow>(
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
  return tab ? serializeTabRow(tab) : null;
}

async function validateImageAsset(database: D1DatabaseLike, args: Record<string, unknown>) {
  const assetId = String(args.target_asset_id ?? "");
  const uploadSessionId = String(args.target_upload_session_id ?? "");
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const rowId = String(args.target_row_id ?? "");
  const row = await first<{
    id: string;
    bucket: string | null;
    path: string | null;
    thumbnail_path: string | null;
    file_name: string;
    content_type: string;
    size_bytes: number | string;
    scan_status: string | null;
    metadata_json: string | null;
  }>(
    database,
    `
      SELECT id, storage_bucket AS bucket, storage_path AS path, thumbnail_path, file_name, content_type, size_bytes, scan_status, metadata_json
      FROM upload_assets
      WHERE id = ?
        AND upload_session_id = ?
        AND project_id = ?
        AND estimate_id = ?
        AND target_entity_id = ?
        AND status IN ('finalized', 'pending')
      LIMIT 1
    `,
    [assetId, uploadSessionId, projectId, estimateId, rowId],
  );
  if (!row?.id || !row.bucket || !row.path) return null;
  const metadata = readJsonRecord(row.metadata_json);
  return {
    kind: "upload-asset",
    schemaVersion: 1,
    assetId: row.id,
    uploadSessionId,
    bucket: row.bucket,
    path: row.path,
    thumbnailPath: row.thumbnail_path ?? null,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: readNumber(row.size_bytes),
    scanStatus: row.scan_status ?? "pending",
    width: typeof metadata.width === "number" ? metadata.width : null,
    height: typeof metadata.height === "number" ? metadata.height : null,
    thumbnailWidth: typeof metadata.thumbnailWidth === "number" ? metadata.thumbnailWidth : null,
    thumbnailHeight: typeof metadata.thumbnailHeight === "number" ? metadata.thumbnailHeight : null,
  };
}

async function updateEstimateDetails(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const patch = readJsonRecord(args.estimate_patch);
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const current = await first<EstimateRow>(database, "SELECT * FROM estimates WHERE id = ? AND project_id = ? LIMIT 1", [estimateId, projectId]);
  if (!current) throw new Error("Estimate not found in the current project.");
  const assignments: string[] = [];
  const values: unknown[] = [];
  const changedFields: string[] = [];
  const columnMap: Record<string, string> = {
    name: "name",
    sheetCode: "sheet_code",
    notes: "notes",
    projectBudget: "project_budget",
  };
  for (const [key, column] of Object.entries(columnMap)) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    assignments.push(`${column} = ?`);
    values.push(patch[key]);
    changedFields.push(key);
  }
  if (assignments.length === 0) return { estimateId };
  assignments.push("updated_at = ?");
  values.push(nowIso(), estimateId, projectId);
  await runMutationWithHistory(database, [
    { sql: `UPDATE estimates SET ${assignments.join(", ")} WHERE id = ? AND project_id = ?`, values },
    buildProjectPublicationRevisionForScope(projectId, estimate.workspace_id, estimateId),
  ], {
    projectId,
    estimateId,
    eventType: "estimate_details_updated",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    changedFields,
    oldSnapshot: serializeEstimateRow(current),
    newSnapshot: patch,
    payload: patch,
  });
  return { estimateId };
}

async function createEstimateTab(database: D1DatabaseLike, args: Record<string, unknown>) {
  const estimateId = String(args.target_estimate_id ?? "");
  const projectId = String(args.target_project_id ?? "");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const maxRow = await first<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_tabs WHERE estimate_id = ?",
    [estimateId],
  );
  const tabId = randomUUID();
  const createdAt = nowIso();
  const insert = buildInsertRecordStatement("estimate_tabs", {
    id: tabId,
    estimate_id: estimateId,
    name: String(args.tab_name ?? "New Tab"),
    sort_order: readNumber(maxRow?.max_sort_order, -1000) + 1000,
    is_default: false,
    created_by: args.acting_user_id ?? null,
    created_at: createdAt,
    updated_at: createdAt,
  });
  await runMutationWithHistory(database, [
    { sql: insert.sql, values: insert.values },
    buildProjectPublicationRevisionForScope(projectId, estimate.workspace_id, estimateId),
  ], {
    projectId,
    estimateId,
    estimateTabId: tabId,
    eventType: "estimate_tab_created",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    payload: { tabId, name: args.tab_name },
  });
  return { estimateTabId: tabId, tabId };
}

async function renameEstimateTab(database: D1DatabaseLike, args: Record<string, unknown>) {
  const estimateId = String(args.target_estimate_id ?? "");
  const projectId = String(args.target_project_id ?? "");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const tabId = String(args.target_tab_id ?? "");
  const tab = await readTabById(database, estimateId, tabId);
  if (!tab) throw new Error("Estimate tab not found in the current estimate.");
  const name = String(args.next_name ?? "").trim();
  if (!name) throw new Error("Estimate tab name is required.");
  if (name === tab.name) return { estimateTabId: tabId };
  const updatedAt = nowIso();
  await runMutationWithHistory(database, [
    {
      sql: "UPDATE estimate_tabs SET name = ?, updated_at = ? WHERE id = ? AND estimate_id = ? AND updated_at = ?",
      values: [name, updatedAt, tabId, estimateId, tab.updated_at],
    },
    buildProjectPublicationRevisionForScope(projectId, estimate.workspace_id, estimateId),
  ], {
    projectId,
    estimateId,
    estimateTabId: tabId,
    eventType: "estimate_tab_renamed",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    changedFields: ["name"],
    oldSnapshot: tab,
    newSnapshot: { name },
    payload: { tabId, name },
  });
  return { estimateTabId: tabId };
}

async function reorderEstimateTabs(database: D1DatabaseLike, args: Record<string, unknown>) {
  const estimateId = String(args.target_estimate_id ?? "");
  const projectId = String(args.target_project_id ?? "");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const requestedUpdates = Array.isArray(args.sort_updates) ? args.sort_updates as Array<Record<string, unknown>> : [];
  if (requestedUpdates.length === 0) throw new Error("At least one estimate tab update is required.");
  const updates = requestedUpdates.map((update) => ({
    id: String(update.id ?? ""),
    sort_order: Number(update.sort_order),
  }));
  const updateIds = new Set<string>();
  for (const update of updates) {
    if (!update.id) throw new Error("Estimate tab update id is required.");
    if (updateIds.has(update.id)) throw new Error(`Duplicate estimate tab update: ${update.id}.`);
    if (!Number.isFinite(update.sort_order) || update.sort_order < 0) throw new Error("Estimate tab sort order must be a non-negative number.");
    updateIds.add(update.id);
  }
  const currentTabs = await all<Pick<EstimateTabRow, "id" | "sort_order">>(
    database,
    `SELECT id, sort_order FROM estimate_tabs WHERE estimate_id = ? AND id IN (${placeholders(updates)})`,
    [estimateId, ...updates.map((update) => update.id)],
  );
  const currentById = new Map(currentTabs.map((tab) => [tab.id, readNumber(tab.sort_order)]));
  const missingId = updates.find((update) => !currentById.has(update.id))?.id;
  if (missingId) throw new Error(`Estimate tab not found in the current estimate: ${missingId}.`);
  const changedUpdates = updates.filter((update) => currentById.get(update.id) !== update.sort_order);
  if (changedUpdates.length === 0) return { estimateTabId: updates[0]!.id };
  const updatedAt = nowIso();
  const currentStateClauses = changedUpdates.map(() => "(id = ? AND sort_order = ?)").join(" OR ");
  const mutationStatements: Array<{ sql: string; values?: unknown[] }> = [{
    sql: `
      SELECT CASE WHEN (
        SELECT COUNT(*)
        FROM estimate_tabs
        WHERE estimate_id = ?
          AND (${currentStateClauses})
      ) = ? THEN 1 ELSE json('') END AS estimate_tab_reorder_guard
    `,
    values: [
      estimateId,
      ...changedUpdates.flatMap((update) => [update.id, currentById.get(update.id)!]),
      changedUpdates.length,
    ],
  }, ...changedUpdates.map((update) => ({
    sql: "UPDATE estimate_tabs SET sort_order = ?, updated_at = ? WHERE id = ? AND estimate_id = ?",
    values: [update.sort_order, updatedAt, update.id, estimateId],
  })), buildProjectPublicationRevisionForScope(projectId, estimate.workspace_id, estimateId)];
  await runMutationWithHistory(database, mutationStatements, {
    projectId,
    estimateId,
    eventType: "estimate_tabs_reordered",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    changedFields: ["sort_order"],
    payload: { updates: changedUpdates },
  });
  return { estimateTabId: changedUpdates[0]!.id };
}

async function duplicateEstimateTab(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  if (!database.batch) throw new Error("Estimate tab duplication requires atomic D1 batch support.");
  const sourceTabId = String(args.source_tab_id ?? "");
  const requestedName = typeof args.next_name === "string" && args.next_name.trim() ? args.next_name.trim() : null;
  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    "estimate.tab.duplicate",
    { sourceTabId, requestedName },
  );
  if (committedResult) return committedResult;

  const sourceTab = await readTabById(database, intent.estimateId, sourceTabId);
  if (!sourceTab) throw new Error("Estimate tab not found in the current estimate.");
  const sourceNodes = (await all<EstimateNodeRow>(
    database,
    "SELECT * FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ? ORDER BY sort_order ASC, id ASC",
    [intent.estimateId, sourceTabId],
  )).map(serializeNodeRow).sort(compareSortOrderThenId);
  const sourceNodeIds = sourceNodes.map((node) => node.id);
  const sourceRows = sourceNodeIds.length > 0
    ? (await all<EstimateRowItemRow>(
        database,
        `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(sourceNodeIds)}) ORDER BY sort_order ASC, id ASC`,
        [intent.estimateId, ...sourceNodeIds],
      )).map(serializeRowItem).sort(compareSortOrderThenId)
    : [];
  validateCopiedEstimateTabTopology(sourceNodes, sourceRows);

  const maximumStatementCount = 1 + sourceNodes.length + sourceRows.length + 1 + 2 + 1 + 1;
  assertD1MutationStatementLimit(maximumStatementCount);
  const sourceFingerprint = createMutationRequestFingerprint({
    tab: sourceTab,
    nodes: sourceNodes,
    rows: sourceRows,
  });
  const maxRow = await first<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_tabs WHERE estimate_id = ?",
    [intent.estimateId],
  );
  const expectedMaxTabSortOrder = readNumber(maxRow?.max_sort_order, -1000);
  const sourceNodeUpdatedAt = sourceNodes.reduce((latest, node) => String(node.updated_at ?? "") > latest ? String(node.updated_at ?? "") : latest, "");
  const sourceRowUpdatedAt = sourceRows.reduce((latest, row) => String(row.updated_at ?? "") > latest ? String(row.updated_at ?? "") : latest, "");
  const sourceRowRevisionTotal = sourceRows.reduce((total, row) => total + Math.max(1, Math.trunc(readNumber(row.row_revision, 1))), 0);

  const copiedAt = nowIso();
  const nextTabId = randomUUID();
  const nodeIdBySource = new Map(sourceNodes.map((node) => [node.id, randomUUID()]));
  const rowIdBySource = new Map(sourceRows.map((row) => [row.id, randomUUID()]));
  const tabInsert = buildInsertRecordStatement("estimate_tabs", {
    id: nextTabId,
    estimate_id: intent.estimateId,
    name: requestedName ?? `${sourceTab.name} Copy`,
    sort_order: expectedMaxTabSortOrder + 1000,
    is_default: false,
    metadata: sourceTab.metadata,
    created_by: intent.actorUserId,
    created_at: copiedAt,
    updated_at: copiedAt,
  });
  const nodeInserts = sourceNodes.map((node) => buildInsertRecordStatement("estimate_nodes", {
    id: nodeIdBySource.get(node.id),
    estimate_id: intent.estimateId,
    estimate_tab_id: nextTabId,
    parent_id: node.parent_id ? nodeIdBySource.get(node.parent_id) : null,
    kind: node.kind,
    name: node.name,
    sort_order: node.sort_order,
    metadata_json: node.metadata,
    created_at: copiedAt,
    updated_at: copiedAt,
  }));
  const rowInserts = sourceRows.map((row) => buildInsertRecordStatement("estimate_row_items", {
    ...row,
    id: rowIdBySource.get(row.id),
    estimate_id: intent.estimateId,
    node_id: nodeIdBySource.get(row.node_id!),
    source_snapshot: row.source_snapshot,
    metadata: row.metadata,
    row_revision: 1,
    created_at: copiedAt,
    updated_at: copiedAt,
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
      sourceTabId,
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
    sourceTabId,
    sourceFingerprint,
    copiedNodeCount: sourceNodes.length,
    copiedRowCount: sourceRows.length,
    eventId: history.eventId,
  };
  const sourceGuard = {
    sql: `
      SELECT CASE WHEN
        EXISTS (
          SELECT 1
          FROM estimate_tabs
          WHERE estimate_id = ?
            AND id = ?
            AND updated_at = ?
        )
        AND (SELECT COUNT(*) FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?) = ?
        AND COALESCE((SELECT MAX(updated_at) FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?), '') = ?
        AND (
          SELECT COUNT(*)
          FROM estimate_row_items row_item
          JOIN estimate_nodes node
            ON node.id = row_item.node_id
           AND node.estimate_id = row_item.estimate_id
          WHERE row_item.estimate_id = ?
            AND node.estimate_tab_id = ?
        ) = ?
        AND COALESCE((
          SELECT MAX(row_item.updated_at)
          FROM estimate_row_items row_item
          JOIN estimate_nodes node
            ON node.id = row_item.node_id
           AND node.estimate_id = row_item.estimate_id
          WHERE row_item.estimate_id = ?
            AND node.estimate_tab_id = ?
        ), '') = ?
        AND COALESCE((
          SELECT SUM(row_item.row_revision)
          FROM estimate_row_items row_item
          JOIN estimate_nodes node
            ON node.id = row_item.node_id
           AND node.estimate_id = row_item.estimate_id
          WHERE row_item.estimate_id = ?
            AND node.estimate_tab_id = ?
        ), 0) = ?
        AND COALESCE((SELECT MAX(sort_order) FROM estimate_tabs WHERE estimate_id = ?), -1000) = ?
      THEN 1 ELSE json('') END AS estimate_tab_duplicate_source_guard
    `,
    values: [
      intent.estimateId, sourceTabId, sourceTab.updated_at,
      intent.estimateId, sourceTabId, sourceNodes.length,
      intent.estimateId, sourceTabId, sourceNodeUpdatedAt,
      intent.estimateId, sourceTabId, sourceRows.length,
      intent.estimateId, sourceTabId, sourceRowUpdatedAt,
      intent.estimateId, sourceTabId, sourceRowRevisionTotal,
      intent.estimateId, expectedMaxTabSortOrder,
    ],
  };
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    sourceGuard,
    { sql: tabInsert.sql, values: tabInsert.values },
    ...nodeInserts.map((insert) => ({ sql: insert.sql, values: insert.values })),
    ...rowInserts.map((insert) => ({ sql: insert.sql, values: insert.values })),
    buildProjectPublicationRevisionStatement(intent),
    history.statement,
    history.outboxStatement,
    buildEstimateMutationReceiptStatement(intent, "estimate_tab", nextTabId, result, copiedAt),
  ];
  assertD1MutationStatementLimit(statements.length);
  try {
    await runBatch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    throw error;
  }
  return result;
}

async function archiveEstimateTab(database: D1DatabaseLike, args: Record<string, unknown>) {
  const estimateId = String(args.target_estimate_id ?? "");
  const projectId = String(args.target_project_id ?? "");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const tabId = String(args.target_tab_id ?? "");
  const tab = await readTabById(database, estimateId, tabId);
  if (!tab) throw new Error("Estimate tab not found in the current estimate.");
  if (tab.archived_at) return { estimateTabId: tabId };
  const archivedAt = nowIso();
  await runMutationWithHistory(database, [
    {
      sql: "UPDATE estimate_tabs SET archived_at = ?, updated_at = ? WHERE id = ? AND estimate_id = ? AND updated_at = ?",
      values: [archivedAt, archivedAt, tabId, estimateId, tab.updated_at],
    },
    buildProjectPublicationRevisionForScope(projectId, estimate.workspace_id, estimateId),
  ], {
    projectId,
    estimateId,
    estimateTabId: tabId,
    eventType: "estimate_tab_archived",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    payload: { tabId },
  });
  return { estimateTabId: tabId };
}

async function deleteEstimateTab(database: D1DatabaseLike, args: Record<string, unknown>) {
  const estimateId = String(args.target_estimate_id ?? "");
  const projectId = String(args.target_project_id ?? "");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const tabId = String(args.target_tab_id ?? "");
  const tab = await readTabById(database, estimateId, tabId);
  if (!tab) throw new Error("Estimate tab not found in the current estimate.");
  const replacement = await first<{ id: string }>(
    database,
    "SELECT id FROM estimate_tabs WHERE estimate_id = ? AND id <> ? AND archived_at IS NULL ORDER BY is_default DESC, sort_order ASC LIMIT 1",
    [estimateId, tabId],
  );
  if (!replacement) throw new Error("At least one active estimate tab is required.");
  const nodes = await all<{ id: string }>(database, "SELECT id FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?", [estimateId, tabId]);
  const nodeIds = nodes.map((node) => node.id);
  const deletedRows = nodeIds.length > 0
    ? await all<EstimateRowItemRow>(database, `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(nodeIds)})`, [estimateId, ...nodeIds])
    : [];
  const deletedAt = nowIso();
  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: estimate.workspace_id,
    estimateTabId: tabId,
    eventType: "estimate_tab_deleted",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    oldSnapshot: { rows: deletedRows.map(serializeRowItem) },
    payload: { tabId, replacementTabId: replacement?.id ?? null, deletedNodeIds: nodeIds },
  });
  const mutationStatements: Array<{ sql: string; values: unknown[] }> = [];
  mutationStatements.push({
    sql: `
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM estimate_tabs
        WHERE id = ?
          AND estimate_id = ?
          AND updated_at = ?
      ) THEN 1 ELSE json('') END AS estimate_tab_delete_guard
    `,
    values: [tabId, estimateId, tab.updated_at],
  });
  mutationStatements.push(...buildProjectComponentAttachmentDeleteRetentionStatements({
    workspaceId: estimate.workspace_id,
    projectId,
    sourceDeleteEventId: history.eventId,
    deletedRows,
    deletedAt,
  }).map((statement) => ({ sql: statement.sql, values: statement.values ?? [] })));
  if (nodeIds.length > 0) {
    mutationStatements.push(
      { sql: `DELETE FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(nodeIds)})`, values: [estimateId, ...nodeIds] },
      { sql: `DELETE FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(nodeIds)})`, values: [estimateId, ...nodeIds] },
    );
  }
  mutationStatements.push({
    sql: "DELETE FROM estimate_tabs WHERE id = ? AND estimate_id = ?",
    values: [tabId, estimateId],
  });
  mutationStatements.push(buildProjectPublicationRevisionForScope(projectId, estimate.workspace_id, estimateId));
  if (history.statement) mutationStatements.push(
    { sql: history.statement.sql, values: history.statement.values ?? [] },
    { sql: history.outboxStatement.sql, values: history.outboxStatement.values ?? [] },
  );
  assertD1MutationStatementLimit(mutationStatements.length);
  await runBatch(database, mutationStatements);
  return {
    estimateTabId: tabId,
    replacementTabId: replacement.id,
    deletedNodeCount: nodeIds.length,
    deletedRowCount: deletedRows.length,
  };
}

async function createEstimateNode(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const requestedTabId = typeof args.target_tab_id === "string" && args.target_tab_id ? args.target_tab_id : null;
  const parentNodeId = typeof args.parent_node_id === "string" && args.parent_node_id ? args.parent_node_id : null;
  const parentNode = parentNodeId ? await readNodeById(database, estimateId, parentNodeId) : null;
  if (parentNodeId && !parentNode) throw new Error("Parent estimate node not found in the current estimate.");
  const estimateTabId = parentNode?.estimate_tab_id ?? requestedTabId;
  if (parentNode && requestedTabId && parentNode.estimate_tab_id !== requestedTabId) {
    throw new Error("Estimate tree nodes cannot be created across tabs.");
  }
  if (estimateTabId) {
    const tab = await readTabById(database, estimateId, estimateTabId);
    if (!tab) throw new Error("Estimate tab not found in the current estimate.");
    if (tab.archived_at) throw new Error("Estimate tree nodes cannot be created in an archived tab.");
  }
  const nodeId = randomUUID();
  const nodeKind = String(args.node_kind ?? "group");
  if (!["group", "area"].includes(nodeKind)) throw new Error("Estimate tree node kind is invalid.");
  const initialSortOrder = Number(args.initial_sort_order);
  if (!Number.isFinite(initialSortOrder) || initialSortOrder < 0) throw new Error("Estimate tree node sort order must be a non-negative number.");
  const insert = buildInsertRecordStatement("estimate_nodes", {
    id: nodeId,
    estimate_id: estimateId,
    estimate_tab_id: estimateTabId,
    parent_id: parentNodeId,
    kind: nodeKind,
    name: args.node_name ?? "Untitled",
    sort_order: initialSortOrder,
    metadata_json: {},
  });
  const activationStatements: D1PreparedStatementLike[] = [];
  if (nodeKind === "area") {
    const project = await readProjectContext(database, projectId);
    const workspaceId = project?.workspace_id ?? "";
    const occurredAt = nowIso();
    const intent = validateActivationProducerIntent({
      domainMutationId: nodeId,
      estimateId,
      milestone: "first_area_created",
      occurredAt,
      projectId,
      source: "estimate",
      userId: String(args.acting_user_id ?? ""),
      workspaceId,
    });
    if (intent.status !== "accepted") throw new Error("Activation area intent is invalid.");
    activationStatements.push(prepareActivationOutboxIntent(database, {
      domainMutationId: nodeId,
      dedupeKey: intent.dedupeKey,
      estimateId,
      milestone: "first_area_created",
      occurredAt,
      projectId,
      source: "estimate",
      userId: String(args.acting_user_id ?? ""),
      workspaceId,
    }));
  }
  const eventId = await runMutationWithHistory(database, [
    { sql: insert.sql, values: insert.values },
    buildProjectPublicationRevisionForScope(projectId, estimate.workspace_id, estimateId),
  ], {
    projectId,
    estimateId,
    estimateNodeId: nodeId,
    estimateTabId,
    eventType: "estimate_node_created",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    payload: { nodeId, name: args.node_name, kind: nodeKind, parentNodeId, estimateTabId },
  }, activationStatements);
  return { nodeId, eventId, payload: { nodeId } };
}

async function renameEstimateNode(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const nodeId = String(args.target_node_id ?? "");
  const node = await readNodeById(database, estimateId, nodeId);
  if (!node) throw new Error("Estimate tree node not found in the current project.");
  const name = String(args.next_name ?? "").trim();
  if (!name) throw new Error("Estimate tree node name is required.");
  if (name === node.name) return { nodeId };
  const updatedAt = nowIso();
  await runMutationWithHistory(database, [
    {
      sql: "UPDATE estimate_nodes SET name = ?, updated_at = ? WHERE id = ? AND estimate_id = ? AND updated_at = ?",
      values: [name, updatedAt, nodeId, estimateId, node.updated_at ?? null],
    },
    buildProjectPublicationRevisionForScope(projectId, estimate.workspace_id, estimateId),
  ], {
    projectId,
    estimateId,
    estimateNodeId: nodeId,
    estimateTabId: node.estimate_tab_id ?? null,
    eventType: "estimate_node_renamed",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    changedFields: ["name"],
    oldSnapshot: node,
    newSnapshot: { name },
    payload: { nodeId, name },
  });
  return { nodeId };
}

async function reorderEstimateNodes(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const project = await readProjectContext(database, projectId);
  if (!project?.workspace_id) throw new Error("Estimate history event workspace could not be resolved.");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const updates = Array.isArray(args.move_updates) ? args.move_updates as Array<Record<string, unknown>> : [];
  const moveUpdates = updates.map((update) => ({
    id: String(update.id ?? ""),
    parent_id: typeof update.parent_id === "string" && update.parent_id ? update.parent_id : null,
    sort_order: Number(update.sort_order),
  }));
  if (moveUpdates.length === 0) throw new Error("At least one estimate tree node update is required.");

  const updateIds = new Set<string>();
  for (const update of moveUpdates) {
    if (updateIds.has(update.id)) throw new Error(`Duplicate estimate tree node update: ${update.id}.`);
    updateIds.add(update.id);
    if (!Number.isFinite(update.sort_order) || update.sort_order < 0) throw new Error("Estimate tree node sort order must be a non-negative number.");
  }

  const currentNodes = await all<Pick<EstimateNodeRow, "id" | "estimate_id" | "estimate_tab_id" | "parent_id" | "sort_order">>(
    database,
    "SELECT id, estimate_id, estimate_tab_id, parent_id, sort_order FROM estimate_nodes WHERE estimate_id = ?",
    [estimateId],
  );
  const projectedTreeValidation = validateProjectedEstimateTreeReorder({
    estimateId,
    nodes: currentNodes.map((node) => ({
      id: node.id,
      estimateId: node.estimate_id,
      parentId: node.parent_id,
      tabId: node.estimate_tab_id ?? null,
    })),
    updates: moveUpdates.map((update) => ({
      id: update.id,
      parentId: update.parent_id,
    })),
  });
  if (!projectedTreeValidation.ok) throw new Error(projectedTreeValidation.message);

  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  const changedUpdates = moveUpdates.filter((update) => {
    const current = currentById.get(update.id)!;
    return current.parent_id !== update.parent_id || readNumber(current.sort_order) !== update.sort_order;
  });
  if (changedUpdates.length === 0) return { updatedNodeCount: 0 };
  const affectedTabIds = [...new Set(changedUpdates.flatMap((update) => {
    const nodeTabId = currentById.get(update.id)?.estimate_tab_id;
    const parentTabId = update.parent_id ? currentById.get(update.parent_id)?.estimate_tab_id : nodeTabId;
    return [nodeTabId, parentTabId].filter((tabId): tabId is string => typeof tabId === "string" && tabId.length > 0);
  }))];
  if (affectedTabIds.length > 0) {
    const activeTabs = await all<Pick<EstimateTabRow, "id" | "archived_at">>(
      database,
      `SELECT id, archived_at FROM estimate_tabs WHERE estimate_id = ? AND id IN (${placeholders(affectedTabIds)})`,
      [estimateId, ...affectedTabIds],
    );
    if (activeTabs.length !== affectedTabIds.length || activeTabs.some((tab) => tab.archived_at !== null)) {
      throw new Error("Estimate tree nodes cannot be reordered in an archived or missing tab.");
    }
  }

  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: project.workspace_id,
    eventType: "estimate_nodes_reordered",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    changedFields: ["parent_id", "sort_order"],
    payload: { updates: changedUpdates },
  });
  const currentStateClauses = changedUpdates.map(() => "(id = ? AND parent_id IS ? AND sort_order = ?)").join(" OR ");
  const updatedAt = nowIso();
  const statements: Array<{ sql: string; values?: unknown[] }> = [{
    sql: `
      SELECT CASE WHEN (
        SELECT COUNT(*)
        FROM estimate_nodes
        WHERE estimate_id = ?
          AND (${currentStateClauses})
      ) = ? THEN 1 ELSE json('') END AS estimate_node_reorder_guard
    `,
    values: [
      estimateId,
      ...changedUpdates.flatMap((update) => {
        const current = currentById.get(update.id)!;
        return [update.id, current.parent_id, readNumber(current.sort_order)];
      }),
      changedUpdates.length,
    ],
  }, ...changedUpdates.map((update) => ({
    sql: "UPDATE estimate_nodes SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ? AND estimate_id = ?",
    values: [update.parent_id, update.sort_order, updatedAt, update.id, estimateId],
  })), buildProjectPublicationRevisionForScope(projectId, project.workspace_id, estimateId)];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  assertD1MutationStatementLimit(statements.length);
  await runBatch(database, statements);
  return { updatedNodeCount: changedUpdates.length };
}

async function collectDescendantNodeIds(database: D1DatabaseLike, estimateId: string, rootIds: string[]) {
  const nodes = await all<EstimateNodeRow>(database, "SELECT id, parent_id FROM estimate_nodes WHERE estimate_id = ?", [estimateId]);
  const childrenByParent = new Map<string | null, string[]>();
  for (const node of nodes) {
    const children = childrenByParent.get(node.parent_id) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parent_id, children);
  }
  const result: string[] = [];
  const queue = [...rootIds];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }
  return result;
}

async function deleteEstimateNodes(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const project = await readProjectContext(database, projectId);
  if (!project?.workspace_id) throw new Error("Estimate history event workspace could not be resolved.");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const rootIds = [...new Set((Array.isArray(args.target_node_ids)
    ? args.target_node_ids.filter((id): id is string => typeof id === "string")
    : [String(args.target_node_id ?? "")])
    .map((id) => id.trim())
    .filter(Boolean))];
  if (rootIds.length === 0) throw new Error("At least one estimate tree node is required for delete.");
  const rootNodes = await all<Pick<EstimateNodeRow, "id" | "estimate_tab_id">>(
    database,
    `SELECT id, estimate_tab_id FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(rootIds)})`,
    [estimateId, ...rootIds],
  );
  const rootNodeIds = new Set(rootNodes.map((node) => node.id));
  const missingRootId = rootIds.find((rootId) => !rootNodeIds.has(rootId));
  if (missingRootId) throw new Error(`Estimate tree node not found in the current estimate: ${missingRootId}.`);
  const rootTabIds = new Set(rootNodes.map((node) => node.estimate_tab_id ?? null));
  if (rootTabIds.size !== 1) throw new Error("Estimate tree nodes cannot be deleted across tabs in one action.");
  const rootTabId = rootNodes[0]?.estimate_tab_id ?? null;
  const deletedNodeIds = await collectDescendantNodeIds(database, estimateId, rootIds);
  const deletedNodes = deletedNodeIds.length
    ? await all<EstimateNodeRow>(database, `SELECT * FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(deletedNodeIds)})`, [estimateId, ...deletedNodeIds])
    : [];
  const deletedRows = deletedNodeIds.length
    ? await all<EstimateRowItemRow>(database, `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(deletedNodeIds)})`, [estimateId, ...deletedNodeIds])
    : [];
  const remainingNodes = await all<Pick<EstimateNodeRow, "id" | "sort_order">>(
    database,
    "SELECT id, sort_order FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id IS ? ORDER BY sort_order ASC, id ASC",
    [estimateId, rootTabId],
  );
  const deletedNodeIdSet = new Set(deletedNodeIds);
  const fallbackNodeId = remainingNodes.find((node) => !deletedNodeIdSet.has(node.id))?.id ?? null;
  const deletedAt = nowIso();
  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: project.workspace_id,
    estimateNodeId: rootIds[0] ?? null,
    eventType: rootIds.length > 1 ? "estimate_nodes_deleted" : "estimate_node_deleted",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    oldSnapshot: {
      nodeIds: deletedNodeIds,
      nodes: deletedNodes.map(serializeNodeRow),
      rows: deletedRows.map(serializeRowItem),
    },
    payload: {
      deletedNodeIds,
      deletedNodeCount: deletedNodeIds.length,
      deletedRowCount: deletedRows.length,
      fallbackNodeId,
    },
  });
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    {
      sql: `
        WITH RECURSIVE subtree(id) AS (
          SELECT id
          FROM estimate_nodes
          WHERE estimate_id = ?
            AND id IN (${placeholders(rootIds)})
          UNION
          SELECT node.id
          FROM estimate_nodes node
          JOIN subtree parent ON node.parent_id = parent.id
          WHERE node.estimate_id = ?
        )
        SELECT CASE WHEN
          (SELECT COUNT(*) FROM subtree) = ?
          AND (SELECT COUNT(*) FROM subtree WHERE id IN (${placeholders(deletedNodeIds)})) = ?
        THEN 1 ELSE json('') END AS estimate_node_delete_topology_guard
      `,
      values: [estimateId, ...rootIds, estimateId, deletedNodeIds.length, ...deletedNodeIds, deletedNodeIds.length],
    },
    ...buildProjectComponentAttachmentDeleteRetentionStatements({
      workspaceId: project.workspace_id,
      projectId,
      sourceDeleteEventId: history.eventId,
      deletedRows,
      deletedAt,
    }),
  ];
  if (deletedNodeIds.length > 0) {
    statements.push(
      { sql: `DELETE FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(deletedNodeIds)})`, values: [estimateId, ...deletedNodeIds] },
      { sql: `DELETE FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(deletedNodeIds)})`, values: [estimateId, ...deletedNodeIds] },
    );
  }
  statements.push(buildProjectPublicationRevisionForScope(projectId, project.workspace_id, estimateId));
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  assertD1MutationStatementLimit(statements.length);
  await runBatch(database, statements);
  return {
    eventId: history.eventId,
    deletedNodeIds,
    deletedNodeCount: deletedNodeIds.length,
    deletedRowCount: deletedRows.length,
    fallbackNodeId,
    payload: { deletedNodeIds, deletedNodeCount: deletedNodeIds.length, deletedRowCount: deletedRows.length, fallbackNodeId },
  };
}

async function restoreDeletedEstimateNodes(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const sourceEventId = String(args.source_delete_event_id ?? "");
  const project = await readProjectContext(database, projectId);
  if (!project?.workspace_id) throw new Error("Estimate history event workspace could not be resolved.");
  const estimate = await readEstimateContext(database, estimateId, projectId);
  if (!estimate) throw new Error("Estimate not found in the current project.");
  const sourceEvent = await first<EstimateEventRow>(
    database,
    `
      SELECT *
      FROM estimate_sheet_events
      WHERE id = ?
        AND estimate_id = ?
        AND project_id = ?
      LIMIT 1
    `,
    [sourceEventId, estimateId, projectId],
  );
  if (!sourceEvent || !["estimate_node_deleted", "estimate_nodes_deleted"].includes(sourceEvent.event_type)) {
    throw new Error("Deleted node history snapshot was not found in the current estimate.");
  }

  const snapshot = readJsonRecord(sourceEvent.old_snapshot);
  const snapshotNodes = Array.isArray(snapshot.nodes)
    ? snapshot.nodes.map(readJsonRecord).filter((node) => typeof node.id === "string" && node.estimate_id === estimateId)
    : [];
  const snapshotRows = Array.isArray(snapshot.rows)
    ? snapshot.rows.map(readJsonRecord).filter((row) => typeof row.id === "string" && row.estimate_id === estimateId)
    : [];
  if (snapshotNodes.length === 0) throw new Error("Deleted node history snapshot does not contain restorable nodes.");

  const snapshotNodeIds = new Set(snapshotNodes.map((node) => String(node.id)));
  const requestedRootIds = Array.isArray(args.target_node_ids)
    ? [...new Set(args.target_node_ids.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean))]
    : [];
  const unknownRequestedRootId = requestedRootIds.find((id) => !snapshotNodeIds.has(id));
  if (unknownRequestedRootId) throw new Error(`Deleted node history does not contain requested node: ${unknownRequestedRootId}.`);
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
  validateCopiedEstimateTabTopology(
    nodesToRestore.map((node) => ({
      id: String(node.id),
      estimate_id: estimateId,
      estimate_tab_id: typeof node.estimate_tab_id === "string" ? node.estimate_tab_id : null,
      parent_id: typeof node.parent_id === "string" && restoredNodeIdSet.has(node.parent_id) ? node.parent_id : null,
      kind: String(node.kind ?? "area"),
      name: String(node.name ?? ""),
      sort_order: readNumber(node.sort_order),
    })),
    rowsToRestore.map((row) => ({
      id: String(row.id),
      estimate_id: estimateId,
      node_id: typeof row.node_id === "string" ? row.node_id : null,
      description: null,
      designation: null,
      discipline: null,
      material: null,
      quantity: 0,
      unit: null,
      unit_cost: 0,
      misc_cost: 0,
      contingency_percentage: 0,
      sort_order: readNumber(row.sort_order),
    })),
  );
  const collidingNodes = restoredNodeIds.length > 0
    ? await all<{ id: string }>(
        database,
        `SELECT id FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(restoredNodeIds)})`,
        [estimateId, ...restoredNodeIds],
      )
    : [];
  if (collidingNodes.length > 0) throw new Error("One or more estimate nodes to restore already exist.");
  const collidingRows = restoredRowIds.length > 0
    ? await all<{ id: string }>(
        database,
        `SELECT id FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)})`,
        [estimateId, ...restoredRowIds],
      )
    : [];
  if (collidingRows.length > 0) throw new Error("One or more estimate rows to restore already exist.");

  const existingNodes = await all<Pick<EstimateNodeRow, "id" | "estimate_tab_id" | "parent_id" | "sort_order">>(
    database,
    "SELECT id, estimate_tab_id, parent_id, sort_order FROM estimate_nodes WHERE estimate_id = ?",
    [estimateId],
  );
  const existingNodesById = new Map(existingNodes.map((node) => [node.id, node]));
  const restoredNodesById = new Map(nodesToRestore.map((node) => [String(node.id), node]));
  const restoreTabIds = [...new Set(nodesToRestore.flatMap((node) => (
    typeof node.estimate_tab_id === "string" && node.estimate_tab_id ? [node.estimate_tab_id] : []
  )))];
  if (restoreTabIds.length > 0) {
    const activeTabs = await all<Pick<EstimateTabRow, "id" | "archived_at">>(
      database,
      `SELECT id, archived_at FROM estimate_tabs WHERE estimate_id = ? AND id IN (${placeholders(restoreTabIds)})`,
      [estimateId, ...restoreTabIds],
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
    const parentTabId = parentNode && typeof parentNode.estimate_tab_id === "string" ? parentNode.estimate_tab_id : null;
    if (parentNode && parentTabId !== nodeTabId) throw new Error("Deleted estimate nodes cannot be restored across tabs.");
    const sortCollision = existingNodes.some((existingNode) => (
      (existingNode.estimate_tab_id ?? null) === nodeTabId
      && existingNode.parent_id === parentId
      && readNumber(existingNode.sort_order) === readNumber(node.sort_order)
    ));
    if (sortCollision) throw new Error(`Estimate tree restore sort position is already occupied: ${nodeId}.`);
  }

  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: project.workspace_id,
    estimateNodeId: restoredRootNodeIds[0] ?? null,
    eventType: "estimate_nodes_restored",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    newSnapshot: { nodes: nodesToRestore, rows: rowsToRestore },
    payload: {
      sourceEventId,
      restoredNodeIds,
      restoredRootNodeIds,
      restoredNodeCount: restoredNodeIds.length,
      restoredRowIds,
      restoredRowCount: restoredRowIds.length,
    },
  });
  const restoredAt = nowIso();
  const attachmentRetention = buildProjectComponentAttachmentRestoreRetentionStatements({
    projectId,
    sourceDeleteEventId: sourceEventId,
    restoredRows: rowsToRestore,
    restoredAt,
  });
  const collisionGuard = {
    sql: `
      SELECT CASE WHEN
        (SELECT COUNT(*) FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(restoredNodeIds)})) = 0
        ${restoredRowIds.length > 0
          ? `AND (SELECT COUNT(*) FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)})) = 0`
          : ""}
      THEN 1 ELSE json('') END AS estimate_node_restore_collision_guard
    `,
    values: [
      estimateId,
      ...restoredNodeIds,
      ...(restoredRowIds.length > 0 ? [estimateId, ...restoredRowIds] : []),
    ],
  };
  const restoreGuards: Array<{ sql: string; values?: unknown[] }> = [collisionGuard];
  if (restoreTabIds.length > 0) {
    restoreGuards.push({
      sql: `
        SELECT CASE WHEN (
          SELECT COUNT(*)
          FROM estimate_tabs
          WHERE estimate_id = ?
            AND archived_at IS NULL
            AND id IN (${placeholders(restoreTabIds)})
        ) = ? THEN 1 ELSE json('') END AS estimate_node_restore_tab_guard
      `,
      values: [estimateId, ...restoreTabIds, restoreTabIds.length],
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
          SELECT COUNT(*)
          FROM estimate_nodes
          WHERE estimate_id = ?
            AND (${clauses})
        ) = ? THEN 1 ELSE json('') END AS estimate_node_restore_parent_guard
      `,
      values: [estimateId, ...externalParents.flatMap((parent) => [parent.parentId, parent.tabId]), externalParents.length],
    });
  }
  const sortClauses = nodesToRestore.map(() => "(estimate_tab_id IS ? AND parent_id IS ? AND sort_order = ?)").join(" OR ");
  restoreGuards.push({
    sql: `
      SELECT CASE WHEN NOT EXISTS (
        SELECT 1
        FROM estimate_nodes
        WHERE estimate_id = ?
          AND (${sortClauses})
      ) THEN 1 ELSE json('') END AS estimate_node_restore_sort_guard
    `,
    values: [
      estimateId,
      ...nodesToRestore.flatMap((node) => [
        typeof node.estimate_tab_id === "string" ? node.estimate_tab_id : null,
        typeof node.parent_id === "string" && node.parent_id ? node.parent_id : null,
        readNumber(node.sort_order),
      ]),
    ],
  });
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    ...restoreGuards,
    ...attachmentRetention.guardStatements,
    ...buildPackedInsertStatements("estimate_nodes", nodesToRestore),
    ...buildPackedInsertStatements("estimate_row_items", rowsToRestore),
    ...attachmentRetention.releaseStatements,
    buildProjectPublicationRevisionForScope(projectId, project.workspace_id, estimateId),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  assertD1MutationStatementLimit(statements.length);
  await runBatch(database, statements);
  return {
    eventId: history.eventId,
    sourceEventId,
    restoredNodeIds,
    restoredRootNodeIds,
    restoredNodeCount: restoredNodeIds.length,
    restoredRowIds,
    restoredRowCount: restoredRowIds.length,
  };
}

async function insertRowItem(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  if (!database.batch) throw new Error("Atomic estimate row insertion is unavailable.");
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const nodeId = String(args.target_node_id ?? "");
  const payload = readJsonRecord(args.row_payload);
  const activeTabId = typeof args.target_active_tab_id === "string" && args.target_active_tab_id
    ? args.target_active_tab_id
    : null;
  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    "estimate.row.insert",
    { projectId, estimateId, nodeId, activeTabId, payload },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, estimateId, intent.intentId);
  if (existingEvent) {
    const existingPayload = readJsonRecord(existingEvent.payload);
    const existingRowId = String(existingEvent.target_row_id ?? existingPayload.rowId ?? payload.id ?? "");
    const existingRow = existingRowId ? await readRowById(database, estimateId, existingRowId) : null;
    if (!existingRow) throw new Error("Idempotent estimate row insert event exists but the row is missing.");
    return rowItemHistoryResult(existingRow, existingEvent.id);
  }
  const destination = await validateEstimateDestinationNodes(database, estimateId, [nodeId], activeTabId);
  const sort = await first<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_row_items WHERE estimate_id = ? AND node_id = ?",
    [estimateId, nodeId],
  );
  const expectedMaxSortOrder = sort?.max_sort_order === null || sort?.max_sort_order === undefined
    ? -1000
    : readNumber(sort.max_sort_order, -1000);
  const rowId = typeof payload.id === "string" && payload.id ? payload.id : randomUUID();
  const insert = buildInsertRecordStatement("estimate_row_items", {
    id: rowId,
    estimate_id: estimateId,
    node_id: nodeId,
    source_library_item_id: payload.sourceLibraryItemId ?? null,
    source_snapshot: payload.sourceSnapshot ?? {},
    category_node_id: payload.categoryNodeId ?? null,
    supplier_id: payload.supplierId ?? null,
    material: payload.material ?? "",
    description: payload.description ?? "",
    supplier: payload.supplier ?? "",
    unit: payload.unit ?? "unit",
    quantity: readNumber(payload.quantity, 1),
    quantity_base: payload.quantityBase ?? null,
    quantity_contingency_amount: payload.quantityContingencyAmount ?? null,
    unit_cost: readNumber(payload.unitCost),
    contingency_percentage: readNumber(payload.contingencyPercentage),
    adjustment_percentage: readNumber(payload.adjustmentPercentage),
    misc_cost: readNumber(payload.miscCost),
    discipline: payload.discipline ?? "",
    designation: payload.designation ?? "",
    metadata: payload.metadata ?? {},
    link_state: payload.linkState ?? "unlinked",
    pricing_provenance_origin: payload.pricingProvenanceOrigin ?? "missing",
    sort_order: expectedMaxSortOrder + 1000,
  });
  const insertedRow = insert.record as unknown as EstimateRowItemRow;
  const workspaceId = intent.workspaceId;
  const userId = intent.actorUserId;
  const occurredAt = nowIso();
  const activationStatements: D1PreparedStatementLike[] = [];
  const rowIntent = validateActivationProducerIntent({
    domainMutationId: rowId,
    estimateId,
    milestone: "first_row_priced",
    occurredAt,
    projectId,
    source: "estimate",
    userId,
    workspaceId,
  });
  if (rowIntent.status !== "accepted") throw new Error("Activation priced row intent is invalid.");
  activationStatements.push(prepareActivationOutboxIntent(database, {
    domainMutationId: rowId,
    dedupeKey: rowIntent.dedupeKey,
    estimateId,
    milestone: "first_row_priced",
    occurredAt,
    projectId,
    source: "estimate",
    userId,
    workspaceId,
  }));
  const insertedRowTotalMinorUnits = estimateRowTotalMinorUnits(insertedRow);
  if (insertedRowTotalMinorUnits > 0) {
    const totalIntent = validateActivationProducerIntent({
      domainMutationId: rowId,
      estimateId,
      milestone: "first_valid_total",
      occurredAt,
      projectId,
      source: "estimate",
      userId,
      workspaceId,
    });
    if (totalIntent.status !== "accepted") throw new Error("Activation valid total intent is invalid.");
    activationStatements.push(prepareActivationOutboxIntent(database, {
      domainMutationId: rowId,
      dedupeKey: totalIntent.dedupeKey,
      estimateId,
      milestone: "first_valid_total",
      occurredAt,
      projectId,
      source: "estimate",
      userId,
      workspaceId,
    }));
  }
  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId,
    estimateNodeId: nodeId,
    targetRowId: rowId,
    eventType: "row_inserted",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    newSnapshot: insert.record,
    rowContext: { material: insertedRow.material, supplier: insertedRow.supplier },
    payload: { rowId },
    totalDelta: minorUnitsToAmount(insertedRowTotalMinorUnits),
  });
  const result = rowItemHistoryResult(insertedRow, history.eventId);
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    destination.guard,
    {
      sql: `
        SELECT CASE WHEN COALESCE((
          SELECT MAX(sort_order)
          FROM estimate_row_items
          WHERE estimate_id = ?
            AND node_id = ?
        ), -1000) = ? THEN 1 ELSE json('') END AS estimate_row_order_guard
      `,
      values: [estimateId, nodeId, expectedMaxSortOrder],
    },
    { sql: insert.sql, values: insert.values },
    buildProjectPublicationRevisionStatement(intent),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(intent, "estimate_row_item", rowId, result, occurredAt));
  assertD1MutationStatementLimit(statements.length + activationStatements.length);
  try {
    await runBatchWithPreparedStatements(database, statements, activationStatements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    throw error;
  }
  const row = await readRowById(database, estimateId, rowId);
  if (!row) throw new Error("Estimate row item was not created.");
  return rowItemHistoryResult(row, history.eventId);
}

async function duplicateRowItem(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  if (!database.batch) throw new Error("Atomic estimate row duplication is unavailable.");
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const sourceRowId = String(args.source_row_id ?? "");
  const targetNodeId = String(args.target_node_id ?? "");
  const duplicatedRowId = String(args.duplicated_row_id ?? "");
  const expectedSourceRowRevision = readNumber(args.expected_source_row_revision);
  const activeTabId = typeof args.target_active_tab_id === "string" && args.target_active_tab_id
    ? args.target_active_tab_id
    : null;
  if (!sourceRowId || !targetNodeId || !duplicatedRowId) throw new Error("Estimate row duplication identity is incomplete.");
  if (!Number.isInteger(expectedSourceRowRevision) || expectedSourceRowRevision < 1) {
    throw new Error("Estimate row duplication requires the current source revision.");
  }
  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    "estimate.row.duplicate",
    {
      projectId,
      estimateId,
      sourceRowId,
      expectedSourceRowRevision,
      targetNodeId,
      activeTabId,
      duplicatedRowId,
    },
  );
  if (committedResult) return committedResult;

  const sourceRow = await readRowById(database, estimateId, sourceRowId);
  if (!sourceRow) throw new Error("Estimate row item to duplicate was not found in the current project.");
  if (readNumber(sourceRow.row_revision, 1) !== expectedSourceRowRevision) {
    throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
  }
  if (sourceRow.node_id !== targetNodeId) throw new Error("Estimate row duplication target changed. Refresh and try again.");
  const destination = await validateEstimateDestinationNodes(database, estimateId, [targetNodeId], activeTabId);
  const sort = await first<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_row_items WHERE estimate_id = ? AND node_id = ?",
    [estimateId, targetNodeId],
  );
  const expectedMaxSortOrder = sort?.max_sort_order === null || sort?.max_sort_order === undefined
    ? -1000
    : readNumber(sort.max_sort_order, -1000);
  const timestamp = nowIso();
  const insert = buildInsertRecordStatement("estimate_row_items", {
    id: duplicatedRowId,
    estimate_id: estimateId,
    node_id: targetNodeId,
    description: sourceRow.description ?? "",
    designation: sourceRow.designation ?? "",
    discipline: sourceRow.discipline ?? "",
    material: sourceRow.material ?? "",
    supplier: sourceRow.supplier ?? "",
    supplier_id: sourceRow.supplier_id ?? null,
    quantity: readNumber(sourceRow.quantity),
    quantity_base: sourceRow.quantity_base ?? null,
    quantity_contingency_amount: sourceRow.quantity_contingency_amount ?? null,
    unit: sourceRow.unit ?? "",
    unit_cost: readNumber(sourceRow.unit_cost),
    misc_cost: readNumber(sourceRow.misc_cost),
    contingency_percentage: readNumber(sourceRow.contingency_percentage),
    adjustment_percentage: readNumber(sourceRow.adjustment_percentage),
    source_snapshot: rowSourceSnapshot(sourceRow) ?? {},
    sort_order: expectedMaxSortOrder + 1000,
    row_revision: 1,
    category_node_id: sourceRow.category_node_id ?? null,
    source_library_item_id: sourceRow.source_library_item_id ?? null,
    link_state: sourceRow.link_state ?? "unlinked",
    metadata: rowMetadata(sourceRow),
    pricing_provenance_origin: sourceRow.pricing_provenance_origin ?? "missing",
    created_at: timestamp,
    updated_at: timestamp,
  });
  const duplicatedRow = insert.record as unknown as EstimateRowItemRow;
  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: targetNodeId,
    targetRowId: duplicatedRowId,
    eventType: "row_duplicated",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    newSnapshot: insert.record,
    rowContext: { material: duplicatedRow.material, supplier: duplicatedRow.supplier },
    payload: { sourceRowId, duplicatedRowId },
    totalDelta: minorUnitsToAmount(estimateRowTotalMinorUnits(duplicatedRow)),
  });
  const result = {
    ...rowItemHistoryResult(duplicatedRow, history.eventId),
    sourceRowId,
  };
  const activationStatements: D1PreparedStatementLike[] = [];
  for (const milestone of ["first_row_priced", "first_valid_total"] as const) {
    if (milestone === "first_valid_total" && estimateRowTotalMinorUnits(duplicatedRow) <= 0) continue;
    const activationIntent = validateActivationProducerIntent({
      domainMutationId: duplicatedRowId,
      estimateId,
      milestone,
      occurredAt: timestamp,
      projectId,
      source: "estimate",
      userId: intent.actorUserId,
      workspaceId: intent.workspaceId,
    });
    if (activationIntent.status !== "accepted") throw new Error("Activation duplicated row intent is invalid.");
    activationStatements.push(prepareActivationOutboxIntent(database, {
      domainMutationId: duplicatedRowId,
      dedupeKey: activationIntent.dedupeKey,
      estimateId,
      milestone,
      occurredAt: timestamp,
      projectId,
      source: "estimate",
      userId: intent.actorUserId,
      workspaceId: intent.workspaceId,
    }));
  }
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    destination.guard,
    buildRowRevisionGuardStatement(estimateId, [{ rowId: sourceRowId, rowRevision: expectedSourceRowRevision }]),
    {
      sql: `
        SELECT CASE WHEN COALESCE((
          SELECT MAX(sort_order)
          FROM estimate_row_items
          WHERE estimate_id = ?
            AND node_id = ?
        ), -1000) = ? THEN 1 ELSE json('') END AS estimate_row_duplicate_order_guard
      `,
      values: [estimateId, targetNodeId, expectedMaxSortOrder],
    },
    { sql: insert.sql, values: insert.values },
    buildProjectPublicationRevisionStatement(intent),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(intent, "estimate_row_item", duplicatedRowId, result, timestamp));
  assertD1MutationStatementLimit(statements.length + activationStatements.length);
  try {
    await runBatchWithPreparedStatements(database, statements, activationStatements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeSource = await readRowById(database, estimateId, sourceRowId);
    if (!authoritativeSource || readNumber(authoritativeSource.row_revision, 1) !== expectedSourceRowRevision) {
      throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
    }
    throw error;
  }
  const authoritativeRow = await readRowById(database, estimateId, duplicatedRowId);
  if (!authoritativeRow) throw new Error("Duplicated estimate row could not be reloaded.");
  return {
    ...rowItemHistoryResult(authoritativeRow, history.eventId),
    sourceRowId,
  };
}

function updateValuesForRowPatch(rowPatch: Record<string, unknown>) {
  const columns: Array<[string, unknown]> = [];
  const mapping: Record<string, string> = {
    material: "material",
    description: "description",
    supplier: "supplier",
    unit: "unit",
    unitCost: "unit_cost",
    quantity: "quantity",
    quantityBase: "quantity_base",
    quantityContingencyAmount: "quantity_contingency_amount",
    contingencyPercentage: "contingency_percentage",
    adjustmentPercentage: "adjustment_percentage",
    miscCost: "misc_cost",
    sourceSnapshot: "source_snapshot_json",
    metadata: "metadata_json",
    linkState: "link_state",
    sourceLibraryItemId: "source_library_item_id",
    pricingProvenanceOrigin: "pricing_provenance_origin",
    categoryNodeId: "category_node_id",
    supplierId: "supplier_id",
    discipline: "discipline",
    designation: "designation",
  };
  for (const [key, column] of Object.entries(mapping)) {
    if (!Object.prototype.hasOwnProperty.call(rowPatch, key)) continue;
    const value = rowPatch[key];
    const normalizedValue = column === "source_snapshot_json"
      ? normalizeEstimateRowJsonObject(value, "Estimate row source snapshot")
      : column === "metadata_json"
        ? normalizeEstimateRowJsonObject(value, "Estimate row metadata")
        : column === "pricing_provenance_origin"
          ? normalizeEstimateRowPricingProvenance(value)
          : value;
    columns.push([column, column.endsWith("_json") ? jsonString(normalizedValue) : normalizedValue]);
  }
  return columns;
}

function applyRowPatchForActivity(
  row: EstimateRowItemRow,
  rowPatch: Record<string, unknown>,
  nextRevision: number,
): EstimateRowItemRow {
  const next = { ...row, row_revision: nextRevision };
  const fieldMap: Record<string, keyof EstimateRowItemRow> = {
    material: "material",
    description: "description",
    supplier: "supplier",
    unit: "unit",
    unitCost: "unit_cost",
    quantity: "quantity",
    quantityBase: "quantity_base",
    quantityContingencyAmount: "quantity_contingency_amount",
    contingencyPercentage: "contingency_percentage",
    adjustmentPercentage: "adjustment_percentage",
    miscCost: "misc_cost",
    sourceSnapshot: "source_snapshot",
    metadata: "metadata",
    linkState: "link_state",
    sourceLibraryItemId: "source_library_item_id",
    pricingProvenanceOrigin: "pricing_provenance_origin",
    categoryNodeId: "category_node_id",
    supplierId: "supplier_id",
    discipline: "discipline",
    designation: "designation",
  };
  for (const [patchKey, rowKey] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(rowPatch, patchKey)) {
      (next as Record<string, unknown>)[rowKey] = rowPatch[patchKey];
    }
  }
  return serializeRowItem(next);
}

const SHARED_PROJECT_COMPONENT_ROW_PATCH_KEYS = new Set([
  "material",
  "supplier",
  "sourceSnapshot",
  "supplierId",
]);

const SHARED_PROJECT_COMPONENT_SOURCE_SNAPSHOT_KEYS = new Set([
  "brand",
  "brandId",
  "componentVersionId",
  "componentVersionNumber",
  "lifecycleState",
  "material",
  "notSupplierPriced",
  "priceOptions",
  "priceOptionUpdatedAt",
  "source",
  "supplier",
  "supplierId",
  "tags",
  "taxonomyVersion",
]);

const PROJECT_COMPONENT_VARIANT_SOURCE_SNAPSHOT_KEYS = new Set([
  "description",
  "imageAsset",
  "imageUrl",
  "priceOptionLabel",
  "pricingDate",
  "pricingSource",
  "sku",
  "sourceUrl",
  "unit",
  "unit_cost",
]);

const MAX_PROPAGATED_ACTIVITY_FACTS = 100;

type VariantActivityIdentity = {
  id: string | null;
  label: string | null;
};

function getVariantActivityIdentity(snapshot: unknown): VariantActivityIdentity | null {
  const row = readJsonRecord(snapshot);
  const source = readJsonRecord(row.sourceSnapshot ?? row.source_snapshot_json);
  const id = typeof source.priceOptionId === "string" && source.priceOptionId ? source.priceOptionId : null;
  const label = typeof source.priceOptionLabel === "string" && source.priceOptionLabel ? source.priceOptionLabel : null;
  return id || label ? { id, label } : null;
}

function variantsDiffer(previous: VariantActivityIdentity | null, next: VariantActivityIdentity | null) {
  return previous?.id !== next?.id || previous?.label !== next?.label;
}

function pickSharedProjectComponentSourceSnapshot(value: unknown, includeVariantFields = false) {
  if (value === null) return null;
  const sourceSnapshot = readJsonRecord(value);
  const shared: Record<string, unknown> = {};
  for (const key of SHARED_PROJECT_COMPONENT_SOURCE_SNAPSHOT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(sourceSnapshot, key)) shared[key] = sourceSnapshot[key];
  }
  if (includeVariantFields) {
    for (const key of PROJECT_COMPONENT_VARIANT_SOURCE_SNAPSHOT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(sourceSnapshot, key)) shared[key] = sourceSnapshot[key];
    }
  }
  return Object.keys(shared).length > 0 ? shared : undefined;
}

function pickSharedProjectComponentPatch(rowPatch: Record<string, unknown>) {
  const shared: Record<string, unknown> = {};
  for (const key of SHARED_PROJECT_COMPONENT_ROW_PATCH_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(rowPatch, key)) continue;
    if (key === "sourceSnapshot") {
      const sourceSnapshot = pickSharedProjectComponentSourceSnapshot(rowPatch.sourceSnapshot);
      if (sourceSnapshot !== undefined) shared.sourceSnapshot = sourceSnapshot;
      continue;
    }
    shared[key] = rowPatch[key];
  }
  return shared;
}

type ProjectComponentPriceOptionSnapshot = Record<string, unknown> & { id: string };

const PROJECT_COMPONENT_VARIANT_OPTION_SIGNATURE_KEYS = [
  "label",
  "sku",
  "variantDescription",
  "unit",
  "unitCost",
  "pricingSource",
  "pricingDate",
  "sourceUrl",
  "imageBucket",
  "imagePath",
  "thumbnailPath",
  "imageMetadata",
  "attachments",
] as const;

function readNonEmptyText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readProjectComponentPriceOptions(sourceSnapshot: unknown) {
  const priceOptions = readJsonRecord(sourceSnapshot).priceOptions;
  if (!Array.isArray(priceOptions)) return [] as ProjectComponentPriceOptionSnapshot[];
  return priceOptions.flatMap((candidate): ProjectComponentPriceOptionSnapshot[] => {
    const option = readJsonRecord(candidate);
    const id = readNonEmptyText(option.id);
    return id ? [{ ...option, id }] : [];
  });
}

function projectComponentPriceOptionMap(sourceSnapshot: unknown) {
  return new Map(readProjectComponentPriceOptions(sourceSnapshot).map((option) => [option.id, option]));
}

function isSelectableProjectComponentPriceOption(option: ProjectComponentPriceOptionSnapshot | undefined) {
  return Boolean(option && option.isActive !== false);
}

function projectComponentVariantOptionSignature(option: ProjectComponentPriceOptionSnapshot | undefined) {
  if (!option) return "";
  return JSON.stringify(PROJECT_COMPONENT_VARIANT_OPTION_SIGNATURE_KEYS.map((key) => option[key] ?? null));
}

function projectComponentVariantImageSignature(option: ProjectComponentPriceOptionSnapshot | undefined) {
  if (!option) return "";
  return JSON.stringify([
    option.imageBucket ?? null,
    option.imagePath ?? null,
    option.thumbnailPath ?? null,
    option.imageMetadata ?? null,
  ]);
}

function readProjectComponentSelectedPriceOptionId(row: EstimateRowItemRow) {
  const sourceSnapshot = readJsonRecord(rowSourceSnapshot(row));
  const metadata = readJsonRecord(rowMetadata(row));
  return readNonEmptyText(sourceSnapshot.priceOptionId) ?? readNonEmptyText(metadata.priceOptionId);
}

function readRemovedPriceOptionReplacements(value: unknown) {
  const replacements = new Map<string, string>();
  for (const [removedId, replacementValue] of Object.entries(readJsonRecord(value))) {
    const normalizedRemovedId = readNonEmptyText(removedId);
    const replacementId = readNonEmptyText(replacementValue);
    if (normalizedRemovedId && replacementId) replacements.set(normalizedRemovedId, replacementId);
  }
  return replacements;
}

function projectComponentVariantSourceSnapshotPatch(
  option: ProjectComponentPriceOptionSnapshot,
  options: { clearImageAsset: boolean },
) {
  const imageUrl = readNonEmptyText(option.thumbnailPath) ?? readNonEmptyText(option.imagePath);
  return {
    description: readNonEmptyText(option.variantDescription),
    imageUrl,
    priceOptionLabel: readNonEmptyText(option.label),
    pricingDate: readNonEmptyText(option.pricingDate),
    pricingSource: readNonEmptyText(option.pricingSource),
    sku: readNonEmptyText(option.sku),
    sourceUrl: readNonEmptyText(option.sourceUrl),
    unit: readNonEmptyText(option.unit) ?? "unit",
    unit_cost: Math.max(0, readNumber(option.unitCost)),
    ...(options.clearImageAsset ? { imageAsset: null } : {}),
  };
}

function normalizeProjectComponentSourceRowPatch(
  row: EstimateRowItemRow,
  rowPatch: Record<string, unknown>,
  replacements: Map<string, string>,
) {
  const hasPriceOptionLabelPatch = Object.prototype.hasOwnProperty.call(rowPatch, "priceOptionLabel");
  const nextPriceOptionLabel = hasPriceOptionLabelPatch ? readNonEmptyText(rowPatch.priceOptionLabel) : null;
  if (hasPriceOptionLabelPatch && !nextPriceOptionLabel) {
    throw new Error("Variant name is required.");
  }
  const persistedRowPatch = { ...rowPatch };
  delete persistedRowPatch.priceOptionLabel;
  if (!Object.prototype.hasOwnProperty.call(persistedRowPatch, "sourceSnapshot") || persistedRowPatch.sourceSnapshot === null) {
    return persistedRowPatch;
  }
  const currentSourceSnapshot = readJsonRecord(rowSourceSnapshot(row));
  const incomingSourceSnapshot = {
    ...currentSourceSnapshot,
    ...readJsonRecord(persistedRowPatch.sourceSnapshot),
  };
  const incomingOptions = readProjectComponentPriceOptions(incomingSourceSnapshot);
  if (incomingOptions.length === 0) return persistedRowPatch;
  const currentSelectedId = readProjectComponentSelectedPriceOptionId(row);
  const incomingOptionById = new Map(incomingOptions.map((option) => [option.id, option]));
  let selectedId = readNonEmptyText(incomingSourceSnapshot.priceOptionId) ?? currentSelectedId;
  if (currentSelectedId && !isSelectableProjectComponentPriceOption(incomingOptionById.get(currentSelectedId))) {
    const replacementId = replacements.get(currentSelectedId);
    if (!replacementId || !isSelectableProjectComponentPriceOption(incomingOptionById.get(replacementId))) {
      throw new Error("Choose an active replacement for every used project component variant before saving.");
    }
    selectedId = replacementId;
  }
  const selectedOption = selectedId ? incomingOptionById.get(selectedId) : undefined;
  if (!isSelectableProjectComponentPriceOption(selectedOption)) {
    throw new Error("The selected project component variant is no longer available.");
  }

  const selectedIndex = incomingOptions.findIndex((option) => option.id === selectedId);
  const nextSelectedOption: ProjectComponentPriceOptionSnapshot = {
    ...selectedOption!,
    ...(nextPriceOptionLabel ? { label: nextPriceOptionLabel } : {}),
    ...(Object.prototype.hasOwnProperty.call(persistedRowPatch, "description")
      ? { variantDescription: persistedRowPatch.description }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(persistedRowPatch, "unit") ? { unit: persistedRowPatch.unit } : {}),
    ...(Object.prototype.hasOwnProperty.call(persistedRowPatch, "unitCost") ? { unitCost: persistedRowPatch.unitCost } : {}),
  };
  const nextOptions = [...incomingOptions];
  nextOptions[selectedIndex] = nextSelectedOption;
  const previousSelectedOption = currentSelectedId
    ? projectComponentPriceOptionMap(currentSourceSnapshot).get(currentSelectedId)
    : undefined;
  const selectionChanged = selectedId !== currentSelectedId;
  const imageChanged = selectionChanged
    || projectComponentVariantImageSignature(previousSelectedOption) !== projectComponentVariantImageSignature(nextSelectedOption);
  const variantSnapshotPatch = projectComponentVariantSourceSnapshotPatch(nextSelectedOption, { clearImageAsset: imageChanged });
  return {
    ...persistedRowPatch,
    description: variantSnapshotPatch.description ?? "",
    unit: variantSnapshotPatch.unit,
    unitCost: variantSnapshotPatch.unit_cost,
    sourceSnapshot: {
      ...incomingSourceSnapshot,
      ...variantSnapshotPatch,
      priceOptionId: selectedId,
      priceOptions: nextOptions,
    },
  };
}

function normalizeProjectComponentVariantSelectionRowPatch(
  row: EstimateRowItemRow,
  rowPatch: Record<string, unknown>,
) {
  const currentSourceSnapshot = readJsonRecord(rowSourceSnapshot(row));
  const selectedId = readNonEmptyText(readJsonRecord(rowPatch.sourceSnapshot).priceOptionId);
  if (!selectedId) throw new Error("Choose a project component variant before saving.");

  const optionById = projectComponentPriceOptionMap(currentSourceSnapshot);
  const selectedOption = optionById.get(selectedId);
  if (!isSelectableProjectComponentPriceOption(selectedOption)) {
    throw new Error("The selected project component variant is no longer available.");
  }

  const previousSelectedId = readProjectComponentSelectedPriceOptionId(row);
  const previousSelectedOption = previousSelectedId ? optionById.get(previousSelectedId) : undefined;
  const imageChanged = previousSelectedId !== selectedId
    || projectComponentVariantImageSignature(previousSelectedOption) !== projectComponentVariantImageSignature(selectedOption);
  const variantSnapshotPatch = projectComponentVariantSourceSnapshotPatch(selectedOption!, { clearImageAsset: imageChanged });
  return {
    description: variantSnapshotPatch.description ?? "",
    unit: variantSnapshotPatch.unit,
    unitCost: variantSnapshotPatch.unit_cost,
    sourceSnapshot: {
      ...currentSourceSnapshot,
      ...variantSnapshotPatch,
      priceOptionId: selectedId,
    },
    metadata: {
      ...readJsonRecord(rowMetadata(row)),
      priceOptionId: selectedId,
    },
  };
}

function mergeSharedSourceSnapshotIntoRow(
  row: EstimateRowItemRow,
  sourceSnapshot: unknown,
  selectedPriceOptionId: string | null,
  variantOption?: ProjectComponentPriceOptionSnapshot,
  clearImageAsset = false,
  includeLegacyVariantFields = false,
) {
  if (sourceSnapshot === null) return null;
  const sharedSourceSnapshot = pickSharedProjectComponentSourceSnapshot(sourceSnapshot, includeLegacyVariantFields);
  if (sharedSourceSnapshot === undefined) return undefined;
  const currentSourceSnapshot = readJsonRecord(rowSourceSnapshot(row));
  return {
    ...currentSourceSnapshot,
    ...sharedSourceSnapshot,
    ...(variantOption
      ? projectComponentVariantSourceSnapshotPatch(variantOption, { clearImageAsset })
      : {}),
    priceOptionId: selectedPriceOptionId,
  };
}

function mergeSourceSnapshotPatchIntoRow(row: EstimateRowItemRow, rowPatch: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(rowPatch, "sourceSnapshot")) return rowPatch;
  if (rowPatch.sourceSnapshot === null) return { ...rowPatch, sourceSnapshot: {} };
  return {
    ...rowPatch,
    sourceSnapshot: {
      ...readJsonRecord(rowSourceSnapshot(row)),
      ...readJsonRecord(rowPatch.sourceSnapshot),
    },
  };
}

type LibrarySourceCommitReceipt = {
  sourceLibraryItemId: string;
  workspaceId: string;
  itemVersion: number;
  itemUpdatedAt: string | null;
  lifecycleState: string | null;
  itemUnit: string;
  itemUnitCost: number;
  itemMiscCost: number;
  itemActivePriceOptionId: string | null;
  selectedOptionId: string | null;
  optionLabel: string | null;
  optionUnit: string | null;
  optionUnitCost: number | null;
  optionMiscCost: number | null;
  optionUpdatedAt: string | null;
  activeCostEntryId: string | null;
  activeCostEntryUnitCost: number | null;
  activeCostEntryMiscCost: number | null;
  activeCostEntryUpdatedAt: string | null;
  resolvedUnit: string;
  resolvedUnitCost: number;
  resolvedMiscCost: number;
  fingerprint: string;
};

function readLibrarySourceCommitReceipt(value: unknown): LibrarySourceCommitReceipt | null {
  if (value === null || value === undefined) return null;
  const record = readRequiredJsonRecord(value, "Library source commit receipt");
  const fingerprint = typeof record.fingerprint === "string" ? record.fingerprint : "";
  const { fingerprint: ignoredFingerprint, ...receipt } = record;
  void ignoredFingerprint;
  if (!fingerprint || createMutationRequestFingerprint(receipt) !== fingerprint) {
    throw new Error("Library source commit receipt is invalid.");
  }
  return { ...receipt, fingerprint } as LibrarySourceCommitReceipt;
}

function buildLibrarySourceCommitGuardStatements(receipt: LibrarySourceCommitReceipt) {
  const guards: Array<{ sql: string; values?: unknown[] }> = [{
    sql: `
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM cost_library_items
        WHERE id = ?
          AND workspace_id = ?
          AND current_version_number = ?
          AND updated_at IS ?
          AND lifecycle_state IS ?
          AND lifecycle_state <> 'archived'
          AND unit = ?
          AND unit_cost = ?
          AND misc_cost = ?
          AND active_price_option_id IS ?
      ) THEN 1 ELSE json('') END AS estimate_library_source_guard
    `,
    values: [
      receipt.sourceLibraryItemId,
      receipt.workspaceId,
      receipt.itemVersion,
      receipt.itemUpdatedAt,
      receipt.lifecycleState,
      receipt.itemUnit,
      receipt.itemUnitCost,
      receipt.itemMiscCost,
      receipt.itemActivePriceOptionId,
    ],
  }];
  if (!receipt.selectedOptionId) return guards;
  guards.push({
    sql: `
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM cost_library_item_price_options
        WHERE id = ?
          AND item_id = ?
          AND workspace_id = ?
          AND is_active = 1
          AND label IS ?
          AND unit IS ?
          AND unit_cost IS ?
          AND misc_cost IS ?
          AND updated_at IS ?
      ) THEN 1 ELSE json('') END AS estimate_library_option_guard
    `,
    values: [
      receipt.selectedOptionId,
      receipt.sourceLibraryItemId,
      receipt.workspaceId,
      receipt.optionLabel,
      receipt.optionUnit,
      receipt.optionUnitCost,
      receipt.optionMiscCost,
      receipt.optionUpdatedAt,
    ],
  });
  if (receipt.activeCostEntryId) {
    guards.push({
      sql: `
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM cost_library_item_variant_cost_entries
          WHERE id = ?
            AND workspace_id = ?
            AND item_id = ?
            AND price_option_id = ?
            AND is_current = 1
            AND deleted_at IS NULL
            AND unit_cost IS ?
            AND misc_cost IS ?
            AND updated_at IS ?
        ) THEN 1 ELSE json('') END AS estimate_library_cost_guard
      `,
      values: [
        receipt.activeCostEntryId,
        receipt.workspaceId,
        receipt.sourceLibraryItemId,
        receipt.selectedOptionId,
        receipt.activeCostEntryUnitCost,
        receipt.activeCostEntryMiscCost,
        receipt.activeCostEntryUpdatedAt,
      ],
    });
  } else {
    guards.push({
      sql: `
        SELECT CASE WHEN NOT EXISTS (
          SELECT 1
          FROM cost_library_item_variant_cost_entries
          WHERE workspace_id = ?
            AND item_id = ?
            AND price_option_id = ?
            AND is_current = 1
            AND deleted_at IS NULL
        ) THEN 1 ELSE json('') END AS estimate_library_cost_absence_guard
      `,
      values: [receipt.workspaceId, receipt.sourceLibraryItemId, receipt.selectedOptionId],
    });
  }
  return guards;
}

function buildProjectComponentImpactGuardStatement(input: {
  projectId: string;
  sourceRowId: string;
  componentId: string | null;
  expectedFingerprint: string;
}) {
  return {
    sql: `
      SELECT CASE WHEN COALESCE((
        SELECT GROUP_CONCAT(component_revision, '|')
        FROM (
          SELECT row_item.id || ':' || CAST(row_item.row_revision AS TEXT) AS component_revision
          FROM estimate_row_items row_item
          INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
          WHERE estimate.project_id = ?
            AND (row_item.id = ? OR ${PROJECT_COMPONENT_IDENTITY_SQL} = ?)
          ORDER BY row_item.id
        )
      ), '') = ? THEN 1 ELSE json('') END AS component_impact_guard
    `,
    values: [input.projectId, input.sourceRowId, input.componentId, input.expectedFingerprint],
  };
}

async function readProjectComponentImpactRevisionRows(database: D1DatabaseLike, input: {
  projectId: string;
  sourceRowId: string;
  componentId: string | null;
}) {
  return all<{ row_id: string; row_revision: number | string }>(
    database,
    `
      SELECT row_item.id AS row_id, row_item.row_revision
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      WHERE estimate.project_id = ?
        AND (row_item.id = ? OR ${PROJECT_COMPONENT_IDENTITY_SQL} = ?)
      ORDER BY row_item.id
    `,
    [input.projectId, input.sourceRowId, input.componentId],
  );
}

async function propagateProjectComponentRowPatch(database: D1DatabaseLike, input: {
  projectId: string;
  sourceRow: EstimateRowItemRow;
  rowPatch: Record<string, unknown>;
  componentId: string | null;
  expectedImpactFingerprint?: string;
  removedPriceOptionReplacements: Map<string, string>;
}) {
  const sharedPatch = pickSharedProjectComponentPatch(input.rowPatch);
  const sourceSnapshotPatch = readJsonRecord(input.rowPatch.sourceSnapshot);
  const hasVariantPatch = ["description", "unit", "unitCost"].some((key) => Object.prototype.hasOwnProperty.call(input.rowPatch, key))
    || [...PROJECT_COMPONENT_VARIANT_SOURCE_SNAPSHOT_KEYS].some((key) => Object.prototype.hasOwnProperty.call(sourceSnapshotPatch, key));
  if (Object.keys(sharedPatch).length === 0 && !hasVariantPatch) return {
    rowIds: [] as string[], totalDeltaMinorUnits: 0, facts: [] as Array<Record<string, unknown>>, truncatedCount: 0,
    mutationStatements: [] as Array<{ sql: string; values?: unknown[] }>,
    impactFingerprint: null as string | null,
  };

  if (!input.componentId) return {
    rowIds: [] as string[], totalDeltaMinorUnits: 0, facts: [] as Array<Record<string, unknown>>, truncatedCount: 0,
    mutationStatements: [] as Array<{ sql: string; values?: unknown[] }>,
    impactFingerprint: null as string | null,
  };

  const siblingRows = await all<EstimateRowItemRow>(
    database,
    `
      SELECT row_item.*, row_item.source_snapshot_json, row_item.metadata_json
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      WHERE estimate.project_id = ?
        AND row_item.id <> ?
        AND ${PROJECT_COMPONENT_IDENTITY_SQL} = ?
    `,
    [input.projectId, input.sourceRow.id, input.componentId],
  );
  const impactFingerprint = buildComponentImpactFingerprint([
    { row_id: input.sourceRow.id, row_revision: readNumber(input.sourceRow.row_revision, 1) },
    ...siblingRows.map((row) => ({ row_id: row.id, row_revision: readNumber(row.row_revision, 1) })),
  ]);
  if (input.expectedImpactFingerprint !== undefined && impactFingerprint !== input.expectedImpactFingerprint) {
    throw new Error(COMPONENT_IMPACT_CONFLICT_MESSAGE);
  }
  const propagatedAt = nowIso();
  const statements: Array<{ sql: string; values?: unknown[] }> = [];
  const facts: Array<Record<string, unknown>> = [];
  let totalDeltaMinorUnits = 0;
  const sourceCurrentSnapshot = readJsonRecord(rowSourceSnapshot(input.sourceRow));
  const incomingSourceSnapshot = readJsonRecord(input.rowPatch.sourceSnapshot);
  const currentOptionById = projectComponentPriceOptionMap(sourceCurrentSnapshot);
  const incomingOptionById = projectComponentPriceOptionMap(incomingSourceSnapshot);
  const hasIncomingVariantGraph = Array.isArray(incomingSourceSnapshot.priceOptions);
  const sourceSelectedPriceOptionId = readProjectComponentSelectedPriceOptionId(input.sourceRow);
  const changedOptionIds = new Set<string>();
  const imageChangedOptionIds = new Set<string>();
  if (hasIncomingVariantGraph) {
    for (const [optionId, nextOption] of incomingOptionById) {
      const previousOption = currentOptionById.get(optionId);
      if (projectComponentVariantOptionSignature(previousOption) !== projectComponentVariantOptionSignature(nextOption)) {
        changedOptionIds.add(optionId);
      }
      if (projectComponentVariantImageSignature(previousOption) !== projectComponentVariantImageSignature(nextOption)) {
        imageChangedOptionIds.add(optionId);
      }
    }
  }

  for (const row of [input.sourceRow, ...siblingRows]) {
    const selectedPriceOptionId = readProjectComponentSelectedPriceOptionId(row);
    if (!selectedPriceOptionId || !hasIncomingVariantGraph) continue;
    if (isSelectableProjectComponentPriceOption(incomingOptionById.get(selectedPriceOptionId))) continue;
    const replacementId = input.removedPriceOptionReplacements.get(selectedPriceOptionId);
    if (!replacementId || !isSelectableProjectComponentPriceOption(incomingOptionById.get(replacementId))) {
      throw new Error("Choose an active replacement for every used project component variant before saving.");
    }
  }

  for (const row of siblingRows) {
    const nextRevision = readNumber(row.row_revision, 1) + 1;
    const rowSelectedPriceOptionId = readProjectComponentSelectedPriceOptionId(row);
    const replacementPriceOptionId = rowSelectedPriceOptionId && hasIncomingVariantGraph
      && !isSelectableProjectComponentPriceOption(incomingOptionById.get(rowSelectedPriceOptionId))
      ? input.removedPriceOptionReplacements.get(rowSelectedPriceOptionId) ?? null
      : null;
    const nextSelectedPriceOptionId = replacementPriceOptionId ?? rowSelectedPriceOptionId;
    const nextSelectedOption = nextSelectedPriceOptionId
      ? incomingOptionById.get(nextSelectedPriceOptionId)
      : undefined;
    const selectionChanged = nextSelectedPriceOptionId !== rowSelectedPriceOptionId;
    const includeLegacyVariantFields = !hasIncomingVariantGraph
      && (!sourceSelectedPriceOptionId || sourceSelectedPriceOptionId === rowSelectedPriceOptionId);
    const includeVariantFields = Boolean(
      includeLegacyVariantFields
      || (
        hasIncomingVariantGraph
        && nextSelectedOption
        && (selectionChanged || changedOptionIds.has(nextSelectedOption.id))
      ),
    );
    const siblingPatch: Record<string, unknown> = { ...sharedPatch };
    if (includeVariantFields && nextSelectedOption) {
      const variantSnapshotPatch = projectComponentVariantSourceSnapshotPatch(nextSelectedOption, {
        clearImageAsset: selectionChanged || imageChangedOptionIds.has(nextSelectedOption.id),
      });
      siblingPatch.description = variantSnapshotPatch.description ?? "";
      siblingPatch.unit = variantSnapshotPatch.unit;
      siblingPatch.unitCost = variantSnapshotPatch.unit_cost;
    } else if (includeLegacyVariantFields) {
      for (const key of ["description", "unit", "unitCost"]) {
        if (Object.prototype.hasOwnProperty.call(input.rowPatch, key)) siblingPatch[key] = input.rowPatch[key];
      }
    }
    const columns = updateValuesForRowPatch(siblingPatch);
    if (Object.prototype.hasOwnProperty.call(input.rowPatch, "sourceSnapshot")) {
      const mergedSourceSnapshot = mergeSharedSourceSnapshotIntoRow(
        row,
        input.rowPatch.sourceSnapshot,
        nextSelectedPriceOptionId,
        includeVariantFields ? nextSelectedOption : undefined,
        Boolean(
          includeVariantFields
          && nextSelectedOption
          && (selectionChanged || imageChangedOptionIds.has(nextSelectedOption.id)),
        ),
        includeLegacyVariantFields,
      );
      if (mergedSourceSnapshot !== undefined) {
        const sourceSnapshotIndex = columns.findIndex(([column]) => column === "source_snapshot_json");
        const sourceSnapshotColumn: [string, unknown] = ["source_snapshot_json", jsonString(mergedSourceSnapshot, null)];
        if (sourceSnapshotIndex >= 0) columns[sourceSnapshotIndex] = sourceSnapshotColumn;
        else columns.push(sourceSnapshotColumn);
      }
    }
    if (columns.length === 0) continue;

    if (facts.length < MAX_PROPAGATED_ACTIVITY_FACTS) {
      facts.push({
        rowId: row.id,
        before: {
          material: row.material,
          unitCost: readNumber(row.unit_cost),
          sourceSnapshot: rowSourceSnapshot(row),
        },
        after: {
          material: Object.prototype.hasOwnProperty.call(siblingPatch, "material") ? siblingPatch.material : row.material,
          unitCost: Object.prototype.hasOwnProperty.call(siblingPatch, "unitCost") ? siblingPatch.unitCost : readNumber(row.unit_cost),
          sourceSnapshot: Object.prototype.hasOwnProperty.call(input.rowPatch, "sourceSnapshot")
            ? mergeSharedSourceSnapshotIntoRow(
                row,
                input.rowPatch.sourceSnapshot,
                nextSelectedPriceOptionId,
                includeVariantFields ? nextSelectedOption : undefined,
                Boolean(
                  includeVariantFields
                  && nextSelectedOption
                  && (selectionChanged || imageChangedOptionIds.has(nextSelectedOption.id)),
                ),
                includeLegacyVariantFields,
              )
            : rowSourceSnapshot(row),
        },
      });
    }

    if (Object.prototype.hasOwnProperty.call(siblingPatch, "unitCost")) {
      totalDeltaMinorUnits += estimateRowTotalMinorUnits({ ...row, unit_cost: siblingPatch.unitCost as EstimateRowItemRow["unit_cost"] }) - estimateRowTotalMinorUnits(row);
    }

    const assignments = columns.map(([column]) => `${column} = ?`);
    const values = columns.map(([, value]) => value);
    assignments.push("row_revision = ?", "updated_at = ?");
    values.push(nextRevision, propagatedAt, row.id, row.estimate_id, readNumber(row.row_revision, 1));
    statements.push({
      sql: `UPDATE estimate_row_items SET ${assignments.join(", ")} WHERE id = ? AND estimate_id = ? AND row_revision = ?`,
      values,
    });
  }

  return {
    rowIds: siblingRows.map((row) => row.id),
    totalDeltaMinorUnits,
    facts,
    truncatedCount: Math.max(0, siblingRows.length - facts.length),
    mutationStatements: statements,
    impactFingerprint,
  };
}

const PROJECT_COMPONENT_ATTACHMENT_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

type ProjectComponentAttachmentBindingRow = {
  id: string;
  price_option_id: string;
  upload_asset_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number | string;
  attachment_kind: "pdf" | "excel" | null;
  metadata_json: string | null;
  created_by: string | null;
  review_status: "uploaded" | "approved" | "rejected" | "superseded";
  is_current_approved: number | boolean;
  review_revision: number | string;
  created_at: string;
};

type ProjectComponentAttachmentAssetRow = {
  id: string;
  workspace_id: string;
  actor_user_id: string | null;
  project_id: string | null;
  surface: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  status: string;
  file_name: string;
  content_type: string;
  size_bytes: number | string;
  scan_status: string | null;
  scan_override_expires_at: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  metadata_json: string | null;
};

type ProjectComponentAttachmentDraft = {
  id: string;
  assetId: string;
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind: "pdf" | "excel";
  metadata: Record<string, unknown>;
};

function projectComponentAttachmentKind(contentType: string): "pdf" | "excel" {
  return contentType === "application/pdf" ? "pdf" : "excel";
}

function projectComponentAttachmentScanAllowed(asset: ProjectComponentAttachmentAssetRow, timestamp: string) {
  return asset.scan_status === "pending"
    || asset.scan_status === "clean"
    || (
      asset.scan_status === "override_approved"
      && typeof asset.scan_override_expires_at === "string"
      && Date.parse(asset.scan_override_expires_at) > Date.parse(timestamp)
    );
}

function projectComponentAttachmentGraphIsPresent(sourceSnapshot: unknown) {
  return readProjectComponentPriceOptions(sourceSnapshot).some((option) => (
    Object.prototype.hasOwnProperty.call(option, "attachments")
  ));
}

function validateProjectComponentAttachmentDraft(
  value: unknown,
  seenAttachmentIds: Set<string>,
  seenAssetIds: Set<string>,
  seenPaths: Set<string>,
): ProjectComponentAttachmentDraft {
  const attachment = readJsonRecord(value);
  const id = readNonEmptyText(attachment.id) ?? "";
  const assetId = readNonEmptyText(attachment.assetId) ?? "";
  const bucket = readNonEmptyText(attachment.bucket) ?? "";
  const path = readNonEmptyText(attachment.path) ?? "";
  const fileName = readNonEmptyText(attachment.fileName) ?? "";
  const contentType = readNonEmptyText(attachment.contentType) ?? "";
  const sizeBytes = readNumber(attachment.sizeBytes, Number.NaN);
  if (!isUuid(id)) throw new Error("Refresh this project component attachment before saving.");
  if (assetId && !isUuid(assetId)) throw new Error("A finalized upload asset is required for every project component attachment.");
  if (bucket !== "component-attachments") throw new Error("Project component attachments must use the component attachment bucket.");
  if (!path || path.includes("..") || path.includes("//")) throw new Error("Project component attachment path is invalid.");
  if (!fileName) throw new Error("Project component attachment file name is required.");
  if (!PROJECT_COMPONENT_ATTACHMENT_CONTENT_TYPES.has(contentType)) throw new Error("Project component attachments must be PDF or Excel files.");
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) throw new Error("Project component attachment size must be positive.");
  if (seenAttachmentIds.has(id) || (assetId && seenAssetIds.has(assetId)) || seenPaths.has(path)) {
    throw new Error("Project component attachments cannot be reused across variants.");
  }
  seenAttachmentIds.add(id);
  if (assetId) seenAssetIds.add(assetId);
  seenPaths.add(path);
  return {
    id,
    assetId,
    bucket,
    path,
    fileName,
    contentType,
    sizeBytes,
    kind: projectComponentAttachmentKind(contentType),
    metadata: readJsonRecord(attachment.metadata),
  };
}

async function planProjectComponentAttachmentReconciliation(database: D1DatabaseLike, input: {
  projectId: string;
  estimateId: string;
  sourceRow: EstimateRowItemRow;
  componentId: string | null;
  rowPatch: Record<string, unknown>;
  actorUserId: string;
}) {
  const currentSourceSnapshot = rowSourceSnapshot(input.sourceRow);
  const incomingSourceSnapshot = readJsonRecord(input.rowPatch.sourceSnapshot);
  const hasIncomingGraph = Array.isArray(incomingSourceSnapshot.priceOptions);
  const active = Boolean(
    input.componentId
    && hasIncomingGraph
    && (
      projectComponentAttachmentGraphIsPresent(currentSourceSnapshot)
      || projectComponentAttachmentGraphIsPresent(incomingSourceSnapshot)
    )
  );
  const emptyPlan = {
    active: false,
    changed: false,
    canonicalRowPatch: input.rowPatch,
    preSourceGuards: [] as Array<{ sql: string; values?: unknown[] }>,
    postSourceGuards: [] as Array<{ sql: string; values?: unknown[] }>,
    mutationStatements: [] as Array<{ sql: string; values?: unknown[] }>,
    createdAttachmentIds: [] as string[],
    supersededAttachmentIds: [] as string[],
  };
  if (!active || !input.componentId) return emptyPlan;

  const project = await first<ProjectContextRow>(
    database,
    "SELECT id, workspace_id FROM projects WHERE id = ? LIMIT 1",
    [input.projectId],
  );
  if (!project) throw new Error("Project component attachment scope could not be resolved.");

  const incomingOptions = readProjectComponentPriceOptions(incomingSourceSnapshot);
  const rawOptions = incomingSourceSnapshot.priceOptions as unknown[];
  if (incomingOptions.length === 0 || incomingOptions.length !== rawOptions.length || incomingOptions.length > 50) {
    throw new Error("Project component variants are invalid.");
  }
  const optionIds = new Set<string>();
  let defaultOptionCount = 0;
  for (const option of incomingOptions) {
    if (optionIds.has(option.id)) throw new Error("Project component variant identities must be unique.");
    optionIds.add(option.id);
    if (option.isDefault === true && option.isActive !== false) defaultOptionCount += 1;
  }
  if (defaultOptionCount !== 1) throw new Error("Exactly one active default project component variant is required.");

  const existingBindings = await all<ProjectComponentAttachmentBindingRow>(
    database,
    `
      SELECT id, price_option_id, upload_asset_id, storage_bucket, storage_path,
        file_name, content_type, size_bytes, attachment_kind, metadata_json,
        created_by, review_status, is_current_approved, review_revision, created_at
      FROM component_variant_attachments
      WHERE owner_scope = 'project'
        AND workspace_id = ?
        AND project_id = ?
        AND project_component_id = ?
    `,
    [project.workspace_id, input.projectId, input.componentId],
  );
  const bindingById = new Map(existingBindings.map((binding) => [binding.id, binding]));
  const seenAttachmentIds = new Set<string>();
  const seenAssetIds = new Set<string>();
  const seenPaths = new Set<string>();
  const draftsByOptionId = new Map<string, ProjectComponentAttachmentDraft[]>();
  for (const option of incomingOptions) {
    if (option.attachments !== undefined && !Array.isArray(option.attachments)) {
      throw new Error("Project component variant attachments are invalid.");
    }
    const drafts = (Array.isArray(option.attachments) ? option.attachments : []).map((attachment) => (
      validateProjectComponentAttachmentDraft(attachment, seenAttachmentIds, seenAssetIds, seenPaths)
    ));
    draftsByOptionId.set(option.id, drafts);
  }

  const assetIds = new Set<string>();
  for (const drafts of draftsByOptionId.values()) {
    for (const draft of drafts) {
      const binding = bindingById.get(draft.id);
      const assetId = binding?.upload_asset_id ?? draft.assetId;
      if (assetId) assetIds.add(assetId);
    }
  }
  const assets = assetIds.size > 0
    ? await all<ProjectComponentAttachmentAssetRow>(
        database,
        `
          SELECT id, workspace_id, actor_user_id, project_id, surface,
            target_entity_type, target_entity_id, status, file_name, content_type,
            size_bytes, scan_status, scan_override_expires_at, storage_bucket,
            storage_path, metadata_json
          FROM upload_assets
          WHERE id IN (${placeholders([...assetIds])})
        `,
        [...assetIds],
      )
    : [];
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const timestamp = nowIso();
  const retainedAttachmentIds = new Set<string>();
  const createdAttachmentIds: string[] = [];
  const preSourceGuards: Array<{ sql: string; values?: unknown[] }> = [{
    sql: `
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM estimate_row_items
        WHERE id = ?
          AND estimate_id = ?
          AND row_revision = ?
      ) THEN 1 ELSE json('') END AS project_attachment_source_revision_guard
    `,
    values: [input.sourceRow.id, input.estimateId, readNumber(input.sourceRow.row_revision, 1)],
  }];
  const postSourceGuards: Array<{ sql: string; values?: unknown[] }> = [];
  const mutationStatements: Array<{ sql: string; values?: unknown[] }> = [];

  const canonicalOptions = incomingOptions.map((option) => {
    const canonicalAttachments = (draftsByOptionId.get(option.id) ?? []).map((draft) => {
      const binding = bindingById.get(draft.id);
      if (binding && binding.review_status === "superseded") {
        throw new Error("A superseded project component attachment cannot be restored by reusing its identity.");
      }
      const assetId = binding?.upload_asset_id ?? draft.assetId;
      const asset = assetById.get(assetId);
      const assetProjectId = asset
        ? (asset.project_id ?? readNonEmptyText(readJsonRecord(asset.metadata_json).projectId))
        : null;
      if (
        !asset
        || asset.workspace_id !== project.workspace_id
        || asset.surface !== "component-attachment"
        || asset.status !== "finalized"
        || asset.target_entity_type !== "project-component"
        || asset.target_entity_id !== input.componentId
        || assetProjectId !== input.projectId
        || asset.storage_bucket !== draft.bucket
        || asset.storage_path !== draft.path
        || asset.file_name !== draft.fileName
        || asset.content_type !== draft.contentType
        || readNumber(asset.size_bytes) !== draft.sizeBytes
        || !projectComponentAttachmentScanAllowed(asset, timestamp)
      ) {
        throw new Error("Project component attachment ownership could not be verified.");
      }
      if (!binding && asset.actor_user_id !== input.actorUserId) {
        throw new Error("Project component attachment must be finalized by the current editor.");
      }
      if (
        binding
        && (
          binding.price_option_id !== option.id
          || binding.storage_bucket !== draft.bucket
          || binding.storage_path !== draft.path
          || binding.file_name !== draft.fileName
          || binding.content_type !== draft.contentType
          || readNumber(binding.size_bytes) !== draft.sizeBytes
          || binding.attachment_kind !== draft.kind
          || (draft.assetId && draft.assetId !== binding.upload_asset_id)
        )
      ) {
        throw new Error("Project component attachment identity does not match its saved variant.");
      }

      retainedAttachmentIds.add(draft.id);
      postSourceGuards.push({
        sql: `
          SELECT CASE WHEN EXISTS (
            SELECT 1
            FROM estimate_row_items row_item,
              json_each(json_extract(row_item.source_snapshot_json, '$.priceOptions')) price_option,
              json_each(json_extract(price_option.value, '$.attachments')) attachment
            WHERE row_item.id = ?
              AND row_item.estimate_id = ?
              AND json_extract(price_option.value, '$.id') = ?
              AND json_extract(attachment.value, '$.id') = ?
          ) THEN 1 ELSE json('') END AS project_attachment_option_membership_guard
        `,
        values: [input.sourceRow.id, input.estimateId, option.id, draft.id],
      });

      if (binding) {
        preSourceGuards.push({
          sql: `
            SELECT CASE WHEN EXISTS (
              SELECT 1
              FROM component_variant_attachments attachment
              INNER JOIN upload_assets asset ON asset.id = attachment.upload_asset_id
              WHERE attachment.id = ?
                AND attachment.owner_scope = 'project'
                AND attachment.workspace_id = ?
                AND attachment.project_id = ?
                AND attachment.project_component_id = ?
                AND attachment.price_option_id = ?
                AND attachment.review_revision = ?
                AND attachment.review_status <> 'superseded'
                AND asset.status = 'finalized'
            ) THEN 1 ELSE json('') END AS existing_project_attachment_guard
          `,
          values: [
            binding.id,
            project.workspace_id,
            input.projectId,
            input.componentId,
            option.id,
            readNumber(binding.review_revision, 1),
          ],
        });
      } else {
        if (!draft.assetId) throw new Error("A finalized upload asset is required for every new project component attachment.");
        createdAttachmentIds.push(draft.id);
        preSourceGuards.push({
          sql: `
            SELECT CASE WHEN EXISTS (
              SELECT 1
              FROM upload_assets
              WHERE id = ?
                AND workspace_id = ?
                AND actor_user_id = ?
                AND surface = 'component-attachment'
                AND target_entity_type = 'project-component'
                AND target_entity_id = ?
                AND COALESCE(project_id, json_extract(metadata_json, '$.projectId')) = ?
                AND status = 'finalized'
                AND storage_bucket = ?
                AND storage_path = ?
                AND file_name = ?
                AND content_type = ?
                AND size_bytes = ?
                AND (
                  scan_status IN ('pending', 'clean')
                  OR (
                    scan_status = 'override_approved'
                    AND datetime(scan_override_expires_at) > datetime(?)
                  )
                )
            ) THEN 1 ELSE json('') END AS new_project_attachment_guard
          `,
          values: [
            draft.assetId,
            project.workspace_id,
            input.actorUserId,
            input.componentId,
            input.projectId,
            draft.bucket,
            draft.path,
            draft.fileName,
            draft.contentType,
            draft.sizeBytes,
            timestamp,
          ],
        });
        mutationStatements.push({
          sql: `
            INSERT INTO component_variant_attachments (
              id, owner_scope, price_option_id, item_id, project_id,
              project_component_id, workspace_id, upload_asset_id, storage_bucket,
              storage_path, file_name, content_type, size_bytes, attachment_kind,
              metadata_json, created_by, review_status, applicable_cost_entry_id,
              is_current_approved, review_revision, created_at, updated_at
            )
            VALUES (?, 'project', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded', NULL, 0, 1, ?, ?)
          `,
          values: [
            draft.id,
            option.id,
            input.projectId,
            input.componentId,
            project.workspace_id,
            draft.assetId,
            draft.bucket,
            draft.path,
            draft.fileName,
            draft.contentType,
            draft.sizeBytes,
            draft.kind,
            jsonString({ ...draft.metadata, assetId: draft.assetId, scanStatus: asset.scan_status }),
            input.actorUserId,
            timestamp,
            timestamp,
          ],
        });
      }

      const bindingMetadata = binding ? readJsonRecord(binding.metadata_json) : draft.metadata;
      return {
        id: draft.id,
        assetId,
        bucket: draft.bucket,
        path: draft.path,
        fileName: draft.fileName,
        contentType: draft.contentType,
        sizeBytes: draft.sizeBytes,
        kind: draft.kind,
        scanStatus: asset.scan_status,
        reviewStatus: binding?.review_status ?? "uploaded",
        isCurrentApproved: binding ? Number(binding.is_current_approved) === 1 : false,
        metadata: { ...bindingMetadata, assetId, scanStatus: asset.scan_status },
        createdAt: binding?.created_at ?? timestamp,
      };
    });
    return { ...option, attachments: canonicalAttachments };
  });

  const staleBindings = existingBindings.filter((binding) => (
    binding.review_status !== "superseded" && !retainedAttachmentIds.has(binding.id)
  ));
  for (const binding of staleBindings) {
    mutationStatements.push({
      sql: `
        UPDATE component_variant_attachments
        SET review_status = 'superseded',
            is_current_approved = 0,
            reviewed_by = ?,
            reviewed_at = ?,
            review_note = 'Removed from project component variant',
            review_revision = review_revision + 1,
            updated_at = ?
        WHERE id = ?
          AND owner_scope = 'project'
          AND workspace_id = ?
          AND project_id = ?
          AND project_component_id = ?
          AND review_revision = ?
          AND review_status <> 'superseded'
      `,
      values: [
        input.actorUserId,
        timestamp,
        timestamp,
        binding.id,
        project.workspace_id,
        input.projectId,
        input.componentId,
        readNumber(binding.review_revision, 1),
      ],
    }, {
      sql: `
        UPDATE upload_assets
        SET status = 'removed',
            updated_at = ?
        WHERE id = ?
          AND NOT EXISTS (
            SELECT 1
            FROM component_variant_attachments
            WHERE upload_asset_id = ?
              AND review_status <> 'superseded'
          )
      `,
      values: [timestamp, binding.upload_asset_id, binding.upload_asset_id],
    });
  }

  return {
    active: true,
    changed: createdAttachmentIds.length > 0 || staleBindings.length > 0,
    canonicalRowPatch: {
      ...input.rowPatch,
      sourceSnapshot: {
        ...incomingSourceSnapshot,
        priceOptions: canonicalOptions,
      },
    },
    preSourceGuards,
    postSourceGuards,
    mutationStatements,
    createdAttachmentIds,
    supersededAttachmentIds: staleBindings.map((binding) => binding.id),
  };
}

function planRowPatchMutation(
  row: EstimateRowItemRow,
  estimateId: string,
  rowPatch: Record<string, unknown>,
  expectedRowRevision: number,
) {
  if (readNumber(row.row_revision, 1) !== expectedRowRevision) throw new Error("Estimate row revision conflict.");
  const mergedRowPatch = mergeSourceSnapshotPatchIntoRow(row, rowPatch);
  const sourceLinkState = normalizeEstimateRowSourceLinkState(
    Object.prototype.hasOwnProperty.call(mergedRowPatch, "sourceLibraryItemId")
      ? mergedRowPatch.sourceLibraryItemId
      : row.source_library_item_id,
    Object.prototype.hasOwnProperty.call(mergedRowPatch, "linkState")
      ? mergedRowPatch.linkState
      : row.link_state,
  );
  const effectiveRowPatch = {
    ...mergedRowPatch,
    ...(Object.prototype.hasOwnProperty.call(mergedRowPatch, "sourceLibraryItemId")
      ? { sourceLibraryItemId: sourceLinkState.sourceLibraryItemId }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(mergedRowPatch, "linkState")
      ? { linkState: sourceLinkState.linkState }
      : {}),
  };
  const columns = updateValuesForRowPatch(effectiveRowPatch);
  if (columns.length === 0) return null;
  const nextRevision = expectedRowRevision + 1;
  const assignments = columns.map(([column]) => `${column} = ?`);
  const values = columns.map(([, value]) => value);
  assignments.push("row_revision = ?", "updated_at = ?");
  values.push(nextRevision, nowIso(), row.id, estimateId, expectedRowRevision);
  return {
    columns,
    effectiveRowPatch,
    statement: {
      sql: `UPDATE estimate_row_items SET ${assignments.join(", ")} WHERE id = ? AND estimate_id = ? AND row_revision = ?`,
      values,
    },
    updated: applyRowPatchForActivity(row, effectiveRowPatch, nextRevision),
  };
}

async function patchRowItem(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  eventType: string,
  rowPatch: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const rowId = String(args.target_row_id ?? "");
  const expectedLibrarySourceReceipt = readLibrarySourceCommitReceipt(args.expected_library_source_receipt);
  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    eventType === "row_replaced" ? "estimate.row.replace" : "estimate.row.update",
    {
      projectId,
      estimateId,
      rowId,
      eventType,
      expectedRowRevision: args.expected_row_revision ?? null,
      rowPatch,
      componentMutationIntent: args.component_mutation_intent ?? null,
      expectedComponentImpactFingerprint: args.expected_component_impact_fingerprint ?? null,
      removedPriceOptionReplacements: args.removed_price_option_replacements ?? null,
      expectedLibrarySourceReceipt,
    },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, estimateId, intent.intentId);
  if (existingEvent) {
    const existingRow = await readRowById(database, estimateId, rowId);
    if (!existingRow) throw new Error("Idempotent estimate row update event exists but the row is missing.");
    return rowItemHistoryResult(existingRow, existingEvent.id);
  }
  const row = await readRowById(database, estimateId, rowId);
  if (!row) throw new Error("Estimate row item not found in the current project.");
  const expected = args.expected_row_revision === null || args.expected_row_revision === undefined ? readNumber(row.row_revision, 1) : readNumber(args.expected_row_revision);
  const removedPriceOptionReplacements = readRemovedPriceOptionReplacements(args.removed_price_option_replacements);
  const componentMutationIntent = typeof args.component_mutation_intent === "string"
    ? args.component_mutation_intent
    : null;
  if (componentMutationIntent && componentMutationIntent !== "variant-selection") {
    throw new Error("Unsupported component mutation intent.");
  }
  const selectingProjectComponentVariant = componentMutationIntent === "variant-selection";
  if (selectingProjectComponentVariant && (eventType !== "row_updated" || row.source_library_item_id)) {
    throw new Error("Variant selection is only available for project component rows.");
  }
  const normalizedRowPatch = selectingProjectComponentVariant
    ? normalizeProjectComponentVariantSelectionRowPatch(row, rowPatch)
    : eventType === "row_updated" && !row.source_library_item_id
      ? normalizeProjectComponentSourceRowPatch(row, rowPatch, removedPriceOptionReplacements)
      : rowPatch;
  const componentId = getProjectComponentIdentity(rowMetadata(row), null, rowSourceSnapshot(row));
  const attachmentPlan = eventType === "row_updated" && !row.source_library_item_id && !selectingProjectComponentVariant
    ? await planProjectComponentAttachmentReconciliation(database, {
        projectId,
        estimateId,
        sourceRow: row,
        componentId,
        rowPatch: normalizedRowPatch,
        actorUserId: currentUser.userId,
      })
    : {
      active: false,
      changed: false,
      canonicalRowPatch: normalizedRowPatch,
      preSourceGuards: [] as Array<{ sql: string; values?: unknown[] }>,
      postSourceGuards: [] as Array<{ sql: string; values?: unknown[] }>,
      mutationStatements: [] as Array<{ sql: string; values?: unknown[] }>,
      createdAttachmentIds: [] as string[],
      supersededAttachmentIds: [] as string[],
    };
  const rowPatchPlan = planRowPatchMutation(row, estimateId, attachmentPlan.canonicalRowPatch, expected);
  if (!rowPatchPlan) return rowItemHistoryResult(row);
  const { columns, effectiveRowPatch, statement, updated } = rowPatchPlan;
  const replacementSourceId = eventType === "row_replaced" ? updated.source_library_item_id ?? null : null;
  if (eventType === "row_replaced") {
    if (replacementSourceId) {
      if (
        !expectedLibrarySourceReceipt
        || expectedLibrarySourceReceipt.sourceLibraryItemId !== replacementSourceId
        || expectedLibrarySourceReceipt.workspaceId !== intent.workspaceId
        || expectedLibrarySourceReceipt.resolvedUnit !== updated.unit
        || expectedLibrarySourceReceipt.resolvedUnitCost !== readNumber(updated.unit_cost)
        || expectedLibrarySourceReceipt.resolvedMiscCost !== readNumber(updated.misc_cost)
      ) {
        throw new Error("Library source changed. Refresh the estimate before replacing this row.");
      }
    } else if (expectedLibrarySourceReceipt) {
      throw new Error("Unlinked row replacements cannot retain a Library source receipt.");
    }
  }
  const librarySourceGuards = expectedLibrarySourceReceipt
    ? buildLibrarySourceCommitGuardStatements(expectedLibrarySourceReceipt)
    : [];
  const expectedImpactFingerprint = !selectingProjectComponentVariant && typeof args.expected_component_impact_fingerprint === "string"
    ? args.expected_component_impact_fingerprint
    : undefined;
  const propagation = eventType === "row_updated" && !row.source_library_item_id && !selectingProjectComponentVariant
    ? await propagateProjectComponentRowPatch(database, {
        projectId,
        sourceRow: row,
        rowPatch: effectiveRowPatch,
        componentId,
        expectedImpactFingerprint,
        removedPriceOptionReplacements,
      })
    : {
      rowIds: [] as string[],
      totalDeltaMinorUnits: 0,
      facts: [] as Array<Record<string, unknown>>,
      truncatedCount: 0,
      mutationStatements: [] as Array<{ sql: string; values?: unknown[] }>,
      impactFingerprint: null as string | null,
    };
  if (!database.batch) throw new Error("Atomic estimate row mutation is unavailable.");
  if (propagation.rowIds.length > 0 || attachmentPlan.active) {
    const canEditProject = await canEditProjectInD1(database, projectId, currentUser);
    if (!canEditProject) throw new Error("Project edit access is required to update a component used across estimates.");
  }
  const previousVariant = getVariantActivityIdentity(row);
  const nextVariant = getVariantActivityIdentity(updated);
  const changedFields = columns.map(([column]) => column);
  if (variantsDiffer(previousVariant, nextVariant)) changedFields.push("variant_changed");
  if (attachmentPlan.changed) changedFields.push("component_variant_attachments");
  const persistedImpactFingerprint = expectedImpactFingerprint ?? propagation.impactFingerprint;
  const mutationStatements = [
    buildRowRevisionGuardStatement(estimateId, [{ rowId, rowRevision: expected }]),
    ...(persistedImpactFingerprint ? [buildProjectComponentImpactGuardStatement({
      projectId,
      sourceRowId: rowId,
      componentId,
      expectedFingerprint: persistedImpactFingerprint,
    })] : []),
    ...librarySourceGuards,
    ...attachmentPlan.preSourceGuards,
    statement,
    ...attachmentPlan.postSourceGuards,
    ...attachmentPlan.mutationStatements,
    ...propagation.mutationStatements,
  ];
  if (mutationStatements.length + 4 > D1_MAX_BATCH_STATEMENTS) {
    throw new Error("Component propagation is too large to persist atomically with activity history.");
  }
  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: updated.node_id,
    targetRowId: rowId,
    eventType,
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    changedFields,
    oldSnapshot: row,
    newSnapshot: updated,
    rowContext: { material: updated.material, supplier: updated.supplier },
    payload: {
      rowId,
      variant: variantsDiffer(previousVariant, nextVariant) ? { previous: previousVariant, next: nextVariant } : null,
      propagatedRowIds: propagation.rowIds,
      propagatedRowCount: propagation.rowIds.length,
      propagatedRowFacts: propagation.facts,
      propagatedRowFactsTruncated: propagation.truncatedCount,
      attachments: attachmentPlan.active ? {
        createdAttachmentIds: attachmentPlan.createdAttachmentIds,
        supersededAttachmentIds: attachmentPlan.supersededAttachmentIds,
      } : null,
    },
    totalDelta: minorUnitsToAmount(estimateRowTotalMinorUnits(updated) - estimateRowTotalMinorUnits(row) + propagation.totalDeltaMinorUnits),
  });
  const result = rowItemHistoryResult(updated, history.eventId);
  const statements = [
    ...mutationStatements,
    buildProjectPublicationRevisionStatement(intent),
    ...(history.statement ? [history.statement, history.outboxStatement] : []),
    buildEstimateMutationReceiptStatement(intent, "estimate_row_item", rowId, result, nowIso()),
  ];
  assertD1MutationStatementLimit(statements.length);
  try {
    await runBatch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    if (persistedImpactFingerprint) {
      const currentImpactRows = await readProjectComponentImpactRevisionRows(database, {
        projectId,
        sourceRowId: rowId,
        componentId,
      });
      if (buildComponentImpactFingerprint(currentImpactRows) !== persistedImpactFingerprint) {
        throw new Error(COMPONENT_IMPACT_CONFLICT_MESSAGE);
      }
    }
    const authoritativeRow = await readRowById(database, estimateId, rowId);
    if (!authoritativeRow || readNumber(authoritativeRow.row_revision, 1) !== expected) {
      throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
    }
    if (expectedLibrarySourceReceipt) {
      throw new Error("Library source changed. Refresh the estimate before replacing this row.");
    }
    throw error;
  }
  return result;
}

type ExpectedRowRevision = { rowId: string; rowRevision: number };

function buildRowRevisionGuardStatement(estimateId: string, expectedRows: readonly ExpectedRowRevision[]) {
  if (expectedRows.length === 0) throw new Error("At least one row revision is required.");
  return {
    sql: `
      SELECT CASE WHEN (
        SELECT COUNT(*)
        FROM estimate_row_items
        WHERE estimate_id = ?
          AND (${expectedRows.map(() => "(id = ? AND row_revision = ?)").join(" OR ")})
      ) = ? THEN 1 ELSE json_extract(?, '$') END AS revision_guard
    `,
    values: [
      estimateId,
      ...expectedRows.flatMap((row) => [row.rowId, row.rowRevision]),
      expectedRows.length,
      ESTIMATE_ROW_REVISION_CONFLICT_CODE,
    ],
  };
}

function rowRevisionConflictResult(rows: readonly EstimateRowItemRow[], expectedRows: readonly ExpectedRowRevision[]) {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return {
    status: "conflict" as const,
    conflictRowIds: expectedRows
      .filter((expected) => readNumber(rowById.get(expected.rowId)?.row_revision, 0) !== expected.rowRevision)
      .map((expected) => expected.rowId),
    authoritativeRows: rows.map((row) => rowItemHistoryResult(row).row),
  };
}

function hasRowRevisionConflict(rows: readonly EstimateRowItemRow[], expectedRows: readonly ExpectedRowRevision[]) {
  return rowRevisionConflictResult(rows, expectedRows).conflictRowIds.length > 0;
}

async function moveRowComponent(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  if (!database.batch) throw new Error("Atomic estimate row component moves are unavailable.");
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const sourceRowId = String(args.source_row_id ?? "");
  const targetRowId = String(args.target_row_id ?? "");
  if (!sourceRowId || !targetRowId || sourceRowId === targetRowId) throw new Error("Source and target estimate rows must be different.");
  const activeTabId = typeof args.target_active_tab_id === "string" && args.target_active_tab_id
    ? args.target_active_tab_id
    : null;
  const expectedRows: ExpectedRowRevision[] = [
    { rowId: sourceRowId, rowRevision: readNumber(args.expected_source_row_revision) },
    { rowId: targetRowId, rowRevision: readNumber(args.expected_target_row_revision) },
  ];
  if (expectedRows.some((row) => !Number.isInteger(row.rowRevision) || row.rowRevision < 1)) {
    throw new Error("Component move requires the current revision for both rows.");
  }
  const sourceReplacementPayload = readJsonRecord(args.source_replacement_payload);
  const targetReplacementPayload = readJsonRecord(args.target_replacement_payload);
  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    "estimate.row.component-move",
    {
      projectId,
      estimateId,
      activeTabId,
      expectedRows,
      sourceReplacementPayload,
      targetReplacementPayload,
    },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, estimateId, intent.intentId);
  if (existingEvent) {
    const payload = readJsonRecord(existingEvent.payload);
    if (!payload.sourceRow || !payload.targetRow) throw new Error("Idempotent estimate row move event is incomplete.");
    return {
      status: "applied" as const,
      eventId: existingEvent.id,
      sourceRow: payload.sourceRow,
      targetRow: payload.targetRow,
      payload: { ...payload, eventId: existingEvent.id, status: "applied" },
    };
  }
  const currentRows = await all<EstimateRowItemRow>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
    [estimateId, sourceRowId, targetRowId],
  );
  if (hasRowRevisionConflict(currentRows, expectedRows)) return rowRevisionConflictResult(currentRows, expectedRows);
  const rowById = new Map(currentRows.map((row) => [row.id, row]));
  const sourceRow = rowById.get(sourceRowId);
  const targetRow = rowById.get(targetRowId);
  if (!sourceRow || !targetRow) return rowRevisionConflictResult(currentRows, expectedRows);
  const topologyNodeIds = [sourceRow.node_id ?? "", targetRow.node_id ?? ""];
  const topology = await validateEstimateDestinationNodes(database, estimateId, topologyNodeIds, activeTabId);
  const topologyTabIds = new Set(topology.nodes.map((node) => node.estimate_tab_id));
  if (topologyTabIds.size !== 1) throw new Error("Estimate row components cannot move across tabs.");
  const expectedTabId = topology.nodes[0]?.estimate_tab_id ?? null;
  const sourcePlan = planRowPatchMutation(sourceRow, estimateId, sourceReplacementPayload, expectedRows[0].rowRevision);
  const targetPlan = planRowPatchMutation(targetRow, estimateId, targetReplacementPayload, expectedRows[1].rowRevision);
  if (!sourcePlan || !targetPlan) throw new Error("Component move did not produce both row replacements.");
  const sourceResult = rowItemHistoryResult(sourcePlan.updated).row;
  const targetResult = rowItemHistoryResult(targetPlan.updated).row;
  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: targetPlan.updated.node_id,
    estimateTabId: expectedTabId,
    targetRowId,
    eventType: "row_component_moved",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    changedFields: Array.from(new Set([...sourcePlan.columns, ...targetPlan.columns].map(([column]) => column))),
    oldSnapshot: { sourceRow: serializeRowItem(sourceRow), targetRow: serializeRowItem(targetRow) },
    newSnapshot: { sourceRow: serializeRowItem(sourcePlan.updated), targetRow: serializeRowItem(targetPlan.updated) },
    payload: { sourceRow: sourceResult, targetRow: targetResult },
    totalDelta: minorUnitsToAmount(
      estimateRowTotalMinorUnits(sourcePlan.updated)
        + estimateRowTotalMinorUnits(targetPlan.updated)
        - estimateRowTotalMinorUnits(sourceRow)
        - estimateRowTotalMinorUnits(targetRow),
    ),
  });
  const result = {
    status: "applied" as const,
    eventId: history.eventId,
    sourceRow: sourceResult,
    targetRow: targetResult,
    payload: {
      status: "applied" as const,
      eventId: history.eventId,
      sourceRow: sourceResult,
      targetRow: targetResult,
    },
  };
  const timestamp = nowIso();
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    topology.guard,
    buildEstimateNodeTabGuardStatement(estimateId, topologyNodeIds, expectedTabId),
    buildRowRevisionGuardStatement(estimateId, expectedRows),
    sourcePlan.statement,
    targetPlan.statement,
    buildProjectPublicationRevisionStatement(intent),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(intent, "estimate_row_item_set", targetRowId, result, timestamp));
  assertD1MutationStatementLimit(statements.length);
  try {
    await runBatch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeRows = await all<EstimateRowItemRow>(
      database,
      `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
      [estimateId, sourceRowId, targetRowId],
    );
    if (hasRowRevisionConflict(authoritativeRows, expectedRows)) return rowRevisionConflictResult(authoritativeRows, expectedRows);
    throw error;
  }
  const authoritativeRows = await all<EstimateRowItemRow>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
    [estimateId, sourceRowId, targetRowId],
  );
  const authoritativeById = new Map(authoritativeRows.map((row) => [row.id, row]));
  const authoritativeSource = authoritativeById.get(sourceRowId);
  const authoritativeTarget = authoritativeById.get(targetRowId);
  if (!authoritativeSource || !authoritativeTarget) throw new Error("Moved estimate row components could not be reloaded.");
  return {
    ...result,
    sourceRow: rowItemHistoryResult(authoritativeSource, history.eventId).row,
    targetRow: rowItemHistoryResult(authoritativeTarget, history.eventId).row,
  };
}

async function deleteRowItem(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  if (!database.batch) throw new Error("Atomic estimate row deletion is unavailable.");
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const rowId = String(args.target_row_id ?? "");
  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    "estimate.row.delete",
    {
      projectId,
      estimateId,
      rowId,
      expectedRowRevision: args.expected_row_revision ?? null,
    },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, estimateId, intent.intentId);
  if (existingEvent) {
    const payload = readJsonRecord(existingEvent.payload);
    return {
      eventId: existingEvent.id,
      rowId,
      deletedRow: payload.deletedRow ?? null,
      payload: {
        eventId: existingEvent.id,
        rowId,
        deletedRow: payload.deletedRow ?? null,
      },
    };
  }
  const row = await readRowById(database, estimateId, rowId);
  if (!row) throw new Error("Estimate row item not found in the current project.");
  const expected = args.expected_row_revision === null || args.expected_row_revision === undefined ? readNumber(row.row_revision, 1) : readNumber(args.expected_row_revision);
  if (readNumber(row.row_revision, 1) !== expected) throw new Error("Estimate row revision conflict.");
  const deletedAt = nowIso();
  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: row.node_id,
    targetRowId: rowId,
    eventType: "row_deleted",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    oldSnapshot: row,
    rowContext: { material: row.material, supplier: row.supplier },
    payload: { rowId, deletedRow: rowItemHistoryResult(row).row },
    totalDelta: minorUnitsToAmount(-estimateRowTotalMinorUnits(row)),
  });
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    buildRowRevisionGuardStatement(estimateId, [{ rowId, rowRevision: expected }]),
    ...buildProjectComponentAttachmentDeleteRetentionStatements({
      workspaceId: intent.workspaceId,
      projectId,
      sourceDeleteEventId: history.eventId,
      deletedRows: [row],
      deletedAt,
    }),
    {
      sql: "DELETE FROM estimate_row_items WHERE id = ? AND estimate_id = ? AND row_revision = ?",
      values: [rowId, estimateId, expected],
    },
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  const result = {
    eventId: history.eventId,
    rowId,
    deletedRow: rowItemHistoryResult(row).row,
    payload: { rowId, deletedRow: rowItemHistoryResult(row).row },
  };
  statements.push(
    buildProjectPublicationRevisionStatement(intent),
    buildEstimateMutationReceiptStatement(intent, "estimate_row_item", rowId, result, deletedAt),
  );
  assertD1MutationStatementLimit(statements.length);
  try {
    await runBatch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeRow = await readRowById(database, estimateId, rowId);
    if (!authoritativeRow || readNumber(authoritativeRow.row_revision, 1) !== expected) {
      throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
    }
    throw error;
  }
  return result;
}

async function moveRowItem(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  if (!database.batch) throw new Error("Atomic estimate row reorganization is unavailable.");
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const activeTabId = typeof args.target_active_tab_id === "string" && args.target_active_tab_id
    ? args.target_active_tab_id
    : null;
  const updates = (Array.isArray(args.move_updates) ? args.move_updates : [])
    .map(readJsonRecord)
    .map((update) => ({
      rowId: String(update.rowId ?? ""),
      nodeId: String(update.nodeId ?? ""),
      sortOrder: readNumber(update.sortOrder, Number.NaN),
      expectedRowRevision: readNumber(update.expectedRowRevision),
    }))
    .sort((left, right) => left.rowId.localeCompare(right.rowId));
  if (updates.length === 0) throw new Error("Select at least one estimate row to move.");
  const updateIds = new Set<string>();
  for (const update of updates) {
    if (!update.rowId || !update.nodeId) throw new Error("Estimate row reorganization identity is incomplete.");
    if (updateIds.has(update.rowId)) throw new Error("Estimate row reorganization contains a duplicate row.");
    updateIds.add(update.rowId);
    if (!Number.isFinite(update.sortOrder) || update.sortOrder < 0) {
      throw new Error("Estimate row sort order must be a non-negative number.");
    }
    if (!Number.isInteger(update.expectedRowRevision) || update.expectedRowRevision < 1) {
      throw new Error("Row reorganization requires the current revision for every affected row.");
    }
  }
  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    "estimate.row.move",
    { projectId, estimateId, activeTabId, updates },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, estimateId, intent.intentId);
  if (existingEvent) {
    const payload = readJsonRecord(existingEvent.payload);
    const rows = Array.isArray(payload.rows) ? payload.rows.map(readJsonRecord) : [];
    if (rows.length === 0) throw new Error("Idempotent estimate row move event is incomplete.");
    return {
      eventId: existingEvent.id,
      updatedRowCount: rows.length,
      rows,
      payload: { ...payload, eventId: existingEvent.id },
    };
  }

  const expectedRows = updates.map((update) => ({
    rowId: update.rowId,
    rowRevision: update.expectedRowRevision,
  }));
  const currentRows = await all<EstimateRowItemRow>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
    [estimateId, ...expectedRows.map((row) => row.rowId)],
  );
  if (hasRowRevisionConflict(currentRows, expectedRows)) {
    return rowRevisionConflictResult(currentRows, expectedRows);
  }
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const topologyNodeIds = updates.flatMap((update) => {
    const currentNodeId = currentById.get(update.rowId)?.node_id;
    return currentNodeId ? [currentNodeId, update.nodeId] : [update.nodeId];
  });
  const topology = await validateEstimateDestinationNodes(database, estimateId, topologyNodeIds, activeTabId);
  const topologyTabIds = new Set(topology.nodes.map((node) => node.estimate_tab_id));
  if (topologyTabIds.size !== 1) throw new Error("Estimate rows cannot move across tabs.");
  const expectedTabId = topology.nodes[0]?.estimate_tab_id ?? null;
  const timestamp = nowIso();
  const rows = updates.map((update) => ({
    rowId: update.rowId,
    nodeId: update.nodeId,
    sortOrder: update.sortOrder,
    rowRevision: update.expectedRowRevision + 1,
  }));
  const mutationStatements = rows.map((row, index) => ({
    sql: "UPDATE estimate_row_items SET node_id = ?, sort_order = ?, row_revision = ?, updated_at = ? WHERE id = ? AND estimate_id = ? AND row_revision = ?",
    values: [
      row.nodeId,
      row.sortOrder,
      row.rowRevision,
      timestamp,
      row.rowId,
      estimateId,
      updates[index]!.expectedRowRevision,
    ],
  }));
  const movedRowId = String(args.moved_row_id ?? "") || rows[0]!.rowId;
  const movedRow = rows.find((row) => row.rowId === movedRowId) ?? rows[0]!;
  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: movedRow.nodeId,
    estimateTabId: expectedTabId,
    targetRowId: movedRowId,
    eventType: "rows_moved",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    changedFields: ["node_id", "sort_order"],
    oldSnapshot: { rows: currentRows.map(serializeRowItem) },
    newSnapshot: { rows },
    payload: { rows, updatedRowCount: rows.length },
  });
  const result = {
    eventId: history.eventId,
    updatedRowCount: rows.length,
    rows,
    payload: { eventId: history.eventId, updatedRowCount: rows.length, rows },
  };
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    topology.guard,
    buildEstimateNodeTabGuardStatement(estimateId, topologyNodeIds, expectedTabId),
    buildRowRevisionGuardStatement(estimateId, expectedRows),
    ...mutationStatements,
    buildProjectPublicationRevisionStatement(intent),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(intent, "estimate_row_item", movedRowId, result, timestamp));
  assertD1MutationStatementLimit(statements.length);
  try {
    await runBatch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeRows = await all<EstimateRowItemRow>(
      database,
      `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
      [estimateId, ...expectedRows.map((row) => row.rowId)],
    );
    if (hasRowRevisionConflict(authoritativeRows, expectedRows)) {
      throw new Error(ESTIMATE_ROW_REVISION_CONFLICT_CODE);
    }
    throw error;
  }
  const authoritativeRows = await all<EstimateRowItemRow>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(expectedRows)}) ORDER BY id`,
    [estimateId, ...expectedRows.map((row) => row.rowId)],
  );
  const authoritativeById = new Map(authoritativeRows.map((row) => [row.id, row]));
  return {
    ...result,
    rows: rows.map((row) => {
      const authoritative = authoritativeById.get(row.rowId);
      if (!authoritative) throw new Error("Moved estimate row could not be reloaded.");
      return {
        rowId: authoritative.id,
        nodeId: authoritative.node_id ?? "",
        sortOrder: readNumber(authoritative.sort_order),
        rowRevision: readNumber(authoritative.row_revision, 1),
      };
    }),
  };
}

async function updateSheetAdjustment(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const mode = String(args.adjustment_mode ?? "contingency");
  const percentage = readNumber(args.adjustment_percentage);
  const existing = await first<{ row_revision: number | string }>(
    database,
    "SELECT row_revision FROM estimate_sheet_adjustments WHERE estimate_id = ? AND mode = ? LIMIT 1",
    [estimateId, mode],
  );
  const expected = args.expected_row_revision === null || args.expected_row_revision === undefined ? null : readNumber(args.expected_row_revision);
  if (expected !== null && existing && readNumber(existing.row_revision, 1) !== expected) throw new Error("Estimate row revision conflict.");
  const rowRevision = existing ? readNumber(existing.row_revision, 1) + 1 : 1;
  const updatedAt = nowIso();
  const updatedBy = String(args.acting_user_id ?? "") || null;
  const mutation = {
    sql: `
      INSERT INTO estimate_sheet_adjustments (estimate_id, mode, percentage, row_revision, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(estimate_id, mode) DO UPDATE SET
        percentage = excluded.percentage,
        row_revision = excluded.row_revision,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `,
    values: [estimateId, mode, percentage, rowRevision, updatedAt, updatedBy],
  };
  const eventId = await runMutationWithHistory(database, [mutation], {
    projectId,
    estimateId,
    eventType: "sheet_adjustment_updated",
    actorUserId: updatedBy,
    correlationId: String(args.correlation_id ?? randomUUID()),
    changedFields: ["percentage"],
    payload: { adjustment: { estimateId, mode, percentage, rowRevision, updatedAt, updatedBy } },
  });
  return { eventId, adjustment: { estimateId, mode, percentage, rowRevision, updatedAt, updatedBy } };
}

async function deleteRowsBulk(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  if (!database.batch) throw new Error("Atomic bulk estimate row deletion is unavailable.");
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const rowIds = Array.isArray(args.target_row_ids)
    ? args.target_row_ids.filter((id): id is string => typeof id === "string" && Boolean(id)).sort()
    : [];
  if (rowIds.length === 0) throw new Error("Select at least one estimate row.");
  if (new Set(rowIds).size !== rowIds.length) throw new Error("Bulk row delete contains a duplicate row.");
  const expectedRevisionRecord = readJsonRecord(args.expected_row_revisions);
  const expectedRows = rowIds.map((rowId) => ({ rowId, rowRevision: readNumber(expectedRevisionRecord[rowId]) }));
  if (expectedRows.some((row) => !Number.isInteger(row.rowRevision) || row.rowRevision < 1)) {
    throw new Error("Bulk row delete requires the current revision for every selected row.");
  }
  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    "estimate.row.bulk-delete",
    { projectId, estimateId, expectedRows },
  );
  if (committedResult) return committedResult;
  const existingEvent = await readExistingHistoryEvent(database, estimateId, intent.intentId);
  if (existingEvent) {
    const payload = readJsonRecord(existingEvent.payload);
    const deletedRowIds = Array.isArray(payload.deletedRowIds)
      ? payload.deletedRowIds.filter((rowId): rowId is string => typeof rowId === "string")
      : [];
    if (deletedRowIds.length === 0) throw new Error("Idempotent bulk row delete event is incomplete.");
    return {
      status: "applied" as const,
      eventId: existingEvent.id,
      deletedRowIds,
      deletedRowCount: deletedRowIds.length,
      payload: { ...payload, eventId: existingEvent.id, status: "applied" },
    };
  }
  const rows = await all<EstimateRowItemRow>(database, `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(rowIds)})`, [estimateId, ...rowIds]);
  if (hasRowRevisionConflict(rows, expectedRows)) return rowRevisionConflictResult(rows, expectedRows);
  const deletedAt = nowIso();
  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: intent.workspaceId,
    eventType: "rows_deleted",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    oldSnapshot: { rows: rows.map(serializeRowItem) },
    payload: { deletedRowIds: rowIds, deletedRowCount: rowIds.length },
    totalDelta: minorUnitsToAmount(-sumEstimateRowTotalMinorUnits(rows)),
  });
  const result = {
    status: "applied" as const,
    eventId: history.eventId,
    deletedRowIds: rowIds,
    deletedRowCount: rowIds.length,
    payload: {
      status: "applied" as const,
      eventId: history.eventId,
      deletedRowIds: rowIds,
      deletedRowCount: rowIds.length,
    },
  };
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    buildRowRevisionGuardStatement(estimateId, expectedRows),
    ...buildProjectComponentAttachmentDeleteRetentionStatements({
      workspaceId: intent.workspaceId,
      projectId,
      sourceDeleteEventId: history.eventId,
      deletedRows: rows,
      deletedAt,
    }),
    {
      sql: `DELETE FROM estimate_row_items WHERE estimate_id = ? AND (${expectedRows.map(() => "(id = ? AND row_revision = ?)").join(" OR ")})`,
      values: [estimateId, ...expectedRows.flatMap((row) => [row.rowId, row.rowRevision])],
    },
    buildProjectPublicationRevisionStatement(intent),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(intent, "estimate_row_item_set", estimateId, result, deletedAt));
  assertD1MutationStatementLimit(statements.length);
  try {
    await runBatch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    const authoritativeRows = await all<EstimateRowItemRow>(database, `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(rowIds)})`, [estimateId, ...rowIds]);
    if (hasRowRevisionConflict(authoritativeRows, expectedRows)) return rowRevisionConflictResult(authoritativeRows, expectedRows);
    throw error;
  }
  return result;
}

async function restoreDeletedEstimateRows(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  if (!database.batch) throw new Error("Atomic estimate row restoration is unavailable.");
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const sourceEventId = String(args.source_delete_event_id ?? "");
  const activeTabId = typeof args.target_active_tab_id === "string" && args.target_active_tab_id
    ? args.target_active_tab_id
    : null;
  const requestedRowIds = Array.isArray(args.target_row_ids)
    ? args.target_row_ids.filter((id): id is string => typeof id === "string" && Boolean(id)).sort()
    : [];
  if (!sourceEventId) throw new Error("Deleted row history identity is required.");
  if (requestedRowIds.length > MAX_RESTORABLE_ROW_BATCH_SIZE || new Set(requestedRowIds).size !== requestedRowIds.length) {
    throw new Error("Requested row restore selection is invalid.");
  }
  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    "estimate.row.restore",
    { projectId, estimateId, sourceEventId, requestedRowIds, activeTabId },
  );
  if (committedResult) return committedResult;

  const sourceEvent = await first<EstimateEventRow>(
    database,
    `
      SELECT *
      FROM estimate_sheet_events
      WHERE id = ?
        AND estimate_id = ?
        AND project_id = ?
        AND workspace_id = ?
      LIMIT 1
    `,
    [sourceEventId, estimateId, projectId, intent.workspaceId],
  );
  if (!sourceEvent || !["row_deleted", "rows_deleted", "rows_bulk_deleted"].includes(sourceEvent.event_type)) {
    throw new Error("Deleted row history snapshot was not found in the current estimate.");
  }

  const snapshot = readJsonRecord(sourceEvent.old_snapshot);
  const snapshotRows = (Array.isArray(snapshot.rows)
    ? snapshot.rows.map(readJsonRecord)
    : typeof snapshot.id === "string"
      ? [snapshot]
      : []).map((row): Record<string, unknown> => ({
    ...row,
    estimate_id: row.estimate_id ?? row.estimateId,
    node_id: row.node_id ?? row.nodeId,
  }));
  if (snapshotRows.length === 0) throw new Error("Deleted row history snapshot does not contain restorable rows.");
  if (snapshotRows.length > MAX_RESTORABLE_ROW_BATCH_SIZE) {
    throw new Error(`Deleted row history snapshot exceeds the ${MAX_RESTORABLE_ROW_BATCH_SIZE}-row restore limit.`);
  }

  const snapshotRowIds = new Set<string>();
  for (const row of snapshotRows) {
    const rowId = typeof row.id === "string" ? row.id : "";
    if (!rowId || row.estimate_id !== estimateId || snapshotRowIds.has(rowId)) {
      throw new Error("Deleted row history snapshot is malformed.");
    }
    snapshotRowIds.add(rowId);
  }

  if (requestedRowIds.some((rowId) => !snapshotRowIds.has(rowId))) {
    throw new Error("Requested rows are not present in the deleted row history snapshot.");
  }
  const rowsToRestore = requestedRowIds.length > 0
    ? snapshotRows.filter((row) => requestedRowIds.includes(String(row.id)))
    : snapshotRows;

  const existingEvent = await readExistingHistoryEvent(database, estimateId, intent.intentId);
  if (existingEvent) {
    const existingPayload = readJsonRecord(existingEvent.payload);
    const restoredRowIds = Array.isArray(existingPayload.restoredRowIds)
      ? existingPayload.restoredRowIds.filter((id): id is string => typeof id === "string")
      : [];
    if (
      existingEvent.event_type !== "estimate_rows_restored"
      || existingPayload.sourceEventId !== sourceEventId
      || restoredRowIds.length === 0
    ) {
      throw new Error("Restore correlation is already associated with a different estimate mutation.");
    }
    const restoredRows = await Promise.all(restoredRowIds.map(async (rowId) => {
      const row = await readRowById(database, estimateId, rowId);
      if (!row) throw new Error("Idempotent row restore event exists but restored rows are missing.");
      return rowItemHistoryResult(row, existingEvent.id).row;
    }));
    return {
      eventId: existingEvent.id,
      sourceEventId,
      restoredRowIds,
      restoredRowCount: restoredRows.length,
      restoredRows,
    };
  }

  const restoredRowIds = rowsToRestore.map((row) => String(row.id));
  const collidingRows = await all<{ id: string }>(
    database,
    `SELECT id FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)})`,
    [estimateId, ...restoredRowIds],
  );
  if (collidingRows.length > 0) throw new Error("One or more estimate rows to restore already exist.");

  const normalizedRowsToRestore = rowsToRestore.map((row) => (
    assignInsertDefaults("estimate_row_items", row) as unknown as EstimateRowItemRow
  ));
  const destinationNodeIds = normalizedRowsToRestore.map((row) => row.node_id ?? "");
  const destination = await validateEstimateDestinationNodes(database, estimateId, destinationNodeIds, activeTabId);
  const destinationTabIds = new Set(destination.nodes.map((node) => node.estimate_tab_id));
  if (destinationTabIds.size !== 1) throw new Error("Deleted estimate rows cannot restore across tabs.");
  const destinationTabId = destination.nodes[0]?.estimate_tab_id ?? null;

  const history = await prepareHistoryEventInsert(database, {
    projectId,
    estimateId,
    workspaceId: intent.workspaceId,
    estimateTabId: destinationTabId,
    targetRowId: restoredRowIds.length === 1 ? restoredRowIds[0] ?? null : null,
    eventType: "estimate_rows_restored",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    newSnapshot: { rows: normalizedRowsToRestore.map(serializeRowItem) },
    payload: {
      sourceEventId,
      restoredRowIds,
      restoredRowCount: restoredRowIds.length,
    },
    totalDelta: minorUnitsToAmount(sumEstimateRowTotalMinorUnits(normalizedRowsToRestore)),
  });
  const restoredAt = nowIso();
  const attachmentRetention = buildProjectComponentAttachmentRestoreRetentionStatements({
    projectId,
    sourceDeleteEventId: sourceEventId,
    restoredRows: normalizedRowsToRestore,
    restoredAt,
  });
  const result = {
    eventId: history.eventId,
    sourceEventId,
    restoredRowIds,
    restoredRowCount: restoredRowIds.length,
    restoredRows: normalizedRowsToRestore.map((row) => rowItemHistoryResult(row, history.eventId).row),
  };
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    {
      sql: `
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM estimate_sheet_events
          WHERE id = ?
            AND estimate_id = ?
            AND project_id = ?
            AND workspace_id = ?
            AND event_type IN ('row_deleted', 'rows_deleted', 'rows_bulk_deleted')
        ) THEN 1 ELSE json('') END AS estimate_row_restore_source_guard
      `,
      values: [sourceEventId, estimateId, projectId, intent.workspaceId],
    },
    destination.guard,
    buildEstimateNodeTabGuardStatement(estimateId, destinationNodeIds, destinationTabId),
    ...attachmentRetention.guardStatements,
    ...buildPackedInsertStatements("estimate_row_items", normalizedRowsToRestore as unknown as Record<string, unknown>[]),
    ...attachmentRetention.releaseStatements,
    buildProjectPublicationRevisionStatement(intent),
  ];
  if (history.statement) statements.push(history.statement, history.outboxStatement);
  statements.push(buildEstimateMutationReceiptStatement(intent, "estimate_row_item_set", estimateId, result, restoredAt));
  assertD1MutationStatementLimit(statements.length);
  try {
    await runBatch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    throw error;
  }
  const authoritativeRows = await all<EstimateRowItemRow>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)}) ORDER BY id`,
    [estimateId, ...restoredRowIds],
  );
  if (authoritativeRows.length !== restoredRowIds.length) {
    throw new Error("Restored estimate rows could not be reloaded.");
  }
  const authoritativeById = new Map(authoritativeRows.map((row) => [row.id, row]));
  return {
    ...result,
    restoredRows: restoredRowIds.map((rowId) => rowItemHistoryResult(authoritativeById.get(rowId)!, history.eventId).row),
  };
}

function readTemplateSnapshotText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readTemplateSnapshotBoolean(value: unknown) {
  return value === true || value === 1;
}

function buildCurrentTemplatePriceOptionSnapshot(
  option: TemplatePriceOptionRow,
  currentCostEntry: TemplateCostEntryRow | undefined,
) {
  const metadata = readJsonRecord(option.metadata_json);
  return {
    id: option.id,
    label: option.label,
    sku: readTemplateSnapshotText(metadata, "sku"),
    variantDescription: readTemplateSnapshotText(metadata, "variantDescription"),
    variantSortOrder: readNumber(metadata.variantSortOrder),
    unit: option.unit,
    unitCost: readNumber(currentCostEntry?.unit_cost ?? option.unit_cost),
    miscCost: readNumber(currentCostEntry?.misc_cost ?? option.misc_cost),
    currency: currentCostEntry?.currency ?? option.currency ?? "PHP",
    pricingSource: currentCostEntry?.pricing_source ?? option.pricing_source,
    pricingDate: currentCostEntry?.pricing_date ?? readTemplateSnapshotText(metadata, "pricingDate"),
    sourceUrl: currentCostEntry?.source_url ?? readTemplateSnapshotText(metadata, "sourceUrl"),
    supplierId: option.supplier_id,
    thumbnailPath: readTemplateSnapshotText(metadata, "thumbnailPath"),
    isActive: readTemplateSnapshotBoolean(option.is_active),
    isDefault: readTemplateSnapshotBoolean(option.is_default),
    createdAt: option.created_at,
    updatedAt: option.updated_at,
  };
}

function buildCurrentTemplateSourceSnapshot(input: {
  savedSnapshot: Record<string, unknown>;
  item: TemplateLibraryItemRow;
  selectedOption: TemplatePriceOptionRow;
  currentCostEntry?: TemplateCostEntryRow;
  activeOptions: TemplatePriceOptionRow[];
  currentCostEntryByOptionId: ReadonlyMap<string, TemplateCostEntryRow>;
}) {
  const itemMetadata = readJsonRecord(input.item.metadata_json);
  const selectedOptionSnapshot = buildCurrentTemplatePriceOptionSnapshot(input.selectedOption, input.currentCostEntry);
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
    priceOptions: input.activeOptions.slice(0, 50).map((option) => buildCurrentTemplatePriceOptionSnapshot(
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

function buildSavedTemplateSourceSnapshot(row: TemplateRowItemRow, reason: string) {
  const savedSnapshot = readJsonRecord(row.source_snapshot);
  return {
    ...savedSnapshot,
    source: "project",
    sourceType: "template_saved_snapshot",
    sourceComponentId: null,
    sourceLibraryItemId: null,
    savedSourceLibraryItemId: row.source_library_item_id,
    templateSourceResolution: "saved_snapshot_unlinked",
    templateSourceUnavailableReason: reason,
  };
}

function latestTemplateSourceUpdate(rows: Array<{ updated_at?: string | null }>) {
  return rows.reduce((latest, row) => String(row.updated_at ?? "") > latest ? String(row.updated_at ?? "") : latest, "");
}

function assertTemplateCopyStatementLimit(statementCount: number) {
  try {
    assertD1MutationStatementLimit(statementCount);
  } catch {
    const error = new Error(`selection_too_large: Narrow the selection so the atomic copy uses at most ${D1_MAX_BATCH_STATEMENTS} D1 statements.`) as Error & {
      code: string;
      statementCount: number;
    };
    error.code = "selection_too_large";
    error.statementCount = statementCount;
    throw error;
  }
}

function validateTemplateCopyTopology(
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

async function copyTemplateNodes(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
  sourceRootNodeId?: string | null,
) {
  if (!database.batch) throw new Error("Estimate template insertion requires atomic D1 batch support.");
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const targetParentNodeId = String(args.target_parent_node_id ?? "");
  const requestedTargetTabId = typeof args.target_tab_id === "string" ? args.target_tab_id : null;
  const requestedTemplateIds = Array.isArray(args.source_template_ids)
    ? args.source_template_ids.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [String(args.source_template_id ?? "")].filter(Boolean);
  const templateIds = [...new Set(requestedTemplateIds)];
  if (templateIds.length === 0) throw new Error("At least one estimate template is required.");
  if (sourceRootNodeId && templateIds.length !== 1) throw new Error("A template subtree insert requires exactly one template.");

  const { context: intent, committedResult } = await prepareEstimateMutationIntent(
    database,
    args,
    currentUser,
    "estimate.template.copy",
    {
      projectId,
      estimateId,
      targetParentNodeId,
      requestedTargetTabId,
      templateIds,
      sourceRootNodeId: sourceRootNodeId ?? null,
    },
  );
  if (committedResult) return committedResult;

  const parentNode = await readNodeById(database, intent.estimateId, targetParentNodeId);
  if (!parentNode) throw new Error("Estimate tree node not found in the current project.");
  const targetTabId = parentNode.estimate_tab_id ?? null;
  if (requestedTargetTabId !== null && requestedTargetTabId !== targetTabId) {
    throw new Error("Template insert target tab does not match the selected estimate node.");
  }

  const templateHeaders = await all<TemplateHeaderRow>(
    database,
    `SELECT id, workspace_id, updated_at
     FROM estimate_templates
     WHERE workspace_id = ?
       AND id IN (${placeholders(templateIds)})`,
    [intent.workspaceId, ...templateIds],
  );
  if (templateHeaders.length !== templateIds.length) {
    throw new Error("Estimate template not found in the current workspace.");
  }

  const [unsortedTemplateNodes, unsortedTemplateRows] = await Promise.all([
    all<TemplateNodeRow>(
      database,
      `SELECT * FROM estimate_template_nodes
       WHERE template_id IN (${placeholders(templateIds)})`,
      templateIds,
    ),
    all<TemplateRowItemRow>(
      database,
      `SELECT * FROM estimate_template_row_items
       WHERE template_id IN (${placeholders(templateIds)})`,
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
  if (sourceRootNodeId && !rootTemplateNodes.some((node) => node.id === sourceRootNodeId)) {
    throw new Error("Estimate template node not found in the current template.");
  }
  const allowedNodeIds = sourceRootNodeId
    ? new Set(collectTemplateDescendantNodeIds(rootTemplateNodes, sourceRootNodeId))
    : new Set(templateNodes.map((node) => node.id));
  const nodesToCopy = templateNodes.filter((node) => allowedNodeIds.has(node.id));
  const rowsToCopy = templateRows.filter((row) => allowedNodeIds.has(row.template_node_id));
  validateTemplateCopyTopology(templateIds, templateNodes, templateRows, nodesToCopy, rowsToCopy);

  const linkedSourceIds = [...new Set(rowsToCopy.flatMap((row) => row.source_library_item_id ? [row.source_library_item_id] : []))];
  const [libraryItems, priceOptions, currentCostEntries] = linkedSourceIds.length > 0
    ? await Promise.all([
        all<TemplateLibraryItemRow>(
          database,
          `SELECT * FROM cost_library_items
           WHERE workspace_id = ?
             AND id IN (${placeholders(linkedSourceIds)})`,
          [intent.workspaceId, ...linkedSourceIds],
        ),
        all<TemplatePriceOptionRow>(
          database,
          `SELECT * FROM cost_library_item_price_options
           WHERE workspace_id = ?
             AND item_id IN (${placeholders(linkedSourceIds)})
             AND is_active = 1
           ORDER BY item_id ASC, is_default DESC, created_at ASC`,
          [intent.workspaceId, ...linkedSourceIds],
        ),
        all<TemplateCostEntryRow>(
          database,
          `SELECT *
           FROM cost_library_item_variant_cost_entries
           WHERE workspace_id = ?
             AND item_id IN (${placeholders(linkedSourceIds)})
             AND is_current = 1
             AND deleted_at IS NULL`,
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
  const currentCostEntryByOptionId = new Map(currentCostEntries.map((entry) => [entry.price_option_id, entry]));

  const unavailableRows = rowsToCopy.flatMap((row) => {
    if (!row.source_library_item_id) return [];
    const savedSnapshot = readJsonRecord(row.source_snapshot);
    const selectedPriceOptionId = readTemplateSnapshotText(savedSnapshot, "priceOptionId");
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
  const unavailableReasonByRowId = new Map(unavailableRows.map((row) => [row.templateRowId, row.reason]));
  const unavailableSourcePolicy = args.unavailable_source_policy === "use_saved_snapshot_unlinked"
    ? "use_saved_snapshot_unlinked"
    : "cancel";
  if (unavailableRows.length > 0 && unavailableSourcePolicy === "cancel") {
    return {
      status: "requires_saved_snapshot_confirmation",
      unavailableSourceCount: unavailableRows.length,
      unavailableRows: unavailableRows.slice(0, 20),
    };
  }

  const sibling = await first<{ sort_order: number | string | null }>(
    database,
    `SELECT COALESCE(MAX(sort_order), 0) AS sort_order
     FROM estimate_nodes
     WHERE estimate_id = ?
       AND estimate_tab_id IS ?
       AND parent_id = ?`,
    [intent.estimateId, targetTabId, targetParentNodeId],
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
    sourceRootNodeId: sourceRootNodeId ?? null,
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
        intent.workspaceId, ...linkedSourceIds, latestTemplateSourceUpdate(libraryItems),
        intent.workspaceId, ...linkedSourceIds, priceOptions.length,
        intent.workspaceId, ...linkedSourceIds, latestTemplateSourceUpdate(priceOptions),
        intent.workspaceId, ...linkedSourceIds, currentCostEntries.length,
        intent.workspaceId, ...linkedSourceIds, latestTemplateSourceUpdate(currentCostEntries),
      ]
    : [];
  const sourceGuard = {
    sql: `
      SELECT CASE WHEN
        EXISTS (
          SELECT 1
          FROM estimate_nodes
          WHERE id = ?
            AND estimate_id = ?
            AND estimate_tab_id IS ?
            AND updated_at = ?
        )
        AND COALESCE((
          SELECT MAX(sort_order)
          FROM estimate_nodes
          WHERE estimate_id = ?
            AND estimate_tab_id IS ?
            AND parent_id = ?
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
      targetParentNodeId,
      intent.estimateId,
      targetTabId,
      String(parentNode.updated_at ?? ""),
      intent.estimateId,
      targetTabId,
      targetParentNodeId,
      expectedMaxSiblingSortOrder,
      intent.workspaceId,
      ...templateIds,
      templateHeaders.length,
      intent.workspaceId,
      ...templateIds,
      latestTemplateSourceUpdate(templateHeaders),
      ...templateIds,
      templateNodes.length,
      ...templateIds,
      latestTemplateSourceUpdate(templateNodes),
      ...templateIds,
      templateRows.length,
      ...templateIds,
      latestTemplateSourceUpdate(templateRows),
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
    const insert = buildInsertRecordStatement("estimate_nodes", {
      id: nodeIdBySource.get(node.id)!,
      estimate_id: intent.estimateId,
      estimate_tab_id: targetTabId,
      parent_id: isRoot ? targetParentNodeId : nodeIdBySource.get(node.parent_id ?? "") ?? null,
      kind: node.kind,
      name: node.name,
      sort_order: isRoot
        ? expectedMaxSiblingSortOrder + (sourceRootRankById.get(node.id) ?? 1) * 1_000
        : readNumber(node.sort_order),
      metadata_json: readJson(node.metadata, {}),
      created_at: copiedAt,
      updated_at: copiedAt,
    });
    return { sql: insert.sql, values: insert.values };
  });
  const rowStatements = rowsToCopy.map((row) => {
    const nodeId = nodeIdBySource.get(row.template_node_id);
    if (!nodeId) throw new Error("Estimate template source selection is incomplete.");
    const savedSnapshot = readJsonRecord(row.source_snapshot);
    const unavailableReason = unavailableReasonByRowId.get(row.id);
    const currentItem = row.source_library_item_id ? libraryItemById.get(row.source_library_item_id) : undefined;
    const selectedPriceOptionId = readTemplateSnapshotText(savedSnapshot, "priceOptionId");
    const selectedOption = selectedPriceOptionId ? priceOptionById.get(selectedPriceOptionId) : undefined;
    const currentSnapshot = currentItem && selectedOption && !unavailableReason
      ? buildCurrentTemplateSourceSnapshot({
          savedSnapshot,
          item: currentItem,
          selectedOption,
          currentCostEntry: currentCostEntryByOptionId.get(selectedOption.id),
          activeOptions: priceOptionsByItemId.get(currentItem.id) ?? [selectedOption],
          currentCostEntryByOptionId,
        })
      : null;
    const useSavedUnlinked = Boolean(unavailableReason);
    const effectiveCostEntry = selectedOption ? currentCostEntryByOptionId.get(selectedOption.id) : undefined;
    const insert = buildInsertRecordStatement("estimate_row_items", {
      id: randomUUID(),
      estimate_id: intent.estimateId,
      node_id: nodeId,
      sort_order: readNumber(row.sort_order),
      source_library_item_id: currentSnapshot ? currentItem!.id : null,
      source_snapshot_json: jsonString(
        currentSnapshot ?? (useSavedUnlinked ? buildSavedTemplateSourceSnapshot(row, unavailableReason!) : savedSnapshot),
        null,
      ),
      pricing_provenance_origin: row.pricing_provenance_origin ?? "inherited_snapshot",
      category_node_id: currentSnapshot ? currentItem!.category_node_id : row.category_node_id,
      supplier_id: currentSnapshot ? selectedOption!.supplier_id ?? currentItem!.supplier_id : row.supplier_id,
      material: currentSnapshot ? currentItem!.name : row.material ?? "",
      description: currentSnapshot ? currentItem!.description : row.description ?? "",
      supplier: currentSnapshot ? currentItem!.supplier ?? "" : row.supplier ?? "",
      unit: currentSnapshot ? selectedOption!.unit : row.unit ?? "unit",
      quantity: readNumber(row.quantity),
      unit_cost: currentSnapshot ? readNumber(effectiveCostEntry?.unit_cost ?? selectedOption!.unit_cost) : readNumber(row.unit_cost),
      misc_cost: currentSnapshot ? readNumber(effectiveCostEntry?.misc_cost ?? selectedOption!.misc_cost) : readNumber(row.misc_cost),
      contingency_percentage: readNumber(row.contingency_percentage),
      adjustment_percentage: readNumber(row.adjustment_percentage),
      discipline: row.discipline ?? "",
      designation: row.designation ?? "",
      link_state: currentSnapshot ? "linked-clean" : "unlinked",
      metadata_json: readJson(row.metadata, {}),
      row_revision: 1,
      created_at: copiedAt,
      updated_at: copiedAt,
    });
    return { sql: insert.sql, values: insert.values };
  });
  const history = await prepareHistoryEventInsert(database, {
    projectId: intent.projectId,
    estimateId: intent.estimateId,
    workspaceId: intent.workspaceId,
    estimateNodeId: targetParentNodeId,
    estimateTabId: targetTabId,
    eventType: sourceRootNodeId ? "template_node_subtree_inserted" : "template_inserted",
    actorUserId: intent.actorUserId,
    correlationId: intent.intentId,
    payload: {
      inserted_root_node_ids: insertedRootNodeIds,
      inserted_node_count: nodeStatements.length,
      inserted_row_item_count: rowStatements.length,
      sourceTemplateIds: templateIds,
      sourceTemplateId: templateIds.length === 1 ? templateIds[0] : null,
      sourceTemplateNodeId: sourceRootNodeId ?? null,
      savedSnapshotUnlinkedRowCount: unavailableRows.length,
      sourceFingerprint,
      statementCount: exactStatementCount,
    },
  });
  if (!history.statement || !history.outboxStatement) {
    throw new Error("Template insert intent has activity history without a committed mutation receipt.");
  }
  const result = {
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
  const statements: Array<{ sql: string; values?: unknown[] }> = [
    sourceGuard,
    ...nodeStatements,
    ...rowStatements,
    buildProjectPublicationRevisionStatement(intent),
    history.statement,
    history.outboxStatement,
    buildEstimateMutationReceiptStatement(intent, "estimate_node", insertedRootNodeIds[0] ?? null, result, copiedAt),
  ];
  assertTemplateCopyStatementLimit(statements.length);
  try {
    await runBatch(database, statements);
  } catch (error) {
    const concurrentReceipt = await readConcurrentEstimateMutationReceipt(database, intent);
    if (concurrentReceipt) return concurrentReceipt;
    throw error;
  }
  return result;
}

function collectTemplateDescendantNodeIds(nodes: TemplateNodeRow[], rootNodeId: string) {
  const childrenByParent = new Map<string | null, string[]>();
  for (const node of nodes) {
    const children = childrenByParent.get(node.parent_id) ?? [];
    children.push(node.id);
    childrenByParent.set(node.parent_id, children);
  }
  const result: string[] = [];
  const queue = [rootNodeId];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }
  return result;
}

async function previewBulkDeleteEstimateSheets(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateIds = Array.isArray(args.target_estimate_ids) ? args.target_estimate_ids.filter((id): id is string => typeof id === "string") : [];
  const currentUser = await requireCurrentUserContext();
  const rows = estimateIds.length > 0
    ? await all<EstimateRow & { workspace_id: string }>(
        database,
        `SELECT estimate.*, project.workspace_id FROM estimates estimate JOIN projects project ON project.id = estimate.project_id WHERE estimate.project_id = ? AND estimate.id IN (${placeholders(estimateIds)})`,
        [projectId, ...estimateIds],
      )
    : [];
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const eligibleIds: string[] = [];
  const blocked = [];
  for (const id of [...estimateIds].sort()) {
    const row = rowById.get(id);
    if (!row) {
      blocked.push({ id, code: "not_found", message: "Estimate was not found in this project." });
      continue;
    }
    const allowed = await canEditEstimateInD1(database, id, currentUser);
    if (!allowed) {
      blocked.push({ id, code: "forbidden", message: "Estimate edit access denied." });
      continue;
    }
    eligibleIds.push(id);
  }
  const summary = {
    requestedCount: estimateIds.length,
    eligibleCount: eligibleIds.length,
    blockedCount: blocked.length,
  };
  return {
    ok: eligibleIds.length > 0 && blocked.length === 0,
    targetType: "estimate_sheet",
    ids: [...estimateIds].sort(),
    eligibleIds,
    previewHash: createEstimateDeletePreviewHash({ eligibleIds, blocked, summary }),
    summary,
    issues: blocked,
    blocked,
  };
}

async function executeBulkDeleteEstimateSheets(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const preview = await previewBulkDeleteEstimateSheets(database, args) as Record<string, unknown>;
  if (preview.previewHash !== args.expected_preview_hash) {
    return {
      ...preview,
      ok: false,
      issues: [...(Array.isArray(preview.issues) ? preview.issues : []), { code: "stale_preview", message: "Preview changed; refresh the deletion preview." }],
      deletedIds: [],
    };
  }
  if (preview.ok !== true) return { ...preview, deletedIds: [] };
  const eligibleIds = Array.isArray(preview.eligibleIds) ? preview.eligibleIds.filter((id): id is string => typeof id === "string") : [];
  const project = await readProjectContext(database, projectId);
  if (!project) throw new Error("Project not found in the current workspace.");
  const deletedRows = await all<EstimateRowItemRow>(
    database,
    `SELECT * FROM estimate_row_items WHERE estimate_id IN (${placeholders(eligibleIds)})`,
    eligibleIds,
  );
  const currentUser = await requireCurrentUserContext();
  const correlationId = String(args.correlation_id ?? randomUUID());
  const existingAuditEvent = await first<{ id: string }>(
    database,
    `
      SELECT id
      FROM mass_deletion_events
      WHERE workspace_id = ?
        AND target_type = 'estimate_sheet'
        AND action = 'delete'
        AND correlation_id = ?
      LIMIT 1
    `,
    [project.workspace_id, correlationId],
  );
  const eventId = existingAuditEvent?.id ?? randomUUID();
  const now = nowIso();
  const estimateSql = placeholders(eligibleIds);
  await runBatch(database, [
    ...buildProjectComponentAttachmentDeleteRetentionStatements({
      workspaceId: project.workspace_id,
      projectId,
      sourceDeleteEventId: eventId,
      deletedRows,
      deletedAt: now,
    }),
    buildProjectPublicationRevisionForProject(projectId, project.workspace_id),
    { sql: `DELETE FROM estimate_sheet_user_preferences WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_sheet_access_settings WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_sheet_members WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_sheet_adjustments WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_sheet_events WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_row_items WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_nodes WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_tabs WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimate_favorites WHERE estimate_id IN (${estimateSql})`, values: eligibleIds },
    { sql: `DELETE FROM estimates WHERE project_id = ? AND id IN (${estimateSql})`, values: [projectId, ...eligibleIds] },
    {
      sql: `
      INSERT INTO mass_deletion_events (
        id,
        workspace_id,
        actor_user_id,
        target_type,
        action,
        target_ids_json,
        preview_hash,
        correlation_id,
        status,
        summary_json,
        blocked_json,
        storage_targets_json,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id, target_type, action, correlation_id) DO UPDATE SET
        target_ids_json = excluded.target_ids_json,
        preview_hash = excluded.preview_hash,
        status = excluded.status,
        summary_json = excluded.summary_json,
        blocked_json = excluded.blocked_json,
        updated_at = excluded.updated_at
      `,
      values: [
        eventId,
        project.workspace_id,
        currentUser.userId,
        "estimate_sheet",
        "delete",
        JSON.stringify(eligibleIds),
        args.expected_preview_hash,
        correlationId,
        "completed",
        JSON.stringify(preview.summary ?? {}),
        JSON.stringify(preview.blocked ?? []),
        "[]",
        "{}",
        now,
        now,
      ],
    },
  ]);
  return {
    ok: true,
    targetType: "estimate_sheet",
    ids: preview.ids,
    deletedIds: eligibleIds,
    auditEventId: eventId,
    previewHash: args.expected_preview_hash,
    summary: preview.summary,
    issues: [],
    blocked: [],
  };
}

type EstimateComponentEditImpactD1Row = {
  row_id: string;
  row_revision: number | string;
  project_id: string;
  project_name: string | null;
  estimate_id: string;
  estimate_name: string | null;
  link_state?: string | null;
  selected_price_option_id?: string | null;
};

type EstimateComponentPriceOptionImpactD1Row = {
  id: string;
  updated_at: string;
  is_active: number | boolean;
  is_default: number | boolean;
};

const PROJECT_COMPONENT_IDENTITY_SQL = `
  COALESCE(
    CASE
      WHEN json_extract(row_item.source_snapshot_json, '$.sourceType') IN ('project_component', 'promoted_project_component', 'promoted_express_component', 'express_component')
      THEN NULLIF(json_extract(row_item.source_snapshot_json, '$.sourceComponentId'), '')
    END,
    CASE
      WHEN json_extract(row_item.source_snapshot_json, '$.sourceType') IN ('project_component', 'promoted_project_component', 'promoted_express_component', 'express_component')
      THEN NULLIF(json_extract(row_item.source_snapshot_json, '$.sourceEstimateRowId'), '')
    END,
    NULLIF(json_extract(row_item.metadata_json, '$.projectComponentProjection.componentId'), ''),
    NULLIF(json_extract(row_item.metadata_json, '$.expressComponent.componentId'), ''),
    NULLIF(json_extract(row_item.metadata_json, '$.expressComponent.id'), '')
  )
`;

const COMPONENT_IMPACT_CONFLICT_MESSAGE = "Component usage changed while this edit was open. Review the latest impact and try again.";

function buildComponentImpactFingerprint(rows: Array<{ row_id: string; row_revision: number | string }>) {
  return [...rows]
    .sort((left, right) => left.row_id.localeCompare(right.row_id))
    .map((row) => `${row.row_id}:${readNumber(row.row_revision, 1)}`)
    .join("|");
}

function buildLibraryComponentImpactFingerprint(
  rows: EstimateComponentEditImpactD1Row[],
  priceOptions: EstimateComponentPriceOptionImpactD1Row[],
) {
  const rowFingerprint = [...rows]
    .sort((left, right) => left.row_id.localeCompare(right.row_id))
    .map((row) => [
      row.row_id,
      readNumber(row.row_revision, 1),
      row.link_state ?? "linked-clean",
      row.selected_price_option_id ?? "",
    ].join(":"))
    .join("|");
  const optionFingerprint = [...priceOptions]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((option) => [
      option.id,
      option.updated_at,
      Number(option.is_active) === 1 ? 1 : 0,
      Number(option.is_default) === 1 ? 1 : 0,
    ].join(":"))
    .join("|");
  return `rows[${rowFingerprint}]|options[${optionFingerprint}]`;
}

function buildEstimateComponentEditImpact(
  componentKind: EstimateComponentEditImpact["componentKind"],
  rows: EstimateComponentEditImpactD1Row[],
  fingerprint = buildComponentImpactFingerprint(rows),
): EstimateComponentEditImpact {
  const affectedByEstimate = new Map<string, EstimateComponentEditImpactEstimate>();
  const projectIds = new Set<string>();
  const optionUsageCounts: Record<string, number> = {};
  for (const row of rows) {
    projectIds.add(row.project_id);
    const selectedPriceOptionId = row.selected_price_option_id?.trim();
    if (selectedPriceOptionId) {
      optionUsageCounts[selectedPriceOptionId] = (optionUsageCounts[selectedPriceOptionId] ?? 0) + 1;
    }
    const existing = affectedByEstimate.get(row.estimate_id);
    if (existing) {
      existing.instanceCount += 1;
      if (selectedPriceOptionId) {
        existing.optionUsageCounts[selectedPriceOptionId] = (existing.optionUsageCounts[selectedPriceOptionId] ?? 0) + 1;
      }
      continue;
    }
    affectedByEstimate.set(row.estimate_id, {
      projectId: row.project_id,
      projectName: row.project_name?.trim() || "Untitled project",
      estimateId: row.estimate_id,
      estimateName: row.estimate_name?.trim() || "Untitled estimate",
      instanceCount: 1,
      optionUsageCounts: selectedPriceOptionId ? { [selectedPriceOptionId]: 1 } : {},
    });
  }
  return {
    componentKind,
    fingerprint,
    instanceCount: rows.length,
    projectCount: projectIds.size,
    estimateCount: affectedByEstimate.size,
    optionUsageCounts,
    affectedEstimates: [...affectedByEstimate.values()],
  };
}

async function previewEstimateComponentEditImpact(
  database: D1DatabaseLike,
  args: Record<string, unknown>,
  currentUser: CurrentUserContext,
) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const rowId = String(args.target_row_id ?? "");
  const sourceRow = await first<EstimateRowItemRow & { workspace_id: string }>(
    database,
    `
      SELECT row_item.*, row_item.source_snapshot_json, row_item.metadata_json, project.workspace_id
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      INNER JOIN projects project ON project.id = estimate.project_id
      WHERE row_item.id = ?
        AND row_item.estimate_id = ?
        AND project.id = ?
      LIMIT 1
    `,
    [rowId, estimateId, projectId],
  );
  if (!sourceRow) throw new Error("Estimate row item not found in the current project.");

  const sourceLinkState = typeof sourceRow.link_state === "string" ? sourceRow.link_state : null;
  const linkedLibraryItemId = typeof sourceRow.source_library_item_id === "string"
    && sourceRow.source_library_item_id.length > 0
    && sourceLinkState !== "detached"
    && sourceLinkState !== "unlinked"
    ? sourceRow.source_library_item_id
    : null;

  if (linkedLibraryItemId) {
    const canManageLibrary = await isWorkspaceEditorInD1(database, sourceRow.workspace_id, currentUser);
    if (!canManageLibrary) throw new Error("Only workspace editors/admins can inspect shared library usage.");
    const rows = await all<EstimateComponentEditImpactD1Row>(
      database,
      `
        SELECT
          row_item.id AS row_id,
          row_item.row_revision,
          project.id AS project_id,
          project.name AS project_name,
          estimate.id AS estimate_id,
          estimate.name AS estimate_name,
          row_item.link_state,
          COALESCE(
            NULLIF(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), ''),
            NULLIF(json_extract(row_item.metadata_json, '$.priceOptionId'), '')
          ) AS selected_price_option_id
        FROM estimate_row_items row_item
        INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
        INNER JOIN projects project ON project.id = estimate.project_id
        WHERE project.workspace_id = ?
          AND row_item.source_library_item_id = ?
          AND (row_item.link_state IS NULL OR row_item.link_state NOT IN ('detached', 'unlinked'))
        ORDER BY project.name COLLATE NOCASE, estimate.name COLLATE NOCASE, estimate.id, row_item.id
      `,
      [sourceRow.workspace_id, linkedLibraryItemId],
    );
    const priceOptions = await all<EstimateComponentPriceOptionImpactD1Row>(
      database,
      `
        SELECT id, updated_at, is_active, is_default
        FROM cost_library_item_price_options
        WHERE workspace_id = ?
          AND item_id = ?
        ORDER BY id
      `,
      [sourceRow.workspace_id, linkedLibraryItemId],
    );
    const initiatingRow = rows.find((row) => row.row_id === rowId);
    if (!initiatingRow || readNumber(initiatingRow.row_revision, 1) !== readNumber(sourceRow.row_revision, 1)) {
      throw new Error(COMPONENT_IMPACT_CONFLICT_MESSAGE);
    }
    return buildEstimateComponentEditImpact(
      "library",
      rows,
      buildLibraryComponentImpactFingerprint(rows, priceOptions),
    );
  }

  const componentId = getProjectComponentIdentity(rowMetadata(sourceRow), null, rowSourceSnapshot(sourceRow));
  const rows = await all<EstimateComponentEditImpactD1Row>(
    database,
    `
      SELECT
        row_item.id AS row_id,
        row_item.row_revision,
        project.id AS project_id,
        project.name AS project_name,
        estimate.id AS estimate_id,
        estimate.name AS estimate_name,
        COALESCE(
          NULLIF(json_extract(row_item.source_snapshot_json, '$.priceOptionId'), ''),
          NULLIF(json_extract(row_item.metadata_json, '$.priceOptionId'), '')
        ) AS selected_price_option_id
      FROM estimate_row_items row_item
      INNER JOIN estimates estimate ON estimate.id = row_item.estimate_id
      INNER JOIN projects project ON project.id = estimate.project_id
      WHERE project.id = ?
        AND (row_item.id = ? OR ${PROJECT_COMPONENT_IDENTITY_SQL} = ?)
      ORDER BY estimate.name COLLATE NOCASE, estimate.id, row_item.id
    `,
    [projectId, rowId, componentId],
  );
  const initiatingRow = rows.find((row) => row.row_id === rowId);
  if (!initiatingRow || readNumber(initiatingRow.row_revision, 1) !== readNumber(sourceRow.row_revision, 1)) {
    throw new Error(COMPONENT_IMPACT_CONFLICT_MESSAGE);
  }
  if (rows.length > 1) {
    const canEditProject = await canEditProjectInD1(database, projectId, currentUser);
    if (!canEditProject) throw new Error("Project edit access is required to update a component used across estimates.");
  }
  return buildEstimateComponentEditImpact("project", rows);
}

async function callEstimateAction<T>(
  database: D1DatabaseLike,
  name: string,
  args: Record<string, unknown>,
  currentUserOverride?: CurrentUserContext | null,
): Promise<T> {
  const currentUser = await resolveCurrentUserContext(currentUserOverride);
  if (name === "can_edit_estimate") {
    if (!currentUser) return false as T;
    return await canEditEstimateInD1(database, String(args.target_estimate_id ?? ""), currentUser) as T;
  }
  if (name === "can_edit_project") {
    if (!currentUser) return false as T;
    return await canEditProjectInD1(database, String(args.target_project_id ?? ""), currentUser) as T;
  }
  if (name === "validate_estimate_row_image_asset") return await validateImageAsset(database, args) as T;
  if (name === "get_estimate_activity_retention_metrics") {
    const projectId = String(args.target_project_id ?? "");
    const row = await first<{
      workspace_event_bytes: number;
      workspace_version_bytes: number;
      largest_event_payload_bytes: number;
      max_estimate_event_count: number;
      estimates_over_event_threshold: number;
      workspace_storage_over_threshold: number;
    }>(
      database,
      `
        SELECT
          COALESCE(SUM(length(payload) + length(COALESCE(old_snapshot, '')) + length(COALESCE(new_snapshot, ''))), 0) AS workspace_event_bytes,
          0 AS workspace_version_bytes,
          COALESCE(MAX(length(payload)), 0) AS largest_event_payload_bytes,
          COALESCE(MAX(event_count), 0) AS max_estimate_event_count,
          COALESCE(SUM(CASE WHEN event_count > 5000 THEN 1 ELSE 0 END), 0) AS estimates_over_event_threshold,
          0 AS workspace_storage_over_threshold
        FROM (
          SELECT event.estimate_id, COUNT(*) AS event_count, event.payload, event.old_snapshot, event.new_snapshot
          FROM estimate_sheet_events event
          WHERE event.project_id = ?
          GROUP BY event.estimate_id, event.id
        )
      `,
      [projectId],
    );
    return row as T;
  }
  if (ESTIMATE_EDIT_ACTIONS.has(name)) {
    if (!currentUser) throw new Error("Estimate edit access denied.");
    const allowed = await canEditEstimateInD1(database, String(args.target_estimate_id ?? ""), currentUser);
    if (!allowed) throw new Error("Estimate edit access denied.");
  }
  if (name === "preview_estimate_component_edit_impact") {
    return await previewEstimateComponentEditImpact(database, args, currentUser!) as T;
  }
  if (name === "update_estimate_details_with_history") return await updateEstimateDetails(database, args) as T;
  if (name === "create_estimate_tab_with_history") return await createEstimateTab(database, args) as T;
  if (name === "rename_estimate_tab_with_history") return await renameEstimateTab(database, args) as T;
  if (name === "reorder_estimate_tabs_with_history") return await reorderEstimateTabs(database, args) as T;
  if (name === "duplicate_estimate_tab_with_history") return await duplicateEstimateTab(database, args, currentUser!) as T;
  if (name === "archive_estimate_tab_with_history") return await archiveEstimateTab(database, args) as T;
  if (name === "delete_estimate_tab_with_history") return await deleteEstimateTab(database, args) as T;
  if (name === "create_estimate_node_with_history") return await createEstimateNode(database, args) as T;
  if (name === "rename_estimate_node_with_history") return await renameEstimateNode(database, args) as T;
  if (name === "reorder_estimate_nodes_with_history") return await reorderEstimateNodes(database, args) as T;
  if (name === "delete_estimate_node_with_history" || name === "delete_estimate_nodes_bulk_with_history") return await deleteEstimateNodes(database, args) as T;
  if (name === "insert_estimate_row_item_with_history") return await insertRowItem(database, args, currentUser!) as T;
  if (name === "duplicate_estimate_row_item_with_history") return await duplicateRowItem(database, args, currentUser!) as T;
  if (name === "update_estimate_row_item_with_history") return await patchRowItem(database, args, "row_updated", readJsonRecord(args.row_patch), currentUser!) as T;
  if (name === "replace_estimate_row_item_with_history") return await patchRowItem(database, args, "row_replaced", readJsonRecord(args.replacement_payload), currentUser!) as T;
  if (name === "delete_estimate_row_item_with_history") return await deleteRowItem(database, args, currentUser!) as T;
  if (name === "delete_estimate_row_items_bulk_with_history") return await deleteRowsBulk(database, args, currentUser!) as T;
  if (name === "move_estimate_row_item_with_history") return await moveRowItem(database, args, currentUser!) as T;
  if (name === "move_estimate_row_component_with_history") return await moveRowComponent(database, args, currentUser!) as T;
  if (name === "insert_estimate_template_into_estimate_with_history") return await copyTemplateNodes(database, args, currentUser!) as T;
  if (name === "insert_estimate_templates_into_estimate_with_history") return await copyTemplateNodes(database, args, currentUser!) as T;
  if (name === "insert_estimate_template_node_into_estimate_with_history") return await copyTemplateNodes(database, args, currentUser!, String(args.source_template_node_id ?? "")) as T;
  if (name === "update_estimate_sheet_adjustment_with_history") return await updateSheetAdjustment(database, args) as T;
  if (name === "preview_bulk_delete_estimate_sheets") return await previewBulkDeleteEstimateSheets(database, args) as T;
  if (name === "execute_bulk_delete_estimate_sheets") return await executeBulkDeleteEstimateSheets(database, args) as T;
  if (name === "restore_deleted_estimate_rows_with_history") return await restoreDeletedEstimateRows(database, args, currentUser!) as T;
  if (name === "restore_deleted_estimate_nodes_with_history") return await restoreDeletedEstimateNodes(database, args) as T;
  throw new Error(`Unsupported Cloudflare D1 estimate action: ${name}`);
}
