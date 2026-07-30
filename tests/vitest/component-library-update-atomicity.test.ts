import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { D1DatabaseLike, D1PreparedStatementLike, D1Result, D1Value } from "@/lib/cloudflare/d1";

const requireRuntime = createRequire(import.meta.url);
const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const authMocks = vi.hoisted(() => ({ requireCurrentUserContext: vi.fn() }));
const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));
const d1Mocks = vi.hoisted(() => ({ getCloudflareD1Database: vi.fn() }));
const authzMocks = vi.hoisted(() => ({
  canEditEstimateInD1: vi.fn(),
  isWorkspaceEditorInD1: vi.fn(),
  isWorkspaceMemberInD1: vi.fn(),
}));
const componentRepositoryMocks = vi.hoisted(() => ({
  getCurrentWorkspaceComponentRowDetail: vi.fn(),
}));

vi.mock("next/cache", () => cacheMocks);
vi.mock("@/lib/auth/session", () => ({ requireCurrentUserContext: authMocks.requireCurrentUserContext }));
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/repositories/component-library-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/repositories/component-library-repository")>();
  return { ...actual, getCurrentWorkspaceComponentRowDetail: componentRepositoryMocks.getCurrentWorkspaceComponentRowDetail };
});

type SqliteStatement = {
  all(...parameters: unknown[]): Record<string, unknown>[];
  get(...parameters: unknown[]): Record<string, unknown> | undefined;
  run(...parameters: unknown[]): { changes: number | bigint };
};

type SqliteDatabase = {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const ESTIMATE_ID = "33333333-3333-4333-8333-333333333333";
const COMPONENT_ID = "44444444-4444-4444-8444-444444444444";
const PRICE_OPTION_ID = "55555555-5555-4555-8555-555555555555";
const BRAND_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OPTION_BRAND_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const COST_ENTRY_ID = "66666666-6666-4666-8666-666666666666";
const ROW_ID = "77777777-7777-4777-8777-777777777777";
const ACTOR_ID = "88888888-8888-4888-8888-888888888888";
const INTENT_ID = "99999999-9999-4999-8999-999999999999";
const DEFAULT_FOLDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORIGINAL_TIME = "2026-07-13T09:00:00.000Z";
const UPDATED_TIME = "2026-07-15T12:00:00.000Z";

function normalizeValue(value: D1Value) {
  return value instanceof ArrayBuffer ? Buffer.from(value) : value;
}

class SqliteD1Statement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  private values: D1Value[] = [];

  constructor(
    private readonly database: SqliteDatabase,
    readonly sql: string,
    private readonly failSqlIncludes: string | null,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>(): Promise<R | null> {
    return (this.database.prepare(this.sql).get(...this.values.map(normalizeValue)) as R | undefined) ?? null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return {
      success: true,
      results: this.database.prepare(this.sql).all(...this.values.map(normalizeValue)) as R[],
    };
  }

  async run(): Promise<D1Result<T>> {
    if (this.failSqlIncludes && this.sql.includes(this.failSqlIncludes)) throw new Error("Injected atomic batch failure.");
    const statement = this.database.prepare(this.sql);
    if (/\bRETURNING\b/iu.test(this.sql)) {
      const results = statement.all(...this.values.map(normalizeValue)) as T[];
      return { success: true, results, meta: { changes: results.length } };
    }
    if (this.sql.trimStart().startsWith("SELECT")) {
      statement.all(...this.values.map(normalizeValue));
      return { success: true, results: [], meta: { changes: 0 } };
    }
    const result = statement.run(...this.values.map(normalizeValue));
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class SqliteD1Database implements D1DatabaseLike {
  batchCount = 0;

  constructor(
    readonly sqlite: SqliteDatabase,
    private readonly failSqlIncludes: string | null = null,
  ) {}

  prepare<T = Record<string, unknown>>(sql: string) {
    return new SqliteD1Statement<T>(this.sqlite, sql, this.failSqlIncludes);
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatementLike<T>[]): Promise<D1Result<T>[]> {
    this.batchCount += 1;
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements as SqliteD1Statement<T>[]) results.push(await statement.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

function applyMigrations(database: SqliteDatabase) {
  const migrationDirectory = join(process.cwd(), "migrations");
  for (const fileName of readdirSync(migrationDirectory).filter((name) => name.endsWith(".sql")).sort()) {
    database.exec(readFileSync(join(migrationDirectory, fileName), "utf8"));
  }
}

function seedDatabase(database: SqliteDatabase) {
  database.exec("PRAGMA foreign_keys = ON");
  database.prepare(`
    INSERT INTO workspaces (id, name, created_by, created_at, updated_at)
    VALUES (?, 'Workspace', ?, ?, ?)
  `).run(WORKSPACE_ID, ACTOR_ID, ORIGINAL_TIME, ORIGINAL_TIME);
  database.prepare(`
    UPDATE library_folders
    SET id = ?,
        created_by = ?,
        created_at = ?,
        updated_at = ?
    WHERE workspace_id = ?
      AND is_default_category = 1
  `).run(DEFAULT_FOLDER_ID, ACTOR_ID, ORIGINAL_TIME, ORIGINAL_TIME, WORKSPACE_ID);
  database.prepare(`
    INSERT INTO projects (id, workspace_id, name, created_by, created_at, updated_at)
    VALUES (?, ?, 'Project', ?, ?, ?)
  `).run(PROJECT_ID, WORKSPACE_ID, ACTOR_ID, ORIGINAL_TIME, ORIGINAL_TIME);
  database.prepare(`
    INSERT INTO estimates (id, project_id, name, created_by, created_at, updated_at)
    VALUES (?, ?, 'Estimate', ?, ?, ?)
  `).run(ESTIMATE_ID, PROJECT_ID, ACTOR_ID, ORIGINAL_TIME, ORIGINAL_TIME);
  database.prepare(`
    INSERT INTO component_brands (
      id, workspace_id, name, normalized_name, created_at, updated_at, created_by
    ) VALUES (?, ?, 'Acme', 'acme', ?, ?, ?)
  `).run(BRAND_ID, WORKSPACE_ID, ORIGINAL_TIME, ORIGINAL_TIME, ACTOR_ID);
  database.prepare(`
    INSERT INTO component_brands (
      id, workspace_id, name, normalized_name, created_at, updated_at, created_by
    ) VALUES (?, ?, 'Beta', 'beta', ?, ?, ?)
  `).run(OPTION_BRAND_ID, WORKSPACE_ID, ORIGINAL_TIME, ORIGINAL_TIME, ACTOR_ID);
  database.prepare(`
    INSERT INTO cost_library_items (
      id, workspace_id, name, description, category, library_folder_id, unit, unit_cost, misc_cost,
      current_version_number, active_price_option_id, lifecycle_state, metadata_json, brand_id, brand,
      created_by, created_at, updated_at
    ) VALUES (?, ?, 'Original component', 'Original description', 'Flooring', ?, 'box', 100, 0, 1, ?, 'available', '{}', ?, 'Acme', ?, ?, ?)
  `).run(COMPONENT_ID, WORKSPACE_ID, DEFAULT_FOLDER_ID, PRICE_OPTION_ID, BRAND_ID, ACTOR_ID, ORIGINAL_TIME, ORIGINAL_TIME);
  database.prepare(`
    INSERT INTO cost_library_item_price_options (
      id, workspace_id, item_id, label, unit, unit_cost, misc_cost, currency,
      is_active, is_default, updated_at, pricing_source, metadata_json, created_at
    ) VALUES (?, ?, ?, 'Default', 'box', 100, 0, 'PHP', 1, 1, ?, 'Supplier A', ?, ?)
  `).run(
    PRICE_OPTION_ID,
    WORKSPACE_ID,
    COMPONENT_ID,
    ORIGINAL_TIME,
    JSON.stringify({ activeCostEntryId: COST_ENTRY_ID, pricingDate: "2026-07-13", variantDescription: "Original variant" }),
    ORIGINAL_TIME,
  );
  database.prepare(`
    INSERT INTO cost_library_item_variant_cost_entries (
      id, workspace_id, item_id, price_option_id, unit_cost, misc_cost, currency,
      pricing_source, pricing_date, notes, is_current, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 100, 0, 'PHP', 'Supplier A', '2026-07-13', '', 1, '{}', ?, ?)
  `).run(COST_ENTRY_ID, WORKSPACE_ID, COMPONENT_ID, PRICE_OPTION_ID, ORIGINAL_TIME, ORIGINAL_TIME);
  database.prepare(`
    INSERT INTO estimate_row_items (
      id, estimate_id, material, description, quantity, unit, unit_cost, misc_cost,
      source_snapshot_json, sort_order, created_at, updated_at, row_revision,
      source_library_item_id, link_state, metadata_json, supplier
    ) VALUES (?, ?, 'Original component', 'Original variant', 1, 'box', 100, 0, ?, 1, ?, ?, 1, ?, 'linked-clean', ?, 'Supplier A')
  `).run(
    ROW_ID,
    ESTIMATE_ID,
    JSON.stringify({ priceOptionId: PRICE_OPTION_ID, componentVersionNumber: 1 }),
    ORIGINAL_TIME,
    ORIGINAL_TIME,
    COMPONENT_ID,
    JSON.stringify({ priceOptionId: PRICE_OPTION_ID }),
  );
}

function createDatabase(failSqlIncludes: string | null = null) {
  const { DatabaseSync } = requireRuntime("node:sqlite") as {
    DatabaseSync: new (path: string) => SqliteDatabase;
  };
  const sqlite = new DatabaseSync(":memory:");
  applyMigrations(sqlite);
  seedDatabase(sqlite);
  return new SqliteD1Database(sqlite, failSqlIncludes);
}

function updateInput() {
  return {
    intentId: INTENT_ID,
    name: "Updated component",
    description: "Updated description",
    category: "Flooring",
    brand: "Acme",
    brandId: BRAND_ID,
    supplier: "Supplier A",
    unit: "box",
    lifecycleState: "available" as const,
    effectiveAt: UPDATED_TIME,
    changeReason: "Atomic update proof",
    expectedUpdatedAt: ORIGINAL_TIME,
    expectedVersionNumber: 1,
    expectedComponentImpactFingerprint: `rows[${ROW_ID}:1:linked-clean:${PRICE_OPTION_ID}]|options[${PRICE_OPTION_ID}:${ORIGINAL_TIME}:1:1]`,
    priceOptions: [{
      id: PRICE_OPTION_ID,
      label: "Default",
      unit: "box",
      unitCost: 125,
      miscCost: 5,
      currency: "PHP",
      pricingSource: "Supplier A",
      pricingDate: "2026-07-15",
      brand: "Beta",
      brandId: OPTION_BRAND_ID,
      activeCostEntryId: COST_ENTRY_ID,
      costEntries: [{
        id: COST_ENTRY_ID,
        unitCost: 125,
        miscCost: 5,
        currency: "PHP",
        pricingSource: "Supplier A",
        pricingDate: "2026-07-15",
        isCurrent: true,
      }],
      isActive: true,
      isDefault: true,
    }],
  };
}

function scalar(database: SqliteDatabase, sql: string) {
  return Number(database.prepare(sql).get()?.value ?? 0);
}

let activeDatabase: SqliteD1Database | null = null;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(UPDATED_TIME));
  authMocks.requireCurrentUserContext.mockResolvedValue({ userId: ACTOR_ID });
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({ workspace: { id: WORKSPACE_ID } });
  authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  authzMocks.canEditEstimateInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceMemberInD1.mockResolvedValue(true);
  componentRepositoryMocks.getCurrentWorkspaceComponentRowDetail.mockImplementation(async () => {
    const component = activeDatabase?.sqlite.prepare(`
      SELECT name, description, category, unit, unit_cost, misc_cost, current_version_number, updated_at
      FROM cost_library_items WHERE id = ?
    `).get(COMPONENT_ID);
    const option = activeDatabase?.sqlite.prepare(`
      SELECT id, label, unit, unit_cost, misc_cost, currency, is_active, is_default
      FROM cost_library_item_price_options WHERE id = ?
    `).get(PRICE_OPTION_ID);
    if (!component || !option) return null;
    return {
      id: COMPONENT_ID,
      material: String(component.name),
      name: String(component.name),
      description: String(component.description),
      supplier: "Supplier A",
      source: "library",
      unit: String(component.unit),
      itemCost: Number(component.unit_cost),
      quantity: 1,
      subTotal: Number(component.unit_cost),
      miscCost: Number(component.misc_cost),
      totalItemCosts: Number(component.unit_cost) + Number(component.misc_cost),
      category: String(component.category),
      pricingSource: "Supplier A",
      pricingDate: "2026-07-15",
      sourceLibraryItemId: COMPONENT_ID,
      linkState: "linked-clean",
      componentVersionNumber: Number(component.current_version_number),
      updatedAt: String(component.updated_at),
      priceOptionId: PRICE_OPTION_ID,
      priceOptions: [{
        id: String(option.id),
        label: String(option.label),
        unit: String(option.unit),
        unitCost: Number(option.unit_cost),
        miscCost: Number(option.misc_cost),
        currency: String(option.currency),
        isActive: Number(option.is_active) === 1,
        isDefault: Number(option.is_default) === 1,
      }],
    };
  });
});

afterEach(() => {
  activeDatabase?.sqlite.close();
  activeDatabase = null;
  vi.useRealTimers();
});

describe("component update atomic D1 contract", () => {
  it("commits fan-out, audit/outbox, receipt, and project revision once, then replays", async () => {
    activeDatabase = createDatabase();
    d1Mocks.getCloudflareD1Database.mockResolvedValue(activeDatabase);
    const { updateCostLibraryComponentWithPriceOptions } = await import("@/lib/component-library/actions");

    const result = await updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, updateInput());
    const replay = await updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, updateInput());

    expect(result).toMatchObject({
      itemId: COMPONENT_ID,
      versionNumber: 2,
      updatedRowCount: 1,
      rowRevisions: { [ROW_ID]: 2 },
    });
    expect(replay).toMatchObject({
      itemId: COMPONENT_ID,
      versionNumber: 2,
      updatedRowCount: 1,
      rowRevisions: { [ROW_ID]: 2 },
      rowPatches: {},
    });
    expect(activeDatabase.batchCount).toBe(1);
    expect(activeDatabase.sqlite.prepare("SELECT current_version_number AS value FROM cost_library_items WHERE id = ?").get(COMPONENT_ID)?.value).toBe(2);
    expect(activeDatabase.sqlite.prepare("SELECT row_revision AS value FROM estimate_row_items WHERE id = ?").get(ROW_ID)?.value).toBe(2);
    expect(scalar(activeDatabase.sqlite, "SELECT COUNT(*) AS value FROM estimate_sheet_events")).toBe(1);
    expect(scalar(activeDatabase.sqlite, "SELECT COUNT(*) AS value FROM activity_event_outbox")).toBe(1);
    expect(scalar(activeDatabase.sqlite, "SELECT COUNT(*) AS value FROM estimate_mutation_receipts")).toBe(1);
    expect(activeDatabase.sqlite.prepare("SELECT publication_source_revision AS value FROM projects WHERE id = ?").get(PROJECT_ID)?.value).toBe(1);
    expect(activeDatabase.sqlite.prepare("SELECT brand_id, brand FROM cost_library_item_price_options WHERE id = ?").get(PRICE_OPTION_ID))
      .toEqual({ brand_id: OPTION_BRAND_ID, brand: "Beta" });
    expect(activeDatabase.sqlite.prepare("SELECT brand_id, source_snapshot_json FROM estimate_row_items WHERE id = ?").get(ROW_ID))
      .toMatchObject({ brand_id: OPTION_BRAND_ID });
    expect(JSON.parse(String(activeDatabase.sqlite.prepare("SELECT source_snapshot_json FROM estimate_row_items WHERE id = ?").get(ROW_ID)?.source_snapshot_json)))
      .toMatchObject({ brandId: OPTION_BRAND_ID, brand: "Beta" });
    const event = activeDatabase.sqlite.prepare("SELECT event_type, payload FROM estimate_sheet_events").get();
    expect(event?.event_type).toBe("library_component_rows_synced");
    expect(JSON.parse(String(event?.payload))).toMatchObject({
      componentId: COMPONENT_ID,
      componentVersionNumber: 2,
      rowCount: 1,
      rows: [{ rowId: ROW_ID, previousRowRevision: 1, rowRevision: 2, priceOptionId: PRICE_OPTION_ID }],
    });
  });

  it("rolls back every domain and side-effect write when the final receipt write fails", async () => {
    activeDatabase = createDatabase("INSERT INTO estimate_mutation_receipts");
    d1Mocks.getCloudflareD1Database.mockResolvedValue(activeDatabase);
    const { updateCostLibraryComponentWithPriceOptions } = await import("@/lib/component-library/actions");

    await expect(updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, updateInput())).rejects.toThrow(
      "Injected atomic batch failure.",
    );

    expect(activeDatabase.sqlite.prepare("SELECT name, current_version_number FROM cost_library_items WHERE id = ?").get(COMPONENT_ID)).toMatchObject({
      name: "Original component",
      current_version_number: 1,
    });
    expect(activeDatabase.sqlite.prepare("SELECT material, row_revision FROM estimate_row_items WHERE id = ?").get(ROW_ID)).toMatchObject({
      material: "Original component",
      row_revision: 1,
    });
    expect(scalar(activeDatabase.sqlite, "SELECT COUNT(*) AS value FROM estimate_sheet_events")).toBe(0);
    expect(scalar(activeDatabase.sqlite, "SELECT COUNT(*) AS value FROM activity_event_outbox")).toBe(0);
    expect(scalar(activeDatabase.sqlite, "SELECT COUNT(*) AS value FROM estimate_mutation_receipts")).toBe(0);
    expect(activeDatabase.sqlite.prepare("SELECT publication_source_revision AS value FROM projects WHERE id = ?").get(PROJECT_ID)?.value).toBe(0);
  });
});
