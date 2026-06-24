import {
  BLANK_ESTIMATE_ROW_AUDIT_LABEL,
  BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
} from "@/lib/activity/activity-composer";
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

const componentImageFallbacks: Record<string, string> = {
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
  cabinetry: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=600&q=80",
  finishes: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80",
  "wall paints / interior finishes": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80",
  "electrical fixtures": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
  "lighting fixtures": "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=600&q=80",
  "plumbing fixtures": "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=600&q=80",
  "kitchen fixtures": "https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=600&q=80",
  outdoor: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
};

export function getComponentImageUrl(item: EstimateMaterialCardItem) {
  if (item.imageUrl) return item.imageUrl;
  const category = item.category?.toLowerCase();
  if (category && componentImageFallbacks[category]) return componentImageFallbacks[category];
  const material = item.material.toLowerCase();
  if (material.includes("paint") || material.includes("skimcoat") || material.includes("wallpaper")) return componentImageFallbacks["wall paints / interior finishes"];
  if (material.includes("light") || material.includes("outlet") || material.includes("switch") || material.includes("led")) return componentImageFallbacks["electrical fixtures"];
  if (material.includes("toilet") || material.includes("lavatory") || material.includes("vanity") || material.includes("sink")) return componentImageFallbacks["plumbing fixtures"];
  if (material.includes("tile") || material.includes("floor")) return componentImageFallbacks.finishes;
  if (material.includes("wardrobe") || material.includes("cabinet")) return componentImageFallbacks.cabinetry;
  return componentImageFallbacks.furniture;
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
