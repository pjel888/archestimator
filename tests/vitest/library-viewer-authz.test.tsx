import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCurrentUserContext: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
  listCurrentWorkspaceProjects: vi.fn(),
  listProjectEstimateSheets: vi.fn(),
}));

const supabaseServerMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/supabase/server", () => supabaseServerMocks);
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
const PRICE_OPTION_ID = "00000000-0000-4000-8000-000000000010";

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

function mockViewerSupabaseClient() {
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: false, error: null };
    throw new Error(`viewer mutation must stop before RPC ${name}`);
  });
  const from = vi.fn((table: string) => {
    throw new Error(`viewer mutation must stop before table access: ${table}`);
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { from, rpc };
}

function mockEditorSupabaseClient() {
  const quotaEq = vi.fn(async () => ({ count: 0, error: null }));
  const quotaSelect = vi.fn(() => ({ eq: quotaEq }));
  const from = vi.fn((table: string) => {
    if (table === "cost_library_items") return { select: quotaSelect };
    throw new Error(`unexpected table access: ${table}`);
  });
  const rpc = vi.fn(async (name: string) => {
    if (name === "is_workspace_editor") return { data: true, error: null };
    if (name === "create_cost_library_component") {
      return {
        data: {
          itemId: COMPONENT_ID,
          versionNumber: 1,
          activePriceOptionId: PRICE_OPTION_ID,
          priceOptions: [{ id: PRICE_OPTION_ID, label: "V1", isDefault: true }],
        },
        error: null,
      };
    }
    throw new Error(`unexpected RPC: ${name}`);
  });
  supabaseServerMocks.createSupabaseServerClient.mockResolvedValue({ from, rpc });
  return { from, rpc };
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
  authMocks.requireAuth.mockResolvedValue({
    id: USER_ID,
  });
});

describe("library viewer mutation authorization", () => {
  it("denies workspace viewers before component and template mutations reach write paths", async () => {
    const supabase = mockViewerSupabaseClient();
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

    expect(supabase.rpc).toHaveBeenCalledTimes(libraryMutationAttempts.length);
    expect(supabase.rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: WORKSPACE_ID });
    expect(supabase.rpc.mock.calls.every(([name]) => name === "is_workspace_editor")).toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("denies workspace viewers before folder mutations reach write paths", async () => {
    const supabase = mockViewerSupabaseClient();
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

    expect(supabase.rpc).toHaveBeenCalledTimes(folderMutationAttempts.length);
    expect(supabase.rpc).toHaveBeenCalledWith("is_workspace_editor", { target_workspace_id: WORKSPACE_ID });
    expect(supabase.rpc.mock.calls.every(([name]) => name === "is_workspace_editor")).toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("strips non-OpenDesign fields before creating a component through Supabase", async () => {
    const supabase = mockEditorSupabaseClient();
    const actions = await import("@/lib/component-library/actions");

    await actions.createCostLibraryComponent({
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

    const createCall = supabase.rpc.mock.calls.find(([name]) => name === "create_cost_library_component");
    expect(createCall).toBeTruthy();
    const params = createCall?.[1] as Record<string, unknown>;
    const component = params.component as Record<string, unknown>;
    const priceOptions = params.price_options as Array<Record<string, unknown>>;
    const option = priceOptions[0];
    const packageOption = priceOptions[1];

    expect(component).toEqual(expect.objectContaining({
      name: "OpenDesign Component",
      category: "Hardware",
      unit: "unit",
      createdBy: USER_ID,
    }));
    expect(component).not.toHaveProperty("fieldContract");
    expect(component).not.toHaveProperty("priceOptions");
    expect(component).not.toHaveProperty("libraryFolderId");

    expect(option).toEqual(expect.objectContaining({
      label: "V1",
      unit: "unit",
      unitCost: 12.34,
      currency: "PHP",
      isDefault: true,
    }));
    expect(option).not.toHaveProperty("packageQuantity");
    expect(option).not.toHaveProperty("packageUnit");
    expect(packageOption).toEqual(expect.objectContaining({
      label: "Box",
      unit: "box",
      packageQuantity: 12,
      packageUnit: "pieces",
      isDefault: false,
    }));
    for (const retiredField of [
      "miscCost",
      "pricingSource",
      "pricingDate",
      "confidence",
      "sourceUrl",
      "notes",
      "activeCostEntryId",
      "costEntries",
      "dimensionLength",
      "dimensionWidth",
      "dimensionHeight",
      "dimensionUnit",
      "mass",
      "massUnit",
      "variantMetadata",
    ]) {
      expect(option).not.toHaveProperty(retiredField);
    }
  });
});
