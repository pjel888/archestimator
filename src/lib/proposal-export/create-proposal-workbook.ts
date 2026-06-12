import ExcelJS from "exceljs";

import type { ProposalExportModel, ProposalExportWorkbookTab, ProposalTabbedWorkbookModel } from "./types";
import { quoteWorksheetCellReference } from "./worksheet-name";

export type ProposalWorkbookColumn = {
  key: string;
  header: string;
  width: number;
  style?: Partial<ExcelJS.Style>;
};

const PHP_FORMAT = '₱ #,##0.00;[Red]-₱ #,##0.00';
const QUANTITY_FORMAT = '#,##0.####';
const DETAIL_HEADER_ROW = 17;
const SUMMARY_HEADER_ROW = 14;

export const BID_FORM_COLUMNS = [
  { key: "item", header: "ITEM", width: 9 },
  { key: "particulars", header: "PARTICULARS", width: 42 },
  { key: "unit", header: "UNIT", width: 10 },
  { key: "quantity", header: "QTY", width: 12, style: { numFmt: QUANTITY_FORMAT } },
  { key: "material", header: "MATERIAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "labor", header: "LABOR", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "costTotal", header: "COST TOTAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "lineTotal", header: "LINE TOTAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "scope", header: "SCOPE", width: 16 },
  { key: "remarks", header: "NOTES / REMARKS", width: 42 },
] as const satisfies ProposalWorkbookColumn[];

const SUMMARY_COLUMNS = [
  { key: "sectionLabel", header: "SECTION", width: 34 },
  { key: "rowCount", header: "ROWS", width: 10 },
  { key: "amount", header: "AMOUNT", width: 18, style: { numFmt: PHP_FORMAT } },
] as const satisfies ProposalWorkbookColumn[];

const BREAKDOWN_COLUMNS = [
  { key: "proposalRowNumber", header: "PROPOSAL NO.", width: 14 },
  { key: "sourceRowId", header: "SOURCE ROW ID", width: 26 },
  { key: "sourceNodeName", header: "AREA", width: 22 },
  { key: "areaPathLabel", header: "AREA PATH", width: 42 },
  { key: "particulars", header: "PARTICULARS", width: 48 },
  { key: "quantity", header: "QTY", width: 12, style: { numFmt: QUANTITY_FORMAT } },
  { key: "unit", header: "UNIT", width: 10 },
  { key: "materialUnitCost", header: "MATERIAL UNIT COST", width: 18, style: { numFmt: PHP_FORMAT } },
  { key: "laborUnitCost", header: "LABOR UNIT COST", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "materialSubtotal", header: "MATERIAL SUBTOTAL", width: 18, style: { numFmt: PHP_FORMAT } },
  { key: "laborSubtotal", header: "LABOR SUBTOTAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "contingencySubtotal", header: "CONTINGENCY / DISCOUNT", width: 20, style: { numFmt: PHP_FORMAT } },
  { key: "miscSubtotal", header: "MISC / OTHER", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "costAmount", header: "COST AMOUNT", width: 18, style: { numFmt: PHP_FORMAT } },
] as const satisfies ProposalWorkbookColumn[];

const BREAKDOWN_COLUMNS_WITH_TAB = [
  { key: "tab", header: "TAB", width: 22 },
  ...BREAKDOWN_COLUMNS,
] as const satisfies ProposalWorkbookColumn[];

function applyColumnDefinitions(worksheet: ExcelJS.Worksheet, columns: readonly ProposalWorkbookColumn[]) {
  worksheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width,
    style: column.style,
  }));
}

function styleTitleRow(row: ExcelJS.Row) {
  row.font = { bold: true, size: 14, color: { argb: "FF111827" } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
}

function styleSubtleRow(row: ExcelJS.Row) {
  row.font = { size: 10, color: { argb: "FF4B5563" } };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
  row.border = {
    top: { style: "thin", color: { argb: "FF111827" } },
    left: { style: "thin", color: { argb: "FF111827" } },
    bottom: { style: "thin", color: { argb: "FF111827" } },
    right: { style: "thin", color: { argb: "FF111827" } },
  };
  row.height = 26;
}

function styleBodyRow(row: ExcelJS.Row) {
  row.font = { size: 10, color: { argb: "FF111827" } };
  row.alignment = { vertical: "top", wrapText: true };
  row.eachCell((cell) => {
    cell.border = {
      bottom: { style: "hair", color: { argb: "FFD1D5DB" } },
    };
  });
}

function styleTotalRow(row: ExcelJS.Row) {
  row.font = { bold: true, size: 10, color: { argb: "FF111827" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  row.border = {
    top: { style: "thin", color: { argb: "FF111827" } },
    bottom: { style: "double", color: { argb: "FF111827" } },
  };
}

function formatPeso(value: number) {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formulaAmountSuffix(value: number) {
  if (!value) return "";
  return value > 0 ? `+${value}` : String(value);
}

function scopeLabel(status: string) {
  if (status === "owner") return "OWNER SUPPLIED";
  return status.replace(/_/g, " ").toLocaleUpperCase("en-PH");
}

function addTitleRow(worksheet: ExcelJS.Worksheet, title: string, mergeThroughColumn = 10) {
  worksheet.addRow([title]);
  styleTitleRow(worksheet.getRow(1));
  worksheet.mergeCells(1, 1, 1, mergeThroughColumn);
}

function addHeaderField(worksheet: ExcelJS.Worksheet, label: string, value: string | null | undefined) {
  const row = worksheet.addRow([label, value ?? ""]);
  row.getCell(1).font = { bold: true, size: 10, color: { argb: "FF111827" } };
  row.getCell(2).font = { size: 10, color: { argb: "FF111827" } };
  row.getCell(2).alignment = { wrapText: true };
}

function setPrintLayout(worksheet: ExcelJS.Worksheet) {
  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };
}

function addGeneralNotes(worksheet: ExcelJS.Worksheet) {
  worksheet.addRow([]);
  const notesTitle = worksheet.addRow(["General Notes"]);
  notesTitle.font = { bold: true, size: 10, color: { argb: "FF111827" } };
  worksheet.addRow([]);
  [
    "1. Do not leave LINE TOTAL blank; formulas or zero values must be visible for every item.",
    "2. Indicate INCLUDED, EXCLUDED, BY OTHERS, OWNER SUPPLIED, OSM, OFCI, OSCI, OMITTED, or NOT APPLICABLE in the SCOPE column.",
    "3. Double-check formulas, section subtotals, and grand totals before issuing.",
    "4. Add non-standard work under OTHERS / MISCELLANEOUS.",
    "5. Use Notes / Remarks for specifications, exclusions, assumptions, or supplier considerations.",
  ].forEach((note) => {
    const row = worksheet.addRow([note]);
    styleSubtleRow(row);
    worksheet.mergeCells(row.number, 1, row.number, 10);
  });
}

type BidSectionRange = {
  sectionLabel: string;
  rowCount: number;
  subtotalRowNumber: number;
  subtotalResult: number;
};

function createBidFormWorksheet(workbook: ExcelJS.Workbook, model: ProposalExportModel, worksheetName = "Bid Form") {
  const worksheet = workbook.addWorksheet(worksheetName, {
    views: [{ state: "frozen", ySplit: DETAIL_HEADER_ROW }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: `${DETAIL_HEADER_ROW}:${DETAIL_HEADER_ROW}`,
    },
  });
  applyColumnDefinitions(worksheet, BID_FORM_COLUMNS);
  addTitleRow(worksheet, "BID FORM / BILL OF QUANTITIES", BID_FORM_COLUMNS.length);
  addHeaderField(worksheet, "Project", model.metadata.projectName);
  addHeaderField(worksheet, "Location", model.metadata.projectAddress);
  addHeaderField(worksheet, "Owner / Client", "");
  addHeaderField(worksheet, "Bidder / Contractor", "Archestimator beta workbook");
  addHeaderField(worksheet, "Estimate / Revision", `${model.metadata.estimateName} (${model.metadata.versionLabel})`);
  addHeaderField(worksheet, "Date Submitted", model.generatedAt.slice(0, 10));
  addGeneralNotes(worksheet);

  while (worksheet.rowCount < DETAIL_HEADER_ROW - 1) worksheet.addRow([]);
  const headerRow = worksheet.addRow(BID_FORM_COLUMNS.map((column) => column.header));
  styleHeaderRow(headerRow);
  const sectionRanges: BidSectionRange[] = [];

  for (const summaryRow of model.summaryRows) {
    const sectionRows = model.proposalRows.filter((proposalRow) => proposalRow.sectionKey === summaryRow.sectionKey);
    const sectionRow = worksheet.addRow([summaryRow.sectionLabel]);
    sectionRow.font = { bold: true, size: 10, color: { argb: "FF111827" } };
    sectionRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    worksheet.mergeCells(sectionRow.number, 1, sectionRow.number, BID_FORM_COLUMNS.length);

    const firstDetailRow = sectionRow.number + 1;
    for (const proposalRow of sectionRows) {
      const rowNumber = worksheet.rowCount + 1;
      const directCostAdjustments = [
        formulaAmountSuffix(proposalRow.contingencySubtotal),
        formulaAmountSuffix(proposalRow.miscSubtotal),
      ].join("") || "+0";
      const lineFormula = `IF(OR(I${rowNumber}="EXCLUDED",I${rowNumber}="BY OTHERS",I${rowNumber}="OWNER SUPPLIED",I${rowNumber}="OSM",I${rowNumber}="OFCI",I${rowNumber}="OSCI",I${rowNumber}="OMITTED",I${rowNumber}="NOT APPLICABLE"),0,D${rowNumber}*G${rowNumber}${directCostAdjustments})`;
      const remarks = [
        proposalRow.contingencySubtotal ? `Contingency: ${formatPeso(proposalRow.contingencySubtotal)}` : null,
        proposalRow.miscSubtotal ? `Misc / other: ${formatPeso(proposalRow.miscSubtotal)}` : null,
        proposalRow.remarks,
      ]
        .filter(Boolean)
        .join(" | ");
      const row = worksheet.addRow([
        proposalRow.rowNumber,
        proposalRow.particulars,
        proposalRow.unit,
        proposalRow.quantity,
        proposalRow.materialUnitCost,
        proposalRow.laborUnitCost,
        { formula: `E${rowNumber}+F${rowNumber}`, result: proposalRow.materialUnitCost + proposalRow.laborUnitCost },
        { formula: lineFormula, result: proposalRow.includedInTotal ? proposalRow.costAmount : 0 },
        scopeLabel(proposalRow.scopeStatus),
        remarks,
      ]);
      styleBodyRow(row);
    }

    const lastDetailRow = worksheet.rowCount;
    const subtotalRow = worksheet.addRow([
      "",
      `${summaryRow.sectionLabel} subtotal`,
      "",
      "",
      "",
      "",
      "",
      { formula: `SUM(H${firstDetailRow}:H${lastDetailRow})`, result: summaryRow.costAmount },
      "",
      "",
    ]);
    styleTotalRow(subtotalRow);
    sectionRanges.push({
      sectionLabel: summaryRow.sectionLabel,
      rowCount: sectionRows.length,
      subtotalRowNumber: subtotalRow.number,
      subtotalResult: summaryRow.costAmount,
    });
  }

  setPrintLayout(worksheet);
  worksheet.pageSetup.printTitlesRow = `${DETAIL_HEADER_ROW}:${DETAIL_HEADER_ROW}`;
  return { worksheet, sectionRanges };
}

function createSummaryWorksheet(workbook: ExcelJS.Workbook, model: ProposalExportModel, sectionRanges: BidSectionRange[], bidWorksheetName = "Bid Form") {
  const worksheet = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: SUMMARY_HEADER_ROW }],
  });
  applyColumnDefinitions(worksheet, SUMMARY_COLUMNS);
  addTitleRow(worksheet, "SUMMARY OF BID", SUMMARY_COLUMNS.length);
  addHeaderField(worksheet, "Project", model.metadata.projectName);
  addHeaderField(worksheet, "Location", model.metadata.projectAddress);
  addHeaderField(worksheet, "Estimate / Revision", `${model.metadata.estimateName} (${model.metadata.versionLabel})`);
  addHeaderField(worksheet, "Generated", model.generatedAt);

  while (worksheet.rowCount < SUMMARY_HEADER_ROW - 1) worksheet.addRow([]);
  const headerRow = worksheet.addRow(SUMMARY_COLUMNS.map((column) => column.header));
  styleHeaderRow(headerRow);

  sectionRanges.forEach((sectionRange) => {
    const row = worksheet.addRow([
      sectionRange.sectionLabel,
      sectionRange.rowCount,
      {
        formula: quoteWorksheetCellReference(bidWorksheetName, `H${sectionRange.subtotalRowNumber}`),
        result: sectionRange.subtotalResult,
      },
    ]);
    styleBodyRow(row);
  });

  const firstSummaryRow = SUMMARY_HEADER_ROW + 1;
  const lastSummaryRow = Math.max(firstSummaryRow, worksheet.rowCount);
  while (worksheet.rowCount < 26) worksheet.addRow([]);
  worksheet.getCell("A27").value = "Direct Cost";
  worksheet.getCell("B27").value = { formula: `SUM(C${firstSummaryRow}:C${lastSummaryRow})`, result: model.totals.grandTotal };
  worksheet.getCell("A28").value = "Contingency";
  worksheet.getCell("B28").value = { formula: "0", result: 0 };
  worksheet.getCell("A29").value = "VAT";
  worksheet.getCell("B29").value = { formula: "0", result: 0 };
  worksheet.getCell("A30").value = "Grand Total";
  worksheet.getCell("B30").value = { formula: "B27+B28+B29", result: model.totals.grandTotal };
  worksheet.getCell("A31").value = "Cost per sqm";
  worksheet.getCell("B31").value = "N/A";
  worksheet.getCell("A32").value = "Estimated duration";
  worksheet.getCell("B32").value = "To be confirmed";

  [27, 28, 29, 30].forEach((rowNumber) => {
    const row = worksheet.getRow(rowNumber);
    row.getCell(1).font = { bold: rowNumber === 30, size: 10, color: { argb: "FF111827" } };
    row.getCell(2).numFmt = PHP_FORMAT;
    row.getCell(2).font = { bold: rowNumber === 30, size: rowNumber === 30 ? 12 : 10, color: { argb: "FF111827" } };
  });
  styleTotalRow(worksheet.getRow(30));
  setPrintLayout(worksheet);
  return worksheet;
}

function createCommercialTermsWorksheet(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Commercial Terms", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  worksheet.columns = [{ width: 30 }, { width: 72 }];
  addTitleRow(worksheet, "COMMERCIAL TERMS", 2);
  worksheet.addRow([]);
  [
    ["Exclusions", "Items not expressly included in the bid form remain excluded unless confirmed in writing."],
    ["Qualifications", "Amounts are generated from the current estimate data and remain subject to supplier quote verification."],
    ["Payment Terms", "To be confirmed by the contractor and client before issuance."],
    ["Validity", "Pricing validity to be confirmed."],
    ["Warranty", "Warranty terms to be confirmed by supplier and contractor."],
  ].forEach(([label, value]) => {
    const row = worksheet.addRow([label, value]);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: "FF111827" } };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.height = 30;
  });

  while (worksheet.rowCount < 12) worksheet.addRow([]);
  worksheet.getCell("A13").value = "Signature / Conforme";
  worksheet.getCell("A13").font = { bold: true, size: 10, color: { argb: "FF111827" } };
  worksheet.getCell("A15").value = "Prepared by:";
  worksheet.getCell("B15").value = "Accepted by:";
  worksheet.getCell("A18").value = "Name / Signature / Date";
  worksheet.getCell("B18").value = "Name / Signature / Date";
  setPrintLayout(worksheet);
  return worksheet;
}

function populateTabbedSummaryWorksheet(worksheet: ExcelJS.Worksheet, input: ProposalTabbedWorkbookModel, tabRanges: Array<{ tab: ProposalExportWorkbookTab; sectionRanges: BidSectionRange[] }>) {
  applyColumnDefinitions(worksheet, SUMMARY_COLUMNS);
  addTitleRow(worksheet, "SUMMARY OF BID", SUMMARY_COLUMNS.length);
  addHeaderField(worksheet, "Project", input.metadata.projectName);
  addHeaderField(worksheet, "Location", input.metadata.projectAddress);
  addHeaderField(worksheet, "Estimate / Revision", `${input.metadata.estimateName} (${input.metadata.versionLabel})`);
  addHeaderField(worksheet, "Generated", input.generatedAt);

  while (worksheet.rowCount < SUMMARY_HEADER_ROW - 1) worksheet.addRow([]);
  const headerRow = worksheet.addRow(SUMMARY_COLUMNS.map((column) => column.header));
  styleHeaderRow(headerRow);

  const amountRows: number[] = [];
  for (const { tab, sectionRanges } of tabRanges) {
    const tabHeaderRow = worksheet.addRow([tab.tabName]);
    tabHeaderRow.font = { bold: true, size: 10, color: { argb: "FF111827" } };
    tabHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    worksheet.mergeCells(tabHeaderRow.number, 1, tabHeaderRow.number, SUMMARY_COLUMNS.length);

    if (sectionRanges.length === 0) {
      const emptyRow = worksheet.addRow(["No exportable rows", 0, { formula: "0", result: 0 }]);
      styleBodyRow(emptyRow);
      amountRows.push(emptyRow.number);
      continue;
    }

    sectionRanges.forEach((sectionRange) => {
      const row = worksheet.addRow([
        sectionRange.sectionLabel,
        sectionRange.rowCount,
        {
          formula: quoteWorksheetCellReference(tab.worksheetName, `H${sectionRange.subtotalRowNumber}`),
          result: sectionRange.subtotalResult,
        },
      ]);
      styleBodyRow(row);
      amountRows.push(row.number);
    });
  }

  const totalsStartRow = worksheet.rowCount + 2;
  const directCostFormula = amountRows.length > 0 ? `SUM(${amountRows.map((rowNumber) => `C${rowNumber}`).join(",")})` : "0";
  const grandTotal = tabRanges.reduce((total, { tab }) => total + tab.model.totals.grandTotal, 0);
  worksheet.getCell(`A${totalsStartRow}`).value = "Direct Cost";
  worksheet.getCell(`B${totalsStartRow}`).value = { formula: directCostFormula, result: grandTotal };
  worksheet.getCell(`A${totalsStartRow + 1}`).value = "Contingency";
  worksheet.getCell(`B${totalsStartRow + 1}`).value = { formula: "0", result: 0 };
  worksheet.getCell(`A${totalsStartRow + 2}`).value = "VAT";
  worksheet.getCell(`B${totalsStartRow + 2}`).value = { formula: "0", result: 0 };
  worksheet.getCell(`A${totalsStartRow + 3}`).value = "Grand Total";
  worksheet.getCell(`B${totalsStartRow + 3}`).value = {
    formula: `B${totalsStartRow}+B${totalsStartRow + 1}+B${totalsStartRow + 2}`,
    result: grandTotal,
  };
  worksheet.getCell(`A${totalsStartRow + 4}`).value = "Cost per sqm";
  worksheet.getCell(`B${totalsStartRow + 4}`).value = "N/A";
  worksheet.getCell(`A${totalsStartRow + 5}`).value = "Estimated duration";
  worksheet.getCell(`B${totalsStartRow + 5}`).value = "To be confirmed";

  [totalsStartRow, totalsStartRow + 1, totalsStartRow + 2, totalsStartRow + 3].forEach((rowNumber) => {
    const row = worksheet.getRow(rowNumber);
    row.getCell(1).font = { bold: rowNumber === totalsStartRow + 3, size: 10, color: { argb: "FF111827" } };
    row.getCell(2).numFmt = PHP_FORMAT;
    row.getCell(2).font = { bold: rowNumber === totalsStartRow + 3, size: rowNumber === totalsStartRow + 3 ? 12 : 10, color: { argb: "FF111827" } };
  });
  styleTotalRow(worksheet.getRow(totalsStartRow + 3));
  setPrintLayout(worksheet);
  return worksheet;
}

function createSourceBreakdownWorksheet(workbook: ExcelJS.Workbook, model: ProposalExportModel) {
  const worksheet = workbook.addWorksheet("Source Breakdown", {
    views: [{ state: "frozen", ySplit: 6 }],
  });
  applyColumnDefinitions(worksheet, BREAKDOWN_COLUMNS);
  addTitleRow(worksheet, "Source Breakdown", BREAKDOWN_COLUMNS.length);
  addHeaderField(worksheet, "Project", model.metadata.projectName);
  addHeaderField(worksheet, "Estimate", model.metadata.estimateName);
  addHeaderField(worksheet, "Generated", model.generatedAt);
  worksheet.addRow([]);
  const headerRow = worksheet.addRow(BREAKDOWN_COLUMNS.map((column) => column.header));
  styleHeaderRow(headerRow);

  model.sourceBreakdownRows.forEach((breakdownRow) => {
    const row = worksheet.addRow([
      breakdownRow.proposalRowNumber,
      breakdownRow.sourceRowId,
      breakdownRow.sourceNodeName,
      breakdownRow.areaPathLabel,
      breakdownRow.particulars,
      breakdownRow.quantity,
      breakdownRow.unit,
      breakdownRow.materialUnitCost,
      breakdownRow.laborUnitCost,
      breakdownRow.materialSubtotal,
      breakdownRow.laborSubtotal,
      breakdownRow.contingencySubtotal,
      breakdownRow.miscSubtotal,
      breakdownRow.costAmount,
    ]);
    styleBodyRow(row);
  });

  setPrintLayout(worksheet);
  return worksheet;
}

function createTabbedSourceBreakdownWorksheet(workbook: ExcelJS.Workbook, input: ProposalTabbedWorkbookModel) {
  const worksheet = workbook.addWorksheet("Source Breakdown", {
    views: [{ state: "frozen", ySplit: 6 }],
  });
  applyColumnDefinitions(worksheet, BREAKDOWN_COLUMNS_WITH_TAB);
  addTitleRow(worksheet, "Source Breakdown", BREAKDOWN_COLUMNS_WITH_TAB.length);
  addHeaderField(worksheet, "Project", input.metadata.projectName);
  addHeaderField(worksheet, "Estimate", input.metadata.estimateName);
  addHeaderField(worksheet, "Generated", input.generatedAt);
  worksheet.addRow([]);
  const headerRow = worksheet.addRow(BREAKDOWN_COLUMNS_WITH_TAB.map((column) => column.header));
  styleHeaderRow(headerRow);

  input.tabs.forEach((tab) => {
    tab.model.sourceBreakdownRows.forEach((breakdownRow) => {
      const row = worksheet.addRow([
        tab.tabName,
        breakdownRow.proposalRowNumber,
        breakdownRow.sourceRowId,
        breakdownRow.sourceNodeName,
        breakdownRow.areaPathLabel,
        breakdownRow.particulars,
        breakdownRow.quantity,
        breakdownRow.unit,
        breakdownRow.materialUnitCost,
        breakdownRow.laborUnitCost,
        breakdownRow.materialSubtotal,
        breakdownRow.laborSubtotal,
        breakdownRow.contingencySubtotal,
        breakdownRow.miscSubtotal,
        breakdownRow.costAmount,
      ]);
      styleBodyRow(row);
    });
  });

  setPrintLayout(worksheet);
  return worksheet;
}

function isTabbedWorkbookModel(input: ProposalExportModel | ProposalTabbedWorkbookModel): input is ProposalTabbedWorkbookModel {
  return "tabs" in input;
}

function createBaseWorkbook(input: ProposalExportModel | ProposalTabbedWorkbookModel) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Archestimator";
  workbook.lastModifiedBy = "Archestimator";
  workbook.created = new Date(input.generatedAt);
  workbook.modified = new Date(input.generatedAt);
  workbook.title = `${input.metadata.projectName} — ${input.metadata.estimateName}`;
  workbook.subject = "Industry-standard proposal workbook";
  workbook.company = "Archestimator";
  return workbook;
}

export function createProposalWorkbook(input: ProposalExportModel | ProposalTabbedWorkbookModel) {
  const workbook = createBaseWorkbook(input);

  if (isTabbedWorkbookModel(input)) {
    const summaryWorksheet = workbook.addWorksheet("Summary", {
      views: [{ state: "frozen", ySplit: SUMMARY_HEADER_ROW }],
    });
    const tabRanges = input.tabs.map((tab) => ({
      tab,
      sectionRanges: createBidFormWorksheet(workbook, tab.model, tab.worksheetName).sectionRanges,
    }));
    populateTabbedSummaryWorksheet(summaryWorksheet, input, tabRanges);
    createCommercialTermsWorksheet(workbook);
    if (input.settings.includeSourceBreakdownSheet) {
      createTabbedSourceBreakdownWorksheet(workbook, input);
    }
    return workbook;
  }

  const { sectionRanges } = createBidFormWorksheet(workbook, input);
  createSummaryWorksheet(workbook, input, sectionRanges);
  createCommercialTermsWorksheet(workbook);
  if (input.settings.includeSourceBreakdownSheet) {
    createSourceBreakdownWorksheet(workbook, input);
  }

  return workbook;
}

export async function createProposalWorkbookBuffer(input: ProposalExportModel | ProposalTabbedWorkbookModel): Promise<Buffer> {
  const workbook = createProposalWorkbook(input);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
