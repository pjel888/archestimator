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
const SHARED_WORKSPACE_ID = "00000000-0000-4000-8000-000000000010";
const TEMPLATE_NODE_ID = "00000000-0000-4000-8000-000000000011";

const validComponentInput = {
  name: "Viewer Guard Component",
  unit: "pc",
  expectedUpdatedAt: "2026-07-13T09:00:00.000Z",
  expectedVersionNumber: 1,
  priceOptions: [
    {
      label: "Standard",
      unit: "pc",
      unitCost: 100,
      isDefault: true,
    },
  ],
};

function templateD1Row(workspaceId: string) {
  return {
    id: TEMPLATE_ID,
    workspace_id: workspaceId,
    name: "Shared Source Template",
    description: "",
    category: "General",
    sort_order: 0,
    metadata: "{}",
    created_by: USER_ID,
    created_at: "2026-07-03T00:00:00.000Z",
    updated_at: "2026-07-03T00:00:00.000Z",
  };
}

function templateNodeD1Row() {
  return {
    id: TEMPLATE_NODE_ID,
    template_id: TEMPLATE_ID,
    parent_id: null,
    kind: "group",
    name: "Shared Node",
    sort_order: 0,
    metadata: "{}",
    created_at: "2026-07-03T00:00:00.000Z",
    updated_at: "2026-07-03T00:00:00.000Z",
  };
}

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
    batch: vi.fn(async (preparedStatements: Array<{ run: () => Promise<unknown> }>) => (
      Promise.all(preparedStatements.map((statement) => statement.run()))
    )),
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
    ];

    for (const attempt of libraryMutationAttempts) {
      await expect(attempt()).rejects.toThrow("Only workspace editors/admins can manage the library.");
    }

    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledTimes(libraryMutationAttempts.length);
    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(d1, WORKSPACE_ID, expect.objectContaining({ userId: USER_ID }));
    expect(d1.prepare).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("denies workspace viewers before saving target-workspace estimate sources as templates", async () => {
    const d1 = createD1Fixture({
      firstResults: [
        { id: ESTIMATE_ID, project_id: PROJECT_ID, workspace_id: WORKSPACE_ID },
        { id: ESTIMATE_ID, project_id: PROJECT_ID, workspace_id: WORKSPACE_ID },
      ],
    });
    authzMocks.isWorkspaceEditorInD1.mockResolvedValue(false);
    const actions = await import("@/lib/component-library/actions");

    const sourceTemplateAttempts = [
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

    for (const attempt of sourceTemplateAttempts) {
      await expect(attempt()).rejects.toThrow("Only workspace editors/admins can manage the library.");
    }

    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledTimes(sourceTemplateAttempts.length);
    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(d1, WORKSPACE_ID, expect.objectContaining({ userId: USER_ID }));
    expect(authzMocks.canEditEstimateInD1).not.toHaveBeenCalled();
    expect(d1.statements).toHaveLength(sourceTemplateAttempts.length);
    expect(d1.statements.every((statement) => statement.sql.includes("FROM estimates estimate"))).toBe(true);
    expect(d1.statements.every((statement) => !statement.sql.includes("project.workspace_id = ?"))).toBe(true);
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("saves estimate-node templates into the source project's workspace instead of the default workspace", async () => {
    const d1 = createD1Fixture({
      firstResults: [
        { id: ESTIMATE_ID, project_id: PROJECT_ID, workspace_id: SHARED_WORKSPACE_ID },
        { count: 0 },
        null,
        templateD1Row(SHARED_WORKSPACE_ID),
        templateD1Row(SHARED_WORKSPACE_ID),
      ],
      allResults: [
        [{ id: SOURCE_NODE_ID, parent_id: null, kind: "group", name: "Shared Node", sort_order: 0 }],
        [],
        [templateNodeD1Row()],
        [],
      ],
    });
    const actions = await import("@/lib/component-library/actions");

    const result = await actions.createEstimateTemplateFromEstimateNode({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      sourceNodeId: SOURCE_NODE_ID,
      name: "Shared Source Template",
    });

    expect(result.template.id).toBe(TEMPLATE_ID);
    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(d1, SHARED_WORKSPACE_ID, expect.objectContaining({ userId: USER_ID }));
    expect(authzMocks.canEditEstimateInD1).toHaveBeenCalledWith(d1, ESTIMATE_ID, expect.objectContaining({ userId: USER_ID }));
    const quotaCheck = d1.statements.find((statement) => statement.sql.includes("SELECT COUNT(*) AS count FROM estimate_templates"));
    expect(quotaCheck?.values).toEqual([SHARED_WORKSPACE_ID]);
    const sortOrderRead = d1.statements.find((statement) => statement.sql.includes("FROM estimate_templates") && statement.sql.includes("ORDER BY sort_order DESC"));
    expect(sortOrderRead?.values).toEqual([SHARED_WORKSPACE_ID]);
    const insertTemplate = d1.statements.find((statement) => statement.sql.includes("INSERT INTO estimate_templates"));
    expect(insertTemplate?.values[1]).toBe(SHARED_WORKSPACE_ID);
    expect(insertTemplate?.values).not.toContain(WORKSPACE_ID);
  });

  it("saves estimate-tab templates into the source project's workspace instead of the default workspace", async () => {
    const d1 = createD1Fixture({
      firstResults: [
        { id: ESTIMATE_ID, project_id: PROJECT_ID, workspace_id: SHARED_WORKSPACE_ID },
        { count: 0 },
        null,
        templateD1Row(SHARED_WORKSPACE_ID),
        templateD1Row(SHARED_WORKSPACE_ID),
      ],
      allResults: [
        [{ id: SOURCE_NODE_ID, parent_id: null, kind: "group", name: "Shared Node", sort_order: 0 }],
        [],
        [templateNodeD1Row()],
        [],
      ],
    });
    const actions = await import("@/lib/component-library/actions");

    const result = await actions.createEstimateTemplateFromEstimateTab({
      projectId: PROJECT_ID,
      estimateId: ESTIMATE_ID,
      tabId: TAB_ID,
      tabName: "Main",
      name: "Shared Tab Template",
    });

    expect(result.template.id).toBe(TEMPLATE_ID);
    expect(authzMocks.isWorkspaceEditorInD1).toHaveBeenCalledWith(d1, SHARED_WORKSPACE_ID, expect.objectContaining({ userId: USER_ID }));
    expect(authzMocks.canEditEstimateInD1).toHaveBeenCalledWith(d1, ESTIMATE_ID, expect.objectContaining({ userId: USER_ID }));
    const insertTemplate = d1.statements.find((statement) => statement.sql.includes("INSERT INTO estimate_templates"));
    expect(insertTemplate?.values[1]).toBe(SHARED_WORKSPACE_ID);
    expect(insertTemplate?.values).not.toContain(WORKSPACE_ID);
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
      categoryNodeId: "   ",
      supplierId: "   ",
      brandId: "   ",
      unit: "unit",
      libraryFolderId: FOLDER_ID,
      priceOptions: [{
        label: "V1",
        unit: "unit",
        unitCost: 12.34,
        miscCost: 99,
        pricingSource: "Supplier quote",
        pricingDate: "2026-01-10",
        sourceUrl: "https://example.com/source",
        notes: "Legacy note",
        activeCostEntryId: "legacy-entry",
        costEntries: [{
          unitCost: 12.34,
          miscCost: 4,
          pricingSource: "Supplier quote",
          pricingDate: "2026-01-10",
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
    expect(componentInsert?.values[5]).toBeNull();
    expect(componentInsert?.values[6]).toBeNull();
    expect(componentInsert?.values[8]).toBeNull();
    expect(componentInsert?.values[10]).toBeNull();

    const priceOptionInserts = d1.statements.filter((statement) => statement.sql.includes("INSERT INTO cost_library_item_price_options"));
    expect(priceOptionInserts).toHaveLength(2);
    expect(d1.statements.filter((statement) => statement.sql.includes("SELECT metadata_json"))).toHaveLength(0);
    expect(priceOptionInserts[0]?.values[3]).toBe("V1");
    expect(priceOptionInserts[0]?.values[5]).toBe(12.34);
    expect(priceOptionInserts[0]?.values[6]).toBe(0);
    expect(priceOptionInserts[0]?.values[11]).toBeNull();
    expect(priceOptionInserts[0]?.values[12]).toBeNull();
    expect(JSON.parse(String(priceOptionInserts[0]?.values[13]))).toEqual(expect.objectContaining({
      packageQuantity: null,
      packageUnit: null,
      variantMetadata: {},
    }));
    expect(JSON.parse(String(priceOptionInserts[1]?.values[13]))).toEqual(expect.objectContaining({
      packageQuantity: 12,
      packageUnit: "pieces",
    }));
  });

  it("saves component drafts without invalidating cached component library routes", async () => {
    const d1 = createD1Fixture({ firstResults: [{ count: 0 }] });
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.saveCostLibraryComponentDraft({
      fieldContract: "opendesign-add-component",
      title: "Fast draft",
      draft: {
        form: { name: "Fast draft" },
        activeTab: "component",
      },
    })).resolves.toEqual({
      draftId: expect.any(String),
      savedAt: expect.any(String),
    });

    const draftCleanup = d1.statements.find((statement) => (
      statement.sql.includes("UPDATE cost_library_component_drafts")
      && statement.sql.includes("status = 'discarded'")
      && statement.sql.includes("LIMIT -1 OFFSET ?")
    ));
    expect(draftCleanup?.sql).toContain("AND id IN (");
    expect(draftCleanup?.sql).not.toContain("AND id NOT IN (");
    expect(draftCleanup?.values.at(-1)).toBe(99);
    const draftInsert = d1.statements.find((statement) => statement.sql.includes("INSERT INTO cost_library_component_drafts"));
    expect(draftInsert).toBeDefined();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("discards older active component drafts before checking the active draft cap", async () => {
    const d1 = createD1Fixture({ firstResults: [{ count: 99 }] });
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.saveCostLibraryComponentDraft({
      fieldContract: "opendesign-add-component",
      title: "Keeps latest drafts",
      draft: {
        form: { name: "Keeps latest drafts" },
      },
    })).resolves.toEqual({
      draftId: expect.any(String),
      savedAt: expect.any(String),
    });

    const cleanupIndex = d1.statements.findIndex((statement) => statement.sql.includes("UPDATE cost_library_component_drafts"));
    const countIndex = d1.statements.findIndex((statement) => statement.sql.includes("SELECT COUNT(*) AS count FROM cost_library_component_drafts"));
    const insertIndex = d1.statements.findIndex((statement) => statement.sql.includes("INSERT INTO cost_library_component_drafts"));
    expect(cleanupIndex).toBeGreaterThanOrEqual(0);
    expect(countIndex).toBeGreaterThan(cleanupIndex);
    expect(insertIndex).toBeGreaterThan(countIndex);
    expect(d1.statements[cleanupIndex]?.sql).toContain("status = 'discarded'");
    expect(d1.statements[cleanupIndex]?.sql).toContain("AND id IN (");
    expect(d1.statements[cleanupIndex]?.sql).not.toContain("AND id NOT IN (");
    expect(d1.statements[cleanupIndex]?.values).toEqual([
      expect.any(String),
      expect.any(String),
      WORKSPACE_ID,
      WORKSPACE_ID,
      99,
    ]);
  });

  it("limits active component drafts after cleanup if the workspace is still at cap", async () => {
    const d1 = createD1Fixture({ firstResults: [{ count: 100 }] });
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.saveCostLibraryComponentDraft({
      fieldContract: "opendesign-add-component",
      title: "Too many drafts",
      draft: {
        form: { name: "Too many drafts" },
      },
    })).rejects.toThrow("active component draft limit (100)");

    expect(d1.statements.some((statement) => (
      statement.sql.includes("SELECT COUNT(*) AS count FROM cost_library_component_drafts")
      && statement.sql.includes("status = 'active'")
    ))).toBe(true);
    expect(d1.statements.some((statement) => statement.sql.includes("INSERT INTO cost_library_component_drafts"))).toBe(false);
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects oversized component draft payloads before quota checks or inserts", async () => {
    const d1 = createD1Fixture();
    const actions = await import("@/lib/component-library/actions");

    await expect(actions.saveCostLibraryComponentDraft({
      fieldContract: "opendesign-add-component",
      title: "Oversized draft",
      draft: {
        form: { notes: "x".repeat(66 * 1024) },
      },
    })).rejects.toThrow("Component drafts must be 65536 bytes or smaller.");

    expect(d1.prepare).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });
});
