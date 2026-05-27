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

describe("AI package-builder schemas", () => {
  it("accepts a valid 3-bedroom PHP 5M package request and draft", () => {
    expect(parsePackageBuilderRequest({ mode: "draft", message: "Assemble me a 3 bedroom package, budget is 5 million pesos." })).toMatchObject({
      mode: "draft",
      message: "Assemble me a 3 bedroom package, budget is 5 million pesos.",
    });

    const draft = parsePackageBuilderDraft(validDraft);
    expect(validatePackageBuilderDraft(draft)).toEqual({ valid: true, errors: [] });
    expect(draft.brief).toMatchObject({ bedrooms: 3, targetBudget: 5_000_000, currencyCode: "PHP" });
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
        confirmation: { confirmed: false },
        idempotencyKey: "idem-1",
      }),
    ).toThrow("Apply requires explicit confirmation.");

    expect(() =>
      parsePackageBuilderApplyRequest({
        mode: "apply",
        draft,
        draftHash: "sha256:stale",
        confirmation: { confirmed: true },
        idempotencyKey: "idem-1",
      }),
    ).toThrow("Draft hash is stale.");

    expect(
      parsePackageBuilderApplyRequest({
        mode: "apply",
        draft,
        draftHash,
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
});
