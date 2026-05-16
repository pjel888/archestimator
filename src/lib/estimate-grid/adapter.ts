import type { GridCell, GridColumn, Item } from "@glideapps/glide-data-grid";
import { GridCellKind } from "@glideapps/glide-data-grid";
import type { CostLibraryItem, Estimate, EstimateLineItem } from "@/lib/local-data/schemas";
import { calculateEstimateLineTotal } from "@/lib/estimates/calculations";
import { createLineItemFromLibraryItem } from "@/lib/estimates/library-insert";

export const estimateGridColumns: GridColumn[] = [
  { id: "section", title: "Section", width: 120 },
  { id: "itemName", title: "Item", width: 260 },
  { id: "quantity", title: "Qty", width: 92 },
  { id: "unit", title: "Unit", width: 84 },
  { id: "unitCost", title: "Unit cost", width: 120 },
  { id: "wastePercent", title: "Waste %", width: 92 },
  { id: "total", title: "Total", width: 132 },
  { id: "scopeStatus", title: "Scope", width: 160 },
  { id: "linkState", title: "Link", width: 150 },
];

export function getEstimateGridCell(estimate: Estimate, item: Item): GridCell {
  const [columnIndex, rowIndex] = item;
  const line = estimate.lineItems[rowIndex];
  const column = estimateGridColumns[columnIndex]?.id;
  if (!line || !column) return textCell("");

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
      return numberCell(line.unitCost ?? 0);
    case "wastePercent":
      return numberCell(line.wastePercent ?? 0);
    case "total":
      return textCell(calculated.total.toLocaleString("en-PH", { style: "currency", currency: "PHP" }));
    case "scopeStatus":
      return editableTextCell(line.scopeStatus);
    case "linkState":
      return textCell(line.linkState);
    default:
      return textCell("");
  }
}

export function applyEstimateGridEdit(estimate: Estimate, item: Item, cell: GridCell): Estimate {
  const [columnIndex, rowIndex] = item;
  const column = estimateGridColumns[columnIndex]?.id;
  const line = estimate.lineItems[rowIndex];
  if (!line || !column || column === "section" || column === "total" || column === "linkState") return estimate;

  const value = cellToValue(cell);
  const nextLine: EstimateLineItem = { ...line };

  if (column === "itemName" && typeof value === "string") nextLine.itemName = value;
  if (column === "unit" && typeof value === "string") nextLine.unit = value;
  if (column === "scopeStatus" && typeof value === "string") nextLine.scopeStatus = value as EstimateLineItem["scopeStatus"];
  if (column === "quantity") nextLine.quantity = toFiniteNumber(value, line.quantity);
  if (column === "unitCost") nextLine.unitCost = toFiniteNumber(value, line.unitCost ?? 0);
  if (column === "wastePercent") nextLine.wastePercent = toFiniteNumber(value, line.wastePercent ?? 0);

  return {
    ...estimate,
    lineItems: estimate.lineItems.map((entry, index) => (index === rowIndex ? nextLine : entry)),
  };
}

export function insertLibraryItemAtGridRow(estimate: Estimate, libraryItem: CostLibraryItem, rowIndex: number): Estimate {
  const targetSectionId = estimate.lineItems[rowIndex]?.sectionId ?? estimate.sections[0]?.id;
  if (!targetSectionId) return estimate;

  const nextLine = createLineItemFromLibraryItem(libraryItem, targetSectionId);
  const insertionIndex = Math.max(0, Math.min(rowIndex, estimate.lineItems.length));
  return {
    ...estimate,
    lineItems: [
      ...estimate.lineItems.slice(0, insertionIndex),
      nextLine,
      ...estimate.lineItems.slice(insertionIndex),
    ],
  };
}

function textCell(value: string): GridCell {
  return { kind: GridCellKind.Text, data: value, displayData: value, allowOverlay: false };
}

function editableTextCell(value: string): GridCell {
  return { kind: GridCellKind.Text, data: value, displayData: value, allowOverlay: true };
}

function numberCell(value: number): GridCell {
  return { kind: GridCellKind.Number, data: value, displayData: String(value), allowOverlay: true };
}

function cellToValue(cell: GridCell): string | number | undefined {
  if (cell.kind === GridCellKind.Text) return cell.data;
  if (cell.kind === GridCellKind.Number) return cell.data;
  return undefined;
}

function toFiniteNumber(value: string | number | undefined, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
