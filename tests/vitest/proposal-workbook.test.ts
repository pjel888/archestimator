import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import {
  BID_FORM_COLUMNS,
  BID_FORM_COLUMN_LETTERS,
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
    scopeStatus: overrides.scopeStatus,
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

function readZipUint16(buffer: Uint8Array, offset: number) {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readZipUint32(buffer: Uint8Array, offset: number) {
  return (buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24)) >>> 0;
}

function readStoredZipEntry(buffer: Uint8Array, targetName: string) {
  const decoder = new TextDecoder();
  let offset = 0;

  while (readZipUint32(buffer, offset) === 0x04034b50) {
    const compressionMethod = readZipUint16(buffer, offset + 8);
    const compressedSize = readZipUint32(buffer, offset + 18);
    const nameLength = readZipUint16(buffer, offset + 26);
    const extraLength = readZipUint16(buffer, offset + 28);
    const nameOffset = offset + 30;
    const contentOffset = nameOffset + nameLength + extraLength;
    const entryName = decoder.decode(buffer.slice(nameOffset, nameOffset + nameLength));

    if (entryName === targetName) {
      if (compressionMethod !== 0) throw new Error(`Expected stored ZIP entry for ${targetName}.`);
      return decoder.decode(buffer.slice(contentOffset, contentOffset + compressedSize));
    }

    offset = contentOffset + compressedSize;
  }

  throw new Error(`Missing ZIP entry: ${targetName}`);
}

describe("proposal workbook generation", () => {
  it("creates a professional bid workbook with bid form, summary, commercial terms, and source sheets", () => {
    // audience=internal exercises the full workbook incl. the internal Source Breakdown sheet
    // (the default client audience redacts it — see the dedicated redaction test below).
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), settings: { audience: "internal" }, generatedAt: "2026-05-23T00:00:00.000Z" });

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
    // P2-T4: expanded title block (Project Ref / Code, Subject) with trimmed General Notes
    // spacers keeps DETAIL_HEADER_ROW at 17 (data rows unchanged).
    expect(bidForm?.getCell("A6").value).toBe("Project Ref / Code");
    expect(bidForm?.getCell("B6").value).toBe("SYN-001");
    expect(bidForm?.getCell("A7").value).toBe("Subject");
    expect(bidForm?.getCell("A10").value).toBe("General Notes");
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
      { formula: 'IF(OR(G19="EXCLUDED",G19="BY OTHERS",G19="OWNER SUPPLIED",G19="OSM",G19="OFCI",G19="OSCI",G19="OMITTED",G19="NOT APPLICABLE"),0,ROUND(D19*E19,2)+800)', result: 21_700 },
      "INCLUDED",
      "Misc / other: ₱800.00",
    ]);
    expect(bidForm?.getCell("F19").value).not.toBeNull();
    expect(bidForm?.getCell("F20").value).toEqual({ formula: "SUM(F19:F19)", result: 21_700 });
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
    expect(bidForm?.getCell("F19").value).toEqual({
      formula:
        'IF(OR(G19="EXCLUDED",G19="BY OTHERS",G19="OWNER SUPPLIED",G19="OSM",G19="OFCI",G19="OSCI",G19="OMITTED",G19="NOT APPLICABLE"),0,ROUND(D19*E19,2)+200+100)',
      result: 2_300,
    });
    expect(bidForm?.getCell("H19").value).toContain("Contingency: ₱200.00");
    expect(bidForm?.getCell("H19").value).toContain("Misc / other: ₱100.00");
  });

  it("LINE TOTAL recalculates to the pinned costAmount for fractional quantities (recalc parity)", () => {
    // qty 2.5 × unit 10.01 = 25.025, which rounds to 25.02. The model pins costAmount from
    // round(unit*qty); the old `qty * COST TOTAL` formula would recalc to 25.025 in Excel and
    // drift from the pinned figure. Round-then-sum in the formula keeps recalc == pinned.
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
            estimateRowItems: [row({ id: "frac-tile", quantity: 2.5, itemCost: 10.01 })],
          },
        ],
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });
    const pr = model.proposalRows[0];
    const roundMoney = (value: number) => Math.round(value * 100) / 100;

    // What the live ROUND-then-sum formula evaluates to, recomputed on the same float inputs.
    const formulaValue =
      roundMoney(pr.quantity * pr.materialUnitCost) + pr.contingencySubtotal + pr.miscSubtotal;
    // What an unrounded material multiplication would have evaluated to.
    const naiveValue = pr.quantity * pr.materialUnitCost + pr.contingencySubtotal + pr.miscSubtotal;

    expect(formulaValue).toBe(pr.costAmount); // recalc matches the pinned result
    expect(naiveValue).not.toBe(pr.costAmount); // the fixture genuinely exercises the divergence

    const bidForm = createProposalWorkbook(model).getWorksheet("Bid Form");
    const lineTotal = bidForm?.getCell("F19").value as { formula: string; result: number };
    expect(lineTotal.result).toBe(pr.costAmount);
    expect(lineTotal.formula).toContain("ROUND(D19*E19,2)");
  });

  it("writes formula-backed summary, commercial terms, and source breakdown traceability sheets", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), settings: { audience: "internal" }, generatedAt: "2026-05-23T00:00:00.000Z" });

    const workbook = createProposalWorkbook(model);
    const summary = workbook.getWorksheet("Summary");
    const terms = workbook.getWorksheet("Commercial Terms");
    const breakdown = workbook.getWorksheet("Source Breakdown");

    expect(summary?.getCell("A1").value).toBe("SUMMARY OF BID");
    expect(summary?.getRow(14).values).toEqual([undefined, "SECTION", "ROWS", "AMOUNT"]);
    expect(summary?.getRow(15).values).toEqual([undefined, "Finishes", 1, { formula: "'Bid Form'!F20", result: 21_700 }]);
    // P1-T6: single-tab Summary uses the dynamic totals start (one spacer past the last
    // section row). One section at row 15 → totals start at row 17, Grand Total at row 20.
    // P2-T1: Contingency (10%) and VAT (12% of Direct+Contingency) are now real formulas.
    expect(summary?.getCell("B17").value).toEqual({ formula: "SUM(C15)", result: 21_700 });
    expect(summary?.getCell("B18").value).toEqual({ formula: "B17*0.1", result: 2_170 });
    expect(summary?.getCell("B19").value).toEqual({ formula: "(B17+B18)*0.12", result: 2_864.4 });
    expect(summary?.getCell("B20").value).toEqual({ formula: "B17+B18+B19", result: 26_734.4 });
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
    expect(loadedWorkbook.getWorksheet("Bid Form")?.getCell("F19").value).toEqual({
      formula: 'IF(OR(G19="EXCLUDED",G19="BY OTHERS",G19="OWNER SUPPLIED",G19="OSM",G19="OFCI",G19="OSCI",G19="OMITTED",G19="NOT APPLICABLE"),0,ROUND(D19*E19,2)+800)',
      result: 21_700,
    });
  });

  it("emits deterministic XLSX XML with cached proposal values readable by a native parser", async () => {
    const model = buildProposalExportModel({
      metadata: { ...metadata, currency: "USD" },
      nodes: [
        {
          id: "artifact-area",
          name: "Artifact Area",
          kind: "area",
          total: "0",
          estimateRowItems: [row({ quantity: 1, itemCost: 100, contingencyPercentage: 10, miscCost: 5 })],
        },
      ],
      generatedAt: "2026-05-23T00:00:00.000Z",
    });

    const firstBuffer = await createProposalWorkbookBuffer(model);
    const secondBuffer = await createProposalWorkbookBuffer(model);
    expect(firstBuffer).toEqual(secondBuffer);
    expect(readZipUint32(firstBuffer, 0)).toBe(0x04034b50);

    const workbookXml = readStoredZipEntry(firstBuffer, "xl/workbook.xml");
    const stylesXml = readStoredZipEntry(firstBuffer, "xl/styles.xml");
    const bidFormXml = readStoredZipEntry(firstBuffer, "xl/worksheets/sheet1.xml");

    expect(workbookXml).toContain('<sheet name="Bid Form" sheetId="1" state="visible" r:id="rId1"/>');
    expect(workbookXml).toContain('<calcPr calcId="191029" fullCalcOnLoad="1"/>');
    expect(stylesXml).toContain('formatCode="_- &quot;USD&quot;* #,##0.00_-;-&quot;USD&quot;* #,##0.00_-;_- &quot;USD&quot;* &quot;-&quot;??_-;_-@_-"');
    expect(bidFormXml).toMatch(/<c r="F19" s="\d+"><f>IF\(OR\(G19="EXCLUDED".*\+10\+5\)<\/f><v>115<\/v><\/c>/);

    const loadedWorkbook = new ExcelJS.Workbook();
    await loadedWorkbook.xlsx.load(firstBuffer);
    const bidForm = loadedWorkbook.getWorksheet("Bid Form");
    expect(bidForm?.getCell("E19").value).toBe(100);
    expect(bidForm?.getCell("F19").value).toEqual({
      formula: 'IF(OR(G19="EXCLUDED",G19="BY OTHERS",G19="OWNER SUPPLIED",G19="OSM",G19="OFCI",G19="OSCI",G19="OMITTED",G19="NOT APPLICABLE"),0,ROUND(D19*E19,2)+10+5)',
      result: 115,
    });
  });

  it("creates a tab-aware workbook with global summary and source traceability", () => {
    const generatedAt = "2026-05-23T00:00:00.000Z";
    const mainModel = buildProposalExportModel({ metadata, nodes: modelTree(), settings: { audience: "internal" }, generatedAt });
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
      settings: { audience: "internal" },
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
    expect(summary?.getRow(16).values).toEqual([undefined, "Finishes", 1, { formula: "'Main'!F20", result: 21_700 }]);
    expect(summary?.getCell("A17").value).toBe("Owner's / Scope");
    expect(summary?.getRow(18).values).toEqual([undefined, "Finishes", 1, { formula: "'Owner''s Scope'!F20", result: 1_500 }]);
    expect(summary?.getCell("B20").value).toEqual({ formula: "SUM(C16,C18)", result: 23_200 });
    // P2-T1: Grand Total = Direct (23,200) + 10% contingency (2,320) + 12% VAT (3,062.4).
    expect(summary?.getCell("B23").value).toEqual({ formula: "B20+B21+B22", result: 28_582.4 });

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
      "MATERIAL SUBTOTAL",
      "CONTINGENCY / DISCOUNT",
      "MISC / OTHER",
      "COST AMOUNT",
    ]);
    expect(breakdown?.getCell("A7").value).toBe("Main");
    expect(breakdown?.getCell("A9").value).toBe("Owner's / Scope");
  });

  it("omits the beta placeholder bidder and removed labor placeholders (P1-T9)", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt: "2026-05-23T00:00:00.000Z" });
    const workbook = createProposalWorkbook(model);
    const bidForm = workbook.getWorksheet("Bid Form");

    expect(bidForm?.getCell("A5").value).toBe("Bidder / Contractor");
    expect(String(bidForm?.getCell("B5").value ?? "")).not.toContain("Archestimator beta workbook");

    const allCellText: string[] = [];
    workbook.eachSheet((sheet) =>
      sheet.eachRow((row) =>
        row.eachCell((cell) => {
          if (typeof cell.value === "string") allCellText.push(cell.value);
        }),
      ),
    );
    expect(allCellText.join("\n")).not.toContain("Archestimator beta workbook");
    expect(BID_FORM_COLUMNS.map((column) => column.header)).not.toContain("LABOR");
    expect(allCellText.some((text) => text.includes("MATERIAL-ONLY pricing"))).toBe(false);
  });

  it("redacts the Source Breakdown sheet and supplier remarks for the default client audience (P1-T9)", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), generatedAt: "2026-05-23T00:00:00.000Z" });
    expect(model.settings.audience).toBe("client");

    const workbook = createProposalWorkbook(model);
    expect(workbook.worksheets.map((sheet) => sheet.name)).not.toContain("Source Breakdown");

    const bidForm = workbook.getWorksheet("Bid Form");
    const remarkCells: string[] = [];
    bidForm?.eachRow((row) => {
      const value = row.getCell(8).value;
      if (typeof value === "string") remarkCells.push(value);
    });
    const joinedRemarks = remarkCells.join("\n");
    expect(joinedRemarks).not.toContain("Supplier:");
  });

  it("defangs CSV/formula injection by writing risky data cells as verbatim text (P1-T7, F-18)", async () => {
    const nodes: EstimateTreeNode[] = [
      {
        id: "g",
        name: "Group",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "a",
            name: "Area",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [row({ id: "evil", material: '=HYPERLINK("http://evil","click")', description: "" })],
          },
        ],
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes, settings: { audience: "internal" }, generatedAt: "2026-05-23T00:00:00.000Z" });
    const buffer = await createProposalWorkbookBuffer(model);
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(buffer);
    const cell = loaded.getWorksheet("Bid Form")?.getCell("B19");

    // Verbatim: the leading "=" is not stripped, the value is a string (never a formula object),
    // and the cell is forced to text type so it cannot fire as a formula on open / re-export.
    expect(cell?.value).toBe('=HYPERLINK("http://evil","click")');
    expect(typeof cell?.value).toBe("string");
    expect(cell?.numFmt).toBe("@");
  });

  it("keeps the single-tab Summary totals from colliding past 11 sections (P1-T6, F-16)", () => {
    const nodes: EstimateTreeNode[] = [
      {
        id: "group",
        name: "Group",
        kind: "group",
        total: "₱0.00",
        children: Array.from({ length: 15 }, (_, index) => ({
          id: `area-${index}`,
          name: `Area ${index}`,
          kind: "area" as const,
          total: "₱0.00",
          estimateRowItems: [
            row({ id: `r-${index}`, material: `Item ${index}`, category: `Division ${String(index).padStart(2, "0")}`, itemCost: 100 + index }),
          ],
        })),
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes, settings: { audience: "internal" }, generatedAt: "2026-05-23T00:00:00.000Z" });
    expect(model.summaryRows).toHaveLength(15);

    const summary = createProposalWorkbook(model).getWorksheet("Summary");
    // 15 sections occupy rows 15..29. The old fixed A27–B32 block overwrote a real section
    // row with "Direct Cost"; with the dynamic start the section data survives and totals
    // begin at row 31 (29 + 2 spacer).
    expect(summary?.getCell("A27").value).not.toBe("Direct Cost");
    expect(summary?.getCell("A31").value).toBe("Direct Cost");
    expect(summary?.getCell("A34").value).toBe("Grand Total");
    expect(summary?.getCell("B34").value).toEqual(expect.objectContaining({ formula: "B31+B32+B33" }));
  });

  it("renders Contingency/VAT as INCLUDED in the Summary when modes are included (P2-T1)", () => {
    const model = buildProposalExportModel({
      metadata,
      nodes: modelTree(),
      settings: { audience: "internal", contingencyMode: "included", vatMode: "included" },
      generatedAt: "2026-05-23T00:00:00.000Z",
    });
    const summary = createProposalWorkbook(model).getWorksheet("Summary");

    // One section (Finishes) at row 15 → totals start at row 17. (ExcelJS omits result:0 on
    // an in-memory formula cell, so assert the formula only.)
    expect(summary?.getCell("A18").value).toBe("Contingency (INCLUDED)");
    expect(summary?.getCell("B18").value).toMatchObject({ formula: "0" });
    expect(summary?.getCell("A19").value).toBe("VAT (INCLUDED)");
    expect(summary?.getCell("B19").value).toMatchObject({ formula: "0" });
    // Grand Total reduces to the Direct Cost when both charges are INCLUDED.
    expect(summary?.getCell("B20").value).toEqual({ formula: "B17+B18+B19", result: 21_700 });
  });

  it("computes Cost per SQM from a metadata gross floor area (P2-T6, F-10)", () => {
    const model = buildProposalExportModel({
      metadata: { ...metadata, grossFloorArea: 100 },
      nodes: modelTree(),
      settings: { audience: "internal" },
      generatedAt: "2026-05-23T00:00:00.000Z",
    });
    const summary = createProposalWorkbook(model).getWorksheet("Summary");

    // 1 section at row 15 → totals start 17, Grand Total row 20, Cost/sqm 21, GFA 22.
    // Grand Total (26,734.40) / GFA (100) = 267.34.
    expect(summary?.getCell("A21").value).toBe("Cost per sqm");
    expect(summary?.getCell("B21").value).toEqual({ formula: "B20/B22", result: 267.34 });
    expect(summary?.getCell("A22").value).toBe("Total Gross Floor Area");
    expect(summary?.getCell("B22").value).toBe(100);
    expect(summary?.getCell("A23").value).toBe("Estimated duration");
  });

  it("shows Cost per SQM = N/A when no gross floor area is captured (P2-T6)", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), settings: { audience: "internal" }, generatedAt: "2026-05-23T00:00:00.000Z" });
    const summary = createProposalWorkbook(model).getWorksheet("Summary");

    expect(summary?.getCell("A21").value).toBe("Cost per sqm");
    expect(summary?.getCell("B21").value).toBe("N/A");
    // No GFA row → duration is the next row.
    expect(summary?.getCell("A22").value).toBe("Estimated duration");
  });

  it("emits division letters on Bid Form section headers (P2-T5, F-09)", () => {
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
            estimateRowItems: [row({ id: "f1", material: "Finish 1", category: "Finishes" })],
          },
        ],
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes, settings: { audience: "internal" }, generatedAt: "2026-05-23T00:00:00.000Z" });
    const bidForm = createProposalWorkbook(model).getWorksheet("Bid Form");

    // Header 17 → section A header 18, data 19-20, subtotal 21, section B header 22.
    expect(bidForm?.getCell("A18").value).toBe("A  Preliminaries");
    expect(bidForm?.getCell("A22").value).toBe("B  Finishes");
    // Item numbers restart per section: Preliminaries rows are 1, 2; Finishes row is 1.
    expect(bidForm?.getCell("A19").value).toBe("1");
    expect(bidForm?.getCell("A20").value).toBe("2");
    expect(bidForm?.getCell("A23").value).toBe("1");
  });

  it("writes static values instead of formulas when includeFormulas is false (P2-T3, F-12)", () => {
    const model = buildProposalExportModel({
      metadata,
      nodes: modelTree(),
      settings: { audience: "internal", includeFormulas: false },
      generatedAt: "2026-05-23T00:00:00.000Z",
    });
    const workbook = createProposalWorkbook(model);
    const bidForm = workbook.getWorksheet("Bid Form");
    const summary = workbook.getWorksheet("Summary");

    // Material (E19) and LINE TOTAL (F19) are plain numbers, not formula objects.
    expect(bidForm?.getCell("E19").value).toBe(950);
    expect(bidForm?.getCell("F19").value).toBe(21_700);
    // The Summary Grand Total is a static value too.
    expect(summary?.getCell("B20").value).toBe(26_734.4);
  });

  it("derives Bid Form formula columns from BID_FORM_COLUMNS so a reorder can't break them (P2-T8, F-21)", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), settings: { audience: "internal" }, generatedAt: "2026-05-23T00:00:00.000Z" });
    const bidForm = createProposalWorkbook(model).getWorksheet("Bid Form");
    const col = BID_FORM_COLUMN_LETTERS;

    const lineTotal = bidForm?.getCell("F19").value as { formula: string };
    // Recalc parity: the material product is rounded to 2dp before adjustments, mirroring the
    // model's costAmount; columns derived from BID_FORM_COLUMNS so a reorder can't misalign.
    expect(lineTotal.formula).toContain(`ROUND(${col.quantity}19*${col.material}19,2)`);
    expect(lineTotal.formula).toContain(`${col.scope}19="EXCLUDED"`);
  });

  it("writes the Grand Total amount in words and an accounting peso format (P3-T4, F-28/F-34)", () => {
    const model = buildProposalExportModel({ metadata, nodes: modelTree(), settings: { audience: "internal" }, generatedAt: "2026-05-23T00:00:00.000Z" });
    const workbook = createProposalWorkbook(model);
    const summary = workbook.getWorksheet("Summary");
    const bidForm = workbook.getWorksheet("Bid Form");

    // 1 section → totals start 17, Grand Total 20 (26,734.40), Cost/sqm 21, Duration 22, words 23.
    expect(summary?.getCell("A23").value).toBe("Amount in words");
    expect(summary?.getCell("B23").value).toBe("Twenty-Six Thousand Seven Hundred Thirty-Four Pesos and 40/100");
    // Money cells use the accounting peso mask ([$₱-3409] locale token).
    expect(bidForm?.getCell("E19").numFmt).toContain("[$₱-3409]");
  });

  it("derives workbook currency displays from export metadata without changing PHP compatibility", () => {
    const model = buildProposalExportModel({
      metadata: { ...metadata, currency: "USD" },
      nodes: [
        {
          id: "area",
          name: "Area",
          kind: "area",
          total: "0",
          estimateRowItems: [row({ quantity: 1, itemCost: 100, contingencyPercentage: 10, miscCost: 5 })],
        },
      ],
      settings: { audience: "internal" },
      generatedAt: "2026-05-23T00:00:00.000Z",
    });

    const workbook = createProposalWorkbook(model);
    const bidForm = workbook.getWorksheet("Bid Form");
    const summary = workbook.getWorksheet("Summary");
    const breakdown = workbook.getWorksheet("Source Breakdown");

    expect(bidForm?.getCell("E19").numFmt).toContain('"USD"');
    expect(bidForm?.getCell("H19").value).toContain("USD 10.00");
    expect(summary?.getCell("C15").numFmt).toContain('"USD"');
    expect(summary?.getCell("B23").value).toContain("USD");
    expect(breakdown?.getCell("H7").numFmt).toContain('"USD"');
  });

  it("renders an EXCLUSIONS block for excluded-scope rows (P3-T2, F-29)", () => {
    const nodes: EstimateTreeNode[] = [
      {
        id: "group",
        name: "Group",
        kind: "group",
        total: "₱0.00",
        children: [
          {
            id: "area",
            name: "Area",
            kind: "area",
            total: "₱0.00",
            estimateRowItems: [
              row({ id: "incl", material: "Floor Tile", quantity: 1, itemCost: 1_000, category: "Finishes" }),
              row({ id: "excl", material: "Owner Fixtures", quantity: 1, itemCost: 500, category: "Finishes", scopeStatus: "by_others" }),
            ],
          },
        ],
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes, settings: { audience: "internal" }, generatedAt: "2026-05-23T00:00:00.000Z" });
    const bidForm = createProposalWorkbook(model).getWorksheet("Bid Form");

    let exclusionsHeaderRow = -1;
    bidForm?.eachRow((sheetRow, rowNumber) => {
      if (typeof sheetRow.getCell(1).value === "string" && String(sheetRow.getCell(1).value).startsWith("EXCLUSIONS")) {
        exclusionsHeaderRow = rowNumber;
      }
    });
    expect(exclusionsHeaderRow).toBeGreaterThan(0);

    const excludedItem = bidForm?.getRow(exclusionsHeaderRow + 1);
    expect(String(excludedItem?.getCell(2).value)).toContain("Owner Fixtures");
    expect(excludedItem?.getCell(6).value).toBe(0); // line total zeroed
    expect(excludedItem?.getCell(7).value).toBe("BY OTHERS"); // scope label
  });
});
