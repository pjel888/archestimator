import ExcelJS from "exceljs";

import type { ProposalExportMetadata, ProposalExportModel, ProposalExportSettings, ProposalExportTotals, ProposalExportWorkbookTab, ProposalSourceBreakdownRow, ProposalTabbedWorkbookModel } from "./types";
import { applyAudiencePolicy, resolveProjectCharges } from "./build-proposal-export-model";
import { quoteWorksheetCellReference } from "./worksheet-name";

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

// A percent rate (0–100) as the decimal multiplier used in the cell formula, e.g. 12 → "0.12".
function rateDecimal(rate: number) {
  return String(rate / 100);
}

// P2-T3 (F-12): includeFormulas=false writes the computed value instead of a live formula,
// for consumers that want a static values-only workbook.
function formulaCell(includeFormulas: boolean, formula: string, result: number): ExcelJS.CellValue {
  return includeFormulas ? { formula, result } : result;
}

// P2-T5/F-09: section division letter by position — 0→A, 25→Z, 26→AA, … (Excel-column style).
function divisionLetter(index: number) {
  let n = index;
  let letter = "";
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

export type ProposalWorkbookColumn = {
  key: string;
  header: string;
  width: number;
  style?: Partial<ExcelJS.Style>;
};

// P3-T4 (F-34, 09 §5): the 4-part accounting peso mask (positive · negative · zero-as-dash ·
// text) with the [$₱-3409] locale token, so amounts column-align on the decimal with the symbol
// left-flush — matching the 10 reference BOQs.
const PHP_FORMAT = '_-[$₱-3409]* #,##0.00_-;-[$₱-3409]* #,##0.00_-;_-[$₱-3409]* "-"??_-;_-@_-';
const QUANTITY_FORMAT = '#,##0.####';
// F-18 (P1-T7): force text type on every data string column so a cell whose text begins
// with =, +, -, @ (CSV/formula-injection vectors) is written and read as literal text, never
// a formula. Q5-compliant: the value is shown verbatim (no leading char stripped, no visible
// quote-prefix corruption). ExcelJS lacks the invisible Excel quotePrefix attribute, so a
// text numFmt is the non-corrupting defense; the workbook's string cells are never formulas.
const TEXT_FORMAT = "@";
const DETAIL_HEADER_ROW = 17;
const SUMMARY_HEADER_ROW = 14;

// F-01 (P1-T9): until real labor data lands (P3-T1/D1), labor is exported as 0. A visible
// in-file caveat keeps a LABOR=0 column from silently implying labor is priced at zero.
const LABOR_DISCLAIMER_NOTE =
  "NOTE: LABOR is not yet captured in the source estimate — figures reflect MATERIAL-ONLY pricing. Capture labor before issuing this bid.";

export const BID_FORM_COLUMNS = [
  { key: "item", header: "ITEM", width: 9, style: { numFmt: TEXT_FORMAT } },
  { key: "particulars", header: "PARTICULARS", width: 42, style: { numFmt: TEXT_FORMAT } },
  { key: "unit", header: "UNIT", width: 10, style: { numFmt: TEXT_FORMAT } },
  { key: "quantity", header: "QTY", width: 12, style: { numFmt: QUANTITY_FORMAT } },
  { key: "material", header: "MATERIAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "labor", header: "LABOR", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "costTotal", header: "COST TOTAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "lineTotal", header: "LINE TOTAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "scope", header: "SCOPE", width: 16, style: { numFmt: TEXT_FORMAT } },
  { key: "remarks", header: "NOTES / REMARKS", width: 42, style: { numFmt: TEXT_FORMAT } },
] as const satisfies ProposalWorkbookColumn[];

// F-21 (P2-T8): derive the Excel column letter for each Bid Form column from its position so
// the recalc formulas (COST TOTAL, LINE TOTAL, subtotals, Summary cross-refs) follow a column
// reorder instead of silently pointing at the wrong cell. Guarded by a workbook test.
export const BID_FORM_COLUMN_LETTERS = Object.fromEntries(
  BID_FORM_COLUMNS.map((column, index) => [column.key, String.fromCharCode(65 + index)]),
) as Record<(typeof BID_FORM_COLUMNS)[number]["key"], string>;

const SUMMARY_COLUMNS = [
  { key: "sectionLabel", header: "SECTION", width: 34, style: { numFmt: TEXT_FORMAT } },
  { key: "rowCount", header: "ROWS", width: 10 },
  { key: "amount", header: "AMOUNT", width: 18, style: { numFmt: PHP_FORMAT } },
] as const satisfies ProposalWorkbookColumn[];

const BREAKDOWN_COLUMNS = [
  { key: "proposalRowNumber", header: "PROPOSAL NO.", width: 14, style: { numFmt: TEXT_FORMAT } },
  { key: "sourceRowId", header: "SOURCE ROW ID", width: 26, style: { numFmt: TEXT_FORMAT } },
  { key: "sourceNodeName", header: "AREA", width: 22, style: { numFmt: TEXT_FORMAT } },
  { key: "areaPathLabel", header: "AREA PATH", width: 42, style: { numFmt: TEXT_FORMAT } },
  { key: "particulars", header: "PARTICULARS", width: 48, style: { numFmt: TEXT_FORMAT } },
  { key: "quantity", header: "QTY", width: 12, style: { numFmt: QUANTITY_FORMAT } },
  { key: "unit", header: "UNIT", width: 10, style: { numFmt: TEXT_FORMAT } },
  { key: "materialUnitCost", header: "MATERIAL UNIT COST", width: 18, style: { numFmt: PHP_FORMAT } },
  { key: "laborUnitCost", header: "LABOR UNIT COST", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "materialSubtotal", header: "MATERIAL SUBTOTAL", width: 18, style: { numFmt: PHP_FORMAT } },
  { key: "laborSubtotal", header: "LABOR SUBTOTAL", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "contingencySubtotal", header: "CONTINGENCY / DISCOUNT", width: 20, style: { numFmt: PHP_FORMAT } },
  { key: "miscSubtotal", header: "MISC / OTHER", width: 16, style: { numFmt: PHP_FORMAT } },
  { key: "costAmount", header: "COST AMOUNT", width: 18, style: { numFmt: PHP_FORMAT } },
] as const satisfies ProposalWorkbookColumn[];

const BREAKDOWN_COLUMNS_WITH_TAB = [
  { key: "tab", header: "TAB", width: 22, style: { numFmt: TEXT_FORMAT } },
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

// P3-T4 (F-28): Grand Total amount in words — a required line on a formal bid document.
const WORD_ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const WORD_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const WORD_SCALES = ["", "Thousand", "Million", "Billion", "Trillion"];

function threeDigitWords(value: number) {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundreds > 0) parts.push(`${WORD_ONES[hundreds]} Hundred`);
  if (remainder >= 20) {
    parts.push(WORD_TENS[Math.floor(remainder / 10)] + (remainder % 10 ? `-${WORD_ONES[remainder % 10]}` : ""));
  } else if (remainder > 0) {
    parts.push(WORD_ONES[remainder]);
  }
  return parts.join(" ");
}

function integerToWords(value: number) {
  if (value === 0) return "Zero";
  const groups: number[] = [];
  let remaining = value;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  const words: string[] = [];
  for (let scale = groups.length - 1; scale >= 0; scale -= 1) {
    if (groups[scale] === 0) continue;
    const scaleWord = WORD_SCALES[scale] ?? "";
    words.push(scaleWord ? `${threeDigitWords(groups[scale])} ${scaleWord}` : threeDigitWords(groups[scale]));
  }
  return words.join(" ");
}

function pesoInWords(amount: number) {
  const rounded = roundMoney(amount);
  const pesos = Math.floor(rounded);
  const centavos = Math.round((rounded - pesos) * 100);
  return `${integerToWords(pesos)} Peso${pesos === 1 ? "" : "s"} and ${String(centavos).padStart(2, "0")}/100`;
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

function addGeneralNotes(worksheet: ExcelJS.Worksheet, options: { includeLaborDisclaimer: boolean }) {
  // P2-T4: the two blank spacer rows were trimmed so the expanded title block (Owner/Client,
  // Bidder, Project Ref, Subject) fits without pushing DETAIL_HEADER_ROW past 17 — the pad
  // loop backfills to the same target either way, keeping the data rows at their tested rows.
  const notesTitle = worksheet.addRow(["General Notes"]);
  notesTitle.font = { bold: true, size: 10, color: { argb: "FF111827" } };
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

  if (options.includeLaborDisclaimer) {
    const disclaimerRow = worksheet.addRow([LABOR_DISCLAIMER_NOTE]);
    disclaimerRow.font = { bold: true, size: 10, color: { argb: "FFB45309" } };
    disclaimerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    worksheet.mergeCells(disclaimerRow.number, 1, disclaimerRow.number, 10);
  }
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
  const laborCompatibilityMode = model.validationIssues.some((issue) => issue.code === "cost_split_compatibility_mode");
  const includeFormulas = model.settings.includeFormulas;
  applyColumnDefinitions(worksheet, BID_FORM_COLUMNS);
  addTitleRow(worksheet, "BID FORM / BILL OF QUANTITIES", BID_FORM_COLUMNS.length);
  addHeaderField(worksheet, "Project", model.metadata.projectName);
  addHeaderField(worksheet, "Location", model.metadata.projectAddress);
  // P2-T4: Owner/Client is DB-free (projects.client_name); Bidder is the D4 interim
  // (workspace name) — never the removed beta placeholder.
  addHeaderField(worksheet, "Owner / Client", model.metadata.clientName ?? "");
  addHeaderField(worksheet, "Bidder / Contractor", model.metadata.contractorName ?? "");
  addHeaderField(worksheet, "Project Ref / Code", model.metadata.projectCode ?? "");
  addHeaderField(worksheet, "Subject", model.metadata.subject ?? "");
  addHeaderField(worksheet, "Estimate / Revision", `${model.metadata.estimateName} (${model.metadata.versionLabel})`);
  addHeaderField(worksheet, "Date Submitted", model.generatedAt.slice(0, 10));
  addGeneralNotes(worksheet, { includeLaborDisclaimer: laborCompatibilityMode });

  while (worksheet.rowCount < DETAIL_HEADER_ROW - 1) worksheet.addRow([]);
  const headerRow = worksheet.addRow(BID_FORM_COLUMNS.map((column) => column.header));
  styleHeaderRow(headerRow);
  if (laborCompatibilityMode) {
    headerRow.getCell(6).note = LABOR_DISCLAIMER_NOTE; // LABOR column (F)
  }
  const sectionRanges: BidSectionRange[] = [];

  model.summaryRows.forEach((summaryRow, sectionIndex) => {
    const sectionRows = model.proposalRows.filter((proposalRow) => proposalRow.sectionKey === summaryRow.sectionKey && proposalRow.includedInTotal);
    // P2-T5/F-09: the section header carries the division letter; its rows are numbered 1..k
    // (restarting per section) by renumberProposalRows.
    const sectionRow = worksheet.addRow([`${divisionLetter(sectionIndex)}  ${summaryRow.sectionLabel}`]);
    sectionRow.font = { bold: true, size: 10, color: { argb: "FF111827" } };
    sectionRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    worksheet.mergeCells(sectionRow.number, 1, sectionRow.number, BID_FORM_COLUMNS.length);

    const firstDetailRow = sectionRow.number + 1;
    const col = BID_FORM_COLUMN_LETTERS;
    for (const proposalRow of sectionRows) {
      const rowNumber = worksheet.rowCount + 1;
      const directCostAdjustments = [
        formulaAmountSuffix(proposalRow.contingencySubtotal),
        formulaAmountSuffix(proposalRow.miscSubtotal),
      ].join("") || "+0";
      const scopeRef = `${col.scope}${rowNumber}`;
      // F-? (recalc parity): the model pins costAmount = round(materialUnit*qty) +
      // round(laborUnit*qty) + contingency + misc — each product rounded to 2dp SEPARATELY
      // before summing (build-proposal-export-model.ts normalizeSourceRow). The live LINE
      // TOTAL formula must reproduce that exactly, else a fractional quantity makes the
      // recalculated value (and the SUM subtotals / Grand Total / amount-in-words derived
      // from it) drift a centavo from the pinned figures on open. So round each product in
      // the formula too rather than computing qty*(material+labor) in one multiplication.
      const lineCostFormula = `ROUND(${col.quantity}${rowNumber}*${col.material}${rowNumber},2)+ROUND(${col.quantity}${rowNumber}*${col.labor}${rowNumber},2)${directCostAdjustments}`;
      const lineFormula = `IF(OR(${scopeRef}="EXCLUDED",${scopeRef}="BY OTHERS",${scopeRef}="OWNER SUPPLIED",${scopeRef}="OSM",${scopeRef}="OFCI",${scopeRef}="OSCI",${scopeRef}="OMITTED",${scopeRef}="NOT APPLICABLE"),0,${lineCostFormula})`;
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
        formulaCell(includeFormulas, `${col.material}${rowNumber}+${col.labor}${rowNumber}`, proposalRow.materialUnitCost + proposalRow.laborUnitCost),
        formulaCell(includeFormulas, lineFormula, proposalRow.includedInTotal ? proposalRow.costAmount : 0),
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
      formulaCell(includeFormulas, `SUM(${col.lineTotal}${firstDetailRow}:${col.lineTotal}${lastDetailRow})`, summaryRow.costAmount),
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
  });

  // F-29 (P3-T2): excluded items (scope ≠ included) are listed in a dedicated EXCLUSIONS block
  // with a zero line total, separate from the priced sections and the Grand Total.
  const excludedRows = model.proposalRows.filter((proposalRow) => !proposalRow.includedInTotal);
  if (excludedRows.length > 0) {
    const exclusionsHeader = worksheet.addRow(["EXCLUSIONS — items not included in the bid total"]);
    exclusionsHeader.font = { bold: true, size: 10, color: { argb: "FFB45309" } };
    exclusionsHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    worksheet.mergeCells(exclusionsHeader.number, 1, exclusionsHeader.number, BID_FORM_COLUMNS.length);
    excludedRows.forEach((proposalRow, index) => {
      const row = worksheet.addRow([
        String(index + 1),
        proposalRow.particulars,
        proposalRow.unit,
        proposalRow.quantity,
        proposalRow.materialUnitCost,
        proposalRow.laborUnitCost,
        roundMoney(proposalRow.materialUnitCost + proposalRow.laborUnitCost),
        0,
        scopeLabel(proposalRow.scopeStatus),
        proposalRow.remarks,
      ]);
      styleBodyRow(row);
    });
  }

  setPrintLayout(worksheet);
  worksheet.pageSetup.printTitlesRow = `${DETAIL_HEADER_ROW}:${DETAIL_HEADER_ROW}`;
  return { worksheet, sectionRanges };
}

// F-02 (P2-T1): the totals block (Direct Cost → Contingency → VAT → Grand Total → Cost/sqm →
// Duration), shared by the single-tab and tabbed Summary so the geometry stays identical
// (09 §2). Charge rows are formula-driven so they recalc on open; `result` values come from
// the round-then-sum model totals so the pinned result == the live formula (09 §5 parity).
function writeSummaryTotalsBlock(
  worksheet: ExcelJS.Worksheet,
  totalsStartRow: number,
  directCostFormula: string,
  totals: Pick<ProposalExportTotals, "grandTotal" | "projectContingencyAmount" | "vatAmount" | "grandTotalWithTaxes">,
  settings: ProposalExportSettings,
  grossFloorArea: number | null,
) {
  const includeFormulas = settings.includeFormulas;
  const contingencyRow = totalsStartRow + 1;
  const vatRow = totalsStartRow + 2;
  const grandTotalRow = totalsStartRow + 3;

  worksheet.getCell(`A${totalsStartRow}`).value = "Direct Cost";
  worksheet.getCell(`B${totalsStartRow}`).value = formulaCell(includeFormulas, directCostFormula, totals.grandTotal);

  const contingencyIncluded = settings.contingencyMode === "included";
  worksheet.getCell(`A${contingencyRow}`).value = contingencyIncluded
    ? "Contingency (INCLUDED)"
    : `Contingency (${settings.contingencyRate}%)`;
  worksheet.getCell(`B${contingencyRow}`).value = contingencyIncluded
    ? formulaCell(includeFormulas, "0", 0)
    : formulaCell(includeFormulas, `B${totalsStartRow}*${rateDecimal(settings.contingencyRate)}`, totals.projectContingencyAmount);

  const vatIncluded = settings.vatMode === "included";
  worksheet.getCell(`A${vatRow}`).value = vatIncluded ? "VAT (INCLUDED)" : `VAT (${settings.vatRate}%)`;
  worksheet.getCell(`B${vatRow}`).value = vatIncluded
    ? formulaCell(includeFormulas, "0", 0)
    : formulaCell(includeFormulas, `(B${totalsStartRow}+B${contingencyRow})*${rateDecimal(settings.vatRate)}`, totals.vatAmount);

  worksheet.getCell(`A${grandTotalRow}`).value = "Grand Total";
  worksheet.getCell(`B${grandTotalRow}`).value = formulaCell(
    includeFormulas,
    `B${totalsStartRow}+B${contingencyRow}+B${vatRow}`,
    totals.grandTotalWithTaxes,
  );

  // P2-T6 (F-10/D3): Cost per SQM = Grand Total / GFA, referencing the GFA cell so it
  // recalcs if the floor area is edited; "N/A" until a GFA is captured in metadata.
  const costPerSqmRow = totalsStartRow + 4;
  const hasGfa = typeof grossFloorArea === "number" && Number.isFinite(grossFloorArea) && grossFloorArea > 0;
  const gfaRow = hasGfa ? totalsStartRow + 5 : null;
  const durationRow = hasGfa ? totalsStartRow + 6 : totalsStartRow + 5;

  worksheet.getCell(`A${costPerSqmRow}`).value = "Cost per sqm";
  if (hasGfa && gfaRow) {
    const costPerSqmCell = worksheet.getCell(`B${costPerSqmRow}`);
    costPerSqmCell.value = formulaCell(includeFormulas, `B${grandTotalRow}/B${gfaRow}`, roundMoney(totals.grandTotalWithTaxes / grossFloorArea));
    costPerSqmCell.numFmt = PHP_FORMAT;
    worksheet.getCell(`A${gfaRow}`).value = "Total Gross Floor Area";
    const gfaCell = worksheet.getCell(`B${gfaRow}`);
    gfaCell.value = grossFloorArea;
    gfaCell.numFmt = '#,##0.00 "sqm"';
  } else {
    worksheet.getCell(`B${costPerSqmRow}`).value = "N/A";
  }
  worksheet.getCell(`A${durationRow}`).value = "Estimated duration";
  worksheet.getCell(`B${durationRow}`).value = "To be confirmed";

  // F-28 (P3-T4): Grand Total amount in words.
  const amountInWordsRow = durationRow + 1;
  worksheet.getCell(`A${amountInWordsRow}`).value = "Amount in words";
  const wordsCell = worksheet.getCell(`B${amountInWordsRow}`);
  wordsCell.value = pesoInWords(totals.grandTotalWithTaxes);
  wordsCell.numFmt = TEXT_FORMAT;
  wordsCell.font = { italic: true, size: 10, color: { argb: "FF4B5563" } };

  [totalsStartRow, contingencyRow, vatRow, grandTotalRow].forEach((rowNumber) => {
    const row = worksheet.getRow(rowNumber);
    row.getCell(1).font = { bold: rowNumber === grandTotalRow, size: 10, color: { argb: "FF111827" } };
    row.getCell(2).numFmt = PHP_FORMAT;
    row.getCell(2).font = { bold: rowNumber === grandTotalRow, size: rowNumber === grandTotalRow ? 12 : 10, color: { argb: "FF111827" } };
  });
  styleTotalRow(worksheet.getRow(grandTotalRow));
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

  const amountRows: number[] = [];
  sectionRanges.forEach((sectionRange) => {
    const row = worksheet.addRow([
      sectionRange.sectionLabel,
      sectionRange.rowCount,
      formulaCell(model.settings.includeFormulas, quoteWorksheetCellReference(bidWorksheetName, `${BID_FORM_COLUMN_LETTERS.lineTotal}${sectionRange.subtotalRowNumber}`), sectionRange.subtotalResult),
    ]);
    styleBodyRow(row);
    amountRows.push(row.number);
  });

  // F-16 (P1-T6): dynamic totals start (one spacer row past the last section), the same
  // geometry as populateTabbedSummaryWorksheet, so the totals never collide once a single
  // tab carries more than ~11 sections (the old fixed A27–B32 block corrupted past that).
  const totalsStartRow = worksheet.rowCount + 2;
  const directCostFormula = amountRows.length > 0 ? `SUM(${amountRows.map((rowNumber) => `C${rowNumber}`).join(",")})` : "0";
  writeSummaryTotalsBlock(worksheet, totalsStartRow, directCostFormula, model.totals, model.settings, model.metadata.grossFloorArea ?? null);
  setPrintLayout(worksheet);
  return worksheet;
}

function createCommercialTermsWorksheet(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet("Commercial Terms", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  worksheet.columns = [{ width: 30, style: { numFmt: TEXT_FORMAT } }, { width: 72, style: { numFmt: TEXT_FORMAT } }];
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
        formulaCell(input.settings.includeFormulas, quoteWorksheetCellReference(tab.worksheetName, `${BID_FORM_COLUMN_LETTERS.lineTotal}${sectionRange.subtotalRowNumber}`), sectionRange.subtotalResult),
      ]);
      styleBodyRow(row);
      amountRows.push(row.number);
    });
  }

  const totalsStartRow = worksheet.rowCount + 2;
  const directCostFormula = amountRows.length > 0 ? `SUM(${amountRows.map((rowNumber) => `C${rowNumber}`).join(",")})` : "0";
  const directCost = roundMoney(tabRanges.reduce((total, { tab }) => total + tab.model.totals.grandTotal, 0));
  const tabbedTotals = { grandTotal: directCost, ...resolveProjectCharges(directCost, input.settings) };
  writeSummaryTotalsBlock(worksheet, totalsStartRow, directCostFormula, tabbedTotals, input.settings, input.metadata.grossFloorArea ?? null);
  setPrintLayout(worksheet);
  return worksheet;
}

function breakdownRowValues(breakdownRow: ProposalSourceBreakdownRow, tabName: string | undefined) {
  const values: Array<string | number> = [
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
  ];
  return tabName === undefined ? values : [tabName, ...values];
}

// F-32 (P2-T8): one Source Breakdown builder for both the single and tabbed workbooks; the
// TAB column is added only when tab groups are present, so the geometry stays in one place.
function createSourceBreakdownWorksheet(
  workbook: ExcelJS.Workbook,
  metadata: ProposalExportMetadata,
  generatedAt: string,
  groups: Array<{ tabName?: string; rows: ProposalSourceBreakdownRow[] }>,
  withTab: boolean,
) {
  const columns = withTab ? BREAKDOWN_COLUMNS_WITH_TAB : BREAKDOWN_COLUMNS;
  const worksheet = workbook.addWorksheet("Source Breakdown", {
    views: [{ state: "frozen", ySplit: 6 }],
  });
  applyColumnDefinitions(worksheet, columns);
  addTitleRow(worksheet, "Source Breakdown", columns.length);
  addHeaderField(worksheet, "Project", metadata.projectName);
  addHeaderField(worksheet, "Estimate", metadata.estimateName);
  addHeaderField(worksheet, "Generated", generatedAt);
  worksheet.addRow([]);
  const headerRow = worksheet.addRow(columns.map((column) => column.header));
  styleHeaderRow(headerRow);

  groups.forEach((group) => {
    group.rows.forEach((breakdownRow) => {
      const row = worksheet.addRow(breakdownRowValues(breakdownRow, withTab ? group.tabName ?? "" : undefined));
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
  // Audience gate applied at the single workbook chokepoint so the Source Breakdown sheet
  // is dropped for a client audience regardless of how the caller built the settings
  // (the route passes the top-level settings for the tabbed model). Idempotent with the
  // per-model gate in buildProposalExportModel.
  const settings = applyAudiencePolicy(input.settings);

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
    if (settings.includeSourceBreakdownSheet) {
      createSourceBreakdownWorksheet(
        workbook,
        input.metadata,
        input.generatedAt,
        input.tabs.map((tab) => ({ tabName: tab.tabName, rows: tab.model.sourceBreakdownRows })),
        true,
      );
    }
    return workbook;
  }

  const { sectionRanges } = createBidFormWorksheet(workbook, input);
  createSummaryWorksheet(workbook, input, sectionRanges);
  createCommercialTermsWorksheet(workbook);
  if (settings.includeSourceBreakdownSheet) {
    createSourceBreakdownWorksheet(workbook, input.metadata, input.generatedAt, [{ rows: input.sourceBreakdownRows }], false);
  }

  return workbook;
}

export async function createProposalWorkbookBuffer(input: ProposalExportModel | ProposalTabbedWorkbookModel): Promise<Buffer> {
  const workbook = createProposalWorkbook(input);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
