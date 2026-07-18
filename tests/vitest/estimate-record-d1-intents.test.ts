import { describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import {
  duplicateEstimateRecordGraph,
  updateEstimateSheetAdjustmentWithHistory,
} from "@/lib/estimates/d1-intents/estimate-records";

vi.mock("server-only", () => ({}));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const SOURCE_ESTIMATE_ID = "44444444-4444-4444-8444-444444444444";

const actor = { userId: USER_ID, role: "admin" } as const;

type StoredEstimate = {
  id: string;
  project_id: string;
  created_by: string | null;
  name: string;
  notes: string | null;
  project_budget: number | null;
  sheet_code: string;
  currency_code: string;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

type StoredTab = {
  id: string;
  estimate_id: string;
  name: string;
  sort_order: number;
  is_default: number | boolean;
  archived_at: string | null;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type StoredNode = {
  id: string;
  estimate_id: string;
  estimate_tab_id: string | null;
  parent_id: string | null;
  kind: string;
  name: string;
  sort_order: number;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

type StoredRow = Record<string, D1Value> & {
  id: string;
  estimate_id: string;
  node_id: string;
};

function insertedRecord(statement: FakeStatement) {
  const columns = statement.sql
    .slice(statement.sql.indexOf("(") + 1, statement.sql.indexOf(")"))
    .split(",")
    .map((column) => column.trim());
  return Object.fromEntries(columns.map((column, index) => [column, statement.values[index]]));
}

class FakeStatement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  values: D1Value[] = [];

  constructor(
    readonly database: EstimateRecordDatabase,
    readonly sql: string,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    if (this.sql.includes("SELECT estimate.id, estimate.project_id, project.workspace_id")) {
      const estimate = this.database.estimates.get(String(this.values[0] ?? ""));
      const expectedProjectId = this.values.length > 1 ? String(this.values[1] ?? "") : null;
      if (!estimate || (expectedProjectId && estimate.project_id !== expectedProjectId)) return null;
      return {
        id: estimate.id,
        project_id: estimate.project_id,
        workspace_id: WORKSPACE_ID,
      } as R;
    }

    if (this.sql.includes("SELECT * FROM estimates")) {
      const estimate = this.database.estimates.get(String(this.values[0] ?? ""));
      return estimate && estimate.project_id === this.values[1] ? ({ ...estimate } as R) : null;
    }

    if (this.sql.startsWith("INSERT INTO estimates")) {
      const record = insertedRecord(this);
      const estimate: StoredEstimate = {
        id: String(record.id),
        project_id: String(record.project_id),
        created_by: record.created_by === null ? null : String(record.created_by),
        name: String(record.name),
        notes: record.notes === null ? null : String(record.notes),
        project_budget: record.project_budget === null ? null : Number(record.project_budget),
        sheet_code: String(record.sheet_code),
        currency_code: String(record.currency_code),
        metadata: record.metadata,
        created_at: String(record.created_at),
        updated_at: String(record.updated_at),
      };
      this.database.estimates.set(estimate.id, estimate);
      this.database.writePhases.push({ kind: "returning", statements: [this] });
      return { ...estimate } as R;
    }

    return null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    if (this.sql.includes("SELECT id, sheet_code FROM estimates")) {
      return {
        success: true,
        results: [...this.database.estimates.values()]
          .filter((estimate) => estimate.project_id === this.values[0])
          .map((estimate) => ({ id: estimate.id, sheet_code: estimate.sheet_code })) as R[],
      };
    }

    if (this.sql.includes("FROM estimate_tabs")) {
      return {
        success: true,
        results: [...this.database.tabs.values()]
          .filter((tab) => tab.estimate_id === this.values[0] && tab.archived_at === null)
          .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id))
          .map((tab) => ({ ...tab })) as R[],
      };
    }

    if (this.sql.includes("FROM estimate_nodes")) {
      const selectedTabs = this.values.length > 1 ? new Set(this.values.slice(1).map(String)) : null;
      return {
        success: true,
        results: [...this.database.nodes.values()]
          .filter((node) => node.estimate_id === this.values[0]
            && (!selectedTabs || (node.estimate_tab_id !== null && selectedTabs.has(node.estimate_tab_id))))
          .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id))
          .map((node) => ({ ...node })) as R[],
      };
    }

    if (this.sql.includes("FROM estimate_row_items")) {
      const selectedNodes = new Set(this.values.slice(1).map(String));
      return {
        success: true,
        results: [...this.database.rows.values()]
          .filter((row) => row.estimate_id === this.values[0] && selectedNodes.has(row.node_id))
          .sort((left, right) => Number(left.sort_order) - Number(right.sort_order) || left.id.localeCompare(right.id))
          .map((row) => ({ ...row })) as R[],
      };
    }

    return { success: true, results: [] };
  }

  applyMutation() {
    const record = insertedRecord(this);
    if (this.sql.includes("INSERT INTO estimate_tabs")) {
      const [id, estimateId, name, sortOrder, isDefault, metadata, createdBy, createdAt, updatedAt] = this.values;
      this.database.tabs.set(String(id), {
        id: String(id),
        estimate_id: String(estimateId),
        name: String(name),
        sort_order: Number(sortOrder),
        is_default: Number(isDefault),
        archived_at: null,
        metadata,
        created_by: createdBy === null ? null : String(createdBy),
        created_at: String(createdAt),
        updated_at: String(updatedAt),
      });
    } else if (this.sql.includes("INSERT INTO estimate_nodes")) {
      this.database.nodes.set(String(record.id), {
        id: String(record.id),
        estimate_id: String(record.estimate_id),
        estimate_tab_id: record.estimate_tab_id === null ? null : String(record.estimate_tab_id),
        parent_id: record.parent_id === null ? null : String(record.parent_id),
        kind: String(record.kind),
        name: String(record.name),
        sort_order: Number(record.sort_order),
        metadata_json: record.metadata_json,
        created_at: String(record.created_at),
        updated_at: String(record.updated_at),
      });
    } else if (this.sql.includes("INSERT INTO estimate_row_items")) {
      this.database.rows.set(String(record.id), record as StoredRow);
    }
    return { success: true } satisfies D1Result<T>;
  }

  async run(): Promise<D1Result<T>> {
    this.database.writePhases.push({ kind: "run", statements: [this] });
    return this.applyMutation();
  }
}

class EstimateRecordDatabase implements D1DatabaseLike {
  readonly estimates = new Map<string, StoredEstimate>();
  readonly tabs = new Map<string, StoredTab>();
  readonly nodes = new Map<string, StoredNode>();
  readonly rows = new Map<string, StoredRow>();
  readonly writePhases: Array<{ kind: "returning" | "run" | "batch"; statements: FakeStatement[] }> = [];

  constructor() {
    this.estimates.set(SOURCE_ESTIMATE_ID, {
      id: SOURCE_ESTIMATE_ID,
      project_id: PROJECT_ID,
      created_by: USER_ID,
      name: "Source estimate",
      notes: "Copy notes",
      project_budget: 500_000,
      sheet_code: "ES-001",
      currency_code: "PHP",
      metadata: JSON.stringify({ source: true }),
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    });
  }

  prepare<T = Record<string, unknown>>(sql: string) {
    return new FakeStatement<T>(this, sql);
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatementLike<T>[]) {
    const prepared = statements as FakeStatement<T>[];
    this.writePhases.push({ kind: "batch", statements: prepared });
    return prepared.map((statement) => statement.applyMutation());
  }
}

function seedActiveMultiTabGraph(database: EstimateRecordDatabase) {
  const timestamp = "2026-07-01T00:00:00.000Z";
  database.tabs.set("tab-main", {
    id: "tab-main", estimate_id: SOURCE_ESTIMATE_ID, name: "Main", sort_order: 0,
    is_default: 1, archived_at: null, metadata: "{}", created_by: USER_ID,
    created_at: timestamp, updated_at: timestamp,
  });
  database.tabs.set("tab-alt", {
    id: "tab-alt", estimate_id: SOURCE_ESTIMATE_ID, name: "Alternate", sort_order: 1000,
    is_default: 0, archived_at: null, metadata: "{}", created_by: USER_ID,
    created_at: timestamp, updated_at: timestamp,
  });
  database.tabs.set("tab-archived", {
    id: "tab-archived", estimate_id: SOURCE_ESTIMATE_ID, name: "Archived", sort_order: 2000,
    is_default: 0, archived_at: timestamp, metadata: "{}", created_by: USER_ID,
    created_at: timestamp, updated_at: timestamp,
  });
  database.nodes.set("nested-area", {
    id: "nested-area", estimate_id: SOURCE_ESTIMATE_ID, estimate_tab_id: "tab-main",
    parent_id: "root-group", kind: "area", name: "Nested area", sort_order: 0,
    metadata_json: "{}", created_at: timestamp, updated_at: timestamp,
  });
  database.nodes.set("root-group", {
    id: "root-group", estimate_id: SOURCE_ESTIMATE_ID, estimate_tab_id: "tab-main",
    parent_id: null, kind: "group", name: "Root group", sort_order: 100,
    metadata_json: "{}", created_at: timestamp, updated_at: timestamp,
  });
  database.nodes.set("alt-area", {
    id: "alt-area", estimate_id: SOURCE_ESTIMATE_ID, estimate_tab_id: "tab-alt",
    parent_id: null, kind: "area", name: "Alternate area", sort_order: 200,
    metadata_json: "{}", created_at: timestamp, updated_at: timestamp,
  });
  database.nodes.set("archived-area", {
    id: "archived-area", estimate_id: SOURCE_ESTIMATE_ID, estimate_tab_id: "tab-archived",
    parent_id: null, kind: "area", name: "Archived area", sort_order: 300,
    metadata_json: "{}", created_at: timestamp, updated_at: timestamp,
  });
  database.rows.set("source-row", {
    id: "source-row", estimate_id: SOURCE_ESTIMATE_ID, node_id: "nested-area",
    description: "", designation: null, discipline: null, material: "Cabinet", supplier: null,
    supplier_id: null, quantity: 2, quantity_base: null, quantity_contingency_amount: null,
    unit: "pc", unit_cost: 100, misc_cost: 10, contingency_percentage: 0,
    adjustment_percentage: 0, source_snapshot_json: JSON.stringify({ imageUrl: "javascript:unsafe" }),
    sort_order: 0, row_revision: 7, category_node_id: null, source_library_item_id: null,
    link_state: "unlinked", metadata_json: "{}", pricing_provenance_origin: "inherited_snapshot",
    created_at: timestamp, updated_at: timestamp,
  });
}

describe("estimate record D1 intents", () => {
  it("coordinates active multi-tab graph helpers with fresh identities and parent-first non-atomic writes", async () => {
    const database = new EstimateRecordDatabase();
    seedActiveMultiTabGraph(database);

    const result = await duplicateEstimateRecordGraph(database, actor, {
      projectId: PROJECT_ID,
      estimateId: SOURCE_ESTIMATE_ID,
    });

    expect(result).toMatchObject({ nodeCount: 3, rowCount: 1, totalProjectCost: 210, sheetCode: "ES-002" });
    expect(result.estimate.id).not.toBe(SOURCE_ESTIMATE_ID);
    expect(result.estimate.created_by).toBe(USER_ID);
    const copiedTabs = [...database.tabs.values()].filter((tab) => tab.estimate_id === result.estimate.id);
    expect(copiedTabs.map((tab) => tab.name)).toEqual(["Main", "Alternate"]);
    expect(copiedTabs.map((tab) => tab.id)).not.toContain("tab-main");
    expect(copiedTabs.map((tab) => tab.id)).not.toContain("tab-alt");
    expect(new Set(copiedTabs.map((tab) => tab.id)).size).toBe(2);
    expect(copiedTabs.every((tab) => tab.created_by === USER_ID)).toBe(true);

    const copiedNodes = [...database.nodes.values()].filter((node) => node.estimate_id === result.estimate.id);
    expect(copiedNodes).toHaveLength(3);
    const copiedRoot = copiedNodes.find((node) => node.name === "Root group");
    const copiedNestedArea = copiedNodes.find((node) => node.name === "Nested area");
    expect(copiedRoot?.id).not.toBe("root-group");
    expect(copiedNestedArea?.id).not.toBe("nested-area");
    expect(copiedNestedArea?.parent_id).toBe(copiedRoot?.id);
    expect(result.firstNodeId).toBe(copiedNestedArea?.id);

    const copiedRows = [...database.rows.values()].filter((row) => row.estimate_id === result.estimate.id);
    expect(copiedRows[0]?.id).not.toBe("source-row");
    expect(copiedRows[0]?.node_id).toBe(copiedNestedArea?.id);
    expect(copiedRows[0]?.row_revision).toBe(1);
    expect(JSON.parse(String(copiedRows[0]?.source_snapshot_json))).toEqual({ imageUrl: null });

    expect(database.writePhases.map((phase) => phase.kind)).toEqual([
      "returning",
      "batch",
      "run",
      "run",
      "run",
      "batch",
    ]);
    expect(database.writePhases.filter((phase) => phase.kind === "run")).toHaveLength(3);
  });

  it("creates a synthetic default tab for a legacy tabless estimate", async () => {
    const database = new EstimateRecordDatabase();
    const timestamp = "2026-07-01T00:00:00.000Z";
    database.nodes.set("legacy-area", {
      id: "legacy-area", estimate_id: SOURCE_ESTIMATE_ID, estimate_tab_id: null,
      parent_id: null, kind: "area", name: "Legacy area", sort_order: 0,
      metadata_json: "{}", created_at: timestamp, updated_at: timestamp,
    });

    const result = await duplicateEstimateRecordGraph(database, actor, {
      projectId: PROJECT_ID,
      estimateId: SOURCE_ESTIMATE_ID,
    });

    const copiedTabs = [...database.tabs.values()].filter((tab) => tab.estimate_id === result.estimate.id);
    const copiedNode = [...database.nodes.values()].find((node) => node.estimate_id === result.estimate.id);
    expect(result).toMatchObject({ nodeCount: 1, rowCount: 0, totalProjectCost: 0 });
    expect(copiedTabs).toHaveLength(1);
    expect(copiedTabs[0]).toMatchObject({ name: "Main", is_default: 1, created_by: USER_ID });
    expect(copiedNode?.estimate_tab_id).toBe(copiedTabs[0]?.id);
    expect(result.firstNodeId).toBe(copiedNode?.id);
  });

  it("propagates the original authorization probe error before a guarded adjustment write", async () => {
    const authError = new Error("estimate auth probe failed");
    const batch = vi.fn();
    const database = {
      prepare: vi.fn(() => {
        throw authError;
      }),
      batch,
    } as unknown as D1DatabaseLike;

    await expect(updateEstimateSheetAdjustmentWithHistory(database, {
      userId: USER_ID,
      role: "member",
    }, {
      projectId: PROJECT_ID,
      estimateId: SOURCE_ESTIMATE_ID,
      correlationId: "auth-failure-adjustment",
      mode: "markup",
      percentage: 10,
    })).rejects.toBe(authError);

    expect(batch).not.toHaveBeenCalled();
  });

  it("rejects an adjustment project mismatch before adjustment reads or writes", async () => {
    const preparedSql: string[] = [];
    const run = vi.fn(async () => ({ success: true, meta: { changes: 1 } }));
    const batch = vi.fn();
    const database = {
      prepare: vi.fn((sql: string) => {
        preparedSql.push(sql);
        const statement = {
          bind: vi.fn(() => statement),
          first: vi.fn(async () => {
            if (sql.includes("SELECT 1 AS allowed")) return { allowed: 1 };
            if (sql.includes("SELECT estimate.id, estimate.project_id, project.workspace_id")) {
              return {
                id: SOURCE_ESTIMATE_ID,
                project_id: "99999999-9999-4999-8999-999999999999",
                workspace_id: WORKSPACE_ID,
              };
            }
            throw new Error(`Unexpected read: ${sql}`);
          }),
          all: vi.fn(async () => ({ success: true, results: [] })),
          run,
        };
        return statement;
      }),
      batch,
    } as unknown as D1DatabaseLike;

    await expect(updateEstimateSheetAdjustmentWithHistory(database, {
      userId: USER_ID,
      role: "member",
    }, {
      projectId: PROJECT_ID,
      estimateId: SOURCE_ESTIMATE_ID,
      correlationId: "project-mismatch-adjustment",
      mode: "markup",
      percentage: 10,
    })).rejects.toThrow("Estimate not found in the current project.");

    expect(preparedSql).toHaveLength(2);
    expect(preparedSql.some((sql) => sql.includes("estimate_sheet_adjustments"))).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(batch).not.toHaveBeenCalled();
  });
});
