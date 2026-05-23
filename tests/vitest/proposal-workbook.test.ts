import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import {
  createProposalWorkbook,
  createProposalWorkbookBuffer,
  DETAILED_ESTIMATE_COLUMNS,
} from "@/lib/proposal-export/create-proposal-workbook";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";

const metadata: ProposalExportMetadata = {
  projectId: "project-1",
  estimateId: "estimate-1",
  projectName: "Grand Hyatt Fit-Out Study",
  projectCode: "GH-001",
  projectAddress: "Taguig City",
  estimateName: "Interior Fit-Out Estimate",
  estimateSheetCode: "EST-001",
  versionLabel: "Draft v1",
  currency: "PHP",
};

function row(overrides: Partial<EstimateRowItem> = {}): EstimateRowItem {
  const itemCost = overrides.itemCost ?? 950;
  const quantity = overrides.quantity ?? 1;
  const miscCost = overrides.miscCost ?? 0;

  return {
    id: overrides.id ?? "row-1",
    material: overrides.material ?? "Mariwasa 600 × 600 Porcelain Tile",
    description: overrides.description ?? "Supply and install porcelain floor tile",
    supplier: overrides.supplier ?? "Wilcon Depot / Mariwasa",
    source: overrides.source ?? "supplier",
    unit: overrides.unit ?? "sqm",
    itemCost,
    quantity,
    subTotal: itemCost * quantity,
    miscCost,
    totalItemCosts: itemCost * quantity + miscCost,
    category: overrides.category ?? "Finishes",
    discipline: overrides.discipline ?? "Architectural",
    designation: overrides.designation ?? "Floor Finish",
    tags: overrides.tags ?? ["flooring", "tile"],
    pricingSource: overrides.pricingSource ?? "Supplier allowance — verify quote",
    pricingDate: overrides.pricingDate ?? "2026-05-23",
    confidence: overrides.confidence ?? "allowance",
  };
}

function modelTree(): EstimateTreeNode[] {
  return [
    {
      id: "main-house",
      name: "Main House",
      kind: "group",
      total: "₱0.00",
      children: [
        {
          id: "bedroom-a",
          name: "Bedroom A",
          kind: "area",
          total: "₱0.00",
          estimateRowItems: [row({ id: "bed-a-tile", quantity: 12, miscCost: 500 })],
        },
        {
          id: "bedroom-b",
          name: "Bedroom B",
          kind: "area",
          total: "₱0.00",
          estimateRowItems: [row({ id: "bed-b-tile", quantity: 10, miscCost: 300 })],
        },
      ],
    },
  ];
}

describe("proposal workbook generation", () => {
  it("creates the contractor proposal sheets with the planned detailed estimate columns", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt: "2026-05-23T00:00:00.000Z" });

    const workbook = createProposalWorkbook(model);

    expect(workbook.creator).toBe("Archestimator");
    expect(workbook.subject).toBe("Industry-standard proposal workbook");
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Proposal Summary",
      "Detailed Estimate",
      "Area Breakdown",
    ]);

    const detailed = workbook.getWorksheet("Detailed Estimate");
    expect(detailed).toBeDefined();
    expect(detailed?.views[0]).toMatchObject({ state: "frozen", ySplit: 8 });
    expect(detailed?.getRow(8).values).toEqual([undefined, ...DETAILED_ESTIMATE_COLUMNS.map((column) => column.header)]);
  });

  it("writes consolidated quantities, subtotals, misc cost, and grand total into the detailed sheet", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt: "2026-05-23T00:00:00.000Z" });

    const workbook = createProposalWorkbook(model);
    const detailed = workbook.getWorksheet("Detailed Estimate");
    expect(detailed).toBeDefined();

    expect(detailed?.getRow(9).values).toEqual([
      undefined,
      "1",
      "Floor Finish",
      "Mariwasa 600 × 600 Porcelain Tile — Supply and install porcelain floor tile",
      22,
      "sqm",
      950,
      0,
      20_900,
      0,
      800,
      21_700,
      expect.stringContaining("Supplier: Wilcon Depot / Mariwasa"),
    ]);
    expect(detailed?.getCell("K10").value).toBe(21_700);
  });

  it("writes summary and area breakdown traceability sheets", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt: "2026-05-23T00:00:00.000Z" });

    const workbook = createProposalWorkbook(model);
    const summary = workbook.getWorksheet("Proposal Summary");
    const breakdown = workbook.getWorksheet("Area Breakdown");

    expect(summary?.getCell("B7").value).toBe(21_700);
    expect(summary?.getRow(11).values).toEqual([undefined, "Finishes", 1, 22, 20_900, 0, 800, 21_700]);
    expect(breakdown?.getRow(8).values).toEqual([
      undefined,
      "1",
      "bed-a-tile",
      "Bedroom A",
      "Main House / Bedroom A",
      "Mariwasa 600 × 600 Porcelain Tile — Supply and install porcelain floor tile",
      12,
      "sqm",
      950,
      0,
      11_400,
      0,
      500,
      11_900,
    ]);
  });

  it("serializes a loadable editable xlsx buffer", async () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt: "2026-05-23T00:00:00.000Z" });

    const buffer = await createProposalWorkbookBuffer(model);
    const loadedWorkbook = new ExcelJS.Workbook();
    await loadedWorkbook.xlsx.load(buffer);

    expect(buffer.byteLength).toBeGreaterThan(4_000);
    expect(loadedWorkbook.getWorksheet("Detailed Estimate")?.getCell("K10").value).toBe(21_700);
  });
});
