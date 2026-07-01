import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { requireCurrentUserContext } from "@/lib/auth/session";
import { canEditEstimateInD1, canEditProjectInD1 } from "@/lib/authz/d1-access";
import { getCloudflareD1Database, type D1DatabaseLike, type D1Value } from "@/lib/cloudflare/d1";
import { computeEstimateRowLineTotal, sumEstimateRowLineTotals } from "@/lib/estimates/estimate-row-total";
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

type HistoryEventInput = {
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
    sourceSnapshot: Json | null;
    metadata: Json;
    linkState: string;
    rowRevision: number;
  };
};

type TemplateNodeRow = {
  id: string;
  template_id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number | string | null;
  metadata: string | null;
};

type TemplateRowItemRow = {
  id: string;
  template_id: string;
  template_node_id: string;
  sort_order: number | string | null;
  source_library_item_id: string | null;
  source_snapshot: string | null;
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

async function insertHistoryEvent(database: D1DatabaseLike, input: HistoryEventInput) {
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
  if (existing) return existing.id;

  const project = input.workspaceId ? null : await readProjectContext(database, input.projectId);
  const workspaceId = input.workspaceId ?? project?.workspace_id;
  if (!workspaceId) throw new Error("Estimate history event workspace could not be resolved.");
  const eventId = randomUUID();
  await run(
    database,
    `
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
    [
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
      nowIso(),
    ],
  );
  return eventId;
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
    if (next.source_snapshot !== undefined && next.source_snapshot_json === undefined) next.source_snapshot_json = next.source_snapshot;
    if (next.metadata !== undefined && next.metadata_json === undefined) next.metadata_json = next.metadata;
    delete next.source_snapshot;
    delete next.metadata;
    if (next.row_revision === undefined) next.row_revision = 1;
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
      "created_at",
      "updated_at",
    ].forEach((key) => allowed.add(key));
  } else {
    throw new Error(`Unsupported D1 insert table: ${table}`);
  }
  return Object.keys(payload).filter((key) => allowed.has(key));
}

async function insertRecord(database: D1DatabaseLike, table: string, payload: Record<string, unknown>) {
  const record = assignInsertDefaults(table, payload);
  const columns = insertColumnsForTable(table, record);
  await run(
    database,
    `INSERT INTO ${table} (${columns.map(quoteColumn).join(", ")}) VALUES (${placeholders(columns)})`,
    columns.map((column) => record[column]),
  );
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

export class EstimateActionsD1Client {
  constructor(readonly database: D1DatabaseLike) {}

  from(table: string) {
    return new EstimateActionD1Query(this.database, table);
  }

  async call<T = unknown>(name: string, args: Record<string, unknown>): Promise<QueryResult<T>> {
    try {
      const data = await callEstimateAction<T>(this.database, name, args);
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
  await run(database, `UPDATE estimates SET ${assignments.join(", ")} WHERE id = ? AND project_id = ?`, values);
  await insertHistoryEvent(database, {
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
  const maxRow = await first<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_tabs WHERE estimate_id = ?",
    [estimateId],
  );
  const tabId = randomUUID();
  await insertRecord(database, "estimate_tabs", {
    id: tabId,
    estimate_id: estimateId,
    name: String(args.tab_name ?? "New Tab"),
    sort_order: readNumber(maxRow?.max_sort_order, -1000) + 1000,
    is_default: false,
    created_by: args.acting_user_id ?? null,
  });
  await insertHistoryEvent(database, {
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
  const tabId = String(args.target_tab_id ?? "");
  const tab = await readTabById(database, estimateId, tabId);
  if (!tab) throw new Error("Estimate tab not found in the current estimate.");
  const name = String(args.next_name ?? "").trim();
  await run(database, "UPDATE estimate_tabs SET name = ?, updated_at = ? WHERE id = ? AND estimate_id = ?", [name, nowIso(), tabId, estimateId]);
  await insertHistoryEvent(database, {
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
  const updates = Array.isArray(args.sort_updates) ? args.sort_updates as Array<Record<string, unknown>> : [];
  await runBatch(database, updates.map((update) => ({
    sql: "UPDATE estimate_tabs SET sort_order = ?, updated_at = ? WHERE id = ? AND estimate_id = ?",
    values: [readNumber(update.sort_order), nowIso(), update.id, estimateId],
  })));
  await insertHistoryEvent(database, {
    projectId,
    estimateId,
    eventType: "estimate_tabs_reordered",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    changedFields: ["sort_order"],
    payload: { updates },
  });
  return { estimateTabId: typeof updates[0]?.id === "string" ? updates[0].id : estimateId };
}

async function duplicateEstimateTab(database: D1DatabaseLike, args: Record<string, unknown>) {
  const estimateId = String(args.target_estimate_id ?? "");
  const projectId = String(args.target_project_id ?? "");
  const sourceTabId = String(args.source_tab_id ?? "");
  const sourceTab = await readTabById(database, estimateId, sourceTabId);
  if (!sourceTab) throw new Error("Estimate tab not found in the current estimate.");
  const maxRow = await first<{ max_sort_order: number | null }>(database, "SELECT MAX(sort_order) AS max_sort_order FROM estimate_tabs WHERE estimate_id = ?", [estimateId]);
  const nextTabId = randomUUID();
  await insertRecord(database, "estimate_tabs", {
    id: nextTabId,
    estimate_id: estimateId,
    name: typeof args.next_name === "string" && args.next_name.trim() ? args.next_name.trim() : `${sourceTab.name} Copy`,
    sort_order: readNumber(maxRow?.max_sort_order, -1000) + 1000,
    is_default: false,
    metadata: sourceTab.metadata,
    created_by: args.acting_user_id ?? null,
  });
  const nodes = await all<EstimateNodeRow>(database, "SELECT * FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ? ORDER BY sort_order ASC", [estimateId, sourceTabId]);
  const nodeIdBySource = new Map<string, string>();
  for (const node of nodes.map(serializeNodeRow)) {
    const nextNodeId = randomUUID();
    nodeIdBySource.set(node.id, nextNodeId);
    await insertRecord(database, "estimate_nodes", {
      id: nextNodeId,
      estimate_id: estimateId,
      estimate_tab_id: nextTabId,
      parent_id: node.parent_id ? nodeIdBySource.get(node.parent_id) ?? null : null,
      kind: node.kind,
      name: node.name,
      sort_order: node.sort_order,
      metadata_json: node.metadata,
    });
  }
  if (nodeIdBySource.size > 0) {
    const sourceNodeIds = [...nodeIdBySource.keys()];
    const rows = await all<EstimateRowItemRow>(
      database,
      `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(sourceNodeIds)}) ORDER BY sort_order ASC`,
      [estimateId, ...sourceNodeIds],
    );
    for (const row of rows.map(serializeRowItem)) {
      const nextNodeId = row.node_id ? nodeIdBySource.get(row.node_id) : null;
      if (!nextNodeId) continue;
      await insertRecord(database, "estimate_row_items", {
        ...row,
        id: randomUUID(),
        node_id: nextNodeId,
        source_snapshot: row.source_snapshot,
        metadata: row.metadata,
      });
    }
  }
  await insertHistoryEvent(database, {
    projectId,
    estimateId,
    estimateTabId: nextTabId,
    eventType: "estimate_tab_duplicated",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    payload: { sourceTabId, tabId: nextTabId },
  });
  return { estimateTabId: nextTabId };
}

async function archiveEstimateTab(database: D1DatabaseLike, args: Record<string, unknown>) {
  const estimateId = String(args.target_estimate_id ?? "");
  const projectId = String(args.target_project_id ?? "");
  const tabId = String(args.target_tab_id ?? "");
  await run(database, "UPDATE estimate_tabs SET archived_at = ?, updated_at = ? WHERE id = ? AND estimate_id = ?", [nowIso(), nowIso(), tabId, estimateId]);
  await insertHistoryEvent(database, {
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
  const tabId = String(args.target_tab_id ?? "");
  const replacement = await first<{ id: string }>(
    database,
    "SELECT id FROM estimate_tabs WHERE estimate_id = ? AND id <> ? AND archived_at IS NULL ORDER BY is_default DESC, sort_order ASC LIMIT 1",
    [estimateId, tabId],
  );
  const nodes = await all<{ id: string }>(database, "SELECT id FROM estimate_nodes WHERE estimate_id = ? AND estimate_tab_id = ?", [estimateId, tabId]);
  const nodeIds = nodes.map((node) => node.id);
  if (nodeIds.length > 0) {
    await run(database, `DELETE FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(nodeIds)})`, [estimateId, ...nodeIds]);
    await run(database, `DELETE FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(nodeIds)})`, [estimateId, ...nodeIds]);
  }
  await run(database, "DELETE FROM estimate_tabs WHERE id = ? AND estimate_id = ?", [tabId, estimateId]);
  await insertHistoryEvent(database, {
    projectId,
    estimateId,
    estimateTabId: tabId,
    eventType: "estimate_tab_deleted",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    payload: { tabId, replacementTabId: replacement?.id ?? null, deletedNodeIds: nodeIds },
  });
  return { estimateTabId: tabId, replacementTabId: replacement?.id ?? null };
}

async function createEstimateNode(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const nodeId = randomUUID();
  await insertRecord(database, "estimate_nodes", {
    id: nodeId,
    estimate_id: estimateId,
    estimate_tab_id: args.target_tab_id ?? null,
    parent_id: args.parent_node_id ?? null,
    kind: args.node_kind ?? "group",
    name: args.node_name ?? "Untitled",
    sort_order: readNumber(args.initial_sort_order),
    metadata_json: {},
  });
  const eventId = await insertHistoryEvent(database, {
    projectId,
    estimateId,
    estimateNodeId: nodeId,
    estimateTabId: typeof args.target_tab_id === "string" ? args.target_tab_id : null,
    eventType: "estimate_node_created",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    payload: { nodeId, name: args.node_name, kind: args.node_kind, parentNodeId: args.parent_node_id ?? null },
  });
  return { nodeId, eventId, payload: { nodeId } };
}

async function renameEstimateNode(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const nodeId = String(args.target_node_id ?? "");
  const node = await readNodeById(database, estimateId, nodeId);
  if (!node) throw new Error("Estimate tree node not found in the current project.");
  const name = String(args.next_name ?? "").trim();
  await run(database, "UPDATE estimate_nodes SET name = ?, updated_at = ? WHERE id = ? AND estimate_id = ?", [name, nowIso(), nodeId, estimateId]);
  await insertHistoryEvent(database, {
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
  const updates = Array.isArray(args.move_updates) ? args.move_updates as Array<Record<string, unknown>> : [];
  await runBatch(database, updates.map((update) => ({
    sql: "UPDATE estimate_nodes SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ? AND estimate_id = ?",
    values: [update.parent_id ?? null, readNumber(update.sort_order), nowIso(), update.id, estimateId],
  })));
  await insertHistoryEvent(database, {
    projectId,
    estimateId,
    eventType: "estimate_nodes_reordered",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    changedFields: ["parent_id", "sort_order"],
    payload: { updates },
  });
  return { updatedNodeCount: updates.length };
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
  const rootIds = Array.isArray(args.target_node_ids)
    ? args.target_node_ids.filter((id): id is string => typeof id === "string")
    : [String(args.target_node_id ?? "")].filter(Boolean);
  const deletedNodeIds = await collectDescendantNodeIds(database, estimateId, rootIds);
  const deletedRows = deletedNodeIds.length
    ? await all<EstimateRowItemRow>(database, `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(deletedNodeIds)})`, [estimateId, ...deletedNodeIds])
    : [];
  if (deletedNodeIds.length > 0) {
    await run(database, `DELETE FROM estimate_row_items WHERE estimate_id = ? AND node_id IN (${placeholders(deletedNodeIds)})`, [estimateId, ...deletedNodeIds]);
    await run(database, `DELETE FROM estimate_nodes WHERE estimate_id = ? AND id IN (${placeholders(deletedNodeIds)})`, [estimateId, ...deletedNodeIds]);
  }
  const fallback = await first<{ id: string }>(database, "SELECT id FROM estimate_nodes WHERE estimate_id = ? ORDER BY sort_order ASC LIMIT 1", [estimateId]);
  const eventId = await insertHistoryEvent(database, {
    projectId,
    estimateId,
    estimateNodeId: rootIds[0] ?? null,
    eventType: rootIds.length > 1 ? "estimate_nodes_deleted" : "estimate_node_deleted",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    oldSnapshot: { nodeIds: deletedNodeIds, rows: deletedRows.map(serializeRowItem) },
    payload: { deletedNodeIds, fallbackNodeId: fallback?.id ?? null },
  });
  return { eventId, deletedNodeIds, fallbackNodeId: fallback?.id ?? null, payload: { deletedNodeIds, fallbackNodeId: fallback?.id ?? null } };
}

async function insertRowItem(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const nodeId = String(args.target_node_id ?? "");
  const payload = readJsonRecord(args.row_payload);
  const sort = await first<{ max_sort_order: number | null }>(
    database,
    "SELECT MAX(sort_order) AS max_sort_order FROM estimate_row_items WHERE estimate_id = ? AND node_id = ?",
    [estimateId, nodeId],
  );
  const rowId = typeof payload.id === "string" && payload.id ? payload.id : randomUUID();
  await insertRecord(database, "estimate_row_items", {
    id: rowId,
    estimate_id: estimateId,
    node_id: nodeId,
    source_library_item_id: payload.sourceLibraryItemId ?? null,
    source_snapshot: payload.sourceSnapshot ?? null,
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
    sort_order: readNumber(sort?.max_sort_order, -1000) + 1000,
  });
  const row = await readRowById(database, estimateId, rowId);
  if (!row) throw new Error("Estimate row item was not created.");
  const eventId = await insertHistoryEvent(database, {
    projectId,
    estimateId,
    estimateNodeId: nodeId,
    targetRowId: rowId,
    eventType: "row_inserted",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    newSnapshot: row,
    rowContext: { material: row.material, supplier: row.supplier },
    payload: { rowId },
    totalDelta: computeEstimateRowLineTotal(row),
  });
  return rowItemHistoryResult(row, eventId);
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
    categoryNodeId: "category_node_id",
    supplierId: "supplier_id",
    discipline: "discipline",
    designation: "designation",
  };
  for (const [key, column] of Object.entries(mapping)) {
    if (!Object.prototype.hasOwnProperty.call(rowPatch, key)) continue;
    const value = rowPatch[key];
    columns.push([column, column.endsWith("_json") ? jsonString(value, column === "source_snapshot_json" ? null : {}) : value]);
  }
  return columns;
}

async function patchRowItem(database: D1DatabaseLike, args: Record<string, unknown>, eventType: string, rowPatch: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const rowId = String(args.target_row_id ?? "");
  const row = await readRowById(database, estimateId, rowId);
  if (!row) throw new Error("Estimate row item not found in the current project.");
  const expected = args.expected_row_revision === null || args.expected_row_revision === undefined ? readNumber(row.row_revision, 1) : readNumber(args.expected_row_revision);
  if (readNumber(row.row_revision, 1) !== expected) throw new Error("Estimate row revision conflict.");
  const columns = updateValuesForRowPatch(rowPatch);
  if (columns.length === 0) return rowItemHistoryResult(row);
  const nextRevision = readNumber(row.row_revision, 1) + 1;
  const assignments = columns.map(([column]) => `${column} = ?`);
  const values = columns.map(([, value]) => value);
  assignments.push("row_revision = ?", "updated_at = ?");
  values.push(nextRevision, nowIso(), rowId, estimateId);
  await run(database, `UPDATE estimate_row_items SET ${assignments.join(", ")} WHERE id = ? AND estimate_id = ?`, values);
  const updated = await readRowById(database, estimateId, rowId);
  if (!updated) throw new Error("Estimate row item was not found after update.");
  const eventId = await insertHistoryEvent(database, {
    projectId,
    estimateId,
    estimateNodeId: updated.node_id,
    targetRowId: rowId,
    eventType,
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    changedFields: columns.map(([column]) => column),
    oldSnapshot: row,
    newSnapshot: updated,
    rowContext: { material: updated.material, supplier: updated.supplier },
    payload: { rowId },
    totalDelta: computeEstimateRowLineTotal(updated) - computeEstimateRowLineTotal(row),
  });
  return rowItemHistoryResult(updated, eventId);
}

async function deleteRowItem(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const rowId = String(args.target_row_id ?? "");
  const row = await readRowById(database, estimateId, rowId);
  if (!row) throw new Error("Estimate row item not found in the current project.");
  const expected = args.expected_row_revision === null || args.expected_row_revision === undefined ? readNumber(row.row_revision, 1) : readNumber(args.expected_row_revision);
  if (readNumber(row.row_revision, 1) !== expected) throw new Error("Estimate row revision conflict.");
  await run(database, "DELETE FROM estimate_row_items WHERE id = ? AND estimate_id = ?", [rowId, estimateId]);
  const eventId = await insertHistoryEvent(database, {
    projectId,
    estimateId,
    estimateNodeId: row.node_id,
    targetRowId: rowId,
    eventType: "row_deleted",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    oldSnapshot: row,
    rowContext: { material: row.material, supplier: row.supplier },
    payload: { rowId, deletedRow: rowItemHistoryResult(row).row },
    totalDelta: -computeEstimateRowLineTotal(row),
  });
  return { eventId, rowId, deletedRow: rowItemHistoryResult(row).row, payload: { rowId, deletedRow: rowItemHistoryResult(row).row } };
}

async function moveRowItem(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const updates = Array.isArray(args.move_updates) ? args.move_updates as Array<Record<string, unknown>> : [];
  const rows: Array<{ rowId: string; nodeId: string; sortOrder: number; rowRevision: number }> = [];
  for (const update of updates) {
    const rowId = String(update.rowId ?? "");
    const current = await readRowById(database, estimateId, rowId);
    if (!current) throw new Error("Estimate row item not found in the current project.");
    const expected = readNumber(update.expectedRowRevision);
    if (expected && readNumber(current.row_revision, 1) !== expected) throw new Error("Estimate row revision conflict.");
    const nextRevision = readNumber(current.row_revision, 1) + 1;
    const nodeId = String(update.nodeId ?? "");
    const sortOrder = readNumber(update.sortOrder);
    await run(database, "UPDATE estimate_row_items SET node_id = ?, sort_order = ?, row_revision = ?, updated_at = ? WHERE id = ? AND estimate_id = ?", [nodeId, sortOrder, nextRevision, nowIso(), rowId, estimateId]);
    rows.push({ rowId, nodeId, sortOrder, rowRevision: nextRevision });
  }
  const eventId = await insertHistoryEvent(database, {
    projectId,
    estimateId,
    estimateNodeId: String(args.target_node_id ?? "") || null,
    targetRowId: String(args.moved_row_id ?? "") || null,
    eventType: "rows_moved",
    actorUserId: null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    payload: { rows, updatedRowCount: rows.length },
  });
  return { eventId, updatedRowCount: rows.length, rows, payload: { eventId, updatedRowCount: rows.length, rows } };
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
  await run(
    database,
    `
      INSERT INTO estimate_sheet_adjustments (estimate_id, mode, percentage, row_revision, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(estimate_id, mode) DO UPDATE SET
        percentage = excluded.percentage,
        row_revision = excluded.row_revision,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `,
    [estimateId, mode, percentage, rowRevision, updatedAt, updatedBy],
  );
  const eventId = await insertHistoryEvent(database, {
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

async function deleteRowsBulk(database: D1DatabaseLike, args: Record<string, unknown>) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const rowIds = Array.isArray(args.target_row_ids) ? args.target_row_ids.filter((id): id is string => typeof id === "string") : [];
  if (rowIds.length === 0) throw new Error("Select at least one estimate row.");
  const rows = await all<EstimateRowItemRow>(database, `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(rowIds)})`, [estimateId, ...rowIds]);
  if (rows.length !== rowIds.length) throw new Error("One or more estimate row items were not found in the current project.");
  await run(database, `DELETE FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(rowIds)})`, [estimateId, ...rowIds]);
  const eventId = await insertHistoryEvent(database, {
    projectId,
    estimateId,
    eventType: "rows_deleted",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    oldSnapshot: { rows: rows.map(serializeRowItem) },
    payload: { deletedRowIds: rowIds, deletedRowCount: rowIds.length },
    totalDelta: -sumEstimateRowLineTotals(rows),
  });
  return { eventId, deletedRowIds: rowIds, deletedRowCount: rowIds.length, payload: { eventId, deletedRowIds: rowIds, deletedRowCount: rowIds.length } };
}

async function copyTemplateNodes(database: D1DatabaseLike, args: Record<string, unknown>, sourceRootNodeId?: string | null) {
  const projectId = String(args.target_project_id ?? "");
  const estimateId = String(args.target_estimate_id ?? "");
  const templateId = String(args.source_template_id ?? "");
  const targetParentNodeId = String(args.target_parent_node_id ?? "");
  const parentNode = await readNodeById(database, estimateId, targetParentNodeId);
  const targetTabId = typeof args.target_tab_id === "string" ? args.target_tab_id : parentNode?.estimate_tab_id ?? null;
  const templateNodes = await all<TemplateNodeRow>(database, "SELECT * FROM estimate_template_nodes WHERE template_id = ? ORDER BY sort_order ASC", [templateId]);
  const templateRows = await all<TemplateRowItemRow>(database, "SELECT * FROM estimate_template_row_items WHERE template_id = ? ORDER BY sort_order ASC", [templateId]);
  const allowedNodeIds = sourceRootNodeId
    ? new Set(await collectTemplateDescendantNodeIds(templateNodes, sourceRootNodeId))
    : new Set(templateNodes.map((node) => node.id));
  const nodesToCopy = templateNodes.filter((node) => allowedNodeIds.has(node.id));
  const sourceRoots = nodesToCopy.filter((node) => !node.parent_id || !allowedNodeIds.has(node.parent_id));
  const nodeIdBySource = new Map<string, string>();
  const insertedRootNodeIds: string[] = [];
  for (const node of nodesToCopy) {
    const nextNodeId = randomUUID();
    nodeIdBySource.set(node.id, nextNodeId);
    if (sourceRoots.some((root) => root.id === node.id)) insertedRootNodeIds.push(nextNodeId);
    await insertRecord(database, "estimate_nodes", {
      id: nextNodeId,
      estimate_id: estimateId,
      estimate_tab_id: targetTabId,
      parent_id: node.parent_id && nodeIdBySource.has(node.parent_id) ? nodeIdBySource.get(node.parent_id) : targetParentNodeId,
      kind: node.kind,
      name: node.name,
      sort_order: readNumber(node.sort_order),
      metadata_json: readJson(node.metadata, {}),
    });
  }
  let insertedRowItemCount = 0;
  for (const row of templateRows) {
    if (!allowedNodeIds.has(row.template_node_id)) continue;
    const nodeId = nodeIdBySource.get(row.template_node_id);
    if (!nodeId) continue;
    await insertRecord(database, "estimate_row_items", {
      id: randomUUID(),
      estimate_id: estimateId,
      node_id: nodeId,
      sort_order: readNumber(row.sort_order),
      source_library_item_id: row.source_library_item_id,
      source_snapshot: readJson(row.source_snapshot, null),
      category_node_id: row.category_node_id,
      supplier_id: row.supplier_id,
      material: row.material ?? "",
      description: row.description ?? "",
      supplier: row.supplier ?? "",
      unit: row.unit ?? "unit",
      quantity: readNumber(row.quantity),
      unit_cost: readNumber(row.unit_cost),
      misc_cost: readNumber(row.misc_cost),
      contingency_percentage: readNumber(row.contingency_percentage),
      adjustment_percentage: readNumber(row.adjustment_percentage),
      discipline: row.discipline ?? "",
      designation: row.designation ?? "",
      link_state: row.link_state ?? "unlinked",
      metadata: readJson(row.metadata, {}),
    });
    insertedRowItemCount += 1;
  }
  const eventId = await insertHistoryEvent(database, {
    projectId,
    estimateId,
    estimateNodeId: targetParentNodeId,
    estimateTabId: targetTabId,
    eventType: sourceRootNodeId ? "template_node_subtree_inserted" : "template_inserted",
    actorUserId: String(args.acting_user_id ?? "") || null,
    correlationId: String(args.correlation_id ?? randomUUID()),
    payload: {
      inserted_root_node_ids: insertedRootNodeIds,
      inserted_node_count: nodeIdBySource.size,
      inserted_row_item_count: insertedRowItemCount,
      sourceTemplateId: templateId,
      sourceTemplateNodeId: sourceRootNodeId ?? null,
    },
  });
  return {
    eventId,
    insertedRootNodeIds,
    inserted_root_node_ids: insertedRootNodeIds,
    insertedRootNodeId: insertedRootNodeIds[0] ?? null,
    inserted_root_node_id: insertedRootNodeIds[0] ?? null,
  };
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
  const estimateIds = Array.isArray(args.target_estimate_ids) ? args.target_estimate_ids.filter((id): id is string => typeof id === "string") : [];
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
  const estimateSql = placeholders(eligibleIds);
  await runBatch(database, [
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
  ]);
  const eventId = randomUUID();
  const now = nowIso();
  await run(
    database,
    `
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
    [
      eventId,
      project.workspace_id,
      (await requireCurrentUserContext()).userId,
      "estimate_sheet",
      "delete",
      JSON.stringify(eligibleIds),
      args.expected_preview_hash,
      String(args.correlation_id ?? randomUUID()),
      "completed",
      JSON.stringify(preview.summary ?? {}),
      JSON.stringify(preview.blocked ?? []),
      "[]",
      "{}",
      now,
      now,
    ],
  );
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

async function callEstimateAction<T>(database: D1DatabaseLike, name: string, args: Record<string, unknown>): Promise<T> {
  const currentUser = await requireCurrentUserContext().catch(() => null);
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
  if (name === "update_estimate_details_with_history") return await updateEstimateDetails(database, args) as T;
  if (name === "create_estimate_tab_with_history") return await createEstimateTab(database, args) as T;
  if (name === "rename_estimate_tab_with_history") return await renameEstimateTab(database, args) as T;
  if (name === "reorder_estimate_tabs_with_history") return await reorderEstimateTabs(database, args) as T;
  if (name === "duplicate_estimate_tab_with_history") return await duplicateEstimateTab(database, args) as T;
  if (name === "archive_estimate_tab_with_history") return await archiveEstimateTab(database, args) as T;
  if (name === "delete_estimate_tab_with_history") return await deleteEstimateTab(database, args) as T;
  if (name === "create_estimate_node_with_history") return await createEstimateNode(database, args) as T;
  if (name === "rename_estimate_node_with_history") return await renameEstimateNode(database, args) as T;
  if (name === "reorder_estimate_nodes_with_history") return await reorderEstimateNodes(database, args) as T;
  if (name === "delete_estimate_node_with_history" || name === "delete_estimate_nodes_bulk_with_history") return await deleteEstimateNodes(database, args) as T;
  if (name === "insert_estimate_row_item_with_history") return await insertRowItem(database, args) as T;
  if (name === "update_estimate_row_item_with_history") return await patchRowItem(database, args, "row_updated", readJsonRecord(args.row_patch)) as T;
  if (name === "replace_estimate_row_item_with_history") return await patchRowItem(database, args, "row_replaced", readJsonRecord(args.replacement_payload)) as T;
  if (name === "unlink_estimate_row_item_from_library_with_history") {
    return await patchRowItem(database, args, "row_unlinked", {
      sourceLibraryItemId: null,
      linkState: "detached",
      sourceSnapshot: null,
    }) as T;
  }
  if (name === "delete_estimate_row_item_with_history") return await deleteRowItem(database, args) as T;
  if (name === "delete_estimate_row_items_bulk_with_history") return await deleteRowsBulk(database, args) as T;
  if (name === "move_estimate_row_item_with_history") return await moveRowItem(database, args) as T;
  if (name === "move_estimate_row_component_with_history") {
    const source = await patchRowItem(database, {
      ...args,
      target_row_id: args.source_row_id,
      expected_row_revision: args.expected_source_row_revision,
    }, "row_component_moved", readJsonRecord(args.source_replacement_payload));
    const target = await patchRowItem(database, {
      ...args,
      target_row_id: args.target_row_id,
      expected_row_revision: args.expected_target_row_revision,
    }, "row_component_moved", readJsonRecord(args.target_replacement_payload));
    return { sourceRow: source.row, targetRow: target.row, payload: { sourceRow: source.row, targetRow: target.row } } as T;
  }
  if (name === "insert_estimate_template_into_estimate_with_history") return await copyTemplateNodes(database, args) as T;
  if (name === "insert_estimate_template_node_into_estimate_with_history") return await copyTemplateNodes(database, args, String(args.source_template_node_id ?? "")) as T;
  if (name === "update_estimate_sheet_adjustment_with_history") return await updateSheetAdjustment(database, args) as T;
  if (name === "preview_bulk_delete_estimate_sheets") return await previewBulkDeleteEstimateSheets(database, args) as T;
  if (name === "execute_bulk_delete_estimate_sheets") return await executeBulkDeleteEstimateSheets(database, args) as T;
  if (name === "restore_deleted_estimate_rows_with_history") {
    throw new Error("Deleted row restore requires a Cloudflare D1 history snapshot and is not available for this event.");
  }
  if (name === "restore_deleted_estimate_nodes_with_history") {
    throw new Error("Deleted node restore requires a Cloudflare D1 history snapshot and is not available for this event.");
  }
  throw new Error(`Unsupported Cloudflare D1 estimate action: ${name}`);
}
