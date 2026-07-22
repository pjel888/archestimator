import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import { computeEstimateRowCostParts } from "@/lib/estimates/estimate-row-total";
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
export { applyAudiencePolicy, defaultProposalExportSettings, resolveProjectCharges, resolveSheetAdjustment } from "./settings";
import { applyAudiencePolicy, defaultProposalExportSettings, resolveProjectCharges, resolveSheetAdjustment } from "./settings";

export type BuildProposalExportModelInput = {
  metadata: ProposalExportMetadata;
  nodes: EstimateTreeNode[];
  settings?: Partial<ProposalExportSettings>;
  generatedAt?: string;
};

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
  const variant = normalizeWhitespace(row.priceOptionLabel);
  const description = normalizeWhitespace(row.description);
  const head = variant && keyText(variant) !== keyText(material) ? `${material} (${variant})` : material;

  if (!description || keyText(description) === keyText(material) || keyText(description) === keyText(variant)) {
    return head;
  }
  return `${head} — ${description}`;
}

function buildRemarks(row: EstimateRowItem, settings: ProposalExportSettings, areaPathLabel?: string) {
  const remarks: string[] = [];
  const brand = normalizeWhitespace(row.brand);
  const sku = normalizeWhitespace(row.sku);
  const supplier = normalizeWhitespace(row.supplier);
  const pricingSource = normalizeWhitespace(row.pricingSource);
  const pricingDate = normalizeWhitespace(row.pricingDate);
  const notes = normalizeWhitespace(row.notes);

  // Product identity (brand / SKU) is client-safe component data, not supplier pricing.
  if (brand) remarks.push(`Brand: ${brand}`);
  if (sku) remarks.push(`SKU: ${sku}`);
  if (settings.consolidationMode === "area-breakdown" && areaPathLabel) {
    remarks.push(`Area: ${areaPathLabel}`);
  }

  // `showSupplierInRemarks` gates internal pricing intelligence (supplier and pricing
  // source/date) together — applyAudiencePolicy forces it off for a client
  // audience so none of it leaks into a client-facing bid (F-19). Free-form notes are
  // client-relevant and always kept.
  if (settings.showSupplierInRemarks) {
    if (supplier) remarks.push(`Supplier: ${supplier}`);
    if (pricingSource) remarks.push(`Pricing: ${pricingSource}`);
    if (pricingDate) remarks.push(`As of ${pricingDate}`);
  }
  if (notes) remarks.push(notes);

  return remarks.join(" | ");
}

const SCOPE_VOCABULARY = new Set<ProposalScopeStatus>([
  "included", "excluded", "by_others", "by_owner", "owner_supplied", "ofci", "osci", "osm", "omitted", "not_applicable", "alternate",
]);

// P3-T2: normalize a metadata scope string (e.g. "EXCLUDED", "by others") to a recognized
// canonical status; anything unrecognized is treated as included (safe default).
function normalizeScope(value: string | null | undefined): ProposalScopeStatus {
  const key = keyText(value ?? "").replace(/[\s-]+/g, "_");
  return SCOPE_VOCABULARY.has(key as ProposalScopeStatus) ? (key as ProposalScopeStatus) : "included";
}

function normalizeSourceRow(
  flatRow: ProposalFlatSourceRow<EstimateRowItem>,
  settings: ProposalExportSettings,
  currencyCode: string,
): ProposalNormalizedSourceRow {
  const sourceRow = flatRow.sourceRow;
  const quantityBase = sourceRow.quantityBase ?? null;
  const quantityContingencyAmount = quantityBase === null ? null : sourceRow.quantityContingencyAmount ?? 0;
  const legacyAdjustmentPercentage = quantityBase === null ? sourceRow.contingencyPercentage ?? 0 : 0;
  const adjustmentPercentage = sourceRow.adjustmentPercentage ?? legacyAdjustmentPercentage;
  const calculation = computeEstimateRowCostParts({
    quantity: sourceRow.quantity,
    quantity_base: quantityBase,
    quantity_contingency_amount: quantityContingencyAmount,
    unit_cost: sourceRow.itemCost,
    adjustment_percentage: adjustmentPercentage,
    misc_cost: sourceRow.miscCost,
    currency_code: currencyCode,
  });

  if (!calculation.ok) {
    throw new Error(`Cannot build proposal export model: invalid ${calculation.field}.`);
  }

  const { value: costParts } = calculation;
  const quantity = costParts.quantity;
  const materialUnitCost = roundMoney(sourceRow.itemCost);
  const materialSubtotal = costParts.materialMinorUnits / 100;
  const contingencySubtotal = costParts.adjustmentMinorUnits / 100;
  const miscSubtotal = costParts.miscMinorUnits / 100;
  const costAmount = costParts.total;
  const sectionLabel = normalizeWhitespace(sourceRow.category) || normalizeWhitespace(sourceRow.discipline) || "Uncategorized";
  // P3-T2: per-row scope from row metadata (else included).
  const scopeStatus: ProposalScopeStatus = normalizeScope(sourceRow.scopeStatus);
  // Stable identity for consolidation. Supplier/component/variant keys stay in the
  // merge key even when client audience redacts them from remarks, so distinct
  // library items or suppliers never falsely collapse into one BOQ line.
  const identityKey = [
    normalizeWhitespace(sourceRow.sourceLibraryItemId),
    normalizeWhitespace(sourceRow.priceOptionId),
    normalizeWhitespace(sourceRow.supplierId) || keyText(sourceRow.supplier),
    keyText(sourceRow.sku),
    keyText(sourceRow.brand),
    settings.consolidationMode === "area-breakdown" ? flatRow.areaPathLabel : "",
  ].join("|");

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
    quantityBase,
    quantityContingencyAmount,
    unit: normalizeWhitespace(sourceRow.unit) || "unit",
    materialUnitCost,
    materialSubtotal,
    contingencySubtotal,
    miscSubtotal,
    costAmount,
    remarks: buildRemarks(sourceRow, settings, flatRow.areaPathLabel),
    scopeStatus,
    includedInTotal: scopeStatus === "included",
    identityKey,
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
    keyText(row.remarks),
    row.scopeStatus,
    row.includedInTotal,
    row.identityKey,
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
    quantityBase: row.quantityBase,
    quantityContingencyAmount: row.quantityContingencyAmount,
    materialSubtotal: row.materialSubtotal,
    contingencySubtotal: row.contingencySubtotal,
    miscSubtotal: row.miscSubtotal,
    costAmount: row.costAmount,
  };
}

// P3-T3/D6 (F-27): an ordered canonical division taxonomy. Each entry's keywords are matched
// against the free-text section label (category/discipline); the first match wins. Sections that
// match nothing sort last (Misc), preserving their relative encounter order.
const DIVISION_TAXONOMY: ReadonlyArray<{ keywords: readonly string[] }> = [
  { keywords: ["preliminar", "general requirement", "mobiliz", "general condition"] },
  { keywords: ["site", "earth", "excavat", "grading", "demolition"] },
  { keywords: ["civil", "concrete", "structur", "foundation", "rebar", "formwork"] },
  { keywords: ["architectur", "masonry", "wall", "partition", "roofing"] },
  { keywords: ["finish", "tile", "paint", "flooring", "ceiling", "plaster"] },
  { keywords: ["glass", "glazing", "curtain wall", "window"] },
  { keywords: ["door"] },
  { keywords: ["joinery", "millwork", "cabinet", "carpentry", "casework"] },
  { keywords: ["mechanical", "electrical", "plumbing", "mep", "hvac", "fire", "sanitary", "power", "lighting"] },
  { keywords: ["ffe", "furnitur", "fixture", "equipment", "appliance"] },
];
const MISC_DIVISION_RANK = DIVISION_TAXONOMY.length;

function divisionRank(label: string): number {
  const text = keyText(label);
  for (let index = 0; index < DIVISION_TAXONOMY.length; index += 1) {
    if (DIVISION_TAXONOMY[index].keywords.some((keyword) => text.includes(keyword))) return index;
  }
  return MISC_DIVISION_RANK;
}

// Reorder consolidated rows so sections follow the canonical division order, keeping each
// section's rows contiguous and the relative order of equal-rank sections stable.
function applyCanonicalDivisionOrder(rows: ProposalExportRow[]): ProposalExportRow[] {
  const sectionsInOrder: string[] = [];
  const rowsBySection = new Map<string, ProposalExportRow[]>();
  for (const row of rows) {
    let bucket = rowsBySection.get(row.sectionKey);
    if (!bucket) {
      bucket = [];
      rowsBySection.set(row.sectionKey, bucket);
      sectionsInOrder.push(row.sectionKey);
    }
    bucket.push(row);
  }
  const sortedSections = sectionsInOrder
    .map((sectionKey, appearance) => ({
      sectionKey,
      appearance,
      rank: divisionRank(rowsBySection.get(sectionKey)?.[0]?.sectionLabel ?? sectionKey),
    }))
    .sort((a, b) => a.rank - b.rank || a.appearance - b.appearance);
  return sortedSections.flatMap((section) => rowsBySection.get(section.sectionKey) ?? []);
}

function renumberProposalRows(rows: ProposalExportRow[]): ProposalExportRow[] {
  // P2-T5/F-09: hierarchical numbering — each row is numbered within the context it is
  // actually rendered in. The Bid Form's priced sections show only includedInTotal rows,
  // so those restart at 1 per section. Excluded rows are pulled out into the flat
  // EXCLUSIONS block (create-proposal-workbook.ts), so they get their own independent
  // 1..n sequence — matching that block's String(index + 1). Numbering excluded rows off
  // the per-section counter would consume a priced-section line number and leave a visible
  // gap (e.g. ITEM 1, 3) in the Bid Form when a section mixes included and excluded scope.
  // The division letter (A/B/C…) is emitted on the section header row by the workbook
  // builder, derived from the section's position in model.summaryRows.
  const sectionCounters = new Map<string, number>();
  let excludedCounter = 0;
  return rows.map((row) => {
    if (!row.includedInTotal) {
      excludedCounter += 1;
      return { ...row, rowNumber: String(excludedCounter) };
    }
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
      quantityBase: source.quantityBase,
      quantityContingencyAmount: source.quantityContingencyAmount,
      unit: proposalRow.unit,
      materialUnitCost: proposalRow.materialUnitCost,
      materialSubtotal: source.materialSubtotal,
      contingencySubtotal: source.contingencySubtotal,
      miscSubtotal: source.miscSubtotal,
      costAmount: source.costAmount,
    })),
  );
}

function buildSummaryRows(proposalRows: ProposalExportRow[]): ProposalSummaryRow[] {
  const sections = new Map<string, ProposalSummaryRow>();

  for (const row of proposalRows) {
    // P3-T2: excluded rows are summarized in the EXCLUSIONS block, not the priced section
    // totals — so section amounts match the Grand Total and the Bid Form subtotal SUMs.
    if (!row.includedInTotal) continue;
    const current = sections.get(row.sectionKey) ?? {
      sectionKey: row.sectionKey,
      sectionLabel: row.sectionLabel,
      rowCount: 0,
      totalQuantity: 0,
      materialSubtotal: 0,
      contingencySubtotal: 0,
      miscSubtotal: 0,
      costAmount: 0,
    };

    current.rowCount += 1;
    current.totalQuantity = roundQuantity(current.totalQuantity + row.quantity);
    current.materialSubtotal = roundMoney(current.materialSubtotal + row.materialSubtotal);
    current.contingencySubtotal = roundMoney(current.contingencySubtotal + row.contingencySubtotal);
    current.miscSubtotal = roundMoney(current.miscSubtotal + row.miscSubtotal);
    current.costAmount = roundMoney(current.costAmount + row.costAmount);
    sections.set(row.sectionKey, current);
  }

  return Array.from(sections.values());
}

function buildTotals(proposalRows: ProposalExportRow[], settings: ProposalExportSettings): ProposalExportTotals {
  const base = proposalRows.reduce(
    (totals, row) => {
      if (!row.includedInTotal) return totals;
      return {
        materialSubtotal: roundMoney(totals.materialSubtotal + row.materialSubtotal),
        contingencySubtotal: roundMoney(totals.contingencySubtotal + row.contingencySubtotal),
        miscSubtotal: roundMoney(totals.miscSubtotal + row.miscSubtotal),
        grandTotal: roundMoney(totals.grandTotal + row.costAmount),
      };
    },
    {
      materialSubtotal: 0,
      contingencySubtotal: 0,
      miscSubtotal: 0,
      grandTotal: 0,
    },
  );
  const sheetAdjustmentAmount = resolveSheetAdjustment(base.grandTotal, settings);
  const adjustedDirectCost = roundMoney(base.grandTotal + sheetAdjustmentAmount);
  return {
    ...base,
    sheetAdjustmentAmount,
    adjustedDirectCost,
    ...resolveProjectCharges(adjustedDirectCost, settings),
  };
}

export function flattenEstimateTree(nodes: EstimateTreeNode[]): ProposalFlatSourceRow<EstimateRowItem>[] {
  const rows: ProposalFlatSourceRow<EstimateRowItem>[] = [];
  let sortIndex = 0;

  function visit(node: EstimateTreeNode, path: string[], pathIds: string[]) {
    const nextPath = [...path, node.name];
    const nextPathIds = [...pathIds, node.id];

    // Unification (single node type): any node may own rows, not only "area".
    // Pre-migration the DB still keeps rows off non-area nodes, so this is byte-identical
    // on real data; once writes are enabled, a mixed node's rows are no longer dropped
    // from the proposal export (which would understate the client-facing total).
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

    node.children?.forEach((child) => visit(child, nextPath, nextPathIds));
  }

  nodes.forEach((node) => visit(node, [], []));
  return rows;
}

export function consolidateProposalRows(
  flatRows: ProposalFlatSourceRow<EstimateRowItem>[],
  settings: ProposalExportSettings = defaultProposalExportSettings,
  currencyCode = "PHP",
): ProposalExportRow[] {
  const groupedRows = new Map<string, ProposalExportRow>();
  const sourceAreaPathsByGroup = new Map<string, Set<string>>();

  for (const flatRow of flatRows) {
    const normalizedRow = normalizeSourceRow(flatRow, settings, currencyCode);
    if (!settings.includeZeroRows && normalizedRow.quantity === 0 && normalizedRow.costAmount === 0) continue;
    if (!settings.includeExcludedRows && !normalizedRow.includedInTotal) continue;

    const key = consolidationKey(normalizedRow);
    const current = groupedRows.get(key);
    const sourceReference = createSourceReference(normalizedRow);

    if (!current) {
      sourceAreaPathsByGroup.set(key, new Set([normalizedRow.areaPathLabel]));
      groupedRows.set(key, {
        exportRowId: `proposal-row-${groupedRows.size + 1}`,
        rowNumber: String(groupedRows.size + 1),
        sectionKey: normalizedRow.sectionKey,
        sectionLabel: normalizedRow.sectionLabel,
        tag: normalizedRow.tag,
        particulars: normalizedRow.particulars,
        quantity: normalizedRow.quantity,
        quantityBase: normalizedRow.quantityBase,
        quantityContingencyAmount: normalizedRow.quantityContingencyAmount,
        unit: normalizedRow.unit,
        materialUnitCost: normalizedRow.materialUnitCost,
        materialSubtotal: normalizedRow.materialSubtotal,
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
    if (current.quantityBase !== null && current.quantityBase !== undefined && normalizedRow.quantityBase !== null && normalizedRow.quantityBase !== undefined) {
      current.quantityBase = roundQuantity(current.quantityBase + normalizedRow.quantityBase);
      current.quantityContingencyAmount = roundQuantity((current.quantityContingencyAmount ?? 0) + (normalizedRow.quantityContingencyAmount ?? 0));
    } else {
      current.quantityBase = null;
      current.quantityContingencyAmount = null;
    }
    current.materialSubtotal = roundMoney(current.materialSubtotal + normalizedRow.materialSubtotal);
    current.contingencySubtotal = roundMoney(current.contingencySubtotal + normalizedRow.contingencySubtotal);
    current.miscSubtotal = roundMoney(current.miscSubtotal + normalizedRow.miscSubtotal);
    current.costAmount = roundMoney(current.costAmount + normalizedRow.costAmount);
    current.sourceRowIds.push(normalizedRow.sourceRowId);
    const sourceAreaPaths = sourceAreaPathsByGroup.get(key) ?? new Set(current.sourceAreaPaths);
    sourceAreaPathsByGroup.set(key, sourceAreaPaths);
    if (!sourceAreaPaths.has(normalizedRow.areaPathLabel)) {
      sourceAreaPaths.add(normalizedRow.areaPathLabel);
      current.sourceAreaPaths.push(normalizedRow.areaPathLabel);
    }
    current.sources.push(sourceReference);
  }

  return renumberProposalRows(Array.from(groupedRows.values()));
}

export function buildProposalExportModel(input: BuildProposalExportModelInput): ProposalExportModel {
  const settings = applyAudiencePolicy({ ...defaultProposalExportSettings, ...input.settings });
  const flatRows = flattenEstimateTree(input.nodes);
  // P3-T3: reorder sections canonically, then renumber so line numbers/division letters follow
  // the canonical order rather than data-encounter order.
  const proposalRows = renumberProposalRows(applyCanonicalDivisionOrder(consolidateProposalRows(flatRows, settings, input.metadata.currency)));
  // Unification: rows on any node are now exported (flattenEstimateTree above), so the
  // "non_area_rows_skipped" warning is obsolete and would fire falsely. The collector is
  // removed in the P7 dead-code pass; here we simply stop emitting the stale warning.
  const validationIssues: ProposalExportValidationIssue[] = [];

  if (flatRows.length === 0) {
    validationIssues.push({
      severity: "warning",
      code: "empty_estimate",
      message: "No area row items are available for proposal export.",
    });
  }

  return {
    metadata: input.metadata,
    settings,
    summaryRows: buildSummaryRows(proposalRows),
    proposalRows,
    sourceBreakdownRows: settings.includeSourceBreakdownSheet ? buildSourceBreakdownRows(proposalRows) : [],
    validationIssues,
    totals: buildTotals(proposalRows, settings),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}
