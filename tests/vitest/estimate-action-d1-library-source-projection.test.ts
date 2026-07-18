import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import { previewEstimateComponentEditImpact } from "@/lib/estimates/d1-intents/component-impact";
import {
  insertEstimateRowItemWithHistory,
  moveEstimateRowComponentWithHistory,
  replaceEstimateRowItemWithHistory,
} from "@/lib/estimates/d1-intents/rows";
import type { EstimateRowItem } from "@/lib/estimates/types";

vi.mock("server-only", () => ({}));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const ESTIMATE_ID = "44444444-4444-4444-8444-444444444444";
const TAB_ID = "55555555-5555-4555-8555-555555555555";
const SOURCE_ROW_ID = "66666666-6666-4666-8666-666666666666";
const TARGET_ROW_ID = "77777777-7777-4777-8777-777777777777";
const SOURCE_LIBRARY_ID = "88888888-8888-4888-8888-888888888888";
const TARGET_LIBRARY_ID = "99999999-9999-4999-8999-999999999999";
const SOURCE_OPTION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TARGET_OPTION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const actor = { role: "member" as const, userId: USER_ID };

type CapturedStatement = { sql: string; values: D1Value[] };

type LibraryItemRow = {
  id: string;
  workspace_id: string;
  active_price_option_id: string;
  current_version_number: number;
  updated_at: string;
  lifecycle_state: string;
  unit: string;
  unit_cost: number;
  misc_cost: number;
};

type LibraryOptionRow = {
  id: string;
  item_id: string;
  label: string;
  unit: string;
  unit_cost: number;
  misc_cost: number;
  is_active: number;
  is_default: number;
  updated_at: string;
};

type LibraryCostRow = {
  id: string;
  price_option_id: string;
  unit_cost: number;
  misc_cost: number;
  updated_at: string;
};

class IntentStatement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  values: D1Value[] = [];

  constructor(private readonly database: IntentDatabase, readonly sql: string) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return this.database.first(this.sql, this.values) as R | null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { success: true, results: this.database.all(this.sql, this.values) as R[] };
  }

  async run(): Promise<D1Result<T>> {
    this.database.directWrites += 1;
    return { success: true };
  }
}

class IntentDatabase implements D1DatabaseLike {
  batchCount = 0;
  batchStatements: CapturedStatement[] = [];
  directWrites = 0;
  readLog: CapturedStatement[] = [];
  rows = new Map<string, Record<string, unknown>>();
  libraryItems = new Map<string, LibraryItemRow>();
  libraryOptions = new Map<string, LibraryOptionRow>();
  libraryCosts = new Map<string, LibraryCostRow>();
  impactSource: Record<string, unknown> | null = null;
  impactRows: Record<string, unknown>[] = [];

  prepare<T = Record<string, unknown>>(sql: string): D1PreparedStatementLike<T> {
    return new IntentStatement<T>(this, sql);
  }

  first(sql: string, values: D1Value[]) {
    this.readLog.push({ sql, values: [...values] });
    if (sql.includes("SELECT 1 AS allowed")) return { allowed: 1 };
    if (sql.includes("FROM cost_library_items")) {
      return this.libraryItems.get(String(values[0])) ?? null;
    }
    if (sql.includes("FROM cost_library_item_price_options")) {
      const option = this.libraryOptions.get(String(values[0]));
      return option?.item_id === values[1] ? option : null;
    }
    if (sql.includes("FROM cost_library_item_variant_cost_entries")) {
      return [...this.libraryCosts.values()].find((cost) => cost.price_option_id === values[0]) ?? null;
    }
    if (sql.includes("row_item.source_snapshot_json") && sql.includes("project.workspace_id")) {
      return this.impactSource;
    }
    if (sql.includes("SELECT estimate.id") && sql.includes("FROM estimates estimate")) {
      return { id: ESTIMATE_ID, project_id: PROJECT_ID, workspace_id: WORKSPACE_ID };
    }
    if (sql.includes("FROM estimate_mutation_receipts")) return null;
    if (sql.includes("FROM estimate_sheet_events") && sql.includes("correlation_id")) return null;
    if (sql.includes("SELECT * FROM estimate_row_items") && sql.includes("id = ?")) {
      return this.rows.get(String(values[1])) ?? null;
    }
    return null;
  }

  all(sql: string, values: D1Value[]) {
    this.readLog.push({ sql, values: [...values] });
    if (sql.includes("FROM estimate_row_items row_item") && sql.includes("AS row_id")) {
      return this.impactRows;
    }
    if (sql.includes("FROM cost_library_item_price_options")) {
      return [...this.libraryOptions.values()].filter((option) => option.item_id === values[1]);
    }
    if (sql.includes("FROM estimate_row_items") && sql.includes("id IN")) {
      const ids = new Set(values.slice(1).map(String));
      return [...this.rows.values()].filter((row) => ids.has(String(row.id)));
    }
    if (sql.includes("FROM estimate_nodes node") && sql.includes("node.id IN")) {
      return [{ id: "node-1", estimate_tab_id: TAB_ID, kind: "area", archived_at: null }];
    }
    return [];
  }

  async batch<T = Record<string, unknown>>(
    statements: Array<D1PreparedStatementLike<T>>,
  ): Promise<Array<D1Result<T>>> {
    this.batchCount += 1;
    this.batchStatements = statements.map((statement) => ({
      sql: (statement as IntentStatement<T>).sql,
      values: [...(statement as IntentStatement<T>).values],
    }));
    return statements.map(() => ({ success: true }));
  }
}

function libraryRows(
  id: string,
  optionId: string,
  input: { label: string; cost: number; version: number },
) {
  const updatedAt = "2026-07-15T00:00:00.000Z";
  return {
    item: {
      id,
      workspace_id: WORKSPACE_ID,
      active_price_option_id: optionId,
      current_version_number: input.version,
      updated_at: updatedAt,
      lifecycle_state: "available",
      unit: "box",
      unit_cost: input.cost,
      misc_cost: 25,
    } satisfies LibraryItemRow,
    option: {
      id: optionId,
      item_id: id,
      label: input.label,
      unit: "box",
      unit_cost: input.cost,
      misc_cost: 25,
      is_active: 1,
      is_default: 1,
      updated_at: updatedAt,
    } satisfies LibraryOptionRow,
    cost: {
      id: `${id.slice(0, -1)}c`,
      price_option_id: optionId,
      unit_cost: input.cost,
      misc_cost: 25,
      updated_at: updatedAt,
    } satisfies LibraryCostRow,
  };
}

function libraryItem(
  id: string,
  optionId: string,
  input: { label: string; cost: number; version: number; material: string },
): EstimateRowItem {
  return {
    id,
    material: input.material,
    description: `${input.material} description`,
    supplier: "Supplier",
    source: "library",
    unit: "box",
    itemCost: input.cost,
    quantity: 1,
    subTotal: input.cost,
    miscCost: 25,
    totalItemCosts: input.cost + 25,
    category: "Finishes",
    discipline: "Architectural",
    designation: "Finish",
    sourceLibraryItemId: id,
    componentVersionNumber: input.version,
    priceOptionId: optionId,
    priceOptionLabel: input.label,
    updatedAt: "2026-07-15T00:00:00.000Z",
    lifecycleState: "available",
  };
}

function estimateRow(id: string, revision: number) {
  return {
    id,
    estimate_id: ESTIMATE_ID,
    node_id: "node-1",
    description: "Existing description",
    designation: "Finish",
    discipline: "Architectural",
    material: "Existing material",
    supplier: "Supplier",
    supplier_id: null,
    quantity: 1,
    quantity_base: null,
    quantity_contingency_amount: null,
    unit: "box",
    unit_cost: 100,
    misc_cost: 0,
    contingency_percentage: 0,
    adjustment_percentage: 0,
    source_snapshot_json: "{}",
    sort_order: 1000,
    row_revision: revision,
    category_node_id: null,
    source_library_item_id: SOURCE_LIBRARY_ID,
    link_state: "linked-clean",
    metadata_json: "{}",
    pricing_provenance_origin: "recorded",
  };
}

function seedLibrary(database: IntentDatabase, id: string, optionId: string, input: { label: string; cost: number; version: number }) {
  const rows = libraryRows(id, optionId, input);
  database.libraryItems.set(id, rows.item);
  database.libraryOptions.set(optionId, rows.option);
  database.libraryCosts.set(optionId, rows.cost);
}

function batchSql(database: IntentDatabase) {
  return database.batchStatements.map((statement) => statement.sql).join("\n");
}

describe("typed row Library freshness and component impact", () => {
  it("denies runtime-null actors before any Library read or write on every Library-backed row path", async () => {
    const database = new IntentDatabase();
    const source = libraryItem(SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, {
      label: "Standard",
      cost: 2500,
      version: 7,
      material: "Porcelain tile",
    });
    const target = libraryItem(TARGET_LIBRARY_ID, TARGET_OPTION_ID, {
      label: "Premium",
      cost: 3200,
      version: 5,
      material: "Stone tile",
    });

    await expect(insertEstimateRowItemWithHistory(database, null as never, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      correlationId: "10101010-1010-4010-8010-101010101010",
      nodeId: "node-1",
      activeTabId: TAB_ID,
      rowPayload: { id: SOURCE_ROW_ID, sourceLibraryItemId: SOURCE_LIBRARY_ID },
      librarySource: source,
    })).rejects.toThrow("Estimate edit access denied.");

    await expect(replaceEstimateRowItemWithHistory(database, null as never, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      correlationId: "20202020-2020-4020-8020-202020202020",
      rowId: SOURCE_ROW_ID,
      expectedRowRevision: 4,
      replacementPayload: { sourceLibraryItemId: SOURCE_LIBRARY_ID },
      librarySource: source,
    })).rejects.toThrow("Estimate edit access denied.");

    await expect(moveEstimateRowComponentWithHistory(database, null as never, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      correlationId: "30303030-3030-4030-8030-303030303030",
      activeTabId: TAB_ID,
      sourceRowId: SOURCE_ROW_ID,
      targetRowId: TARGET_ROW_ID,
      expectedSourceRowRevision: 4,
      expectedTargetRowRevision: 5,
      sourceLibraryItem: source,
      targetLibraryItem: target,
    })).rejects.toThrow("Estimate edit access denied.");

    expect(database.readLog.filter((read) => read.sql.includes("cost_library_"))).toEqual([]);
    expect(database.batchCount).toBe(0);
    expect(database.directWrites).toBe(0);
  });

  it("accepts a current Library source and couples its guard, row update, and history write", async () => {
    const database = new IntentDatabase();
    seedLibrary(database, SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, { label: "Standard", cost: 2500, version: 7 });
    database.rows.set(SOURCE_ROW_ID, estimateRow(SOURCE_ROW_ID, 4));
    const source = libraryItem(SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, {
      label: "Standard",
      cost: 2500,
      version: 7,
      material: "Porcelain tile",
    });

    const result = await replaceEstimateRowItemWithHistory(database, actor, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      correlationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      rowId: SOURCE_ROW_ID,
      expectedRowRevision: 4,
      replacementPayload: {
        sourceLibraryItemId: SOURCE_LIBRARY_ID,
        sourceSnapshot: { priceOptionId: SOURCE_OPTION_ID },
        material: source.material,
        description: source.description,
        supplier: source.supplier,
        unit: source.unit,
        quantity: 1,
        unitCost: source.itemCost,
        miscCost: source.miscCost,
        linkState: "linked-clean",
      },
      librarySource: source,
    });

    expect(result.row).toMatchObject({
      id: SOURCE_ROW_ID,
      material: "Porcelain tile",
      rowRevision: 5,
      unitCost: 2500,
    });
    expect(database.batchCount).toBe(1);
    expect(batchSql(database)).toContain("library_source_guard");
    expect(batchSql(database)).toContain("UPDATE estimate_row_items");
    expect(batchSql(database)).toContain("INSERT INTO estimate_sheet_events");
  });

  it("rejects stale Library data before preparing row or history writes", async () => {
    const database = new IntentDatabase();
    seedLibrary(database, SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, { label: "Standard", cost: 2600, version: 8 });
    database.rows.set(SOURCE_ROW_ID, estimateRow(SOURCE_ROW_ID, 4));
    const staleSource = libraryItem(SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, {
      label: "Standard",
      cost: 2500,
      version: 7,
      material: "Porcelain tile",
    });

    await expect(replaceEstimateRowItemWithHistory(database, actor, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      correlationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      rowId: SOURCE_ROW_ID,
      expectedRowRevision: 4,
      replacementPayload: { sourceLibraryItemId: SOURCE_LIBRARY_ID },
      librarySource: staleSource,
    })).rejects.toThrow("Library source changed");

    expect(database.batchCount).toBe(0);
    expect(database.directWrites).toBe(0);
    expect(database.readLog.some((read) => read.sql.includes("FROM estimate_row_items"))).toBe(false);
    expect(database.readLog.some((read) => read.sql.includes("FROM estimate_sheet_events"))).toBe(false);
  });

  it("revalidates both component-move sources through item, option, and current-cost reads", async () => {
    const database = new IntentDatabase();
    seedLibrary(database, SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, { label: "Source", cost: 120, version: 2 });
    seedLibrary(database, TARGET_LIBRARY_ID, TARGET_OPTION_ID, { label: "Target", cost: 320, version: 5 });
    database.rows.set(SOURCE_ROW_ID, estimateRow(SOURCE_ROW_ID, 11));
    database.rows.set(TARGET_ROW_ID, { ...estimateRow(TARGET_ROW_ID, 17), source_library_item_id: TARGET_LIBRARY_ID });

    await moveEstimateRowComponentWithHistory(database, actor, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      correlationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      activeTabId: TAB_ID,
      sourceRowId: SOURCE_ROW_ID,
      targetRowId: TARGET_ROW_ID,
      expectedSourceRowRevision: 11,
      expectedTargetRowRevision: 17,
      sourceLibraryItem: libraryItem(SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, {
        label: "Source", cost: 120, version: 2, material: "Source component",
      }),
      targetLibraryItem: libraryItem(TARGET_LIBRARY_ID, TARGET_OPTION_ID, {
        label: "Target", cost: 320, version: 5, material: "Target component",
      }),
    });

    const libraryReads = database.readLog.filter((read) => read.sql.includes("cost_library_"));
    expect(libraryReads.filter((read) => read.sql.includes("FROM cost_library_items"))).toHaveLength(2);
    expect(libraryReads.filter((read) => read.sql.includes("FROM cost_library_item_price_options"))).toHaveLength(2);
    expect(libraryReads.filter((read) => read.sql.includes("FROM cost_library_item_variant_cost_entries"))).toHaveLength(2);
    expect(database.batchCount).toBe(1);
    expect(batchSql(database).match(/UPDATE estimate_row_items/g)).toHaveLength(2);
    expect(batchSql(database)).toContain("INSERT INTO estimate_sheet_events");
  });

  it("performs zero writes when the target component source has stale current cost", async () => {
    const database = new IntentDatabase();
    seedLibrary(database, SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, { label: "Source", cost: 120, version: 2 });
    seedLibrary(database, TARGET_LIBRARY_ID, TARGET_OPTION_ID, { label: "Target", cost: 999, version: 5 });

    await expect(moveEstimateRowComponentWithHistory(database, actor, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      correlationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      activeTabId: TAB_ID,
      sourceRowId: SOURCE_ROW_ID,
      targetRowId: TARGET_ROW_ID,
      expectedSourceRowRevision: 11,
      expectedTargetRowRevision: 17,
      sourceLibraryItem: libraryItem(SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, {
        label: "Source", cost: 120, version: 2, material: "Source component",
      }),
      targetLibraryItem: libraryItem(TARGET_LIBRARY_ID, TARGET_OPTION_ID, {
        label: "Target", cost: 320, version: 5, material: "Target component",
      }),
    })).rejects.toThrow("Library variant pricing changed");

    expect(database.batchCount).toBe(0);
    expect(database.directWrites).toBe(0);
    expect(database.readLog.some((read) => read.sql.includes("FROM estimate_row_items"))).toBe(false);
    expect(database.readLog.some((read) => read.sql.includes("FROM estimate_sheet_events"))).toBe(false);
  });

  it("computes linked component impact directly from typed D1 projections", async () => {
    const database = new IntentDatabase();
    seedLibrary(database, SOURCE_LIBRARY_ID, SOURCE_OPTION_ID, { label: "Standard", cost: 2500, version: 7 });
    database.impactSource = {
      row_revision: 4,
      workspace_id: WORKSPACE_ID,
      link_state: "linked-clean",
      source_library_item_id: SOURCE_LIBRARY_ID,
      source_snapshot_json: "{}",
      metadata_json: "{}",
    };
    database.impactRows = [{
      row_id: SOURCE_ROW_ID,
      row_revision: 4,
      project_id: PROJECT_ID,
      project_name: "Lewis Residence",
      estimate_id: ESTIMATE_ID,
      estimate_name: "ES-001",
      link_state: "linked-clean",
      selected_price_option_id: SOURCE_OPTION_ID,
    }];

    const impact = await previewEstimateComponentEditImpact(database, actor, {
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      rowId: SOURCE_ROW_ID,
    });

    expect(impact).toMatchObject({
      componentKind: "library",
      instanceCount: 1,
      projectCount: 1,
      estimateCount: 1,
      optionUsageCounts: { [SOURCE_OPTION_ID]: 1 },
    });
    expect(impact.fingerprint).toContain(`rows[${SOURCE_ROW_ID}:4:linked-clean:${SOURCE_OPTION_ID}]`);
    expect(database.batchCount).toBe(0);
  });

  it("keeps Library projections private to the typed row owner", () => {
    const rowSource = readFileSync(resolve(process.cwd(), "src/lib/estimates/d1-intents/rows.ts"), "utf8");
    const componentSource = readFileSync(resolve(process.cwd(), "src/lib/estimates/d1-intents/component-impact.ts"), "utf8");

    expect(rowSource).not.toContain("export type LibraryItemProjection");
    expect(rowSource).not.toContain("export type LibraryPriceOptionProjection");
    expect(rowSource).not.toContain("export type LibraryVariantCostProjection");
    expect(componentSource).not.toContain("d1-action-client");
  });
});
