import { describe, expect, it, vi } from "vitest";

import type { CurrentUserContext } from "@/lib/auth/session";
import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";
import { EstimateActionsD1Client } from "@/lib/estimates/d1-action-client";

vi.mock("server-only", () => ({}));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const ESTIMATE_ID = "44444444-4444-4444-8444-444444444444";
const TAB_ID = "55555555-5555-4555-8555-555555555555";
const DUPLICATED_ROW_ID = "66666666-6666-4666-8666-666666666669";

type Row = Record<string, D1Value | undefined>;
type Event = {
  id: string;
  estimate_id: string;
  workspace_id: string;
  project_id: string;
  event_type: string;
  correlation_id: string;
  payload: unknown;
  old_snapshot: unknown;
  new_snapshot?: unknown;
};
type Receipt = {
  actor_user_id: string;
  request_fingerprint: string;
  result_json: string;
  status: string;
};

function parseJson(value: unknown) {
  if (typeof value !== "string") return value;
  return JSON.parse(value) as unknown;
}

function user(): CurrentUserContext {
  const now = "2026-07-11T00:00:00.000Z";
  return {
    avatarUrl: null,
    displayName: "Owner",
    email: "owner@example.test",
    profile: { avatar_url: null, created_at: now, default_workspace_id: WORKSPACE_ID, display_name: "Owner", email: "owner@example.test", id: USER_ID, role: "member", updated_at: now },
    role: "member",
    userId: USER_ID,
  };
}

class Statement<T = Record<string, unknown>> {
  values: D1Value[] = [];

  constructor(private readonly database: RestoreDatabase, readonly sql: string) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    this.database.operationLog.push({ kind: "first", sql: this.sql });
    if (this.sql.includes("SELECT 1 AS allowed")) return { allowed: 1 } as R;
    if (this.sql.includes("FROM estimate_mutation_receipts")) {
      return (this.database.receipts.get(this.database.receiptKey(this.values[0], this.values[1], this.values[2])) ?? null) as R | null;
    }
    if (this.sql.includes("SELECT id, payload") && this.sql.includes("correlation_id")) {
      const event = this.database.events.find((candidate) => candidate.estimate_id === this.values[0] && candidate.correlation_id === this.values[1]);
      return event ? { id: event.id, payload: JSON.stringify(event.payload) } as R : null;
    }
    if (this.sql.includes("SELECT id, estimate_id") && this.sql.includes("new_snapshot")) {
      const event = this.database.events.find((candidate) => candidate.estimate_id === this.values[0] && candidate.correlation_id === this.values[1]);
      return event ? { ...event, payload: JSON.stringify(event.payload), new_snapshot: JSON.stringify(event.new_snapshot ?? null) } as R : null;
    }
    if (this.sql.includes("SELECT *") && this.sql.includes("FROM estimate_sheet_events")) {
      const event = this.database.events.find((candidate) => candidate.id === this.values[0]
        && candidate.estimate_id === this.values[1]
        && candidate.project_id === this.values[2]
        && candidate.workspace_id === this.values[3]);
      return event ? { ...event, old_snapshot: JSON.stringify(event.old_snapshot), payload: JSON.stringify(event.payload) } as R : null;
    }
    if (this.sql.includes("SELECT id, workspace_id") && this.sql.includes("FROM projects")) {
      return this.values[0] === PROJECT_ID ? { id: PROJECT_ID, workspace_id: WORKSPACE_ID } as R : null;
    }
    if (this.sql.includes("SELECT estimate.id")) {
      return this.values[0] === ESTIMATE_ID && this.values[1] === PROJECT_ID
        ? { id: ESTIMATE_ID, project_id: PROJECT_ID, workspace_id: WORKSPACE_ID } as R
        : null;
    }
    if (this.sql.includes("SELECT MAX(sort_order) AS max_sort_order")) {
      const sortOrders = [...this.database.rows.values()]
        .filter((row) => row.estimate_id === this.values[0] && row.node_id === this.values[1])
        .map((row) => Number(row.sort_order ?? 0));
      return { max_sort_order: sortOrders.length > 0 ? Math.max(...sortOrders) : null } as R;
    }
    if (this.sql.includes("FROM estimate_row_items") && this.sql.includes("WHERE estimate_id = ?")) {
      const row = this.database.rows.get(String(this.values[1]));
      return row?.estimate_id === this.values[0] ? { ...row } as R : null;
    }
    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    this.database.operationLog.push({ kind: "all", sql: this.sql });
    if (this.sql.includes("FROM estimate_nodes node") && this.sql.includes("node.id IN")) {
      const ids = new Set(this.values.slice(1).map(String));
      return {
        success: true,
        results: [...this.database.nodes.values()]
          .filter((node) => node.estimate_id === this.values[0] && ids.has(String(node.id)))
          .map((node) => ({
            id: node.id,
            estimate_tab_id: node.estimate_tab_id,
            kind: node.kind,
            archived_at: null,
          })) as R[],
      };
    }
    if (this.sql.includes("FROM estimate_row_items") && this.sql.includes("id IN")) {
      const ids = new Set(this.values.slice(1).map(String));
      return { success: true, results: [...this.database.rows.values()].filter((row) => row.estimate_id === this.values[0] && ids.has(String(row.id))).map((row) => ({ ...row })) as R[] };
    }
    return { success: true, results: [] };
  }

  apply() {
    if (this.sql.startsWith("INSERT INTO estimate_row_items")) {
      const columns = this.sql.slice(this.sql.indexOf("(") + 1, this.sql.indexOf(")")).split(",").map((column) => column.trim());
      for (let offset = 0; offset < this.values.length; offset += columns.length) {
        const row = Object.fromEntries(columns.map((column, index) => [column, this.values[offset + index]]));
        this.database.rows.set(String(row.id), row);
      }
    }
    if (this.sql.includes("INSERT INTO estimate_sheet_events")) {
      const values = this.values;
      this.database.events.push({
        id: String(values[0]), estimate_id: String(values[1]), workspace_id: String(values[2]), project_id: String(values[3]),
        event_type: String(values[7]), correlation_id: String(values[9]), old_snapshot: parseJson(values[13]), new_snapshot: parseJson(values[14]), payload: parseJson(values[15]),
      });
    }
    if (this.sql.includes("INSERT INTO estimate_mutation_receipts")) {
      this.database.receipts.set(this.database.receiptKey(this.values[1], this.values[2], this.values[3]), {
        actor_user_id: String(this.values[4]),
        request_fingerprint: String(this.values[7]),
        result_json: String(this.values[8]),
        status: "committed",
      });
    }
    return { success: true, meta: { changes: 1 } };
  }

  async run(): Promise<D1Result<T>> {
    return this.apply() as D1Result<T>;
  }
}

class RestoreDatabase implements D1DatabaseLike {
  rows = new Map<string, Row>();
  nodes = new Map<string, Row>([["node-1", {
    id: "node-1",
    estimate_id: ESTIMATE_ID,
    estimate_tab_id: TAB_ID,
    kind: "area",
  }]]);
  events: Event[] = [];
  receipts = new Map<string, Receipt>();
  batchCount = 0;
  failNextBatch = false;
  operationLog: Array<{ kind: "first" | "all" | "batch"; sql?: string }> = [];

  receiptKey(workspaceId: unknown, commandKind: unknown, intentId: unknown) {
    return `${String(workspaceId)}:${String(commandKind)}:${String(intentId)}`;
  }

  prepare<T = Record<string, unknown>>(sql: string) {
    return new Statement<T>(this, sql);
  }

  async batch<T = Record<string, unknown>>(statements: Array<D1PreparedStatementLike<T>>): Promise<Array<D1Result<T>>> {
    this.batchCount += 1;
    this.operationLog.push({ kind: "batch" });
    if (this.failNextBatch) {
      this.failNextBatch = false;
      return statements.map(() => ({ success: false } as D1Result<T>));
    }
    return (statements as Array<Statement<T>>).map((statement) => statement.apply() as D1Result<T>);
  }
}

function snapshotRow(id: string): Row {
  return {
    id,
    estimate_id: ESTIMATE_ID,
    node_id: "node-1",
    material: `Material ${id}`,
    description: "",
    designation: "",
    discipline: "",
    quantity: 1,
    unit: "ea",
    unit_cost: 10,
    misc_cost: 0,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    sort_order: 1,
    row_revision: 1,
    link_state: "unlinked",
  };
}

function seedDeleteEvent(database: RestoreDatabase, rows = [snapshotRow("row-1"), snapshotRow("row-2")], eventType = "rows_deleted") {
  database.events.push({
    id: "delete-event-1",
    estimate_id: ESTIMATE_ID,
    workspace_id: WORKSPACE_ID,
    project_id: PROJECT_ID,
    event_type: eventType,
    correlation_id: "delete-correlation",
    old_snapshot: { rows },
    payload: { deletedRowIds: rows.map((row) => row.id) },
  });
}

function restore(client: EstimateActionsD1Client, correlationId = "restore-correlation", rowIds?: string[]) {
  return client.call("restore_deleted_estimate_rows_with_history", {
    target_project_id: PROJECT_ID,
    target_estimate_id: ESTIMATE_ID,
    source_delete_event_id: "delete-event-1",
    target_row_ids: rowIds,
    acting_user_id: USER_ID,
    correlation_id: correlationId,
    target_active_tab_id: TAB_ID,
  });
}

function duplicate(
  client: EstimateActionsD1Client,
  options: {
    correlationId?: string;
    duplicatedRowId?: string;
    sourceRowId?: string;
    expectedSourceRowRevision?: number;
    targetNodeId?: string;
    activeTabId?: string;
  } = {},
) {
  return client.call("duplicate_estimate_row_item_with_history", {
    target_project_id: PROJECT_ID,
    target_estimate_id: ESTIMATE_ID,
    source_row_id: options.sourceRowId ?? "row-source",
    expected_source_row_revision: options.expectedSourceRowRevision ?? 4,
    target_node_id: options.targetNodeId ?? "node-1",
    duplicated_row_id: options.duplicatedRowId ?? DUPLICATED_ROW_ID,
    acting_user_id: USER_ID,
    correlation_id: options.correlationId ?? "duplicate-correlation",
    target_active_tab_id: options.activeTabId ?? TAB_ID,
  });
}

function duplicateSourceRow(): Row {
  return {
    id: "row-source",
    estimate_id: ESTIMATE_ID,
    node_id: "node-1",
    description: "Premium cabinet finish",
    designation: "CAB-01",
    discipline: "Architectural",
    material: "Kitchen Cabinet",
    supplier: "Local supplier",
    supplier_id: "supplier-1",
    quantity: 2.5,
    quantity_base: 2,
    quantity_contingency_amount: 0.5,
    unit: "lm",
    unit_cost: 1250,
    misc_cost: 75,
    contingency_percentage: 5,
    adjustment_percentage: -2,
    source_snapshot_json: JSON.stringify({
      priceOptionId: "option-premium",
      priceOptionLabel: "Premium",
      sourceLibraryItemId: "library-component-1",
      sourceType: "library_component",
    }),
    sort_order: 3000,
    row_revision: 4,
    category_node_id: "category-cabinetry",
    source_library_item_id: "library-component-1",
    link_state: "linked-overridden",
    metadata_json: JSON.stringify({ category: "Cabinetry", sku: "CAB-PREMIUM" }),
    pricing_provenance_origin: "inherited_snapshot",
  };
}

describe("EstimateActionsD1Client row restore history", () => {
  it("reconstructs selected rows and replays the persisted result without duplicates", async () => {
    const database = new RestoreDatabase();
    seedDeleteEvent(database);
    const client = new EstimateActionsD1Client(database, user());

    const first = await restore(client, "restore-idempotent", ["row-2"]);
    const replay = await restore(client, "restore-idempotent", ["row-2"]);

    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({ sourceEventId: "delete-event-1", restoredRowIds: ["row-2"], restoredRowCount: 1 });
    expect(database.rows.has("row-2")).toBe(true);
    expect(database.rows.has("row-1")).toBe(false);
    expect(database.events.filter((event) => event.event_type === "estimate_rows_restored")).toHaveLength(1);
    expect(replay).toEqual(first);
    expect(database.batchCount).toBe(1);
  });

  it("rejects malformed, wrong-type, collision, oversize, and cross-workspace inputs before any write", async () => {
    const cases: Array<{ name: string; configure: (database: RestoreDatabase) => void; message: string }> = [
      { name: "malformed snapshot", configure: (database) => { database.events[0]!.old_snapshot = { rows: [{ id: "row-1", estimate_id: "other" }] }; }, message: "Deleted row history snapshot is malformed." },
      { name: "wrong event type", configure: (database) => { database.events[0]!.event_type = "row_updated"; }, message: "Deleted row history snapshot was not found in the current estimate." },
      { name: "row collision", configure: (database) => { database.rows.set("row-1", snapshotRow("row-1")); }, message: "One or more estimate rows to restore already exist." },
      { name: "oversize snapshot", configure: (database) => { database.events[0]!.old_snapshot = { rows: Array.from({ length: 101 }, (_, index) => snapshotRow(`row-${index}`)) }; }, message: "Deleted row history snapshot exceeds the 100-row restore limit." },
      { name: "cross-workspace source", configure: (database) => { database.events[0]!.workspace_id = "other-workspace"; }, message: "Deleted row history snapshot was not found in the current estimate." },
    ];

    for (const testCase of cases) {
      const database = new RestoreDatabase();
      seedDeleteEvent(database);
      testCase.configure(database);
      const result = await restore(new EstimateActionsD1Client(database, user()));
      expect(result.data, testCase.name).toBeNull();
      expect(result.error?.message, testCase.name).toBe(testCase.message);
      expect(database.batchCount, testCase.name).toBe(0);
      expect(database.events, testCase.name).toHaveLength(1);
    }
  });

  it("leaves rows and history untouched when the D1 batch fails", async () => {
    const database = new RestoreDatabase();
    seedDeleteEvent(database);
    database.failNextBatch = true;

    const result = await restore(new EstimateActionsD1Client(database, user()));

    expect(result.data).toBeNull();
    expect(result.error?.message).toBe("Cloudflare D1 estimate action batch failed.");
    expect(database.rows).toHaveLength(0);
    expect(database.events).toHaveLength(1);
  });
});

describe("EstimateActionsD1Client row duplicate history", () => {
  it("copies every persisted row-owned value into one revision-one row, event, and receipt", async () => {
    const database = new RestoreDatabase();
    database.rows.set("row-source", duplicateSourceRow());
    const client = new EstimateActionsD1Client(database, user());

    const first = await duplicate(client, { correlationId: "duplicate-idempotent" });
    const firstOperationLog = [...database.operationLog];
    const replay = await duplicate(client, { correlationId: "duplicate-idempotent" });

    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({
      sourceRowId: "row-source",
      rowId: DUPLICATED_ROW_ID,
      row: {
        id: DUPLICATED_ROW_ID,
        nodeId: "node-1",
        material: "Kitchen Cabinet",
        description: "Premium cabinet finish",
        supplier: "Local supplier",
        quantity: 2.5,
        quantityBase: 2,
        quantityContingencyAmount: 0.5,
        unit: "lm",
        unitCost: 1250,
        miscCost: 75,
        contingencyPercentage: 5,
        adjustmentPercentage: -2,
        sourceLibraryItemId: "library-component-1",
        sourceSnapshot: {
          priceOptionId: "option-premium",
          priceOptionLabel: "Premium",
          sourceLibraryItemId: "library-component-1",
          sourceType: "library_component",
        },
        metadata: { category: "Cabinetry", sku: "CAB-PREMIUM" },
        linkState: "linked-overridden",
        rowRevision: 1,
      },
    });
    expect(database.rows.get(DUPLICATED_ROW_ID)).toMatchObject({
      designation: "CAB-01",
      discipline: "Architectural",
      supplier_id: "supplier-1",
      category_node_id: "category-cabinetry",
      pricing_provenance_origin: "inherited_snapshot",
      row_revision: 1,
      sort_order: 4000,
    });
    expect(parseJson(database.rows.get(DUPLICATED_ROW_ID)?.source_snapshot_json)).toEqual({
      priceOptionId: "option-premium",
      priceOptionLabel: "Premium",
      sourceLibraryItemId: "library-component-1",
      sourceType: "library_component",
    });
    expect(parseJson(database.rows.get(DUPLICATED_ROW_ID)?.metadata_json)).toEqual({ category: "Cabinetry", sku: "CAB-PREMIUM" });
    expect(database.events.filter((event) => event.event_type === "row_duplicated")).toHaveLength(1);
    expect(database.receipts.has(`${WORKSPACE_ID}:estimate.row.duplicate:duplicate-idempotent`)).toBe(true);
    expect(replay).toEqual(first);
    expect(database.batchCount).toBe(1);
    const batchIndex = firstOperationLog.findIndex((operation) => operation.kind === "batch");
    const postCommitReadBacks = firstOperationLog
      .slice(batchIndex + 1)
      .filter((operation) => operation.kind === "first" || operation.kind === "all");
    expect(batchIndex).toBeGreaterThanOrEqual(0);
    expect(postCommitReadBacks).toHaveLength(1);
    expect(postCommitReadBacks[0]?.sql).toContain("FROM estimate_row_items");
  });

  it("rejects stale source, invalid target, and changed replay payloads before another write", async () => {
    const staleDatabase = new RestoreDatabase();
    staleDatabase.rows.set("row-source", duplicateSourceRow());
    const stale = await duplicate(new EstimateActionsD1Client(staleDatabase, user()), { expectedSourceRowRevision: 3 });
    expect(stale.data).toBeNull();
    expect(stale.error?.message).toBe("estimate_sheet_row_revision_conflict");
    expect(staleDatabase.batchCount).toBe(0);

    const invalidTargetDatabase = new RestoreDatabase();
    invalidTargetDatabase.rows.set("row-source", { ...duplicateSourceRow(), node_id: "node-missing" });
    const invalidTarget = await duplicate(new EstimateActionsD1Client(invalidTargetDatabase, user()), { targetNodeId: "node-missing" });
    expect(invalidTarget.data).toBeNull();
    expect(invalidTargetDatabase.batchCount).toBe(0);
    expect(invalidTargetDatabase.events).toHaveLength(0);

    const replayDatabase = new RestoreDatabase();
    replayDatabase.rows.set("row-source", duplicateSourceRow());
    const replayClient = new EstimateActionsD1Client(replayDatabase, user());
    const committed = await duplicate(replayClient, { correlationId: "duplicate-mismatch" });
    const mismatch = await duplicate(replayClient, {
      correlationId: "duplicate-mismatch",
      duplicatedRowId: "66666666-6666-4666-8666-666666666670",
    });
    expect(committed.error).toBeNull();
    expect(mismatch.data).toBeNull();
    expect(mismatch.error?.message).toBe("This action changed after it was submitted. Retry it as a new action.");
    expect(replayDatabase.batchCount).toBe(1);
    expect(replayDatabase.events.filter((event) => event.event_type === "row_duplicated")).toHaveLength(1);
    expect(replayDatabase.rows.has("66666666-6666-4666-8666-666666666670")).toBe(false);
  });
});
