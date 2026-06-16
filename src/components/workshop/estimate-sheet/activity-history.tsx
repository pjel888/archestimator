"use client";

import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, Circle, Cube, FolderSimple, FunnelSimple, Plus, WarningCircle, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput } from "@/components/ui/control-input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { composeEstimateActivity, formatActivityActor, formatActivityFieldLabel, formatActivityValue } from "@/lib/activity";
import { fetchEstimateSheetVersionControl, type EstimateSheetHistoryEvent, type EstimateSheetVersionControlData } from "@/lib/estimates/actions";
import { isExpressComponentRow } from "@/lib/estimates/express-components";
import { normalizeEstimateRowImageUrl } from "@/lib/estimates/image-url";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";
import { cn } from "@/lib/ui/cn";
import type { EstimateRowItem } from "../estimate-tree-data";
import { WORKSHOP_TREE_ICON_SLOT_CLASS, WORKSHOP_TREE_ROW_GAP_CLASS } from "../tree-visual-style";
import { WorkshopTreeRow, WorkshopTreeTabs, type WorkshopTreeTabItem } from "../workshop-tree";

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

const ACTIVITY_FILTER_EVENT_TYPES = [
  { value: "", label: "All events" },
  { value: "row_updated", label: "Row updates" },
  { value: "row_replaced", label: "Replacements" },
  { value: "row_added", label: "Added rows" },
  { value: "row_blank_added", label: "Added blank rows" },
  { value: "row_deleted", label: "Deleted rows" },
  { value: "template_inserted", label: "Templates" },
  { value: "node_created", label: "Node created" },
  { value: "node_renamed", label: "Node renamed" },
  { value: "tree_reordered", label: "Tree reordered" },
  { value: "node_deleted_with_children", label: "Node deleted" },
  { value: "sheet_code_updated", label: "Estimate code" },
  { value: "sheet_metadata_updated", label: "Estimate metadata" },
  { value: "tab_created", label: "Tab created" },
  { value: "tab_renamed", label: "Tab renamed" },
  { value: "tabs_reordered", label: "Tabs reordered" },
  { value: "tab_duplicated", label: "Tab duplicated" },
  { value: "tab_archived", label: "Tab archived" },
  { value: "tab_deleted", label: "Tab deleted" },
] as const;

const ACTIVITY_SCOPE_TREE_TABS: readonly WorkshopTreeTabItem<"sheets">[] = [{ id: "sheets", label: "Sheets" }];

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

export { BLANK_ESTIMATE_ROW_AUDIT_LABEL, BLANK_ESTIMATE_ROW_COMPONENT_LABEL } from "@/lib/activity/activity-composer";
import { BLANK_ESTIMATE_ROW_AUDIT_LABEL, BLANK_ESTIMATE_ROW_COMPONENT_LABEL } from "@/lib/activity/activity-composer";
export const BLANK_ESTIMATE_ROW_TAG = "manual-row-placeholder";

export function clampContingencyPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(-100, value));
}

export function toEditableContingencyMode(value: number): CostAdjustmentMode {
  return value < 0 ? "discount" : "contingency";
}

function formatCostAdjustmentPercentage(value: number) {
  const modeLabel = toEditableContingencyMode(value) === "discount" ? "Discount" : "Contingency";
  return `${modeLabel} ${formatAuditNumber(Math.abs(clampContingencyPercentage(value)))}%`;
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

function AddTreeActionIcon() {
  return (
    <span className="relative flex size-4 items-center justify-center" aria-hidden="true">
      <Circle size={13} weight="regular" className="absolute left-0 top-1/2 -translate-y-1/2" />
      <Plus size={8} weight="regular" className="absolute right-0 top-0" />
    </span>
  );
}

export function formatPeso(value: number) {
  return pesoFormatter.format(value).replace("₱", "₱ ");
}

function formatSignedPeso(value: number | null | undefined) {
  if (value === null || value === undefined || Math.abs(value) < 0.005) return "no total change";
  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatPeso(Math.abs(value))}`;
}

function formatShortDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatActivityDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getLegacyEventAccessibilityLabel(eventType: string) {
  const labels: Record<string, string> = {
    row_added: "Row added",
    row_blank_added: "Blank row added",
    row_updated: "Row updated",
    row_replaced: "Row replaced",
    row_deleted: "Row deleted",
    tree_reordered: "Tree reordered",
    template_inserted: "Template inserted",
    sheet_code_updated: "Estimate code updated",
    sheet_metadata_updated: "Estimate metadata updated",
    sheet_version_created: "Version snapshot created",
    sheet_restored_as_copy: "Version restored as copy",
    node_created: "Node created",
    node_renamed: "Node renamed",
    node_deleted_with_children: "Area deleted",
    tab_created: "Tab created",
    tab_renamed: "Tab renamed",
    tab_reordered: "Tabs reordered",
    tabs_reordered: "Tabs reordered",
    tab_duplicated: "Tab duplicated",
    tab_archived: "Tab archived",
    tab_deleted: "Tab deleted",
  };
  return labels[eventType] ?? "Activity recorded";
}

function composeEstimateHistoryActivity(event: EstimateSheetHistoryEvent) {
  return composeEstimateActivity(event, { audience: "owner", visibility: "owner" });
}

function getEventLabel(event: EstimateSheetHistoryEvent) {
  return composeEstimateHistoryActivity(event).title;
}

function isBlankEstimateRowAuditMaterial(value: unknown) {
  return readStringValue(value).trim() === BLANK_ESTIMATE_ROW_COMPONENT_LABEL;
}

function isBlankEstimateRowAuditSnapshot(snapshot: Record<string, unknown>) {
  if (!isBlankEstimateRowAuditMaterial(snapshot.material)) return false;
  if (snapshot.sourceLibraryItemId) return false;

  const sourceSnapshot = readRecord(snapshot.sourceSnapshot);
  const hasSourceSnapshot = Object.keys(sourceSnapshot).length > 0;
  const unitCost = readOptionalNumber(snapshot.unitCost ?? snapshot.itemCost);
  const lineTotal = readOptionalNumber(snapshot.lineTotal);
  const hasCost = (unitCost !== null && Math.abs(unitCost) >= 0.005) || (lineTotal !== null && Math.abs(lineTotal) >= 0.005);
  return !hasSourceSnapshot && !hasCost;
}

function isBlankEstimateRowAuditEvent(event: EstimateSheetHistoryEvent) {
  if (event.eventType !== "row_blank_added" && event.eventType !== "row_deleted") return false;
  return (
    isBlankEstimateRowAuditMaterial(event.rowContext.material) ||
    isBlankEstimateRowAuditSnapshot(getEventSnapshotRecord(event.oldSnapshot)) ||
    isBlankEstimateRowAuditSnapshot(getEventSnapshotRecord(event.newSnapshot))
  );
}

function formatAuditMaterialName(value: string) {
  return value.trim() === BLANK_ESTIMATE_ROW_COMPONENT_LABEL ? BLANK_ESTIMATE_ROW_AUDIT_LABEL : value;
}

function getEventSummary(event: EstimateSheetHistoryEvent) {
  const activity = composeEstimateHistoryActivity(event);
  if (activity.changes?.length) return activity.changes.map((change) => change.label.toLowerCase()).join(", ");
  if (activity.summary) return activity.summary;
  if (activity.target.secondaryLabel) return activity.target.secondaryLabel;
  return activity.target.label || "Estimate activity";
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

function getEventSnapshotRecord(snapshot: unknown) {
  const record = readRecord(snapshot);
  const changedRecord = readRecord(record.changed);
  return Object.keys(changedRecord).length > 0 ? changedRecord : record;
}

type AuditChangeDetail =
  | { kind: "diff"; label: string; oldValue: string; newValue: string }
  | { kind: "note"; label: string; value: string };

type AuditComponentSnapshot = {
  key: string;
  label: string;
  item: EstimateMaterialCardItem;
  imageUrl: string;
  category: string;
  quantityLabel: string | null;
  unitCostLabel: string;
  lineTotalLabel: string;
  sourceLabel: string;
};

const ROW_HISTORY_COMPONENT_EVENT_TYPES = new Set(["row_added", "row_replaced", "row_deleted"]);
const ROW_HISTORY_COMPONENT_FIELDS = new Set(["linkState", "sourceLibraryItemId", "sourceSnapshot"]);
const ROW_HISTORY_SCALAR_FIELDS = new Set(["quantity", "contingencyPercentage", "miscCost"]);
const AUDIT_DETAIL_LIMIT = 5;

const ROW_REPLACED_DETAIL_FIELDS = ["material", "supplier", "unitCost", "unit", "quantity", "contingencyPercentage", "miscCost"];
const HIDDEN_AUDIT_FIELDS = new Set(["metadata"]);

function shouldRenderRowHistoryComponent(event: EstimateSheetHistoryEvent) {
  if (isBlankEstimateRowAuditEvent(event)) return false;
  if (ROW_HISTORY_COMPONENT_EVENT_TYPES.has(event.eventType)) return true;
  if (event.changedFields.some((field) => ROW_HISTORY_SCALAR_FIELDS.has(field))) return false;
  return event.changedFields.some((field) => ROW_HISTORY_COMPONENT_FIELDS.has(field));
}

function getAuditSnapshotSourceRecord(snapshot: Record<string, unknown>) {
  return readRecord(snapshot.sourceSnapshot);
}

function getAuditSnapshotCategory(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  const categoryPath = Array.isArray(sourceSnapshot.categoryPath)
    ? sourceSnapshot.categoryPath.filter((part): part is string => typeof part === "string")
    : [];
  const lastCategoryPathPart = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1] : undefined;
  return readStringValue(sourceSnapshot.category, lastCategoryPathPart ?? "Uncategorized");
}

function getAuditSnapshotUnit(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  return readStringValue(snapshot.unit, readStringValue(sourceSnapshot.unit, "unit"));
}

function getAuditSnapshotUnitCost(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  return readOptionalNumber(snapshot.unitCost)
    ?? readOptionalNumber(snapshot.itemCost)
    ?? readOptionalNumber(sourceSnapshot.unit_cost);
}

function getAuditSnapshotLineTotal(snapshot: Record<string, unknown>) {
  return readOptionalNumber(snapshot.lineTotal) ?? readOptionalNumber(snapshot.totalItemCosts);
}

function getAuditSnapshotSourceLabel(snapshot: Record<string, unknown>) {
  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  const versionNumber = readOptionalNumber(sourceSnapshot.componentVersionNumber);
  const priceOptionLabel = readStringValue(sourceSnapshot.priceOptionLabel);
  const sourceKind = snapshot.sourceLibraryItemId || sourceSnapshot.sourceLibraryItemId ? "Library snapshot" : "Row snapshot";
  return [
    sourceKind,
    versionNumber !== null ? `V${versionNumber}` : "",
    priceOptionLabel,
  ].filter(Boolean).join(" · ");
}

function formatAuditSnapshotMoney(value: number | null) {
  return value === null ? "Not captured" : formatPeso(value);
}

function readOptionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAuditNumber(value: number) {
  return new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(value);
}

function humanizeAuditField(field: string) {
  return formatActivityFieldLabel(field);
}

function humanizeAuditValue(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSnapshotUnit(snapshot: Record<string, unknown>) {
  return readStringValue(snapshot.unit, "unit");
}

function formatAuditFieldValue(field: string, value: unknown, snapshot: Record<string, unknown>) {
  if (value === null || value === undefined || value === "") return "—";
  const formatted = formatActivityValue(field, value);
  if (field === "material") return formatAuditMaterialName(formatted);
  if (field === "quantity") {
    const parsed = readOptionalNumber(value);
    return parsed === null ? formatted : `${formatted} ${getSnapshotUnit(snapshot)}`;
  }
  if (field === "contingencyPercentage") {
    const contingencyValue = readOptionalNumber(snapshot.contingencyValue);
    const percentage = formatted.startsWith("Contingency ") ? formatted : `Contingency ${formatted}`;
    return contingencyValue === null ? percentage : `${percentage} (${formatPeso(contingencyValue)})`;
  }
  return formatted;
}

function getOrderedAuditFields(event: EstimateSheetHistoryEvent) {
  const fields = event.eventType === "row_replaced" ? ROW_REPLACED_DETAIL_FIELDS : event.changedFields;
  const ordered = fields.filter((field, index) => fields.indexOf(field) === index && !HIDDEN_AUDIT_FIELDS.has(field));
  return ordered.slice(0, AUDIT_DETAIL_LIMIT);
}

function getAuditChangeDetails(event: EstimateSheetHistoryEvent): AuditChangeDetail[] {
  const oldSnapshot = getEventSnapshotRecord(event.oldSnapshot);
  const newSnapshot = getEventSnapshotRecord(event.newSnapshot);
  const payload = event.payload;

  if (event.eventType === "tree_reordered") {
    const updatedCount = readOptionalNumber(payload.updatedCount);
    return [{ kind: "note", label: "Tree order", value: updatedCount === null ? "Estimate tree reordered" : `${formatAuditNumber(updatedCount)} nodes reordered` }];
  }

  if (event.eventType === "template_inserted") {
    return [
      { kind: "note", label: "Template", value: readStringValue(payload.sourceTemplateId, "Estimate template") },
      { kind: "note", label: "Target", value: readStringValue(payload.targetParentNodeId, "Selected area") },
    ];
  }

  if (event.eventType === "node_deleted_with_children") {
    const rowCount = readOptionalNumber(payload.deletedRowCount);
    const nodeCount = readOptionalNumber(payload.deletedNodeCount);
    return [
      { kind: "note", label: "Deleted rows", value: rowCount === null ? "Rows removed" : formatAuditNumber(rowCount) },
      { kind: "note", label: "Deleted areas", value: nodeCount === null ? "Areas removed" : formatAuditNumber(nodeCount) },
    ];
  }

  if (event.eventType === "node_created") {
    return [
      { kind: "note", label: "Node", value: readStringValue(payload.name, "New area") },
      { kind: "note", label: "Kind", value: humanizeAuditValue(readStringValue(payload.kind, "node")) },
      { kind: "note", label: "Parent", value: readStringValue(payload.parentId, "Tab root") },
    ];
  }

  return getOrderedAuditFields(event)
    .map((field) => ({
      kind: "diff" as const,
      label: humanizeAuditField(field),
      oldValue: formatAuditFieldValue(field, oldSnapshot[field], oldSnapshot),
      newValue: formatAuditFieldValue(field, newSnapshot[field], newSnapshot),
    }))
    .filter((detail) => detail.oldValue !== detail.newValue);
}

function getRowHistoryMaterialItem(snapshot: Record<string, unknown>): EstimateMaterialCardItem | null {
  if (isBlankEstimateRowAuditSnapshot(snapshot)) return null;

  const sourceSnapshot = getAuditSnapshotSourceRecord(snapshot);
  const material = readStringValue(snapshot.material);

  if (!material) return null;

  return {
    material,
    supplier: readStringValue(snapshot.supplier, readStringValue(sourceSnapshot.supplier, "No supplier captured")),
    itemCost: getAuditSnapshotUnitCost(snapshot) ?? 0,
    description: readStringValue(snapshot.description, readStringValue(sourceSnapshot.description, "")),
    unit: getAuditSnapshotUnit(snapshot),
    imageUrl: normalizeEstimateRowImageUrl(sourceSnapshot.imageUrl) ?? undefined,
    category: getAuditSnapshotCategory(snapshot),
  };
}

function createAuditComponentSnapshot(key: string, label: string, snapshot: Record<string, unknown>): AuditComponentSnapshot | null {
  const item = getRowHistoryMaterialItem(snapshot);
  if (!item) return null;

  const quantity = readOptionalNumber(snapshot.quantity);
  const unitCost = getAuditSnapshotUnitCost(snapshot);
  const lineTotal = getAuditSnapshotLineTotal(snapshot);

  return {
    key,
    label,
    item,
    imageUrl: item.imageUrl ?? "",
    category: item.category ?? "Uncategorized",
    quantityLabel: quantity === null ? null : `${formatAuditNumber(quantity)} ${item.unit}`,
    unitCostLabel: formatAuditSnapshotMoney(unitCost),
    lineTotalLabel: formatAuditSnapshotMoney(lineTotal),
    sourceLabel: getAuditSnapshotSourceLabel(snapshot),
  };
}

function getAuditComponentSnapshots(event: EstimateSheetHistoryEvent): AuditComponentSnapshot[] {
  if (!shouldRenderRowHistoryComponent(event)) return [];

  const oldSnapshot = getEventSnapshotRecord(event.oldSnapshot);
  const newSnapshot = getEventSnapshotRecord(event.newSnapshot);

  if (event.eventType === "row_replaced") {
    return [
      createAuditComponentSnapshot("before", "Before component", oldSnapshot),
      createAuditComponentSnapshot("after", "After component", newSnapshot),
    ].filter((snapshot): snapshot is AuditComponentSnapshot => Boolean(snapshot));
  }

  if (event.eventType === "row_added") {
    const addedSnapshot = createAuditComponentSnapshot("added", "Component added", newSnapshot);
    return addedSnapshot ? [addedSnapshot] : [];
  }

  if (event.eventType === "row_deleted") {
    const removedSnapshot = createAuditComponentSnapshot("removed", "Component removed", oldSnapshot);
    return removedSnapshot ? [removedSnapshot] : [];
  }

  return [
    createAuditComponentSnapshot("before", "Before component", oldSnapshot),
    createAuditComponentSnapshot("after", "After component", newSnapshot),
  ].filter((snapshot): snapshot is AuditComponentSnapshot => Boolean(snapshot));
}

function getHistoryChangeLabel(event: EstimateSheetHistoryEvent) {
  const activity = composeEstimateHistoryActivity(event);
  const summary = getEventSummary(event);
  return summary && summary !== activity.title ? `${activity.title} · ${summary}` : activity.title;
}

function getActorLabel(event: EstimateSheetHistoryEvent) {
  return formatActivityActor(event.actorUserId, event.actorLabel, "owner").displayName;
}

function getAuditDeltaClassName(value: number | null | undefined) {
  if (value === null || value === undefined || Math.abs(value) < 0.005) {
    return "border-hairline bg-surfaceMuted text-tertiary";
  }
  return value > 0
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";
}

function getAuditTargetLabel(event: EstimateSheetHistoryEvent) {
  const material = formatAuditMaterialName(readStringValue(event.rowContext.material));
  if (material) return material;
  if (event.estimateNodeId) return "selected node";
  return "the estimate";
}

function getAuditDetailSentence(detail: AuditChangeDetail) {
  if (detail.kind === "note") return `${detail.label}: ${detail.value}.`;
  return `Changed ${detail.label.toLowerCase()} value from ${detail.oldValue} to ${detail.newValue}.`;
}

function getAuditEventDescription(event: EstimateSheetHistoryEvent) {
  return composeEstimateHistoryActivity(event).title;
}

function getAuditSupportingSummary(event: EstimateSheetHistoryEvent, summary: string, description: string) {
  if (!summary || summary === description) return "";
  if (event.eventType === "row_updated") return `Affected fields: ${summary}`;
  return summary;
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

function hasActivityFilters(filters: ActivityFilterState) {
  return createActivityFilterKey(filters) !== createActivityFilterKey(DEFAULT_ACTIVITY_FILTERS);
}

function hasAdvancedActivityFilters(filters: ActivityFilterState) {
  return Boolean(filters.eventType || filters.dateFrom || filters.dateTo);
}

function ActivityFilterDropdown({
  filters,
  onChange,
  onReset,
  open,
}: {
  filters: ActivityFilterState;
  onChange: (filters: ActivityFilterState) => void;
  onReset: () => void;
  open: boolean;
}) {
  const updateFilter = (key: keyof ActivityFilterState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({ ...filters, [key]: event.target.value });
  };

  if (!open) return null;

  return (
    <div
      role="group"
      aria-label="Activity filter options"
      className="absolute right-2 top-[38px] z-30 grid w-[min(380px,calc(100vw-48px))] gap-2 border border-hairline bg-white p-2 text-[10px] shadow-xl"
    >
      <div className="grid gap-2">
        <ControlField label="Event" reserveHelperSpace>
          <DropdownSelect
            aria-label="Filter activity by event type"
            className="h-8 rounded-xs border border-hairline bg-white px-2 !text-[10px]"
            options={ACTIVITY_FILTER_EVENT_TYPES}
            value={filters.eventType}
            onValueChange={(eventType) => onChange({ ...filters, eventType })}
          />
        </ControlField>
      </div>
      <div className="grid grid-cols-2 items-start gap-2 max-sm:grid-cols-1">
        <ControlField label="From" reserveHelperSpace>
          <ControlInput
            type="date"
            className="h-8 border-hairline px-2"
            aria-label="Filter activity from date"
            value={filters.dateFrom}
            onChange={updateFilter("dateFrom")}
          />
        </ControlField>
        <ControlField label="To" reserveHelperSpace>
          <ControlInput
            type="date"
            className="h-8 border-hairline px-2"
            aria-label="Filter activity to date"
            value={filters.dateTo}
            onChange={updateFilter("dateTo")}
          />
        </ControlField>
      </div>
      <div className="flex items-center justify-end border-t border-hairline pt-2">
        <Button type="button" variant="secondary" size="sm" className="h-7 rounded-xs text-[10px]" disabled={!hasActivityFilters(filters)} onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}

function AuditComponentSnapshotCard({ snapshot }: { snapshot: AuditComponentSnapshot }) {
  const hasImage = Boolean(snapshot.imageUrl);

  return (
    <figure
      className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-xs border border-hairline bg-white p-3"
      aria-label={`${snapshot.label} snapshot for ${snapshot.item.material}`}
      data-row-history-component-card
    >
      <div
        className={cn(
          "flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xs border border-hairline bg-surfaceMuted text-tertiary",
          hasImage ? "bg-cover bg-center" : "",
        )}
        style={hasImage ? { backgroundImage: `url(${snapshot.imageUrl})` } : undefined}
        aria-label={hasImage ? `${snapshot.item.material} stored snapshot image` : "No image in snapshot"}
      >
        {hasImage ? null : (
          <span className="grid gap-1 px-1 text-center">
            <Cube size={15} weight="regular" aria-hidden="true" className="mx-auto" />
            <span className="text-[8px] font-medium leading-3">No image in snapshot</span>
          </span>
        )}
      </div>
      <figcaption className="min-w-0">
        <p className="text-[8px] font-medium uppercase leading-4 text-tertiary">{snapshot.label}</p>
        <p className="mt-1 break-words text-[10px] font-medium leading-4 text-ink">{snapshot.item.material}</p>
        <p className="mt-0.5 break-words text-[9px] leading-4 text-secondary">{snapshot.item.supplier}</p>
        {snapshot.item.description ? (
          <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-tertiary">{snapshot.item.description}</p>
        ) : null}
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[9px] leading-4">
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Source</dt>
            <dd className="truncate text-secondary" title={snapshot.sourceLabel}>{snapshot.sourceLabel}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Category</dt>
            <dd className="truncate text-secondary" title={snapshot.category}>{snapshot.category}</dd>
          </div>
          {snapshot.quantityLabel ? (
            <div className="min-w-0">
              <dt className="font-medium uppercase text-tertiary">Quantity</dt>
              <dd className="truncate text-secondary" title={snapshot.quantityLabel}>{snapshot.quantityLabel}</dd>
            </div>
          ) : null}
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Unit cost</dt>
            <dd className="truncate font-sans tabular-nums text-secondary" title={snapshot.unitCostLabel}>{snapshot.unitCostLabel}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Total</dt>
            <dd className="truncate font-sans tabular-nums text-ink" title={snapshot.lineTotalLabel}>{snapshot.lineTotalLabel}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-medium uppercase text-tertiary">Unit</dt>
            <dd className="truncate text-secondary" title={snapshot.item.unit}>{snapshot.item.unit}</dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
}

function AuditEventCard({
  event,
  componentSnapshots,
}: {
  event: EstimateSheetHistoryEvent;
  componentSnapshots?: AuditComponentSnapshot[];
}) {
  const title = getEventLabel(event);
  const summary = getEventSummary(event);
  const details = getAuditChangeDetails(event);
  const deltaClass = getAuditDeltaClassName(event.totalDelta);
  const changeLabel = getHistoryChangeLabel(event);
  const description = getAuditEventDescription(event);
  const supportingSummary = getAuditSupportingSummary(event, summary, description);
  const actorLabel = getActorLabel(event);
  const eventAriaLabel = `${getLegacyEventAccessibilityLabel(event.eventType)} audit event for ${getAuditTargetLabel(event)} at ${formatShortDateTime(event.createdAt)} by ${actorLabel}: ${description}`;
  const snapshots = componentSnapshots ?? [];

  return (
    <article
      className="overflow-hidden rounded-xs border border-hairline bg-white text-[10px] shadow-[0_10px_24px_rgba(17,17,17,0.045)]"
      aria-label={eventAriaLabel}
      data-audit-event-card
    >
      <div className="border-b border-hairline bg-white px-4 py-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-medium uppercase leading-4 text-tertiary">
              <span>{formatShortDateTime(event.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{actorLabel}</span>
            </p>
            <p className="mt-2 text-[10px] font-medium leading-5 text-ink">{title}</p>
          </div>
          <p className={cn("shrink-0 rounded-xs border px-2 py-1 text-right font-sans text-[9px] font-medium tabular-nums", deltaClass)}>
            {formatSignedPeso(event.totalDelta)}
          </p>
        </div>
        <p className="mt-3 break-words text-[10px] font-medium leading-5 text-secondary" title={changeLabel}>{description}</p>
        {supportingSummary ? (
          <p className="mt-1.5 break-words text-[10px] leading-5 text-tertiary">{supportingSummary}</p>
        ) : null}
      </div>
      {details.length ? (
        <section className="border-b border-hairline bg-white px-4 py-4" data-audit-event-details>
          <p className="text-[8px] font-medium uppercase leading-4 text-tertiary">Audit facts</p>
          <dl className="mt-3 grid gap-3">
            {details.map((detail) => (
            <div key={`${detail.label}-${detail.kind}`} className="rounded-xs border border-hairline bg-surfaceMuted/20 p-3">
              <dt className="text-[8px] font-medium uppercase leading-4 text-tertiary">{detail.label}</dt>
              {detail.kind === "diff" ? (
                <dd className="mt-2 min-w-0" aria-label={getAuditDetailSentence(detail)}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 text-[10px] leading-5 max-sm:grid-cols-1">
                    <div className="min-w-0 rounded-xs bg-white p-2">
                      <p className="mb-0.5 text-[8px] font-medium uppercase text-tertiary">Previous</p>
                      <p className="min-w-0 break-words text-secondary">{detail.oldValue}</p>
                    </div>
                    <span className="pt-5 text-[9px] font-medium text-tertiary max-sm:hidden" aria-hidden="true">-&gt;</span>
                    <div className="min-w-0 rounded-xs border border-accent/30 bg-white p-2">
                      <p className="mb-0.5 text-[8px] font-medium uppercase text-tertiary">Current</p>
                      <p className="min-w-0 break-words font-medium text-ink">{detail.newValue}</p>
                    </div>
                  </div>
                </dd>
              ) : (
                <dd className="mt-1 break-words text-[9px] font-medium leading-5 text-ink">{detail.value}</dd>
              )}
            </div>
            ))}
          </dl>
        </section>
      ) : null}
      {snapshots.length ? (
        <section className="bg-surfaceMuted/25 px-4 py-4" data-audit-component-snapshots>
          <p className="text-[8px] font-medium uppercase leading-4 text-tertiary">Component snapshot evidence</p>
          <div className={cn("mt-3 grid gap-3", snapshots.length > 1 ? "lg:grid-cols-2" : "")}>
            {snapshots.map((snapshot) => (
              <AuditComponentSnapshotCard key={snapshot.key} snapshot={snapshot} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

type GroupedActivityEventItem =
  | { kind: "event"; event: EstimateSheetHistoryEvent }
  | { kind: "group"; correlationId: string; events: EstimateSheetHistoryEvent[] };

type ActivityTimelineDayGroup = {
  day: string;
  items: GroupedActivityEventItem[];
};

function groupActivityEvents(events: EstimateSheetHistoryEvent[]): GroupedActivityEventItem[] {
  const countsByCorrelationId = new Map<string, number>();
  for (const event of events) {
    countsByCorrelationId.set(event.correlationId, (countsByCorrelationId.get(event.correlationId) ?? 0) + 1);
  }

  const groupedCorrelationIds = new Set<string>();
  const groupedItems: GroupedActivityEventItem[] = [];
  for (const event of events) {
    const eventCount = countsByCorrelationId.get(event.correlationId) ?? 0;
    if (eventCount <= 1) {
      groupedItems.push({ kind: "event", event });
      continue;
    }

    if (groupedCorrelationIds.has(event.correlationId)) continue;
    groupedCorrelationIds.add(event.correlationId);
    groupedItems.push({
      kind: "group",
      correlationId: event.correlationId,
      events: events.filter((candidate) => candidate.correlationId === event.correlationId),
    });
  }

  return groupedItems;
}

function getActivityItemCreatedAt(item: GroupedActivityEventItem) {
  return item.kind === "group" ? item.events[0]?.createdAt ?? "" : item.event.createdAt;
}

function groupActivityTimelineByDay(events: EstimateSheetHistoryEvent[]): ActivityTimelineDayGroup[] {
  const dayGroups: ActivityTimelineDayGroup[] = [];
  for (const item of groupActivityEvents(events)) {
    const day = formatActivityDay(getActivityItemCreatedAt(item));
    const currentGroup = dayGroups[dayGroups.length - 1];
    if (currentGroup?.day === day) {
      currentGroup.items.push(item);
      continue;
    }
    dayGroups.push({ day, items: [item] });
  }
  return dayGroups;
}

function ActivityTimelineItem({ children }: { children: ReactNode }) {
  return (
    <li className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-3">
      <span className="relative z-10 mt-4 flex size-5 items-center justify-center rounded-xs border border-orange-200 bg-orange-50" aria-hidden="true">
        <span className="size-1.5 rounded-xs bg-orange-600" />
      </span>
      <div className="min-w-0 pb-2">{children}</div>
    </li>
  );
}

function AuditEventGroup({
  events,
}: {
  events: EstimateSheetHistoryEvent[];
}) {
  const firstEvent = events[0];
  const eventTypes = Array.from(new Set(events.map((event) => getEventLabel(event)))).join(", ");
  const eventTotal = events.reduce((total, event) => total + (event.totalDelta ?? 0), 0);

  return (
    <details className="overflow-hidden rounded-xs border border-hairline bg-white text-[10px] shadow-[0_8px_18px_rgba(17,17,17,0.035)]" data-audit-event-group>
      <summary className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-hairline bg-white px-4 py-3">
        <span className="min-w-0">
          <span className="block text-[9px] font-medium uppercase leading-4 text-tertiary">
            {firstEvent ? `${formatShortDateTime(firstEvent.createdAt)} · ${getActorLabel(firstEvent)}` : "Activity group"}
          </span>
          <span className="mt-1.5 block text-[9px] font-medium leading-5 text-ink">{events.length} related activity events</span>
          <span className="mt-1 block break-words text-[9px] leading-5 text-tertiary">{eventTypes}</span>
        </span>
        <span className={cn("shrink-0 rounded-xs border px-2 py-1 text-right font-sans text-[10px] font-medium tabular-nums", getAuditDeltaClassName(eventTotal))}>
          {formatSignedPeso(eventTotal)}
        </span>
      </summary>
      <div className="space-y-3 bg-surfaceMuted/25 p-3">
        {events.map((event) => (
          <AuditEventCard key={event.id} event={event} componentSnapshots={getAuditComponentSnapshots(event)} />
        ))}
      </div>
    </details>
  );
}

function EventList({
  events,
  isLoading,
  error,
  emptyLabel,
  emptyDescription = "Current row facts remain visible while the append-only history is empty.",
  onRetry,
  nextCursor,
  isLoadingMore = false,
  loadMoreLabel = "Load more activity",
  onLoadMore,
}: {
  events: EstimateSheetHistoryEvent[];
  isLoading: boolean;
  error: string;
  emptyLabel: string;
  emptyDescription?: string;
  onRetry: () => void;
  nextCursor?: EstimateSheetVersionControlData["nextCursor"];
  isLoadingMore?: boolean;
  loadMoreLabel?: string;
  onLoadMore?: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Loading history">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 border border-hairline bg-surfaceMuted/50" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-4 text-[10px] text-amber-900">
        <div className="flex items-center gap-2 font-medium">
          <WarningCircle size={13} weight="regular" aria-hidden="true" />
          History could not load
        </div>
        <p className="mt-1 leading-4">{error}</p>
        <Button type="button" variant="secondary" size="sm" className="mt-2 h-7 rounded-xs text-[10px]" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="border border-dashed border-hairline bg-white p-4 text-[10px] text-tertiary">
        <p className="font-medium text-ink">{emptyLabel}</p>
        <p className="mt-1 leading-4">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-activity-timeline role="feed" aria-label="Activity history events">
      {groupActivityTimelineByDay(events).map((dayGroup) => (
        <section key={dayGroup.day} aria-label={`${dayGroup.day} activity`} className="space-y-3">
          <div className="px-1 pb-1 pt-2">
            <p className="text-[8px] font-medium uppercase leading-4 text-tertiary">{dayGroup.day}</p>
          </div>
          <ol className="relative space-y-4 before:absolute before:bottom-5 before:left-[9.5px] before:top-5 before:w-px before:bg-hairline">
            {dayGroup.items.map((item) => {
              if (item.kind === "group") {
                return (
                  <ActivityTimelineItem key={item.correlationId}>
                    <AuditEventGroup events={item.events} />
                  </ActivityTimelineItem>
                );
              }

              return (
                <ActivityTimelineItem key={item.event.id}>
                  <AuditEventCard event={item.event} componentSnapshots={getAuditComponentSnapshots(item.event)} />
                </ActivityTimelineItem>
              );
            })}
          </ol>
        </section>
      ))}
      {nextCursor && onLoadMore ? (
        <div className="pt-1">
          <Button type="button" variant="secondary" size="sm" className="h-7 w-full rounded-xs text-[10px]" disabled={isLoadingMore} onClick={onLoadMore}>
            {isLoadingMore ? "Loading..." : loadMoreLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const ROW_DETAIL_TABS: readonly WorkshopTreeTabItem<RowDetailTab>[] = [
  { id: "details", label: "Details" },
  { id: "component", label: "Component" },
  { id: "activity", label: "Activity" },
];

function getRowDetailComponentStatus(item: EstimateRowItem | null | undefined, isBlankRow: boolean) {
  if (isBlankRow) {
    return {
      label: "No linked component",
      description: "This row is a manual placeholder. Add or drag a component into the row to link current component data.",
    };
  }

  if (!item) {
    return {
      label: "Manual component",
      description: "Component source details are not available for this row.",
    };
  }

  if (isExpressComponentRow(item)) {
    return {
      label: "Express component",
      description: "This project component is authored directly in the estimate row. Edit its fields inline in the sheet, or promote it to the shared library when it is ready.",
    };
  }

  switch (item.linkState) {
    case "detached":
      return {
        label: "Project-specific component",
        description: "This component keeps the current row values and no longer follows library updates.",
      };
    case "linked-clean":
      return {
        label: "Synced library component",
        description: "This row is following the current library component values.",
      };
    case "linked-overridden":
      return {
        label: "Customized library component",
        description: "This row is linked to the library, but one or more estimate values have project-specific overrides.",
      };
    case "source-changed":
      return {
        label: "Library source changed",
        description: "The source library component changed after this row was added. Review before replacing or detaching it.",
      };
    case "unlinked":
      return {
        label: "Manual component",
        description: "This row is not linked to a library component.",
      };
    default:
      return item.sourceLibraryItemId
        ? {
            label: "Library component",
            description: "This row has a saved library source but no explicit sync state.",
          }
        : {
            label: "Manual component",
            description: "This row is not linked to a library component.",
          };
  }
}

function RowDetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0 border-b border-hairline py-2">
      <p className="text-[8px] font-medium uppercase text-tertiary">{label}</p>
      <p className="mt-0.5 truncate text-[10px] font-medium text-ink" title={value === null || value === undefined ? undefined : String(value)}>
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

export function RowDetailsModal({
  row,
  tab,
  projectId,
  estimateId,
  onTabChange,
  onClose,
}: {
  row: FlattenedEstimateRow | null;
  tab: RowDetailTab;
  projectId?: string;
  estimateId?: string;
  onTabChange: (tab: RowDetailTab) => void;
  onClose: () => void;
}) {
  const item = row?.item ?? null;
  const isBlankRow = item ? isBlankEstimateRowItem(item) : false;
  const [events, setEvents] = useState<EstimateSheetHistoryEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<EstimateSheetVersionControlData["rowNextCursor"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestGenerationRef = useRef(0);
  const rowId = item?.id ?? "";

  const loadRowActivity = useCallback((cursor?: EstimateSheetVersionControlData["rowNextCursor"]) => {
    if (!projectId || !estimateId || !rowId) return;
    const requestGeneration = requestGenerationRef.current;
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setEvents([]);
      setNextCursor(null);
    }
    setError("");

    fetchEstimateSheetVersionControl({
      projectId,
      estimateId,
      rowId,
      eventLimit: 50,
      rowCursor: cursor ?? undefined,
      scope: "row",
    })
      .then((data) => {
        if (requestGenerationRef.current !== requestGeneration) return;
        setEvents((current) => (cursor ? [...current, ...data.rowEvents] : data.rowEvents));
        setNextCursor(data.rowNextCursor);
      })
      .catch((caughtError: unknown) => {
        if (requestGenerationRef.current !== requestGeneration) return;
        setError(caughtError instanceof Error ? caughtError.message : "Row activity could not load.");
      })
      .finally(() => {
        if (requestGenerationRef.current !== requestGeneration) return;
        setIsLoading(false);
        setIsLoadingMore(false);
      });
  }, [estimateId, projectId, rowId]);

  useEffect(() => {
    requestGenerationRef.current += 1;
    if (tab === "activity" && projectId && estimateId && rowId) {
      const timeoutId = window.setTimeout(() => loadRowActivity(), 0);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [estimateId, loadRowActivity, projectId, rowId, tab]);

  const lineTotal = row?.lineTotal ?? item?.totalItemCosts ?? 0;
  const quantity = row?.quantity ?? item?.quantity ?? 0;
  const contingencyPercentage = row?.contingencyPercentage ?? item?.contingencyPercentage ?? 0;
  const contingencyValue = row?.contingencyValue ?? item?.contingencyValue ?? 0;
  const miscCost = row?.miscCost ?? item?.miscCost ?? 0;
  const componentStatus = getRowDetailComponentStatus(item, isBlankRow);
  const showReferenceImage = Boolean(item && !isBlankRow && (!isExpressComponentRow(item) || item.imageUrl));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 max-sm:p-2"
      onMouseDown={(event) => {
        // A popup (dropdown listbox) dismissed by this gesture suppresses
        // the rest of it; this backdrop must not also close the modal.
        if (event.defaultPrevented) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Row item details"
        className="flex h-[min(720px,calc(100dvh-32px))] w-[min(940px,calc(100vw-32px))] min-w-0 flex-col overflow-hidden border border-hairline bg-[#FBFCFD] shadow-2xl max-sm:h-[calc(100dvh-16px)] max-sm:w-[calc(100vw-16px)]"
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-hairline bg-white px-3">
          <div className="min-w-0">
            <p className="text-[9px] font-medium text-ink">Row Item</p>
            <p className="truncate text-[8px] font-medium uppercase text-tertiary">{row?.nodePath.join(" / ") ?? "Current estimate row"}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0" aria-label="Close row details" onClick={onClose}>
            <X size={13} weight="regular" aria-hidden="true" />
          </Button>
        </div>
        <div className="shrink-0">
          <WorkshopTreeTabs
            tabs={ROW_DETAIL_TABS}
            activeTab={tab}
            ariaLabel="Row item detail tabs"
            onTabChange={onTabChange}
          />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] max-md:grid-cols-1">
          <aside className="min-h-0 overflow-auto border-r border-hairline bg-surfaceMuted/35 p-3 max-md:max-h-64 max-md:border-r-0 max-md:border-b">
            <div className="border border-hairline bg-white p-2">
              {showReferenceImage && item ? (
                <div
                  className="aspect-[4/3] bg-neutral-100 bg-cover bg-center"
                  style={{ backgroundImage: `url(${getComponentImageUrl(item)})` }}
                  aria-label={`${item.material} reference image`}
                />
              ) : (
                <div className="grid aspect-[4/3] place-items-center border border-dashed border-hairline bg-surfaceMuted/50 text-center text-[10px] font-medium text-tertiary">
                  {item && isExpressComponentRow(item) ? "No image yet" : "No component selected"}
                </div>
              )}
              <div className="mt-2 min-w-0">
                <p className="truncate text-[10px] font-medium text-ink">{item?.material?.trim() || (item && isExpressComponentRow(item) ? "Express component" : "Row not found")}</p>
                <p className="truncate text-[9px] font-medium text-tertiary">{item?.supplier ?? "No supplier"}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 border-t border-hairline">
                <RowDetailField label="Qty" value={`${quantity} ${item?.unit ?? ""}`.trim()} />
                <RowDetailField label="Unit cost" value={formatPeso(item?.itemCost ?? 0)} />
                <RowDetailField label="Adjustment" value={formatCostAdjustmentPercentage(contingencyPercentage)} />
                <RowDetailField label="Total" value={formatPeso(lineTotal)} />
              </div>
            </div>
          </aside>
          <div className="flex min-h-0 flex-col">
            <div className="border-b border-hairline bg-white p-3">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-[8px] font-medium uppercase text-tertiary">{componentStatus.label}</p>
                  <p className="truncate text-[10px] font-medium text-ink">{item?.material?.trim() || (item && isExpressComponentRow(item) ? "Express component" : "Row item")}</p>
                  <p className="mt-0.5 truncate text-[9px] text-tertiary">{row?.nodePath.join(" › ") ?? "Current estimate row"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-medium uppercase text-tertiary">Total</p>
                  <p className="mt-0.5 font-sans text-[12px] font-medium tabular-nums text-ink">{formatPeso(lineTotal)}</p>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3" role="tabpanel" aria-label={ROW_DETAIL_TABS.find((rowTab) => rowTab.id === tab)?.label}>
              {tab === "details" ? (
                <div className="grid grid-cols-2 gap-x-4 border border-hairline bg-white px-3 max-sm:grid-cols-1">
                  <RowDetailField label="Material" value={item?.material} />
                  <RowDetailField label="Supplier" value={item?.supplier} />
                  <RowDetailField label="Description" value={item?.description} />
                  <RowDetailField label="Category" value={item?.category} />
                  <RowDetailField label="Quantity" value={`${quantity} ${item?.unit ?? ""}`.trim()} />
                  <RowDetailField label="Unit cost" value={formatPeso(item?.itemCost ?? 0)} />
                  <RowDetailField label="Subtotal" value={formatPeso(item?.subTotal ?? 0)} />
                  <RowDetailField label="Adjustment" value={`${formatCostAdjustmentPercentage(contingencyPercentage)} (${formatPeso(contingencyValue)})`} />
                  <RowDetailField label="Misc cost" value={formatPeso(miscCost)} />
                  <RowDetailField label="Total" value={formatPeso(lineTotal)} />
                  <RowDetailField label="Unit" value={item?.unit} />
                  <RowDetailField label="Row revision" value={item?.rowRevision ?? 1} />
                </div>
              ) : null}
              {tab === "component" ? (
                <div className="grid gap-3">
                  <div className="border border-hairline bg-white p-3">
                    <p className="text-[12px] font-medium text-ink">Current component</p>
                    <p className="mt-1 text-[10px] leading-4 text-tertiary">
                      {componentStatus.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 border border-hairline bg-white px-3 max-sm:grid-cols-1">
                    <RowDetailField label="Component source" value={componentStatus.label} />
                    <RowDetailField label="Library sync" value={componentStatus.description} />
                    <RowDetailField label="Source library id" value={item?.sourceLibraryItemId} />
                    <RowDetailField label="Component version" value={item?.componentVersionNumber ? `V${item.componentVersionNumber}` : item?.componentVersionId} />
                    <RowDetailField label="Price option" value={item?.priceOptionLabel ?? item?.priceOptionId} />
                    <RowDetailField label="Lifecycle" value={item?.lifecycleState} />
                    <RowDetailField label="Discipline" value={item?.discipline} />
                    <RowDetailField label="Designation" value={item?.designation} />
                    <RowDetailField label="Pricing source" value={item?.pricingSource} />
                    <RowDetailField label="Pricing date" value={item?.pricingDate} />
                    <RowDetailField label="Brand" value={item?.brand} />
                    <RowDetailField label="SKU / reference" value={item?.sku} />
                    <RowDetailField label="Tags" value={item?.tags?.join(", ")} />
                  </div>
                </div>
              ) : null}
              {tab === "activity" ? (
                <EventList
                  events={events}
                  isLoading={isLoading}
                  error={error}
                  emptyLabel="No row activity yet"
                  emptyDescription="Edits, replacements, and value changes for this row will appear here."
                  onRetry={() => {
                    requestGenerationRef.current += 1;
                    loadRowActivity();
                  }}
                  nextCursor={nextCursor}
                  isLoadingMore={isLoadingMore}
                  loadMoreLabel="Load more row activity"
                  onLoadMore={() => loadRowActivity(nextCursor)}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function getActivityScopeKey(scope: EstimateActivityScope | null) {
  if (!scope) return "";
  if (scope.mode === "row") return `row:${scope.rowId}`;
  if (scope.mode === "node") return `node:${scope.nodeId}:${scope.includeDescendants ? "desc" : "direct"}`;
  return "sheet";
}

function getActivityEventsForScope(scope: EstimateActivityScope, historyData: EstimateSheetVersionControlData | null) {
  if (scope.mode === "row") return historyData?.rowEvents ?? [];
  if (scope.mode === "node") return historyData?.nodeEvents ?? [];
  return historyData?.events ?? [];
}

function getActivityCursorForScope(scope: EstimateActivityScope, historyData: EstimateSheetVersionControlData | null) {
  if (scope.mode === "row") return historyData?.rowNextCursor ?? null;
  if (scope.mode === "node") return historyData?.nodeNextCursor ?? null;
  return historyData?.nextCursor ?? null;
}

function getActivityEmptyCopy(scope: EstimateActivityScope) {
  if (scope.mode === "row") {
    return {
      label: "No row activity yet",
      description: "Edits, replacements, and value changes for this row will appear here.",
    };
  }

  if (scope.mode === "node") {
    return {
      label: "No activity yet for this Area",
      description: scope.includeDescendants ? "Activity for this Area and everything inside it will appear here." : "Changes and row edits in this Area will appear here.",
    };
  }

  return {
    label: "No activity yet in this estimate",
    description: "Estimate edits, tab row changes, and metadata updates will appear here.",
  };
}

function getActivityLoadMoreLabel(scope: EstimateActivityScope) {
  if (scope.mode === "row") return "Load more row activity";
  if (scope.mode === "node") return "Load more node activity";
  return "Load more activity";
}

function normalizeActivityScopeSearch(value: string) {
  return value.trim().toLowerCase();
}

function activityScopeItemMatchesSearch(item: ActivityScopeTreeItem, search: string) {
  if (!search) return true;
  return [item.label, item.eyebrow, item.description ?? ""].some((value) => value.toLowerCase().includes(search));
}

function getActivityScopeCollapsibleIds(items: ActivityScopeTreeItem[]) {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    const nextItem = items[index + 1];
    if (nextItem && nextItem.depth > item.depth) ids.add(item.id);
  });
  return ids;
}

function getActivityScopeSearchVisibleIds(items: ActivityScopeTreeItem[], search: string) {
  const visibleIds = new Set<string>();
  if (!search) return visibleIds;

  items.forEach((item, index) => {
    if (!activityScopeItemMatchesSearch(item, search)) return;

    visibleIds.add(item.id);

    for (let ancestorIndex = index - 1; ancestorIndex >= 0; ancestorIndex -= 1) {
      const ancestor = items[ancestorIndex];
      if (!ancestor) continue;
      if (ancestor.depth < item.depth && !visibleIds.has(ancestor.id)) visibleIds.add(ancestor.id);
      if (ancestor.depth === 0) break;
    }

    for (let descendantIndex = index + 1; descendantIndex < items.length; descendantIndex += 1) {
      const descendant = items[descendantIndex];
      if (!descendant || descendant.depth <= item.depth) break;
      visibleIds.add(descendant.id);
    }
  });

  return visibleIds;
}

function ActivityScopeTree({
  items,
  activeScopeKey,
  onSelect,
}: {
  items: ActivityScopeTreeItem[];
  activeScopeKey: string;
  onSelect: (scope: EstimateActivityScope) => void;
}) {
  const [scopeSearch, setScopeSearch] = useState("");
  const [collapsedScopeIds, setCollapsedScopeIds] = useState<Set<string>>(() => new Set());
  const normalizedSearch = normalizeActivityScopeSearch(scopeSearch);
  const collapsibleIds = useMemo(() => getActivityScopeCollapsibleIds(items), [items]);
  const searchVisibleIds = useMemo(() => getActivityScopeSearchVisibleIds(items, normalizedSearch), [items, normalizedSearch]);
  const visibleItems = useMemo(() => {
    if (normalizedSearch) return items.filter((item) => searchVisibleIds.has(item.id));

    let collapsedDepth: number | null = null;
    return items.filter((item) => {
      if (collapsedDepth !== null) {
        if (item.depth > collapsedDepth) return false;
        collapsedDepth = null;
      }

      if (collapsedScopeIds.has(item.id)) collapsedDepth = item.depth;
      return true;
    });
  }, [collapsedScopeIds, items, normalizedSearch, searchVisibleIds]);

  const expandAllScopes = () => setCollapsedScopeIds(new Set());
  const collapseAllScopes = () => setCollapsedScopeIds(new Set(collapsibleIds));
  const toggleScopeExpanded = (itemId: string) => {
    setCollapsedScopeIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-20 shrink-0 bg-white">
        <div className="flex h-[38px] items-center">
          <SearchInput
            wrapperClassName="w-full"
            placeholder="Search Tree"
            aria-label="Search Tree"
            value={scopeSearch}
            onChange={(event) => setScopeSearch(event.currentTarget.value)}
            onClear={() => setScopeSearch("")}
          />
        </div>
        <HeaderIconToolbar
          ariaLabel="Tree tools"
          labelPrefix="tree"
          onExpandAll={expandAllScopes}
          onCollapseAll={collapseAllScopes}
          addActions={[
            {
              label: "Add Area",
              icon: <AddTreeActionIcon />,
              disabled: true,
            },
          ]}
        />
        <WorkshopTreeTabs tabs={ACTIVITY_SCOPE_TREE_TABS} activeTab="sheets" ariaLabel="Estimate tree views" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleItems.length > 0 ? (
          <div role="tree" aria-label="Activity scope tree" className={WORKSHOP_TREE_ROW_GAP_CLASS}>
            {visibleItems.map((item) => {
              const selected = getActivityScopeKey(item.scope) === activeScopeKey;
              const hasChildren = collapsibleIds.has(item.id);
              const expanded = normalizedSearch ? true : !collapsedScopeIds.has(item.id);
              return (
                <WorkshopTreeRow
                  key={item.id}
                  role="treeitem"
                  aria-selected={selected}
                  aria-level={item.depth + 1}
                  aria-expanded={hasChildren ? expanded : undefined}
                  aria-label={`${item.label}, ${item.eyebrow}`}
                  data-activity-scope-item={item.id}
                  depth={item.depth}
                  selected={selected}
                  className="justify-start gap-0 focus-visible:ring-[#c8d2df] focus-visible:ring-offset-2"
                  onClick={() => onSelect(item.scope)}
                  onKeyDown={(event) => {
                    if (!hasChildren || normalizedSearch) return;
                    if (event.key === "ArrowRight" && !expanded) {
                      event.preventDefault();
                      toggleScopeExpanded(item.id);
                    }
                    if (event.key === "ArrowLeft" && expanded) {
                      event.preventDefault();
                      toggleScopeExpanded(item.id);
                    }
                  }}
                >
                  {hasChildren ? (
                    <span
                      className={cn(WORKSHOP_TREE_ICON_SLOT_CLASS, "cursor-pointer transition hover:bg-surface-muted")}
                      aria-hidden="true"
                      onClick={(event) => {
                        if (normalizedSearch) return;
                        event.stopPropagation();
                        toggleScopeExpanded(item.id);
                      }}
                    >
                      <CaretDown size={11} aria-hidden="true" className={expanded ? "" : "-rotate-90"} />
                    </span>
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden="true" />
                  )}
                  <span className={cn("mr-1", WORKSHOP_TREE_ICON_SLOT_CLASS)} aria-hidden="true">
                    {item.kind === "sheet" ? <FolderSimple size={12} weight="regular" aria-hidden="true" /> : null}
                    {/* group and area collapse to one neutral node glyph */}
                    {item.kind === "group" || item.kind === "area" ? <Circle size={12} weight="regular" aria-hidden="true" /> : null}
                    {item.kind === "row" ? <span className="font-sans text-[12px] font-medium" aria-hidden="true">#</span> : null}
                  </span>
                  <span className="min-w-0 truncate text-left">{item.label}</span>
                </WorkshopTreeRow>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xs border border-dashed border-hairline bg-surface-muted p-2 text-[10px] leading-4 text-tertiary">
            No tree matches found.
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivityHistoryModal({
  scope,
  scopeItems,
  selectedScopeItem,
  metadata,
  historyData,
  activityFilters,
  isHistoryLoading,
  isHistoryLoadingMore,
  historyError,
  onActivityFiltersChange,
  onActivityFiltersReset,
  onClose,
  onRetry,
  onLoadMore,
  onScopeSelect,
}: {
  scope: EstimateActivityScope;
  scopeItems: ActivityScopeTreeItem[];
  selectedScopeItem: ActivityScopeTreeItem | null;
  metadata: ProposalExportMetadata | null;
  historyData: EstimateSheetVersionControlData | null;
  activityFilters: ActivityFilterState;
  isHistoryLoading: boolean;
  isHistoryLoadingMore: boolean;
  historyError: string;
  onActivityFiltersChange: (filters: ActivityFilterState) => void;
  onActivityFiltersReset: () => void;
  onClose: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onScopeSelect: (scope: EstimateActivityScope) => void;
}) {
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const activeScopeKey = getActivityScopeKey(scope);
  const events = getActivityEventsForScope(scope, historyData);
  const nextCursor = getActivityCursorForScope(scope, historyData);
  const emptyCopy = getActivityEmptyCopy(scope);
  const loadMoreLabel = getActivityLoadMoreLabel(scope);
  const selectedLabel = selectedScopeItem?.label ?? metadata?.estimateName ?? "Estimate";
  const selectedEyebrow = selectedScopeItem?.eyebrow ?? metadata?.estimateSheetCode ?? "Estimate";
  const selectedDescription = selectedScopeItem?.description ?? "";
  const filtersActive = hasActivityFilters(activityFilters);
  const advancedFiltersActive = hasAdvancedActivityFilters(activityFilters);
  const updateSearchFilter = (event: ChangeEvent<HTMLInputElement>) => {
    onActivityFiltersChange({ ...activityFilters, search: event.target.value });
  };
  const clearSearchFilter = () => {
    onActivityFiltersChange({ ...activityFilters, search: "" });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 max-sm:p-2"
      onMouseDown={(event) => {
        // A popup (dropdown listbox) dismissed by this gesture suppresses
        // the rest of it; this backdrop must not also close the modal.
        if (event.defaultPrevented) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Activity History"
        className="flex h-[min(860px,calc(100dvh-32px))] w-[min(1180px,calc(100vw-32px))] min-w-0 flex-col overflow-hidden border border-hairline bg-[#FBFCFD] shadow-2xl max-sm:h-[calc(100dvh-16px)] max-sm:w-[calc(100vw-16px)]"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-white px-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-ink">Activity History</p>
            <p className="truncate text-[8px] font-medium uppercase text-tertiary">Audit trail · {metadata?.estimateSheetCode ?? "Estimate"}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0" aria-label="Close Activity History" onClick={onClose}>
            <X size={13} weight="regular" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[350px_minmax(0,1fr)] max-lg:grid-cols-1">
          <aside className="min-h-0 overflow-hidden border-r border-hairline bg-white max-lg:max-h-64 max-lg:border-r-0 max-lg:border-b" aria-label="Activity scope">
            <ActivityScopeTree items={scopeItems} activeScopeKey={activeScopeKey} onSelect={onScopeSelect} />
          </aside>
          <div className="flex min-h-0 flex-col">
            <div className="border-b border-hairline bg-white">
              <section aria-label="Selected activity scope" className="min-w-0 p-4">
                <div className="min-w-0">
                  <p className="font-sans text-[8px] font-medium uppercase text-tertiary">{selectedEyebrow}</p>
                  <p className="truncate text-[10px] font-medium text-ink">{selectedLabel}</p>
                  {selectedDescription ? (
                    <p className="mt-0.5 truncate text-[9px] text-tertiary">{selectedDescription}</p>
                  ) : null}
                </div>
              </section>
              <div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] border-t border-hairline">
                <SearchInput
                  aria-label="Search activity"
                  placeholder="Search activity"
                  value={activityFilters.search}
                  onChange={updateSearchFilter}
                  onClear={clearSearchFilter}
                  wrapperClassName="min-w-0"
                />
                <div className="relative border-l border-hairline">
                  <HeaderIconToolbar
                    ariaLabel="Activity history tools"
                    labelPrefix="activity"
                    showDefaultActions={false}
                    addActions={[
                      {
                        label: "Filter activity",
                        icon: (
                          <span className="relative inline-flex">
                            <FunnelSimple size={12} weight="regular" aria-hidden="true" />
                            {advancedFiltersActive ? <span className="absolute -right-1 -top-1 size-1.5 rounded-xs bg-orange-600" aria-hidden="true" /> : null}
                          </span>
                        ),
                        onClick: () => setFilterPanelOpen((current) => !current),
                        className: cn(
                          "hover:bg-orange-50 hover:text-orange-700 focus-visible:bg-orange-50 focus-visible:text-orange-700",
                          (filterPanelOpen || advancedFiltersActive) && "bg-orange-50 text-orange-700",
                        ),
                      },
                      ...(filtersActive
                        ? [
                            {
                              label: "Reset activity filters",
                              icon: <X size={12} weight="regular" aria-hidden="true" />,
                              onClick: onActivityFiltersReset,
                              className: "hover:bg-surfaceMuted hover:text-ink focus-visible:bg-surfaceMuted focus-visible:text-ink",
                            },
                          ]
                        : []),
                    ]}
                  />
                  <ActivityFilterDropdown
                    filters={activityFilters}
                    onChange={onActivityFiltersChange}
                    onReset={onActivityFiltersReset}
                    open={filterPanelOpen}
                  />
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <EventList
                events={events}
                isLoading={isHistoryLoading}
                error={historyError}
                emptyLabel={emptyCopy.label}
                emptyDescription={emptyCopy.description}
                onRetry={onRetry}
                nextCursor={nextCursor}
                isLoadingMore={isHistoryLoadingMore}
                loadMoreLabel={loadMoreLabel}
                onLoadMore={onLoadMore}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
