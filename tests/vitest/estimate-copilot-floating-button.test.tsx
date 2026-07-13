import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import {
  AskFlipFooterAssistant,
  EstimateCopilotFloatingButton,
} from "@/components/workshop/EstimateCopilotFloatingButton";
import type { PackageBuilderApplyResult } from "@/lib/ai/package-builder/apply";
import type { PackageBuilderDraft } from "@/lib/ai/package-builder/schemas";

function makePackageDraftResponse() {
  return {
    mode: "draft",
    draftHash: "sha256:draft",
    draftToken: "server.draft.token",
    productionWrite: false,
    serverValidation: { eligible: true, reasons: [] },
    draft: {
      schemaVersion: 1,
      mode: "draft",
      intent: "create_package_project",
      draftId: "draft-1",
      brief: { projectName: "3 Bedroom Package", targetBudget: 5000000, currencyCode: "PHP", bedrooms: 3, floorCount: 1, finishLevel: "standard", missingInputs: ["gross floor area"] },
      projectDraft: { name: "3 Bedroom Package", clientName: null, location: null, projectBudget: 5000000 },
      estimateDraft: { name: "Initial 3 Bedroom Package Estimate", sheetCode: "ES-001" },
      treeDraft: [
        { clientDraftId: "group-house", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
        { clientDraftId: "area-bedroom-1", kind: "area", name: "Bedroom 1", parentClientDraftId: "group-house", sortOrder: 0 },
      ],
      rowDraft: [
        { clientDraftId: "row-1", targetAreaClientDraftId: "area-bedroom-1", sourceType: "allowance", material: "Bedroom 1 allowance", description: "Allowance", supplier: null, quantity: 1, unit: "allowance", unitCost: 100000, miscCost: 0, contingencyPercentage: 0, assumption: "No match.", warnings: ["Review."], applyEligible: true },
      ],
      componentMatches: [],
      templateMatches: [],
      operations: [
        { operationId: "op-project", type: "create_project", applyEligible: true },
        { operationId: "op-estimate", type: "create_estimate", applyEligible: true },
      ],
      budgetSummary: { targetBudget: 5000000, draftSubtotal: 100000, allowanceTotal: 100000, contingencyTotal: 0, draftTotal: 100000, variance: -4900000, currencyCode: "PHP", completeness: "partial" },
      assumptions: ["Budget is a target."],
      warnings: ["Allowances are not supplier-priced rows."],
      applyEligibility: { eligible: true, reasons: [] },
      requiresConfirmation: true,
    },
  };
}

function makeLibraryComponentDraftResponse() {
  return {
    mode: "draft",
    draftHash: "sha256:library-component-draft",
    draftToken: "server.library.component.draft.token",
    productionWrite: false,
    serverValidation: { eligible: true, reasons: [] },
    draft: {
      schemaVersion: 1,
      mode: "draft",
      intent: "create_library_component",
      draftId: "draft-create-library-component",
      target: null,
      brief: { projectName: "Library Component Draft", targetBudget: 18000, currencyCode: "PHP", bedrooms: 0, floorCount: 0, finishLevel: "component", missingInputs: [] },
      projectDraft: { name: "Queen bed frame", clientName: null, location: null, projectBudget: 18000 },
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
          unitCost: 18000,
          miscCost: 0,
          currencyCode: "PHP",
          pricingSource: "Ask Flip draft",
          lifecycleState: "available",
          warnings: ["Review supplier and pricing before Apply."],
          applyEligible: true,
        },
      ],
      componentMatches: [],
      templateMatches: [],
      operations: [
        { operationId: "op-component-queen-bed-frame", type: "create_library_component", clientDraftId: "component-queen-bed-frame", applyEligible: true },
      ],
      budgetSummary: { targetBudget: 18000, draftSubtotal: 18000, allowanceTotal: 0, contingencyTotal: 0, draftTotal: 18000, variance: 0, currencyCode: "PHP", completeness: "review-required" },
      assumptions: ["Component create will add Queen bed frame to the workspace component library."],
      warnings: ["Review supplier and pricing before Apply."],
      applyEligibility: { eligible: true, reasons: [] },
      requiresConfirmation: true,
    },
  };
}

function makeThreeBedroomCondoPackageDraftResponse() {
  const rowDraft = [
    {
      clientDraftId: "row-master-bedroom-queen-bed-frame",
      targetAreaClientDraftId: "area-master-bedroom",
      sourceType: "library_item",
      sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
      material: "Queen bed frame",
      description: "Standard bed frame for condo bedrooms.",
      supplier: "Bedroom Supplier",
      quantity: 1,
      unit: "pc",
      unitCost: 18000,
      miscCost: 0,
      contingencyPercentage: 0,
      assumption: "Matched from scoped library.",
      warnings: [],
      applyEligible: true,
      sourceSnapshot: { sourceType: "library_item", sourceLibraryItemId: "11111111-1111-4111-8111-111111111111", componentVersionNumber: 1 },
    },
    {
      clientDraftId: "row-bedroom-2-queen-bed-frame",
      targetAreaClientDraftId: "area-bedroom-2",
      sourceType: "library_item",
      sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
      material: "Queen bed frame",
      description: "Standard bed frame for condo bedrooms.",
      supplier: "Bedroom Supplier",
      quantity: 1,
      unit: "pc",
      unitCost: 18000,
      miscCost: 0,
      contingencyPercentage: 0,
      assumption: "Matched from scoped library.",
      warnings: [],
      applyEligible: true,
      sourceSnapshot: { sourceType: "library_item", sourceLibraryItemId: "11111111-1111-4111-8111-111111111111", componentVersionNumber: 1 },
    },
    {
      clientDraftId: "row-bedroom-3-queen-bed-frame",
      targetAreaClientDraftId: "area-bedroom-3",
      sourceType: "library_item",
      sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
      material: "Queen bed frame",
      description: "Standard bed frame for condo bedrooms.",
      supplier: "Bedroom Supplier",
      quantity: 1,
      unit: "pc",
      unitCost: 18000,
      miscCost: 0,
      contingencyPercentage: 0,
      assumption: "Matched from scoped library.",
      warnings: [],
      applyEligible: true,
      sourceSnapshot: { sourceType: "library_item", sourceLibraryItemId: "11111111-1111-4111-8111-111111111111", componentVersionNumber: 1 },
    },
    {
      clientDraftId: "row-master-toilet-water-closet",
      targetAreaClientDraftId: "area-master-toilet-bath",
      sourceType: "library_item",
      sourceLibraryItemId: "22222222-2222-4222-8222-222222222222",
      material: "Water closet",
      description: "Floor-mounted toilet fixture for toilet and bath areas.",
      supplier: "Plumbing Supplier",
      quantity: 1,
      unit: "set",
      unitCost: 12500,
      miscCost: 0,
      contingencyPercentage: 0,
      assumption: "Matched from scoped library.",
      warnings: [],
      applyEligible: true,
      sourceSnapshot: { sourceType: "library_item", sourceLibraryItemId: "22222222-2222-4222-8222-222222222222", componentVersionNumber: 1 },
    },
    {
      clientDraftId: "row-common-toilet-water-closet",
      targetAreaClientDraftId: "area-common-toilet-bath",
      sourceType: "library_item",
      sourceLibraryItemId: "22222222-2222-4222-8222-222222222222",
      material: "Water closet",
      description: "Floor-mounted toilet fixture for toilet and bath areas.",
      supplier: "Plumbing Supplier",
      quantity: 1,
      unit: "set",
      unitCost: 12500,
      miscCost: 0,
      contingencyPercentage: 0,
      assumption: "Matched from scoped library.",
      warnings: [],
      applyEligible: true,
      sourceSnapshot: { sourceType: "library_item", sourceLibraryItemId: "22222222-2222-4222-8222-222222222222", componentVersionNumber: 1 },
    },
  ];
  const draftTotal = rowDraft.reduce((sum, row) => sum + row.quantity * row.unitCost + row.miscCost, 0);

  return {
    mode: "draft",
    draftHash: "sha256:three-bedroom-condo-draft",
    draftToken: "server.three-bedroom.condo.draft.token",
    productionWrite: false,
    serverValidation: { eligible: true, reasons: [] },
    draft: {
      schemaVersion: 1,
      mode: "draft",
      intent: "create_package_project",
      draftId: "draft-three-bedroom-condo",
      brief: { projectName: "3 Bedroom Condo Unit", targetBudget: 5000000, currencyCode: "PHP", bedrooms: 3, floorCount: 1, finishLevel: "standard", missingInputs: ["gross floor area"] },
      projectDraft: { name: "3 Bedroom Condo Unit", clientName: null, location: null, projectBudget: 5000000 },
      estimateDraft: { name: "Initial 3 Bedroom Package Estimate", sheetCode: "ES-001" },
      treeDraft: [
        { clientDraftId: "group-house", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
        { clientDraftId: "area-master-bedroom", kind: "area", name: "Master Bedroom", parentClientDraftId: "group-house", sortOrder: 0 },
        { clientDraftId: "area-bedroom-2", kind: "area", name: "Bedroom 2", parentClientDraftId: "group-house", sortOrder: 1 },
        { clientDraftId: "area-bedroom-3", kind: "area", name: "Bedroom 3", parentClientDraftId: "group-house", sortOrder: 2 },
        { clientDraftId: "area-master-toilet-bath", kind: "area", name: "Master Toilet & Bath", parentClientDraftId: "group-house", sortOrder: 3 },
        { clientDraftId: "area-common-toilet-bath", kind: "area", name: "Common Toilet & Bath", parentClientDraftId: "group-house", sortOrder: 4 },
      ],
      rowDraft,
      componentMatches: [],
      templateMatches: [],
      operations: [
        { operationId: "op-project", type: "create_project", applyEligible: true },
        { operationId: "op-estimate", type: "create_estimate", applyEligible: true },
        ...rowDraft.map((row) => ({
          operationId: `op-${row.clientDraftId}`,
          type: "insert_component_row",
          clientDraftId: row.clientDraftId,
          applyEligible: true,
        })),
      ],
      budgetSummary: { targetBudget: 5000000, draftSubtotal: draftTotal, allowanceTotal: 0, contingencyTotal: 0, draftTotal, variance: draftTotal - 5000000, currencyCode: "PHP", completeness: "partial" },
      assumptions: ["Scoped library components matched bedroom and toilet fixture needs."],
      warnings: ["Review quantities and room scope before Apply."],
      applyEligibility: { eligible: true, reasons: [] },
      requiresConfirmation: true,
    },
  };
}

function makeRefinedPackageDraftResponse() {
  const response = makePackageDraftResponse();
  return {
    ...response,
    draftHash: "sha256:refined-draft",
    draftToken: "server.refined.draft.token",
    draft: {
      ...response.draft,
      draftId: "draft-refined-1",
      rowDraft: [
        {
          ...response.draft.rowDraft[0],
          unitCost: 90_000,
          warnings: ["Review.", "Reduced review allowance by 10% during refinement."],
        },
      ],
      budgetSummary: {
        ...response.draft.budgetSummary,
        draftSubtotal: 90_000,
        allowanceTotal: 90_000,
        draftTotal: 90_000,
        variance: -4_910_000,
      },
      assumptions: [
        ...response.draft.assumptions,
        "Refined from previous package draft: Make it cheaper before I apply it.",
      ],
    },
  };
}

function makeRowUpdateDraftResponse() {
  return {
    mode: "draft",
    draftHash: "sha256:update-draft",
    draftToken: "server.update.draft.token",
    productionWrite: false,
    serverValidation: { eligible: true, reasons: [] },
    draft: {
      schemaVersion: 1,
      mode: "draft",
      intent: "fill_current_estimate",
      draftId: "draft-update-1",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        nodeIdsByClientDraftId: {},
        areaNodeIdsByClientDraftId: {},
      },
      brief: { projectName: "Lewis Residence", targetBudget: 5000000, currencyCode: "PHP", bedrooms: 3, floorCount: 1, finishLevel: "standard", missingInputs: [] },
      projectDraft: { name: "Lewis Residence", clientName: null, location: null, projectBudget: 5000000 },
      estimateDraft: { name: "Initial Estimate", sheetCode: "ES-001" },
      treeDraft: [],
      rowDraft: [],
      rowUpdateDraft: [
        {
          clientDraftId: "update-row-existing-bed",
          targetRowId: "eeeeeeee-5555-4eee-8eee-eeeeeeee5555",
          expectedRowRevision: 3,
          patch: { quantity: 2, miscCost: 1500, contingencyPercentage: 12 },
          warnings: ["Review the row change before Apply; this updates an existing estimate row."],
          applyEligible: true,
        },
      ],
      componentMatches: [],
      templateMatches: [],
      operations: [
        { operationId: "op-update-update-row-existing-bed", type: "update_existing_row", clientDraftId: "update-row-existing-bed", applyEligible: true },
      ],
      budgetSummary: { targetBudget: 5000000, draftSubtotal: 0, allowanceTotal: 0, contingencyTotal: 0, draftTotal: 0, variance: -5000000, currencyCode: "PHP", completeness: "partial" },
      assumptions: ["This draft targets the current estimate."],
      warnings: ["Review the row change before Apply."],
      applyEligibility: { eligible: true, reasons: [] },
      requiresConfirmation: true,
    },
  };
}

function makeRowReplacementDraftResponse() {
  return {
    mode: "draft",
    draftHash: "sha256:replace-draft",
    draftToken: "server.replace.draft.token",
    productionWrite: false,
    serverValidation: { eligible: true, reasons: [] },
    draft: {
      schemaVersion: 1,
      mode: "draft",
      intent: "fill_current_estimate",
      draftId: "draft-replace-1",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        nodeIdsByClientDraftId: {},
        areaNodeIdsByClientDraftId: {},
      },
      brief: { projectName: "Lewis Residence", targetBudget: 5000000, currencyCode: "PHP", bedrooms: 3, floorCount: 1, finishLevel: "standard", missingInputs: [] },
      projectDraft: { name: "Lewis Residence", clientName: null, location: null, projectBudget: 5000000 },
      estimateDraft: { name: "Initial Estimate", sheetCode: "ES-001" },
      treeDraft: [],
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
          unitCost: 18000,
          miscCost: 0,
          contingencyPercentage: 0,
          category: "Furniture",
          categoryPath: ["Objects", "Furniture"],
          supplierId: null,
          brand: null,
          currentVersionNumber: 1,
          warnings: ["Review the replacement before Apply."],
          applyEligible: true,
          sourceSnapshot: { sourceType: "library_item", sourceLibraryItemId: "11111111-1111-4111-8111-111111111111", componentVersionNumber: 1 },
        },
      ],
      componentMatches: [],
      templateMatches: [],
      operations: [
        { operationId: "op-replace-row-existing-bed-with-queen-bed-frame", type: "replace_existing_row", clientDraftId: "replace-row-existing-bed-with-queen-bed-frame", applyEligible: true },
      ],
      budgetSummary: { targetBudget: 5000000, draftSubtotal: 18000, allowanceTotal: 0, contingencyTotal: 0, draftTotal: 18000, variance: -4982000, currencyCode: "PHP", completeness: "partial" },
      assumptions: ["This draft targets the current estimate."],
      warnings: ["Review the row replacement before Apply."],
      applyEligibility: { eligible: true, reasons: [] },
      requiresConfirmation: true,
    },
  };
}

function makeRowDeleteDraftResponse() {
  return {
    mode: "draft",
    draftHash: "sha256:delete-draft",
    draftToken: "server.delete.draft.token",
    productionWrite: false,
    serverValidation: { eligible: true, reasons: [] },
    draft: {
      schemaVersion: 1,
      mode: "draft",
      intent: "fill_current_estimate",
      draftId: "draft-delete-1",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        nodeIdsByClientDraftId: {},
        areaNodeIdsByClientDraftId: {},
      },
      brief: { projectName: "Lewis Residence", targetBudget: 5000000, currencyCode: "PHP", bedrooms: 3, floorCount: 1, finishLevel: "standard", missingInputs: [] },
      projectDraft: { name: "Lewis Residence", clientName: null, location: null, projectBudget: 5000000 },
      estimateDraft: { name: "Initial Estimate", sheetCode: "ES-001" },
      treeDraft: [],
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
      componentMatches: [],
      templateMatches: [],
      operations: [
        { operationId: "op-delete-row-existing-bed", type: "delete_existing_row", clientDraftId: "delete-row-existing-bed", applyEligible: true },
      ],
      budgetSummary: { targetBudget: 5000000, draftSubtotal: 0, allowanceTotal: 0, contingencyTotal: 0, draftTotal: 0, variance: -5000000, currencyCode: "PHP", completeness: "partial" },
      assumptions: ["Row delete will remove existing bed from the current estimate."],
      warnings: ["Review the row delete before Apply."],
      applyEligibility: { eligible: true, reasons: [] },
      requiresConfirmation: true,
    },
  };
}

function makeNodeRenameDraftResponse() {
  return {
    mode: "draft",
    draftHash: "sha256:node-rename-draft",
    draftToken: "server.node.rename.draft.token",
    productionWrite: false,
    serverValidation: { eligible: true, reasons: [] },
    draft: {
      schemaVersion: 1,
      mode: "draft",
      intent: "fill_current_estimate",
      draftId: "draft-node-rename-1",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        nodeIdsByClientDraftId: { "existing-area-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444" },
        areaNodeIdsByClientDraftId: { "existing-area-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444" },
      },
      brief: { projectName: "Lewis Residence", targetBudget: 5000000, currencyCode: "PHP", bedrooms: 3, floorCount: 1, finishLevel: "standard", missingInputs: [] },
      projectDraft: { name: "Lewis Residence", clientName: null, location: null, projectBudget: 5000000 },
      estimateDraft: { name: "Initial Estimate", sheetCode: "ES-001" },
      treeDraft: [{ clientDraftId: "existing-area-1", kind: "area", name: "Master Bedroom", parentClientDraftId: null, sortOrder: 0 }],
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
      componentMatches: [],
      templateMatches: [],
      operations: [
        { operationId: "op-rename-node-master-bedroom", type: "rename_estimate_node", clientDraftId: "rename-node-master-bedroom", applyEligible: true },
      ],
      budgetSummary: { targetBudget: 5000000, draftSubtotal: 0, allowanceTotal: 0, contingencyTotal: 0, draftTotal: 0, variance: -5000000, currencyCode: "PHP", completeness: "partial" },
      assumptions: ["Node rename will change Master Bedroom to Primary Bedroom."],
      warnings: ["Review the node rename before Apply."],
      applyEligibility: { eligible: true, reasons: [] },
      requiresConfirmation: true,
    },
  };
}

function makeTemplateRowCopyDraftResponse() {
  return {
    mode: "draft",
    draftHash: "sha256:template-row-copy-draft",
    draftToken: "server.template.row.copy.draft.token",
    productionWrite: false,
    serverValidation: { eligible: true, reasons: [] },
    draft: {
      schemaVersion: 1,
      mode: "draft",
      intent: "fill_current_estimate",
      draftId: "draft-template-row-copy-1",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        nodeIdsByClientDraftId: { "existing-area-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444" },
        areaNodeIdsByClientDraftId: { "existing-area-1": "dddddddd-4444-4ddd-8ddd-dddddddd4444" },
      },
      brief: { projectName: "Lewis Residence", targetBudget: 5000000, currencyCode: "PHP", bedrooms: 3, floorCount: 1, finishLevel: "standard", missingInputs: [] },
      projectDraft: { name: "Lewis Residence", clientName: null, location: null, projectBudget: 5000000 },
      estimateDraft: { name: "Initial Estimate", sheetCode: "ES-001" },
      treeDraft: [{ clientDraftId: "existing-area-1", kind: "area", name: "Master Bedroom", parentClientDraftId: null, sortOrder: 0 }],
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
          unitCost: 30000,
          miscCost: 2000,
          contingencyPercentage: 5,
          warnings: ["Review the template row before Apply."],
          applyEligible: true,
        },
      ],
      componentMatches: [],
      templateMatches: [],
      operations: [
        { operationId: "op-copy-template-row-template-bedroom-paint-finish", type: "copy_template_row", clientDraftId: "copy-template-row-template-bedroom-paint-finish", applyEligible: true },
      ],
      budgetSummary: { targetBudget: 5000000, draftSubtotal: 33500, allowanceTotal: 33500, contingencyTotal: 0, draftTotal: 33500, variance: -4966500, currencyCode: "PHP", completeness: "partial" },
      assumptions: ["Template row copy will add a reviewed template row to the current estimate."],
      warnings: ["Review the template row copy before Apply."],
      applyEligibility: { eligible: true, reasons: [] },
      requiresConfirmation: true,
    },
  };
}

function makeTemplateInsertDraftResponse() {
  return {
    mode: "draft",
    draftHash: "sha256:template-draft",
    draftToken: "server.template.draft.token",
    productionWrite: false,
    serverValidation: { eligible: true, reasons: [] },
    draft: {
      schemaVersion: 1,
      mode: "draft",
      intent: "fill_current_estimate",
      draftId: "draft-template-1",
      target: {
        projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
        estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
        selectedNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        nodeIdsByClientDraftId: {
          "existing-estimate-root": "cccccccc-3333-4ccc-8ccc-cccccccc3333",
        },
        areaNodeIdsByClientDraftId: {},
      },
      brief: { projectName: "Lewis Residence", targetBudget: 5000000, currencyCode: "PHP", bedrooms: 3, floorCount: 1, finishLevel: "standard", missingInputs: [] },
      projectDraft: { name: "Lewis Residence", clientName: null, location: null, projectBudget: 5000000 },
      estimateDraft: { name: "Initial Estimate", sheetCode: "ES-001" },
      treeDraft: [
        { clientDraftId: "existing-estimate-root", kind: "group", name: "House", parentClientDraftId: null, sortOrder: 0 },
      ],
      rowDraft: [],
      rowUpdateDraft: [],
      templateInsertDraft: [
        {
          clientDraftId: "insert-template-3-bedroom-condo-starter",
          sourceTemplateId: "11111111-1111-4111-8111-111111111111",
          sourceTemplateName: "3 Bedroom Condo Starter",
          targetParentClientDraftId: "existing-estimate-root",
          expectedNodeCount: 4,
          expectedRowCount: 8,
          previewTotal: 125000,
          warnings: ["Review the template copy before Apply."],
          applyEligible: true,
        },
      ],
      componentMatches: [],
      templateMatches: [],
      operations: [
        { operationId: "op-template-insert-template-3-bedroom-condo-starter", type: "insert_template", clientDraftId: "insert-template-3-bedroom-condo-starter", applyEligible: true },
      ],
      budgetSummary: { targetBudget: 5000000, draftSubtotal: 125000, allowanceTotal: 125000, contingencyTotal: 0, draftTotal: 125000, variance: -4875000, currencyCode: "PHP", completeness: "partial" },
      assumptions: ["Template insert will copy 3 Bedroom Condo Starter into the current estimate root."],
      warnings: ["Review the template copy before Apply."],
      applyEligibility: { eligible: true, reasons: [] },
      requiresConfirmation: true,
    },
  };
}

function makePackageApplyResponse(body: Record<string, unknown>, overrides: Partial<PackageBuilderApplyResult> = {}) {
  return {
    mode: "apply",
    result: {
      projectId: "project-1",
      estimateId: "estimate-1",
      selectedNodeId: "area-1",
      createdNodeIds: { "area-bedroom-1": "area-1" },
      insertedRowIds: ["row-1"],
      updatedRowIds: [],
      total: 100000,
      warnings: [],
      recoveryStatus: "completed",
      idempotencyKey: String(body.idempotencyKey ?? ""),
      idempotentReplay: false,
      auditRunId: "run-1",
      ...overrides,
    },
  };
}

describe("AskFlipFooterAssistant", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a footer-mounted two-column Ask-only chat panel", async () => {
    const user = userEvent.setup();
    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Kitchen" />);

    expect(document.querySelector("[data-ask-flip-root='true']")).not.toHaveClass("fixed");
    expect(screen.getByRole("button", { name: "Open Ask Flip" })).not.toHaveClass("fixed");

    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));

    expect(screen.getByRole("region", { name: "Ask Flip" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Ask Flip chat sessions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Ask Flip" })).not.toHaveClass("fixed");
    expect(screen.getByRole("heading", { name: "Ask Flip" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask Flip")).toBeInTheDocument();
  });

  it("sends the prompt and renders the assistant answer", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "The estimate needs quantities before pricing is reliable.", provider: "deepseek", model: "deepseek-v4-flash" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Kitchen" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Summarize this estimate");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/ask",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(await screen.findByText("The estimate needs quantities before pricing is reliable.")).toBeInTheDocument();
  });

  it("keeps project-count questions on the read-only Ask route", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "You have 3 projects.", provider: "deepseek", model: "deepseek-v4-flash" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Kitchen" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "How many projects do I have?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/ask",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("How many projects do I have?"),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith("/api/ai/package-builder", expect.anything());
    expect(await screen.findByText("You have 3 projects.")).toBeInTheDocument();
  });

  it("routes natural project and estimate creation requests to package-builder draft mode", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Draft route reached." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Kitchen" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/package-builder",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"mode":"draft"'),
        }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/ai/ask", expect.anything());
    expect(await screen.findByText("Draft route reached.")).toBeInTheDocument();
  });

  it("previews and applies component-library creation drafts", async () => {
    const user = userEvent.setup();
    const prompt = "Add a component to my library called Queen bed frame, category Furniture, unit set, cost 18000 pesos from Bedroom Supplier.";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        expect(body.message).toBe(prompt);
        return new Response(
          JSON.stringify(makeLibraryComponentDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === "/api/ai/package-builder" && body.mode === "apply") {
        expect(body).toMatchObject({
          mode: "apply",
          draftHash: "sha256:library-component-draft",
          draftToken: "server.library.component.draft.token",
          confirmation: { confirmed: true },
        });
        expect(body.draft).toMatchObject({
          intent: "create_library_component",
          componentCreateDraft: [
            expect.objectContaining({ name: "Queen bed frame", unitCost: 18000 }),
          ],
        });
        return new Response(
          JSON.stringify(makePackageApplyResponse(body, {
            projectId: null,
            estimateId: null,
            selectedNodeId: null,
            createdNodeIds: {},
            insertedRowIds: [],
            createdComponentIds: ["aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111"],
            createdComponentCount: 1,
            total: 18000,
          })),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ error: "Unexpected request" }), { status: 400 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), prompt);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a library component for review.")).toBeInTheDocument();
    expect(screen.getByText("Library components")).toBeInTheDocument();
    expect(screen.getAllByText("Queen bed frame").length).toBeGreaterThan(0);
    expect(screen.getByText(/0 areas · 1 component create/)).toBeInTheDocument();

    const applyButton = screen.getByRole("button", { name: "Apply component" });
    expect(applyButton).toBeDisabled();
    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    expect(applyButton).toBeEnabled();
    await user.click(applyButton);

    expect(await screen.findByText("Created 1 library component")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open library" })).toHaveAttribute("href", "/workshop/library");
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/ai/ask")).toBe(false);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/ai/package-builder")).toHaveLength(2);
  });

  it("previews and applies the exact natural 3-bedroom condo project request", async () => {
    const user = userEvent.setup();
    const prompt = "Make a project for me with an estimate sheet which is for a 3 bedroom condo unit.";
    const draftResponse = makeThreeBedroomCondoPackageDraftResponse();
    const insertedRowIds = ["row-bed-1", "row-bed-2", "row-bed-3", "row-wc-1", "row-wc-2"];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        expect(body.message).toBe(prompt);
        return new Response(
          JSON.stringify(draftResponse),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === "/api/ai/package-builder" && body.mode === "apply") {
        const submittedDraft = body.draft as PackageBuilderDraft;
        const bedroomAreaIds = new Set(
          submittedDraft.treeDraft
            .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("bedroom"))
            .map((node) => node.clientDraftId),
        );
        const toiletAreaIds = new Set(
          submittedDraft.treeDraft
            .filter((node) => node.kind === "area" && node.name.toLowerCase().includes("toilet"))
            .map((node) => node.clientDraftId),
        );

        expect(body).toMatchObject({
          mode: "apply",
          draftHash: "sha256:three-bedroom-condo-draft",
          draftToken: "server.three-bedroom.condo.draft.token",
          confirmation: { confirmed: true },
        });
        expect(String(body.idempotencyKey)).toMatch(/^ask-flip-apply-/);
        expect(submittedDraft.projectDraft.name).toBe("3 Bedroom Condo Unit");
        expect(submittedDraft.rowDraft.filter((row) =>
          bedroomAreaIds.has(row.targetAreaClientDraftId) && row.material === "Queen bed frame"
        )).toHaveLength(3);
        expect(submittedDraft.rowDraft.filter((row) =>
          toiletAreaIds.has(row.targetAreaClientDraftId) && row.material === "Water closet"
        )).toHaveLength(2);

        return new Response(
          JSON.stringify(makePackageApplyResponse(body, {
            projectId: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111",
            estimateId: "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbb2222",
            selectedNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
            createdNodeIds: { "area-master-bedroom": "cccccccc-3333-4ccc-8ccc-cccccccc3333" },
            insertedRowIds,
            updatedRowIds: [],
            total: draftResponse.draft.budgetSummary.draftTotal,
          })),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ error: "Unexpected request" }), { status: 400 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<EstimateCopilotFloatingButton projectName="Lewis Residence" estimateName="Initial Estimate" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), prompt);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    expect(screen.getByText("3 Bedroom Condo Unit")).toBeInTheDocument();
    expect(screen.getByText(/5 areas · 5 row changes/)).toBeInTheDocument();
    expect(screen.getAllByText("Queen bed frame").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Water closet").length).toBeGreaterThan(0);

    const applyButton = screen.getByRole("button", { name: "Apply package" });
    expect(applyButton).toBeDisabled();
    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    expect(applyButton).toBeEnabled();
    await user.click(applyButton);

    expect(await screen.findByText(/Applied project aaaaaaaa.*5 rows/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute("href", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/cccccccc-3333-4ccc-8ccc-cccccccc3333");
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/ai/ask")).toBe(false);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/ai/package-builder")).toHaveLength(2);
  });

  it("routes fill-current-estimate requests to package-builder only from a project estimate route", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Draft route reached." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Master Bedroom" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Fill this estimate with beds and water closets.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/package-builder",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"selectedNodeId":"dddddddd-4444-4ddd-8ddd-dddddddd4444"'),
        }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/ai/ask", expect.anything());
    expect(await screen.findByText("Draft route reached.")).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });

  it("includes the active estimate tab id in current-route package-builder requests", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Draft route reached." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <>
        <div data-estimate-tab-strip>
          <button type="button" role="tab" aria-selected="true" data-estimate-tab-id="ffffffff-ffff-4fff-8fff-ffffffffffff">Active tab</button>
        </div>
        <AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Master Bedroom" />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Fill this estimate with beds and water closets.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/package-builder",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"activeTabId":"ffffffff-ffff-4fff-8fff-ffffffffffff"'),
        }),
      );
    });
    window.history.pushState({}, "", "/");
  });

  it("routes current estimate row update requests to package-builder only from a project estimate route", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Draft route reached." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Master Bedroom" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Change the existing bed quantity to 2.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/package-builder",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"selectedNodeId":"dddddddd-4444-4ddd-8ddd-dddddddd4444"'),
        }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/ai/ask", expect.anything());
    expect(await screen.findByText("Draft route reached.")).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });

  it("routes current estimate row replacement requests to package-builder only from a project estimate route", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Draft route reached." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Master Bedroom" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Replace the existing bed row with the Queen bed frame from the library.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/package-builder",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"selectedNodeId":"dddddddd-4444-4ddd-8ddd-dddddddd4444"'),
        }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/ai/ask", expect.anything());
    expect(await screen.findByText("Draft route reached.")).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });

  it("routes current estimate row delete requests to package-builder only from a project estimate route", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Draft route reached." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Master Bedroom" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Delete the existing bed row from this estimate.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/package-builder",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"selectedNodeId":"dddddddd-4444-4ddd-8ddd-dddddddd4444"'),
        }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/ai/ask", expect.anything());
    expect(await screen.findByText("Draft route reached.")).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });

  it("routes current estimate node rename requests to package-builder only from a project estimate route", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Draft route reached." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Master Bedroom" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Rename Master Bedroom to Primary Bedroom.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/package-builder",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"selectedNodeId":"dddddddd-4444-4ddd-8ddd-dddddddd4444"'),
        }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/ai/ask", expect.anything());
    expect(await screen.findByText("Draft route reached.")).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });

  it("routes current estimate template row-copy requests to package-builder only from a project estimate route", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Draft route reached." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="Master Bedroom" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Copy the Template bedroom paint finish row from the condo starter template into this estimate.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/package-builder",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"selectedNodeId":"dddddddd-4444-4ddd-8ddd-dddddddd4444"'),
        }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/ai/ask", expect.anything());
    expect(await screen.findByText("Draft route reached.")).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });

  it("routes current estimate template-insert requests to package-builder only from a project estimate route", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Draft route reached." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" selectedNodeName="House" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Insert the 3 Bedroom Condo Starter template into this estimate.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/package-builder",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"selectedNodeId":"dddddddd-4444-4ddd-8ddd-dddddddd4444"'),
        }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/ai/ask", expect.anything());
    expect(await screen.findByText("Draft route reached.")).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });

  it("renders a safe error when the request fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "AI provider is not configured." }), { status: 503 })));

    render(<AskFlipFooterAssistant projectName="Lewis Residence" estimateName="Initial Estimate" />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Hello");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("AI provider is not configured.");
    });
    expect(screen.getAllByText("Hello").length).toBeGreaterThan(0);
  });

  it("keeps multiple chat sessions local to the footer panel", async () => {
    const user = userEvent.setup();
    render(<AskFlipFooterAssistant />);

    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.click(screen.getByRole("button", { name: "Start new Ask Flip chat" }));

    expect(screen.getByRole("button", { name: /New chat\s*No questions yet/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Current page\s*No questions yet/i })).toBeInTheDocument();
  });

  it("renders a package draft preview and requires confirmation before Apply", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makePackageDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(makePackageApplyResponse(body)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Assemble me a 3 bedroom package, budget is 5 million pesos.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    expect(screen.getByText("3 Bedroom Package")).toBeInTheDocument();
    const applyButton = screen.getByRole("button", { name: "Apply package" });
    expect(applyButton).toBeDisabled();

    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    expect(applyButton).toBeEnabled();
    await user.click(applyButton);

    expect(await screen.findByText(/Applied project project-/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute("href", "/workshop/projects/project-1/estimates/area-1");
    expect(fetchMock).toHaveBeenCalledWith("/api/ai/package-builder", expect.objectContaining({ method: "POST" }));
  });

  it("records rejected package draft feedback and closes that preview", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makePackageDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === "/api/ai/package-builder" && body.mode === "feedback") {
        return new Response(
          JSON.stringify({ mode: "feedback", decision: "rejected", productionWrite: false }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ error: "Unexpected request" }), { status: 400 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Assemble me a 3 bedroom package, budget is 5 million pesos.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    const rejectButton = screen.getByRole("button", { name: "Reject draft" });
    await user.click(rejectButton);

    expect(await screen.findByText("Draft rejected. Ask Flip will not apply this preview.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rejected" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply package" })).not.toBeInTheDocument();
    expect(screen.queryByText("3 Bedroom Package")).not.toBeInTheDocument();
    const feedbackBody = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body ?? "{}"));
    expect(feedbackBody).toMatchObject({
      mode: "feedback",
      decision: "rejected",
      draftHash: "sha256:draft",
      draftToken: "server.draft.token",
    });
  });

  it("sends package follow-up prompts as refine requests and disables the stale preview", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makePackageDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === "/api/ai/package-builder" && body.mode === "refine") {
        return new Response(
          JSON.stringify(makeRefinedPackageDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(makePackageApplyResponse(body)),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Assemble me a 3 bedroom package, budget is 5 million pesos.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    expect(screen.getByRole("button", { name: "Apply package" })).toBeEnabled();

    await user.type(screen.getByPlaceholderText("Ask Flip"), "Make it cheaper before I apply it.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await screen.findByText("A newer refined draft replaced this preview.");
    const packageBodies = fetchMock.mock.calls
      .filter(([url]) => url === "/api/ai/package-builder")
      .map(([, init]) => JSON.parse(String(init?.body ?? "{}")));
    expect(packageBodies[1]).toMatchObject({
      mode: "refine",
      message: "Make it cheaper before I apply it.",
      baseDraftHash: "sha256:draft",
      baseDraftToken: "server.draft.token",
    });
    expect(packageBodies[1].baseDraft).toMatchObject({ draftId: "draft-1" });
    expect(screen.getAllByText(/₱90,000/).length).toBeGreaterThan(0);

    const confirmationChecks = screen.getAllByLabelText("I reviewed this draft and approve Apply") as HTMLInputElement[];
    expect(confirmationChecks[0]).toBeDisabled();
    await user.click(confirmationChecks[confirmationChecks.length - 1]);
    const applyButtons = screen.getAllByRole("button", { name: "Apply package" });
    expect(applyButtons[0]).toBeDisabled();
    expect(applyButtons[applyButtons.length - 1]).toBeEnabled();
    await user.click(applyButtons[applyButtons.length - 1]);

    await screen.findByText(/Applied project project-/);
    const applyBody = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body ?? "{}"));
    expect(applyBody).toMatchObject({
      mode: "apply",
      draftHash: "sha256:refined-draft",
      draftToken: "server.refined.draft.token",
      confirmation: { confirmed: true },
    });
  });

  it("sends the pending package draft back for revision before Apply", async () => {
    const user = userEvent.setup();
    const revisedDraftResponse = makePackageDraftResponse();
    revisedDraftResponse.draftHash = "sha256:revised-draft";
    revisedDraftResponse.draftToken = "server.revised.draft.token";
    revisedDraftResponse.draft.draftId = "draft-2";
    revisedDraftResponse.draft.rowDraft = [
      ...revisedDraftResponse.draft.rowDraft,
      {
        clientDraftId: "row-area-living-media-console",
        targetAreaClientDraftId: "area-bedroom-1",
        sourceType: "library_item",
        sourceLibraryItemId: "88888888-8888-4888-8888-888888888888",
        material: "Living media console",
        description: "TV wall console.",
        supplier: "Living Supplier",
        quantity: 1,
        unit: "pc",
        unitCost: 35000,
        miscCost: 2000,
        contingencyPercentage: 0,
        assumption: "Matched from scoped library.",
        warnings: [],
        applyEligible: true,
      },
    ];
    revisedDraftResponse.draft.operations = [
      ...revisedDraftResponse.draft.operations,
      { operationId: "op-row-area-living-media-console", type: "insert_component_row", clientDraftId: "row-area-living-media-console", applyEligible: true },
    ];
    revisedDraftResponse.draft.budgetSummary.draftTotal = 137000;
    revisedDraftResponse.draft.budgetSummary.variance = -4863000;

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft" && body.baseDraft) {
        return new Response(
          JSON.stringify(revisedDraftResponse),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makePackageDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ message: "read-only" }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Assemble me a 3 bedroom package, budget is 5 million pesos.");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("3 Bedroom Package")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Ask Flip"), "Also add a media console to the Living area.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const revisionBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? "{}"));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/ai/package-builder");
    expect(revisionBody).toMatchObject({
      mode: "draft",
      message: "Also add a media console to the Living area.",
      baseDraftHash: "sha256:draft",
      baseDraftToken: "server.draft.token",
      baseDraft: expect.objectContaining({ draftId: "draft-1" }),
    });
    expect(await screen.findByText("Living media console")).toBeInTheDocument();
  });

  it("links to the project estimates list after Apply when no selected node is returned", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makePackageDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(makePackageApplyResponse(body, { selectedNodeId: null })),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Assemble me a 3 bedroom package, budget is 5 million pesos.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    await user.click(screen.getByRole("button", { name: "Apply package" }));

    expect(await screen.findByText(/Applied project project-/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute("href", "/workshop/projects/project-1/estimates");
  });

  it("renders and applies current-estimate row-update drafts", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makeRowUpdateDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(makePackageApplyResponse(body, {
          insertedRowIds: [],
          updatedRowIds: ["eeeeeeee-5555-4eee-8eee-eeeeeeee5555"],
          selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        })),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Change the existing bed quantity to 2.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    expect(screen.getByText(/1 row change/)).toBeInTheDocument();
    expect(screen.getByText(/Qty 2/)).toBeInTheDocument();
    expect(screen.getByText(/Misc/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    await user.click(screen.getByRole("button", { name: "Apply package" }));

    expect(await screen.findByText(/Applied project project-.*1 update/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute("href", "/workshop/projects/project-1/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    window.history.pushState({}, "", "/");
  });

  it("renders and applies current-estimate node-rename drafts", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makeNodeRenameDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(makePackageApplyResponse(body, {
          insertedRowIds: [],
          renamedNodeIds: ["dddddddd-4444-4ddd-8ddd-dddddddd4444"],
          selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        })),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Rename Master Bedroom to Primary Bedroom.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    expect(screen.getByText(/1 node rename/)).toBeInTheDocument();
    expect(screen.getAllByText("Master Bedroom").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Primary Bedroom").length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    await user.click(screen.getByRole("button", { name: "Apply rename" }));

    expect(await screen.findByText(/Applied project project-.*1 node rename/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute("href", "/workshop/projects/project-1/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    window.history.pushState({}, "", "/");
  });

  it("renders and applies current-estimate row-replacement drafts", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makeRowReplacementDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(makePackageApplyResponse(body, {
          insertedRowIds: [],
          updatedRowIds: [],
          replacedRowIds: ["eeeeeeee-5555-4eee-8eee-eeeeeeee5555"],
          selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        })),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Replace the existing bed row with the Queen bed frame from the library.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    expect(screen.getByText(/1 row change/)).toBeInTheDocument();
    expect(screen.getByText("Queen bed frame")).toBeInTheDocument();
    expect(screen.getByText(/Replace existing bed/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    await user.click(screen.getByRole("button", { name: "Apply package" }));

    expect(await screen.findByText(/Applied project project-.*1 replacement/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute("href", "/workshop/projects/project-1/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    window.history.pushState({}, "", "/");
  });

  it("renders and applies current-estimate row-delete drafts", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makeRowDeleteDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(makePackageApplyResponse(body, {
          insertedRowIds: [],
          updatedRowIds: [],
          replacedRowIds: [],
          deletedRowIds: ["eeeeeeee-5555-4eee-8eee-eeeeeeee5555"],
          selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        })),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Delete the existing bed row from this estimate.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    expect(screen.getByText(/1 row change/)).toBeInTheDocument();
    expect(screen.getByText(/Delete existing bed/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    await user.click(screen.getByRole("button", { name: "Apply package" }));

    expect(await screen.findByText(/Applied project project-.*1 delete/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute("href", "/workshop/projects/project-1/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    window.history.pushState({}, "", "/");
  });

  it("renders and applies current-estimate template row-copy drafts", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makeTemplateRowCopyDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(makePackageApplyResponse(body, {
          insertedRowIds: ["77777777-7777-4777-8777-777777777777"],
          updatedRowIds: [],
          replacedRowIds: [],
          deletedRowIds: [],
          selectedNodeId: "dddddddd-4444-4ddd-8ddd-dddddddd4444",
        })),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Copy the Template bedroom paint finish row from the condo starter template into this estimate.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    expect(screen.getByText(/1 row change/)).toBeInTheDocument();
    expect(screen.getByText("Template bedroom paint finish")).toBeInTheDocument();
    expect(screen.getByText(/3 Bedroom Condo Starter/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    await user.click(screen.getByRole("button", { name: "Apply package" }));

    expect(await screen.findByText(/Applied project project-.*1 row/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute("href", "/workshop/projects/project-1/estimates/dddddddd-4444-4ddd-8ddd-dddddddd4444");
    window.history.pushState({}, "", "/");
  });

  it("renders and applies current-estimate template-insert drafts", async () => {
    window.history.pushState({}, "", "/workshop/projects/aaaaaaaa-1111-4aaa-8aaa-aaaaaaaa1111/estimates/cccccccc-3333-4ccc-8ccc-cccccccc3333");
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (url === "/api/ai/package-builder" && body.mode === "draft") {
        return new Response(
          JSON.stringify(makeTemplateInsertDraftResponse()),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(makePackageApplyResponse(body, {
          insertedRowIds: [],
          updatedRowIds: [],
          selectedNodeId: "cccccccc-3333-4ccc-8ccc-cccccccc3333",
          insertedTemplateNodeCount: 4,
          insertedTemplateRowCount: 8,
          insertedTemplateRootNodeIds: ["ffffffff-6666-4fff-8fff-ffffffff6666"],
        })),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AskFlipFooterAssistant />);
    await user.click(screen.getByRole("button", { name: "Open Ask Flip" }));
    await user.type(screen.getByPlaceholderText("Ask Flip"), "Insert the 3 Bedroom Condo Starter template into this estimate.");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("I drafted a package for review.")).toBeInTheDocument();
    expect(screen.getByText(/8 row changes/)).toBeInTheDocument();
    expect(screen.getByText("3 Bedroom Condo Starter")).toBeInTheDocument();
    expect(screen.getByText(/4 nodes · 8 rows/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("I reviewed this draft and approve Apply"));
    await user.click(screen.getByRole("button", { name: "Apply package" }));

    expect(await screen.findByText(/Applied project project-.*8 template rows/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open estimate" })).toHaveAttribute("href", "/workshop/projects/project-1/estimates/cccccccc-3333-4ccc-8ccc-cccccccc3333");
    window.history.pushState({}, "", "/");
  });

  it("is no longer mounted by global app providers", () => {
    render(
      <AppProviders>
        <main>Any Archestimator page</main>
      </AppProviders>,
    );

    expect(screen.getByText("Any Archestimator page")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Ask Flip" })).not.toBeInTheDocument();
  });
});
