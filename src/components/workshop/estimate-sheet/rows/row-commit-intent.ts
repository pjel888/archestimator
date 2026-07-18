import {
  isExpressComponentRow,
  readProjectComponentProjectionMetadata,
} from "@/lib/estimates/express-components";

import type { EstimateRowItem } from "../../estimate-tree-data";
import type { EditableRowValue } from "./editable-row-model";

export const ROW_COMMIT_INTENT_KINDS = [
  "row-field-update",
  "selected-variant-update",
  "shared-component-definition-update",
  "make-project-specific",
] as const;

export const SHARED_COMPONENT_DEFINITION_TARGETS = [
  "linked-library-component",
  "project-component",
  "project-variant",
] as const;

export type RowCommitIntentKind = (typeof ROW_COMMIT_INTENT_KINDS)[number];
export type SharedComponentDefinitionTarget = (typeof SHARED_COMPONENT_DEFINITION_TARGETS)[number];

type RowCommitIntentBase = {
  rowId: string;
  item: EstimateRowItem;
  values: Partial<EditableRowValue>;
};

export type RowFieldUpdateIntent = RowCommitIntentBase & {
  kind: "row-field-update";
};

export type SelectedVariantUpdateIntent = RowCommitIntentBase & {
  kind: "selected-variant-update";
};

export type SharedComponentDefinitionUpdateIntent = RowCommitIntentBase & {
  kind: "shared-component-definition-update";
  target: SharedComponentDefinitionTarget;
};

export type MakeProjectSpecificIntent = RowCommitIntentBase & {
  kind: "make-project-specific";
};

export type RowCommitIntent =
  | RowFieldUpdateIntent
  | SelectedVariantUpdateIntent
  | SharedComponentDefinitionUpdateIntent
  | MakeProjectSpecificIntent;

export type SelectedVariantCommitInput = {
  id: string;
  label: string;
  variantDescription?: string | null;
  sku?: string | null;
  unit: string;
  unitCost: number;
  sourceUrl?: string | null;
  pricingDate?: string | null;
  pricingSource?: string | null;
  thumbnailPath?: string | null;
  imagePath?: string | null;
};

export type SharedComponentEditScope = {
  kind: "component" | "variant";
  instanceCount: number;
  projectCount: number;
  estimateCount: number;
  affectedEstimates: Array<{
    projectId: string;
    projectName: string;
    estimateId: string;
    estimateName: string;
    instanceCount: number;
    optionUsageCounts?: Record<string, number>;
  }>;
  variantLabel?: string;
};

export type ComponentEditImpactLike = {
  componentKind: "library" | "project";
  instanceCount: number;
  projectCount: number;
  estimateCount: number;
  optionUsageCounts: Record<string, number>;
  affectedEstimates: SharedComponentEditScope["affectedEstimates"];
};

const SHARED_COMPONENT_EDIT_FIELDS = new Set<keyof EditableRowValue>([
  "name",
  "description",
  "brand",
  "supplier",
  "unit",
  "unitCost",
  "priceOptionLabel",
  "imageUrl",
  "sourceUrl",
]);

const PROJECT_COMPONENT_LEVEL_EDIT_FIELDS = new Set<keyof EditableRowValue>([
  "name",
  "brand",
  "supplier",
]);

export function isLinkedLibraryComponentRow(item: EstimateRowItem) {
  return Boolean(item.sourceLibraryItemId)
    && item.linkState !== "detached"
    && item.linkState !== "unlinked";
}

export function isProjectComponentRow(item: EstimateRowItem) {
  if (isLinkedLibraryComponentRow(item)) return false;
  return isExpressComponentRow(item)
    || item.linkState === "detached"
    || Boolean(readProjectComponentProjectionMetadata(item.metadata));
}

export function hasSharedComponentEdit(values: Partial<EditableRowValue>) {
  return Object.keys(values).some((field) => SHARED_COMPONENT_EDIT_FIELDS.has(field as keyof EditableRowValue));
}

function isProjectVariantDefinitionEdit(item: EstimateRowItem, values: Partial<EditableRowValue>) {
  if (!item.priceOptionId?.trim()) return false;
  return !Object.keys(values).some((field) =>
    PROJECT_COMPONENT_LEVEL_EDIT_FIELDS.has(field as keyof EditableRowValue));
}

export function classifyRowCommitIntent(
  item: EstimateRowItem,
  values: Partial<EditableRowValue>,
): RowFieldUpdateIntent | SharedComponentDefinitionUpdateIntent {
  const base = { rowId: item.id, item, values };
  if (!hasSharedComponentEdit(values)) return { ...base, kind: "row-field-update" };
  if (isLinkedLibraryComponentRow(item)) {
    return { ...base, kind: "shared-component-definition-update", target: "linked-library-component" };
  }
  if (!isProjectComponentRow(item)) return { ...base, kind: "row-field-update" };
  return {
    ...base,
    kind: "shared-component-definition-update",
    target: isProjectVariantDefinitionEdit(item, values) ? "project-variant" : "project-component",
  };
}

function getVariantImageUrl(option: SelectedVariantCommitInput, fallbackImageUrl?: string | null) {
  const thumbnailPath = option.thumbnailPath?.trim();
  if (thumbnailPath && /^(https?:|data:|blob:|\/)/.test(thumbnailPath)) return thumbnailPath;
  const imagePath = option.imagePath?.trim();
  if (imagePath && /^(https?:|data:|blob:|\/)/.test(imagePath)) return imagePath;
  return fallbackImageUrl ?? "";
}

export function createSelectedVariantUpdateIntent(
  item: EstimateRowItem,
  option: SelectedVariantCommitInput,
): SelectedVariantUpdateIntent {
  return {
    kind: "selected-variant-update",
    rowId: item.id,
    item,
    values: {
      description: option.variantDescription ?? item.description,
      unit: option.unit || item.unit,
      unitCost: String(option.unitCost),
      imageUrl: getVariantImageUrl(option, item.imageUrl),
      sku: option.sku ?? item.sku ?? null,
      sourceUrl: option.sourceUrl ?? item.sourceUrl ?? "",
      pricingDate: option.pricingDate ?? item.pricingDate ?? null,
      pricingSource: option.pricingSource ?? item.pricingSource ?? null,
      priceOptionId: option.id,
      priceOptionLabel: option.label,
      priceOptions: item.priceOptions,
    },
  };
}

export function createMakeProjectSpecificIntent(
  item: EstimateRowItem,
  values: Partial<EditableRowValue>,
): MakeProjectSpecificIntent {
  return { kind: "make-project-specific", rowId: item.id, item, values };
}

export function getSharedComponentEditScope(
  item: EstimateRowItem,
  values: Partial<EditableRowValue>,
  impact: ComponentEditImpactLike,
): SharedComponentEditScope {
  const componentScope: SharedComponentEditScope = {
    kind: "component",
    instanceCount: impact.instanceCount,
    projectCount: impact.projectCount,
    estimateCount: impact.estimateCount,
    affectedEstimates: impact.affectedEstimates,
  };
  const selectedOptionId = item.priceOptionId?.trim();
  const variantInstanceCount = selectedOptionId ? impact.optionUsageCounts[selectedOptionId] ?? 0 : 0;
  if (
    impact.componentKind !== "project"
    || !selectedOptionId
    || !isProjectVariantDefinitionEdit(item, values)
    || variantInstanceCount === 0
  ) return componentScope;

  const affectedEstimates = impact.affectedEstimates.flatMap((affectedEstimate) => {
    const instanceCount = affectedEstimate.optionUsageCounts?.[selectedOptionId] ?? 0;
    return instanceCount > 0 ? [{ ...affectedEstimate, instanceCount }] : [];
  });
  return {
    kind: "variant",
    instanceCount: variantInstanceCount,
    projectCount: new Set(affectedEstimates.map((affectedEstimate) => affectedEstimate.projectId)).size,
    estimateCount: affectedEstimates.length,
    affectedEstimates,
    variantLabel: item.priceOptionLabel?.trim() || selectedOptionId,
  };
}
