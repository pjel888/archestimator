import { describe, expect, it } from "vitest";

import {
  buildPackageDraftHash,
  parsePackageBuilderApplyRequest,
  parsePackageBuilderDraft,
  parsePackageBuilderRequest,
  validatePackageBuilderDraft,
} from "@/lib/ai/package-builder/schemas";

const validDraft = {
  schemaVersion: 1,
  mode: "draft",
  intent: "create_package_project",
  draftId: "draft-1",
  brief: {
    projectName: "3 Bedroom Package",
    targetBudget: 5_000_000,
    currencyCode: "PHP",
    bedrooms: 3,
    floorCount: 1,
    finishLevel: "standard",
    missingInputs: ["gross floor area"],
  },
  projectDraft: {
    name: "3 Bedroom Package",
    clientName: null,
    location: null,
    projectBudget: 5_000_000,
  },
  estimateDraft: {
    name: "Initial 3 Bedroom Package Estimate",
    sheetCode: "ES-001",
  },
  treeDraft: [
    { clientDraftId: "group-house", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
    { clientDraftId: "area-bedroom-1", kind: "area", name: "Bedroom 1", parentClientDraftId: "group-house", sortOrder: 0 },
  ],
  rowDraft: [
    {
      clientDraftId: "row-bedroom-1-bed",
      targetAreaClientDraftId: "area-bedroom-1",
      sourceType: "allowance",
      material: "Bedroom starter allowance",
      description: "Unmatched allowance row for review.",
      supplier: null,
      quantity: 1,
      unit: "allowance",
      unitCost: 100_000,
      miscCost: 0,
      contingencyPercentage: 0,
      confidence: "requires-user-review",
      assumption: "No matching component found.",
      warnings: ["Review before purchase."],
      applyEligible: true,
    },
  ],
  componentMatches: [],
  templateMatches: [],
  operations: [
    { operationId: "op-project", type: "create_project", applyEligible: true },
    { operationId: "op-estimate", type: "create_estimate", applyEligible: true },
    { operationId: "op-tree-house", type: "create_tree_node", clientDraftId: "group-house", applyEligible: true },
    { operationId: "op-row-bedroom-1-bed", type: "insert_allowance_row", clientDraftId: "row-bedroom-1-bed", applyEligible: true },
  ],
  budgetSummary: {
    targetBudget: 5_000_000,
    draftSubtotal: 100_000,
    allowanceTotal: 100_000,
    contingencyTotal: 0,
    draftTotal: 100_000,
    variance: -4_900_000,
    currencyCode: "PHP",
    completeness: "partial",
  },
  assumptions: ["Budget is a target, not a confirmed supplier quote."],
  warnings: ["Generated allowance rows are not supplier-priced rows."],
  applyEligibility: { eligible: true, reasons: [] },
  requiresConfirmation: true,
} as const;

const validLibraryComponentDraft = {
  ...validDraft,
  intent: "create_library_component",
  draftId: "draft-library-component-1",
  target: null,
  projectDraft: {
    name: "Library Component Draft",
    clientName: null,
    location: null,
    projectBudget: 18_000,
  },
  estimateDraft: {
    name: "Component Library",
    sheetCode: null,
  },
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
} as const;

describe("AI package-builder schemas", () => {
  it("accepts a valid 3-bedroom PHP 5M package request and draft", () => {
    expect(parsePackageBuilderRequest({ mode: "draft", message: "Assemble me a 3 bedroom package, budget is 5 million pesos." })).toMatchObject({
      mode: "draft",
      message: "Assemble me a 3 bedroom package, budget is 5 million pesos.",
    });

    const draft = parsePackageBuilderDraft(validDraft);
    expect(validatePackageBuilderDraft(draft)).toEqual({ valid: true, errors: [] });
    expect(draft.brief).toMatchObject({ bedrooms: 3, targetBudget: 5_000_000, currencyCode: "PHP" });

    const signedAdjustmentDraft = parsePackageBuilderDraft({
      ...validDraft,
      rowDraft: [
        {
          ...validDraft.rowDraft[0],
          contingencyPercentage: -7,
        },
      ],
    });
    expect(signedAdjustmentDraft.rowDraft[0]?.contingencyPercentage).toBe(-7);
    expect(signedAdjustmentDraft.rowDraft[0]?.adjustmentPercentage).toBe(-7);
    expect(validatePackageBuilderDraft(signedAdjustmentDraft)).toEqual({ valid: true, errors: [] });
  });

  it("accepts a confirmation-gated component-library creation draft", () => {
    const draft = parsePackageBuilderDraft(validLibraryComponentDraft);

    expect(validatePackageBuilderDraft(draft)).toEqual({ valid: true, errors: [] });
    expect(draft.intent).toBe("create_library_component");
    expect(draft.componentCreateDraft).toEqual([
      expect.objectContaining({
        clientDraftId: "component-queen-bed-frame",
        name: "Queen bed frame",
        unit: "set",
        unitCost: 18_000,
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
  });

  it("accepts a refine request only when it carries a verified base draft hash", () => {
    const baseDraft = parsePackageBuilderDraft(validDraft);
    const baseDraftHash = buildPackageDraftHash(baseDraft);

    expect(parsePackageBuilderRequest({
      mode: "refine",
      message: "Make this draft cheaper before I apply it.",
      baseDraft,
      baseDraftHash,
      baseDraftToken: "server-issued-base-draft-token",
      routeContext: { selectedNodeName: "Bedroom 1" },
    })).toMatchObject({
      mode: "refine",
      message: "Make this draft cheaper before I apply it.",
      baseDraft: expect.objectContaining({ draftId: "draft-1", intent: "create_package_project" }),
      baseDraftHash,
      baseDraftToken: "server-issued-base-draft-token",
    });

    expect(() => parsePackageBuilderRequest({
      mode: "refine",
      message: "Make this draft cheaper before I apply it.",
      baseDraft: {
        ...baseDraft,
        rowDraft: [{ ...baseDraft.rowDraft[0], unitCost: 10 }],
      },
      baseDraftHash,
      baseDraftToken: "server-issued-base-draft-token",
    })).toThrow("Refine base draft hash is stale.");
  });

  it("accepts signed base draft fields for pending draft revision requests", () => {
    const draft = parsePackageBuilderDraft(validDraft);
    const baseDraftHash = buildPackageDraftHash(draft);

    expect(
      parsePackageBuilderRequest({
        mode: "draft",
        message: "Also add media consoles to the living area.",
        baseDraft: draft,
        baseDraftHash,
        baseDraftToken: "server.base.draft.token",
      }),
    ).toMatchObject({
      mode: "draft",
      message: "Also add media consoles to the living area.",
      baseDraft: draft,
      baseDraftHash,
      baseDraftToken: "server.base.draft.token",
    });

    expect(() =>
      parsePackageBuilderRequest({
        mode: "draft",
        message: "Also add media consoles to the living area.",
        baseDraft: draft,
        baseDraftHash: "sha256:stale",
        baseDraftToken: "server.base.draft.token",
      }),
    ).toThrow("Base draft hash is stale.");
  });

  it("accepts signed feedback requests for rejected package drafts", () => {
    const draft = parsePackageBuilderDraft(validDraft);
    const draftHash = buildPackageDraftHash(draft);
    const ineligibleDraft = parsePackageBuilderDraft({
      ...validDraft,
      rowDraft: [{ ...validDraft.rowDraft[0], applyEligible: false }],
      operations: validDraft.operations.map((operation) => ({ ...operation, applyEligible: false })),
      applyEligibility: {
        eligible: false,
        reasons: ["User rejected or cannot apply this reviewed draft."],
      },
    });
    const ineligibleDraftHash = buildPackageDraftHash(ineligibleDraft);

    expect(
      parsePackageBuilderRequest({
        mode: "feedback",
        decision: "rejected",
        draft,
        draftHash,
        draftToken: "server.draft.token",
        routeContext: { selectedNodeName: "Bedroom 1" },
      }),
    ).toMatchObject({
      mode: "feedback",
      decision: "rejected",
      draft: expect.objectContaining({ draftId: "draft-1" }),
      draftHash,
      draftToken: "server.draft.token",
    });

    expect(() =>
      parsePackageBuilderRequest({
        mode: "feedback",
        decision: "rejected",
        draft: {
          ...draft,
          rowDraft: [{ ...draft.rowDraft[0], unitCost: 10 }],
        },
        draftHash,
        draftToken: "server.draft.token",
      }),
    ).toThrow("Feedback draft hash is stale.");

    expect(
      parsePackageBuilderRequest({
        mode: "feedback",
        decision: "rejected",
        draft: ineligibleDraft,
        draftHash: ineligibleDraftHash,
        draftToken: "server.ineligible.draft.token",
      }),
    ).toMatchObject({
      mode: "feedback",
      decision: "rejected",
      draft: expect.objectContaining({
        applyEligibility: expect.objectContaining({ eligible: false }),
      }),
      draftHash: ineligibleDraftHash,
    });
  });

  it("parses compact template area hints without changing Apply row requirements", () => {
    const draft = parsePackageBuilderDraft({
      ...validDraft,
      templateMatches: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "3 Bedroom Condo Starter",
          category: "Residential",
          nodeCount: 9,
          rowCount: 4,
          areaNames: ["Laundry", "Balcony"],
          rowPreviews: [
            {
              areaName: "Bedroom",
              material: "Template bedroom paint finish",
              description: "Paint finish copied from a workspace template.",
              supplier: "Template Supplier",
              quantity: 1,
              unit: "allowance",
              unitCost: 9_000,
              miscCost: 0,
              contingencyPercentage: 0,
              total: 9_000,
            },
          ],
        },
      ],
    });

    expect(draft.templateMatches).toEqual([
      expect.objectContaining({
        name: "3 Bedroom Condo Starter",
        areaNames: ["Laundry", "Balcony"],
        rowPreviews: [
          expect.objectContaining({
            areaName: "Bedroom",
            material: "Template bedroom paint finish",
            total: 9_000,
          }),
        ],
      }),
    ]);
    expect(validatePackageBuilderDraft(draft)).toEqual({ valid: true, errors: [] });
  });

  it("accepts fill-current-estimate drafts when rows target existing or newly-created Area Nodes", () => {
    const fillDraft = parsePackageBuilderDraft({
      ...validDraft,
      intent: "fill_current_estimate",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        activeTabId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        areaNodeIdsByClientDraftId: {
          "area-bedroom-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
      },
      operations: [
        { operationId: "op-row-bedroom-1-bed", type: "insert_allowance_row", clientDraftId: "row-bedroom-1-bed", applyEligible: true },
      ],
    });

    expect(fillDraft.intent).toBe("fill_current_estimate");
    expect(validatePackageBuilderDraft(fillDraft)).toEqual({ valid: true, errors: [] });

    const fillWithNewAreaDraft = parsePackageBuilderDraft({
      ...validDraft,
      intent: "fill_current_estimate",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        nodeIdsByClientDraftId: {
          "group-house": "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        },
        areaNodeIdsByClientDraftId: {},
      },
      rowDraft: [
        {
          ...validDraft.rowDraft[0],
          targetAreaClientDraftId: "area-bedroom-1",
        },
      ],
      operations: [
        { operationId: "op-tree-bedroom-1", type: "create_tree_node", clientDraftId: "area-bedroom-1", applyEligible: true },
        { operationId: "op-row-bedroom-1-bed", type: "insert_allowance_row", clientDraftId: "row-bedroom-1-bed", applyEligible: true },
      ],
    });

    expect(validatePackageBuilderDraft(fillWithNewAreaDraft)).toEqual({ valid: true, errors: [] });

    const invalidFillDraft = parsePackageBuilderDraft({
      ...fillDraft,
      operations: [
        { operationId: "op-project", type: "create_project", applyEligible: true },
        { operationId: "op-row-bedroom-1-bed", type: "insert_allowance_row", clientDraftId: "row-bedroom-1-bed", applyEligible: true },
      ],
    });

    expect(validatePackageBuilderDraft(invalidFillDraft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Fill-current-estimate drafts must not create projects or estimates."]),
    });
  });

  it("accepts fill-current-estimate row-update drafts only for existing estimate targets", () => {
    const updateDraft = parsePackageBuilderDraft({
      ...validDraft,
      intent: "fill_current_estimate",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        nodeIdsByClientDraftId: {
          "group-house": "cccccccc-3333-4ccc-8ccc-cccccccc3333",
          "area-bedroom-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        areaNodeIdsByClientDraftId: {
          "area-bedroom-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
      },
      rowDraft: [],
      rowUpdateDraft: [
        {
          clientDraftId: "update-bedroom-bed",
          targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
          expectedRowRevision: 3,
          patch: {
            quantity: 2,
            miscCost: 1_500,
            contingencyPercentage: -12,
          },
          warnings: ["Review row update before Apply."],
          applyEligible: true,
        },
      ],
      operations: [
        { operationId: "op-update-bedroom-bed", type: "update_existing_row", clientDraftId: "update-bedroom-bed", applyEligible: true },
      ],
      budgetSummary: {
        ...validDraft.budgetSummary,
        draftSubtotal: 0,
        allowanceTotal: 0,
        contingencyTotal: 0,
        draftTotal: 0,
      },
    });

    expect(validatePackageBuilderDraft(updateDraft)).toEqual({ valid: true, errors: [] });
    expect(updateDraft.rowUpdateDraft?.[0]?.patch).toMatchObject({ adjustmentPercentage: -12 });

    const invalidCreateDraft = parsePackageBuilderDraft({
      ...updateDraft,
      intent: "create_package_project",
      target: null,
      operations: [
        { operationId: "op-project", type: "create_project", applyEligible: true },
        { operationId: "op-estimate", type: "create_estimate", applyEligible: true },
        { operationId: "op-update-bedroom-bed", type: "update_existing_row", clientDraftId: "update-bedroom-bed", applyEligible: true },
      ],
    });

    expect(validatePackageBuilderDraft(invalidCreateDraft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Row updates require a fill-current-estimate target."]),
    });
  });

  it("accepts fill-current-estimate template inserts only for existing estimate targets", () => {
    const templateInsertDraft = {
      clientDraftId: "insert-template-condo-starter",
      sourceTemplateId: "11111111-1111-4111-8111-111111111111",
      sourceTemplateName: "3 Bedroom Condo Starter",
      targetParentClientDraftId: "group-house",
      expectedNodeCount: 4,
      expectedRowCount: 8,
      previewTotal: 125_000,
      warnings: ["Review the template copy before Apply."],
      applyEligible: true,
    };
    const insertDraft = parsePackageBuilderDraft({
      ...validDraft,
      intent: "fill_current_estimate",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        nodeIdsByClientDraftId: {
          "group-house": "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        },
        areaNodeIdsByClientDraftId: {},
      },
      treeDraft: [
        { clientDraftId: "group-house", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
      ],
      rowDraft: [],
      rowUpdateDraft: [],
      templateInsertDraft: [templateInsertDraft],
      operations: [
        {
          operationId: "op-template-insert-template-condo-starter",
          type: "insert_template",
          clientDraftId: "insert-template-condo-starter",
          applyEligible: true,
        },
      ],
      budgetSummary: {
        ...validDraft.budgetSummary,
        draftSubtotal: 125_000,
        allowanceTotal: 125_000,
        draftTotal: 125_000,
        variance: -4_875_000,
      },
    });

    expect(insertDraft.templateInsertDraft).toEqual([templateInsertDraft]);
    expect(validatePackageBuilderDraft(insertDraft)).toEqual({ valid: true, errors: [] });

    const invalidCreateDraft = parsePackageBuilderDraft({
      ...validDraft,
      templateInsertDraft: [templateInsertDraft],
      operations: [
        ...validDraft.operations,
        {
          operationId: "op-template-insert-template-condo-starter",
          type: "insert_template",
          clientDraftId: "insert-template-condo-starter",
          applyEligible: true,
        },
      ],
    });
    expect(validatePackageBuilderDraft(invalidCreateDraft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Template inserts require a fill-current-estimate target."]),
    });
  });

  it("accepts fill-current-estimate row replacement drafts only for existing estimate targets", () => {
    const rowReplacementDraft = {
      clientDraftId: "replace-existing-bed",
      targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
      expectedRowRevision: 3,
      sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
      priceOptionId: null,
      priceOptionUpdatedAt: null,
      material: "Queen bed frame",
      description: "Standard bed frame from the scoped component library.",
      supplier: "Bedroom Supplier",
      quantity: 1,
      unit: "pc",
      unitCost: 18_000,
      miscCost: 0,
      adjustmentPercentage: -8,
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
    };
    const replacementDraft = parsePackageBuilderDraft({
      ...validDraft,
      intent: "fill_current_estimate",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        nodeIdsByClientDraftId: {},
        areaNodeIdsByClientDraftId: {},
      },
      treeDraft: [],
      rowDraft: [],
      rowUpdateDraft: [],
      rowReplacementDraft: [rowReplacementDraft],
      operations: [
        {
          operationId: "op-replace-existing-bed",
          type: "replace_existing_row",
          clientDraftId: "replace-existing-bed",
          applyEligible: true,
        },
      ],
      budgetSummary: {
        ...validDraft.budgetSummary,
        draftSubtotal: 18_000,
        allowanceTotal: 0,
        draftTotal: 18_000,
        variance: -4_982_000,
      },
    });

    expect(replacementDraft.rowReplacementDraft).toEqual([
      expect.objectContaining({
        ...rowReplacementDraft,
        contingencyPercentage: -8,
        adjustmentPercentage: -8,
      }),
    ]);
    expect(validatePackageBuilderDraft(replacementDraft)).toEqual({ valid: true, errors: [] });

    const invalidCreateDraft = parsePackageBuilderDraft({
      ...validDraft,
      rowReplacementDraft: [rowReplacementDraft],
      operations: [
        ...validDraft.operations,
        {
          operationId: "op-replace-existing-bed",
          type: "replace_existing_row",
          clientDraftId: "replace-existing-bed",
          applyEligible: true,
        },
      ],
    });
    expect(validatePackageBuilderDraft(invalidCreateDraft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Row replacements require a fill-current-estimate target."]),
    });
  });

  it("accepts fill-current-estimate row delete drafts only for existing estimate targets", () => {
    const rowDeleteDraft = {
      clientDraftId: "delete-existing-bed",
      targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
      expectedRowRevision: 3,
      warnings: ["Review the delete before Apply; this removes an existing estimate row."],
      applyEligible: true,
    };
    const deleteDraft = parsePackageBuilderDraft({
      ...validDraft,
      intent: "fill_current_estimate",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        nodeIdsByClientDraftId: {},
        areaNodeIdsByClientDraftId: {},
      },
      treeDraft: [],
      rowDraft: [],
      rowUpdateDraft: [],
      rowReplacementDraft: [],
      rowDeleteDraft: [rowDeleteDraft],
      operations: [
        {
          operationId: "op-delete-existing-bed",
          type: "delete_existing_row",
          clientDraftId: "delete-existing-bed",
          applyEligible: true,
        },
      ],
      budgetSummary: {
        ...validDraft.budgetSummary,
        draftSubtotal: 0,
        allowanceTotal: 0,
        draftTotal: 0,
        variance: -5_000_000,
      },
    });

    expect(deleteDraft.rowDeleteDraft).toEqual([rowDeleteDraft]);
    expect(validatePackageBuilderDraft(deleteDraft)).toEqual({ valid: true, errors: [] });

    const invalidCreateDraft = parsePackageBuilderDraft({
      ...validDraft,
      rowDeleteDraft: [rowDeleteDraft],
      operations: [
        ...validDraft.operations,
        {
          operationId: "op-delete-existing-bed",
          type: "delete_existing_row",
          clientDraftId: "delete-existing-bed",
          applyEligible: true,
        },
      ],
    });
    expect(validatePackageBuilderDraft(invalidCreateDraft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Row deletes require a fill-current-estimate target."]),
    });
  });

  it("accepts fill-current-estimate node rename drafts only for current estimate nodes", () => {
    const nodeRenameDraft = {
      clientDraftId: "rename-node-bedroom-1",
      targetNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
      currentName: "Bedroom 1",
      nextName: "Master Bedroom",
      warnings: ["Review the rename before Apply; this changes an existing estimate tree node."],
      applyEligible: true,
    };
    const renameDraft = parsePackageBuilderDraft({
      ...validDraft,
      intent: "fill_current_estimate",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        nodeIdsByClientDraftId: {
          "group-house": "cccccccc-3333-4ccc-8ccc-cccccccc3333",
          "area-bedroom-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
        areaNodeIdsByClientDraftId: {
          "area-bedroom-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        },
      },
      rowDraft: [],
      rowUpdateDraft: [],
      rowReplacementDraft: [],
      rowDeleteDraft: [],
      nodeRenameDraft: [nodeRenameDraft],
      operations: [
        {
          operationId: "op-rename-node-bedroom-1",
          type: "rename_estimate_node",
          clientDraftId: "rename-node-bedroom-1",
          applyEligible: true,
        },
      ],
      budgetSummary: {
        ...validDraft.budgetSummary,
        draftSubtotal: 0,
        allowanceTotal: 0,
        draftTotal: 0,
        variance: -5_000_000,
      },
    });

    expect(renameDraft.nodeRenameDraft).toEqual([nodeRenameDraft]);
    expect(validatePackageBuilderDraft(renameDraft)).toEqual({ valid: true, errors: [] });

    const invalidCreateDraft = parsePackageBuilderDraft({
      ...validDraft,
      nodeRenameDraft: [nodeRenameDraft],
      operations: [
        ...validDraft.operations,
        {
          operationId: "op-rename-node-bedroom-1",
          type: "rename_estimate_node",
          clientDraftId: "rename-node-bedroom-1",
          applyEligible: true,
        },
      ],
    });
    expect(validatePackageBuilderDraft(invalidCreateDraft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Node renames require a fill-current-estimate target."]),
    });

    const invalidTargetDraft = parsePackageBuilderDraft({
      ...renameDraft,
      nodeRenameDraft: [
        {
          ...nodeRenameDraft,
          targetNodeId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
        },
      ],
    });
    expect(validatePackageBuilderDraft(invalidTargetDraft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Node rename rename-node-bedroom-1 must target a node from the current estimate."]),
    });

    const sameNameDraft = parsePackageBuilderDraft({
      ...renameDraft,
      nodeRenameDraft: [
        {
          ...nodeRenameDraft,
          nextName: "Bedroom 1",
        },
      ],
    });
    expect(validatePackageBuilderDraft(sameNameDraft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Node rename rename-node-bedroom-1 must change the node name."]),
    });
  });

  it("accepts fill-current-estimate template row-copy drafts only for existing estimate targets", () => {
    const templateRowCopyDraft = {
      clientDraftId: "copy-template-row-bedroom-paint",
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
      adjustmentPercentage: -5,
      warnings: ["Review the template row before Apply; it is copied from a reusable template preview."],
      applyEligible: true,
      sourceSnapshot: {
        sourceType: "estimate_template_row",
        sourceTemplateId: "11111111-1111-4111-8111-111111111111",
        sourceTemplateRowId: "99999999-9999-4999-8999-999999999999",
        notSupplierPriced: true,
      },
    };
    const copyDraft = parsePackageBuilderDraft({
      ...validDraft,
      intent: "fill_current_estimate",
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
      treeDraft: [
        { clientDraftId: "existing-root", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
        { clientDraftId: "existing-area-1", kind: "area", name: "Master Bedroom", parentClientDraftId: "existing-root", sortOrder: 0 },
      ],
      rowDraft: [],
      rowUpdateDraft: [],
      rowReplacementDraft: [],
      rowDeleteDraft: [],
      templateRowCopyDraft: [templateRowCopyDraft],
      operations: [
        {
          operationId: "op-copy-template-row-bedroom-paint",
          type: "copy_template_row",
          clientDraftId: "copy-template-row-bedroom-paint",
          applyEligible: true,
        },
      ],
      budgetSummary: {
        ...validDraft.budgetSummary,
        draftSubtotal: 33_500,
        allowanceTotal: 33_500,
        contingencyTotal: 0,
        draftTotal: 33_500,
        variance: -4_966_500,
      },
    });

    expect(copyDraft.templateRowCopyDraft).toEqual([
      expect.objectContaining({
        ...templateRowCopyDraft,
        contingencyPercentage: -5,
        adjustmentPercentage: -5,
      }),
    ]);
    expect(validatePackageBuilderDraft(copyDraft)).toEqual({ valid: true, errors: [] });

    const invalidCreateDraft = parsePackageBuilderDraft({
      ...validDraft,
      templateRowCopyDraft: [templateRowCopyDraft],
      operations: [
        ...validDraft.operations,
        {
          operationId: "op-copy-template-row-bedroom-paint",
          type: "copy_template_row",
          clientDraftId: "copy-template-row-bedroom-paint",
          applyEligible: true,
        },
      ],
    });
    expect(validatePackageBuilderDraft(invalidCreateDraft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Template row copies require a fill-current-estimate target."]),
    });
  });

  it("accepts template-derived reviewed allowance rows while keeping template source rows invalid", () => {
    const draft = parsePackageBuilderDraft({
      ...validDraft,
      rowDraft: [
        {
          ...validDraft.rowDraft[0],
          sourceType: "allowance",
          sourceTemplateId: "11111111-1111-4111-8111-111111111111",
          material: "Template bedroom paint finish",
          sourceSnapshot: {
            sourceType: "estimate_template_row",
            generatedBy: "ai-package-builder",
            notSupplierPriced: true,
            sourceLibraryItemId: null,
          },
        },
      ],
    });

    expect(validatePackageBuilderDraft(draft)).toEqual({ valid: true, errors: [] });
  });

  it("rejects unknown operation types", () => {
    expect(() =>
      parsePackageBuilderDraft({
        ...validDraft,
        operations: [{ operationId: "op-bad", type: "delete_project", applyEligible: false }],
      }),
    ).toThrow("Unsupported package-builder operation type.");
  });

  it("rejects model-supplied workspace and user ids", () => {
    expect(() => parsePackageBuilderRequest({ mode: "draft", message: "Hello", workspace_id: "workspace-1" })).toThrow(
      "Package-builder requests must not include workspace or user identifiers.",
    );
    expect(() => parsePackageBuilderDraft({ ...validDraft, userId: "user-1" })).toThrow(
      "Package-builder requests must not include workspace or user identifiers.",
    );
    expect(() =>
      parsePackageBuilderDraft({
        ...validLibraryComponentDraft,
        componentCreateDraft: [
          {
            ...validLibraryComponentDraft.componentCreateDraft[0],
            workspaceId: "workspace-1",
          },
        ],
      }),
    ).toThrow("Package-builder requests must not include workspace or user identifiers.");
  });

  it("rejects negative quantities and costs", () => {
    expect(() =>
      parsePackageBuilderDraft({
        ...validDraft,
        rowDraft: [{ ...validDraft.rowDraft[0], quantity: -1 }],
      }),
    ).toThrow("Row quantity must be zero or greater.");

    expect(() =>
      parsePackageBuilderDraft({
        ...validDraft,
        rowDraft: [{ ...validDraft.rowDraft[0], unitCost: -1 }],
      }),
    ).toThrow("Row unit cost must be zero or greater.");
  });

  it("requires explicit confirmation for Apply and rejects stale draft hashes", () => {
    const draft = parsePackageBuilderDraft(validDraft);
    const draftHash = buildPackageDraftHash(draft);

    expect(() =>
      parsePackageBuilderApplyRequest({
        mode: "apply",
        draft,
        draftHash,
        draftToken: "server.token",
        confirmation: { confirmed: false },
        idempotencyKey: "idem-1",
      }),
    ).toThrow("Apply requires explicit confirmation.");

    expect(() =>
      parsePackageBuilderApplyRequest({
        mode: "apply",
        draft,
        draftHash: "sha256:stale",
        draftToken: "server.token",
        confirmation: { confirmed: true },
        idempotencyKey: "idem-1",
      }),
    ).toThrow("Draft hash is stale.");

    expect(
      parsePackageBuilderApplyRequest({
        mode: "apply",
        draft,
        draftHash,
        draftToken: "server.token",
        confirmation: { confirmed: true },
        idempotencyKey: "idem-1",
      }),
    ).toMatchObject({ mode: "apply", draftHash, idempotencyKey: "idem-1" });
  });

  it("rejects rows targeting non-Area nodes", () => {
    const draft = parsePackageBuilderDraft({
      ...validDraft,
      rowDraft: [{ ...validDraft.rowDraft[0], targetAreaClientDraftId: "group-house" }],
    });

    expect(validatePackageBuilderDraft(draft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Row row-bedroom-1-bed must target an Area Node."]),
    });
  });

  it("does not let fallback static ids masquerade as writable component rows", () => {
    const draft = parsePackageBuilderDraft({
      ...validDraft,
      rowDraft: [
        {
          ...validDraft.rowDraft[0],
          sourceType: "library_item",
          sourceLibraryItemId: "lib-sofa",
          material: "Static sofa",
        },
      ],
    });

    expect(validatePackageBuilderDraft(draft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Linked row row-bedroom-1-bed must reference a real UUID-backed library item."]),
    });
  });

  it("rejects linked price-option rows without a confirmed price timestamp", () => {
    const draft = parsePackageBuilderDraft({
      ...validDraft,
      rowDraft: [
        {
          ...validDraft.rowDraft[0],
          sourceType: "library_item",
          sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
          priceOptionId: "22222222-2222-4222-8222-222222222222",
          priceOptionUpdatedAt: null,
          sourceSnapshot: { componentVersionNumber: 3 },
          material: "Linked bed",
        },
      ],
    });

    expect(validatePackageBuilderDraft(draft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Linked row row-bedroom-1-bed with a price option must include its confirmed updated timestamp."]),
    });
  });

  it("rejects template row sources until template-row Apply has its own contract", () => {
    const draft = parsePackageBuilderDraft({
      ...validDraft,
      rowDraft: [
        {
          ...validDraft.rowDraft[0],
          sourceType: "template",
          sourceTemplateId: "11111111-1111-4111-8111-111111111111",
          material: "Copied template row",
        },
      ],
    });

    expect(validatePackageBuilderDraft(draft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Template row row-bedroom-1-bed is not supported by package Apply yet."]),
    });
  });

  it("rejects drafts that are not apply-eligible", () => {
    const draft = parsePackageBuilderDraft({
      ...validDraft,
      applyEligibility: { eligible: false, reasons: ["Library price option needs review."] },
    });

    expect(validatePackageBuilderDraft(draft)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Library price option needs review."]),
    });
  });
});
