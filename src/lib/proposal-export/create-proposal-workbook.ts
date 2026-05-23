import ExcelJS from "exceljs";

import type { ProposalExportModel } from "./types";

export type ProposalWorkbookColumn = {
  key: string;
  header: string;
  width: number;
  style?: Partial<ExcelJS.Style>;
};

const PHP_FORMAT = '₱ #,##0.00;[Red]-₱ #,##0.00';
const QUANTITY_FORMAT = '#,##0.####';

export const DETAILED_ESTIMATE_COLUMNS = [
  { key: "rowNumber", header: "NO.", width: 8 },
  { key: "tag", header: "TAG", width: 18 },
  { key: "particulars", header: "PARTICULARS", width: 48 },
  { key: "quantity", header: "QTY", width: 12, style: { numFmt: QUANTITY_FORMAT } },
  { key: "unit", header: "UNIT", width: 10 },
  { key: "materialUnitCost", header: "MATERIAL UNIT COST", width: 18, style: { numFmt: PHP_FORMAT } },
  { key: "laborUnitCost", header: "LABOR UNIT COST", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "materialSubtotal", header: "MATERIAL SUBTOTAL", width: 18, style: { numFmt: PHP_FORMAT } },
  { key: "laborSubtotal", header: "LABOR SUBTOTAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "miscSubtotal", header: "MISC / OTHER", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "costAmount", header: "COST AMOUNT", width: 18, style: { numFmt: PHP_FORMAT } },
  { key: "remarks", header: "REMARKS", width: 44 },
] as const satisfies ProposalWorkbookColumn[];

const SUMMARY_COLUMNS = [
  { key: "sectionLabel", header: "SECTION", width: 28 },
  { key: "rowCount", header: "ROWS", width: 10 },
  { key: "totalQuantity", header: "TOTAL QTY", width: 14, style: { numFmt: QUANTITY_FORMAT } },
  { key: "materialSubtotal", header: "MATERIAL SUBTOTAL", width: 18, style: { numFmt: PHP_FORMAT } },
  { key: "laborSubtotal", header: "LABOR SUBTOTAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "miscSubtotal", header: "MISC / OTHER", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "costAmount", header: "COST AMOUNT", width: 18, style: { numFmt: PHP_FORMAT } },
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
  { key: "miscSubtotal", header: "MISC / OTHER", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "costAmount", header: "COST AMOUNT", width: 18, style: { numFmt: PHP_FORMAT } },
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

function addMetadataRows(worksheet: ExcelJS.Worksheet, model: ProposalExportModel, title: string) {
  worksheet.addRow([title]);
  styleTitleRow(worksheet.getRow(1));
  worksheet.mergeCells(1, 1, 1, Math.max(worksheet.columnCount, 8));

  worksheet.addRow([model.metadata.projectName]);
  worksheet.addRow([`Estimate: ${model.metadata.estimateName} (${model.metadata.estimateSheetCode})`]);
  worksheet.addRow([`Version: ${model.metadata.versionLabel}`]);
  worksheet.addRow([`Generated: ${model.generatedAt}`]);
  worksheet.addRow([`Currency: ${model.metadata.currency}`]);

  for (let rowNumber = 2; rowNumber <= 6; rowNumber += 1) {
    styleSubtleRow(worksheet.getRow(rowNumber));
  }
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

function createSummaryWorksheet(workbook: ExcelJS.Workbook, model: ProposalExportModel) {
  const worksheet = workbook.addWorksheet("Proposal Summary", {
    views: [{ state: "frozen", ySplit: 10 }],
  });
  applyColumnDefinitions(worksheet, SUMMARY_COLUMNS);
  addMetadataRows(worksheet, model, "Proposal Summary");

  worksheet.getCell("A7").value = "Grand Total";
  worksheet.getCell("A7").font = { bold: true };
  worksheet.getCell("B7").value = model.totals.grandTotal;
  worksheet.getCell("B7").numFmt = PHP_FORMAT;
  worksheet.getCell("B7").font = { bold: true, size: 12 };

  worksheet.addRow([]);
  worksheet.addRow([]);
  const headerRow = worksheet.addRow(SUMMARY_COLUMNS.map((column) => column.header));
  styleHeaderRow(headerRow);

  model.summaryRows.forEach((summaryRow) => {
    const row = worksheet.addRow([
      summaryRow.sectionLabel,
      summaryRow.rowCount,
      summaryRow.totalQuantity,
      summaryRow.materialSubtotal,
      summaryRow.laborSubtotal,
      summaryRow.miscSubtotal,
      summaryRow.costAmount,
    ]);
    styleBodyRow(row);
  });

  setPrintLayout(worksheet);
  return worksheet;
}

function createDetailedEstimateWorksheet(workbook: ExcelJS.Workbook, model: ProposalExportModel) {
  const worksheet = workbook.addWorksheet("Detailed Estimate", {
    views: [{ state: "frozen", ySplit: 8 }],
  });
  applyColumnDefinitions(worksheet, DETAILED_ESTIMATE_COLUMNS);
  addMetadataRows(worksheet, model, "Detailed Estimate");

  worksheet.addRow([]);
  const headerRow = worksheet.addRow(DETAILED_ESTIMATE_COLUMNS.map((column) => column.header));
  styleHeaderRow(headerRow);

  model.proposalRows.forEach((proposalRow) => {
    const row = worksheet.addRow([
      proposalRow.rowNumber,
      proposalRow.tag,
      proposalRow.particulars,
      proposalRow.quantity,
      proposalRow.unit,
      proposalRow.materialUnitCost,
      proposalRow.laborUnitCost,
      proposalRow.materialSubtotal,
      proposalRow.laborSubtotal,
      proposalRow.miscSubtotal,
      proposalRow.costAmount,
      proposalRow.remarks,
    ]);
    styleBodyRow(row);
  });

  const totalRow = worksheet.addRow([
    "",
    "",
    "GRAND TOTAL",
    "",
    "",
    "",
    "",
    model.totals.materialSubtotal,
    model.totals.laborSubtotal,
    model.totals.miscSubtotal,
    model.totals.grandTotal,
    "",
  ]);
  styleTotalRow(totalRow);

  worksheet.autoFilter = {
    from: { row: 8, column: 1 },
    to: { row: 8, column: DETAILED_ESTIMATE_COLUMNS.length },
  };
  setPrintLayout(worksheet);
  return worksheet;
}

function createAreaBreakdownWorksheet(workbook: ExcelJS.Workbook, model: ProposalExportModel) {
  const worksheet = workbook.addWorksheet("Area Breakdown", {
    views: [{ state: "frozen", ySplit: 7 }],
  });
  applyColumnDefinitions(worksheet, BREAKDOWN_COLUMNS);
  addMetadataRows(worksheet, model, "Area Breakdown");

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
      breakdownRow.miscSubtotal,
      breakdownRow.costAmount,
    ]);
    styleBodyRow(row);
  });

  setPrintLayout(worksheet);
  return worksheet;
}

export function createProposalWorkbook(model: ProposalExportModel) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Archestimator";
  workbook.lastModifiedBy = "Archestimator";
  workbook.created = new Date(model.generatedAt);
  workbook.modified = new Date(model.generatedAt);
  workbook.title = `${model.metadata.projectName} — ${model.metadata.estimateName}`;
  workbook.subject = "Industry-standard proposal workbook";
  workbook.company = "Archestimator";

  createSummaryWorksheet(workbook, model);
  createDetailedEstimateWorksheet(workbook, model);
  if (model.settings.includeSourceBreakdownSheet) {
    createAreaBreakdownWorksheet(workbook, model);
  }

  return workbook;
}

export async function createProposalWorkbookBuffer(model: ProposalExportModel): Promise<Buffer> {
  const workbook = createProposalWorkbook(model);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
