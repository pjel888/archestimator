import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import type {
  ProposalExportMetadata,
  ProposalExportModel,
  ProposalExportRow,
  ProposalExportSettings,
  ProposalExportSourceReference,
  ProposalExportTotals,
  ProposalExportValidationIssue,
  ProposalFlatSourceRow,
  ProposalNormalizedSourceRow,
  ProposalScopeStatus,
  ProposalSourceBreakdownRow,
  ProposalSummaryRow,
} from "./types";

export type BuildProposalExportModelInput = {
  metadata: ProposalExportMetadata;
  nodes: EstimateTreeNode[];
  settings?: Partial<ProposalExportSettings>;
  generatedAt?: string;
};

export const defaultProposalExportSettings: ProposalExportSettings = {
  audience: "client",
  mode: "detailed-boq",
  consolidationMode: "industry-standard",
  includeSourceBreakdownSheet: true,
  includeFormulas: true,
  includeZeroRows: false,
  includeExcludedRows: true,
  showSupplierInRemarks: true,
  contingencyRate: 10, // D2: default 10% project contingency
  contingencyMode: "percentage",
  vatRate: 12, // D2: Philippine VAT 12%
  vatMode: "percentage",
};

// F-19 / D0=A (P1-T9 minimal redaction): the default workbook is the contractor → client
// bid document, so internal-only artifacts are dropped for a client audience until the full
// P2-T3 settings gate lands. `audience` is server-derived (never read off the wire), so this
// gate cannot be flipped by a client-supplied parameter. Idempotent.
export function applyAudiencePolicy(settings: ProposalExportSettings): ProposalExportSettings {
  if (settings.audience !== "client") return settings;
  return {
    ...settings,
    includeSourceBreakdownSheet: false,
    showSupplierInRemarks: false,
  };
}

function normalizeWhitespace(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function keyText(value: string | null | undefined) {
  return normalizeWhitespace(value).toLocaleLowerCase("en-PH");
}

function sectionKey(value: string) {
  const normalized = keyText(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "uncategorized";
}

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 1_000_000) / 1_000_000;
}

function buildParticulars(row: EstimateRowItem) {
  const material = normalizeWhitespace(row.material) || "Unnamed item";
  const description = normalizeWhitespace(row.description);

  if (!description || keyText(description) === keyText(material)) return material;
  return `${material} — ${description}`;
}

function buildRemarks(row: EstimateRowItem, settings: ProposalExportSettings) {
  const remarks: string[] = [];
  const supplier = normalizeWhitespace(row.supplier);
  const pricingSource = normalizeWhitespace(row.pricingSource);
  const pricingDate = normalizeWhitespace(row.pricingDate);
  const confidence = normalizeWhitespace(row.confidence);
  const notes = normalizeWhitespace(row.notes);

  // `showSupplierInRemarks` gates all internal pricing intelligence (supplier, pricing
  // source/date, confidence) together — applyAudiencePolicy forces it off for a client
  // audience so none of it leaks into a client-facing bid (F-19). Free-form notes are
  // client-relevant and always kept.
  if (settings.showSupplierInRemarks) {
    if (supplier) remarks.push(`Supplier: ${supplier}`);
    if (pricingSource) remarks.push(`Pricing: ${pricingSource}`);
    if (pricingDate) remarks.push(`As of ${pricingDate}`);
    if (confidence) remarks.push(`Confidence: ${confidence}`);
  }
  if (notes) remarks.push(notes);

  return remarks.join(" | ");
}

function normalizeSourceRow(flatRow: ProposalFlatSourceRow<EstimateRowItem>, settings: ProposalExportSettings): ProposalNormalizedSourceRow {
  const sourceRow = flatRow.sourceRow;
  const quantity = roundQuantity(sourceRow.quantity);
  const materialUnitCost = roundMoney(sourceRow.itemCost);
  const laborUnitCost = 0;
  const materialSubtotal = roundMoney(materialUnitCost * quantity);
  const laborSubtotal = roundMoney(laborUnitCost * quantity);
  const contingencySubtotal = roundMoney((materialSubtotal * (sourceRow.contingencyPercentage ?? 0)) / 100);
  const miscSubtotal = roundMoney(sourceRow.miscCost);
  const costAmount = roundMoney(materialSubtotal + laborSubtotal + contingencySubtotal + miscSubtotal);
  const sectionLabel = normalizeWhitespace(sourceRow.category) || normalizeWhitespace(sourceRow.discipline) || "Uncategorized";
  const scopeStatus: ProposalScopeStatus = "included";

  return {
    sourceRowId: flatRow.sourceRowId,
    sourceNodeId: flatRow.sourceNodeId,
    sourceNodeName: flatRow.sourceNodeName,
    areaPath: flatRow.areaPath,
    areaPathIds: flatRow.areaPathIds,
    areaPathLabel: flatRow.areaPathLabel,
    sortIndex: flatRow.sortIndex,
    sectionKey: sectionKey(sectionLabel),
    sectionLabel,
    tag: normalizeWhitespace(sourceRow.designation) || normalizeWhitespace(sourceRow.discipline) || sectionLabel,
    particulars: buildParticulars(sourceRow),
    quantity,
    unit: normalizeWhitespace(sourceRow.unit) || "unit",
    materialUnitCost,
    laborUnitCost,
    materialSubtotal,
    laborSubtotal,
    contingencySubtotal,
    miscSubtotal,
    costAmount,
    remarks: buildRemarks(sourceRow, settings),
    scopeStatus,
    includedInTotal: scopeStatus === "included",
  };
}

function consolidationKey(row: ProposalNormalizedSourceRow) {
  return JSON.stringify([
    row.sectionKey,
    keyText(row.sectionLabel),
    keyText(row.tag),
    keyText(row.particulars),
    keyText(row.unit),
    row.materialUnitCost,
    row.laborUnitCost,
    keyText(row.remarks),
    row.scopeStatus,
    row.includedInTotal,
  ]);
}

function createSourceReference(row: ProposalNormalizedSourceRow): ProposalExportSourceReference {
  return {
    sourceRowId: row.sourceRowId,
    sourceNodeId: row.sourceNodeId,
    sourceNodeName: row.sourceNodeName,
    areaPath: row.areaPath,
    areaPathIds: row.areaPathIds,
    areaPathLabel: row.areaPathLabel,
    quantity: row.quantity,
    materialSubtotal: row.materialSubtotal,
    laborSubtotal: row.laborSubtotal,
    contingencySubtotal: row.contingencySubtotal,
    miscSubtotal: row.miscSubtotal,
    costAmount: row.costAmount,
  };
}

function renumberProposalRows(rows: ProposalExportRow[]): ProposalExportRow[] {
  // P2-T5/F-09: hierarchical numbering — line numbers restart at 1 within each section
  // (in proposalRows order, which is exactly the per-section filter order the Bid Form uses
  // to lay rows out). The division letter (A/B/C…) is emitted on the section header row by
  // the workbook builder, derived from the section's position in model.summaryRows.
  const sectionCounters = new Map<string, number>();
  return rows.map((row) => {
    const next = (sectionCounters.get(row.sectionKey) ?? 0) + 1;
    sectionCounters.set(row.sectionKey, next);
    return { ...row, rowNumber: String(next) };
  });
}

function buildSourceBreakdownRows(proposalRows: ProposalExportRow[]): ProposalSourceBreakdownRow[] {
  return proposalRows.flatMap((proposalRow) =>
    proposalRow.sources.map((source) => ({
      proposalExportRowId: proposalRow.exportRowId,
      proposalRowNumber: proposalRow.rowNumber,
      sourceRowId: source.sourceRowId,
      sourceNodeId: source.sourceNodeId,
      sourceNodeName: source.sourceNodeName,
      areaPathLabel: source.areaPathLabel,
      particulars: proposalRow.particulars,
      quantity: source.quantity,
      unit: proposalRow.unit,
      materialUnitCost: proposalRow.materialUnitCost,
      laborUnitCost: proposalRow.laborUnitCost,
      materialSubtotal: source.materialSubtotal,
      laborSubtotal: source.laborSubtotal,
      contingencySubtotal: source.contingencySubtotal,
      miscSubtotal: source.miscSubtotal,
      costAmount: source.costAmount,
    })),
  );
}

function buildSummaryRows(proposalRows: ProposalExportRow[]): ProposalSummaryRow[] {
  const sections = new Map<string, ProposalSummaryRow>();

  for (const row of proposalRows) {
    const current = sections.get(row.sectionKey) ?? {
      sectionKey: row.sectionKey,
      sectionLabel: row.sectionLabel,
      rowCount: 0,
      totalQuantity: 0,
      materialSubtotal: 0,
      laborSubtotal: 0,
      contingencySubtotal: 0,
      miscSubtotal: 0,
      costAmount: 0,
    };

    current.rowCount += 1;
    current.totalQuantity = roundQuantity(current.totalQuantity + row.quantity);
    current.materialSubtotal = roundMoney(current.materialSubtotal + row.materialSubtotal);
    current.laborSubtotal = roundMoney(current.laborSubtotal + row.laborSubtotal);
    current.contingencySubtotal = roundMoney(current.contingencySubtotal + row.contingencySubtotal);
    current.miscSubtotal = roundMoney(current.miscSubtotal + row.miscSubtotal);
    current.costAmount = roundMoney(current.costAmount + row.costAmount);
    sections.set(row.sectionKey, current);
  }

  return Array.from(sections.values());
}

// F-02/D2: project-level contingency then VAT, computed round-then-sum so the workbook's
// stored results match these values to the cent (09 §5 parity). Exported so the tabbed
// Summary applies the identical math to the summed per-tab Direct Costs. Rates are 0–100.
export function resolveProjectCharges(directCost: number, settings: ProposalExportSettings) {
  const projectContingencyAmount =
    settings.contingencyMode === "included" ? 0 : roundMoney((directCost * settings.contingencyRate) / 100);
  const vatBase = roundMoney(directCost + projectContingencyAmount);
  const vatAmount = settings.vatMode === "included" ? 0 : roundMoney((vatBase * settings.vatRate) / 100);
  const grandTotalWithTaxes = roundMoney(directCost + projectContingencyAmount + vatAmount);
  return { projectContingencyAmount, vatAmount, grandTotalWithTaxes };
}

function buildTotals(proposalRows: ProposalExportRow[], settings: ProposalExportSettings): ProposalExportTotals {
  const base = proposalRows.reduce(
    (totals, row) => {
      if (!row.includedInTotal) return totals;
      return {
        materialSubtotal: roundMoney(totals.materialSubtotal + row.materialSubtotal),
        laborSubtotal: roundMoney(totals.laborSubtotal + row.laborSubtotal),
        contingencySubtotal: roundMoney(totals.contingencySubtotal + row.contingencySubtotal),
        miscSubtotal: roundMoney(totals.miscSubtotal + row.miscSubtotal),
        grandTotal: roundMoney(totals.grandTotal + row.costAmount),
      };
    },
    {
      materialSubtotal: 0,
      laborSubtotal: 0,
      contingencySubtotal: 0,
      miscSubtotal: 0,
      grandTotal: 0,
    },
  );
  return { ...base, ...resolveProjectCharges(base.grandTotal, settings) };
}

function collectNonAreaRows(nodes: EstimateTreeNode[]) {
  const issues: ProposalExportValidationIssue[] = [];

  function visit(node: EstimateTreeNode) {
    if (node.kind !== "area" && (node.estimateRowItems?.length ?? 0) > 0) {
      issues.push({
        severity: "warning",
        code: "non_area_rows_skipped",
        message: `Rows on group node “${node.name}” were skipped because proposal export only reads area rows.`,
        sourceNodeId: node.id,
      });
    }
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return issues;
}

export function flattenEstimateTree(nodes: EstimateTreeNode[]): ProposalFlatSourceRow<EstimateRowItem>[] {
  const rows: ProposalFlatSourceRow<EstimateRowItem>[] = [];
  let sortIndex = 0;

  function visit(node: EstimateTreeNode, path: string[], pathIds: string[]) {
    const nextPath = [...path, node.name];
    const nextPathIds = [...pathIds, node.id];

    if (node.kind === "area") {
      for (const sourceRow of node.estimateRowItems ?? []) {
        rows.push({
          sourceRow,
          sourceRowId: sourceRow.id,
          sourceNodeId: node.id,
          sourceNodeName: node.name,
          areaPath: nextPath,
          areaPathIds: nextPathIds,
          areaPathLabel: nextPath.join(" / "),
          sortIndex,
        });
        sortIndex += 1;
      }
    }

    node.children?.forEach((child) => visit(child, nextPath, nextPathIds));
  }

  nodes.forEach((node) => visit(node, [], []));
  return rows;
}

export function consolidateProposalRows(
  flatRows: ProposalFlatSourceRow<EstimateRowItem>[],
  settings: ProposalExportSettings = defaultProposalExportSettings,
): ProposalExportRow[] {
  const groupedRows = new Map<string, ProposalExportRow>();

  for (const flatRow of flatRows) {
    const normalizedRow = normalizeSourceRow(flatRow, settings);
    if (!settings.includeZeroRows && normalizedRow.quantity === 0 && normalizedRow.costAmount === 0) continue;
    if (!settings.includeExcludedRows && !normalizedRow.includedInTotal) continue;

    const key = consolidationKey(normalizedRow);
    const current = groupedRows.get(key);
    const sourceReference = createSourceReference(normalizedRow);

    if (!current) {
      groupedRows.set(key, {
        exportRowId: `proposal-row-${groupedRows.size + 1}`,
        rowNumber: String(groupedRows.size + 1),
        sectionKey: normalizedRow.sectionKey,
        sectionLabel: normalizedRow.sectionLabel,
        tag: normalizedRow.tag,
        particulars: normalizedRow.particulars,
        quantity: normalizedRow.quantity,
        unit: normalizedRow.unit,
        materialUnitCost: normalizedRow.materialUnitCost,
        laborUnitCost: normalizedRow.laborUnitCost,
        materialSubtotal: normalizedRow.materialSubtotal,
        laborSubtotal: normalizedRow.laborSubtotal,
        contingencySubtotal: normalizedRow.contingencySubtotal,
        miscSubtotal: normalizedRow.miscSubtotal,
        costAmount: normalizedRow.costAmount,
        remarks: normalizedRow.remarks,
        scopeStatus: normalizedRow.scopeStatus,
        includedInTotal: normalizedRow.includedInTotal,
        sourceRowIds: [normalizedRow.sourceRowId],
        sourceAreaPaths: [normalizedRow.areaPathLabel],
        sources: [sourceReference],
      });
      continue;
    }

    current.quantity = roundQuantity(current.quantity + normalizedRow.quantity);
    current.materialSubtotal = roundMoney(current.materialSubtotal + normalizedRow.materialSubtotal);
    current.laborSubtotal = roundMoney(current.laborSubtotal + normalizedRow.laborSubtotal);
    current.contingencySubtotal = roundMoney(current.contingencySubtotal + normalizedRow.contingencySubtotal);
    current.miscSubtotal = roundMoney(current.miscSubtotal + normalizedRow.miscSubtotal);
    current.costAmount = roundMoney(current.costAmount + normalizedRow.costAmount);
    current.sourceRowIds.push(normalizedRow.sourceRowId);
    if (!current.sourceAreaPaths.includes(normalizedRow.areaPathLabel)) {
      current.sourceAreaPaths.push(normalizedRow.areaPathLabel);
    }
    current.sources.push(sourceReference);
  }

  return renumberProposalRows(Array.from(groupedRows.values()));
}

export function buildProposalExportModel(input: BuildProposalExportModelInput): ProposalExportModel {
  const settings = applyAudiencePolicy({ ...defaultProposalExportSettings, ...input.settings });
  const flatRows = flattenEstimateTree(input.nodes);
  const proposalRows = consolidateProposalRows(flatRows, settings);
  const validationIssues: ProposalExportValidationIssue[] = [...collectNonAreaRows(input.nodes)];

  if (flatRows.length === 0) {
    validationIssues.push({
      severity: "warning",
      code: "empty_estimate",
      message: "No area row items are available for proposal export.",
    });
  }

  if (proposalRows.length > 0) {
    validationIssues.push({
      severity: "info",
      code: "cost_split_compatibility_mode",
      message:
        "Current estimate rows do not yet separate material and labor unit costs. Existing item cost is exported as material unit cost, labor is exported as 0, and misc cost is shown separately.",
    });
  }

  return {
    metadata: input.metadata,
    settings,
    summaryRows: buildSummaryRows(proposalRows),
    proposalRows,
    sourceBreakdownRows: buildSourceBreakdownRows(proposalRows),
    validationIssues,
    totals: buildTotals(proposalRows, settings),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}
