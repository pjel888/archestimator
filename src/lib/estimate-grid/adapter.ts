import type { GridCell, GridColumn, Item } from "@glideapps/glide-data-grid";
import { GridCellKind } from "@glideapps/glide-data-grid";
import type { CostLibraryItem, Estimate, EstimateLineItem } from "@/lib/local-data/schemas";
import { calculateEstimateLineTotal } from "@/lib/estimates/calculations";
import { createLineItemFromLibraryItem } from "@/lib/estimates/library-insert";
import { isLineIncludedInTotal } from "@/lib/estimates/totals";

export type EstimateGridRow =
  | {
      kind: "section";
      sectionId: string;
      outlineCode: string;
      name: string;
      lineCount: number;
      total: number;
    }
  | {
      kind: "line";
      sectionId: string;
      lineItemId: string;
      lineItemIndex: number;
    };

export const estimateGridColumns: GridColumn[] = [
  { id: "section", title: "Space / section", width: 190 },
  { id: "itemName", title: "Item", width: 280 },
  { id: "quantity", title: "Qty", width: 92 },
  { id: "unit", title: "Unit", width: 84 },
  { id: "unitCost", title: "Unit cost", width: 120 },
  { id: "wastePercent", title: "Waste %", width: 92 },
  { id: "total", title: "Total", width: 132 },
  { id: "scopeStatus", title: "Scope", width: 160 },
  { id: "linkState", title: "Link", width: 150 },
];

export function buildEstimateGridRows(estimate: Estimate): EstimateGridRow[] {
  return estimate.sections.flatMap((section) => {
    const lineIndexes = estimate.lineItems
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.sectionId === section.id);
    const total = lineIndexes.reduce((sum, { line }) => {
      if (!isLineIncludedInTotal(line)) return sum;
      return sum + calculateEstimateLineTotal(line).total;
    }, 0);

    return [
      {
        kind: "section" as const,
        sectionId: section.id,
        outlineCode: section.outlineCode,
        name: section.name,
        lineCount: lineIndexes.length,
        total,
      },
      ...lineIndexes.map(({ line, index }) => ({
        kind: "line" as const,
        sectionId: section.id,
        lineItemId: line.id,
        lineItemIndex: index,
      })),
    ];
  });
}

export function getEstimateGridCell(estimate: Estimate, item: Item, currency = "PHP"): GridCell {
  const rows = buildEstimateGridRows(estimate);
  return getEstimateGridCellFromRows(estimate, rows, item, currency);
}

export function getEstimateGridCellFromRows(estimate: Estimate, rows: EstimateGridRow[], item: Item, currency = "PHP"): GridCell {
  const [columnIndex, rowIndex] = item;
  const row = rows[rowIndex];
  const column = estimateGridColumns[columnIndex]?.id;
  if (!row || !column) return textCell("");

  if (row.kind === "section") {
    if (column === "section") return sectionCell(`${row.outlineCode} · ${row.name}`);
    if (column === "itemName") return sectionCell(`${row.lineCount} items`);
    if (column === "total") return sectionCell(formatCurrency(row.total, currency));
    return sectionCell("");
  }

  const line = estimate.lineItems[row.lineItemIndex];
  if (!line) return textCell("");
  const section = estimate.sections.find((entry) => entry.id === line.sectionId);
  const calculated = calculateEstimateLineTotal(line);

  switch (column) {
    case "section":
      return textCell(section ? `${section.outlineCode} · ${section.name}` : line.sectionId);
    case "itemName":
      return editableTextCell(line.itemName);
    case "quantity":
      return numberCell(line.quantity);
    case "unit":
      return editableTextCell(line.unit);
    case "unitCost":
      return numberCell(line.unitCost ?? line.materialUnitCost ?? 0);
    case "wastePercent":
      return numberCell(line.wastePercent ?? 0);
    case "total":
      return textCell(formatCurrency(calculated.total, currency));
    case "scopeStatus":
      return editableTextCell(line.scopeStatus);
    case "linkState":
      return textCell(line.linkState);
    default:
      return textCell("");
  }
}

export function applyEstimateGridEdit(estimate: Estimate, item: Item, cell: GridCell): Estimate {
  const rows = buildEstimateGridRows(estimate);
  const row = rows[item[1]];
  if (!row || row.kind !== "line") return estimate;
  return applyEstimateGridEditToLineIndex(estimate, item[0], row.lineItemIndex, cell);
}

function applyEstimateGridEditToLineIndex(estimate: Estimate, columnIndex: number, lineItemIndex: number, cell: GridCell): Estimate {
  const column = estimateGridColumns[columnIndex]?.id;
  const line = estimate.lineItems[lineItemIndex];
  if (!line || !column || column === "section" || column === "total" || column === "linkState") return estimate;

  const value = cellToValue(cell);
  const nextLine: EstimateLineItem = { ...line };

  if (column === "itemName" && typeof value === "string") nextLine.itemName = value;
  if (column === "unit" && typeof value === "string") nextLine.unit = value;
  if (column === "scopeStatus" && typeof value === "string") nextLine.scopeStatus = value as EstimateLineItem["scopeStatus"];
  if (column === "quantity") nextLine.quantity = toFiniteNumber(value, line.quantity);
  if (column === "unitCost") {
    const nextUnitCost = toFiniteNumber(value, line.unitCost ?? line.materialUnitCost ?? 0);
    if (line.materialUnitCost !== undefined) {
      nextLine.materialUnitCost = nextUnitCost;
    } else {
      nextLine.unitCost = nextUnitCost;
    }
  }
  if (column === "wastePercent") nextLine.wastePercent = toFiniteNumber(value, line.wastePercent ?? 0);

  return {
    ...estimate,
    lineItems: estimate.lineItems.map((entry, index) => (index === lineItemIndex ? nextLine : entry)),
  };
}

export function insertLibraryItemAtGridRow(estimate: Estimate, libraryItem: CostLibraryItem, visualRowIndex: number): Estimate {
  const rows = buildEstimateGridRows(estimate);
  const target = resolveGridInsertionTarget(estimate, rows, visualRowIndex);
  if (!target.sectionId) return estimate;

  const nextLine = createLineItemFromLibraryItem(libraryItem, target.sectionId, resolveDefaultProposalSectionId(estimate, target.sectionId));
  return {
    ...estimate,
    lineItems: [
      ...estimate.lineItems.slice(0, target.lineItemIndex),
      nextLine,
      ...estimate.lineItems.slice(target.lineItemIndex),
    ],
  };
}

export function resolveGridInsertionTarget(
  estimate: Estimate,
  rows: EstimateGridRow[],
  visualRowIndex: number,
): { sectionId?: string; lineItemIndex: number } {
  const clamped = Math.max(0, Math.min(visualRowIndex, rows.length));
  const row = rows[clamped];
  const previousRow = rows[Math.max(0, clamped - 1)];

  if (row?.kind === "line") return { sectionId: row.sectionId, lineItemIndex: row.lineItemIndex };

  if (row?.kind === "section") {
    const firstLine = rows.slice(clamped + 1).find((entry) => entry.kind === "line" && entry.sectionId === row.sectionId);
    return { sectionId: row.sectionId, lineItemIndex: firstLine?.kind === "line" ? firstLine.lineItemIndex : estimate.lineItems.length };
  }

  if (previousRow?.kind === "line") return { sectionId: previousRow.sectionId, lineItemIndex: previousRow.lineItemIndex + 1 };
  if (previousRow?.kind === "section") return { sectionId: previousRow.sectionId, lineItemIndex: estimate.lineItems.length };

  return { sectionId: estimate.sections[0]?.id, lineItemIndex: estimate.lineItems.length };
}

function textCell(value: string): GridCell {
  return { kind: GridCellKind.Text, data: value, displayData: value, allowOverlay: false };
}

function editableTextCell(value: string): GridCell {
  return { kind: GridCellKind.Text, data: value, displayData: value, allowOverlay: true };
}

function sectionCell(value: string): GridCell {
  return {
    kind: GridCellKind.Text,
    data: value,
    displayData: value,
    allowOverlay: false,
    themeOverride: {
      bgCell: "#F4F1EA",
      textDark: "#334155",
      baseFontStyle: "600 13px Inter",
    },
  };
}

function numberCell(value: number): GridCell {
  return { kind: GridCellKind.Number, data: value, displayData: String(value), allowOverlay: true };
}

function cellToValue(cell: GridCell): string | number | undefined {
  if (cell.kind === GridCellKind.Text) return cell.data;
  if (cell.kind === GridCellKind.Number) return cell.data;
  return undefined;
}

export function resolveDefaultProposalSectionId(estimate: Estimate, workingSectionId?: string): string | undefined {
  const proposalSections = estimate.proposalSections ?? [];
  if (!proposalSections.length) return undefined;

  if (workingSectionId) {
    const existingRows = estimate.lineItems.filter((line) => line.sectionId === workingSectionId && line.proposalSectionId);
    const proposalIdCounts = existingRows.reduce<Record<string, number>>((counts, line) => {
      if (line.proposalSectionId) counts[line.proposalSectionId] = (counts[line.proposalSectionId] ?? 0) + 1;
      return counts;
    }, {});
    const inferredFromExistingRows = Object.entries(proposalIdCounts).sort((left, right) => Number(right[1]) - Number(left[1]))[0]?.[0];
    if (inferredFromExistingRows) return inferredFromExistingRows;

    const workingSection = estimate.sections.find((section) => section.id === workingSectionId);
    const sectionTokens = tokenize(`${workingSection?.id ?? ""} ${workingSection?.name ?? ""} ${workingSection?.outlineCode ?? ""}`);
    const bestMatch = proposalSections
      .map((section) => ({
        section,
        score: Array.from(tokenize(`${section.id} ${section.name} ${section.outlineCode}`)).filter((token) => sectionTokens.has(token)).length,
      }))
      .sort((a, b) => b.score - a.score)[0];
    if (bestMatch && bestMatch.score > 0) return bestMatch.section.id;
  }

  return proposalSections.find((section) => section.displayInProposal)?.id ?? proposalSections[0]?.id;
}

function tokenize(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && token !== "section" && token !== "space" && token !== "proposal"));
}

function toFiniteNumber(value: string | number | undefined, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value: number, currency: string): string {
  return value.toLocaleString("en-PH", { style: "currency", currency });
}
