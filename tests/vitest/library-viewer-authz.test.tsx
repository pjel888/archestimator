import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));

const d1Mocks = vi.hoisted(() => ({
  getCloudflareD1Database: vi.fn(),
}));

const authzMocks = vi.hoisted(() => ({
  canEditEstimateInD1: vi.fn(),
  isWorkspaceEditorInD1: vi.fn(),
  isWorkspaceMemberInD1: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/cloudflare/d1", () => d1Mocks);
vi.mock("@/lib/authz/d1-access", () => authzMocks);
vi.mock("next/cache", () => cacheMocks);

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";
const COMPONENT_ID = "00000000-0000-4000-8000-000000000003";
const FOLDER_ID = "00000000-0000-4000-8000-000000000004";
const TEMPLATE_ID = "00000000-0000-4000-8000-000000000005";
const PROJECT_ID = "00000000-0000-4000-8000-000000000006";
const ESTIMATE_ID = "00000000-0000-4000-8000-000000000007";
const SOURCE_NODE_ID = "00000000-0000-4000-8000-000000000008";
const TAB_ID = "00000000-0000-4000-8000-000000000009";

const validComponentInput = {
  name: "Viewer Guard Component",
  unit: "pc",
  priceOptions: [
    {
      label: "Standard",
      unit: "pc",
      unitCost: 100,
      isDefault: true,
    },
  ],
};

function createD1Fixture(options: {
  firstResults?: unknown[];
  allResults?: unknown[][];
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
          run: vi.fn(async () => ({ success: true, meta: { changes: 1 } })),
        };
      }),
    })),
    statements,
  };
  d1Mocks.getCloudflareD1Database.mockResolvedValue(database);
  return database;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
    workspace: { id: WORKSPACE_ID },
    profile: { id: USER_ID },
  });
  authMocks.requireCurrentUserContext.mockResolvedValue({
    userId: USER_ID,
    profile: { id: USER_ID },
  });
  authzMocks.isWorkspaceEditorInD1.mockResolvedValue(true);
  authzMocks.canEditEstimateInD1.mockResolvedValue(true);
  authzMocks.isWorkspaceMemberInD1.mockResolvedValue(true);
});

describe("library viewer mutation authorization", () => {
  it("denies workspace viewers before component and template mutations reach D1 write paths", async () => {
    const d1 = createD1Fixture();
    authzMocks.isWorkspaceEditorInD1.mockResolvedValue(false);
    const actions = await import("@/lib/component-library/actions");

    const libraryMutationAttempts = [
      () => actions.createCostLibraryComponent(validComponentInput),
      () => actions.updateCostLibraryComponent(COMPONENT_ID, validComponentInput),
      () => actions.upsertCostLibraryComponentPriceOption(COMPONENT_ID, validComponentInput.priceOptions[0]),
      () => actions.changeCostLibraryComponentLifecycleState({ itemId: COMPONENT_ID, lifecycleState: "archived" }),
      () => actions.executeBulkArchiveLibraryComponents({ itemIds: [COMPONENT_ID], expectedPreviewHash: "hash" }),
      () => actions.createEstimateTemplate({ name: "Viewer Template" }),
      () => actions.renameEstimateTemplate({ templateId: TEMPLATE_ID, name: "Viewer Rename" }),
      () => actions.deleteEstimateTemplate({ templateId: TEMPLATE_ID }),
      () => actions.duplicateEstimateTemplate({ templateId: TEMPLATE_ID }),
      () => actions.moveEstimateTemplateToCategory({ templateId: TEMPLATE_ID, category: "Viewer" }),
      () => actions.renameTemplateCategory({ from: "Old", to: "New" }),
      () => actions.createEstimateTemplateFromEstimateNode({
        projectId: PROJECT_ID,
        estimateId: ESTIMATE_ID,
        sourceNodeId: SOURCE_NODE_ID,
        name: "Viewer Node Template",
      }),
      () => actions.createEstimateTemplateFromEstimateTab({
        projectId: PROJECT_ID,
        estimateId: ESTIMATE_ID,
        tabId: TAB_ID,
        tabName: "Main",
        name: "Viewer Tab Template",
      }),
    ];

    for (const attempt of libraryMutationAttempts) {
      await expect(attempt()).rejects.toThrow("Only workspace editors/admins can manage the library.");
    }

    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledTimes(libraryMutationAttempts.length);
    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(d1, WORKSPACE_ID, expect.objectContaining({ userId: USER_ID }));
    expect(d1.prepare).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("denies workspace viewers before folder mutations reach D1 write paths", async () => {
    const d1 = createD1Fixture();
    authzMocks.isWorkspaceEditorInD1.mockResolvedValue(false);
    const actions = await import("@/lib/component-library/actions");

    const folderMutationAttempts = [
      () => actions.createLibraryFolder(null, "Viewer Folder"),
      () => actions.renameLibraryFolder(FOLDER_ID, "Viewer Folder Rename"),
      () => actions.deleteLibraryFolder(FOLDER_ID),
      () => actions.reorderLibraryFolders({ updates: [{ id: FOLDER_ID, parentId: null, sortOrder: 10 }] }),
      () => actions.moveCostLibraryComponentToFolder({ itemId: COMPONENT_ID, libraryFolderId: FOLDER_ID }),
    ];

    for (const attempt of folderMutationAttempts) {
      await expect(attempt()).rejects.toThrow("Only workspace editors/admins can manage library folders.");
    }

    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledTimes(folderMutationAttempts.length);
    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(d1, WORKSPACE_ID, expect.objectContaining({ userId: USER_ID }));
    expect(d1.prepare).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("sanitizes non-OpenDesign fields before creating a component through D1", async () => {
    const d1 = createD1Fixture({
      firstResults: [
        { count: 0 },
        null,
        null,
      ],
    });
    const actions = await import("@/lib/component-library/actions");

    const result = await actions.createCostLibraryComponent({
      fieldContract: "opendesign-add-component",
      name: "OpenDesign Component",
      category: "Hardware",
      unit: "unit",
      libraryFolderId: FOLDER_ID,
      priceOptions: [{
        label: "V1",
        unit: "unit",
        unitCost: 12.34,
        miscCost: 99,
        pricingSource: "Supplier quote",
        pricingDate: "2026-01-10",
        confidence: "high",
        sourceUrl: "https://example.com/source",
        notes: "Legacy note",
        activeCostEntryId: "legacy-entry",
        costEntries: [{
          unitCost: 12.34,
          miscCost: 4,
          pricingSource: "Supplier quote",
          pricingDate: "2026-01-10",
          confidence: "high",
          sourceUrl: "https://example.com/source",
          notes: "Legacy entry note",
          isCurrent: true,
        }],
        packageQuantity: 1,
        packageUnit: "unit",
        dimensionLength: 1,
        dimensionWidth: 2,
        dimensionHeight: 3,
        dimensionUnit: "m",
        mass: 4,
        massUnit: "kg",
        variantMetadata: { legacy: true },
        isDefault: true,
      }, {
        label: "Box",
        unit: "box",
        unitCost: 24,
        packageQuantity: 12,
        packageUnit: "pieces",
        isDefault: false,
      }],
    });

    expect(result.itemId).toEqual(expect.any(String));
    const componentInsert = d1.statements.find((statement) => statement.sql.includes("INSERT INTO cost_library_items"));
    expect(componentInsert?.values[2]).toBe("OpenDesign Component");
    expect(componentInsert?.values[4]).toBe("Hardware");
    expect(componentInsert?.values[6]).toBeNull();

    const priceOptionInserts = d1.statements.filter((statement) => statement.sql.includes("INSERT INTO cost_library_item_price_options"));
    expect(priceOptionInserts).toHaveLength(2);
    expect(priceOptionInserts[0]?.values[3]).toBe("V1");
    expect(priceOptionInserts[0]?.values[5]).toBe(12.34);
    expect(priceOptionInserts[0]?.values[6]).toBe(0);
    expect(priceOptionInserts[0]?.values[11]).toBeNull();
    expect(priceOptionInserts[0]?.values[13]).toBeNull();
    expect(JSON.parse(String(priceOptionInserts[0]?.values[14]))).toEqual(expect.objectContaining({
      packageQuantity: null,
      packageUnit: null,
      variantMetadata: {},
    }));
    expect(JSON.parse(String(priceOptionInserts[1]?.values[14]))).toEqual(expect.objectContaining({
      packageQuantity: 12,
      packageUnit: "pieces",
    }));
  });
});
