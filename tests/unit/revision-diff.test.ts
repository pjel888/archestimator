import { describe, expect, test } from "bun:test";
import type { Estimate } from "@/lib/local-data/schemas";
import { compareEstimateRevisions } from "@/lib/estimates/revision-diff";

const baseEstimate: Estimate = {
  id: "estimate_base",
  projectId: "project_1",
  name: "Base Estimate",
  versionLabel: "Initial",
  versionNumber: 1,
  status: "draft",
  pricingBasisDate: "2026-05-17",
  sections: [
    { id: "section_finishes", name: "Finishes", outlineCode: "A", sectionType: "trade" },
    { id: "section_casework", name: "Casework", outlineCode: "B", sectionType: "trade" },
  ],
  floors: [{ id: "floor_1", name: "Ground Floor", outlineCode: "GF", sortOrder: 0 }],
  spaces: [
    { id: "space_bath", floorId: "floor_1", name: "Bathroom", outlineCode: "GF-01", sortOrder: 0, spaceType: "room" },
    { id: "space_kitchen", floorId: "floor_1", name: "Kitchen", outlineCode: "GF-02", sortOrder: 1, spaceType: "room" },
  ],
  proposalSections: [
    { id: "proposal_finishes", name: "Floor Finishes", outlineCode: "A", sectionType: "trade", sortOrder: 0, displayInProposal: true },
    { id: "proposal_casework", name: "Casework", outlineCode: "B", sectionType: "trade", sortOrder: 1, displayInProposal: true },
  ],
  lineItems: [
    {
      id: "line_tile",
      sectionId: "section_finishes",
      proposalSectionId: "proposal_finishes",
      spaceId: "space_bath",
      itemName: "Tile works",
      quantity: 10,
      unit: "sqm",
      materialUnitCost: 500,
      laborUnitCost: 150,
      scopeStatus: "included",
      linkState: "manual",
    },
  ],
};

describe("compareEstimateRevisions", () => {
  test("classifies a space-only move separately from BOQ/proposal remapping", () => {
    const revised: Estimate = {
      ...baseEstimate,
      id: "estimate_rev",
      versionNumber: 2,
      versionLabel: "Rev 02",
      lineItems: [{ ...baseEstimate.lineItems[0], spaceId: "space_kitchen" }],
    };

    const diff = compareEstimateRevisions(baseEstimate, revised);

    expect(diff.summary.spaceMoves).toBe(1);
    expect(diff.summary.proposalRemaps).toBe(0);
    expect(diff.changes).toContainEqual(expect.objectContaining({
      kind: "space-moved",
      lineItemId: "line_tile",
      itemName: "Tile works",
      fromSpacePath: "Ground Floor / Bathroom",
      toSpacePath: "Ground Floor / Kitchen",
    }));
  });

  test("classifies BOQ/proposal remapping separately from space moves", () => {
    const revised: Estimate = {
      ...baseEstimate,
      id: "estimate_rev",
      versionNumber: 2,
      versionLabel: "Rev 02",
      lineItems: [{ ...baseEstimate.lineItems[0], proposalSectionId: "proposal_casework" }],
    };

    const diff = compareEstimateRevisions(baseEstimate, revised);

    expect(diff.summary.spaceMoves).toBe(0);
    expect(diff.summary.proposalRemaps).toBe(1);
    expect(diff.changes).toContainEqual(expect.objectContaining({
      kind: "proposal-remapped",
      lineItemId: "line_tile",
      fromProposalSectionName: "Floor Finishes",
      toProposalSectionName: "Casework",
    }));
  });

  test("matches regenerated revision row ids through revisionSourceLineItemId", () => {
    const revised: Estimate = {
      ...baseEstimate,
      id: "estimate_rev",
      versionNumber: 2,
      versionLabel: "Rev 02",
      lineItems: [{ ...baseEstimate.lineItems[0], id: "line_new_revision_id", revisionSourceLineItemId: "line_tile", spaceId: "space_kitchen" }],
    };

    const diff = compareEstimateRevisions(baseEstimate, revised);

    expect(diff.summary.addedLines).toBe(0);
    expect(diff.summary.removedLines).toBe(0);
    expect(diff.summary.spaceMoves).toBe(1);
  });

  test("classifies text-only item name and description edits as scope changes", () => {
    const revised: Estimate = {
      ...baseEstimate,
      id: "estimate_rev_text",
      versionNumber: 2,
      lineItems: [{ ...baseEstimate.lineItems[0], itemName: "Premium tile", description: "Client-selected premium floor finish" }],
    };

    const diff = compareEstimateRevisions(baseEstimate, revised);

    expect(diff.summary.scopeChanges).toBe(1);
    expect(diff.changes).toEqual([
      expect.objectContaining({ kind: "scope-changed", changedFields: ["itemName", "description"] }),
    ]);
  });

  test("classifies commercial quantity and pricing changes separately from location changes", () => {
    const revised: Estimate = {
      ...baseEstimate,
      id: "estimate_rev",
      versionNumber: 2,
      versionLabel: "Rev 02",
      lineItems: [{ ...baseEstimate.lineItems[0], quantity: 12, materialUnitCost: 550 }],
    };

    const diff = compareEstimateRevisions(baseEstimate, revised);

    expect(diff.summary.commercialChanges).toBe(1);
    expect(diff.summary.spaceMoves).toBe(0);
    expect(diff.summary.proposalRemaps).toBe(0);
    expect(diff.changes).toContainEqual(expect.objectContaining({
      kind: "commercial-changed",
      lineItemId: "line_tile",
      changedFields: expect.arrayContaining(["quantity", "materialUnitCost"]),
    }));
  });
});
