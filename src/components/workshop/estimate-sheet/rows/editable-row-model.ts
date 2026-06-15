import {
  BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
  clampContingencyPercentage,
  isBlankEstimateRowItem,
  pesoFormatter,
  toEditableContingencyMode,
  type CostAdjustmentMode,
  type FlattenedEstimateRow,
} from "../activity-history";
import { isExpressComponentRow } from "@/lib/estimates/express-components";
import {
  reportEstimateNodeTotalCompute,
  reportEstimateNodeTotalsCompute,
} from "../../estimate-sheet-render-probe";
import type { EstimateRowItem, EstimateTreeNode } from "../../estimate-tree-data";

export function toEditableNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function calculateContingencyValue(subTotal: number, contingencyPercentage: number) {
  return (subTotal * contingencyPercentage) / 100;
}

export function calculateRowTotal(subTotal: number, miscCost: number, contingencyPercentage: number) {
  return subTotal + miscCost + calculateContingencyValue(subTotal, contingencyPercentage);
}

export function updateEditableRowValue(
  current: Record<string, EditableRowValue>,
  item: EstimateRowItem,
  patchValue: Partial<EditableRowValue>,
) {
  const currentRow = current[item.id];
  return {
    ...current,
    [item.id]: {
      quantity: currentRow?.quantity ?? toEditableNumber(item.quantity),
      contingencyMode: currentRow?.contingencyMode ?? toEditableContingencyMode(item.contingencyPercentage ?? 0),
      contingencyPercentage: currentRow?.contingencyPercentage ?? toEditableContingencyPercentage(item.contingencyPercentage ?? 0),
      miscCost: currentRow?.miscCost ?? toEditableNumber(item.miscCost),
      name: currentRow?.name ?? item.material,
      description: currentRow?.description ?? item.description,
      supplier: currentRow?.supplier ?? item.supplier,
      unit: currentRow?.unit ?? item.unit,
      unitCost: currentRow?.unitCost ?? toEditableNumber(item.itemCost),
      imageUrl: currentRow?.imageUrl ?? item.imageUrl ?? "",
      sourceUrl: currentRow?.sourceUrl ?? item.sourceUrl ?? "",
      ...patchValue,
    },
  };
}

export type EditableRowValue = {
  quantity: string;
  contingencyMode: CostAdjustmentMode;
  contingencyPercentage: string;
  miscCost: string;
  name: string;
  description: string;
  supplier: string;
  unit: string;
  unitCost: string;
  imageUrl: string;
  sourceUrl: string;
};

export const COST_ADJUSTMENT_MODE_OPTIONS: readonly { value: CostAdjustmentMode; label: string }[] = [
  { value: "contingency", label: "Contingency" },
  { value: "discount", label: "Discount" },
];

export function parseEditableNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseNonNegativeEditableNumber(value: string) {
  return Math.max(0, parseEditableNumber(value));
}

export function clampCostAdjustmentMagnitude(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.abs(value)));
}

export function parseCostAdjustmentPercentage(value: string, mode: CostAdjustmentMode) {
  const magnitude = clampCostAdjustmentMagnitude(parseEditableNumber(value));
  return mode === "discount" ? -magnitude : magnitude;
}

export function parseEditableContingencyPercentage(editableRow: Pick<EditableRowValue, "contingencyMode" | "contingencyPercentage">) {
  return parseCostAdjustmentPercentage(editableRow.contingencyPercentage, editableRow.contingencyMode);
}

export function toEditableContingencyPercentage(value: number) {
  return toEditableNumber(Math.abs(clampContingencyPercentage(value)));
}

export function formatEditableMoney(value: string) {
  return pesoFormatter.format(parseNonNegativeEditableNumber(value)).replace("₱", "₱ ");
}

export function getInitialEditableRow(item: EstimateRowItem): EditableRowValue {
  const isEmptyInlineComponent = isBlankEstimateRowItem(item) || (isExpressComponentRow(item) && item.material === "Untitled component");
  const editableName = isEmptyInlineComponent || item.material === BLANK_ESTIMATE_ROW_COMPONENT_LABEL ? "" : item.material;
  const editableUnit = isBlankEstimateRowItem(item) && item.unit === "unit" ? "" : item.unit;

  return {
    quantity: toEditableNumber(item.quantity),
    contingencyMode: toEditableContingencyMode(item.contingencyPercentage ?? 0),
    contingencyPercentage: toEditableContingencyPercentage(item.contingencyPercentage ?? 0),
    miscCost: toEditableNumber(item.miscCost),
    name: editableName,
    description: item.description,
    supplier: item.supplier,
    unit: editableUnit,
    unitCost: toEditableNumber(item.itemCost),
    imageUrl: item.imageUrl ?? "",
    sourceUrl: item.sourceUrl ?? "",
  };
}

function getEditableRowValue(item: EstimateRowItem, editableRows: Record<string, Partial<EditableRowValue>>): EditableRowValue {
  return {
    ...getInitialEditableRow(item),
    ...editableRows[item.id],
  };
}

export function collectEditableRows(nodes: EstimateTreeNode[]) {
  const rows: Record<string, EditableRowValue> = {};

  function visit(node: EstimateTreeNode) {
    node.estimateRowItems?.forEach((item) => {
      rows[item.id] = getInitialEditableRow(item);
    });
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return rows;
}

export function computeRowTotal(item: EstimateRowItem, editableRows: Record<string, Partial<EditableRowValue>>) {
  const editableRow = getEditableRowValue(item, editableRows);
  const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
  const itemCost = parseNonNegativeEditableNumber(editableRow.unitCost);
  const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
  const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
  const subTotal = itemCost * quantity;
  return calculateRowTotal(subTotal, miscCost, contingencyPercentage);
}

export function computeNodeTotal(node: EstimateTreeNode, editableRows: Record<string, Partial<EditableRowValue>>): number {
  reportEstimateNodeTotalCompute(node.id);
  const rowTotal = (node.estimateRowItems ?? []).reduce((total, item) => total + computeRowTotal(item, editableRows), 0);
  const childTotal = (node.children ?? []).reduce((total, child) => total + computeNodeTotal(child, editableRows), 0);
  return rowTotal + childTotal;
}

export function computeNodeTotals(nodes: EstimateTreeNode[], editableRows: Record<string, Partial<EditableRowValue>>): Map<string, number> {
  reportEstimateNodeTotalsCompute(nodes.map((node) => node.id));
  const nodeTotals = new Map<string, number>();

  function visit(node: EstimateTreeNode): number {
    let total = 0;
    for (const item of node.estimateRowItems ?? []) {
      total += computeRowTotal(item, editableRows);
    }
    for (const child of node.children ?? []) {
      total += visit(child);
    }
    nodeTotals.set(node.id, total);
    return total;
  }

  for (const node of nodes) {
    visit(node);
  }

  return nodeTotals;
}

export function materializeEditableEstimateTree(nodes: EstimateTreeNode[], editableRows: Record<string, Partial<EditableRowValue>>): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.map((item) => {
      const editableRowPatch = editableRows[item.id];
      if (!editableRowPatch) return item;

      const editableRow = getEditableRowValue(item, editableRows);
      const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
      const itemCost = parseNonNegativeEditableNumber(editableRow.unitCost);
      const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
      const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
      const subTotal = itemCost * quantity;
      const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);

      return {
        ...item,
        material: editableRow.name,
        description: editableRow.description,
        supplier: editableRow.supplier,
        unit: editableRow.unit,
        itemCost,
        imageUrl: editableRow.imageUrl || undefined,
        sourceUrl: editableRow.sourceUrl || undefined,
        quantity,
        contingencyPercentage,
        contingencyValue,
        miscCost,
        subTotal,
        totalItemCosts: subTotal + miscCost + contingencyValue,
      };
    }),
    children: node.children ? materializeEditableEstimateTree(node.children, editableRows) : node.children,
  }));
}

export function flattenEstimateRows(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>): FlattenedEstimateRow[] {
  const rows: FlattenedEstimateRow[] = [];

  function visit(node: EstimateTreeNode, path: string[]) {
    const nodePath = [...path, node.name];
    node.estimateRowItems?.forEach((item) => {
      const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
      const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
      const itemCost = parseNonNegativeEditableNumber(editableRow.unitCost);
      const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
      const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
      const subTotal = itemCost * quantity;
      const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
      rows.push({
        item: {
          ...item,
          material: editableRow.name,
          description: editableRow.description,
          supplier: editableRow.supplier,
          unit: editableRow.unit,
          itemCost,
          imageUrl: editableRow.imageUrl || undefined,
          sourceUrl: editableRow.sourceUrl || undefined,
        },
        nodeId: node.id,
        nodePath,
        quantity,
        contingencyPercentage,
        contingencyValue,
        miscCost,
        lineTotal: subTotal + miscCost + contingencyValue,
      });
    });
    node.children?.forEach((child) => visit(child, nodePath));
  }

  nodes.forEach((node) => visit(node, []));
  return rows;
}
