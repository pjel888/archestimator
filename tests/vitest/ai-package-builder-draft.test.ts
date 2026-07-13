import { describe, expect, it } from "vitest";

import { buildPackageBuilderDraft, refinePackageBuilderDraft } from "@/lib/ai/package-builder/draft";
import type { PackageBuilderReadToolsData } from "@/lib/ai/package-builder/read-tools";

function makeReadData(): PackageBuilderReadToolsData {
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
        unit: "pc",
        unitCost: 18_000,
        miscCost: 0,
        currency: "PHP",
        lifecycleState: "available",
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        currentVersionNumber: 1,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        material: "Water closet",
        description: "Floor-mounted toilet fixture for toilet and bath areas.",
        category: "Sanitary Systems",
        categoryPath: ["Systems", "Sanitary Systems"],
        supplier: "Plumbing Supplier",
        unit: "set",
        unitCost: 12_500,
        miscCost: 0,
        currency: "PHP",
        lifecycleState: "available",
        sourceLibraryItemId: "22222222-2222-4222-8222-222222222222",
        currentVersionNumber: 1,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        material: "Kitchen base cabinet",
        description: "Modular cabinet for condo kitchen runs.",
        category: "Furniture",
        categoryPath: ["Objects", "Furniture"],
        supplier: "Millwork Supplier",
        unit: "lm",
        unitCost: 22_000,
        miscCost: 0,
        currency: "PHP",
        lifecycleState: "available",
        sourceLibraryItemId: "33333333-3333-4333-8333-333333333333",
        currentVersionNumber: 1,
      },
    ],
    templateMatches: [],
    auditEvents: [],
  };
}

describe("AI package-builder draft assembly", () => {
  it("treats setup phrasing as a package creation request, not a current-estimate update", () => {
    const draft = buildPackageBuilderDraft({
      message: "Set up a 3 bedroom condo estimate sheet.",
      readData: makeReadData(),
      providerResult: null,
    });

    expect(draft.intent).toBe("create_package_project");
    expect(draft.projectDraft.name).toBe("3 Bedroom Condo Unit");
    expect(draft.rowUpdateDraft).toEqual([]);
    expect(draft.operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "create_project", applyEligible: true }),
      expect.objectContaining({ type: "create_estimate", applyEligible: true }),
    ]));
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("builds a component-library creation draft without project or estimate writes", () => {
    const draft = buildPackageBuilderDraft({
      message: "Add a component to my library called Queen bed frame, category Furniture, unit set, cost 18000 pesos from Bedroom Supplier.",
      readData: makeReadData(),
      providerResult: null,
    });

    expect(draft.intent).toBe("create_library_component");
    expect(draft.target).toBeNull();
    expect(draft.treeDraft).toEqual([]);
    expect(draft.rowDraft).toEqual([]);
    expect(draft.componentCreateDraft).toEqual([
      expect.objectContaining({
        clientDraftId: "component-queen-bed-frame",
        name: "Queen bed frame",
        category: "Furniture",
        supplier: "Bedroom Supplier",
        unit: "set",
        unitCost: 18_000,
        miscCost: 0,
        currencyCode: "PHP",
        applyEligible: true,
      }),
    ]);
    expect(draft.operations).toEqual([
      expect.objectContaining({
        type: "create_library_component",
        clientDraftId: "component-queen-bed-frame",
        applyEligible: true,
      }),
    ]);
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
    expect(draft.requiresConfirmation).toBe(true);
  });

  it("builds a target-aware fill-current-estimate draft from route estimate context", () => {
    const draft = buildPackageBuilderDraft({
      message: "Fill this estimate with beds and water closets for a 3 bedroom condo unit.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 0,
          nodeCount: 3,
          rowCount: 0,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
          activeTabId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Master Bedroom",
            kind: "area",
            path: ["House", "Master Bedroom"],
            rowCount: 0,
          },
          {
            id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
            name: "Common Toilet & Bath",
            kind: "area",
            path: ["House", "Common Toilet & Bath"],
            rowCount: 0,
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.projectDraft.name).toBe("Lewis Residence");
    expect(draft.estimateDraft.name).toBe("Current Estimate");
    expect(draft.target).toEqual(expect.objectContaining({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      activeTabId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    }));
    expect(Object.values(draft.target?.areaNodeIdsByClientDraftId ?? {})).toEqual(expect.arrayContaining([
      "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
    ]));
    expect(draft.operations.some((operation) => operation.type === "create_project" || operation.type === "create_estimate")).toBe(false);
    expect(draft.operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "create_tree_node", clientDraftId: "area-bedroom-2" }),
      expect.objectContaining({ type: "insert_component_row" }),
    ]));
    expect(draft.rowDraft.some((row) => row.material === "Queen bed frame")).toBe(true);
    expect(draft.rowDraft.some((row) => row.material === "Water closet")).toBe(true);
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("refines an existing draft in memory without changing its intent or Apply confirmation boundary", () => {
    const baseDraft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: makeReadData(),
      providerResult: null,
    });
    const baseAllowanceRows = baseDraft.rowDraft.filter((row) => row.sourceType === "allowance");

    const refinedDraft = refinePackageBuilderDraft({
      message: "Make it cheaper before I apply it.",
      baseDraft,
    });

    expect(baseAllowanceRows.length).toBeGreaterThan(0);
    expect(refinedDraft.draftId).not.toBe(baseDraft.draftId);
    expect(refinedDraft.intent).toBe(baseDraft.intent);
    expect(refinedDraft.target).toEqual(baseDraft.target);
    expect(refinedDraft.requiresConfirmation).toBe(true);
    expect(refinedDraft.budgetSummary.draftTotal).toBeLessThan(baseDraft.budgetSummary.draftTotal);
    expect(refinedDraft.rowDraft.filter((row) => row.sourceType === "library_item")).toEqual(
      baseDraft.rowDraft.filter((row) => row.sourceType === "library_item"),
    );
    expect(refinedDraft.assumptions).toContain("Refined from previous package draft: Make it cheaper before I apply it.");
    expect(refinedDraft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("removes only the exact named draft area during refinement", () => {
    const baseDraft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: makeReadData(),
      providerResult: null,
    });

    const refinedDraft = refinePackageBuilderDraft({
      message: "Remove Common Toilet & Bath from the draft.",
      baseDraft,
    });

    expect(refinedDraft.treeDraft.map((node) => node.name)).toContain("Master Toilet & Bath");
    expect(refinedDraft.treeDraft.map((node) => node.name)).not.toContain("Common Toilet & Bath");
    expect(refinedDraft.rowDraft.some((row) => row.targetAreaClientDraftId === "area-master-toilet-bath")).toBe(true);
    expect(refinedDraft.rowDraft.some((row) => row.targetAreaClientDraftId === "area-common-toilet-bath")).toBe(false);
    expect(refinedDraft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("builds a current-estimate row-update draft from existing route rows", () => {
    const draft = buildPackageBuilderDraft({
      message: "Change the Existing bed quantity to 2, misc cost to 1500, and contingency to 12%.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 10_000,
          nodeCount: 2,
          rowCount: 1,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Master Bedroom",
            kind: "area",
            path: ["House", "Master Bedroom"],
            rowCount: 1,
          },
        ],
        areaRows: [
          {
            id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
            nodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            material: "Existing bed",
            quantity: 1,
            unit: "pc",
            unitCost: 10_000,
            miscCost: 0,
            contingencyPercentage: 0,
            rowRevision: 3,
            total: 10_000,
            sourceType: "project",
            sourceLibraryItemId: null,
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.rowDraft).toEqual([]);
    expect(draft.rowUpdateDraft).toEqual([
      expect.objectContaining({
        targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
        expectedRowRevision: 3,
        patch: {
          quantity: 2,
          miscCost: 1_500,
          adjustmentPercentage: 12,
        },
      }),
    ]);
    expect(draft.operations).toEqual([
      expect.objectContaining({
        type: "update_existing_row",
        clientDraftId: "update-row-existing-bed",
        applyEligible: true,
      }),
    ]);
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("blocks ambiguous current-estimate row updates before Apply", () => {
    const draft = buildPackageBuilderDraft({
      message: "Change the bed quantity to 2.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 20_000,
          nodeCount: 2,
          rowCount: 2,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Master Bedroom",
            kind: "area",
            path: ["House", "Master Bedroom"],
            rowCount: 2,
          },
        ],
        areaRows: [
          {
            id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
            nodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            material: "Existing bed",
            quantity: 1,
            unit: "pc",
            unitCost: 10_000,
            miscCost: 0,
            contingencyPercentage: 0,
            rowRevision: 3,
            total: 10_000,
            sourceType: "project",
            sourceLibraryItemId: null,
          },
          {
            id: "ffffffff-6666-4fff-8fff-ffffffff6666",
            nodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            material: "Guest bed",
            quantity: 1,
            unit: "pc",
            unitCost: 10_000,
            miscCost: 0,
            contingencyPercentage: 0,
            rowRevision: 2,
            total: 10_000,
            sourceType: "project",
            sourceLibraryItemId: null,
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.rowUpdateDraft).toEqual([]);
    expect(draft.operations).toEqual([]);
    expect(draft.applyEligibility.eligible).toBe(false);
    expect(draft.applyEligibility.reasons).toContain("Ask Flip matched more than one current estimate row; name the exact row before Apply.");
  });

  it("builds a current-estimate row replacement draft from a matched row and scoped library component", () => {
    const draft = buildPackageBuilderDraft({
      message: "Replace the Existing bed row with the Queen bed frame from the library.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 10_000,
          nodeCount: 2,
          rowCount: 1,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Master Bedroom",
            kind: "area",
            path: ["House", "Master Bedroom"],
            rowCount: 1,
          },
        ],
        areaRows: [
          {
            id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
            nodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            material: "Existing bed",
            quantity: 1,
            unit: "pc",
            unitCost: 10_000,
            miscCost: 0,
            contingencyPercentage: 0,
            rowRevision: 3,
            total: 10_000,
            sourceType: "project",
            sourceLibraryItemId: null,
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.rowDraft).toEqual([]);
    expect(draft.rowUpdateDraft).toEqual([]);
    expect(draft.rowReplacementDraft).toEqual([
      expect.objectContaining({
        clientDraftId: "replace-row-existing-bed-with-queen-bed-frame",
        targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
        expectedRowRevision: 3,
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        material: "Queen bed frame",
        unitCost: 18_000,
      }),
    ]);
    expect(draft.operations).toEqual([
      expect.objectContaining({
        type: "replace_existing_row",
        clientDraftId: "replace-row-existing-bed-with-queen-bed-frame",
        applyEligible: true,
      }),
    ]);
    expect(draft.budgetSummary.draftTotal).toBe(18_000);
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("builds a current-estimate row delete draft from a matched row", () => {
    const draft = buildPackageBuilderDraft({
      message: "Delete the Existing bed row from this estimate.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 10_000,
          nodeCount: 2,
          rowCount: 1,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Master Bedroom",
            kind: "area",
            path: ["House", "Master Bedroom"],
            rowCount: 1,
          },
        ],
        areaRows: [
          {
            id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
            nodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            material: "Existing bed",
            quantity: 1,
            unit: "pc",
            unitCost: 10_000,
            miscCost: 0,
            contingencyPercentage: 0,
            rowRevision: 3,
            total: 10_000,
            sourceType: "project",
            sourceLibraryItemId: null,
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.rowDraft).toEqual([]);
    expect(draft.rowUpdateDraft).toEqual([]);
    expect(draft.rowReplacementDraft).toEqual([]);
    expect(draft.rowDeleteDraft).toEqual([
      {
        clientDraftId: "delete-row-existing-bed",
        targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
        expectedRowRevision: 3,
        warnings: ["Review the delete before Apply; this removes an existing estimate row."],
        applyEligible: true,
      },
    ]);
    expect(draft.operations).toEqual([
      expect.objectContaining({
        type: "delete_existing_row",
        clientDraftId: "delete-row-existing-bed",
        applyEligible: true,
      }),
    ]);
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("builds a current-estimate node rename draft from a matched Area Node", () => {
    const draft = buildPackageBuilderDraft({
      message: "Rename Master Bedroom to Primary Bedroom.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 10_000,
          nodeCount: 2,
          rowCount: 1,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Master Bedroom",
            kind: "area",
            path: ["House", "Master Bedroom"],
            rowCount: 1,
          },
        ],
        areaRows: [],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.rowDraft).toEqual([]);
    expect(draft.nodeRenameDraft).toEqual([
      {
        clientDraftId: "rename-node-master-bedroom",
        targetNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        currentName: "Master Bedroom",
        nextName: "Primary Bedroom",
        warnings: ["Review the rename before Apply; this changes an existing estimate tree node."],
        applyEligible: true,
      },
    ]);
    expect(draft.operations).toEqual([
      expect.objectContaining({
        type: "rename_estimate_node",
        clientDraftId: "rename-node-master-bedroom",
        applyEligible: true,
      }),
    ]);
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("builds a current-estimate node rename draft from existing route nodes", () => {
    const draft = buildPackageBuilderDraft({
      message: "Rename Bedroom 1 to Master Bedroom.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 0,
          nodeCount: 2,
          rowCount: 0,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Bedroom 1",
            kind: "area",
            path: ["House", "Bedroom 1"],
            rowCount: 0,
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.rowDraft).toEqual([]);
    expect(draft.nodeRenameDraft).toEqual([
      {
        clientDraftId: "rename-node-bedroom-1",
        targetNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        currentName: "Bedroom 1",
        nextName: "Master Bedroom",
        warnings: ["Review the rename before Apply; this changes an existing estimate tree node."],
        applyEligible: true,
      },
    ]);
    expect(draft.operations).toEqual([
      expect.objectContaining({
        type: "rename_estimate_node",
        clientDraftId: "rename-node-bedroom-1",
        applyEligible: true,
      }),
    ]);
    expect(draft.assumptions).toContain("Node rename will change Bedroom 1 to Master Bedroom.");
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("blocks ambiguous current-estimate node renames before Apply", () => {
    const draft = buildPackageBuilderDraft({
      message: "Rename Bedroom to Master Bedroom.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 0,
          nodeCount: 3,
          rowCount: 0,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Bedroom 1",
            kind: "area",
            path: ["House", "Bedroom 1"],
            rowCount: 0,
          },
          {
            id: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
            name: "Bedroom 2",
            kind: "area",
            path: ["House", "Bedroom 2"],
            rowCount: 0,
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.nodeRenameDraft).toEqual([]);
    expect(draft.operations).toEqual([]);
    expect(draft.applyEligibility.eligible).toBe(false);
    expect(draft.applyEligibility.reasons).toContain("Ask Flip matched more than one current estimate node; name the exact Area or Group before Apply.");
  });

  it("builds a current-estimate template row-copy draft from a matched template row preview", () => {
    const draft = buildPackageBuilderDraft({
      message: "Copy the Template bedroom paint finish row from the 3 Bedroom Condo Starter template into this estimate.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 0,
          nodeCount: 2,
          rowCount: 0,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Master Bedroom",
            kind: "area",
            path: ["House", "Master Bedroom"],
            rowCount: 0,
          },
        ],
        templateMatches: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "3 Bedroom Condo Starter",
            description: "Starter template for condo estimates.",
            category: "Residential",
            nodeCount: 2,
            rowCount: 1,
            areaNames: ["Master Bedroom"],
            rowPreviews: [
              {
                id: "99999999-9999-4999-8999-999999999999",
                templateId: "11111111-1111-4111-8111-111111111111",
                templateNodeId: "88888888-8888-4888-8888-888888888888",
                areaName: "Master Bedroom",
                material: "Template bedroom paint finish",
                description: "Paint finish copied from a workspace template.",
                supplier: "Template Supplier",
                quantity: 1,
                unit: "lot",
                unitCost: 30_000,
                miscCost: 2_000,
                contingencyPercentage: 5,
                total: 33_500,
              },
            ],
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.rowDraft).toEqual([]);
    expect(draft.templateInsertDraft).toEqual([]);
    expect(draft.templateRowCopyDraft).toEqual([
      expect.objectContaining({
        clientDraftId: "copy-template-row-template-bedroom-paint-finish",
        sourceTemplateId: "11111111-1111-4111-8111-111111111111",
        sourceTemplateRowId: "99999999-9999-4999-8999-999999999999",
        sourceTemplateName: "3 Bedroom Condo Starter",
        targetAreaClientDraftId: "existing-area-1",
        material: "Template bedroom paint finish",
      }),
    ]);
    expect(draft.operations).toEqual([
      expect.objectContaining({
        type: "copy_template_row",
        clientDraftId: "copy-template-row-template-bedroom-paint-finish",
        applyEligible: true,
      }),
    ]);
    expect(draft.budgetSummary.draftTotal).toBe(33_500);
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("builds a current-estimate template-insert draft from matched reusable templates", () => {
    const draft = buildPackageBuilderDraft({
      message: "Insert the 3 Bedroom Condo Starter template into this estimate.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 0,
          nodeCount: 1,
          rowCount: 0,
          firstNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
        ],
        templateMatches: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "3 Bedroom Condo Starter",
            description: "Workspace starter template for condo packages.",
            category: "Residential",
            nodeCount: 4,
            rowCount: 8,
            areaNames: ["Living", "Bedroom", "Toilet & Bath"],
            rowPreviews: [
              {
                areaName: "Bedroom",
                material: "Template bedroom paint finish",
                description: "Paint finish copied from a workspace estimate template.",
                supplier: "Template Supplier",
                quantity: 2,
                unit: "allowance",
                unitCost: 9_000,
                miscCost: 1_000,
                contingencyPercentage: 10,
                total: 20_800,
              },
              {
                areaName: "Toilet & Bath",
                material: "Template toilet tile finish",
                description: "Tile finish copied from a workspace estimate template.",
                supplier: "Template Supplier",
                quantity: 1,
                unit: "allowance",
                unitCost: 12_000,
                miscCost: 500,
                contingencyPercentage: 5,
                total: 13_100,
              },
            ],
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.rowDraft).toEqual([]);
    expect(draft.rowUpdateDraft).toEqual([]);
    expect(draft.templateInsertDraft).toEqual([
      expect.objectContaining({
        clientDraftId: "insert-template-3-bedroom-condo-starter",
        sourceTemplateId: "11111111-1111-4111-8111-111111111111",
        sourceTemplateName: "3 Bedroom Condo Starter",
        targetParentClientDraftId: "existing-estimate-root",
        expectedNodeCount: 4,
        expectedRowCount: 8,
        previewTotal: 33_900,
      }),
    ]);
    expect(draft.operations).toEqual([
      expect.objectContaining({
        type: "insert_template",
        clientDraftId: "insert-template-3-bedroom-condo-starter",
        applyEligible: true,
      }),
    ]);
    expect(draft.budgetSummary.draftTotal).toBe(33_900);
    expect(draft.assumptions).toContain("Template insert will copy 3 Bedroom Condo Starter into the current estimate root.");
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("blocks template inserts when no matched reusable template is named", () => {
    const draft = buildPackageBuilderDraft({
      message: "Insert the 3 Bedroom Condo Starter template into this estimate.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Current Estimate",
          sheetCode: "ES-001",
          total: 0,
          nodeCount: 1,
          rowCount: 0,
          firstNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
        ],
        templateMatches: [
          {
            id: "99999999-9999-4999-8999-999999999999",
            name: "Kitchen Starter",
            description: "Workspace starter template for kitchen packages.",
            category: "Residential",
            nodeCount: 2,
            rowCount: 3,
            areaNames: ["Kitchen"],
            rowPreviews: [],
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.templateInsertDraft).toEqual([]);
    expect(draft.operations).toEqual([]);
    expect(draft.applyEligibility.eligible).toBe(false);
    expect(draft.applyEligibility.reasons).toContain("Ask Flip could not find a matched reusable estimate template to insert.");
  });

  it("creates missing Area Nodes inside the current estimate instead of creating a new package", () => {
    const draft = buildPackageBuilderDraft({
      message: "Fill this estimate with beds and water closets for a 3 bedroom condo unit.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Empty Current Estimate",
          sheetCode: "ES-001",
          total: 0,
          nodeCount: 1,
          rowCount: 0,
          firstNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.target).toEqual(expect.objectContaining({
      projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
      estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
      areaNodeIdsByClientDraftId: {},
    }));
    expect(draft.treeDraft.map((node) => node.name)).toEqual(expect.arrayContaining([
      "House",
      "Master Bedroom",
      "Bedroom 2",
      "Bedroom 3",
      "Master Toilet & Bath",
      "Common Toilet & Bath",
    ]));
    expect(draft.operations.some((operation) => operation.type === "create_project" || operation.type === "create_estimate")).toBe(false);
    expect(draft.operations.some((operation) => operation.type === "create_tree_node")).toBe(true);
    expect(draft.rowDraft.some((row) => row.material === "Queen bed frame")).toBe(true);
    expect(draft.rowDraft.some((row) => row.material === "Water closet")).toBe(true);
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("creates only missing Area Nodes when the current estimate already has some rooms", () => {
    const draft = buildPackageBuilderDraft({
      message: "Fill this estimate with beds and water closets for a 3 bedroom condo unit.",
      readData: {
        ...makeReadData(),
        projectSummary: {
          id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Lewis Residence",
          clientName: null,
          location: null,
          projectCode: "LR-001",
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
        estimateSummary: {
          id: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
          projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
          name: "Partially Built Current Estimate",
          sheetCode: "ES-001",
          total: 0,
          nodeCount: 2,
          rowCount: 0,
          firstNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        estimateTree: [
          {
            id: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            name: "House",
            kind: "group",
            path: ["House"],
            rowCount: 0,
          },
          {
            id: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
            name: "Master Bedroom",
            kind: "area",
            path: ["House", "Master Bedroom"],
            rowCount: 0,
          },
        ],
      },
      providerResult: null,
    });

    const createNodeOperations = draft.operations.filter((operation) => operation.type === "create_tree_node");

    expect(draft.intent).toBe("fill_current_estimate");
    expect(draft.treeDraft.filter((node) => node.name === "Master Bedroom")).toHaveLength(1);
    expect(draft.treeDraft.map((node) => node.name)).toEqual(expect.arrayContaining([
      "Master Bedroom",
      "Bedroom 2",
      "Bedroom 3",
      "Master Toilet & Bath",
      "Common Toilet & Bath",
    ]));
    expect(Object.values(draft.target?.areaNodeIdsByClientDraftId ?? {})).toEqual(["dddddddd-4444-4ddd-8ddd-dddddddd4444"]);
    expect(createNodeOperations).toEqual(expect.arrayContaining([
      expect.objectContaining({ clientDraftId: "area-bedroom-2", applyEligible: true }),
      expect.objectContaining({ clientDraftId: "area-bedroom-3", applyEligible: true }),
      expect.objectContaining({ clientDraftId: "area-master-toilet-bath", applyEligible: true }),
      expect.objectContaining({ clientDraftId: "area-common-toilet-bath", applyEligible: true }),
    ]));
    expect(createNodeOperations.some((operation) => operation.clientDraftId === "existing-area-1")).toBe(false);
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("assembles a 3-bedroom condo with repeated bedroom and toilet component rows", () => {
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: makeReadData(),
      providerResult: null,
    });

    expect(draft.projectDraft.name).toBe("3 Bedroom Condo Unit");
    expect(draft.treeDraft.map((node) => node.name)).toEqual(expect.arrayContaining([
      "Master Bedroom",
      "Bedroom 2",
      "Bedroom 3",
      "Master Toilet & Bath",
      "Common Toilet & Bath",
    ]));

    const bedroomAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("bedroom"))
        .map((node) => node.clientDraftId),
    );
    const toiletAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("toilet"))
        .map((node) => node.clientDraftId),
    );
    const bedRows = draft.rowDraft.filter((row) =>
      bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material === "Queen bed frame" && row.sourceType === "library_item"
    );
    const waterClosetRows = draft.rowDraft.filter((row) =>
      toiletAreaIds.has(row.targetAreaClientDraftId) && row.material === "Water closet" && row.sourceType === "library_item"
    );

    expect(bedRows).toHaveLength(3);
    expect(waterClosetRows).toHaveLength(2);
    expect(new Set(bedRows.map((row) => row.sourceLibraryItemId))).toEqual(new Set(["11111111-1111-4111-8111-111111111111"]));
    expect(new Set(waterClosetRows.map((row) => row.sourceLibraryItemId))).toEqual(new Set(["22222222-2222-4222-8222-222222222222"]));
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("uses accepted and rejected package memory only as component ranking hints", () => {
    const readData = makeReadData();
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with beds in every bedroom.",
      readData: {
        ...readData,
        componentMatches: [
          {
            id: "99999999-9999-4999-8999-999999999999",
            material: "Budget bedroom bed frame",
            description: "Bed frame for condo bedrooms.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Budget Supplier",
            unit: "pc",
            unitCost: 12_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "99999999-9999-4999-8999-999999999999",
            currentVersionNumber: 1,
          },
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            material: "Preferred bedroom bed frame",
            description: "Bed frame for condo bedrooms.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Preferred Supplier",
            unit: "pc",
            unitCost: 18_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            currentVersionNumber: 1,
          },
          ...readData.componentMatches.filter((component) => !component.material.toLowerCase().includes("bed")),
        ],
        memoryPreferences: {
          componentSignals: [
            {
              sourceLibraryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              sourceLabel: "Preferred bedroom bed frame",
              roomName: "Bedroom 1",
              acceptedCount: 2,
              rejectedCount: 0,
              score: 8,
              lastSeenAt: "2026-05-28T00:00:00.000Z",
            },
            {
              sourceLibraryItemId: "99999999-9999-4999-8999-999999999999",
              sourceLabel: "Budget bedroom bed frame",
              roomName: "Bedroom 1",
              acceptedCount: 0,
              rejectedCount: 1,
              score: -6,
              lastSeenAt: "2026-05-27T00:00:00.000Z",
            },
          ],
          templateSignals: [],
          sourceRowCount: 2,
        },
      },
      providerResult: null,
    });

    const bedroomAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("bedroom"))
        .map((node) => node.clientDraftId),
    );
    const bedRows = draft.rowDraft.filter((row) =>
      bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material.toLowerCase().includes("bed frame")
    );

    expect(bedRows).toHaveLength(3);
    expect(new Set(bedRows.map((row) => row.material))).toEqual(new Set(["Preferred bedroom bed frame"]));
    expect(draft.assumptions).toContain("Used previous Ask Flip accepted/rejected package feedback as ranking hints only.");
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("uses prior project linked component usage as component ranking hints", () => {
    const readData = makeReadData();
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with beds in every bedroom.",
      readData: {
        ...readData,
        componentMatches: [
          {
            id: "99999999-9999-4999-8999-999999999999",
            material: "Budget bedroom bed frame",
            description: "Bed frame for condo bedrooms.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Budget Supplier",
            unit: "pc",
            unitCost: 12_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "99999999-9999-4999-8999-999999999999",
            currentVersionNumber: 1,
          },
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            material: "Preferred bedroom bed frame",
            description: "Bed frame for condo bedrooms.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Preferred Supplier",
            unit: "pc",
            unitCost: 18_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            currentVersionNumber: 1,
          },
          ...readData.componentMatches.filter((component) => !component.material.toLowerCase().includes("bed")),
        ],
        historicalRowMatches: [
          {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            projectId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            projectName: "Previous Condo Fitout",
            estimateId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            estimateName: "Prior Condo Estimate",
            areaName: "Bedroom",
            material: "Preferred bedroom bed frame",
            description: "Accepted bed frame used in a prior condo estimate.",
            supplier: "Preferred Supplier",
            quantity: 1,
            unit: "pc",
            unitCost: 18_000,
            miscCost: 0,
            total: 18_000,
            sourceLibraryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            updatedAt: "2026-05-28T00:00:00.000Z",
          },
        ],
      },
      providerResult: null,
    });

    const bedroomAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("bedroom"))
        .map((node) => node.clientDraftId),
    );
    const bedRows = draft.rowDraft.filter((row) =>
      bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material.toLowerCase().includes("bed frame")
    );

    expect(bedRows).toHaveLength(3);
    expect(new Set(bedRows.map((row) => row.sourceLibraryItemId))).toEqual(new Set(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]));
    expect(new Set(bedRows.map((row) => row.material))).toEqual(new Set(["Preferred bedroom bed frame"]));
    expect(draft.assumptions).toContain("Used prior project component usage as ranking hints only.");
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("does not let unscoped prior project component usage override room-specific ranking", () => {
    const readData = makeReadData();
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with beds in every bedroom.",
      readData: {
        ...readData,
        componentMatches: [
          {
            id: "99999999-9999-4999-8999-999999999999",
            material: "Budget bedroom bed frame",
            description: "Bed frame for condo bedrooms.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Budget Supplier",
            unit: "pc",
            unitCost: 12_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "99999999-9999-4999-8999-999999999999",
            currentVersionNumber: 1,
          },
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            material: "Preferred bedroom bed frame",
            description: "Bed frame for condo bedrooms.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Preferred Supplier",
            unit: "pc",
            unitCost: 18_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            currentVersionNumber: 1,
          },
          ...readData.componentMatches.filter((component) => !component.material.toLowerCase().includes("bed")),
        ],
        historicalRowMatches: [
          {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            projectId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            projectName: "Previous Condo Fitout",
            estimateId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            estimateName: "Prior Condo Estimate",
            areaName: null,
            material: "Preferred bedroom bed frame",
            description: "Unscoped prior component usage should not override room ranking.",
            supplier: "Preferred Supplier",
            quantity: 1,
            unit: "pc",
            unitCost: 18_000,
            miscCost: 0,
            total: 18_000,
            sourceLibraryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            updatedAt: "2026-05-28T00:00:00.000Z",
          },
        ],
      },
      providerResult: null,
    });

    const bedroomAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("bedroom"))
        .map((node) => node.clientDraftId),
    );
    const bedRows = draft.rowDraft.filter((row) =>
      bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material.toLowerCase().includes("bed frame")
    );

    expect(bedRows).toHaveLength(3);
    expect(new Set(bedRows.map((row) => row.sourceLibraryItemId))).toEqual(new Set(["99999999-9999-4999-8999-999999999999"]));
    expect(draft.assumptions).not.toContain("Used prior project component usage as ranking hints only.");
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("fans out living and dining rooms across multiple scoped library components", () => {
    const readData = makeReadData();
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: {
        ...readData,
        componentMatches: [
          ...readData.componentMatches,
          {
            id: "77777777-7777-4777-8777-777777777777",
            material: "Living sofa set",
            description: "Sofa seating package for condo living room.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Living Supplier",
            unit: "set",
            unitCost: 45_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "77777777-7777-4777-8777-777777777777",
            currentVersionNumber: 1,
          },
          {
            id: "88888888-8888-4888-8888-888888888888",
            material: "Living media console",
            description: "TV wall console for condo living area.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Living Supplier",
            unit: "pc",
            unitCost: 35_000,
            miscCost: 2_000,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "88888888-8888-4888-8888-888888888888",
            currentVersionNumber: 1,
          },
          {
            id: "99999999-9999-4999-8999-999999999999",
            material: "Dining table set",
            description: "Dining table package for condo dining area.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Dining Supplier",
            unit: "set",
            unitCost: 38_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "99999999-9999-4999-8999-999999999999",
            currentVersionNumber: 1,
          },
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            material: "Dining pendant light fixture",
            description: "Pendant light fixture for condo dining table.",
            category: "Lighting",
            categoryPath: ["Systems", "Lighting"],
            supplier: "Dining Supplier",
            unit: "set",
            unitCost: 19_500,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            currentVersionNumber: 1,
          },
        ],
      },
      providerResult: null,
    });

    const livingArea = draft.treeDraft.find((node) => node.kind === "area" && node.name === "Living");
    const diningArea = draft.treeDraft.find((node) => node.kind === "area" && node.name === "Dining");
    const livingRows = draft.rowDraft.filter((row) => row.targetAreaClientDraftId === livingArea?.clientDraftId);
    const diningRows = draft.rowDraft.filter((row) => row.targetAreaClientDraftId === diningArea?.clientDraftId);

    expect(livingRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ material: "Living sofa set", sourceType: "library_item" }),
      expect.objectContaining({ material: "Living media console", sourceType: "library_item" }),
    ]));
    expect(diningRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ material: "Dining table set", sourceType: "library_item" }),
      expect.objectContaining({ material: "Dining pendant light fixture", sourceType: "library_item" }),
    ]));
    expect(livingRows).not.toContainEqual(expect.objectContaining({ material: "Living allowance" }));
    expect(diningRows).not.toContainEqual(expect.objectContaining({ material: "Dining allowance" }));
    expect(new Set([...livingRows, ...diningRows].map((row) => row.sourceLibraryItemId))).toEqual(new Set([
      "77777777-7777-4777-8777-777777777777",
      "88888888-8888-4888-8888-888888888888",
      "99999999-9999-4999-8999-999999999999",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]));
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("uses comparable prior estimate packages as room and row pattern hints", () => {
    const readData = makeReadData();
    const draft = buildPackageBuilderDraft({
      message: "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.",
      readData: {
        ...readData,
        historicalRowMatches: [],
        templateMatches: [],
        comparableEstimatePackages: [
          {
            projectId: "99999999-9999-4999-8999-999999999999",
            projectName: "Previous Condo Fitout",
            estimateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            estimateName: "Prior Condo Estimate",
            sheetCode: "ES-002",
            updatedAt: "2026-05-20T00:00:00.000Z",
            matchedTerms: ["condo", "bed", "powder", "mirror"],
            areaCount: 1,
            rowCount: 1,
            total: 8_000,
            sourceLibraryCoverageRatio: 0,
            areas: [
              {
                areaName: "Powder Room",
                rowCount: 1,
                total: 8_000,
                sourceLibraryCoverageRatio: 0,
                topMaterials: ["Powder room vanity mirror"],
                rowPreviews: [
                  {
                    areaName: "Powder Room",
                    material: "Powder room vanity mirror",
                    description: "Mirror precedent from a comparable condo powder room.",
                    supplier: "Mirror Supplier",
                    quantity: 1,
                    unit: "pc",
                    unitCost: 7_500,
                    miscCost: 500,
                    contingencyPercentage: 0,
                    total: 8_000,
                    sourceType: "project",
                  },
                ],
              },
            ],
          },
        ],
      },
      providerResult: null,
    });

    const powderRoom = draft.treeDraft.find((node) => node.kind === "area" && node.name === "Powder Room");
    expect(powderRoom).toBeDefined();
    expect(draft.rowDraft).not.toContainEqual(expect.objectContaining({
      targetAreaClientDraftId: powderRoom?.clientDraftId,
      material: "Queen bed frame",
    }));
    expect(draft.rowDraft).toContainEqual(expect.objectContaining({
      targetAreaClientDraftId: powderRoom?.clientDraftId,
      material: "Powder room vanity mirror",
      sourceType: "allowance",
      sourceSnapshot: expect.objectContaining({
        sourceType: "comparable_estimate_package",
        projectName: "Previous Condo Fitout",
        estimateName: "Prior Condo Estimate",
        areaName: "Powder Room",
      }),
    }));
    expect(draft.assumptions).toContain("Used comparable prior estimate packages as room and row pattern hints only.");
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("deduplicates the same prior row when it appears as both historical and comparable package context", () => {
    const readData = makeReadData();
    const draft = buildPackageBuilderDraft({
      message: "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.",
      readData: {
        ...readData,
        templateMatches: [],
        historicalRowMatches: [
          {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            projectId: "99999999-9999-4999-8999-999999999999",
            projectName: "Previous Condo Fitout",
            estimateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            estimateName: "Prior Condo Estimate",
            areaName: "Powder Room",
            material: "Powder room vanity mirror",
            description: "Mirror precedent from a comparable condo powder room.",
            supplier: "Mirror Supplier",
            quantity: 1,
            unit: "pc",
            unitCost: 7_500,
            miscCost: 500,
            total: 8_000,
            sourceLibraryItemId: null,
            updatedAt: "2026-05-20T00:00:00.000Z",
          },
        ],
        comparableEstimatePackages: [
          {
            projectId: "99999999-9999-4999-8999-999999999999",
            projectName: "Previous Condo Fitout",
            estimateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            estimateName: "Prior Condo Estimate",
            sheetCode: "ES-002",
            updatedAt: "2026-05-20T00:00:00.000Z",
            matchedTerms: ["condo", "powder", "mirror"],
            areaCount: 1,
            rowCount: 1,
            total: 8_000,
            sourceLibraryCoverageRatio: 0,
            areas: [
              {
                areaName: "Powder Room",
                rowCount: 1,
                total: 8_000,
                sourceLibraryCoverageRatio: 0,
                topMaterials: ["Powder room vanity mirror"],
                rowPreviews: [
                  {
                    areaName: "Powder Room",
                    material: "Powder room vanity mirror",
                    description: "Mirror precedent from a comparable condo powder room.",
                    supplier: "Mirror Supplier",
                    quantity: 1,
                    unit: "pc",
                    unitCost: 7_500,
                    miscCost: 500,
                    contingencyPercentage: 0,
                    total: 8_000,
                    sourceType: "project",
                  },
                ],
              },
            ],
          },
        ],
      },
      providerResult: null,
    });

    const powderRoom = draft.treeDraft.find((node) => node.kind === "area" && node.name === "Powder Room");
    const powderRoomRows = draft.rowDraft.filter((row) =>
      row.targetAreaClientDraftId === powderRoom?.clientDraftId && row.material === "Powder room vanity mirror"
    );
    expect(powderRoomRows).toHaveLength(1);
    expect(powderRoomRows[0]).toEqual(expect.objectContaining({
      sourceType: "allowance",
      sourceSnapshot: expect.objectContaining({ notSupplierPriced: true }),
    }));
  });

  it("populates multiple room-specific component rows from scoped library matches", () => {
    const readData = makeReadData();
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: {
        ...readData,
        componentMatches: [
          ...readData.componentMatches,
          {
            id: "55555555-5555-4555-8555-555555555555",
            material: "Bedroom wardrobe cabinet",
            description: "Wardrobe storage cabinet for condo bedrooms.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Bedroom Supplier",
            unit: "pc",
            unitCost: 16_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "55555555-5555-4555-8555-555555555555",
            currentVersionNumber: 1,
          },
          {
            id: "66666666-6666-4666-8666-666666666666",
            material: "Lavatory basin set",
            description: "Lavatory sink and faucet set for toilet and bath areas.",
            category: "Sanitary Systems",
            categoryPath: ["Systems", "Sanitary Systems"],
            supplier: "Plumbing Supplier",
            unit: "set",
            unitCost: 8_500,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "66666666-6666-4666-8666-666666666666",
            currentVersionNumber: 1,
          },
        ],
      },
      providerResult: null,
    });

    const bedroomAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("bedroom"))
        .map((node) => node.clientDraftId),
    );
    const toiletAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("toilet"))
        .map((node) => node.clientDraftId),
    );

    const wardrobeRows = draft.rowDraft.filter((row) =>
      bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material === "Bedroom wardrobe cabinet" && row.sourceType === "library_item"
    );
    const lavatoryRows = draft.rowDraft.filter((row) =>
      toiletAreaIds.has(row.targetAreaClientDraftId) && row.material === "Lavatory basin set" && row.sourceType === "library_item"
    );

    expect(wardrobeRows).toHaveLength(3);
    expect(lavatoryRows).toHaveLength(2);
    expect(new Set(wardrobeRows.map((row) => row.sourceLibraryItemId))).toEqual(new Set(["55555555-5555-4555-8555-555555555555"]));
    expect(new Set(lavatoryRows.map((row) => row.sourceLibraryItemId))).toEqual(new Set(["66666666-6666-4666-8666-666666666666"]));
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("uses source-backed room finish and fixture components without inventing optional allowances", () => {
    const readData = makeReadData();
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: {
        ...readData,
        componentMatches: [
          ...readData.componentMatches,
          {
            id: "77777777-7777-4777-8777-777777777777",
            material: "Bedroom paint finish",
            description: "Wall and ceiling paint finish for condo bedrooms.",
            category: "Finishes",
            categoryPath: ["Finishes", "Paint"],
            supplier: "Finish Supplier",
            unit: "lot",
            unitCost: 18_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "77777777-7777-4777-8777-777777777777",
            currentVersionNumber: 1,
          },
          {
            id: "88888888-8888-4888-8888-888888888888",
            material: "Bedroom ceiling light fixture",
            description: "Ceiling light fixture for condo bedrooms.",
            category: "Lighting",
            categoryPath: ["Systems", "Lighting"],
            supplier: "Lighting Supplier",
            unit: "pc",
            unitCost: 4_500,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "88888888-8888-4888-8888-888888888888",
            currentVersionNumber: 1,
          },
          {
            id: "99999999-9999-4999-8999-999999999999",
            material: "Toilet wall tile finish",
            description: "Wall tile finish for toilet and bath areas.",
            category: "Finishes",
            categoryPath: ["Finishes", "Tiles"],
            supplier: "Tile Supplier",
            unit: "lot",
            unitCost: 26_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "99999999-9999-4999-8999-999999999999",
            currentVersionNumber: 1,
          },
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            material: "Kitchen sink set",
            description: "Kitchen sink and faucet set for condo kitchen.",
            category: "Plumbing",
            categoryPath: ["Systems", "Plumbing"],
            supplier: "Kitchen Supplier",
            unit: "set",
            unitCost: 11_500,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            currentVersionNumber: 1,
          },
          {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            material: "Kitchen countertop slab",
            description: "Countertop finish for condo kitchen.",
            category: "Finishes",
            categoryPath: ["Finishes", "Countertops"],
            supplier: "Kitchen Supplier",
            unit: "lot",
            unitCost: 38_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            currentVersionNumber: 1,
          },
        ],
      },
      providerResult: null,
    });

    const bedroomAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("bedroom"))
        .map((node) => node.clientDraftId),
    );
    const toiletAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("toilet"))
        .map((node) => node.clientDraftId),
    );

    const bedroomPaintRows = draft.rowDraft.filter((row) =>
      bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material === "Bedroom paint finish" && row.sourceType === "library_item"
    );
    const bedroomLightRows = draft.rowDraft.filter((row) =>
      bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material === "Bedroom ceiling light fixture" && row.sourceType === "library_item"
    );
    const toiletTileRows = draft.rowDraft.filter((row) =>
      toiletAreaIds.has(row.targetAreaClientDraftId) && row.material === "Toilet wall tile finish" && row.sourceType === "library_item"
    );

    expect(bedroomPaintRows).toHaveLength(3);
    expect(bedroomLightRows).toHaveLength(3);
    expect(toiletTileRows).toHaveLength(2);
    expect(draft.rowDraft).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetAreaClientDraftId: "area-kitchen", material: "Kitchen sink set", sourceType: "library_item" }),
      expect.objectContaining({ targetAreaClientDraftId: "area-kitchen", material: "Kitchen countertop slab", sourceType: "library_item" }),
    ]));
    expect(draft.rowDraft).not.toContainEqual(expect.objectContaining({ material: expect.stringMatching(/paint finish allowance|light fixture allowance|tile finish allowance|sink allowance|countertop allowance/i) }));
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("does not synthesize source-only finish and fixture allowances when scoped source data is missing", () => {
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: makeReadData(),
      providerResult: null,
    });

    expect(draft.rowDraft).not.toContainEqual(expect.objectContaining({ material: expect.stringMatching(/paint finish allowance|light fixture allowance|tile finish allowance|sink allowance|countertop allowance/i) }));
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("revises a pending package draft by appending matched library rows before Apply", () => {
    const baseDraft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: makeReadData(),
      providerResult: null,
    });

    const revisedDraft = buildPackageBuilderDraft({
      message: "Also add a media console to the Living area.",
      readData: {
        ...makeReadData(),
        componentMatches: [
          ...makeReadData().componentMatches,
          {
            id: "88888888-8888-4888-8888-888888888888",
            material: "Living media console",
            description: "TV wall console for condo living area.",
            category: "Furniture",
            categoryPath: ["Objects", "Furniture"],
            supplier: "Living Supplier",
            unit: "pc",
            unitCost: 35_000,
            miscCost: 2_000,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "88888888-8888-4888-8888-888888888888",
            currentVersionNumber: 1,
          },
        ],
      },
      providerResult: null,
      baseDraft,
    });

    const livingArea = revisedDraft.treeDraft.find((node) => node.kind === "area" && node.name === "Living");
    const addedRows = revisedDraft.rowDraft.filter((row) => row.material === "Living media console");

    expect(revisedDraft.draftId).not.toBe(baseDraft.draftId);
    expect(revisedDraft.intent).toBe(baseDraft.intent);
    expect(revisedDraft.treeDraft).toEqual(baseDraft.treeDraft);
    expect(addedRows).toHaveLength(1);
    expect(addedRows[0]).toEqual(expect.objectContaining({
      targetAreaClientDraftId: livingArea?.clientDraftId,
      sourceType: "library_item",
      sourceLibraryItemId: "88888888-8888-4888-8888-888888888888",
      unitCost: 35_000,
      miscCost: 2_000,
    }));
    expect(revisedDraft.rowDraft).toHaveLength(baseDraft.rowDraft.length + 1);
    expect(revisedDraft.operations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "insert_component_row",
        clientDraftId: addedRows[0]?.clientDraftId,
        applyEligible: true,
      }),
    ]));
    expect(revisedDraft.budgetSummary.draftTotal).toBe(baseDraft.budgetSummary.draftTotal + 37_000);
    expect(revisedDraft.assumptions).toContain("Revised the pending draft to add Living media console before Apply.");
    expect(revisedDraft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("uses provider search terms as bounded row-planning hints for scoped library matches", () => {
    const readData = makeReadData();
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: {
        ...readData,
        componentMatches: [
          ...readData.componentMatches,
          {
            id: "77777777-7777-4777-8777-777777777777",
            material: "Custom media console package",
            description: "TV wall joinery and console installation.",
            category: "Entertainment Millwork",
            categoryPath: ["Objects", "Entertainment Millwork"],
            supplier: "Specialty Supplier",
            unit: "lot",
            unitCost: 45_000,
            miscCost: 0,
            currency: "PHP",
            lifecycleState: "available",
            sourceLibraryItemId: "77777777-7777-4777-8777-777777777777",
            currentVersionNumber: 1,
          },
        ],
      },
      providerResult: {
        provider: "test-provider",
        model: "test-model",
        suggestion: {
          searchTerms: ["media console"],
        },
      },
    });

    const livingArea = draft.treeDraft.find((node) => node.kind === "area" && node.name === "Living");
    expect(livingArea).toBeTruthy();
    expect(draft.rowDraft).toContainEqual(expect.objectContaining({
      targetAreaClientDraftId: livingArea?.clientDraftId,
      material: "Custom media console package",
      sourceType: "library_item",
      sourceLibraryItemId: "77777777-7777-4777-8777-777777777777",
    }));
  });

  it("uses matched estimate template area names as draft areas without dropping condo room needs", () => {
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: {
        ...makeReadData(),
        templateMatches: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            name: "3 Bedroom Condo Starter",
            description: "Workspace template with extra condo support areas.",
            category: "Residential",
            nodeCount: 9,
            rowCount: 4,
            areaNames: ["Laundry", "Balcony", "Common Toilet & Bath"],
          },
        ],
      },
      providerResult: null,
    });

    expect(draft.treeDraft.map((node) => node.name)).toEqual(expect.arrayContaining([
      "Master Bedroom",
      "Bedroom 2",
      "Bedroom 3",
      "Master Toilet & Bath",
      "Common Toilet & Bath",
      "Laundry",
      "Balcony",
    ]));
    expect(draft.templateMatches).toEqual([
      expect.objectContaining({
        id: "44444444-4444-4444-8444-444444444444",
        name: "3 Bedroom Condo Starter",
        areaNames: ["Laundry", "Balcony", "Common Toilet & Bath"],
      }),
    ]);
    expect(draft.assumptions).toContain("Used matched estimate template areas from 3 Bedroom Condo Starter as draft structure hints.");
    expect(draft.rowDraft.every((row) => row.sourceType !== "template")).toBe(true);
    expect(draft.treeDraft.filter((node) => node.name === "Common Toilet & Bath")).toHaveLength(1);
  });

  it("adds template row previews as review-required allowance rows on matching draft areas", () => {
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: {
        ...makeReadData(),
        componentMatches: [],
        templateMatches: [
          {
            id: "77777777-7777-4777-8777-777777777777",
            name: "3 Bedroom Condo Starter",
            description: "Workspace template with bedroom and toilet starter rows.",
            category: "Residential",
            nodeCount: 4,
            rowCount: 2,
            areaNames: ["Bedroom", "Toilet & Bath"],
            rowPreviews: [
              {
                areaName: "Bedroom",
                material: "Template bedroom paint finish",
                description: "Paint finish copied from a workspace estimate template.",
                supplier: "Template Supplier",
                quantity: 1,
                unit: "allowance",
                unitCost: 9_000,
                miscCost: 0,
                contingencyPercentage: 0,
              },
              {
                areaName: "Toilet & Bath",
                material: "Template toilet tile finish",
                description: "Tile finish copied from a workspace estimate template.",
                supplier: "Template Supplier",
                quantity: 1,
                unit: "allowance",
                unitCost: 12_000,
                miscCost: 0,
                contingencyPercentage: 0,
              },
            ],
          },
        ],
      },
      providerResult: null,
    });

    const bedroomAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("bedroom"))
        .map((node) => node.clientDraftId),
    );
    const toiletAreaIds = new Set(
      draft.treeDraft
        .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("toilet"))
        .map((node) => node.clientDraftId),
    );
    const bedroomTemplateRows = draft.rowDraft.filter((row) =>
      bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material === "Template bedroom paint finish"
    );
    const toiletTemplateRows = draft.rowDraft.filter((row) =>
      toiletAreaIds.has(row.targetAreaClientDraftId) && row.material === "Template toilet tile finish"
    );

    expect(bedroomTemplateRows).toHaveLength(3);
    expect(toiletTemplateRows).toHaveLength(2);
    expect([...bedroomTemplateRows, ...toiletTemplateRows].every((row) =>
      row.sourceType === "allowance"
      && row.sourceTemplateId === "77777777-7777-4777-8777-777777777777"
      && row.sourceSnapshot?.sourceType === "estimate_template_row"
      && row.warnings.some((warning) => warning.includes("Template row"))
    )).toBe(true);
    expect(draft.assumptions).toContain("Used matched estimate template rows as review-required allowance rows.");
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("dedupes template area names by generated tree id so casing cannot invalidate the draft", () => {
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: {
        ...makeReadData(),
        templateMatches: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            name: "3 Bedroom Condo Starter",
            description: "Workspace template with duplicate support area spelling.",
            category: "Residential",
            nodeCount: 9,
            rowCount: 4,
            areaNames: ["common toilet & bath", "  Laundry  "],
          },
        ],
      },
      providerResult: null,
    });

    const treeIds = draft.treeDraft.map((node) => node.clientDraftId);
    expect(new Set(treeIds).size).toBe(treeIds.length);
    expect(draft.treeDraft.filter((node) => node.clientDraftId === "area-common-toilet-bath")).toHaveLength(1);
    expect(draft.treeDraft.map((node) => node.name)).toContain("Laundry");
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("uses prior project rows as reviewed allowance precedents when library components are missing", () => {
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with beds and water closets, budget is 5 million pesos.",
      readData: {
        ...makeReadData(),
        componentMatches: [],
        historicalRowMatches: [
          {
            id: "77777777-7777-4777-8777-777777777777",
            projectId: "88888888-8888-4888-8888-888888888888",
            projectName: "Previous Condo Fitout",
            estimateId: "99999999-9999-4999-8999-999999999999",
            estimateName: "Baseline Estimate",
            areaName: "Bedroom",
            material: "Prior condo queen bed",
            description: "Bed row from a prior condo estimate.",
            supplier: "Previous Supplier",
            quantity: 1,
            unit: "pc",
            unitCost: 21_000,
            miscCost: 0,
            total: 21_000,
            sourceLibraryItemId: null,
            updatedAt: "2026-05-20T00:00:00.000Z",
          },
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            projectId: "88888888-8888-4888-8888-888888888888",
            projectName: "Previous Condo Fitout",
            estimateId: "99999999-9999-4999-8999-999999999999",
            estimateName: "Baseline Estimate",
            areaName: "Toilet & Bath",
            material: "Prior water closet set",
            description: "Water closet row from a prior condo estimate.",
            supplier: "Previous Plumbing Supplier",
            quantity: 1,
            unit: "set",
            unitCost: 14_000,
            miscCost: 0,
            total: 14_000,
            sourceLibraryItemId: null,
            updatedAt: "2026-05-20T00:00:00.000Z",
          },
        ],
      },
      providerResult: null,
    });

    const bedRows = draft.rowDraft.filter((row) => row.material === "Prior condo queen bed");
    const waterClosetRows = draft.rowDraft.filter((row) => row.material === "Prior water closet set");

    expect(bedRows).toHaveLength(3);
    expect(waterClosetRows).toHaveLength(2);
    expect(bedRows.every((row) => row.sourceType === "allowance" && row.unitCost === 21_000)).toBe(true);
    expect(waterClosetRows.every((row) => row.sourceType === "allowance" && row.unitCost === 14_000)).toBe(true);
    expect([...bedRows, ...waterClosetRows].every((row) =>
      row.assumption.includes("prior estimate row") && row.warnings.some((warning) => warning.includes("Historical precedent"))
    )).toBe(true);
    expect(draft.assumptions).toContain("Used matched prior project estimate rows as reviewed allowance precedents.");
    expect(draft.applyEligibility).toEqual({ eligible: true, reasons: [] });
  });

  it("uses prior project rows for generic condo rooms before generated allowances", () => {
    const draft = buildPackageBuilderDraft({
      message: "Make a project for a 3 bedroom condo unit with an estimate sheet, budget is 5 million pesos.",
      readData: {
        ...makeReadData(),
        componentMatches: [],
        historicalRowMatches: [
          {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            projectId: "88888888-8888-4888-8888-888888888888",
            projectName: "Previous Condo Fitout",
            estimateId: "99999999-9999-4999-8999-999999999999",
            estimateName: "Baseline Estimate",
            areaName: "Living",
            material: "Prior living room paint finish",
            description: "Paint finish from a prior condo living area.",
            supplier: "Previous Finish Supplier",
            quantity: 1,
            unit: "lot",
            unitCost: 32_000,
            miscCost: 0,
            total: 32_000,
            sourceLibraryItemId: null,
            updatedAt: "2026-05-20T00:00:00.000Z",
          },
          {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            projectId: "88888888-8888-4888-8888-888888888888",
            projectName: "Previous Condo Fitout",
            estimateId: "99999999-9999-4999-8999-999999999999",
            estimateName: "Baseline Estimate",
            areaName: "Dining",
            material: "Prior dining light fixture package",
            description: "Lighting precedent from a prior condo dining area.",
            supplier: "Previous Lighting Supplier",
            quantity: 1,
            unit: "lot",
            unitCost: 18_000,
            miscCost: 0,
            total: 18_000,
            sourceLibraryItemId: null,
            updatedAt: "2026-05-20T00:00:00.000Z",
          },
        ],
        templateMatches: [],
      },
      providerResult: null,
    });

    expect(draft.rowDraft).toContainEqual(expect.objectContaining({
      targetAreaClientDraftId: "area-living",
      material: "Prior living room paint finish",
      sourceType: "allowance",
      unitCost: 32_000,
      sourceSnapshot: expect.objectContaining({ sourceType: "historical_estimate_row" }),
    }));
    expect(draft.rowDraft).toContainEqual(expect.objectContaining({
      targetAreaClientDraftId: "area-dining",
      material: "Prior dining light fixture package",
      sourceType: "allowance",
      unitCost: 18_000,
      sourceSnapshot: expect.objectContaining({ sourceType: "historical_estimate_row" }),
    }));
    expect(draft.rowDraft).not.toContainEqual(expect.objectContaining({
      targetAreaClientDraftId: "area-living",
      material: "Living allowance",
    }));
    expect(draft.rowDraft).not.toContainEqual(expect.objectContaining({
      targetAreaClientDraftId: "area-dining",
      material: "Dining allowance",
    }));
    expect(draft.assumptions).toContain("Used matched prior project estimate rows as reviewed allowance precedents.");
  });
});
