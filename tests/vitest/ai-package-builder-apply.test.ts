import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildPackageBuilderDraft } from "@/lib/ai/package-builder/draft";
import type { PackageBuilderReadToolsData } from "@/lib/ai/package-builder/read-tools";
import { buildPackageDraftHash, type PackageBuilderDraft } from "@/lib/ai/package-builder/schemas";

const workspaceMocks = vi.hoisted(() => ({
  ensureDefaultWorkspace: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => workspaceMocks);
vi.mock("@/lib/auth/session", () => authMocks);
vi.mock("@/lib/supabase/server", () => supabaseMocks);
vi.mock("next/cache", () => cacheMocks);

function makeQueryResult(data: unknown[] = []) {
  const result = { data, error: null };
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(async () => result),
  };
  return builder;
}

function makeThreeBedroomCondoReadData(): PackageBuilderReadToolsData {
  return {
    workspace: { name: "Test Workspace" },
    projects: [],
    projectSummary: null,
    projectEstimates: [],
    estimateSummary: null,
    estimateTree: [],
    areaRows: [],
    historicalRowMatches: [],
    comparableEstimatePackages: [],
    componentMatches: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        material: "Queen bed frame",
        description: "Standard bed frame for condo bedrooms.",
        category: "Furniture",
        categoryPath: ["Objects", "Furniture"],
        supplier: "Bedroom Supplier",
        supplierId: null,
        brand: null,
        unit: "pc",
        unitCost: 18_000,
        miscCost: 0,
        currency: "PHP",
        lifecycleState: "available",
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        currentVersionNumber: 1,
        confidence: "catalog",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        material: "Water closet",
        description: "Floor-mounted toilet fixture for toilet and bath areas.",
        category: "Sanitary Systems",
        categoryPath: ["Systems", "Sanitary Systems"],
        supplier: "Plumbing Supplier",
        supplierId: null,
        brand: null,
        unit: "set",
        unitCost: 12_500,
        miscCost: 0,
        currency: "PHP",
        lifecycleState: "available",
        sourceLibraryItemId: "22222222-2222-4222-8222-222222222222",
        currentVersionNumber: 1,
        confidence: "catalog",
      },
    ],
    templateMatches: [],
    memoryPreferences: { componentSignals: [], templateSignals: [], sourceRowCount: 0 },
    auditEvents: [],
  };
}

function makeLibraryValidationRows() {
  return [
    {
      id: "11111111-1111-4111-8111-111111111111",
      workspace_id: "55555555-5555-4555-8555-555555555555",
      name: "Queen bed frame",
      description: "Standard bed frame for condo bedrooms.",
      supplier: "Bedroom Supplier",
      supplier_id: null,
      category: "Furniture",
      category_node_id: null,
      brand: null,
      brand_id: null,
      unit: "pc",
      unit_cost: 18_000,
      misc_cost: 0,
      lifecycle_state: "available",
      current_version_number: 1,
      active_price_option_id: null,
      pricing_date: "2026-05-28",
      pricing_source: "Component library",
      confidence: "catalog",
      thumbnail_path: null,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      workspace_id: "55555555-5555-4555-8555-555555555555",
      name: "Water closet",
      description: "Floor-mounted toilet fixture for toilet and bath areas.",
      supplier: "Plumbing Supplier",
      supplier_id: null,
      category: "Sanitary Systems",
      category_node_id: null,
      brand: null,
      brand_id: null,
      unit: "set",
      unit_cost: 12_500,
      misc_cost: 0,
      lifecycle_state: "available",
      current_version_number: 1,
      active_price_option_id: null,
      pricing_date: "2026-05-28",
      pricing_source: "Component library",
      confidence: "catalog",
      thumbnail_path: null,
    },
  ];
}

function makeFillCurrentEstimateDraft(): PackageBuilderDraft {
  return {
    schemaVersion: 1,
    mode: "draft",
    intent: "fill_current_estimate",
    draftId: "draft-fill-current",
    target: {
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      nodeIdsByClientDraftId: {
        "existing-root": "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        "existing-area-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      },
      areaNodeIdsByClientDraftId: {
        "existing-area-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      },
    },
    brief: {
      projectName: "Lewis Residence",
      targetBudget: 5_000_000,
      currencyCode: "PHP",
      bedrooms: 3,
      floorCount: 1,
      finishLevel: "standard",
      missingInputs: ["gross floor area"],
    },
    projectDraft: { name: "Lewis Residence", clientName: null, location: null, projectBudget: 5_000_000 },
    estimateDraft: { name: "Current Estimate", sheetCode: "ES-001" },
    treeDraft: [
      { clientDraftId: "existing-root", kind: "group", name: "Current Estimate", parentClientDraftId: null, sortOrder: 0 },
      { clientDraftId: "existing-area-1", kind: "area", name: "Master Bedroom", parentClientDraftId: "existing-root", sortOrder: 0 },
    ],
    rowDraft: [
      {
        clientDraftId: "row-bedroom-bed",
        targetAreaClientDraftId: "existing-area-1",
        sourceType: "allowance",
        sourceLibraryItemId: null,
        sourceTemplateId: null,
        material: "Master Bedroom bed allowance",
        description: "Generated bed allowance.",
        supplier: null,
        quantity: 1,
        unit: "allowance",
        unitCost: 25_000,
        miscCost: 1_000,
        contingencyPercentage: 10,
        confidence: "requires-user-review",
        assumption: "No matched component.",
        warnings: ["Review before purchase."],
        applyEligible: true,
      },
    ],
    componentMatches: [],
    templateMatches: [],
    operations: [
      { operationId: "op-row-bedroom-bed", type: "insert_allowance_row", clientDraftId: "row-bedroom-bed", applyEligible: true },
    ],
    budgetSummary: {
      targetBudget: 5_000_000,
      draftSubtotal: 25_000,
      allowanceTotal: 26_000,
      contingencyTotal: 2_500,
      draftTotal: 28_500,
      variance: -4_971_500,
      currencyCode: "PHP",
      completeness: "partial",
    },
    assumptions: ["Targets the current estimate."],
    warnings: ["Generated allowance rows are review items."],
    applyEligibility: { eligible: true, reasons: [] },
    requiresConfirmation: true,
  };
}

function makeFillCurrentEstimateDraftWithNewArea(): PackageBuilderDraft {
  const draft = makeFillCurrentEstimateDraft();
  return {
    ...draft,
    target: {
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      selectedNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
      activeTabId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      nodeIdsByClientDraftId: {
        "existing-root": "cccccccc-3333-4ccc-8ccc-cccccccc3333",
      },
      areaNodeIdsByClientDraftId: {},
    },
    treeDraft: [
      { clientDraftId: "existing-root", kind: "group", name: "Current Estimate", parentClientDraftId: null, sortOrder: 0 },
      { clientDraftId: "area-master-bedroom", kind: "area", name: "Master Bedroom", parentClientDraftId: "existing-root", sortOrder: 0 },
    ],
    rowDraft: [
      {
        ...draft.rowDraft[0],
        targetAreaClientDraftId: "area-master-bedroom",
      },
    ],
    operations: [
      { operationId: "op-tree-master-bedroom", type: "create_tree_node", clientDraftId: "area-master-bedroom", applyEligible: true },
      { operationId: "op-row-bedroom-bed", type: "insert_allowance_row", clientDraftId: "row-bedroom-bed", applyEligible: true },
    ],
  };
}

function makeFillCurrentEstimateRowUpdateDraft(): PackageBuilderDraft {
  const draft = makeFillCurrentEstimateDraft();
  return {
    ...draft,
    rowDraft: [],
    rowUpdateDraft: [
      {
        clientDraftId: "update-bedroom-bed",
        targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
        expectedRowRevision: 3,
        patch: {
          quantity: 2,
          miscCost: 1_500,
          contingencyPercentage: 12,
        },
        warnings: ["Review row update before Apply."],
        applyEligible: true,
      },
    ],
    operations: [
      { operationId: "op-update-bedroom-bed", type: "update_existing_row", clientDraftId: "update-bedroom-bed", applyEligible: true },
    ],
    budgetSummary: {
      ...draft.budgetSummary,
      draftSubtotal: 0,
      allowanceTotal: 0,
      contingencyTotal: 0,
      draftTotal: 0,
    },
  } as PackageBuilderDraft;
}

function makeFillCurrentEstimateRowReplacementDraft(): PackageBuilderDraft {
  const draft = makeFillCurrentEstimateDraft();
  return {
    ...draft,
    rowDraft: [],
    rowUpdateDraft: [],
    rowReplacementDraft: [
      {
        clientDraftId: "replace-row-existing-bed-with-queen-bed-frame",
        targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
        expectedRowRevision: 3,
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        priceOptionId: null,
        priceOptionUpdatedAt: null,
        material: "Queen bed frame",
        description: "Standard bed frame for condo bedrooms.",
        supplier: "Bedroom Supplier",
        quantity: 1,
        unit: "pc",
        unitCost: 18_000,
        miscCost: 0,
        contingencyPercentage: 0,
        category: "Furniture",
        categoryPath: ["Objects", "Furniture"],
        supplierId: null,
        brand: null,
        currentVersionNumber: 1,
        warnings: ["Review the replacement before Apply; this changes an existing estimate row source."],
        applyEligible: true,
        sourceSnapshot: {
          sourceType: "library_item",
          sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
          componentVersionNumber: 1,
        },
      },
    ],
    operations: [
      {
        operationId: "op-replace-row-existing-bed-with-queen-bed-frame",
        type: "replace_existing_row",
        clientDraftId: "replace-row-existing-bed-with-queen-bed-frame",
        applyEligible: true,
      },
    ],
    budgetSummary: {
      ...draft.budgetSummary,
      draftSubtotal: 18_000,
      allowanceTotal: 0,
      contingencyTotal: 0,
      draftTotal: 18_000,
      variance: -4_982_000,
    },
  } as PackageBuilderDraft;
}

function makeFillCurrentEstimateRowDeleteDraft(): PackageBuilderDraft {
  const draft = makeFillCurrentEstimateDraft();
  return {
    ...draft,
    rowDraft: [],
    rowUpdateDraft: [],
    rowReplacementDraft: [],
    rowDeleteDraft: [
      {
        clientDraftId: "delete-row-existing-bed",
        targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
        expectedRowRevision: 3,
        warnings: ["Review the delete before Apply; this removes an existing estimate row."],
        applyEligible: true,
      },
    ],
    operations: [
      {
        operationId: "op-delete-row-existing-bed",
        type: "delete_existing_row",
        clientDraftId: "delete-row-existing-bed",
        applyEligible: true,
      },
    ],
    budgetSummary: {
      ...draft.budgetSummary,
      draftSubtotal: 0,
      allowanceTotal: 0,
      contingencyTotal: 0,
      draftTotal: 0,
      variance: -5_000_000,
    },
  } as PackageBuilderDraft;
}

function makeFillCurrentEstimateNodeRenameDraft(): PackageBuilderDraft {
  const draft = makeFillCurrentEstimateDraft();
  return {
    ...draft,
    rowDraft: [],
    rowUpdateDraft: [],
    rowReplacementDraft: [],
    rowDeleteDraft: [],
    nodeRenameDraft: [
      {
        clientDraftId: "rename-node-master-bedroom",
        targetNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        currentName: "Master Bedroom",
        nextName: "Primary Bedroom",
        warnings: ["Review the rename before Apply; this changes an existing estimate tree node."],
        applyEligible: true,
      },
    ],
    operations: [
      {
        operationId: "op-rename-node-master-bedroom",
        type: "rename_estimate_node",
        clientDraftId: "rename-node-master-bedroom",
        applyEligible: true,
      },
    ],
    budgetSummary: {
      ...draft.budgetSummary,
      draftSubtotal: 0,
      allowanceTotal: 0,
      contingencyTotal: 0,
      draftTotal: 0,
      variance: -5_000_000,
    },
  } as PackageBuilderDraft;
}

function makeFillCurrentEstimateTemplateRowCopyDraft(): PackageBuilderDraft {
  const draft = makeFillCurrentEstimateDraft();
  return {
    ...draft,
    rowDraft: [],
    rowUpdateDraft: [],
    rowReplacementDraft: [],
    rowDeleteDraft: [],
    templateRowCopyDraft: [
      {
        clientDraftId: "copy-template-row-template-bedroom-paint-finish",
        sourceTemplateId: "11111111-1111-4111-8111-111111111111",
        sourceTemplateRowId: "99999999-9999-4999-8999-999999999999",
        sourceTemplateName: "3 Bedroom Condo Starter",
        sourceTemplateAreaName: "Master Bedroom",
        targetAreaClientDraftId: "existing-area-1",
        material: "Template bedroom paint finish",
        description: "Paint finish copied from a workspace template.",
        supplier: "Template Supplier",
        quantity: 1,
        unit: "lot",
        unitCost: 30_000,
        miscCost: 2_000,
        contingencyPercentage: 5,
        warnings: ["Review the template row before Apply; it is copied from a reusable template preview."],
        applyEligible: true,
        sourceSnapshot: {
          sourceType: "estimate_template_row",
          sourceTemplateId: "11111111-1111-4111-8111-111111111111",
          sourceTemplateRowId: "99999999-9999-4999-8999-999999999999",
          notSupplierPriced: true,
        },
      },
    ],
    operations: [
      {
        operationId: "op-copy-template-row-template-bedroom-paint-finish",
        type: "copy_template_row",
        clientDraftId: "copy-template-row-template-bedroom-paint-finish",
        applyEligible: true,
      },
    ],
    budgetSummary: {
      ...draft.budgetSummary,
      draftSubtotal: 33_500,
      allowanceTotal: 33_500,
      contingencyTotal: 0,
      draftTotal: 33_500,
      variance: -4_966_500,
    },
  } as PackageBuilderDraft;
}

function makeFillCurrentEstimateTemplateInsertDraft(): PackageBuilderDraft {
  const draft = makeFillCurrentEstimateDraft();
  return {
    ...draft,
    rowDraft: [],
    rowUpdateDraft: [],
    templateInsertDraft: [
      {
        clientDraftId: "insert-template-condo-starter",
        sourceTemplateId: "11111111-1111-4111-8111-111111111111",
        sourceTemplateName: "3 Bedroom Condo Starter",
        targetParentClientDraftId: "existing-root",
        expectedNodeCount: 4,
        expectedRowCount: 8,
        previewTotal: 125_000,
        warnings: ["Review the template copy before Apply."],
        applyEligible: true,
      },
    ],
    operations: [
      {
        operationId: "op-template-insert-template-condo-starter",
        type: "insert_template",
        clientDraftId: "insert-template-condo-starter",
        applyEligible: true,
      },
    ],
    budgetSummary: {
      ...draft.budgetSummary,
      draftSubtotal: 125_000,
      allowanceTotal: 125_000,
      contingencyTotal: 0,
      draftTotal: 125_000,
      variance: -4_875_000,
    },
  } as PackageBuilderDraft;
}

function makeLibraryComponentCreateDraft(): PackageBuilderDraft {
  return {
    schemaVersion: 1,
    mode: "draft",
    intent: "create_library_component",
    draftId: "draft-create-library-component",
    target: null,
    brief: {
      projectName: "Library Component Draft",
      targetBudget: 18_000,
      currencyCode: "PHP",
      bedrooms: 0,
      floorCount: 0,
      finishLevel: "component",
      missingInputs: [],
    },
    projectDraft: { name: "Library Component Draft", clientName: null, location: null, projectBudget: 18_000 },
    estimateDraft: { name: "Component Library", sheetCode: null },
    treeDraft: [],
    rowDraft: [],
    componentCreateDraft: [
      {
        clientDraftId: "component-queen-bed-frame",
        name: "Queen bed frame",
        description: "Standard bed frame for condo bedrooms.",
        category: "Furniture",
        supplier: "Bedroom Supplier",
        brand: null,
        unit: "set",
        unitCost: 18_000,
        miscCost: 0,
        currencyCode: "PHP",
        pricingSource: "Ask Flip draft",
        confidence: "requires-user-review",
        lifecycleState: "available",
        warnings: ["Review supplier and pricing before Apply."],
        applyEligible: true,
      },
    ],
    componentMatches: [],
    templateMatches: [],
    operations: [
      {
        operationId: "op-component-queen-bed-frame",
        type: "create_library_component",
        clientDraftId: "component-queen-bed-frame",
        applyEligible: true,
      },
    ],
    budgetSummary: {
      targetBudget: 18_000,
      draftSubtotal: 18_000,
      allowanceTotal: 0,
      contingencyTotal: 0,
      draftTotal: 18_000,
      variance: 0,
      currencyCode: "PHP",
      completeness: "review-required",
    },
    assumptions: ["Creates a component-library record only after explicit Apply confirmation."],
    warnings: ["Review supplier and pricing before Apply."],
    applyEligibility: { eligible: true, reasons: [] },
    requiresConfirmation: true,
  } as unknown as PackageBuilderDraft;
}

describe("package-builder Apply", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    workspaceMocks.ensureDefaultWorkspace.mockResolvedValue({
      workspace: { id: "55555555-5555-4555-8555-555555555555" },
    });
    authMocks.requireCurrentUserContext.mockResolvedValue({
      userId: "44444444-4444-4444-8444-444444444444",
    });
  });

  it("creates component-library records through the component-library RPC", async () => {
    const draft = makeLibraryComponentCreateDraft();
    const observed: { componentPayloads?: Array<{ component?: Record<string, unknown>; priceOptions?: unknown[] }> } = {};
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
        if (fn === "create_ai_package_library_components_with_history") {
          observed.componentPayloads = args.component_payloads as Array<{ component?: Record<string, unknown>; priceOptions?: unknown[] }>;
          return {
            data: {
              projectId: null,
              estimateId: null,
              selectedNodeId: null,
              createdNodeIds: {},
              insertedRowIds: [],
              createdComponentIds: ["aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111"],
              createdComponentCount: 1,
              total: 18_000,
              warnings: ["Review supplier and pricing before Apply."],
              recoveryStatus: "completed",
              idempotencyKey: "idem-create-library-component",
              idempotentReplay: false,
              auditRunId: "99999999-9999-4999-8999-999999999999",
            },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const draftHash = buildPackageDraftHash(draft);
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash,
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-create-library-component",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("create_ai_package_library_components_with_history", expect.objectContaining({
      target_workspace_id: "55555555-5555-4555-8555-555555555555",
      draft_id: "draft-create-library-component",
      draft_hash: draftHash,
      idempotency_key: "idem-create-library-component",
      correlation_id: "99999999-9999-4999-8999-999999999999",
      component_payloads: [
        expect.objectContaining({
          clientDraftId: "component-queen-bed-frame",
          total: 18_000,
          component: expect.objectContaining({
            name: "Queen bed frame",
            category: "Furniture",
            supplier: "Bedroom Supplier",
            unit: "set",
            createdBy: "44444444-4444-4444-8444-444444444444",
            metadata: expect.objectContaining({
              source: "ask-flip",
              isCustom: true,
              createdFrom: "ask-flip-package-builder",
              aiPackageBuilder: expect.objectContaining({
                draftId: "draft-create-library-component",
                draftHash,
                idempotencyKey: "idem-create-library-component",
              }),
            }),
          }),
          priceOptions: [
            expect.objectContaining({
              label: "Default",
              unit: "set",
              unitCost: 18_000,
              miscCost: 0,
              currency: "PHP",
              isDefault: true,
              isActive: true,
            }),
          ],
        }),
      ],
    }));
    expect(observed.componentPayloads?.[0]?.component?.workspaceId).toBeUndefined();
    expect(observed.componentPayloads?.[0]?.priceOptions).toHaveLength(1);
    expect(supabase.rpc).not.toHaveBeenCalledWith("create_project_estimate_package_with_history", expect.anything());
    expect(result).toMatchObject({
      projectId: null,
      estimateId: null,
      selectedNodeId: null,
      createdNodeIds: {},
      insertedRowIds: [],
      createdComponentIds: ["aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111"],
      createdComponentCount: 1,
      recoveryStatus: "completed",
      idempotencyKey: "idem-create-library-component",
      auditRunId: "99999999-9999-4999-8999-999999999999",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/library");
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/components");
  });

  it("replays component-library creation through the component Apply RPC without duplicate component writes", async () => {
    const draft = makeLibraryComponentCreateDraft();
    const draftHash = buildPackageDraftHash(draft);
    const existingComponentId = "aaaaaaaa-1111-5aaa-8aaa-aaaaaaaa1111";
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "create_ai_package_library_components_with_history") {
          return {
            data: {
              projectId: null,
              estimateId: null,
              selectedNodeId: null,
              createdNodeIds: {},
              insertedRowIds: [],
              createdComponentIds: [existingComponentId],
              createdComponentCount: 1,
              total: 18_000,
              warnings: ["Review supplier and pricing before Apply."],
              recoveryStatus: "idempotent_replay",
              idempotencyKey: "idem-create-library-component",
              idempotentReplay: true,
              auditRunId: "99999999-9999-4999-8999-999999999999",
            },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash,
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-create-library-component",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("create_ai_package_library_components_with_history", expect.objectContaining({
      target_workspace_id: "55555555-5555-4555-8555-555555555555",
      draft_hash: draftHash,
      idempotency_key: "idem-create-library-component",
    }));
    expect(result).toMatchObject({
      projectId: null,
      estimateId: null,
      selectedNodeId: null,
      createdComponentIds: [existingComponentId],
      createdComponentCount: 1,
      recoveryStatus: "idempotent_replay",
      idempotencyKey: "idem-create-library-component",
      idempotentReplay: true,
      auditRunId: "99999999-9999-4999-8999-999999999999",
    });
  });

  it("rejects component-library idempotency key reuse for a different draft hash", async () => {
    const draft = makeLibraryComponentCreateDraft();
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "create_ai_package_library_components_with_history") {
          return {
            data: null,
            error: { message: "Idempotency key already belongs to a different component draft." },
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    await expect(applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-create-library-component",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    })).rejects.toThrow("Idempotency key already belongs to a different component draft.");
    expect(supabase.rpc).toHaveBeenCalledWith("create_ai_package_library_components_with_history", expect.anything());
  });

  it("sends natural 3-bedroom condo package drafts through the package Apply RPC with populated rows", async () => {
    const draft = buildPackageBuilderDraft({
      message: "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.",
      readData: makeThreeBedroomCondoReadData(),
      providerResult: null,
    });
    const observed: { packageDraft?: PackageBuilderDraft } = {};
    const libraryQuery = makeQueryResult(makeLibraryValidationRows());
    const insertedRowIds = draft.rowDraft.map((_, index) => `row-${index + 1}`);
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "cost_library_items") return libraryQuery;
        if (table === "estimate_row_items") return makeQueryResult([{ id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555", metadata: {} }]);
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
        if (fn === "create_project_estimate_package_with_history") {
          observed.packageDraft = args.package_draft as PackageBuilderDraft;
          return {
            data: {
              projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
              estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
              selectedNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
              createdNodeIds: {
                "area-master-bedroom": "cccccccc-3333-4ccc-8ccc-cccccccc3333",
              },
              insertedRowIds,
              total: draft.budgetSummary.draftTotal,
              warnings: [],
              recoveryStatus: "completed",
              idempotencyKey: "idem-create-condo-package",
              idempotentReplay: false,
              auditRunId: "99999999-9999-4999-8999-999999999999",
            },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const draftHash = buildPackageDraftHash(draft);
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash,
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-create-condo-package",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(draft.intent).toBe("create_package_project");
    expect(supabase.rpc).toHaveBeenCalledWith("create_project_estimate_package_with_history", expect.objectContaining({
      target_workspace_id: "55555555-5555-4555-8555-555555555555",
      draft_hash: draftHash,
      idempotency_key: "idem-create-condo-package",
      correlation_id: "99999999-9999-4999-8999-999999999999",
    }));
    expect(supabase.rpc).not.toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.anything());
    expect(observed.packageDraft).toEqual(expect.objectContaining({
      projectDraft: expect.objectContaining({ name: "3 Bedroom Condo Unit" }),
      estimateDraft: expect.objectContaining({ name: "Initial 3 Bedroom Package Estimate" }),
      metadata: expect.objectContaining({
        aiPackageBuilder: expect.objectContaining({
          draftHash,
          idempotencyKey: "idem-create-condo-package",
          source: "ask-flip",
        }),
      }),
    }));

    const packageDraft = observed.packageDraft;
    expect(packageDraft).toBeDefined();
    const bedroomAreaIds = new Set(
      packageDraft?.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("bedroom"))
        .map((node) => node.clientDraftId),
    );
    const toiletAreaIds = new Set(
      packageDraft?.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("toilet"))
        .map((node) => node.clientDraftId),
    );
    const bedRows = packageDraft?.rowDraft.filter((row) =>
      bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material === "Queen bed frame"
    ) ?? [];
    const waterClosetRows = packageDraft?.rowDraft.filter((row) =>
      toiletAreaIds.has(row.targetAreaClientDraftId) && row.material === "Water closet"
    ) ?? [];

    expect(bedRows).toHaveLength(3);
    expect(waterClosetRows).toHaveLength(2);
    expect([...bedRows, ...waterClosetRows]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceType: "library_item",
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        sourceSnapshot: expect.objectContaining({
          sourceType: "library_item",
          sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
          componentVersionNumber: 1,
          supplier: "Bedroom Supplier",
        }),
      }),
      expect.objectContaining({
        sourceType: "library_item",
        sourceLibraryItemId: "22222222-2222-4222-8222-222222222222",
        sourceSnapshot: expect.objectContaining({
          sourceType: "library_item",
          sourceLibraryItemId: "22222222-2222-4222-8222-222222222222",
          componentVersionNumber: 1,
          supplier: "Plumbing Supplier",
        }),
      }),
    ]));
    expect(result).toMatchObject({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      insertedRowIds,
      total: draft.budgetSummary.draftTotal,
      recoveryStatus: "completed",
      idempotencyKey: "idem-create-condo-package",
      auditRunId: "99999999-9999-4999-8999-999999999999",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects");
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/cccccccc-3333-4ccc-8ccc-cccccccc3333");
  });

  it("applies fill-current-estimate drafts through the existing row-history RPC", async () => {
    const draft = makeFillCurrentEstimateDraft();
    const rowSortQuery = makeQueryResult([{ node_id: "dddddddd-4444-4ddd-8ddd-dddddddd4444", sort_order: 4 }]);
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_row_items") return rowSortQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async () => ({
        data: { idempotent: false, rowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555", row: {} },
        error: null,
      })),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-fill-current",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.objectContaining({
      target_project_id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      target_estimate_id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      target_node_id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      acting_user_id: "44444444-4444-4444-8444-444444444444",
      correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      row_payload: expect.objectContaining({
        material: "Master Bedroom bed allowance",
        sortOrder: 5,
        sourceLibraryItemId: null,
        linkState: "unlinked",
      }),
    }));
    expect(supabase.rpc).not.toHaveBeenCalledWith("create_project_estimate_package_with_history", expect.anything());
    expect(result).toMatchObject({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      insertedRowIds: ["eeeeeeee-5555-4eee-8eee-eeeeeeee5555"],
      total: 28_500,
      recoveryStatus: "completed",
      idempotencyKey: "idem-fill-current",
      auditRunId: "99999999-9999-4999-8999-999999999999",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
  });

  it("creates missing Area Nodes before inserting fill-current-estimate rows", async () => {
    const draft = makeFillCurrentEstimateDraftWithNewArea();
    const rowSortQuery = makeQueryResult([]);
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_row_items") return rowSortQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "create_estimate_node_with_history") {
          return {
            data: {
              idempotent: false,
              nodeId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
              name: "Master Bedroom",
              kind: "area",
            },
            error: null,
          };
        }
        if (fn === "insert_estimate_row_item_with_history") {
          return {
            data: { idempotent: false, rowId: "ffffffff-6666-4fff-8fff-ffffffff6666", row: {} },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-fill-current-new-area",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("create_estimate_node_with_history", expect.objectContaining({
      target_project_id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      target_estimate_id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      parent_node_id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
      node_kind: "area",
      node_name: "Master Bedroom",
      initial_sort_order: 0,
      acting_user_id: "44444444-4444-4444-8444-444444444444",
      correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      target_tab_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    }));
    expect(supabase.rpc).toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.objectContaining({
      target_node_id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
      row_payload: expect.objectContaining({
        material: "Master Bedroom bed allowance",
        sortOrder: 0,
      }),
    }));
    expect(supabase.rpc).not.toHaveBeenCalledWith("create_project_estimate_package_with_history", expect.anything());
    expect(result).toMatchObject({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      createdNodeIds: {
        "area-master-bedroom": "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
      },
      insertedRowIds: ["ffffffff-6666-4fff-8fff-ffffffff6666"],
      recoveryStatus: "completed",
    });
  });

  it("updates existing fill-current-estimate rows through the row-history RPC", async () => {
    const draft = makeFillCurrentEstimateRowUpdateDraft();
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "update_estimate_row_item_with_history") {
          return {
            data: {
              idempotent: false,
              rowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
              row: {
                id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
                nodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
                quantity: 2,
                unitCost: 25_000,
                contingencyPercentage: 12,
                contingencyValue: 6_000,
                miscCost: 1_500,
                linkState: "unlinked",
                rowRevision: 4,
              },
            },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-fill-current-update",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("update_estimate_row_item_with_history", expect.objectContaining({
      target_project_id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      target_estimate_id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      target_row_id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
      expected_row_revision: 3,
      row_patch: {
        quantity: 2,
        miscCost: 1_500,
        contingencyPercentage: 12,
      },
      acting_user_id: "44444444-4444-4444-8444-444444444444",
      correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    }));
    expect(supabase.rpc).not.toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("create_project_estimate_package_with_history", expect.anything());
    expect(result).toMatchObject({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      insertedRowIds: [],
      updatedRowIds: ["eeeeeeee-5555-4eee-8eee-eeeeeeee5555"],
      recoveryStatus: "completed",
      idempotencyKey: "idem-fill-current-update",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
  });

  it("renames current-estimate nodes through the node-history RPC", async () => {
    const draft = makeFillCurrentEstimateNodeRenameDraft();
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "rename_estimate_node_with_history") {
          return {
            data: {
              idempotent: false,
              nodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
              name: "Primary Bedroom",
            },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-fill-current-node-rename",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("rename_estimate_node_with_history", expect.objectContaining({
      target_project_id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      target_estimate_id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      target_node_id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      next_name: "Primary Bedroom",
      acting_user_id: "44444444-4444-4444-8444-444444444444",
      correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    }));
    expect(supabase.rpc).not.toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("create_project_estimate_package_with_history", expect.anything());
    expect(result).toMatchObject({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      insertedRowIds: [],
      renamedNodeIds: ["dddddddd-4444-4ddd-8ddd-dddddddd4444"],
      recoveryStatus: "completed",
      idempotencyKey: "idem-fill-current-node-rename",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
  });

  it("replaces existing fill-current-estimate rows through the row-history RPC", async () => {
    const draft = makeFillCurrentEstimateRowReplacementDraft();
    const libraryQuery = makeQueryResult([
      {
        id: "11111111-1111-4111-8111-111111111111",
        workspace_id: "55555555-5555-4555-8555-555555555555",
        name: "Queen bed frame",
        description: "Standard bed frame for condo bedrooms.",
        supplier: "Bedroom Supplier",
        supplier_id: null,
        category: "Furniture",
        category_node_id: null,
        brand: null,
        brand_id: null,
        unit: "pc",
        unit_cost: 18_000,
        misc_cost: 0,
        lifecycle_state: "available",
        current_version_number: 1,
        active_price_option_id: null,
        pricing_date: "2026-05-28",
        pricing_source: "Component library",
        confidence: "catalog",
        thumbnail_path: null,
      },
    ]);
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "cost_library_items") return libraryQuery;
        if (table === "estimate_row_items") return makeQueryResult([{ id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555", metadata: {} }]);
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "replace_estimate_row_item_with_history") {
          return {
            data: {
              idempotent: false,
              rowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
              row: {
                id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
                nodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
                material: "Queen bed frame",
                rowRevision: 4,
              },
            },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-fill-current-replace",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("replace_estimate_row_item_with_history", expect.objectContaining({
      target_project_id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      target_estimate_id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      target_row_id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
      expected_row_revision: 3,
      acting_user_id: "44444444-4444-4444-8444-444444444444",
      correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      replacement_payload: expect.objectContaining({
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        material: "Queen bed frame",
        supplier: "Bedroom Supplier",
        unit: "pc",
        unitCost: 18_000,
        linkState: "linked-clean",
      }),
    }));
    expect(supabase.rpc).not.toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("create_project_estimate_package_with_history", expect.anything());
    expect(result).toMatchObject({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      insertedRowIds: [],
      updatedRowIds: [],
      replacedRowIds: ["eeeeeeee-5555-4eee-8eee-eeeeeeee5555"],
      recoveryStatus: "completed",
      idempotencyKey: "idem-fill-current-replace",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
  });

  it("blocks package-builder replacement of express component rows before the replace RPC", async () => {
    const draft = makeFillCurrentEstimateRowReplacementDraft();
    const libraryQuery = makeQueryResult(makeLibraryValidationRows());
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "cost_library_items") return libraryQuery;
        if (table === "estimate_row_items") {
          return makeQueryResult([
            {
              id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
              metadata: { expressComponent: { kind: "express", schemaVersion: 1, id: "express-row-1" } },
            },
          ]);
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    await expect(applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-fill-current-replace-express",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    })).rejects.toThrow(/cannot replace express component rows/i);

    expect(supabase.rpc).not.toHaveBeenCalledWith("replace_estimate_row_item_with_history", expect.anything());
  });

  it("deletes existing fill-current-estimate rows through the row-history RPC", async () => {
    const draft = makeFillCurrentEstimateRowDeleteDraft();
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "delete_estimate_row_item_with_history") {
          return {
            data: {
              idempotent: false,
              rowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
              deletedRow: {
                id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
                nodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
                material: "Existing bed",
              },
            },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-fill-current-delete",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("delete_estimate_row_item_with_history", expect.objectContaining({
      target_project_id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      target_estimate_id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      target_row_id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
      expected_row_revision: 3,
      acting_user_id: "44444444-4444-4444-8444-444444444444",
      correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    }));
    expect(supabase.rpc).not.toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("update_estimate_row_item_with_history", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("replace_estimate_row_item_with_history", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("insert_estimate_template_into_estimate_with_history", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("create_project_estimate_package_with_history", expect.anything());
    expect(result).toMatchObject({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      insertedRowIds: [],
      updatedRowIds: [],
      replacedRowIds: [],
      deletedRowIds: ["eeeeeeee-5555-4eee-8eee-eeeeeeee5555"],
      recoveryStatus: "completed",
      idempotencyKey: "idem-fill-current-delete",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
  });

  it("copies template row previews into the current estimate through the row-history RPC", async () => {
    const draft = makeFillCurrentEstimateTemplateRowCopyDraft();
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "estimate_row_items") return makeQueryResult([{ node_id: "dddddddd-4444-4ddd-8ddd-dddddddd4444", sort_order: 4 }]);
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "insert_estimate_row_item_with_history") {
          return {
            data: {
              idempotent: false,
              rowId: "77777777-7777-4777-8777-777777777777",
            },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-fill-current-template-row-copy",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.objectContaining({
      target_project_id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      target_estimate_id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      target_node_id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      acting_user_id: "44444444-4444-4444-8444-444444444444",
      correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      row_payload: expect.objectContaining({
        sortOrder: 5,
        material: "Template bedroom paint finish",
        description: "Paint finish copied from a workspace template.",
        supplier: "Template Supplier",
        unit: "lot",
        quantity: 1,
        unitCost: 30_000,
        miscCost: 2_000,
        contingencyPercentage: 5,
        designation: "AI template row",
        linkState: "unlinked",
        sourceSnapshot: expect.objectContaining({
          sourceType: "estimate_template_row",
          sourceTemplateId: "11111111-1111-4111-8111-111111111111",
          sourceTemplateRowId: "99999999-9999-4999-8999-999999999999",
          notSupplierPriced: true,
        }),
      }),
    }));
    expect(supabase.rpc).not.toHaveBeenCalledWith("insert_estimate_template_into_estimate_with_history", expect.anything());
    expect(result).toMatchObject({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      insertedRowIds: ["77777777-7777-4777-8777-777777777777"],
      updatedRowIds: [],
      replacedRowIds: [],
      deletedRowIds: [],
      recoveryStatus: "completed",
      idempotencyKey: "idem-fill-current-template-row-copy",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
  });

  it("inserts matched templates into the current estimate through the template-history RPC", async () => {
    const draft = makeFillCurrentEstimateTemplateInsertDraft();
    const supabase = {
      from: vi.fn((table: string) => {
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "insert_estimate_template_into_estimate_with_history") {
          return {
            data: {
              idempotent: false,
              inserted_root_node_ids: ["ffffffff-6666-4fff-8fff-ffffffff6666"],
              inserted_node_count: 4,
              inserted_row_item_count: 8,
              eventId: "12121212-1212-4121-8121-121212121212",
            },
            error: null,
          };
        }
        throw new Error(`Unexpected RPC ${fn}`);
      }),
    };
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { applyPackageBuilderDraft } = await import("@/lib/ai/package-builder/apply");
    const result = await applyPackageBuilderDraft({
      mode: "apply",
      draft,
      draftHash: buildPackageDraftHash(draft),
      draftToken: "server.token",
      confirmation: { confirmed: true },
      idempotencyKey: "idem-fill-current-template",
      userContext: {
        userId: "44444444-4444-4444-8444-444444444444",
        email: "user@example.com",
        workspaceId: "55555555-5555-4555-8555-555555555555",
        authMode: "supabase",
      },
      authorizationRunId: "99999999-9999-4999-8999-999999999999",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("insert_estimate_template_into_estimate_with_history", expect.objectContaining({
      target_project_id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      target_estimate_id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      target_parent_node_id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
      source_template_id: "11111111-1111-4111-8111-111111111111",
      acting_user_id: "44444444-4444-4444-8444-444444444444",
      correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
    }));
    expect(supabase.rpc).not.toHaveBeenCalledWith("insert_estimate_row_item_with_history", expect.anything());
    expect(supabase.rpc).not.toHaveBeenCalledWith("create_project_estimate_package_with_history", expect.anything());
    expect(result).toMatchObject({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      insertedRowIds: [],
      updatedRowIds: [],
      insertedTemplateRootNodeIds: ["ffffffff-6666-4fff-8fff-ffffffff6666"],
      insertedTemplateNodeCount: 4,
      insertedTemplateRowCount: 8,
      recoveryStatus: "completed",
      idempotencyKey: "idem-fill-current-template",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/cccccccc-3333-4ccc-8ccc-cccccccc3333");
  });
});
