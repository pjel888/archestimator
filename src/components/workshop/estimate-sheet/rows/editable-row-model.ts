import {
  BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
  clampContingencyPercentage,
  isBlankEstimateRowItem,
  pesoFormatter,
  toEditableContingencyMode,
  type CostAdjustmentMode,
  type FlattenedEstimateRow,
} from "../activity-history-model";
import { isExpressComponentRow } from "@/lib/estimates/express-components";
import { computeEstimateRowCostParts } from "@/lib/estimates/estimate-row-total";
import { formatQuantityExpression, parseQuantityExpression } from "@/lib/estimates/parse-quantity-expression";
import {
  reportEstimateNodeTotalCompute,
  reportEstimateNodeTotalsCompute,
} from "../../estimate-sheet-render-probe";
import type { EstimateRowItem, EstimateTreeNode } from "../../estimate-tree-data";

export type EstimateRowImageAssetDescriptor = {
  kind: "upload-asset";
  schemaVersion: 1;
  assetId: string;
  uploadSessionId: string;
  bucket?: string;
  path?: string;
  thumbnailPath?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  contentType: string;
  sizeBytes: number;
  scanStatus: string;
  width?: number | null;
  height?: number | null;
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
};

function toEditableNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function calculateContingencyValue(subTotal: number, contingencyPercentage: number) {
  return (subTotal * contingencyPercentage) / 100;
}

export function isQuantityContingencyRow(item: Pick<EstimateRowItem, "quantityBase">) {
  return item.quantityBase !== null && item.quantityBase !== undefined;
}

export function calculateQuantityContingencyPercentage(baseQuantity: number, contingencyAmount: number) {
  if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) return 0;
  if (!Number.isFinite(contingencyAmount) || contingencyAmount === 0) return 0;
  return (contingencyAmount / baseQuantity) * 100;
}

export function updateEditableRowValue(
  current: Record<string, EditableRowValue>,
  item: EstimateRowItem,
  patchValue: Partial<EditableRowValue>,
) {
  return {
    ...current,
    [item.id]: buildEditableRowValue(item, current[item.id], patchValue),
  };
}

export function buildEditableRowValue(
  item: EstimateRowItem,
  currentRow: EditableRowValue | undefined,
  patchValue: Partial<EditableRowValue>,
): EditableRowValue {
  return {
    quantity: currentRow?.quantity ?? toEditableNumber(item.quantity),
    quantityExpression: currentRow?.quantityExpression ?? getEditableQuantityExpression(item),
    quantityBase: currentRow?.quantityBase ?? toEditableQuantityBase(item),
    quantityContingencyAmount: currentRow?.quantityContingencyAmount ?? toEditableQuantityContingencyAmount(item),
    contingencyMode: currentRow?.contingencyMode ?? (isQuantityContingencyRow(item) ? "contingency" : toEditableContingencyMode(item.contingencyPercentage ?? 0)),
    contingencyPercentage: currentRow?.contingencyPercentage ?? toEditableContingencyPercentage(getEditableContingencyPercentage(item)),
    adjustmentPercentage: currentRow?.adjustmentPercentage ?? toEditableAdjustmentPercentage(getEditableAdjustmentPercentage(item)),
    miscCost: currentRow?.miscCost ?? toEditableNumber(item.miscCost),
    name: currentRow?.name ?? item.material,
    description: currentRow?.description ?? item.description,
    brand: currentRow?.brand ?? item.brand ?? "",
    supplier: currentRow?.supplier ?? item.supplier,
    unit: currentRow?.unit ?? item.unit,
    unitCost: currentRow?.unitCost ?? toEditableNumber(item.itemCost),
    imageUrl: currentRow?.imageUrl ?? item.imageUrl ?? "",
    sourceUrl: currentRow?.sourceUrl ?? item.sourceUrl ?? "",
    ...patchValue,
  };
}

export type EditableRowValue = {
  quantity: string;
  quantityExpression: string;
  quantityBase: string;
  quantityContingencyAmount: string;
  contingencyMode: CostAdjustmentMode;
  contingencyPercentage: string;
  adjustmentPercentage: string;
  miscCost: string;
  name: string;
  description: string;
  brand: string;
  supplier: string;
  unit: string;
  unitCost: string;
  imageUrl: string;
  imageAsset?: EstimateRowImageAssetDescriptor | null;
  sourceUrl: string;
  category?: string;
  categoryNodeId?: string | null;
  brandId?: string | null;
  supplierId?: string | null;
  sku?: string | null;
  priceOptionId?: string | null;
  priceOptionLabel?: string | null;
  priceOptions?: EstimateRowItem["priceOptions"];
  pricingDate?: string | null;
  pricingSource?: string | null;
  lifecycleState?: EstimateRowItem["lifecycleState"] | null;
  lifecycleStateChangedAt?: string | null;
  notes?: string | null;
};

function parseEditableNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseNonNegativeEditableNumber(value: string) {
  return Math.max(0, parseEditableNumber(value));
}

function parseNullableNonNegativeEditableNumber(value: string) {
  if (value.trim() === "") return null;
  return parseNonNegativeEditableNumber(value);
}

function parseNullableEditableNumber(value: string) {
  if (value.trim() === "") return null;
  return parseEditableNumber(value);
}

function clampCostAdjustmentMagnitude(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.abs(value)));
}

function clampCostAdjustmentPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(-100, value));
}

function toEditableAdjustmentMode(value: number): CostAdjustmentMode {
  return value < 0 ? "discount" : "contingency";
}

export function parseCostAdjustmentPercentage(value: string, mode: CostAdjustmentMode) {
  const magnitude = clampCostAdjustmentMagnitude(parseEditableNumber(value));
  return mode === "discount" ? -magnitude : magnitude;
}

export function parseEditableContingencyPercentage(editableRow: Pick<EditableRowValue, "contingencyMode" | "contingencyPercentage">) {
  return parseCostAdjustmentPercentage(editableRow.contingencyPercentage, editableRow.contingencyMode);
}

export function parseEditableAdjustmentPercentage(value: string) {
  return clampCostAdjustmentPercentage(parseEditableNumber(value));
}

export function toEditableContingencyPercentage(value: number) {
  return toEditableNumber(Math.abs(clampContingencyPercentage(value)));
}

export function toEditableAdjustmentPercentage(value: number) {
  return toEditableNumber(clampCostAdjustmentPercentage(value));
}

export function formatSignedEditablePercentage(value: string | number) {
  const parsed = typeof value === "number" ? clampCostAdjustmentPercentage(value) : parseEditableAdjustmentPercentage(value);
  return parsed > 0 ? `+${toEditableNumber(parsed)}` : toEditableNumber(parsed);
}

export function formatEditableMoney(value: string) {
  return pesoFormatter.format(parseNonNegativeEditableNumber(value)).replace("₱", "₱ ");
}

function toEditableQuantityBase(item: EstimateRowItem) {
  return isQuantityContingencyRow(item) ? toEditableNumber(item.quantityBase ?? 0) : "";
}

function toEditableQuantityContingencyAmount(item: EstimateRowItem) {
  return isQuantityContingencyRow(item) ? toEditableNumber(item.quantityContingencyAmount ?? 0) : "";
}

function getEditableQuantityExpression(item: EstimateRowItem) {
  if (!isQuantityContingencyRow(item)) return "";
  const contingencyAmount = item.quantityContingencyAmount ?? 0;
  return contingencyAmount !== 0 ? formatQuantityExpression(item.quantityBase ?? item.quantity, contingencyAmount) : "";
}

function getEditableContingencyPercentage(item: EstimateRowItem) {
  if (!isQuantityContingencyRow(item)) return 0;
  return calculateQuantityContingencyPercentage(item.quantityBase ?? 0, item.quantityContingencyAmount ?? 0);
}

function getEditableAdjustmentPercentage(item: EstimateRowItem) {
  if (item.adjustmentPercentage !== undefined) return item.adjustmentPercentage;
  return isQuantityContingencyRow(item) ? 0 : item.contingencyPercentage ?? 0;
}

export type EditableRowAmounts = {
  quantity: number;
  itemCost: number;
  quantityBase: number | null;
  quantityContingencyAmount: number | null;
  contingencyPercentage: number;
  contingencyValue: number;
  adjustmentPercentage: number;
  adjustmentValue: number;
  miscCost: number;
  subTotal: number;
  totalItemCosts: number;
  isQuantityContingency: boolean;
};

export function parseEditableQuantityExpression(
  item: EstimateRowItem,
  value: string,
): { ok: true; patch: Partial<EditableRowValue> } | { ok: false; error: string } {
  const result = parseQuantityExpression(value);
  if (!result.isValid) return { ok: false, error: result.error ?? "Enter a valid quantity." };

  const shouldUseQuantityContingency = result.hasContingencyExpression || isQuantityContingencyRow(item);
  if (!shouldUseQuantityContingency) {
    return {
      ok: true,
      patch: {
        quantity: toEditableNumber(result.totalQuantity),
        quantityExpression: "",
        quantityBase: "",
        quantityContingencyAmount: "",
      },
    };
  }

  return {
    ok: true,
    patch: {
      quantity: toEditableNumber(result.totalQuantity),
      quantityExpression: result.hasContingency ? result.expression : "",
      quantityBase: toEditableNumber(result.baseQuantity),
      quantityContingencyAmount: toEditableNumber(result.contingencyAmount),
      contingencyMode: toEditableAdjustmentMode(result.contingencyPercentage),
      contingencyPercentage: toEditableContingencyPercentage(result.contingencyPercentage),
    },
  };
}

export function getEditableQuantityInputValue(editableRow: EditableRowValue) {
  return editableRow.quantityExpression || editableRow.quantity;
}

export function buildEditableQuantityContingencyPatch(baseValue: string, contingencyAmountValue: string): Partial<EditableRowValue> {
  const baseQuantity = parseNonNegativeEditableNumber(baseValue);
  const contingencyAmount = Math.max(-baseQuantity, parseEditableNumber(contingencyAmountValue));
  const totalQuantity = baseQuantity + contingencyAmount;
  const contingencyPercentage = calculateQuantityContingencyPercentage(baseQuantity, contingencyAmount);

  return {
    quantity: toEditableNumber(totalQuantity),
    quantityExpression: contingencyAmount !== 0 ? formatQuantityExpression(baseQuantity, contingencyAmount) : "",
    quantityBase: toEditableNumber(baseQuantity),
    quantityContingencyAmount: toEditableNumber(contingencyAmount),
    contingencyMode: toEditableAdjustmentMode(contingencyPercentage),
    contingencyPercentage: toEditableContingencyPercentage(contingencyPercentage),
  };
}

export function buildEditableQuantityContingencyPercentagePatch(baseValue: string, percentageValue: string): Partial<EditableRowValue> {
  const baseQuantity = parseNonNegativeEditableNumber(baseValue);
  const percentage = clampCostAdjustmentPercentage(parseEditableNumber(percentageValue));
  const contingencyAmount = baseQuantity * percentage / 100;
  return buildEditableQuantityContingencyPatch(toEditableNumber(baseQuantity), toEditableNumber(contingencyAmount));
}

export function getEditableRowAmounts(item: EstimateRowItem, editableRow: EditableRowValue): EditableRowAmounts {
  const itemCost = parseNonNegativeEditableNumber(editableRow.unitCost);
  const storedQuantityMode = isQuantityContingencyRow(item);
  const parsedQuantityBase = parseNullableNonNegativeEditableNumber(editableRow.quantityBase);
  const parsedQuantityContingencyAmount = parseNullableEditableNumber(editableRow.quantityContingencyAmount);
  const isQuantityContingency = parsedQuantityBase !== null || storedQuantityMode;

  const quantityBase = isQuantityContingency
    ? parsedQuantityBase ?? parseNonNegativeEditableNumber(editableRow.quantity)
    : null;
  const resolvedQuantityBase = quantityBase ?? 0;
  const quantityContingencyAmount = isQuantityContingency
    ? Math.max(-resolvedQuantityBase, parsedQuantityContingencyAmount ?? 0)
    : null;
  const resolvedQuantityContingencyAmount = quantityContingencyAmount ?? 0;
  const quantity = isQuantityContingency
    ? resolvedQuantityBase + resolvedQuantityContingencyAmount
    : parseNonNegativeEditableNumber(editableRow.quantity);
  const contingencyPercentage = isQuantityContingency
    ? calculateQuantityContingencyPercentage(resolvedQuantityBase, resolvedQuantityContingencyAmount)
    : 0;
  const contingencyValue = 0;
  const adjustmentPercentage = parseEditableAdjustmentPercentage(editableRow.adjustmentPercentage);
  const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
  const canonicalCostParts = computeEstimateRowCostParts({
    quantity,
    quantity_base: quantityBase,
    quantity_contingency_amount: quantityContingencyAmount,
    unit_cost: itemCost,
    adjustment_percentage: adjustmentPercentage,
    misc_cost: miscCost,
    currency_code: "PHP",
  });

  const subTotal = canonicalCostParts.ok ? canonicalCostParts.value.materialMinorUnits / 100 : 0;
  const adjustmentValue = canonicalCostParts.ok ? canonicalCostParts.value.adjustmentMinorUnits / 100 : 0;
  const canonicalMiscCost = canonicalCostParts.ok ? canonicalCostParts.value.miscMinorUnits / 100 : 0;
  const totalItemCosts = canonicalCostParts.ok ? canonicalCostParts.value.total : 0;

  return {
    quantity,
    itemCost,
    quantityBase,
    quantityContingencyAmount,
    contingencyPercentage,
    contingencyValue,
    adjustmentPercentage,
    adjustmentValue,
    miscCost: canonicalMiscCost,
    subTotal,
    totalItemCosts,
    isQuantityContingency,
  };
}

export function getInitialEditableRow(item: EstimateRowItem): EditableRowValue {
  const isEmptyInlineComponent = isBlankEstimateRowItem(item) || (isExpressComponentRow(item) && item.material === "Untitled component");
  const editableName = isEmptyInlineComponent || item.material === BLANK_ESTIMATE_ROW_COMPONENT_LABEL ? "" : item.material;
  const editableUnit = isBlankEstimateRowItem(item) && item.unit === "unit" ? "" : item.unit;

  return {
    quantity: toEditableNumber(item.quantity),
    quantityExpression: getEditableQuantityExpression(item),
    quantityBase: toEditableQuantityBase(item),
    quantityContingencyAmount: toEditableQuantityContingencyAmount(item),
    contingencyMode: toEditableContingencyMode(getEditableContingencyPercentage(item)),
    contingencyPercentage: toEditableContingencyPercentage(getEditableContingencyPercentage(item)),
    adjustmentPercentage: toEditableAdjustmentPercentage(getEditableAdjustmentPercentage(item)),
    miscCost: toEditableNumber(item.miscCost),
    name: editableName,
    description: item.description,
    brand: item.brand ?? "",
    supplier: item.supplier,
    unit: editableUnit,
    unitCost: toEditableNumber(item.itemCost),
    priceOptionLabel: item.priceOptionLabel ?? null,
    imageUrl: item.imageUrl ?? "",
    sourceUrl: item.sourceUrl ?? "",
    notes: item.notes ?? "",
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

export function computeEditableRowTotal(item: EstimateRowItem, editableRows: Record<string, Partial<EditableRowValue>>) {
  const editableRow = getEditableRowValue(item, editableRows);
  return getEditableRowAmounts(item, editableRow).totalItemCosts;
}

export function computeNodeTotal(node: EstimateTreeNode, editableRows: Record<string, Partial<EditableRowValue>>): number {
  reportEstimateNodeTotalCompute(node.id);
  const rowTotal = (node.estimateRowItems ?? []).reduce((total, item) => total + computeEditableRowTotal(item, editableRows), 0);
  const childTotal = (node.children ?? []).reduce((total, child) => total + computeNodeTotal(child, editableRows), 0);
  return rowTotal + childTotal;
}

export function computeNodeTotals(nodes: EstimateTreeNode[], editableRows: Record<string, Partial<EditableRowValue>>): Map<string, number> {
  reportEstimateNodeTotalsCompute(nodes.map((node) => node.id));
  const nodeTotals = new Map<string, number>();

  function visit(node: EstimateTreeNode): number {
    let total = 0;
    for (const item of node.estimateRowItems ?? []) {
      total += computeEditableRowTotal(item, editableRows);
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
      const amounts = getEditableRowAmounts(item, editableRow);

      return {
        ...item,
        material: editableRow.name,
        description: editableRow.description,
        brand: editableRow.brand || undefined,
        supplier: editableRow.supplier,
        unit: editableRow.unit,
        itemCost: amounts.itemCost,
        imageUrl: editableRow.imageUrl || undefined,
        sourceUrl: editableRow.sourceUrl || undefined,
        quantity: amounts.quantity,
        quantityBase: amounts.quantityBase,
        quantityContingencyAmount: amounts.quantityContingencyAmount,
        contingencyPercentage: amounts.contingencyPercentage,
        contingencyValue: amounts.contingencyValue,
        adjustmentPercentage: amounts.adjustmentPercentage,
        adjustmentValue: amounts.adjustmentValue,
        miscCost: amounts.miscCost,
        subTotal: amounts.subTotal,
        totalItemCosts: amounts.totalItemCosts,
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
      const amounts = getEditableRowAmounts(item, editableRow);
      rows.push({
        item: {
          ...item,
          material: editableRow.name,
          description: editableRow.description,
          brand: editableRow.brand || undefined,
          supplier: editableRow.supplier,
          unit: editableRow.unit,
          itemCost: amounts.itemCost,
          imageUrl: editableRow.imageUrl || undefined,
          sourceUrl: editableRow.sourceUrl || undefined,
          quantityBase: amounts.quantityBase,
          quantityContingencyAmount: amounts.quantityContingencyAmount,
          adjustmentPercentage: amounts.adjustmentPercentage,
          adjustmentValue: amounts.adjustmentValue,
        },
        nodeId: node.id,
        nodePath,
        quantity: amounts.quantity,
        contingencyPercentage: amounts.contingencyPercentage,
        contingencyValue: amounts.contingencyValue,
        adjustmentPercentage: amounts.adjustmentPercentage,
        adjustmentValue: amounts.adjustmentValue,
        miscCost: amounts.miscCost,
        lineTotal: amounts.totalItemCosts,
      });
    });
    node.children?.forEach((child) => visit(child, nodePath));
  }

  nodes.forEach((node) => visit(node, []));
  return rows;
}
