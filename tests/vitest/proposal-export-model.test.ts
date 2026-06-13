import { describe, expect, it } from "vitest";

import {
  buildProposalExportModel,
  consolidateProposalRows,
  flattenEstimateTree,
} from "@/lib/proposal-export/build-proposal-export-model";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";

const metadata: ProposalExportMetadata = {
  projectId: "project-1",
  estimateId: "estimate-1",
  projectName: "Synthetic Hotel Fit-Out Study",
  projectCode: "SYN-001",
  projectAddress: "Metro City",
  estimateName: "Interior Fit-Out Estimate",
  estimateSheetCode: "EST-001",
  versionLabel: "Draft v1",
  currency: "PHP",
};

function row(overrides: Partial<EstimateRowItem> = {}): EstimateRowItem {
  const itemCost = overrides.itemCost ?? 950;
  const quantity = overrides.quantity ?? 1;
  const miscCost = overrides.miscCost ?? 0;
  const subTotal = itemCost * quantity;
  const contingencyPercentage = overrides.contingencyPercentage ?? 0;
  const contingencyValue = overrides.contingencyValue ?? (subTotal * contingencyPercentage) / 100;

  return {
    id: overrides.id ?? "row-1",
    material: overrides.material ?? "Sample 600 × 600 Porcelain Tile",
    description: overrides.description ?? "Supply and install porcelain floor tile",
    supplier: overrides.supplier ?? "Sample Supplier",
    source: overrides.source ?? "supplier",
    unit: overrides.unit ?? "sqm",
    itemCost,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + contingencyValue + miscCost,
    category: overrides.category ?? "Finishes",
    categoryNodeId: overrides.categoryNodeId,
    categoryPath: overrides.categoryPath,
    supplierId: overrides.supplierId,
    discipline: overrides.discipline ?? "Architectural",
    designation: overrides.designation ?? "Floor Finish",
    tags: overrides.tags ?? ["flooring", "tile"],
    pricingSource: overrides.pricingSource ?? "Supplier allowance — verify quote",
    pricingDate: overrides.pricingDate ?? "2026-05-23",
    confidence: overrides.confidence ?? "allowance",
    notes: overrides.notes,
    laborUnitCost: overrides.laborUnitCost,
    scopeStatus: overrides.scopeStatus,
  };
}

function treeWithBedrooms(rowsA: EstimateRowItem[], rowsB: EstimateRowItem[]): EstimateTreeNode[] {
  return [
    {
      id: "main-house",
      name: "Main House",
      kind: "group",
      total: "₱0.00",
      children: [
        {
          id: "second-floor",
          name: "Second Floor",
          kind: "group",
          total: "₱0.00",
          children: [
            {
              id: "bedroom-a",
              name: "Bedroom A",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: rowsA,
            },
            {
              id: "bedroom-b",
              name: "Bedroom B",
              kind: "area",
              total: "₱0.00",
              estimateRowItems: rowsB,
            },
          ],
        },
      ],
    },
  ];
}

describe("proposal export model", () => {
  it("flattens only area row items and preserves area path traceability", () => {
    const nodes = treeWithBedrooms([row({ id: "bed-a-tile", quantity: 12 })], [row({ id: "bed-b-tile", quantity: 10 })]);

    const flatRows = flattenEstimateTree(nodes);

    expect(flatRows).toHaveLength(2);
    expect(flatRows.map((flatRow) => flatRow.sourceRow.id)).toEqual(["bed-a-tile", "bed-b-tile"]);
    expect(flatRows[0].areaPath).toEqual(["Main House", "Second Floor", "Bedroom A"]);
    expect(flatRows[1].areaPathLabel).toBe("Main House / Second Floor / Bedroom B");
    expect(flatRows[0].sortIndex).toBeLessThan(flatRows[1].sortIndex);
  });

  it("consolidates identical line items across rooms into one industry-standard proposal row", () => {
    const nodes = treeWithBedrooms([row({ id: "bed-a-tile", quantity: 12 })], [row({ id: "bed-b-tile", quantity: 10 })]);
    const flatRows = flattenEstimateTree(nodes);

    const proposalRows = consolidateProposalRows(flatRows);

    expect(proposalRows).toHaveLength(1);
    expect(proposalRows[0]).toMatchObject({
      rowNumber: "1",
      sectionLabel: "Finishes",
      tag: "Floor Finish",
      particulars: "Sample 600 × 600 Porcelain Tile — Supply and install porcelain floor tile",
      quantity: 22,
      unit: "sqm",
      materialUnitCost: 950,
      laborUnitCost: 0,
      materialSubtotal: 20_900,
      laborSubtotal: 0,
      contingencySubtotal: 0,
      miscSubtotal: 0,
      costAmount: 20_900,
      includedInTotal: true,
    });
    expect(proposalRows[0].sourceRowIds).toEqual(["bed-a-tile", "bed-b-tile"]);
    expect(proposalRows[0].sourceAreaPaths).toEqual([
      "Main House / Second Floor / Bedroom A",
      "Main House / Second Floor / Bedroom B",
    ]);
  });

  it("does not consolidate rows with different unit costs, units, or scope-defining particulars", () => {
    const nodes = treeWithBedrooms(
      [row({ id: "bed-a-tile", quantity: 12, itemCost: 950 })],
      [row({ id: "bed-b-tile-different-cost", quantity: 10, itemCost: 975 })],
    );
    const unitMismatchNodes = treeWithBedrooms(
      [row({ id: "tile-sqm", unit: "sqm" })],
      [row({ id: "tile-box", unit: "box" })],
    );
    const particularsMismatchNodes = treeWithBedrooms(
      [row({ id: "tile-supply-install", description: "Supply and install porcelain floor tile" })],
      [row({ id: "tile-supply-only", description: "Supply only porcelain floor tile" })],
    );

    expect(consolidateProposalRows(flattenEstimateTree(nodes))).toHaveLength(2);
    expect(consolidateProposalRows(flattenEstimateTree(unitMismatchNodes))).toHaveLength(2);
    expect(consolidateProposalRows(flattenEstimateTree(particularsMismatchNodes))).toHaveLength(2);
  });

  it("builds summary rows, source breakdown rows, totals, and compatibility validation issues", () => {
    const nodes = treeWithBedrooms(
      [row({ id: "bed-a-tile", quantity: 12, miscCost: 500 })],
      [row({ id: "bed-b-tile", quantity: 10, miscCost: 300 })],
    );

    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    expect(model.metadata).toEqual(metadata);
    expect(model.generatedAt).toBe("2026-05-23T00:00:00.000Z");
    expect(model.proposalRows).toHaveLength(1);
    expect(model.proposalRows[0].quantity).toBe(22);
    expect(model.proposalRows[0].materialSubtotal).toBe(20_900);
    expect(model.proposalRows[0].contingencySubtotal).toBe(0);
    expect(model.proposalRows[0].miscSubtotal).toBe(800);
    expect(model.proposalRows[0].costAmount).toBe(21_700);
    expect(model.totals.contingencySubtotal).toBe(0);
    expect(model.totals.grandTotal).toBe(21_700);
    expect(model.summaryRows).toEqual([
      {
        sectionKey: "finishes",
        sectionLabel: "Finishes",
        rowCount: 1,
        totalQuantity: 22,
        materialSubtotal: 20_900,
        laborSubtotal: 0,
        contingencySubtotal: 0,
        miscSubtotal: 800,
        costAmount: 21_700,
      },
    ]);
    expect(model.sourceBreakdownRows).toHaveLength(2);
    expect(model.sourceBreakdownRows.map((sourceRow) => sourceRow.areaPathLabel)).toEqual([
      "Main House / Second Floor / Bedroom A",
      "Main House / Second Floor / Bedroom B",
    ]);
    expect(model.validationIssues).toContainEqual(
      expect.objectContaining({
        severity: "info",
        code: "cost_split_compatibility_mode",
      }),
    );
  });

  it("carries row contingency through model totals and source breakdown rows", () => {
    const nodes = treeWithBedrooms(
      [row({ id: "bed-a-tile", quantity: 2, itemCost: 1_000, contingencyPercentage: 12.5, miscCost: 75 })],
      [],
    );

    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    expect(model.proposalRows[0]).toMatchObject({
      materialSubtotal: 2_000,
      laborSubtotal: 0,
      contingencySubtotal: 250,
      miscSubtotal: 75,
      costAmount: 2_325,
    });
    expect(model.summaryRows[0]).toMatchObject({
      materialSubtotal: 2_000,
      contingencySubtotal: 250,
      miscSubtotal: 75,
      costAmount: 2_325,
    });
    expect(model.sourceBreakdownRows[0]).toMatchObject({
      materialSubtotal: 2_000,
      contingencySubtotal: 250,
      miscSubtotal: 75,
      costAmount: 2_325,
    });
    expect(model.totals).toMatchObject({
      materialSubtotal: 2_000,
      contingencySubtotal: 250,
      miscSubtotal: 75,
      grandTotal: 2_325,
    });
  });

  it("returns an empty export model with validation notes instead of crashing", () => {
    const model = buildProposalExportModel({ metadata, nodes: [], generatedAt: "2026-05-23T00:00:00.000Z" });

    expect(model.proposalRows).toEqual([]);
    expect(model.sourceBreakdownRows).toEqual([]);
    expect(model.totals.grandTotal).toBe(0);
    expect(model.validationIssues).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "empty_estimate",
      }),
    );
  });

  it("computes project contingency and VAT in model totals, honoring INCLUDED mode (P2-T1)", () => {
    const nodes = treeWithBedrooms([row({ id: "a", quantity: 1, itemCost: 1_000, miscCost: 0 })], []);

    const percentage = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });
    expect(percentage.totals.grandTotal).toBe(1_000); // Direct Cost unchanged
    expect(percentage.totals.projectContingencyAmount).toBe(100); // 10% of 1,000
    expect(percentage.totals.vatAmount).toBe(132); // 12% of (1,000 + 100)
    expect(percentage.totals.grandTotalWithTaxes).toBe(1_232);

    const included = buildProposalExportModel({
      metadata,
      nodes,
      settings: { contingencyMode: "included", vatMode: "included" },
      generatedAt: "2026-05-23T00:00:00.000Z",
    });
    expect(included.totals.projectContingencyAmount).toBe(0);
    expect(included.totals.vatAmount).toBe(0);
    expect(included.totals.grandTotalWithTaxes).toBe(1_000);
  });

  it("restarts line numbers within each section (P2-T5, F-09)", () => {
    const nodes: EstimateTreeNode[] = [
      {
        id: "group",
        name: "Group",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "prelim",
            name: "Prelim Area",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [
              row({ id: "p1", material: "Prelim 1", category: "Preliminaries" }),
              row({ id: "p2", material: "Prelim 2", category: "Preliminaries" }),
            ],
          },
          {
            id: "finishes",
            name: "Finishes Area",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [
              row({ id: "f1", material: "Finish 1", category: "Finishes" }),
              row({ id: "f2", material: "Finish 2", category: "Finishes" }),
            ],
          },
        ],
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    expect(model.proposalRows.map((proposalRow) => [proposalRow.sectionLabel, proposalRow.rowNumber])).toEqual([
      ["Preliminaries", "1"],
      ["Preliminaries", "2"],
      ["Finishes", "1"],
      ["Finishes", "2"],
    ]);
  });

  it("keeps Bid Form line numbers contiguous when a section mixes included and excluded scope (F-09)", () => {
    // An excluded row interleaved between two included rows of the same section must NOT
    // consume a priced-section line number — the Bid Form renders only the included rows, so
    // the ITEM column would otherwise read 1, 3 (a visible gap). Excluded rows are numbered on
    // their own flat sequence, matching the EXCLUSIONS block.
    const nodes: EstimateTreeNode[] = [
      {
        id: "group",
        name: "Group",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "concrete",
            name: "Concrete Area",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [
              row({ id: "c1", material: "Footing", category: "Concrete" }),
              row({ id: "c2", material: "Owner Rebar", category: "Concrete", scopeStatus: "by_others" }),
              row({ id: "c3", material: "Slab", category: "Concrete" }),
            ],
          },
        ],
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    const includedNumbers = model.proposalRows.filter((proposalRow) => proposalRow.includedInTotal).map((proposalRow) => proposalRow.rowNumber);
    const excludedNumbers = model.proposalRows.filter((proposalRow) => !proposalRow.includedInTotal).map((proposalRow) => proposalRow.rowNumber);

    expect(includedNumbers).toEqual(["1", "2"]); // contiguous — no skipped ITEM number
    expect(excludedNumbers).toEqual(["1"]); // excluded row numbered independently
  });

  it("orders sections by the canonical division taxonomy, not encounter order (P3-T3, F-27)", () => {
    const nodes: EstimateTreeNode[] = [
      {
        id: "group",
        name: "Group",
        kind: "group",
        total: "₱0.00",
        children: [
          // Finishes is encountered first, Preliminaries second — canonical order flips them.
          { id: "fin", name: "Fin", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "f1", material: "Floor Tile", category: "Finishes" })] },
          { id: "pre", name: "Pre", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "p1", material: "Mobilization", category: "General Preliminaries" })] },
          { id: "mep", name: "Mep", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "e1", material: "Wiring", category: "Electrical Works" })] },
        ],
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    expect(model.summaryRows.map((summaryRow) => summaryRow.sectionLabel)).toEqual([
      "General Preliminaries", // rank 0
      "Finishes", // rank 4
      "Electrical Works", // rank 8 (MEP)
    ]);
  });

  it("reads interim labor + scope and excludes non-included scope from totals (P3-T1/T2, F-01/F-08)", () => {
    const nodes = treeWithBedrooms(
      [row({ id: "incl", quantity: 1, itemCost: 1_000, laborUnitCost: 200 })],
      [row({ id: "excl", material: "Owner Fixtures", quantity: 1, itemCost: 500, scopeStatus: "by_others" })],
    );
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    const included = model.proposalRows.find((proposalRow) => proposalRow.includedInTotal);
    expect(included?.laborUnitCost).toBe(200);
    expect(included?.laborSubtotal).toBe(200);

    const excluded = model.proposalRows.find((proposalRow) => !proposalRow.includedInTotal);
    expect(excluded?.scopeStatus).toBe("by_others");

    // Only the included row (1,000 material + 200 labor) counts toward the Grand Total.
    expect(model.totals.grandTotal).toBe(1_200);
    // Labor is present → the material-only disclaimer is suppressed.
    expect(model.validationIssues.some((issue) => issue.code === "cost_split_compatibility_mode")).toBe(false);
  });

  it("unification (P2): rows on a non-area (group) node are exported, not skipped", () => {
    // The pre-unification export dropped rows owned by a "group" container, understating
    // the proposal total — the same silent-drop class as the share firewall (P1). After the
    // relax, a mixed node's own rows are exported and counted, with no stale skip warning.
    const nodes: EstimateTreeNode[] = [
      {
        id: "main-house",
        name: "Main House",
        kind: "group",
        total: "₱0.00",
        // rows OWNED by the group container (not just its area children):
        estimateRowItems: [row({ id: "own-row", material: "Site Preparation", quantity: 1, itemCost: 1_000 })],
        children: [
          {
            id: "bedroom-a",
            name: "Bedroom A",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [row({ id: "child-row", material: "Porcelain Tile", quantity: 1, itemCost: 500 })],
          },
        ],
      },
    ];

    // flattenEstimateTree now emits the group node's own row alongside the child area row.
    const flat = flattenEstimateTree(nodes);
    expect(flat.map((flatRow) => flatRow.sourceRowId).sort()).toEqual(["child-row", "own-row"]);

    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });
    // Both rows count toward the grand total (1,000 + 500) — neither is silently dropped.
    expect(model.totals.grandTotal).toBe(1_500);
    // The obsolete "rows skipped because export only reads area rows" warning must not fire.
    expect(model.validationIssues.some((issue) => issue.code === "non_area_rows_skipped")).toBe(false);
  });
});
