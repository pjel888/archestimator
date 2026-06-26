import {
  BLANK_ESTIMATE_ROW_AUDIT_LABEL,
  BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
} from "@/lib/activity/activity-composer";
import { getLocalComponentImageFallback } from "../component-image-fallbacks";
import type { EstimateRowItem } from "../estimate-tree-data";

export { BLANK_ESTIMATE_ROW_AUDIT_LABEL, BLANK_ESTIMATE_ROW_COMPONENT_LABEL };

export type EstimateActivityScope =
  | { mode: "row"; rowId: string }
  | { mode: "sheet" }
  | { mode: "node"; nodeId: string; includeDescendants: boolean };

export type RowDetailTab = "details" | "component" | "activity";

export type RowDetailsState = {
  rowId: string;
  tab: RowDetailTab;
};

export type ActivityFilterState = {
  eventType: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilterState = {
  eventType: "",
  search: "",
  dateFrom: "",
  dateTo: "",
};

export type FlattenedEstimateRow = {
  item: EstimateRowItem;
  nodeId: string;
  nodePath: string[];
  quantity: number;
  contingencyPercentage: number;
  contingencyValue: number;
  miscCost: number;
  lineTotal: number;
};

export type ActivityScopeTreeItem = {
  id: string;
  scope: EstimateActivityScope;
  depth: number;
  kind: "sheet" | "group" | "area" | "row";
  label: string;
  eyebrow: string;
  description?: string;
  total: number | null;
  row: FlattenedEstimateRow | null;
};

export type EstimateMaterialCardItem = Pick<EstimateRowItem, "material" | "supplier" | "itemCost" | "description" | "unit" | "imageUrl" | "category">;

export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

export type CostAdjustmentMode = "contingency" | "discount";

export const BLANK_ESTIMATE_ROW_TAG = "manual-row-placeholder";

export function clampContingencyPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(-100, value));
}

export function toEditableContingencyMode(value: number): CostAdjustmentMode {
  return value < 0 ? "discount" : "contingency";
}

export function isBlankEstimateRowItem(item: EstimateRowItem) {
  const isTaggedPlaceholder = item.tags?.includes(BLANK_ESTIMATE_ROW_TAG);
  const isPersistedPlaceholder =
    item.source === "project" &&
    item.material === BLANK_ESTIMATE_ROW_COMPONENT_LABEL &&
    item.itemCost === 0 &&
    item.category === "Unassigned" &&
    !item.imageUrl;

  return (
    item.source === "project" &&
    item.material === BLANK_ESTIMATE_ROW_COMPONENT_LABEL &&
    (isTaggedPlaceholder || isPersistedPlaceholder)
  );
}

export function formatPeso(value: number) {
  return pesoFormatter.format(value).replace("₱", "₱ ");
}

export function getComponentImageUrl(item: EstimateMaterialCardItem) {
  if (item.imageUrl) return item.imageUrl;
  return getLocalComponentImageFallback(item);
}

function getLocalDateBoundaryISOString(value: string, boundary: "start" | "end") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = boundary === "start"
    ? new Date(year, monthIndex, day, 0, 0, 0, 0)
    : new Date(year, monthIndex, day, 23, 59, 59, 999);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) return undefined;
  return date.toISOString();
}

export function getActivityFilterInput(filters: ActivityFilterState) {
  return {
    eventTypes: filters.eventType ? [filters.eventType] : undefined,
    dateFrom: filters.dateFrom ? getLocalDateBoundaryISOString(filters.dateFrom, "start") : undefined,
    dateTo: filters.dateTo ? getLocalDateBoundaryISOString(filters.dateTo, "end") : undefined,
    search: filters.search.trim() || undefined,
  };
}

export function createActivityFilterKey(filters: ActivityFilterState) {
  return `${filters.eventType}|${filters.search.trim()}|${filters.dateFrom}|${filters.dateTo}`;
}

export function getActivityScopeKey(scope: EstimateActivityScope | null) {
  if (!scope) return "";
  if (scope.mode === "row") return `row:${scope.rowId}`;
  if (scope.mode === "node") return `node:${scope.nodeId}:${scope.includeDescendants ? "desc" : "direct"}`;
  return "sheet";
}
