import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  return {
    ...actual,
    getCurrentWorkspaceComponentRowDetail: componentRepositoryMocks.getCurrentWorkspaceComponentRowDetail,
  };
});

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const TEMPLATE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPONENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PRICE_OPTION_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SECOND_PRICE_OPTION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function createD1Fixture(options: {
  firstResults?: unknown[];
  allResults?: unknown[][];
  batchFailureAt?: number;
  linkedRowRevisionResults?: Array<{ id: string; row_revision: number }>;
} = {}) {
  const firstResults = [...(options.firstResults ?? [])];
  const allResults = [...(options.allResults ?? [])];
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  let committedReceipt: {
    actor_user_id: string;
    request_fingerprint: string;
    result_json: string;
    status: string;
  } | null = null;
  const database = {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...values: unknown[]) => {
        statements.push({ sql, values });
        return {
          sql,
          values,
          first: vi.fn(async () => sql.includes("FROM estimate_mutation_receipts")
            ? committedReceipt
            : firstResults.shift() ?? null),
          all: vi.fn(async () => ({ success: true, results: allResults.shift() ?? [] })),
          run: vi.fn(async () => ({
            success: true,
            meta: { changes: sql.includes("UPDATE estimate_row_items")
              ? options.linkedRowRevisionResults?.length ?? 0
              : 1 },
            results: sql.includes("UPDATE estimate_row_items") ? options.linkedRowRevisionResults ?? [] : [],
          })),
        };
      }),
    })),
    batch: vi.fn(async (preparedStatements: Array<{ sql: string; values: unknown[]; run: () => Promise<unknown> }>) => {
      const results = await Promise.all(preparedStatements.map((statement, index) => index === options.batchFailureAt
        ? { success: false, meta: { changes: 0 }, results: [] }
        : statement.run()));
      if (results.every((result) => (result as { success?: boolean }).success !== false)) {
        const receiptStatement = preparedStatements.find((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"));
        if (receiptStatement) {
          committedReceipt = {
            actor_user_id: String(receiptStatement.values[4]),
            request_fingerprint: String(receiptStatement.values[7]),
            result_json: String(receiptStatement.values[8]),
            status: "committed",
          };
        }
      }
      return results;
    }),
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
  componentRepositoryMocks.getCurrentWorkspaceComponentRowDetail.mockImplementation(async (itemId: string) => ({
    id: itemId,
    material: "Authoritative component",
    description: "",
    supplier: "",
    source: "library",
    unit: "box",
    itemCost: 100,
    quantity: 1,
    subTotal: 100,
    miscCost: 0,
    totalItemCosts: 100,
    category: "General",
    pricingSource: "",
    pricingDate: "",
    sourceLibraryItemId: itemId,
    linkState: "linked-clean",
    componentVersionNumber: 2,
    priceOptionId: PRICE_OPTION_ID,
    priceOptions: [{
      id: PRICE_OPTION_ID,
      label: "Default",
      unit: "box",
      unitCost: 100,
      miscCost: 0,
      currency: "PHP",
      isActive: true,
      isDefault: true,
    }],
  }));
});

afterEach(() => {
  vi.useRealTimers();
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
  it("atomically creates a component and returns its authoritative revision", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T10:00:00.000Z"));
    const database = createD1Fixture({ firstResults: [{ count: 0 }] });
    const { createCostLibraryComponent } = await import("@/lib/component-library/actions");
    const input = {
      intentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      fieldContract: "opendesign-add-component",
      name: "Fresh Oak",
      category: "Flooring",
      supplier: "Acme",
      brand: "Pergo",
      unit: "box",
      priceOptions: [{
        label: "V1",
        unit: "box",
        unitCost: 2500.5,
        isActive: true,
        isDefault: true,
      }],
    };

    const result = await createCostLibraryComponent(input);
    const replay = await createCostLibraryComponent(input);

    expect(result).toMatchObject({
      versionNumber: 1,
      createdAt: "2026-07-13T10:00:00.000Z",
      updatedAt: "2026-07-13T10:00:00.000Z",
    });
    expect(replay).toMatchObject({
      itemId: result.itemId,
      activePriceOptionId: result.activePriceOptionId,
      priceOptions: result.priceOptions,
      versionNumber: 1,
    });
    expect(database.batch).toHaveBeenCalledTimes(1);
    const batchStatements = database.batch.mock.calls[0]?.[0] as Array<{ sql?: string }>;
    expect(batchStatements.some((statement) => statement.sql?.includes("INSERT INTO cost_library_items"))).toBe(true);
    expect(batchStatements.some((statement) => statement.sql?.includes("component_duplicate_guard"))).toBe(true);
    expect(batchStatements.some((statement) => statement.sql?.includes("cost_library_item_price_options"))).toBe(true);
    expect(batchStatements.some((statement) => statement.sql?.includes("cost_library_item_versions"))).toBe(true);
    expect(batchStatements.some((statement) => statement.sql?.includes("INSERT INTO estimate_mutation_receipts"))).toBe(true);
  });

  it("rejects a reused component-create intent with a different fingerprint before writing", async () => {
    const database = createD1Fixture({ firstResults: [{ count: 0 }] });
    const { createCostLibraryComponent } = await import("@/lib/component-library/actions");
    const input = {
      intentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      name: "Fresh Oak",
      category: "Flooring",
      unit: "box",
      priceOptions: [{
        label: "V1",
        unit: "box",
        unitCost: 2500.5,
        isActive: true,
        isDefault: true,
      }],
    };

    await createCostLibraryComponent(input);
    await expect(createCostLibraryComponent({ ...input, name: "Changed Oak" })).rejects.toThrow(
      "This action changed after it was submitted. Retry it as a new action.",
    );

    expect(database.batch).toHaveBeenCalledTimes(1);
  });

  it("finds duplicate identities across the workspace with normalized supplier-or-brand matching", async () => {
    const database = createD1Fixture({
      allResults: [[{
        id: COMPONENT_ID,
        name: "Door   Hinge",
        category: "Door Hardware",
        supplier: null,
        brand: "Hinge Co",
      }]],
    });
    const { findCurrentWorkspaceCostLibraryComponentDuplicate } = await import("@/lib/component-library/actions");

    const result = await findCurrentWorkspaceCostLibraryComponentDuplicate({
      name: "  door hinge  ",
      category: "Door Hardware",
      supplier: "",
      brand: "HINGE   CO",
    });

    expect(result).toEqual({
      itemId: COMPONENT_ID,
      name: "Door   Hinge",
      category: "Door Hardware",
      supplier: null,
      brand: "Hinge Co",
    });
    const preflight = database.statements.find((statement) => statement.sql.includes("FROM cost_library_items") && statement.sql.includes("LIMIT 1"));
    expect(preflight?.sql).toContain("lifecycle_state <> 'archived'");
    expect(preflight?.sql).toContain("CHAR(9)");
    expect(preflight?.values).toEqual([
      WORKSPACE_ID,
      "door hinge",
      "door hardware",
      "",
      "",
      "hinge co",
      "hinge co",
    ]);
  });

  it("blocks an unacknowledged server duplicate before any component write", async () => {
    const database = createD1Fixture({
      allResults: [[{
        id: COMPONENT_ID,
        name: "Fresh Oak",
        category: "Flooring",
        supplier: "Acme",
        brand: "Pergo",
      }]],
    });
    const { createCostLibraryComponent } = await import("@/lib/component-library/actions");

    await expect(createCostLibraryComponent({
      intentId: "12121212-1212-4212-8212-121212121212",
      name: "Fresh Oak",
      category: "Flooring",
      supplier: "Acme",
      brand: "Pergo",
      unit: "box",
      priceOptions: [{
        label: "V1",
        unit: "box",
        unitCost: 2500.5,
        isActive: true,
        isDefault: true,
      }],
    })).rejects.toThrow('A component named "Fresh Oak" already exists. Choose Create anyway');

    expect(database.batch).not.toHaveBeenCalled();
    expect(database.statements.some((statement) => statement.sql.includes("INSERT INTO cost_library_items"))).toBe(false);
  });

  it("records an explicit create-anyway acknowledgement in the receipt fingerprint", async () => {
    const database = createD1Fixture({ firstResults: [{ count: 0 }] });
    const [{ createCostLibraryComponent }, { createMutationRequestFingerprint }] = await Promise.all([
      import("@/lib/component-library/actions"),
      import("@/lib/estimates/mutation-receipts"),
    ]);
    const input = {
      intentId: "34343434-3434-4434-8434-343434343434",
      allowDuplicate: true,
      name: "Fresh Oak",
      category: "Flooring",
      supplier: "Acme",
      brand: "Pergo",
      unit: "box",
      priceOptions: [{
        label: "V1",
        unit: "box",
        unitCost: 2500.5,
        isActive: true,
        isDefault: true,
      }],
    };

    await createCostLibraryComponent(input);

    const batchStatements = database.batch.mock.calls[0]?.[0] as Array<{ sql: string; values: unknown[] }>;
    expect(batchStatements.some((statement) => statement.sql.includes("component_duplicate_guard"))).toBe(false);
    const receipt = batchStatements.find((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"));
    const { intentId: ignoredIntentId, ...request } = input;
    void ignoredIntentId;
    expect(receipt?.values[7]).toBe(createMutationRequestFingerprint(request));
  });

  it("duplicates safe component metadata without copying attachment records into the new component", async () => {
    componentRepositoryMocks.getCurrentWorkspaceComponentRowDetail.mockImplementation(async (itemId: string) => ({
      id: itemId,
      material: itemId === COMPONENT_ID ? "Specified door hinge" : "Specified door hinge copy",
      name: itemId === COMPONENT_ID ? "Specified door hinge" : "Specified door hinge copy",
      description: "Component-level description",
      supplier: "Hardware Supplier",
      supplierId: "supplier-1",
      brand: "Hardware Brand",
      brandId: "brand-1",
      source: "library",
      unit: "pc",
      itemCost: 125,
      price: 125,
      currency: "PHP",
      quantity: 1,
      subTotal: 125,
      miscCost: 5,
      totalItemCosts: 130,
      category: "Door Hardware",
      categoryNodeId: "door-hardware",
      discipline: "Architecture",
      designation: "DH-01",
      tags: ["hinge", "specified"],
      sourceUrl: "https://example.com/specification",
      notes: "Component-level installation note",
      imageUrl: "project-scoped/component-image.webp",
      pricingSource: "Hardware Supplier",
      pricingDate: "2026-07-10",
      sourceLibraryItemId: itemId,
      lifecycleState: "available",
      componentVersionNumber: 2,
      priceOptionId: PRICE_OPTION_ID,
      priceOptions: [{
        id: PRICE_OPTION_ID,
        label: "Default",
        unit: "pc",
        unitCost: 125,
        miscCost: 5,
        currency: "PHP",
        imageBucket: "project-images",
        imagePath: `${WORKSPACE_ID}/project-1/source.webp`,
        thumbnailPath: `/api/projects/images?path=${encodeURIComponent(`${WORKSPACE_ID}/project-1/source-thumb.webp`)}`,
        imageMetadata: {
          assetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          thumbnailStoragePath: `${WORKSPACE_ID}/project-1/source-thumb.webp`,
        },
        attachments: [{ id: "attachment-1", fileName: "supplier-quote.pdf" }],
        isActive: true,
        isDefault: true,
      }, {
        id: SECOND_PRICE_OPTION_ID,
        label: "Component image variant",
        unit: "pc",
        unitCost: 150,
        miscCost: 0,
        currency: "PHP",
        imageBucket: "component-images",
        imagePath: `${WORKSPACE_ID}/user-1/source.webp`,
        thumbnailPath: `/api/component-library/images?path=${encodeURIComponent(`${WORKSPACE_ID}/user-1/source-thumb.webp`)}`,
        imageMetadata: {
          assetId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          thumbnailStoragePath: `${WORKSPACE_ID}/user-1/source-thumb.webp`,
        },
        attachments: [],
        isActive: true,
        isDefault: false,
      }],
    }));
    const database = createD1Fixture({ firstResults: [{ count: 0 }] });
    const { duplicateCostLibraryComponent } = await import("@/lib/component-library/actions");

    const result = await duplicateCostLibraryComponent({ itemId: COMPONENT_ID });

    expect(result.omittedAttachmentCount).toBe(1);
    expect(result.omittedImageCount).toBe(2);
    const batchStatements = database.batch.mock.calls[0]?.[0] as Array<{ sql: string; values: unknown[] }>;
    const itemInsert = batchStatements.find((statement) => statement.sql.includes("INSERT INTO cost_library_items"));
    expect(itemInsert?.values[19]).toBeNull();
    const metadata = JSON.parse(String(itemInsert?.values[20])) as Record<string, unknown>;
    expect(metadata).toMatchObject({
      duplicatedFrom: COMPONENT_ID,
      discipline: "Architecture",
      designation: "DH-01",
      tags: ["hinge", "specified"],
      sourceUrl: "https://example.com/specification",
      notes: "Component-level installation note",
      source: "library",
      isCustom: true,
    });
    expect(metadata).not.toHaveProperty("imageUrl");
    const priceOptionInserts = batchStatements.filter((statement) => statement.sql.includes("INSERT INTO cost_library_item_price_options"));
    expect(priceOptionInserts).toHaveLength(2);
    for (const priceOptionInsert of priceOptionInserts) {
      const priceOptionMetadata = JSON.parse(String(priceOptionInsert.values[13])) as Record<string, unknown>;
      expect(priceOptionMetadata).toMatchObject({
        imageBucket: null,
        imagePath: null,
        thumbnailPath: null,
      });
      expect(priceOptionMetadata.imageMetadata).toEqual({});
    }
    expect(batchStatements.some((statement) => statement.sql.includes("SET target_entity_type = 'cost-library-component'"))).toBe(false);
    expect(batchStatements.some((statement) => statement.sql.includes("INSERT INTO component_variant_attachments"))).toBe(false);
  });

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
          active_price_option_id: PRICE_OPTION_ID,
          pricing_source: "Supplier A",
          pricing_date: "2026-07-01",
          thumbnail_path: "/original.webp",
          metadata_json: JSON.stringify({ custom: "keep" }),
          lifecycle_state: "available",
          updated_at: "2026-07-13T09:00:00.000Z",
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
          active_price_option_id: PRICE_OPTION_ID,
          pricing_source: "Supplier A",
          pricing_date: "2026-07-13",
          thumbnail_path: "/oak.webp",
          updated_at: "2026-07-13T10:00:00.000Z",
        },
      ],
      allResults: [
        [{
          id: PRICE_OPTION_ID,
          label: "Default",
          unit: "box",
          unit_cost: 2500.5,
          misc_cost: 0,
          currency: "PHP",
          is_active: 1,
          is_default: 1,
          pricing_source: "Supplier A",
          metadata_json: JSON.stringify({ pricingDate: "2026-07-13", thumbnailPath: "/oak.webp" }),
          updated_at: "2026-07-13T09:00:00.000Z",
        }, {
          id: SECOND_PRICE_OPTION_ID,
          label: "Premium",
          unit: "set",
          unit_cost: 500,
          misc_cost: 0,
          currency: "PHP",
          is_active: 1,
          is_default: 0,
          pricing_source: "Supplier B",
          metadata_json: JSON.stringify({ pricingDate: "2026-07-12", variantDescription: "Premium finish" }),
          updated_at: "2026-07-13T09:00:00.000Z",
        }],
        [{
          row_id: "row-1",
          row_revision: 3,
          project_id: "project-1",
          estimate_id: "estimate-1",
          link_state: "linked-clean",
          selected_price_option_id: PRICE_OPTION_ID,
          source_snapshot_json: "{}",
          metadata_json: "{}",
        }, {
          row_id: "row-2",
          row_revision: 7,
          project_id: "project-1",
          estimate_id: "estimate-1",
          link_state: "linked-overridden",
          selected_price_option_id: SECOND_PRICE_OPTION_ID,
          source_snapshot_json: "{}",
          metadata_json: "{}",
        }],
      ],
      linkedRowRevisionResults: [{ id: "row-1", row_revision: 4 }, { id: "row-2", row_revision: 8 }],
    });
    const { updateCostLibraryComponentWithPriceOptions } = await import("@/lib/component-library/actions");

    const input = {
      intentId: "56565656-5656-4656-8656-565656565656",
      name: "Updated Oak",
      description: "Updated description",
      category: "Flooring",
      categoryNodeId: "category-flooring",
      supplier: "Supplier A",
      supplierId: "supplier-a",
      brand: "Pergo",
      brandId: "brand-pergo",
      unit: "box",
      thumbnailPath: "/original.webp",
      lifecycleState: "available",
      expectedUpdatedAt: "2026-07-13T09:00:00.000Z",
      expectedVersionNumber: 1,
      expectedComponentImpactFingerprint: `rows[row-1:3:linked-clean:${PRICE_OPTION_ID}|row-2:7:linked-overridden:${SECOND_PRICE_OPTION_ID}]|options[${PRICE_OPTION_ID}:2026-07-13T09:00:00.000Z:1:1|${SECOND_PRICE_OPTION_ID}:2026-07-13T09:00:00.000Z:1:0]`,
      priceOptions: [{
        id: PRICE_OPTION_ID,
        label: "Default",
        unit: "box",
        unitCost: 2500.5,
        pricingSource: "Supplier A",
        pricingDate: "2026-07-13",
        thumbnailPath: "/oak.webp",
        isActive: true,
        isDefault: true,
      }, {
        id: SECOND_PRICE_OPTION_ID,
        label: "Premium",
        unit: "set",
        unitCost: 500,
        pricingSource: "Supplier B",
        pricingDate: "2026-07-12",
        variantDescription: "Premium finish",
        isActive: true,
        isDefault: false,
      }],
    };
    const result = await updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, input);
    const replay = await updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, input);

    const linkedRowUpdate = database.statements.find((statement) =>
      statement.sql.includes("UPDATE estimate_row_items") && statement.sql.includes("source_library_item_id"),
    );
    expect(linkedRowUpdate).toBeDefined();
    expect(linkedRowUpdate?.sql).not.toContain("SET link_state =");
    expect(linkedRowUpdate?.sql).toContain("row_revision = row_revision + 1");
    expect(linkedRowUpdate?.sql).toContain("link_state IS NULL OR link_state IN ('linked-clean', 'linked-overridden')");
    expect(linkedRowUpdate?.sql).toContain("project.workspace_id = ?");
    expect(linkedRowUpdate?.sql).not.toContain("quantity =");
    expect(linkedRowUpdate?.sql).not.toContain("misc_cost =");
    expect(linkedRowUpdate?.sql).not.toContain("contingency_percentage =");
    expect(linkedRowUpdate?.sql).not.toContain("adjustment_percentage =");
    expect(linkedRowUpdate?.values).toContain(COMPONENT_ID);
    const linkedRowPlans = JSON.parse(String(linkedRowUpdate?.values[0])) as Array<{
      rowId: string;
      isOverridden: boolean;
      unit: string;
      unitCost: number;
      sourceSnapshot: { priceOptionId?: string };
    }>;
    expect(linkedRowPlans).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rowId: "row-1",
        isOverridden: false,
        unit: "box",
        unitCost: 2500.5,
        sourceSnapshot: expect.objectContaining({ priceOptionId: PRICE_OPTION_ID }),
      }),
      expect.objectContaining({
        rowId: "row-2",
        isOverridden: true,
        unit: "set",
        unitCost: 500,
        sourceSnapshot: expect.objectContaining({ priceOptionId: SECOND_PRICE_OPTION_ID }),
      }),
    ]));
    expect(database.batch).toHaveBeenCalledTimes(1);
    const revisionGuard = database.statements.find((statement) => statement.sql.includes("WHEN updated_at = ? AND current_version_number = ?"));
    expect(revisionGuard?.values).toEqual([
      "2026-07-13T09:00:00.000Z",
      1,
      COMPONENT_ID,
      WORKSPACE_ID,
    ]);
    expect(database.statements.find((statement) => statement.sql.includes("cost_library_item_versions"))?.sql).not.toContain("OR IGNORE");
    expect(database.statements.some((statement) => statement.sql.includes("UPDATE cost_library_item_variant_cost_entries"))).toBe(true);
    expect(database.statements.some((statement) => statement.sql.includes("id NOT IN"))).toBe(true);
    expect(database.statements.some((statement) => statement.sql.includes("ON CONFLICT(id) DO UPDATE"))).toBe(true);
    expect(database.statements.some((statement) => statement.sql.includes("INSERT INTO estimate_sheet_events"))).toBe(true);
    expect(database.statements.some((statement) => statement.sql.includes("INSERT INTO activity_event_outbox"))).toBe(true);
    expect(database.statements.some((statement) => statement.sql.includes("publication_source_revision = publication_source_revision + 1"))).toBe(true);
    expect(database.statements.some((statement) => statement.sql.includes("INSERT INTO estimate_mutation_receipts"))).toBe(true);
    const componentUpdate = database.statements.find((statement) =>
      statement.sql.includes("UPDATE cost_library_items") && statement.sql.includes("SET name = ?"),
    );
    expect(componentUpdate?.values).toContain("/original.webp");
    expect(componentUpdate?.values).toContain(JSON.stringify({ custom: "keep" }));
    expect(result).toMatchObject({
      itemId: COMPONENT_ID,
      versionNumber: 2,
      updatedAt: expect.any(String),
      updatedRowCount: 2,
      rowRevisions: { "row-1": 4, "row-2": 8 },
      affectedEstimates: [{ projectId: "project-1", estimateId: "estimate-1" }],
    });
    expect(replay).toMatchObject({
      itemId: COMPONENT_ID,
      versionNumber: 2,
      updatedRowCount: 2,
      rowRevisions: { "row-1": 4, "row-2": 8 },
      affectedEstimates: [{ projectId: "project-1", estimateId: "estimate-1" }],
      rowPatches: {},
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/project-1/estimates/estimate-1");
  });

  it("rejects a reused component-update intent with a different fingerprint before writing", async () => {
    const database = createD1Fixture({
      firstResults: [{
        id: COMPONENT_ID,
        workspace_id: WORKSPACE_ID,
        name: "Original",
        unit: "box",
        unit_cost: 100,
        misc_cost: 0,
        current_version_number: 1,
        active_price_option_id: PRICE_OPTION_ID,
        lifecycle_state: "available",
        updated_at: "2026-07-13T09:00:00.000Z",
      }],
      allResults: [[{
        id: PRICE_OPTION_ID,
        label: "Default",
        unit: "box",
        unit_cost: 100,
        misc_cost: 0,
        currency: "PHP",
        is_active: 1,
        is_default: 1,
        pricing_source: null,
        metadata_json: "{}",
        updated_at: "2026-07-13T09:00:00.000Z",
      }], []],
    });
    const { updateCostLibraryComponentWithPriceOptions } = await import("@/lib/component-library/actions");
    const input = {
      intentId: "78787878-7878-4878-8878-787878787878",
      name: "Updated Oak",
      category: "Flooring",
      unit: "box",
      expectedUpdatedAt: "2026-07-13T09:00:00.000Z",
      expectedVersionNumber: 1,
      expectedComponentImpactFingerprint: `rows[]|options[${PRICE_OPTION_ID}:2026-07-13T09:00:00.000Z:1:1]`,
      priceOptions: [{
        id: PRICE_OPTION_ID,
        label: "Default",
        unit: "box",
        unitCost: 100,
        isActive: true,
        isDefault: true,
      }],
    };

    await updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, input);
    await expect(updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, {
      ...input,
      name: "Changed after submit",
    })).rejects.toThrow("This action changed after it was submitted. Retry it as a new action.");

    expect(database.batch).toHaveBeenCalledTimes(1);
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
        active_price_option_id: PRICE_OPTION_ID,
        lifecycle_state: "available",
        updated_at: "2026-07-13T09:00:00.000Z",
      }],
      allResults: [
        [{
          id: PRICE_OPTION_ID,
          label: "Default",
          unit: "box",
          unit_cost: 100,
          misc_cost: 0,
          currency: "PHP",
          is_active: 1,
          is_default: 1,
          pricing_source: null,
          metadata_json: "{}",
          updated_at: "2026-07-13T09:00:00.000Z",
        }],
        [{
          row_id: "row-1",
          row_revision: 5,
          project_id: "project-1",
          estimate_id: "estimate-1",
          link_state: "linked-clean",
          selected_price_option_id: PRICE_OPTION_ID,
          source_snapshot_json: "{}",
          metadata_json: "{}",
        }],
      ],
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
      expectedUpdatedAt: "2026-07-13T09:00:00.000Z",
      expectedVersionNumber: 1,
      expectedComponentImpactFingerprint: `rows[row-1:5:linked-clean:${PRICE_OPTION_ID}]|options[${PRICE_OPTION_ID}:2026-07-13T09:00:00.000Z:1:1]`,
      priceOptions: [{
        id: PRICE_OPTION_ID,
        label: "Default",
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
      updatedAt: expect.any(String),
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
        active_price_option_id: PRICE_OPTION_ID,
        pricing_source: null,
        pricing_date: null,
        lifecycle_state: "available",
        updated_at: "2026-07-13T09:00:00.000Z",
      }],
      allResults: [[], []],
      batchFailureAt: 0,
    });
    const { updateCostLibraryComponentWithPriceOptions } = await import("@/lib/component-library/actions");

    await expect(updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, {
      name: "Should roll back",
      unit: "box",
      category: "Flooring",
      expectedUpdatedAt: "2026-07-13T09:00:00.000Z",
      expectedVersionNumber: 1,
      expectedComponentImpactFingerprint: "rows[]|options[]",
      priceOptions: [{
        label: "Default",
        unit: "box",
        unitCost: 100,
        isActive: true,
        isDefault: true,
      }],
    })).rejects.toThrow(/batch failed/);
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a stale component edit before any write batch runs", async () => {
    const database = createD1Fixture({
      firstResults: [{
        id: COMPONENT_ID,
        workspace_id: WORKSPACE_ID,
        name: "Already updated",
        unit: "box",
        unit_cost: 100,
        misc_cost: 0,
        current_version_number: 2,
        active_price_option_id: PRICE_OPTION_ID,
        pricing_source: null,
        pricing_date: null,
        thumbnail_path: null,
        metadata_json: "{}",
        lifecycle_state: "available",
        updated_at: "2026-07-13T10:00:00.000Z",
      }],
    });
    const { updateCostLibraryComponentWithPriceOptions } = await import("@/lib/component-library/actions");

    await expect(updateCostLibraryComponentWithPriceOptions(COMPONENT_ID, {
      name: "Stale edit",
      unit: "box",
      category: "Flooring",
      expectedUpdatedAt: "2026-07-13T09:00:00.000Z",
      expectedVersionNumber: 1,
      expectedComponentImpactFingerprint: "rows[]|options[]",
      priceOptions: [{
        id: PRICE_OPTION_ID,
        label: "Default",
        unit: "box",
        unitCost: 100,
        isActive: true,
        isDefault: true,
      }],
    })).rejects.toThrow(/changed after you opened it/i);
    expect(database.batch).not.toHaveBeenCalled();
  });
});
