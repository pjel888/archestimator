import {
  clampContingencyPercentage,
  pesoFormatter,
  toEditableContingencyMode,
  type CostAdjustmentMode,
  type FlattenedEstimateRow,
} from "../activity-history";
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
      ...patchValue,
    },
  };
}

export type EditableRowValue = {
  quantity: string;
  contingencyMode: CostAdjustmentMode;
  contingencyPercentage: string;
  miscCost: string;
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
  return {
    quantity: toEditableNumber(item.quantity),
    contingencyMode: toEditableContingencyMode(item.contingencyPercentage ?? 0),
    contingencyPercentage: toEditableContingencyPercentage(item.contingencyPercentage ?? 0),
    miscCost: toEditableNumber(item.miscCost),
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

export function computeRowTotal(item: EstimateRowItem, editableRows: Record<string, EditableRowValue>) {
  const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
  const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
  const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
  const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
  const subTotal = item.itemCost * quantity;
  return calculateRowTotal(subTotal, miscCost, contingencyPercentage);
}

export function computeNodeTotal(node: EstimateTreeNode, editableRows: Record<string, EditableRowValue>): number {
  const rowTotal = (node.estimateRowItems ?? []).reduce((total, item) => total + computeRowTotal(item, editableRows), 0);
  const childTotal = (node.children ?? []).reduce((total, child) => total + computeNodeTotal(child, editableRows), 0);
  return rowTotal + childTotal;
}

export function computeNodeTotals(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>): Map<string, number> {
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

export function materializeEditableEstimateTree(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.map((item) => {
      const editableRow = editableRows[item.id];
      if (!editableRow) return item;

      const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
      const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
      const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
      const subTotal = item.itemCost * quantity;
      const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);

      return {
        ...item,
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
      const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
      const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
      const subTotal = item.itemCost * quantity;
      const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
      rows.push({
        item,
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
