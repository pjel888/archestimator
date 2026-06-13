import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import {
  BID_FORM_COLUMNS,
  createProposalWorkbook,
  createProposalWorkbookBuffer,
} from "@/lib/proposal-export/create-proposal-workbook";
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
  it("creates a professional bid workbook with bid form, summary, commercial terms, and source sheets", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt: "2026-05-23T00:00:00.000Z" });

    const workbook = createProposalWorkbook(model);

    expect(workbook.creator).toBe("Archestimator");
    expect(workbook.subject).toBe("Industry-standard proposal workbook");
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Bid Form",
      "Summary",
      "Commercial Terms",
      "Source Breakdown",
    ]);

    const bidForm = workbook.getWorksheet("Bid Form");
    expect(bidForm).toBeDefined();
    expect(bidForm?.views[0]).toMatchObject({ state: "frozen", ySplit: 17 });
    expect(bidForm?.pageSetup).toMatchObject({
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "17:17",
    });
    expect(bidForm?.getCell("A1").value).toBe("BID FORM / BILL OF QUANTITIES");
    expect(bidForm?.getCell("A2").value).toBe("Project");
    expect(bidForm?.getCell("B2").value).toBe(metadata.projectName);
    expect(bidForm?.getCell("A4").value).toBe("Owner / Client");
    expect(bidForm?.getCell("A9").value).toBe("General Notes");
    expect(bidForm?.getCell("A11").value).toContain("Do not leave LINE TOTAL blank");
    expect(bidForm?.getRow(17).values).toEqual([undefined, ...BID_FORM_COLUMNS.map((column) => column.header)]);
  });

  it("writes bid-form rows with formulas and nonblank line totals", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt: "2026-05-23T00:00:00.000Z" });

    const workbook = createProposalWorkbook(model);
    const bidForm = workbook.getWorksheet("Bid Form");
    expect(bidForm).toBeDefined();

    expect(bidForm?.getRow(19).values).toEqual([
      undefined,
      "1",
      "Sample 600 × 600 Porcelain Tile — Supply and install porcelain floor tile",
      "sqm",
      22,
      950,
      0,
      { formula: "E19+F19", result: 950 },
      { formula: 'IF(OR(I19="EXCLUDED",I19="BY OTHERS",I19="OWNER SUPPLIED",I19="OSM",I19="OFCI",I19="OSCI",I19="OMITTED",I19="NOT APPLICABLE"),0,D19*G19+800)', result: 21_700 },
      "INCLUDED",
      expect.stringContaining("Misc / other: ₱800.00"),
    ]);
    expect(bidForm?.getCell("H19").value).not.toBeNull();
    expect(bidForm?.getCell("H20").value).toEqual({ formula: "SUM(H19:H19)", result: 21_700 });
  });

  it("includes row contingency in bid-form recalculation formulas", () => {
    const nodes: EstimateTreeNode[] = [
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
            estimateRowItems: [
              row({
                id: "bed-a-tile",
                quantity: 2,
                itemCost: 1_000,
                contingencyPercentage: 10,
                miscCost: 100,
              }),
            ],
          },
        ],
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    const workbook = createProposalWorkbook(model);
    const bidForm = workbook.getWorksheet("Bid Form");

    expect(model.proposalRows[0].contingencySubtotal).toBe(200);
    expect(bidForm?.getCell("H19").value).toEqual({
      formula:
        'IF(OR(I19="EXCLUDED",I19="BY OTHERS",I19="OWNER SUPPLIED",I19="OSM",I19="OFCI",I19="OSCI",I19="OMITTED",I19="NOT APPLICABLE"),0,D19*G19+200+100)',
      result: 2_300,
    });
    expect(bidForm?.getCell("J19").value).toContain("Contingency: ₱200.00");
    expect(bidForm?.getCell("J19").value).toContain("Misc / other: ₱100.00");
  });

  it("writes formula-backed summary, commercial terms, and source breakdown traceability sheets", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt: "2026-05-23T00:00:00.000Z" });

    const workbook = createProposalWorkbook(model);
    const summary = workbook.getWorksheet("Summary");
    const terms = workbook.getWorksheet("Commercial Terms");
    const breakdown = workbook.getWorksheet("Source Breakdown");

    expect(summary?.getCell("A1").value).toBe("SUMMARY OF BID");
    expect(summary?.getRow(14).values).toEqual([undefined, "SECTION", "ROWS", "AMOUNT"]);
    expect(summary?.getRow(15).values).toEqual([undefined, "Finishes", 1, { formula: "'Bid Form'!H20", result: 21_700 }]);
    expect(summary?.getCell("B27").value).toEqual({ formula: "SUM(C15:C15)", result: 21_700 });
    expect(summary?.getCell("B30").value).toEqual({ formula: "B27+B28+B29", result: 21_700 });
    expect(terms?.getCell("A1").value).toBe("COMMERCIAL TERMS");
    expect(terms?.getCell("A3").value).toBe("Exclusions");
    expect(terms?.getCell("A13").value).toBe("Signature / Conforme");
    expect(breakdown?.getRow(7).values).toEqual([
      undefined,
      "1",
      "bed-a-tile",
      "Bedroom A",
      "Main House / Bedroom A",
      "Sample 600 × 600 Porcelain Tile — Supply and install porcelain floor tile",
      12,
      "sqm",
      950,
      0,
      11_400,
      0,
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
    expect(loadedWorkbook.getWorksheet("Bid Form")?.getCell("H19").value).toEqual({
      formula: 'IF(OR(I19="EXCLUDED",I19="BY OTHERS",I19="OWNER SUPPLIED",I19="OSM",I19="OFCI",I19="OSCI",I19="OMITTED",I19="NOT APPLICABLE"),0,D19*G19+800)',
      result: 21_700,
    });
  });

  it("creates a tab-aware workbook with global summary and source traceability", () => {
    const generatedAt = "2026-05-23T00:00:00.000Z";
    const mainModel = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt });
    const ownerModel = buildProposalExportModel({
      metadata,
      nodes: [
        {
          id: "owner-scope",
          name: "Owner Scope",
          kind: "area",
          total: "₱0.00",
          estimateRowItems: [row({ id: "owner-paint", material: "Owner Paint", quantity: 3, itemCost: 500, miscCost: 0 })],
        },
      ],
      generatedAt,
    });

    const workbook = createProposalWorkbook({
      metadata,
      settings: mainModel.settings,
      generatedAt,
      tabs: [
        { tabId: "tab-main", tabName: "Main", worksheetName: "Main", model: mainModel },
        { tabId: "tab-owner", tabName: "Owner's / Scope", worksheetName: "Owner's Scope", model: ownerModel },
      ],
    });

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Summary",
      "Main",
      "Owner's Scope",
      "Commercial Terms",
      "Source Breakdown",
    ]);
    expect(workbook.worksheets.every((sheet) => sheet.state !== "hidden")).toBe(true);
    expect(workbook.getWorksheet("Main")?.views[0]).toMatchObject({ state: "frozen", ySplit: 17 });
    expect(workbook.getWorksheet("Owner's Scope")?.views[0]).toMatchObject({ state: "frozen", ySplit: 17 });

    const summary = workbook.getWorksheet("Summary");
    expect(summary?.getCell("A15").value).toBe("Main");
    expect(summary?.getRow(16).values).toEqual([undefined, "Finishes", 1, { formula: "'Main'!H20", result: 21_700 }]);
    expect(summary?.getCell("A17").value).toBe("Owner's / Scope");
    expect(summary?.getRow(18).values).toEqual([undefined, "Finishes", 1, { formula: "'Owner''s Scope'!H20", result: 1_500 }]);
    expect(summary?.getCell("B20").value).toEqual({ formula: "SUM(C16,C18)", result: 23_200 });
    expect(summary?.getCell("B23").value).toEqual({ formula: "B20+B21+B22", result: 23_200 });

    const breakdown = workbook.getWorksheet("Source Breakdown");
    expect(breakdown?.getRow(6).values).toEqual([
      undefined,
      "TAB",
      "PROPOSAL NO.",
      "SOURCE ROW ID",
      "AREA",
      "AREA PATH",
      "PARTICULARS",
      "QTY",
      "UNIT",
      "MATERIAL UNIT COST",
      "LABOR UNIT COST",
      "MATERIAL SUBTOTAL",
      "LABOR SUBTOTAL",
      "CONTINGENCY / DISCOUNT",
      "MISC / OTHER",
      "COST AMOUNT",
    ]);
    expect(breakdown?.getCell("A7").value).toBe("Main");
    expect(breakdown?.getCell("A9").value).toBe("Owner's / Scope");
  });
});
