import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression guard for U11: revalidateTemplateSurfaces() must revalidate BOTH
// template surfaces (the library overview + the templates browse route). A prior
// bug had it call itself recursively, so every template mutation stack-overflowed
// before reaching the second revalidatePath. These server actions had zero
// coverage, so validate stayed green while the feature was broken — this closes
// that gap by driving a real action through the shared revalidation helper.

const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
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

vi.mock("next/cache", () => cacheMocks);
vi.mock("@/lib/auth/session", () => ({ requireCurrentUserContext: authMocks.requireCurrentUserContext }));
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const TEMPLATE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPONENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function createD1Fixture(options: {
  firstResults?: unknown[];
  allResults?: unknown[][];
  batchFailureAt?: number;
  linkedRowRevisionResults?: Array<{ id: string; row_revision: number }>;
} = {}) {
  const firstResults = [...(options.firstResults ?? [])];
  const allResults = [...(options.allResults ?? [])];
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const database = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => {
        statements.push({ sql, values });
        return {
          first: vi.fn(async () => firstResults.shift() ?? null),
          all: vi.fn(async () => ({ success: true, results: allResults.shift() ?? [] })),
          run: vi.fn(async () => ({
            success: true,
            meta: { changes: 1 },
            results: sql.includes("UPDATE estimate_row_items") ? options.linkedRowRevisionResults ?? [] : [],
          })),
        };
      }),
    })),
    batch: vi.fn(async (preparedStatements: Array<{ run: () => Promise<unknown> }>) => Promise.all(
      preparedStatements.map((statement, index) => index === options.batchFailureAt
        ? { success: false, meta: { changes: 0 }, results: [] }
        : statement.run()),
    )),
    statements,
  };
  d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
  return database;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  cacheMocks.revalidatePath.mockReset();
  authMocks.requireCurrentUserContext.mockReset().mockResolvedValue({ userId: "user-1" });
  workspaceMocks.ensureDefaultWorkspace.mockReset().mockResolvedValue({ workspace: { id: WORKSPACE_ID } });
  authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  authzMocks.canEditEstimateInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceMemberInD1.mockResolvedValue(true);
});

describe("template-surface revalidation (U11)", () => {
  it("revalidates BOTH the library overview and the templates browse route (no recursion)", async () => {
    createD1Fixture({
      firstResults: [{ id: TEMPLATE_ID, name: "Kitchen Deluxe" }],
    });
    const { renameEstimateTemplate } = await import("@/lib/component-library/actions");

    // Completing at all proves the shared helper does not recurse/stack-overflow.
    const result = await renameEstimateTemplate({ templateId: TEMPLATE_ID, name: "Kitchen Deluxe" });

    expect(result).toEqual({ templateId: TEMPLATE_ID, name: "Kitchen Deluxe" });
    const paths = cacheMocks.revalidatePath.mock.calls.map((call) => call[0]);
    expect(paths).toContain("/workshop/library");
    expect(paths).toContain("/workshop/library/templates");
  });

  it("denies a workspace viewer at the app layer (P3 T17 / F19) without mutating", async () => {
    const d1 = createD1Fixture({
      firstResults: [{ id: TEMPLATE_ID, name: "x" }],
    });
    authzMocks.isWorkspaceEditorInD1.mockResolvedValue(false);
    const { renameEstimateTemplate } = await import("@/lib/component-library/actions");

    await expect(renameEstimateTemplate({ templateId: TEMPLATE_ID, name: "Hijack" })).rejects.toThrow(
      /editors\/admins/,
    );
    // No write reached the DB, and no revalidation fired.
    expect(d1.prepare).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects creation when the workspace is at its quota (P3 T19 / F24)", async () => {
    const d1 = createD1Fixture({
      firstResults: [{ count: 2_000 }],
    });
    const { createEstimateTemplate } = await import("@/lib/component-library/actions");

    await expect(createEstimateTemplate({ name: "Over the limit" })).rejects.toThrow(/limit/);
    expect(d1.statements.some((statement) => statement.sql.includes("INSERT INTO estimate_templates"))).toBe(false);
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("library component instance reconciliation", () => {
  it("persists canonical component details to every linked estimate row", async () => {
    const database = createD1Fixture({
      firstResults: [
        {
          id: COMPONENT_ID,
          workspace_id: WORKSPACE_ID,
          name: "Original",
          unit: "box",
          unit_cost: 100,
          misc_cost: 0,
          current_version_number: 1,
          active_price_option_id: "price-1",
          pricing_source: "Supplier A",
          pricing_date: "2026-07-01",
          thumbnail_path: "/original.webp",
          metadata_json: JSON.stringify({ custom: "keep" }),
          lifecycle_state: "available",
        },
        {
          id: COMPONENT_ID,
          name: "Updated Oak",
          description: "Updated description",
          category: "Flooring",
          category_node_id: "category-flooring",
          supplier: "Supplier A",
          supplier_id: "supplier-a",
          brand: "Pergo",
          brand_id: "brand-pergo",
          unit: "box",
          unit_cost: 2500.5,
          misc_cost: 0,
          lifecycle_state: "available",
          current_version_number: 2,
          active_price_option_id: "price-1",
          pricing_source: "Supplier A",
          pricing_date: "2026-07-13",
          thumbnail_path: "/oak.webp",
          updated_at: "2026-07-13T10:00:00.000Z",
        },
      ],
      allResults: [
        [{
          id: "price-1",
          label: "V1",
          unit: "box",
          unit_cost: 2500.5,
          misc_cost: 0,
          currency: "PHP",
          is_active: 1,
          is_default: 1,
          pricing_source: "Supplier A",
          metadata_json: JSON.stringify({ pricingDate: "2026-07-13", thumbnailPath: "/oak.webp" }),
        }],
        [{ row_id: "row-1", project_id: "project-1", estimate_id: "estimate-1" }],
      ],
      linkedRowRevisionResults: [{ id: "row-1", row_revision: 4 }],
    });
    const { updateCostLibraryComponent } = await import("@/lib/component-library/actions");

    const result = await updateCostLibraryComponent(COMPONENT_ID, {
      name: "Updated Oak",
      description: "Updated description",
      category: "Flooring",
      categoryNodeId: "category-flooring",
      supplier: "Supplier A",
      supplierId: "supplier-a",
      brand: "Pergo",
      brandId: "brand-pergo",
      unit: "box",
      lifecycleState: "available",
    });

    const linkedRowUpdate = database.statements.find((statement) =>
      statement.sql.includes("UPDATE estimate_row_items") && statement.sql.includes("source_library_item_id"),
    );
    expect(linkedRowUpdate).toBeDefined();
    expect(linkedRowUpdate?.sql).toContain("link_state = 'linked-clean'");
    expect(linkedRowUpdate?.sql).toContain("row_revision = row_revision + 1");
    expect(linkedRowUpdate?.sql).toContain("link_state IS NULL OR link_state NOT IN ('detached', 'unlinked')");
    expect(linkedRowUpdate?.sql).toContain("project.workspace_id = ?");
    expect(linkedRowUpdate?.sql).not.toContain("quantity =");
    expect(linkedRowUpdate?.sql).not.toContain("misc_cost =");
    expect(linkedRowUpdate?.sql).not.toContain("contingency_percentage =");
    expect(linkedRowUpdate?.sql).not.toContain("adjustment_percentage =");
    expect(linkedRowUpdate?.values).toContain(COMPONENT_ID);
    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(database.statements.find((statement) => statement.sql.includes("cost_library_item_versions"))?.sql).not.toContain("OR IGNORE");
    expect(database.statements.some((statement) => statement.sql.includes("UPDATE cost_library_item_variant_cost_entries"))).toBe(true);
    expect(database.statements.some((statement) => statement.sql.includes("id NOT IN"))).toBe(false);
    expect(database.statements.find((statement) => statement.sql.includes("UPDATE cost_library_item_price_options"))?.sql).toContain("json_patch");
    const componentUpdate = database.statements.find((statement) => statement.sql.includes("UPDATE cost_library_items"));
    expect(componentUpdate?.values).toContain("/original.webp");
    expect(componentUpdate?.values).toContain(JSON.stringify({ custom: "keep" }));
    expect(result).toMatchObject({
      itemId: COMPONENT_ID,
      versionNumber: 2,
      updatedRowCount: 1,
      rowRevisions: { "row-1": 4 },
      affectedEstimates: [{ projectId: "project-1", estimateId: "estimate-1" }],
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/estimate-1");
  });

  it("atomically updates component variants, version history, and linked row revisions", async () => {
    const database = createD1Fixture({
      firstResults: [{
        id: COMPONENT_ID,
        workspace_id: WORKSPACE_ID,
        name: "Original",
        unit: "box",
        unit_cost: 100,
        misc_cost: 0,
        current_version_number: 1,
        active_price_option_id: "price-1",
        lifecycle_state: "available",
      }],
      allResults: [[{ row_id: "row-1", project_id: "project-1", estimate_id: "estimate-1" }]],
      linkedRowRevisionResults: [{ id: "row-1", row_revision: 6 }],
    });
    const { updateCostLibraryComponentWithPriceOptions } = await import("@/lib/component-library/actions");

    const result = await updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, {
      name: "Updated Oak",
      description: "Updated description",
      category: "Flooring",
      supplier: "Supplier A",
      brand: "Pergo",
      unit: "box",
      lifecycleState: "available",
      priceOptions: [{
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        label: "V1",
        unit: "box",
        unitCost: 2500.5,
        miscCost: 25,
        isActive: true,
        isDefault: true,
      }],
    });

    expect(database.batch).toHaveBeenCalledTimes(1);
    expect(database.statements.some((statement) => statement.sql.includes("UPDATE cost_library_items"))).toBe(true);
    expect(database.statements.some((statement) => statement.sql.includes("cost_library_item_versions"))).toBe(true);
    expect(database.statements.some((statement) => statement.sql.includes("UPDATE estimate_row_items"))).toBe(true);
    expect(result).toMatchObject({
      itemId: COMPONENT_ID,
      versionNumber: 2,
      rowRevisions: { "row-1": 6 },
      updatedRowCount: 1,
    });
  });

  it("fails the action when the required atomic batch reports a write failure", async () => {
    createD1Fixture({
      firstResults: [{
        id: COMPONENT_ID,
        workspace_id: WORKSPACE_ID,
        name: "Original",
        unit: "box",
        unit_cost: 100,
        misc_cost: 0,
        current_version_number: 1,
        active_price_option_id: "price-1",
        pricing_source: null,
        pricing_date: null,
        lifecycle_state: "available",
      }],
      allResults: [[], []],
      batchFailureAt: 0,
    });
    const { updateCostLibraryComponent } = await import("@/lib/component-library/actions");

    await expect(updateCostLibraryComponent(COMPONENT_ID, {
      name: "Should roll back",
      unit: "box",
      category: "Flooring",
    })).rejects.toThrow(/batch failed/);
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });
});
