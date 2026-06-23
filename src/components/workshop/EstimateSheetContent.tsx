"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SetStateAction } from "react";
import { FunnelSimple, Tabs as TabsIcon, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { FilterPopover } from "@/components/ui/overlays/popover";
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";
import type { HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { dispatchProjectTotalChange } from "@/components/workshop/ProjectTotalHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useEstimateRowMutations } from "@/hooks/use-estimate-row-mutations";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { buildEstimateColumnVars, EMPTY_ESTIMATE_COLUMN_WIDTHS } from "@/lib/estimate-sheet/column-model";
import { loadProjectComponentLibraryLite } from "@/lib/component-library/actions";
import { WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, workspaceComponentLibraryLiteQueryKey, workspaceComponentLibraryQueryKey, workspaceComponentRowsLibraryQueryKey } from "@/lib/component-library/query-keys";
import { recordLibraryEvent } from "@/lib/component-library/library-telemetry";
import { applyEstimateRowItemPatch, estimateRowMutationResultToPatch, patchEstimateRowItemInTree } from "@/lib/estimates/estimate-row-tree-patch";
import { useEstimateCursorCollaboration, type RemoteEstimateCursor } from "@/hooks/use-estimate-cursor-broadcast";
import { useEstimateAreaTreeQuery, useEstimateTabTreeQuery } from "@/hooks/use-estimate-query";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { useEstimateUiStore } from "@/stores/estimate-ui-store";
import { useEstimateHeaderActionsStore } from "./use-estimate-header-actions-store";
import { fetchEstimateSheetVersionControl, insertEstimateTemplateIntoEstimate, insertEstimateTemplateNodeIntoEstimate, insertEstimateTemplatesIntoEstimate, type EstimateSheetVersionControlData, type UpdateEstimateRowItemResult } from "@/lib/estimates/actions";
import { getCollaborationColorForUser } from "@/lib/collaboration/colors";
import { recordExpressComponentEvent } from "@/lib/estimates/express-components-telemetry";
import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import type { ProposalExportMetadata, ProposalExportModel } from "@/lib/proposal-export/types";
import { isExpressComponentRow, readEstimateRowMetadata, withExpressComponentMetadata } from "@/lib/estimates/express-components";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";
import { filterMapBy } from "@/lib/util/array";
import { estimateSurfaceClass, useEstimateSurfaceVariant } from "./estimate-surface-variant";
import { WORKSHOP_VIRTUALIZATION_FLAGS } from "@/lib/workshop/virtualization-flags";
import { useEstimateColumnWidthsStore } from "@/stores/estimate-column-widths-store";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import { SourceTrustChips } from "@/components/workshop/library/source-trust-chips";
import { getLibraryCommitTrustGate, type LibraryCommitTrustGateResult } from "@/components/workshop/library/source-trust-model";
import { useToast } from "@/components/ui/toast";
import { insertProjectSourceIntoEstimate } from "@/lib/reusable-sources/actions";
import type { ProjectSourceInsertTarget } from "@/lib/reusable-sources/types";
// Interaction-gated overlay: only mounts when its `open` prop is true, so it
// contributes nothing to first paint. Code-split out of the initial bundle.
const CommandPalette = dynamic(
  () => import("./component-library/CommandPalette").then((mod) => mod.CommandPalette),
  { ssr: false },
);
// The heavy component-library rail stays out of the sheet content chunk. The
// route keeps its footprint stable with the same retryable placeholder used by
// the lazy data query.
const EstimateRightSidebar = dynamic(
  () => import("./component-library").then((mod) => mod.EstimateRightSidebar),
  {
    ssr: false,
    loading: () => <ComponentLibrarySidebarFallback isError={false} />,
  },
);
import {
  INSERT_ESTIMATE_TEMPLATE_EVENT,
  INSERT_PROJECT_SOURCE_EVENT,
  type EstimateTemplate,
  type InsertEstimateTemplateEventDetail,
  type InsertProjectSourceEventDetail,
} from "./component-library/templates";
import {
  reportEstimateProposalPreviewSignatureCompute,
  reportEstimateSelectedNodePresentationCompute,
  reportEstimateSheetContentRender,
} from "./estimate-sheet-render-probe";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";
import { findEstimateNode, sampleEstimateTree, type EstimateTreeNode, type EstimateRowItem } from "./estimate-tree-data";
import { EstimateTabStrip, type EstimateTabStripHandle } from "./estimate-sheet/EstimateTabStrip";
import { REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT } from "./estimate-sheet/events";
import type { ProposalExportPreviewScope, ProposalExportUserSettings } from "./ProposalExportPreviewDialog";
// Interaction-gated overlay: only mounts when its `open` prop is true, so it
// contributes nothing to first paint. Code-split out of the initial bundle.
const ProposalExportPreviewDialog = dynamic(
  () => import("./ProposalExportPreviewDialog").then((mod) => mod.ProposalExportPreviewDialog),
  { ssr: false },
);
import type { EstimateTabSummary, EstimateTreeLoadLimitState } from "@/lib/estimates/types";
import {
  BLANK_ESTIMATE_ROW_AUDIT_LABEL,
  BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
  BLANK_ESTIMATE_ROW_TAG,
  DEFAULT_ACTIVITY_FILTERS,
  createActivityFilterKey,
  getActivityFilterInput,
  getActivityScopeKey,
  // Aliased: the helpers barrel re-exported below also has a
  // getComponentImageUrl with a different parameter type.
  isBlankEstimateRowItem,
  pesoFormatter,
  type ActivityFilterState,
  type ActivityScopeTreeItem,
  type EstimateActivityScope,
  type FlattenedEstimateRow,
  type RowDetailTab,
  type RowDetailsState,
} from "./estimate-sheet/activity-history";
// Interaction-gated overlays from the activity-history barrel: each renders only
// behind its open-state condition in JSX, so neither contributes to first paint.
// Code-split out of the initial bundle (the non-component exports above stay
// static because they run during render/compute).
const ActivityHistoryModal = dynamic(
  () => import("./estimate-sheet/activity-history").then((mod) => mod.ActivityHistoryModal),
  { ssr: false },
);
const RowDetailsModal = dynamic(
  () => import("./estimate-sheet/activity-history").then((mod) => mod.RowDetailsModal),
  { ssr: false },
);

import {
  EstimateSheetExpansionContext,
  collectAllNodeIds,
} from "./estimate-sheet/rows/expansion";
import {
  EMPTY_ESTIMATE_ROW_ITEMS,
} from "./estimate-sheet/rows/constants";
import {
  calculateContingencyValue,
  collectEditableRows,
  computeNodeTotal,
  computeNodeTotals,
  flattenEstimateRows,
  getInitialEditableRow,
  materializeEditableEstimateTree,
  parseEditableContingencyPercentage,
  parseNonNegativeEditableNumber,
  type EditableRowValue,
} from "./estimate-sheet/rows/editable-row-model";
import { getNodeCode } from "./estimate-sheet/rows/node-visuals";
import {
  canMakeProjectSpecific,
  canPromoteEstimateRowToLibrary,
  type ExpressInsertDraftState,
} from "./estimate-sheet/rows/cells";
import { EstimateSheetVirtualBranchList } from "./estimate-sheet/rows/virtual-branch-list";
import type { BreadcrumbNode } from "./estimate-sheet/rows/branch";

/* Re-export component library helpers so existing imports don't break */
export {
  createComponent,
  createDefaultLibraryBundles,
  exportLibraryItemsToCsv,
  expandLibraryBundle,
  exportLibraryItemsToJson,
  filterComponents,
  getComponentDesignation,
  getComponentDiscipline,
  getComponentImageUrl,
  getLibraryBundleTotal,
  getComponentName,
  getComponentPrice,
  getStalenessLabel,
  getStalenessTone,
  groupComponents,
  parseLibraryCsv,
  parseLibraryImportText,
  parseLibraryJson,
  readLibraryPreferences,
  safeSetJsonStorage,
  searchComponents,
  sortComponents,
} from "./component-library/helpers";
// D2 / Req 10: local bindings for the within-area group/sort transform. The
// block above is a re-export (`export … from`) and creates NO local binding,
// so these must be imported explicitly to be callable here.
import { groupComponents as groupSheetRows, sortComponents as sortSheetRows } from "./component-library/helpers";
export { pesoFormatter };

// legacy "EstimateSheetContent" name kept for compatibility; see plan 2026-06-12 §01-17
type EstimateSheetContentProps = {
  selectedNodeId: string | null;
  nodes?: EstimateTreeNode[];
  projectId?: string;
  workspaceId?: string;
  estimateId?: string;
  estimateTabs?: EstimateTabSummary[];
  activeTabId?: string;
  loadLimitState?: EstimateTreeLoadLimitState;
  /** Real persisted tab id. Undefined means pre-tab compatibility mode; see plan 2026-06-12 §01-17. */
  dataTabId?: string;
  /** Server-resolved edit capability (UX gating only; default false fails closed). */
  canEditEstimate?: boolean;
  initialTabId?: string;
  onActiveTabChange?: (tabId: string) => void;
  onEstimateTabsChange?: (tabs: EstimateTabSummary[]) => void;
  collaborationUserId?: string | null;
  collaborationDisplayName?: string | null;
  proposalExportMetadata?: ProposalExportMetadata;
  renderSidebar?: boolean;
  libraryItems?: EstimateRowItem[];
  libraryTemplates?: EstimateTemplate[];
  libraryCategoryTree?: ComponentLibraryTaxonomyNode[];
  librarySuppliers?: ComponentLibrarySupplierOption[];
  libraryBrands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
};

const EMPTY_ESTIMATE_TEMPLATES: EstimateTemplate[] = [];
const EMPTY_FLATTENED_ESTIMATE_ROWS: FlattenedEstimateRow[] = [];
const EMPTY_ACTIVITY_SCOPE_ITEMS: ActivityScopeTreeItem[] = [];
const EMPTY_BREADCRUMB_NODES: BreadcrumbNode[] = [];
const EMPTY_SELECTED_NODE_PRESENTATION = {
  nodeCode: "",
  ancestorPath: EMPTY_BREADCRUMB_NODES,
};
function findNodePath(nodes: EstimateTreeNode[], targetId: string): EstimateTreeNode[] {
  reportEstimateSelectedNodePresentationCompute("path");
  for (const node of nodes) {
    if (node.id === targetId) return [node];
    if (node.children) {
      const childPath = findNodePath(node.children, targetId);
      if (childPath.length > 0) return [node, ...childPath];
    }
  }
  return [];
}

function findEstimateRowItem(nodes: EstimateTreeNode[], rowItemId: string): EstimateRowItem | null {
  for (const node of nodes) {
    for (const item of node.estimateRowItems ?? []) {
      if (item.id === rowItemId) return item;
    }
    if (node.children) {
      const childRowItem = findEstimateRowItem(node.children, rowItemId);
      if (childRowItem) return childRowItem;
    }
  }
  return null;
}

function computeNodeCode(nodes: EstimateTreeNode[], targetId: string): string {
  reportEstimateSelectedNodePresentationCompute("code");
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === targetId) return String(i + 1).padStart(2, "0");
    if (node.children) {
      const childCode = computeNodeCode(node.children, targetId);
      if (childCode) return `${String(i + 1).padStart(2, "0")}.${childCode}`;
    }
  }
  return "";
}

type PendingLibraryCommitGate = {
  id: string;
  action: "insert" | "replace";
  targetNodeId?: string;
  rowItemId?: string;
  libraryItem: EstimateRowItem;
  existingRow?: EstimateRowItem | null;
  gate: LibraryCommitTrustGateResult;
};

function shouldGateLibraryCommit(item: EstimateRowItem) {
  return item.source === "library" || item.source === "supplier" || Boolean(item.sourceLibraryItemId);
}

function libraryCommitEventAction(action: PendingLibraryCommitGate["action"]) {
  return action === "replace" ? "replace_row" : "insert_row";
}







function createBlankEstimateRowTemplate(): EstimateRowItem {
  return {
    id: "manual-estimate-row-template",
    material: BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
    description: "",
    supplier: "",
    source: "project",
    unit: "unit",
    itemCost: 0,
    quantity: 1,
    subTotal: 0,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 0,
    totalItemCosts: 0,
    category: "Unassigned",
    tags: [BLANK_ESTIMATE_ROW_TAG],
    pricingSource: "Manual estimate row",
    pricingDate: new Date().toISOString().slice(0, 10),
    confidence: "unpriced",
  };
}

function createExpressEstimateRowTemplate(): EstimateRowItem {
  const createdAt = new Date().toISOString();
  return {
    id: "express-estimate-row-template",
    material: "",
    description: "",
    supplier: "",
    source: "project",
    unit: "",
    itemCost: 0,
    quantity: 1,
    subTotal: 0,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 0,
    totalItemCosts: 0,
    category: "Unassigned",
    pricingSource: "Express component",
    pricingDate: createdAt.slice(0, 10),
    confidence: "unpriced",
    discipline: "Unspecified",
    designation: "",
    sourceLibraryItemId: null,
    linkState: "unlinked",
    metadata: withExpressComponentMetadata({}, {
      id: createEstimateRowItemId(),
      createdFrom: "estimate-sheet-add-row",
      sourceLabel: "Express component",
      createdAt,
    }),
  };
}

type ExpressInsertDraft = {
  targetNodeId: string;
  libraryItem: EstimateRowItem;
  mutationId: string;
  status: ExpressInsertDraftState;
  bufferedPatch?: Partial<EditableRowValue>;
  errorMessage?: string;
};


function createProposalPreviewSignature(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>, metadata: ProposalExportMetadata | null) {
  reportEstimateProposalPreviewSignatureCompute();
  const parts: string[] = [metadata ? `${metadata.projectId}|${metadata.estimateId}|${metadata.projectName}|${metadata.estimateName}|${metadata.versionLabel}|${metadata.currency}` : "no-metadata"];

  function visit(node: EstimateTreeNode) {
    parts.push(`node:${node.id}|${node.kind}|${node.name}`);
    node.estimateRowItems?.forEach((item) => {
      const editableRow = editableRows[item.id] ?? getInitialEditableRow(item);
      parts.push([
        "row",
        item.id,
        item.material,
        item.description,
        item.category,
        item.designation,
        item.unit,
        item.itemCost,
        editableRow.quantity,
        editableRow.contingencyMode,
        editableRow.contingencyPercentage,
        editableRow.miscCost,
        item.supplier,
        item.pricingSource,
        item.pricingDate,
      ].join("|"));
    });
    node.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return parts.join("\n");
}

const PROPOSAL_XLSX_CONTENT_TYPE = "spreadsheetml";

function readContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(header);
  return match?.[1] ? decodeURIComponent(match[1].replace(/"+$/g, "")) : null;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS: ProposalExportUserSettings = {
  contingencyRate: 10,
  vatRate: 12,
  contingencyIncluded: false,
  vatIncluded: false,
  includeFormulas: true,
  includeInternalBreakdown: false,
};

// Append only non-default settings so an untouched export keeps a clean URL (and the route's
// own defaults stay authoritative).
function appendProposalExportSettingsParams(params: URLSearchParams, settings: ProposalExportUserSettings) {
  if (settings.contingencyRate !== DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS.contingencyRate) params.set("contingencyRate", String(settings.contingencyRate));
  if (settings.vatRate !== DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS.vatRate) params.set("vatRate", String(settings.vatRate));
  if (settings.contingencyIncluded) params.set("contingencyMode", "included");
  if (settings.vatIncluded) params.set("vatMode", "included");
  if (!settings.includeFormulas) params.set("includeFormulas", "false");
  if (settings.includeInternalBreakdown) params.set("audience", "internal");
}

// The rate/formula choices flow into the client preview model (audience stays client-safe in the
// preview; the real audience is server-resolved at download).
function proposalPreviewModelSettings(settings: ProposalExportUserSettings) {
  return {
    contingencyRate: settings.contingencyRate,
    vatRate: settings.vatRate,
    contingencyMode: settings.contingencyIncluded ? ("included" as const) : ("percentage" as const),
    vatMode: settings.vatIncluded ? ("included" as const) : ("percentage" as const),
    includeFormulas: settings.includeFormulas,
  };
}








export function createEstimateRowItemId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function cloneLibraryItemForEstimate(libraryItem: EstimateRowItem): EstimateRowItem {
  const id = createEstimateRowItemId();
  const quantity = libraryItem.quantity || 1;
  const contingencyPercentage = libraryItem.contingencyPercentage ?? 0;
  const miscCost = libraryItem.miscCost ?? 0;
  const subTotal = libraryItem.itemCost * quantity;
  const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
  return {
    ...libraryItem,
    id,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
  };
}

function cloneTemplateNodesForEstimate(nodes: EstimateTreeNode[]): EstimateTreeNode[] {
  function cloneNode(node: EstimateTreeNode): EstimateTreeNode {
    return {
      ...node,
      id: createEstimateRowItemId(),
      total: "PHP 0.00",
      children: node.children?.map(cloneNode) ?? [],
      estimateRowItems: node.estimateRowItems?.map(cloneLibraryItemForEstimate) ?? [],
    };
  }

  return nodes.map(cloneNode);
}

function appendTemplateNodesToParent(nodes: EstimateTreeNode[], targetParentNodeId: string, templateNodes: EstimateTreeNode[]): EstimateTreeNode[] {
  return nodes.map((node) => {
    if (node.id === targetParentNodeId) {
      return { ...node, children: [...(node.children ?? []), ...templateNodes] };
    }

    return {
      ...node,
      children: node.children ? appendTemplateNodesToParent(node.children, targetParentNodeId, templateNodes) : node.children,
    };
  });
}

function removeEstimateRowItem(nodes: EstimateTreeNode[], rowItemId: string): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.filter((item) => item.id !== rowItemId),
    children: node.children ? removeEstimateRowItem(node.children, rowItemId) : node.children,
  }));
}

type EstimateRowItemLocation = {
  nodeId: string;
  index: number;
  item: EstimateRowItem;
};

function findEstimateRowItemLocation(nodes: EstimateTreeNode[], rowItemId: string): EstimateRowItemLocation | null {
  for (const node of nodes) {
    const rowItems = node.estimateRowItems ?? [];
    for (let rowIndex = 0; rowIndex < rowItems.length; rowIndex += 1) {
      const item = rowItems[rowIndex];
      if (item.id === rowItemId) return { nodeId: node.id, index: rowIndex, item };
    }
    if (node.children) {
      const childLocation = findEstimateRowItemLocation(node.children, rowItemId);
      if (childLocation) return childLocation;
    }
  }
  return null;
}

function restoreEstimateRowItemAtLocation(nodes: EstimateTreeNode[], location: EstimateRowItemLocation): EstimateTreeNode[] {
  return nodes.map((node) => {
    if (node.id === location.nodeId) {
      const currentItems = node.estimateRowItems ?? [];
      if (currentItems.some((item) => item.id === location.item.id)) return node;
      const nextItems = [...currentItems];
      nextItems.splice(Math.min(location.index, nextItems.length), 0, location.item);
      return { ...node, estimateRowItems: nextItems };
    }
    return {
      ...node,
      children: node.children ? restoreEstimateRowItemAtLocation(node.children, location) : node.children,
    };
  });
}

function replaceEstimateRowItemsInTree(nodes: EstimateTreeNode[], replacements: Map<string, EstimateRowItem>): EstimateTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    estimateRowItems: node.estimateRowItems?.map((item) => replacements.get(item.id) ?? item),
    children: node.children ? replaceEstimateRowItemsInTree(node.children, replacements) : node.children,
  }));
}

function getActiveExpressEditorRowId() {
  if (typeof document === "undefined") return "";
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return "";
  if (!activeElement.dataset.expressField) return "";
  return activeElement.dataset.estimateRowId || activeElement.closest<HTMLElement>("[data-estimate-row-id]")?.dataset.estimateRowId || "";
}

function applyEditableValuesToLibraryItem(libraryItem: EstimateRowItem, editableRow?: EditableRowValue): EstimateRowItem {
  if (!editableRow) return libraryItem;

  const quantity = parseNonNegativeEditableNumber(editableRow.quantity);
  const contingencyPercentage = parseEditableContingencyPercentage(editableRow);
  const miscCost = parseNonNegativeEditableNumber(editableRow.miscCost);
  const subTotal = libraryItem.itemCost * quantity;
  const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);

  return {
    ...libraryItem,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
  };
}


function getClearedEstimateRowMetadata(metadata: EstimateRowItem["metadata"]): EstimateRowItem["metadata"] {
  const { expressComponent: _expressComponent, projectComponentProjection: _projectComponentProjection, ...rest } = readEstimateRowMetadata(metadata);
  void _expressComponent;
  void _projectComponentProjection;
  return {
    ...rest,
    sourceComponentId: null,
    tags: [BLANK_ESTIMATE_ROW_TAG],
  };
}

function replaceRowItemWithLibraryItem(rowItemId: string, libraryItem: EstimateRowItem): EstimateRowItem {
  const quantity = libraryItem.quantity || 1;
  const contingencyPercentage = libraryItem.contingencyPercentage ?? 0;
  const miscCost = libraryItem.miscCost ?? 0;
  const subTotal = libraryItem.itemCost * quantity;
  const contingencyValue = calculateContingencyValue(subTotal, contingencyPercentage);
  return {
    ...libraryItem,
    id: rowItemId,
    quantity,
    subTotal,
    contingencyPercentage,
    contingencyValue,
    miscCost,
    totalItemCosts: subTotal + miscCost + contingencyValue,
  };
}

function buildActivityScopeTreeItems({
  nodes,
  rows,
  editableRows,
  metadata,
  projectTotal,
  nodeTotals,
  activityScopeDirectOnly,
}: {
  nodes: EstimateTreeNode[];
  rows: FlattenedEstimateRow[];
  editableRows: Record<string, EditableRowValue>;
  metadata: ProposalExportMetadata | null;
  projectTotal: number;
  nodeTotals: ReadonlyMap<string, number>;
  // Unification P3-activity: scope is a STORED, STABLE per-node choice — never
  // derived from kind/children. An empty map yields includeDescendants:true for
  // every node, byte-identical to the legacy leaf behavior (a leaf's descendant
  // set is itself) while keeping the cache key invariant when a child is added.
  activityScopeDirectOnly: Record<string, boolean>;
}) {
  const rowById = new Map(rows.map((row) => [row.item.id, row]));
  const items: ActivityScopeTreeItem[] = [
    {
      id: "sheet",
      scope: { mode: "sheet" },
      depth: 0,
      kind: "sheet",
      label: metadata?.estimateName ?? "Estimate",
      eyebrow: metadata?.estimateSheetCode ?? "Estimate",
      total: projectTotal,
      row: null,
    },
  ];

  function visit(node: EstimateTreeNode, depth: number, nodeCode: string, ancestorNames: string[]) {
    const isGroup = node.kind === "group";
    const pathLabel = [...ancestorNames, node.name].join(" / ");
    items.push({
      id: `node:${node.id}`,
      // P3-activity: STORED stable choice, kind-agnostic. Default (absent) → true,
      // so the cache key `node:{id}:desc` does not change when children are added.
      scope: { mode: "node", nodeId: node.id, includeDescendants: !(activityScopeDirectOnly[node.id] ?? false) },
      depth,
      kind: isGroup ? "group" : "area",
      label: node.name,
      eyebrow: `${nodeCode} Area`,
      description: isGroup ? "Includes descendant node and row activity" : pathLabel,
      total: nodeTotals.get(node.id) ?? computeNodeTotal(node, editableRows),
      row: null,
    });

    node.children?.forEach((child, childIndex) => {
      visit(child, depth + 1, getNodeCode(nodeCode, childIndex), [...ancestorNames, node.name]);
    });

    // P3-activity: emit row-scope items for EVERY node, not just kind==="area".
    // Pre-relax this is a provable no-op (no non-area node carries rows today);
    // post-unification a former-group node's own rows must surface here.
    node.estimateRowItems?.forEach((rowItem, rowIndex) => {
      const row = rowById.get(rowItem.id) ?? null;
      const label = isBlankEstimateRowItem(rowItem) ? BLANK_ESTIMATE_ROW_AUDIT_LABEL : rowItem.material;
      items.push({
        id: `row:${node.id}:${rowIndex}:${rowItem.id}`,
        scope: { mode: "row", rowId: rowItem.id },
        depth: depth + 1,
        kind: "row",
        label,
        eyebrow: `Row ${String(rowIndex + 1).padStart(2, "0")}`,
        description: pathLabel,
        total: row?.lineTotal ?? rowItem.totalItemCosts ?? null,
        row,
      });
    });
  }

  nodes.forEach((node, index) => visit(node, 1, getNodeCode("", index), []));
  return items;
}

const SHEET_GROUP_OPTIONS: { mode: SheetGroupMode; label: string }[] = [
  { mode: "default", label: "Default" },
  { mode: "category", label: "Category" },
  { mode: "supplier", label: "Supplier" },
  { mode: "cost", label: "Cost (high to low)" },
];

function EstimateSheetHeader({
  onExpandAll,
  onCollapseAll,
  searchQuery,
  onSearchQueryChange,
  addActions,
  filterSlot,
  groupMode,
  onGroupModeChange,
}: {
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  addActions?: HeaderIconToolbarAddAction[];
  // D2 / Req 10 (middle): a wired faceted-filter popover and a within-area
  // group/sort menu. Both feed `displayedSheetNode` only — never the rows.
  filterSlot?: ReactNode;
  groupMode?: SheetGroupMode;
  onGroupModeChange?: (mode: SheetGroupMode) => void;
}) {
  const surfaceVariant = useEstimateSurfaceVariant();
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const groupActive = (groupMode ?? "default") !== "default";
  return (
    // z-30: the search dropdown must paint above the sheet's sticky branch
    // headers (z-20), which sit later in the DOM.
    <header className={cn("relative sticky top-0 z-30", estimateSurfaceClass(surfaceVariant, "sheetHeader"))} aria-label="Tab controls">
      <TreePanelHeader
        className="static z-auto bg-transparent"
        toolbarClassName={estimateSurfaceClass(surfaceVariant, "chromeToolbar")}
        showBottomBorder={false}
        ariaLabel="Tab tools"
        labelPrefix="tab"
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        startActionsLabel="Tab search"
        searchValue={searchQuery}
        onSearchValueChange={onSearchQueryChange}
        searchPlaceholder="Search Tab"
        searchLabel="Search Tab"
        // D2 / Req 10: wired Filter (facets) rendered in the filter position.
        filterSlot={filterSlot}
        // D2 / Req 10: the built-in Group button toggles a small within-area
        // ordering menu. aria-pressed reflects a non-default active mode.
        onGroup={onGroupModeChange ? () => setGroupMenuOpen((open) => !open) : undefined}
        // Req 13 / C3: the "New tab" button relocated here from the tab strip.
        // Hidden entirely for non-editors (canCreate=false → empty array).
        addActions={addActions ?? []}
      />
      {groupMenuOpen && onGroupModeChange ? (
        <div
          role="menu"
          aria-label="Group rows"
          className="absolute right-2 top-[40px] z-[1050] w-48 rounded-xs border border-hairline bg-white p-1 text-[10px] leading-4 text-secondary shadow-[0_16px_36px_rgba(17,24,39,0.14)]"
        >
          {SHEET_GROUP_OPTIONS.map((option) => {
            const active = (groupMode ?? "default") === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xs px-2 py-1 text-left hover:bg-surfaceMuted",
                  active ? "bg-surfaceMuted text-ink" : "text-secondary",
                )}
                onClick={() => {
                  onGroupModeChange(option.mode);
                  setGroupMenuOpen(false);
                }}
              >
                <span>{option.label}</span>
                {active ? <span aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {groupActive ? `Rows grouped by ${groupMode}` : "Rows in default order"}
      </span>
    </header>
  );
}

const EMPTY_COLLAPSED_NODE_IDS = new Set<string>();
const EMPTY_NODE_TOTALS: ReadonlyMap<string, number> = new Map();

function estimateSheetRowMatchesQuery(item: EstimateRowItem, normalizedQuery: string) {
  return [item.material, item.name, item.category, item.supplier, item.description]
    .some((value) => typeof value === "string" && value.toLowerCase().includes(normalizedQuery));
}

/**
 * Name/row filter for the sheet: a node whose name matches keeps its whole
 * subtree; otherwise it survives only with matching descendants or rows.
 */
function filterEstimateSheetNode(node: EstimateTreeNode, query: string): EstimateTreeNode | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return node;

  function visit(current: EstimateTreeNode): EstimateTreeNode | null {
    if (current.name.toLowerCase().includes(normalizedQuery)) return current;
    const children = (current.children ?? [])
      .map(visit)
      .filter((child): child is EstimateTreeNode => child !== null);
    const estimateRowItems = (current.estimateRowItems ?? []).filter((item) =>
      estimateSheetRowMatchesQuery(item, normalizedQuery),
    );
    if (children.length > 0 || estimateRowItems.length > 0) {
      return { ...current, children, estimateRowItems };
    }
    return null;
  }

  return visit(node);
}

// ---------------------------------------------------------------------------
// D2 / Req 10 (middle sheet): faceted FILTER + within-area GROUP/SORT.
//
// Both transforms operate ONLY over a sheet node's `estimateRowItems` and
// recurse `node.children`, preserving the AREA hierarchy (no flatten, no
// re-root — same constraint as the left tree). They are composed inside the
// `displayedSheetNode` memo so a referentially-stable node tree still flows to
// the memoized <EstimateSheetBranch>. When a transform is inactive it returns
// the SAME node reference (identity preserved) so the render-relief perf guard
// is unaffected.
// ---------------------------------------------------------------------------

type SheetFacetState = {
  suppliers: string[];
  categories: string[];
  /** Keep only rows whose total/cost is greater than zero. */
  hasValueOnly: boolean;
};

const EMPTY_SHEET_FACETS: SheetFacetState = { suppliers: [], categories: [], hasValueOnly: false };

function sheetFacetsActive(facets: SheetFacetState) {
  return facets.suppliers.length > 0 || facets.categories.length > 0 || facets.hasValueOnly;
}

function estimateRowItemValue(item: EstimateRowItem) {
  // Best-effort "row value" without recomputing the full editable total: the
  // seed total, else cost × quantity. Used only for the "has value" facet and
  // the cost sort ordering — never for display.
  if (typeof item.totalItemCosts === "number" && item.totalItemCosts !== 0) return item.totalItemCosts;
  return (item.itemCost ?? 0) * (item.quantity ?? 0);
}

function estimateRowMatchesFacets(item: EstimateRowItem, facets: SheetFacetState) {
  if (facets.suppliers.length > 0 && !facets.suppliers.includes(item.supplier || "")) return false;
  if (facets.categories.length > 0 && !facets.categories.includes(item.category || "")) return false;
  if (facets.hasValueOnly && estimateRowItemValue(item) <= 0) return false;
  return true;
}

/** Collect the distinct supplier/category values present in a sheet subtree. */
function collectSheetFacetOptions(node: EstimateTreeNode | null): { suppliers: string[]; categories: string[] } {
  const suppliers = new Set<string>();
  const categories = new Set<string>();
  function visit(current: EstimateTreeNode) {
    current.estimateRowItems?.forEach((item) => {
      if (item.supplier) suppliers.add(item.supplier);
      if (item.category) categories.add(item.category);
    });
    current.children?.forEach(visit);
  }
  if (node) visit(node);
  return {
    suppliers: Array.from(suppliers).sort((a, b) => a.localeCompare(b)),
    categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * Prune a sheet node to rows matching the active facets, mirroring
 * `filterEstimateSheetNode`'s keep-ancestors recursion: an area survives iff it
 * keeps a row OR a kept descendant. Returns the SAME node when no facet is
 * active (identity preserved).
 */
function filterEstimateSheetNodeByFacets(node: EstimateTreeNode, facets: SheetFacetState): EstimateTreeNode | null {
  if (!sheetFacetsActive(facets)) return node;

  function visit(current: EstimateTreeNode): EstimateTreeNode | null {
    const children = (current.children ?? [])
      .map(visit)
      .filter((child): child is EstimateTreeNode => child !== null);
    const estimateRowItems = (current.estimateRowItems ?? []).filter((item) => estimateRowMatchesFacets(item, facets));
    if (children.length > 0 || estimateRowItems.length > 0) {
      return { ...current, children, estimateRowItems };
    }
    return null;
  }

  return visit(node);
}

type SheetGroupMode = "default" | "category" | "supplier" | "cost";

/**
 * Reorder each area's `estimateRowItems` WITHIN that area (hierarchy preserved):
 * - category/supplier: flatten `groupComponents` buckets back to one array;
 * - cost: `sortComponents` priceDesc.
 * This is a within-area reorder only — it does NOT add group-header rows (that
 * would require changing the row renderer and risk the perf guard; out of
 * scope). Returns the SAME node when mode === "default" (identity preserved).
 */
function reorderEstimateSheetNodeRows(node: EstimateTreeNode, mode: SheetGroupMode): EstimateTreeNode {
  if (mode === "default") return node;

  function orderRows(items: EstimateRowItem[]): EstimateRowItem[] {
    if (items.length <= 1) return items;
    if (mode === "category" || mode === "supplier") {
      return groupSheetRows(items, mode === "category" ? "category" : "supplier").flatMap(([, bucket]) => bucket);
    }
    // cost: high → low.
    return sortSheetRows(items.map((item, index) => ({ item, score: 0, index })), "priceDesc");
  }

  function visit(current: EstimateTreeNode): EstimateTreeNode {
    const children = (current.children ?? []).map(visit);
    const rows = current.estimateRowItems ?? [];
    const reordered = orderRows(rows);
    const childrenChanged = children.some((child, index) => child !== (current.children ?? [])[index]);
    const rowsChanged = reordered !== rows && reordered.some((item, index) => item !== rows[index]);
    if (!childrenChanged && !rowsChanged) return current;
    return { ...current, children, estimateRowItems: reordered };
  }

  return visit(node);
}

function getRemoteCursorLabel(cursor: RemoteEstimateCursor) {
  // Identity (userId) is cryptographically verified upstream (T1.2); the name is
  // the verified sender's self-reported label, rendered as escaped React text.
  return cursor.displayName ?? `User ${cursor.userId.slice(0, 8)}`;
}

// Selector-safe ids only, so a wire-supplied rowId/columnId can never inject a
// CSS selector during denormalization.
const SAFE_ANCHOR_ID = /^[A-Za-z0-9_-]+$/;

type CursorTarget = { x: number; y: number };

// Resolve a remote cursor to surface-relative coords. Row/cell anchoring (T5.1 /
// R-6) keeps cursors on the same logical cell regardless of who has which rows
// expanded; falls back to the absolute scroll-adjusted coords for gutter/header.
function resolveCursorTarget(cursor: RemoteEstimateCursor, surface: HTMLElement): CursorTarget {
  if (cursor.rowId && SAFE_ANCHOR_ID.test(cursor.rowId)) {
    const rowEl = surface.querySelector<HTMLElement>(`[data-estimate-row-id="${cursor.rowId}"]`);
    let anchor: HTMLElement | null = rowEl;
    if (rowEl && cursor.columnId && SAFE_ANCHOR_ID.test(cursor.columnId)) {
      anchor = rowEl.querySelector<HTMLElement>(`[data-estimate-cell-index="${cursor.columnId}"]`) ?? rowEl;
    }
    if (anchor) {
      const surfaceBounds = surface.getBoundingClientRect();
      const anchorBounds = anchor.getBoundingClientRect();
      return {
        x: anchorBounds.left - surfaceBounds.left + surface.scrollLeft + (cursor.fracX ?? 0.5) * anchorBounds.width,
        y: anchorBounds.top - surfaceBounds.top + surface.scrollTop + (cursor.fracY ?? 0.5) * anchorBounds.height,
      };
    }
  }
  return { x: cursor.x, y: cursor.y };
}

// Isolates collaboration cursor traffic: the realtime hook lives here so
// remote cursor frames re-render only this layer, never the sheet branches
// or row tables. Pointer broadcasting and channel-status attributes attach to
// the enclosing [data-estimate-pointer-surface] element imperatively.
function EstimateSheetCursorLayer({
  estimateId,
  tabId,
  userId,
  displayName,
}: {
  estimateId?: string;
  tabId?: string;
  userId: string | null;
  displayName: string | null;
}) {
  const { broadcastCursor, channelStatus, lastSendStatus, remoteCursors } = useEstimateCursorCollaboration({
    estimateId,
    tabId,
    userId,
    displayName,
    enabled: Boolean(estimateId && userId),
  });
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const surface = layerRef.current?.closest<HTMLElement>("[data-estimate-pointer-surface]");
    if (!surface || !estimateId || !userId) return;

    function handlePointerMove(event: globalThis.PointerEvent) {
      if (!(event.target instanceof Element) || !surface) return;
      const bounds = surface.getBoundingClientRect();
      const rowElement = event.target.closest<HTMLElement>("[data-estimate-row-id]");
      const cellElement = event.target.closest<HTMLElement>("[data-estimate-cell-index]");
      // Fraction within the resolved cell/row so receivers can re-anchor without
      // pixel drift across differing expansion/viewport (T5.1 / R-6).
      const anchorElement = cellElement ?? rowElement;
      let fracX: number | null = null;
      let fracY: number | null = null;
      if (anchorElement) {
        const anchorBounds = anchorElement.getBoundingClientRect();
        fracX = anchorBounds.width ? (event.clientX - anchorBounds.left) / anchorBounds.width : 0;
        fracY = anchorBounds.height ? (event.clientY - anchorBounds.top) / anchorBounds.height : 0;
      }
      broadcastCursor({
        x: Math.round(event.clientX - bounds.left + surface.scrollLeft),
        y: Math.round(event.clientY - bounds.top + surface.scrollTop),
        fracX,
        fracY,
        rowId: rowElement?.dataset.estimateRowId ?? null,
        columnId: cellElement?.dataset.estimateCellIndex ?? null,
      });
    }

    surface.addEventListener("pointermove", handlePointerMove);
    return () => surface.removeEventListener("pointermove", handlePointerMove);
  }, [broadcastCursor, estimateId, userId]);

  useEffect(() => {
    const surface = layerRef.current?.closest<HTMLElement>("[data-estimate-pointer-surface]");
    if (!surface) return;
    surface.setAttribute("data-estimate-cursor-channel", channelStatus);
    surface.setAttribute("data-estimate-cursor-send", lastSendStatus);
  }, [channelStatus, lastSendStatus]);

  return (
    <div ref={layerRef} className="contents">
      <RemoteEstimateCursorsOverlay cursors={remoteCursors} />
    </div>
  );
}

function RemoteEstimateCursorsOverlay({ cursors }: { cursors: RemoteEstimateCursor[] }) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const positionsRef = useRef<Map<string, CursorTarget>>(new Map());
  const cursorsRef = useRef<RemoteEstimateCursor[]>(cursors);
  // Keep the rAF loop reading the latest cursors without re-subscribing it
  // (synced in an effect, not during render, per react-hooks rules).
  useEffect(() => {
    cursorsRef.current = cursors;
  });

  // rAF interpolation loop: eases each marker toward its (re-resolved) anchor
  // every frame, decoupled from the network loop. Reduced-motion → snap.
  useEffect(() => {
    if (cursors.length === 0) return;
    const overlay = overlayRef.current;
    const surface = overlay?.closest<HTMLElement>("[data-estimate-pointer-surface]");
    if (!surface) return;

    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    let raf = 0;
    const positions = positionsRef.current;
    function frame() {
      for (const cursor of cursorsRef.current) {
        const element = markerRefs.current.get(cursor.userId);
        if (!element || !surface) continue;
        const target = resolveCursorTarget(cursor, surface);
        const previous = positions.get(cursor.userId) ?? target;
        const nextX = reduceMotion ? target.x : previous.x + (target.x - previous.x) * 0.25;
        const nextY = reduceMotion ? target.y : previous.y + (target.y - previous.y) * 0.25;
        positions.set(cursor.userId, { x: nextX, y: nextY });
        element.style.transform = `translate3d(${Math.round(nextX)}px, ${Math.round(nextY)}px, 0)`;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cursors.length]);

  if (cursors.length === 0) return null;

  // Screen-reader equivalent for the aria-hidden visual layer (T5.1 / G11):
  // who is editing which row, derived from anchor ids (changes rarely, no spam).
  const editingAnnouncement = filterMapBy(
    cursors,
    (cursor) => Boolean(cursor.rowId),
    (cursor) => `${getRemoteCursorLabel(cursor)} is editing a row`,
  ).join(". ");

  return (
    <>
      <div
        ref={overlayRef}
        className="pointer-events-none absolute left-0 top-0 z-30 min-h-full min-w-full"
        aria-hidden="true"
        data-estimate-cursor-layer
      >
        {cursors.map((cursor) => (
          <RemoteEstimateCursorMarker
            key={cursor.userId}
            cursor={cursor}
            registerRef={(element) => {
              if (element) markerRefs.current.set(cursor.userId, element);
              else markerRefs.current.delete(cursor.userId);
            }}
          />
        ))}
      </div>
      <div className="sr-only" role="status" aria-live="polite" data-estimate-cursor-sr>
        {editingAnnouncement}
      </div>
    </>
  );
}

function RemoteEstimateCursorMarker({
  cursor,
  registerRef,
}: {
  cursor: RemoteEstimateCursor;
  registerRef: (element: HTMLDivElement | null) => void;
}) {
  const color = getCollaborationColorForUser(cursor.userId);

  return (
    <div
      ref={registerRef}
      className="absolute left-0 top-0 flex items-start gap-1 will-change-transform"
      style={{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)` }}
      data-estimate-remote-cursor={cursor.userId}
      data-estimate-remote-cursor-color={color.name}
    >
      <span
        className="mt-0.5 block size-2 rotate-45 rounded-xs shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
        style={{ backgroundColor: color.cursor, boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.9), 0 0 0 4px ${color.ring}` }}
      />
      <span
        className="max-w-28 truncate rounded-xs px-1.5 py-0.5 text-[8px] font-medium leading-[10px] shadow-[0_4px_12px_rgba(17,24,39,0.18)]"
        style={{ backgroundColor: color.cursor, color: color.text }}
      >
        {getRemoteCursorLabel(cursor)}
      </span>
    </div>
  );
}

export function EstimateSheetContent({
  selectedNodeId,
  nodes = sampleEstimateTree,
  projectId,
  workspaceId,
  estimateId,
  estimateTabs = [],
  activeTabId,
  loadLimitState,
  dataTabId,
  canEditEstimate = false,
  initialTabId,
  onActiveTabChange,
  onEstimateTabsChange,
  collaborationUserId = null,
  collaborationDisplayName = null,
  proposalExportMetadata,
  renderSidebar = true,
  libraryItems,
  libraryTemplates,
  libraryCategoryTree,
  librarySuppliers,
  libraryBrands,
  libraryFolders,
}: EstimateSheetContentProps) {
  reportEstimateSheetContentRender();
  const surfaceVariant = useEstimateSurfaceVariant();
  const tabInitialNodes = dataTabId && dataTabId === initialTabId ? nodes : undefined;
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId, dataTabId);
  const {
    saveState,
    rowMutationError,
    clearRowMutationError,
    markRowDirty: markRowDirtyNow,
    insertRow,
    replaceRow,
    detachRow,
    promoteRow,
    deleteRow,
    updateRow,
  } = useEstimateRowMutations(estimateId, dataTabId, workspaceId, projectId);
  // Row tables are memoized on callback identity: every handler that reaches
  // EstimateSheetBranch/EstimateRowItemsTable must stay referentially stable.
  const markRowDirty = useStableCallback(markRowDirtyNow);
  const legacyTreeQuery = useEstimateAreaTreeQuery({
    projectId,
    estimateId,
    initialNodes: nodes,
    enabled: !dataTabId,
  });
  const tabTreeQuery = useEstimateTabTreeQuery({
    projectId,
    estimateId,
    tabId: dataTabId,
    initialNodes: tabInitialNodes,
    enabled: Boolean(dataTabId),
  });
  const activeTreeQuery = dataTabId ? tabTreeQuery : legacyTreeQuery;
  const activeInitialLoadLimitState = dataTabId === initialTabId ? loadLimitState : undefined;
  const didTruncateInitialTree =
    Boolean(activeInitialLoadLimitState?.didExceedNodeLimit || activeInitialLoadLimitState?.didExceedRowItemLimit);
  const {
    tree: estimateTree,
    setTree: setEstimateTreeData,
    restore: restoreEstimateTree,
    getTreeRevision: getEstimateTreeRevision,
  } = activeTreeQuery;
  const estimatePointerSurfaceRef = useRef<HTMLDivElement | null>(null);
  const skipEditableRowsSyncRef = useRef(0);
  const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>(() => collectEditableRows(nodes));
  const expressInsertDraftsRef = useRef<Record<string, ExpressInsertDraft>>({});
  const [expressInsertDrafts, setExpressInsertDraftsState] = useState<Record<string, ExpressInsertDraft>>({});
  const [pendingFocusRowId, setPendingFocusRowId] = useState("");
  const [pendingLibraryCommitGate, setPendingLibraryCommitGate] = useState<PendingLibraryCommitGate | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [collapsedNodeIdsByScope, setCollapsedNodeIdsByScope] = useState<Record<string, string[]>>({});
  const [bulkSelectedRowIds, setBulkSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [isProposalPreviewOpen, setIsProposalPreviewOpen] = useState(false);
  const [proposalPreviewScope, setProposalPreviewScope] = useState<ProposalExportPreviewScope>("all-tabs");
  const [proposalPreviewModel, setProposalPreviewModel] = useState<ProposalExportModel | null>(null);
  const [proposalPreviewSignature, setProposalPreviewSignature] = useState("");
  const [isDownloadingProposal, setIsDownloadingProposal] = useState(false);
  const [proposalDownloadError, setProposalDownloadError] = useState<string | null>(null);
  const [proposalExportSettings, setProposalExportSettings] = useState<ProposalExportUserSettings>(DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS);
  const estimateColumnResizeEnabled = WORKSHOP_VIRTUALIZATION_FLAGS.estimateColumnResize;
  const committedEstimateColumnWidths = useEstimateColumnWidthsStore((state) =>
    estimateId ? state.widthsByEstimateId[estimateId] ?? state.lastUsedWidths : EMPTY_ESTIMATE_COLUMN_WIDTHS,
  );
  const hydrateEstimateColumnWidths = useEstimateColumnWidthsStore((state) => state.hydrateEstimateColumnWidths);
  const commitEstimateColumnWidths = useEstimateColumnWidthsStore((state) => state.commitEstimateColumnWidths);
  const resetEstimateColumnWidths = useEstimateColumnWidthsStore((state) => state.resetEstimateColumnWidths);
  const estimateColumnStyle = useMemo(
    () => (estimateColumnResizeEnabled ? buildEstimateColumnVars(committedEstimateColumnWidths) : undefined),
    [committedEstimateColumnWidths, estimateColumnResizeEnabled],
  );
  const estimateColumnResizeConfig = useMemo(() => {
    if (!estimateColumnResizeEnabled || !estimateId) return undefined;
    return {
      surfaceRef: estimatePointerSurfaceRef,
      widths: committedEstimateColumnWidths,
      onCommitWidths: (widths: typeof committedEstimateColumnWidths) => commitEstimateColumnWidths(estimateId, widths),
      onResetWidths: () => resetEstimateColumnWidths(estimateId),
    };
  }, [commitEstimateColumnWidths, committedEstimateColumnWidths, estimateColumnResizeEnabled, estimateId, resetEstimateColumnWidths]);

  useEffect(() => {
    if (!estimateColumnResizeEnabled || !estimateId) return;
    hydrateEstimateColumnWidths(estimateId);
  }, [estimateColumnResizeEnabled, estimateId, hydrateEstimateColumnWidths]);

  const setExpressInsertDrafts = useStableCallback((updater: SetStateAction<Record<string, ExpressInsertDraft>>) => {
    setExpressInsertDraftsState((current) => {
      const next = typeof updater === "function"
        ? (updater as (value: Record<string, ExpressInsertDraft>) => Record<string, ExpressInsertDraft>)(current)
        : updater;
      expressInsertDraftsRef.current = next;
      return next;
    });
  });
  const expressInsertDraftStates = useMemo<Record<string, ExpressInsertDraftState>>(
    () => Object.fromEntries(Object.entries(expressInsertDrafts).map(([rowId, draft]) => [rowId, draft.status])),
    [expressInsertDrafts],
  );
  const [inspector, setInspector] = useState<EstimateActivityScope | null>(null);
  // P3-activity: per-node stored activity scope (direct-only vs descendants).
  // Stable identity (selector returns the same default {} until a flip), so the
  // activity cache key never becomes time-varying when a child is added.
  const activityScopeDirectOnly = useEstimateUiStore((s) => s.activityScopeDirectOnly);
  const [rowDetails, setRowDetails] = useState<RowDetailsState | null>(null);
  const [projectSpecificRowId, setProjectSpecificRowId] = useState("");
  const [promotingRowId, setPromotingRowId] = useState<string | null>(null);
  const [activityFilters, setActivityFilters] = useState<ActivityFilterState>(DEFAULT_ACTIVITY_FILTERS);
  const [historyData, setHistoryData] = useState<EstimateSheetVersionControlData | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  // C3/Req 13: ref to the tab strip's imperative handle so the middle-panel
  // header can trigger createTab without prop-drilling.
  const tabStripRef = useRef<EstimateTabStripHandle | null>(null);
  // Mirrors the tab strip's create-enabled / pending state for the header button.
  // Updated via onCreateTabStateChange (effect in EstimateTabStrip) so the header
  // re-renders on each transition even though refs don't cause re-renders.
  const [createTabState, setCreateTabState] = useState({ canCreate: false, pending: false });
  const inspectorOpenerRef = useRef<HTMLElement | null>(null);
  const rowDetailsOpenerRef = useRef<HTMLElement | null>(null);
  const proposalPreviewOpenerRef = useRef<HTMLElement | null>(null);
  const inspectorScopeRef = useRef("");
  const historyRequestGenerationRef = useRef(0);
  const activateHistoryScope = useCallback((scopeKey: string) => {
    inspectorScopeRef.current = scopeKey;
    historyRequestGenerationRef.current += 1;
  }, []);
  // Lazy library path: production pages no longer pass library props, so the
  // dataset loads through a server action once the sidebar (or palette) needs
  // it. Server-provided props short-circuit the fetch for tests/embeds.
  const hasServerProvidedLibrary = Boolean(libraryItems);
  const shouldLoadLibraryLazily = !hasServerProvidedLibrary && Boolean(projectId && estimateId);
  const lazyLibraryQueryKey = workspaceId && projectId
    ? workspaceComponentLibraryLiteQueryKey(workspaceId, projectId)
    : workspaceComponentLibraryLiteQueryKey(workspaceId ?? "missing-workspace", projectId ?? "missing-project");
  const {
    data: lazyLibraryData,
    isError: isLazyLibraryError,
    refetch: refetchLazyLibrary,
  } = useQuery({
    // U18: the panel reads only slim EstimateRowItem fields, so it loads the lite
    // dataset under its own key — never the full-graph key the editor surfaces use.
    queryKey: lazyLibraryQueryKey,
    queryFn: () => {
      if (!projectId) throw new Error("Project id is required to load the component library.");
      return loadProjectComponentLibraryLite(projectId);
    },
    enabled: shouldLoadLibraryLazily && (renderSidebar || showCommandPalette),
    staleTime: 5 * 60 * 1000,
    // U19: keep the warmed cache long after navigate-away so returning to the
    // estimate doesn't re-run the cold load (it's workspace-global + mutation-invalidated).
    gcTime: 30 * 60 * 1000,
  });
  const lazyLibrary = shouldLoadLibraryLazily ? lazyLibraryData : undefined;
  const resolvedLibraryItems = libraryItems ?? lazyLibrary?.libraryItems;
  const queryClient = useQueryClient();
  // U2: project-source insert is non-optimistic (the full source subtree isn't
  // resident client-side); failures surface through the existing toast.
  const { toast } = useToast();
  // Library mutations in the sidebar update its local state; the lazy query
  // cache must also be marked stale or remounts re-seed from pre-mutation data.
  // Non-exact invalidation on the shared prefix covers both the lite (panel) and
  // full (editor) datasets. PERF-7: refetchType "none" marks the heavy lite
  // dataset stale without eagerly refetching it while the panel is open — the
  // sidebar's local optimistic state is already correct, and the next cold mount
  // reseeds fresh. Avoids a full-library refetch after common in-panel actions.
  const handleLibraryDataChanged = useStableCallback(() => {
    if (workspaceId) void queryClient.invalidateQueries({ queryKey: workspaceComponentLibraryQueryKey(workspaceId), refetchType: "none" });
  });
  const refetchProjectComponentProjection = useStableCallback(() => {
    if (workspaceId) void queryClient.invalidateQueries({ queryKey: workspaceComponentLibraryQueryKey(workspaceId), refetchType: "active" });
    if (workspaceId && projectId) {
      void queryClient.invalidateQueries({ queryKey: workspaceComponentRowsLibraryQueryKey(workspaceId, projectId), refetchType: "active" });
    } else {
      void queryClient.invalidateQueries({ queryKey: WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, refetchType: "active" });
    }
  });
  const availableTemplates = libraryTemplates ?? lazyLibrary?.templates ?? EMPTY_ESTIMATE_TEMPLATES;
  const resolvedProposalExportMetadata = useMemo<ProposalExportMetadata | null>(() => {
    if (proposalExportMetadata) return proposalExportMetadata;
    if (!projectId || !estimateId) return null;

    return {
      projectId,
      estimateId,
      projectName: "Untitled project",
      projectCode: null,
      projectAddress: null,
      estimateName: "Untitled estimate",
      estimateSheetCode: estimateId,
      versionLabel: "V1",
      currency: "PHP",
    };
  }, [estimateId, projectId, proposalExportMetadata]);
  const persistedTabs = useMemo(() => estimateTabs.filter((tab) => tab.id !== "legacy-main"), [estimateTabs]);
  const hasMultiplePersistedTabs = persistedTabs.length > 1;
  const activeProposalExportTab = useMemo(
    () =>
      persistedTabs.find((tab) => tab.id === dataTabId) ??
      persistedTabs.find((tab) => tab.id === activeTabId) ??
      persistedTabs.find((tab) => tab.isDefault) ??
      persistedTabs[0],
    [activeTabId, dataTabId, persistedTabs],
  );
  const activeProposalExportTabName = activeProposalExportTab?.name ?? "Current";
  const tabScopeSignature = useMemo(
    () => persistedTabs.map((tab) => `${tab.id}:${tab.name}:${tab.sortOrder}`).join("|"),
    [persistedTabs],
  );
  const getProposalPreviewSignature = useCallback(
    (scope: ProposalExportPreviewScope) => [
      createProposalPreviewSignature(estimateTree, editableRows, resolvedProposalExportMetadata),
      dataTabId ?? "legacy",
      tabScopeSignature,
      scope,
      JSON.stringify(proposalPreviewModelSettings(proposalExportSettings)),
    ].join("::"),
    [dataTabId, editableRows, estimateTree, proposalExportSettings, resolvedProposalExportMetadata, tabScopeSignature],
  );
  const currentProposalPreviewSignature = useMemo(
    () => (proposalPreviewModel ? getProposalPreviewSignature(proposalPreviewScope) : ""),
    [getProposalPreviewSignature, proposalPreviewModel, proposalPreviewScope],
  );
  const proposalDownloadHref = useMemo(() => {
    if (!projectId || !estimateId) return null;
    const baseHref = `/api/projects/${encodeURIComponent(projectId)}/estimates/${encodeURIComponent(estimateId)}/export/proposal.xlsx`;
    const params = new URLSearchParams();
    if (hasMultiplePersistedTabs && proposalPreviewScope === "active-tab" && dataTabId) params.set("tab", dataTabId);
    appendProposalExportSettingsParams(params, proposalExportSettings);
    const query = params.toString();
    return query ? `${baseHref}?${query}` : baseHref;
  }, [dataTabId, estimateId, hasMultiplePersistedTabs, projectId, proposalExportSettings, proposalPreviewScope]);
  const templateById = useMemo(() => new Map(availableTemplates.map((template) => [template.id, template])), [availableTemplates]);
  const { selectedNodeId: resolvedSelectedNodeId, selectedNode } = useMemo(
    () =>
      resolveEstimateWorkspaceSelection({
        selectedNodeId: activeSelectedNodeId,
        fallbackNode: estimateTree[0],
        findNode: (nodeId) => findEstimateNode(estimateTree, nodeId),
      }),
    [activeSelectedNodeId, estimateTree],
  );
  const selectedNodePresentation = useMemo(() => {
    if (!resolvedSelectedNodeId) return EMPTY_SELECTED_NODE_PRESENTATION;
    const selectedNodePath = findNodePath(estimateTree, resolvedSelectedNodeId);
    return {
      nodeCode: computeNodeCode(estimateTree, resolvedSelectedNodeId),
      ancestorPath: selectedNodePath.slice(0, -1).map((node) => ({ id: node.id, name: node.name })),
    };
  }, [estimateTree, resolvedSelectedNodeId]);
  const [sheetSearchQuery, setSheetSearchQuery] = useState("");
  const sheetSearchActive = sheetSearchQuery.trim().length > 0;
  // D2 / Req 10 (middle): faceted filter + within-area group/sort. Client state
  // only; both compose into `displayedSheetNode` and NEVER reach the rows.
  const [sheetFacets, setSheetFacets] = useState<SheetFacetState>(EMPTY_SHEET_FACETS);
  const [sheetGroupMode, setSheetGroupMode] = useState<SheetGroupMode>("default");
  const facetsActive = sheetFacetsActive(sheetFacets);
  const groupActive = sheetGroupMode !== "default";
  // Render-only filtered copy: row edits and inserts keep targeting the real
  // tree state by node/item id.
  //
  // Composition order: search prune → facet filter → per-area reorder. Each
  // step returns the SAME node reference when inactive, so when ALL of
  // search/facets/group are inactive `displayedSheetNode` is referentially
  // identical to `selectedNode` — preserving the render-relief perf guarantee
  // (stable props into the memoized <EstimateSheetBranch>).
  const displayedSheetNode = useMemo(() => {
    if (!selectedNode) return selectedNode;
    let node: EstimateTreeNode | null = sheetSearchActive
      ? filterEstimateSheetNode(selectedNode, sheetSearchQuery)
      : selectedNode;
    if (node && facetsActive) node = filterEstimateSheetNodeByFacets(node, sheetFacets);
    if (node && groupActive) node = reorderEstimateSheetNodeRows(node, sheetGroupMode);
    return node;
  }, [selectedNode, sheetSearchActive, sheetSearchQuery, facetsActive, sheetFacets, groupActive, sheetGroupMode]);
  // Facet options derive from the unfiltered selected node so toggling a facet
  // never removes other facets' options from the popover.
  const sheetFacetOptions = useMemo(() => collectSheetFacetOptions(selectedNode), [selectedNode]);
  const collapsedScopeKey = dataTabId ?? "legacy";
  const collapsedNodeIds = useMemo(
    () => new Set(collapsedNodeIdsByScope[collapsedScopeKey] ?? []),
    [collapsedNodeIdsByScope, collapsedScopeKey],
  );
  const setCollapsedNodeIds = useCallback((update: SetStateAction<Set<string>>) => {
    setCollapsedNodeIdsByScope((current) => {
      const previous = new Set(current[collapsedScopeKey] ?? []);
      const next = typeof update === "function" ? update(previous) : update;
      return {
        ...current,
        [collapsedScopeKey]: Array.from(next),
      };
    });
  }, [collapsedScopeKey]);
  // Searches reveal every match: collapse state pauses while filtering, and the
  // per-node disclosure caret is suppressed (searchActive) so users can't toggle
  // collapse state they can't see take effect. State restores when search clears.
  const sheetExpansionContextValue = useMemo(
    () => ({
      collapsedNodeIds: sheetSearchActive ? EMPTY_COLLAPSED_NODE_IDS : collapsedNodeIds,
      setCollapsedNodeIds,
      searchActive: sheetSearchActive,
    }),
    [collapsedNodeIds, setCollapsedNodeIds, sheetSearchActive],
  );
  const visibleSheetRowIds = useMemo(() => {
    const rowIds = new Set<string>();
    if (!displayedSheetNode) return rowIds;
    function visit(currentNode: EstimateTreeNode) {
      currentNode.estimateRowItems?.forEach((item) => rowIds.add(item.id));
      currentNode.children?.forEach(visit);
    }
    visit(displayedSheetNode);
    return rowIds;
  }, [displayedSheetNode]);

  // Selections only make sense for rows that are still on screen: deletes,
  // searches, and node switches silently drop stale ids.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setBulkSelectedRowIds((current) => {
        if (current.size === 0) return current;
        const next = new Set([...current].filter((rowId) => visibleSheetRowIds.has(rowId)));
        return next.size === current.size ? current : next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [visibleSheetRowIds]);

  const toggleRowSelection = useCallback((rowItemId: string, checked: boolean) => {
    setBulkSelectedRowIds((current) => {
      const next = new Set(current);
      if (checked) next.add(rowItemId);
      else next.delete(rowItemId);
      return next;
    });
  }, []);
  const toggleRowsSelection = useCallback((rowItemIds: string[], checked: boolean) => {
    setBulkSelectedRowIds((current) => {
      const next = new Set(current);
      rowItemIds.forEach((rowId) => {
        if (checked) next.add(rowId);
        else next.delete(rowId);
      });
      return next;
    });
  }, []);
  const clearRowSelection = useCallback(() => setBulkSelectedRowIds(new Set()), []);
  const bulkSelectedRowCount = bulkSelectedRowIds.size;
  // P6 single-node model: a row OR a template/subtree inserts directly into ANY
  // selected node — no kind gate, no ancestor-group resolution, no area-wrap.
  const insertTargetNodeId = selectedNode?.id ?? "";
  const templateTargetParentNode = selectedNode ?? null;
  const canInsertIntoSelectedNode = Boolean(insertTargetNodeId);
  const canInsertTemplateIntoSelectedNode = Boolean(templateTargetParentNode);
  const insertionTargetLabel = selectedNode?.name ?? "selected area";
  const templateInsertionTargetLabel = templateTargetParentNode?.name ?? "selected area";
  const estimateNodeTotals = useMemo(() => computeNodeTotals(estimateTree, editableRows), [editableRows, estimateTree]);
  const displayedNodeTotals = useMemo(() => {
    if (!displayedSheetNode) return EMPTY_NODE_TOTALS;
    if (displayedSheetNode === selectedNode) return estimateNodeTotals;
    return computeNodeTotals([displayedSheetNode], editableRows);
  }, [displayedSheetNode, editableRows, estimateNodeTotals, selectedNode]);
  const projectTotal = useMemo(
    () => estimateTree.reduce((total, node) => total + (estimateNodeTotals.get(node.id) ?? 0), 0),
    [estimateNodeTotals, estimateTree],
  );
  const shouldBuildFlattenedRows = Boolean(inspector || rowDetails || projectSpecificRowId);
  const currentRows = useMemo(
    () => (shouldBuildFlattenedRows ? flattenEstimateRows(estimateTree, editableRows) : EMPTY_FLATTENED_ESTIMATE_ROWS),
    [editableRows, estimateTree, shouldBuildFlattenedRows],
  );
  const inspectorScopeKey = getActivityScopeKey(inspector);
  const activityFilterKey = useMemo(() => createActivityFilterKey(activityFilters), [activityFilters]);
  const activityScopeItems = useMemo(() => {
    if (!inspector) return EMPTY_ACTIVITY_SCOPE_ITEMS;
    return buildActivityScopeTreeItems({
      nodes: estimateTree,
      rows: currentRows,
      editableRows,
      metadata: resolvedProposalExportMetadata,
      projectTotal,
      nodeTotals: estimateNodeTotals,
      activityScopeDirectOnly,
    });
  }, [activityScopeDirectOnly, currentRows, editableRows, estimateNodeTotals, estimateTree, inspector, projectTotal, resolvedProposalExportMetadata]);
  const selectedActivityScopeItem = useMemo(
    () => activityScopeItems.find((item) => getActivityScopeKey(item.scope) === inspectorScopeKey) ?? activityScopeItems[0] ?? null,
    [activityScopeItems, inspectorScopeKey],
  );
  const selectedRowDetailsItem = useMemo(
    () => (rowDetails ? currentRows.find((row) => row.item.id === rowDetails.rowId) ?? null : null),
    [currentRows, rowDetails],
  );
  const projectSpecificRow = useMemo(
    () => (projectSpecificRowId ? currentRows.find((row) => row.item.id === projectSpecificRowId) ?? null : null),
    [currentRows, projectSpecificRowId],
  );
  const allNodeIds = useMemo(() => (selectedNode ? collectAllNodeIds([selectedNode]) : []), [selectedNode]);
  const expandAll = useCallback(() => setCollapsedNodeIds(new Set()), [setCollapsedNodeIds]);
  const collapseAll = useCallback(() => setCollapsedNodeIds(new Set(allNodeIds)), [allNodeIds, setCollapsedNodeIds]);
  const requestRootGroupCreate = useCallback(() => {
    window.dispatchEvent(new CustomEvent(REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, { detail: { kind: "group" } }));
  }, []);
  const openTemplateBrowser = useCallback(() => {
    setShowCommandPalette(true);
  }, []);
  const syncActiveTabRouteUrl = useCallback((nodeId: string | null) => {
    if (!projectId || !estimateId || typeof window === "undefined") return;
    const href = nodeId
      ? `/workshop/projects/${projectId}/estimates/${nodeId}`
      : `/workshop/projects/${projectId}/estimates/${estimateId}`;
    if (window.location.pathname === href) return;
    window.history.replaceState(null, "", href);
  }, [estimateId, projectId]);
  const setActiveInspector = useCallback((nextInspector: EstimateActivityScope | null) => {
    const nextScopeKey = getActivityScopeKey(nextInspector);
    activateHistoryScope(nextScopeKey);
    setInspector(nextInspector);
  }, [activateHistoryScope]);
  const replaceActivityFilters = useCallback((nextFilters: ActivityFilterState) => {
    setActivityFilters(nextFilters);
    if (projectId && estimateId && inspector) {
      historyRequestGenerationRef.current += 1;
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
  }, [estimateId, inspector, projectId]);
  const resetActivityFilters = useCallback(() => {
    replaceActivityFilters(DEFAULT_ACTIVITY_FILTERS);
  }, [replaceActivityFilters]);
  const reloadVersionControl = useCallback(() => {
    if (projectId && estimateId) {
      historyRequestGenerationRef.current += 1;
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
    setHistoryReloadToken((current) => current + 1);
  }, [estimateId, projectId]);
  const closeInspector = useCallback(() => {
    setActiveInspector(null);
    window.requestAnimationFrame(() => inspectorOpenerRef.current?.focus());
  }, [setActiveInspector]);
  const prepareHistoryLoad = useCallback(() => {
    if (projectId && estimateId) {
      setIsHistoryLoading(true);
      setIsHistoryLoadingMore(false);
      setHistoryData(null);
      setHistoryError("");
    }
  }, [estimateId, projectId]);
  const openActivityHistory = useCallback((opener: HTMLElement, initialScope: EstimateActivityScope = { mode: "sheet" }) => {
    inspectorOpenerRef.current = opener;
    prepareHistoryLoad();
    setActiveInspector(initialScope);
  }, [prepareHistoryLoad, setActiveInspector]);
  const openRowDetails = useCallback((rowItemId: string, opener: HTMLElement, tab: RowDetailTab = "details") => {
    rowDetailsOpenerRef.current = opener;
    setRowDetails({ rowId: rowItemId, tab });
  }, []);
  const closeRowDetails = useCallback(() => {
    setRowDetails(null);
    window.requestAnimationFrame(() => rowDetailsOpenerRef.current?.focus());
  }, []);
  const setRowDetailsTab = useCallback((tab: RowDetailTab) => {
    setRowDetails((current) => (current ? { ...current, tab } : current));
  }, []);
  const selectActivityScope = useCallback((nextScope: EstimateActivityScope) => {
    if (getActivityScopeKey(nextScope) === inspectorScopeKey) return;
    prepareHistoryLoad();
    setActiveInspector(nextScope);
  }, [inspectorScopeKey, prepareHistoryLoad, setActiveInspector]);
  const loadMoreVersionControl = useCallback(() => {
    if (!inspector || !historyData || !projectId || !estimateId || isHistoryLoadingMore) return;

    const isRowHistory = inspector.mode === "row";
    const isNodeHistory = inspector.mode === "node";
    const requestScopeKey = isRowHistory ? `row:${inspector.rowId}` : isNodeHistory ? `node:${inspector.nodeId}:${inspector.includeDescendants ? "desc" : "direct"}` : "sheet";
    const cursor = isRowHistory ? historyData.rowNextCursor : isNodeHistory ? historyData.nodeNextCursor : historyData.nextCursor;
    if (!cursor) return;

    setIsHistoryLoadingMore(true);
    setHistoryError("");
    const requestGeneration = historyRequestGenerationRef.current;
    const isCurrentHistoryRequest = () => inspectorScopeRef.current === requestScopeKey && historyRequestGenerationRef.current === requestGeneration;

    fetchEstimateSheetVersionControl({
      projectId,
      estimateId,
      rowId: isRowHistory ? inspector.rowId : undefined,
      nodeId: isNodeHistory ? inspector.nodeId : undefined,
      includeDescendants: isNodeHistory ? inspector.includeDescendants : undefined,
      eventLimit: 50,
      ...getActivityFilterInput(activityFilters),
      sheetCursor: !isRowHistory && !isNodeHistory ? cursor : undefined,
      rowCursor: isRowHistory ? cursor : undefined,
      nodeCursor: isNodeHistory ? cursor : undefined,
      scope: isRowHistory ? "row" : isNodeHistory ? "node" : "sheet",
    })
      .then((data) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryData((current) => {
          if (!current) return data;
          if (isRowHistory) {
            return {
              ...current,
              rowEvents: [...current.rowEvents, ...data.rowEvents],
              rowNextCursor: data.rowNextCursor,
            };
          }

          if (isNodeHistory) {
            return {
              ...current,
              nodeEvents: [...(current.nodeEvents ?? []), ...data.nodeEvents],
              nodeNextCursor: data.nodeNextCursor,
            };
          }

          return {
            ...current,
            events: [...current.events, ...data.events],
            nextCursor: data.nextCursor,
          };
        });
      })
      .catch((error: unknown) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryError(error instanceof Error ? error.message : "Activity history could not load.");
      })
      .finally(() => {
        if (!isCurrentHistoryRequest()) return;
        setIsHistoryLoadingMore(false);
      });
  }, [activityFilters, estimateId, historyData, inspector, isHistoryLoadingMore, projectId]);
  const buildProposalPreview = useCallback((scope: ProposalExportPreviewScope = proposalPreviewScope) => {
    if (!resolvedProposalExportMetadata) return null;

    // The preview reflects the user's rate/formula choices so its grand total matches the file;
    // audience stays client-safe in the preview (the real audience is server-resolved on download).
    const model = buildProposalExportModel({
      metadata: resolvedProposalExportMetadata,
      nodes: materializeEditableEstimateTree(estimateTree, editableRows),
      settings: proposalPreviewModelSettings(proposalExportSettings),
    });
    setProposalPreviewModel(model);
    setProposalPreviewSignature(getProposalPreviewSignature(scope));
    return model;
  }, [editableRows, estimateTree, getProposalPreviewSignature, proposalExportSettings, proposalPreviewScope, resolvedProposalExportMetadata]);
  const changeProposalPreviewScope = useCallback((scope: ProposalExportPreviewScope) => {
    setProposalPreviewScope(scope);
    setProposalDownloadError(null);
    if (isProposalPreviewOpen) buildProposalPreview(scope);
  }, [buildProposalPreview, isProposalPreviewOpen]);
  const changeProposalExportSettings = useCallback((next: ProposalExportUserSettings) => {
    // Settings changes mark the preview stale (the signature includes settings); the user
    // refreshes to rebuild — matching the existing stale-then-refresh pattern (avoids jank).
    setProposalExportSettings(next);
    setProposalDownloadError(null);
  }, []);
  const openProposalPreview = useCallback(() => {
    // Capture the opener so focus returns to it when the dialog closes (F-06/P1-T3),
    // mirroring inspectorOpenerRef / rowDetailsOpenerRef.
    proposalPreviewOpenerRef.current = (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null);
    const model = buildProposalPreview();
    if (model) setIsProposalPreviewOpen(true);
  }, [buildProposalPreview]);
  const closeProposalPreview = useCallback(() => {
    setIsProposalPreviewOpen(false);
    setProposalDownloadError(null);
    window.requestAnimationFrame(() => proposalPreviewOpenerRef.current?.focus());
  }, []);
  const refreshProposalPreview = useCallback(() => {
    setProposalDownloadError(null);
    buildProposalPreview();
  }, [buildProposalPreview]);
  // F-05 (P1-T1): fetch-then-blob download. A bare <a href> saved the route's JSON
  // error body (413/404/500/429/401) to disk under the .xlsx name; here we inspect
  // response.ok + content-type, blob only on success, and surface the route's {error}
  // inline instead of handing the user a corrupt file.
  const downloadProposalExport = useCallback(async () => {
    if (!proposalDownloadHref) return;
    setIsDownloadingProposal(true);
    setProposalDownloadError(null);
    try {
      const response = await fetch(proposalDownloadHref);
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes(PROPOSAL_XLSX_CONTENT_TYPE)) {
        let message = "We couldn't generate the spreadsheet. Please try again.";
        try {
          const body = await response.json();
          if (body && typeof body.error === "string" && body.error.trim()) message = body.error;
        } catch {
          /* non-JSON error body — keep the friendly default */
        }
        setProposalDownloadError(message);
        return;
      }
      const blob = await response.blob();
      const filename = readContentDispositionFilename(response.headers.get("content-disposition")) ?? "proposal.xlsx";
      triggerBlobDownload(blob, filename);
    } catch {
      setProposalDownloadError("We couldn't reach the export service. Check your connection and try again.");
    } finally {
      setIsDownloadingProposal(false);
    }
  }, [proposalDownloadHref]);
  const proposalPreviewScopeControls = hasMultiplePersistedTabs
    ? {
        selectedScope: proposalPreviewScope,
        activeTabName: activeProposalExportTabName,
        tabCount: persistedTabs.length,
        onScopeChange: changeProposalPreviewScope,
      }
    : undefined;
  const isProposalPreviewStale = Boolean(proposalPreviewModel && proposalPreviewSignature !== currentProposalPreviewSignature);
  // Disable download for a genuinely empty export. For multi-tab all-tabs scope the
  // preview is built from the active tab only, so other tabs may still carry rows —
  // keep that case enabled and let the route decide.
  const isProposalExportEmpty =
    (proposalPreviewModel?.proposalRows.length ?? 0) === 0 &&
    !(hasMultiplePersistedTabs && proposalPreviewScope === "all-tabs");
  useEffect(() => {
    if (!inspectorScopeKey) return;

    if (!projectId || !estimateId) return;

    let isActive = true;
    const requestScopeKey = inspectorScopeKey;
    const isRowHistory = requestScopeKey.startsWith("row:");
    const isNodeHistory = requestScopeKey.startsWith("node:");
    const rowId = isRowHistory ? requestScopeKey.slice("row:".length) : undefined;
    const [nodeId, nodeDescendantMode] = isNodeHistory ? requestScopeKey.slice("node:".length).split(":") : [];
    const requestGeneration = historyRequestGenerationRef.current;
    const isCurrentHistoryRequest = () => isActive && inspectorScopeRef.current === requestScopeKey && historyRequestGenerationRef.current === requestGeneration;
    fetchEstimateSheetVersionControl({
      projectId,
      estimateId,
      rowId,
      nodeId,
      includeDescendants: isNodeHistory ? nodeDescendantMode === "desc" : undefined,
      eventLimit: 50,
      ...getActivityFilterInput(activityFilters),
      scope: isRowHistory ? "row" : isNodeHistory ? "node" : "sheet",
    })
      .then((data) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryData(data);
      })
      .catch((error: unknown) => {
        if (!isCurrentHistoryRequest()) return;
        setHistoryError(error instanceof Error ? error.message : "Activity history could not load.");
      })
      .finally(() => {
        if (isCurrentHistoryRequest()) setIsHistoryLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activityFilterKey, activityFilters, estimateId, historyReloadToken, inspectorScopeKey, projectId]);

  useEffect(() => {
    inspectorScopeRef.current = inspectorScopeKey;
  }, [inspectorScopeKey]);

  useEffect(() => {
    if (!inspector) return;

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeInspector();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeInspector, inspector]);

  useEffect(() => {
    if (!rowDetails) return;

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeRowDetails();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeRowDetails, rowDetails]);

  useEffect(() => {
    dispatchProjectTotalChange(projectTotal);
  }, [projectTotal]);

  useEffect(() => {
    if (!estimateId || activeSelectedNodeId === resolvedSelectedNodeId) return;
    setSelectedNodeId(resolvedSelectedNodeId);
  }, [activeSelectedNodeId, estimateId, resolvedSelectedNodeId, setSelectedNodeId]);

  useEffect(() => {
    if (!dataTabId) return;
    syncActiveTabRouteUrl(resolvedSelectedNodeId);
  }, [dataTabId, resolvedSelectedNodeId, syncActiveTabRouteUrl]);

  const setEstimateTree = useCallback((updater: (current: EstimateTreeNode[]) => EstimateTreeNode[]) => {
    skipEditableRowsSyncRef.current += 1;
    return setEstimateTreeData(updater);
  }, [setEstimateTreeData]);

  const restoreEstimateState = useCallback((previousTree: EstimateTreeNode[], previousRows: Record<string, EditableRowValue>, expectedRevision?: number) => {
    const didRestoreTree = restoreEstimateTree(previousTree, expectedRevision);
    if (!didRestoreTree) return;
    skipEditableRowsSyncRef.current += 1;
    setEditableRows(previousRows);
  }, [restoreEstimateTree]);

  useEffect(() => {
    if (saveState === "dirty" || saveState === "saving") return;
    if (skipEditableRowsSyncRef.current > 0) {
      skipEditableRowsSyncRef.current -= 1;
      return;
    }
    queueMicrotask(() => {
      const nextRows = collectEditableRows(estimateTree);
      const activeExpressRowId = getActiveExpressEditorRowId();
      setEditableRows((currentRows) => {
        if (!activeExpressRowId || !currentRows[activeExpressRowId]) return nextRows;
        return {
          ...nextRows,
          [activeExpressRowId]: currentRows[activeExpressRowId],
        };
      });
    });
  }, [estimateTree, saveState]);

  useEffect(() => {
    if (!pendingFocusRowId) return;
    let attempts = 0;
    let frameId = 0;

    function tryFocus() {
      const focusTarget =
        document.querySelector<HTMLInputElement>(`[data-estimate-row-id="${pendingFocusRowId}"] [data-express-field="name"]`) ??
        document.querySelector<HTMLInputElement>(`[data-estimate-row-id="${pendingFocusRowId}"][data-estimate-cell-index="0"]`);
      if (focusTarget) {
        focusTarget.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
        focusTarget.focus();
        focusTarget.select();
        setPendingFocusRowId("");
        return;
      }

      attempts += 1;
      if (attempts < 5) frameId = window.requestAnimationFrame(tryFocus);
      else setPendingFocusRowId("");
    }

    frameId = window.requestAnimationFrame(tryFocus);
    return () => window.cancelAnimationFrame(frameId);
  }, [pendingFocusRowId]);

  const commitRowItemUpdate = useStableCallback((rowItemId: string, values: Partial<EditableRowValue>) => {
    if (!projectId || !estimateId) return;
    const previousTree = estimateTree;
    const previousRows = collectEditableRows(estimateTree);
    const rollbackRevision = getEstimateTreeRevision();
    const currentRowItem = findEstimateRowItem(estimateTree, rowItemId);
    const currentEditableRow = editableRows[rowItemId] ?? previousRows[rowItemId];
    const nextEditableRow: EditableRowValue = {
      name: currentEditableRow?.name ?? "",
      description: currentEditableRow?.description ?? "",
      supplier: currentEditableRow?.supplier ?? "",
      unit: currentEditableRow?.unit ?? "unit",
      unitCost: currentEditableRow?.unitCost ?? "0",
      imageUrl: currentEditableRow?.imageUrl ?? "",
      sourceUrl: currentEditableRow?.sourceUrl ?? "",
      quantity: currentEditableRow?.quantity ?? "0",
      contingencyMode: currentEditableRow?.contingencyMode ?? "contingency",
      contingencyPercentage: currentEditableRow?.contingencyPercentage ?? "0",
      miscCost: currentEditableRow?.miscCost ?? "0",
      ...values,
    };
    const expressFieldNames = ["name", "description", "supplier", "unit", "unitCost", "imageUrl", "sourceUrl"].filter((fieldName) => values[fieldName as keyof EditableRowValue] !== undefined);
    if (expressFieldNames.length > 0) {
      recordExpressComponentEvent("save_requested", { projectId, estimateId, rowId: rowItemId, fieldNames: expressFieldNames });
    }
    const sourceSnapshotPatch = values.imageUrl !== undefined || values.sourceUrl !== undefined
      ? {
          ...(values.imageUrl !== undefined ? { imageUrl: values.imageUrl.trim() || null } : {}),
          ...(values.sourceUrl !== undefined ? { sourceUrl: values.sourceUrl.trim() || null } : {}),
        }
      : undefined;
    const shouldPromoteLegacyBlankToExpress = Boolean(currentRowItem && isBlankEstimateRowItem(currentRowItem));

    updateRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      ...(values.name !== undefined ? { material: values.name } : {}),
      ...(values.description !== undefined ? { description: values.description } : {}),
      ...(values.supplier !== undefined ? { supplier: values.supplier } : {}),
      ...(values.unit !== undefined ? { unit: values.unit } : {}),
      ...(values.unitCost !== undefined ? { unitCost: parseNonNegativeEditableNumber(values.unitCost) } : {}),
      ...(sourceSnapshotPatch !== undefined ? { sourceSnapshot: sourceSnapshotPatch } : {}),
      ...(values.quantity !== undefined ? { quantity: parseNonNegativeEditableNumber(values.quantity) } : {}),
      ...(values.contingencyPercentage !== undefined || values.contingencyMode !== undefined ? { contingencyPercentage: parseEditableContingencyPercentage(nextEditableRow) } : {}),
      ...(values.miscCost !== undefined ? { miscCost: parseNonNegativeEditableNumber(values.miscCost) } : {}),
      ...(shouldPromoteLegacyBlankToExpress ? {
        metadata: withExpressComponentMetadata(currentRowItem?.metadata, {
          id: rowItemId,
          createdFrom: "legacy-blank-row-inline-edit",
          sourceLabel: "Express component",
          createdAt: new Date().toISOString(),
        }),
      } : {}),
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      onSuccess: () => refetchProjectComponentProjection(),
    });
  });

  const updateRowItem = useStableCallback((rowItemId: string, values: Partial<EditableRowValue>) => {
    const pendingExpressDraft = expressInsertDraftsRef.current[rowItemId];
    if (pendingExpressDraft) {
      setExpressInsertDrafts((current) => {
        const draft = current[rowItemId];
        if (!draft) return current;
        return {
          ...current,
          [rowItemId]: {
            ...draft,
            bufferedPatch: {
              ...(draft.bufferedPatch ?? {}),
              ...values,
            },
          },
        };
      });
      return;
    }

    commitRowItemUpdate(rowItemId, values);
  });

  const handleExpressInsertSuccess = useStableCallback((rowItemId: string) => {
    const draft = expressInsertDraftsRef.current[rowItemId];
    const bufferedPatch = draft?.bufferedPatch;
    setExpressInsertDrafts((current) => {
      const next = { ...current };
      delete next[rowItemId];
      return next;
    });
    recordExpressComponentEvent("insert_succeeded", { projectId, estimateId, rowId: rowItemId });
    refetchProjectComponentProjection();
    if (bufferedPatch && Object.keys(bufferedPatch).length > 0) {
      queueMicrotask(() => commitRowItemUpdate(rowItemId, bufferedPatch));
    }
  });

  const handleExpressInsertError = useStableCallback((rowItemId: string, error: Error) => {
    setExpressInsertDrafts((current) => {
      const draft = current[rowItemId];
      if (!draft) return current;
      return {
        ...current,
        [rowItemId]: {
          ...draft,
          status: "failed",
          errorMessage: error.message,
        },
      };
    });
    recordExpressComponentEvent("insert_failed", { projectId, estimateId, rowId: rowItemId, reason: error.message });
  });

  const retryExpressDraft = useStableCallback((rowItemId: string) => {
    if (!projectId || !estimateId) return;
    const draft = expressInsertDraftsRef.current[rowItemId];
    if (!draft) return;
    setExpressInsertDrafts((current) => {
      const currentDraft = current[rowItemId];
      if (!currentDraft) return current;
      return {
        ...current,
        [rowItemId]: {
          ...currentDraft,
          status: "creating",
          errorMessage: undefined,
        },
      };
    });
    recordExpressComponentEvent("insert_requested", { projectId, estimateId, nodeId: draft.targetNodeId, rowId: rowItemId, retry: true });
    insertRow({
      projectId,
      estimateId,
      targetNodeId: draft.targetNodeId,
      rowId: rowItemId,
      libraryItem: draft.libraryItem,
      mutationId: draft.mutationId,
      rollback: () => undefined,
      onSuccess: () => handleExpressInsertSuccess(rowItemId),
      onError: (error) => handleExpressInsertError(rowItemId, error),
    });
  });

  const deleteExpressDraft = useStableCallback((rowItemId: string) => {
    setEstimateTree((current) => removeEstimateRowItem(current, rowItemId));
    setEditableRows((current) => {
      const next = { ...current };
      delete next[rowItemId];
      return next;
    });
    setExpressInsertDrafts((current) => {
      const next = { ...current };
      delete next[rowItemId];
      return next;
    });
    recordExpressComponentEvent("draft_deleted", { projectId, estimateId, rowId: rowItemId });
  });

  const commitLibraryItemInsert = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
    const targetNode = findEstimateNode(estimateTree, targetNodeId);
    if (!targetNode) return false;

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const newItem = cloneLibraryItemForEstimate(libraryItem);
    const isExpressInsert = isExpressComponentRow(newItem);
    const mutationId = isExpressInsert ? createEstimateRowItemId() : undefined;
    setPendingFocusRowId(newItem.id);
    if (isExpressInsert && mutationId) {
      setExpressInsertDrafts((current) => ({
        ...current,
        [newItem.id]: {
          targetNodeId,
          libraryItem,
          mutationId,
          status: "creating",
        },
      }));
    }
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          if (areaNode.id === targetNodeId) {
            return { ...areaNode, estimateRowItems: [...(areaNode.estimateRowItems ?? []), newItem] };
          }
          return { ...areaNode, children: areaNode.children?.map(visit) };
        }
        return visit(node);
      }),
    );
    setEditableRows((current) => ({ ...current, [newItem.id]: getInitialEditableRow(newItem) }));

    if (projectId && estimateId) {
      insertRow({
        projectId,
        estimateId,
        targetNodeId,
        rowId: newItem.id,
        libraryItem,
        ...(mutationId ? { mutationId } : {}),
        rollback: isExpressInsert ? () => undefined : () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
        onSuccess: isExpressInsert ? () => handleExpressInsertSuccess(newItem.id) : undefined,
        onError: isExpressInsert ? (error) => handleExpressInsertError(newItem.id, error) : undefined,
      });
    }
    return true;
  });

  const insertLibraryItem = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
    if (!shouldGateLibraryCommit(libraryItem)) return commitLibraryItemInsert(targetNodeId, libraryItem);
    const gate = getLibraryCommitTrustGate(libraryItem, { action: "insert" });
    if (gate.severity === "pass") return commitLibraryItemInsert(targetNodeId, libraryItem);
    recordLibraryEvent(gate.severity === "block" ? "trust_insert_gate_blocked" : "trust_insert_gate_warned", {
      workspaceId,
      projectId,
      estimateId,
      itemId: libraryItem.id,
      action: libraryCommitEventAction("insert"),
      reason: gate.reasons.map((reason) => reason.id).join(","),
    });
    setPendingLibraryCommitGate({
      id: `${libraryItem.id}:insert:${targetNodeId}:${Date.now()}`,
      action: "insert",
      targetNodeId,
      libraryItem,
      gate,
    });
    return true;
  });

  const insertIntoSelectedNode = useCallback(
    (libraryItem: EstimateRowItem) => {
      if (!insertTargetNodeId) return false;
      return insertLibraryItem(insertTargetNodeId, libraryItem);
    },
    [insertLibraryItem, insertTargetNodeId],
  );

  const insertTemplateIntoParent = useStableCallback(
    (targetParentNodeId: string, template: EstimateTemplate) => {
      // P6: a template inserts as a child of ANY existing node (no group gate).
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticTemplateNodes = cloneTemplateNodesForEstimate(template.nodes);
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        insertEstimateTemplateIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateId: template.id,
          targetTabId: dataTabId,
        })
          .then((result) => {
            // INS-1: only reconcile when no later optimistic update superseded
            // ours, so a concurrent insert's stale snapshot can't clobber newer
            // state. INS-4: setEstimateTree bumps the editable-rows skip ref so
            // the server tree doesn't overwrite an in-flight cell edit.
            if (getEstimateTreeRevision() === nextRevision) setEstimateTree(() => result.tree);
          })
          .catch((error: unknown) => {
            console.error("[estimate] template insert failed", error);
            toast({ tone: "error", message: "Couldn't insert the template. Try again." });
            restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision);
          });
      }

      return true;
    },
  );

  // INS-1: insert one or many templates under a group through the batched
  // server action — one optimistic update + one round-trip — so a category
  // drop can't lose templates to a concurrent-insert tree-read race. A single
  // template still routes through the efficient single-insert path.
  const insertTemplatesIntoParent = useStableCallback(
    (targetParentNodeId: string, templates: EstimateTemplate[]) => {
      if (templates.length === 0) return false;
      if (templates.length === 1) return insertTemplateIntoParent(targetParentNodeId, templates[0]);

      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticTemplateNodes = cloneTemplateNodesForEstimate(templates.flatMap((template) => template.nodes));
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        insertEstimateTemplatesIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateIds: templates.map((template) => template.id),
          targetTabId: dataTabId,
        })
          .then((result) => {
            if (getEstimateTreeRevision() === nextRevision) setEstimateTree(() => result.tree);
          })
          .catch((error: unknown) => {
            console.error("[estimate] template batch insert failed", error);
            toast({ tone: "error", message: "Couldn't insert the templates. Try again." });
            restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision);
          });
      }

      return true;
    },
  );

  const insertTemplatesIntoParentById = useCallback(
    (targetParentNodeId: string, templateIds: string[]) => {
      const templates = templateIds
        .map((templateId) => templateById.get(templateId))
        .filter((template): template is EstimateTemplate => Boolean(template));
      if (templates.length === 0) return false;
      return insertTemplatesIntoParent(targetParentNodeId, templates);
    },
    [insertTemplatesIntoParent, templateById],
  );

  const insertTemplateIntoSelectedGroup = useCallback(
    (template: EstimateTemplate) => {
      // P6: insert directly into the selected node (any kind), no area-wrap.
      if (!templateTargetParentNode) return false;
      return insertTemplateIntoParent(templateTargetParentNode.id, template);
    },
    [insertTemplateIntoParent, templateTargetParentNode],
  );

  // U2: insert a project-derived source (whole tab / node subtree) as a child of
  // a target node. Non-optimistic — the server copies the subtree via the
  // hardened RPC and returns the refreshed tree. P6: any node is a valid target
  // (no group gate); the relaxed insert_estimate_subtree RPC accepts it.
  const insertProjectSourceIntoParentById = useStableCallback(
    async (targetParentNodeId: string, source: { projectId: string; estimateId: string; tabId: string; nodeId: string | null }) => {
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;
      if (!projectId || !estimateId) return false;

      try {
        const result = await insertProjectSourceIntoEstimate({
          targetProjectId: projectId,
          targetEstimateId: estimateId,
          targetParentNodeId,
          source,
          targetTabId: dataTabId,
        });
        // This insert is NON-optimistic: nothing is added to the tree before
        // the RPC, so the server tree is authoritative and applied directly.
        // INS-4: setEstimateTree bumps the editable-rows skip ref so applying
        // the tree doesn't clobber an in-flight cell edit. Bulk source inserts
        // are serialized by the sidebar, so every returned tree builds on the
        // previous confirmed insert.
        setEstimateTree(() => result.tree);
        return true;
      } catch (error: unknown) {
        console.error("[estimate] project source insert failed", error);
        toast({ tone: "error", message: "Couldn't insert the project source. Try again." });
        return false;
      }
    },
  );

  const insertProjectSourceIntoSelectedGroup = useCallback(
    (source: ProjectSourceInsertTarget) => {
      if (!templateTargetParentNode) return false;
      return insertProjectSourceIntoParentById(templateTargetParentNode.id, {
        projectId: source.projectId,
        estimateId: source.estimateId,
        tabId: source.tabId,
        nodeId: source.kind === "project-node" ? source.nodeId : null,
      });
    },
    [insertProjectSourceIntoParentById, templateTargetParentNode],
  );

  // Inserts ONE node of a template (any node inside it) with its subtree. Same
  // optimistic shape as whole-template insertion; the server recreates the
  // subtree through the history-aware node/row RPCs. P6: any node is a valid
  // target (no group gate).
  const insertTemplateNodeIntoParent = useStableCallback(
    (targetParentNodeId: string, template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticTemplateNodes = cloneTemplateNodesForEstimate([templateNode]);
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => appendTemplateNodesToParent(current, targetParentNodeId, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(targetParentNodeId);

      if (projectId && estimateId) {
        insertEstimateTemplateNodeIntoEstimate({
          projectId,
          estimateId,
          targetParentNodeId,
          templateId: template.id,
          templateNodeId: templateNode.id,
          targetTabId: dataTabId,
        })
          .then((result) => {
            // INS-1/INS-4: reconcile only when our optimistic revision still
            // stands, and via setEstimateTree so in-flight edits survive.
            if (getEstimateTreeRevision() === nextRevision) setEstimateTree(() => result.tree);
          })
          .catch((error: unknown) => {
            console.error("[estimate] template node insert failed", error);
            toast({ tone: "error", message: "Couldn't insert the template. Try again." });
            restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision);
          });
      }

      return true;
    },
  );

  const insertTemplateNodeIntoParentById = useCallback(
    (targetParentNodeId: string, templateId: string, templateNodeId: string) => {
      const template = templateById.get(templateId);
      if (!template) return false;
      const templateNode = findEstimateNode(template.nodes, templateNodeId);
      if (!templateNode) return false;
      return insertTemplateNodeIntoParent(targetParentNodeId, template, templateNode);
    },
    [insertTemplateNodeIntoParent, templateById],
  );

  const insertTemplateNodeIntoSelectedGroup = useCallback(
    (template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      // P6: insert directly into the selected node (any kind), no area-wrap.
      if (!templateTargetParentNode) return false;
      return insertTemplateNodeIntoParent(templateTargetParentNode.id, template, templateNode);
    },
    [insertTemplateNodeIntoParent, templateTargetParentNode],
  );

  const insertBlankRow = useCallback(
    (targetNodeId: string) => {
      recordExpressComponentEvent("insert_requested", { projectId, estimateId, nodeId: targetNodeId });
      insertLibraryItem(targetNodeId, createExpressEstimateRowTemplate());
    },
    [estimateId, insertLibraryItem, projectId],
  );

  useEffect(() => {
    function handleCommandPaletteShortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented) return;
      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = activeElement?.tagName;
      const isTypingTarget = activeElement?.isContentEditable || activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
      const hasBlockingDialog = Boolean(document.querySelector("[role='dialog'], [role='alertdialog']"));

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !hasBlockingDialog) {
        event.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      if (event.key === "/" && !isTypingTarget && !hasBlockingDialog) {
        const sheetHasFocus = activeElement?.closest?.("[data-estimate-center-column='sheet']") || activeElement === document.body;
        if (!sheetHasFocus) return;
        event.preventDefault();
        setShowCommandPalette(true);
      }
    }

    window.addEventListener("keydown", handleCommandPaletteShortcut);
    return () => window.removeEventListener("keydown", handleCommandPaletteShortcut);
  }, []);

  useEffect(() => {
    function handleSidebarAdd(event: Event) {
      const customEvent = event as CustomEvent<EstimateRowItem>;
      if (customEvent.detail && insertTargetNodeId) insertLibraryItem(insertTargetNodeId, customEvent.detail);
    }
    window.addEventListener("archestimator:add-library-item", handleSidebarAdd);
    return () => window.removeEventListener("archestimator:add-library-item", handleSidebarAdd);
  }, [insertLibraryItem, insertTargetNodeId]);

  // Template drops on the left estimate tree arrive here: that panel can target
  // ANY node row, but the optimistic insert + rollback flow lives in this
  // component. Category drags carry several template ids; dragging a node from
  // inside a template carries that node's id. P6: every target inserts directly
  // (no area-wrap branch).
  useEffect(() => {
    function handleInsertTemplateEvent(event: Event) {
      const detail = (event as CustomEvent<Partial<InsertEstimateTemplateEventDetail> & { targetParentNodeId?: string; templateId?: string; templateNodeId?: string; templateIds?: unknown }>).detail;
      if (typeof detail?.targetParentNodeId !== "string") return;
      if (typeof detail.templateId === "string" && typeof detail.templateNodeId === "string") {
        insertTemplateNodeIntoParentById(detail.targetParentNodeId, detail.templateId, detail.templateNodeId);
        return;
      }
      if (!Array.isArray(detail.templateIds)) return;
      const templateIds = detail.templateIds.filter((templateId): templateId is string => typeof templateId === "string" && templateId.length > 0);
      if (templateIds.length > 0) insertTemplatesIntoParentById(detail.targetParentNodeId, templateIds);
    }
    window.addEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
    return () => window.removeEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
  }, [insertTemplatesIntoParentById, insertTemplateNodeIntoParentById]);

  // U2: a project source dropped onto a group row hands the insert over here (the
  // sheet owns the tree + the action), mirroring the template-drop event flow.
  useEffect(() => {
    function handleInsertProjectSourceEvent(event: Event) {
      const detail = (event as CustomEvent<InsertProjectSourceEventDetail>).detail;
      if (!detail || typeof detail.targetParentNodeId !== "string" || !detail.source) return;
      insertProjectSourceIntoParentById(detail.targetParentNodeId, detail.source);
    }
    window.addEventListener(INSERT_PROJECT_SOURCE_EVENT, handleInsertProjectSourceEvent);
    return () => window.removeEventListener(INSERT_PROJECT_SOURCE_EVENT, handleInsertProjectSourceEvent);
  }, [insertProjectSourceIntoParentById]);

  const commitReplaceRowItem = useStableCallback((rowItemId: string, libraryItem: EstimateRowItem) => {
    const previousTree = estimateTree;
    const previousRows = editableRows;
    const editableReplacement = previousRows[rowItemId];
    const replacementLibraryItem = applyEditableValuesToLibraryItem(libraryItem, editableReplacement);
    const replacementItem = replaceRowItemWithLibraryItem(rowItemId, replacementLibraryItem);
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          return {
            ...areaNode,
            estimateRowItems: areaNode.estimateRowItems?.map((item) =>
              item.id === rowItemId ? replacementItem : item,
            ),
            children: areaNode.children?.map(visit),
          };
        }
        return visit(node);
      }),
    );
    const shouldResetInlineEditor = isBlankEstimateRowItem(replacementItem) || isExpressComponentRow(replacementItem);
    setEditableRows((current) => ({
      ...current,
      [rowItemId]: shouldResetInlineEditor
        ? getInitialEditableRow(replacementItem)
        : current[rowItemId] ?? previousRows[rowItemId] ?? getInitialEditableRow(replacementItem),
    }));
    if (projectId && estimateId) {
      replaceRow({
        projectId,
        estimateId,
        rowId: rowItemId,
        libraryItem: replacementLibraryItem,
        rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
        onSuccess: () => refetchProjectComponentProjection(),
        onError: () => toast({ tone: "error", message: "Couldn't replace the component. Try again." }),
      });
    }
    return true;
  });

  const replaceRowItem = useStableCallback((rowItemId: string, libraryItem: EstimateRowItem) => {
    if (!shouldGateLibraryCommit(libraryItem)) return commitReplaceRowItem(rowItemId, libraryItem);
    const existingRow = findEstimateRowItem(estimateTree, rowItemId);
    const editableReplacement = editableRows[rowItemId];
    const replacementLibraryItem = applyEditableValuesToLibraryItem(libraryItem, editableReplacement);
    const gate = getLibraryCommitTrustGate(replacementLibraryItem, {
      action: "replace",
      existingRow,
    });
    if (gate.severity === "pass") return commitReplaceRowItem(rowItemId, libraryItem);
    recordLibraryEvent(gate.severity === "block" ? "trust_insert_gate_blocked" : "trust_insert_gate_warned", {
      workspaceId,
      projectId,
      estimateId,
      itemId: libraryItem.id,
      rowId: rowItemId,
      action: libraryCommitEventAction("replace"),
      reason: gate.reasons.map((reason) => reason.id).join(","),
    });
    setPendingLibraryCommitGate({
      id: `${libraryItem.id}:replace:${rowItemId}:${Date.now()}`,
      action: "replace",
      rowItemId,
      libraryItem,
      existingRow,
      gate,
    });
    return true;
  });

  const cancelPendingLibraryCommit = useStableCallback(() => {
    if (pendingLibraryCommitGate) {
      recordLibraryEvent("trust_insert_gate_blocked", {
        workspaceId,
        projectId,
        estimateId,
        itemId: pendingLibraryCommitGate.libraryItem.id,
        rowId: pendingLibraryCommitGate.rowItemId,
        action: libraryCommitEventAction(pendingLibraryCommitGate.action),
        reason: "cancelled",
      });
    }
    setPendingLibraryCommitGate(null);
  });

  const confirmPendingLibraryCommit = useStableCallback(() => {
    if (!pendingLibraryCommitGate || pendingLibraryCommitGate.gate.severity === "block") return;
    const { action, targetNodeId, rowItemId, libraryItem } = pendingLibraryCommitGate;
    setPendingLibraryCommitGate(null);
    recordLibraryEvent("trust_insert_gate_confirmed", {
      workspaceId,
      projectId,
      estimateId,
      itemId: libraryItem.id,
      rowId: rowItemId,
      action: libraryCommitEventAction(action),
      reason: pendingLibraryCommitGate.gate.reasons.map((reason) => reason.id).join(","),
    });
    if (action === "insert" && targetNodeId) {
      commitLibraryItemInsert(targetNodeId, libraryItem);
      return;
    }
    if (action === "replace" && rowItemId) {
      commitReplaceRowItem(rowItemId, libraryItem);
    }
  });

  const clearRowComponent = useStableCallback((rowItemId: string) => {
    const currentRowItem = findEstimateRowItem(estimateTree, rowItemId);
    if (!currentRowItem || !isExpressComponentRow(currentRowItem)) {
      replaceRowItem(rowItemId, createBlankEstimateRowTemplate());
      return;
    }

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const editableReplacement = previousRows[rowItemId];
    const blankLibraryItem = applyEditableValuesToLibraryItem(createBlankEstimateRowTemplate(), editableReplacement);
    const replacementItem = replaceRowItemWithLibraryItem(rowItemId, blankLibraryItem);
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          return {
            ...areaNode,
            estimateRowItems: areaNode.estimateRowItems?.map((item) =>
              item.id === rowItemId ? replacementItem : item,
            ),
            children: areaNode.children?.map(visit),
          };
        }
        return visit(node);
      }),
    );
    setEditableRows((current) => ({
      ...current,
      [rowItemId]: getInitialEditableRow(replacementItem),
    }));
    if (projectId && estimateId) {
      updateRow({
        projectId,
        estimateId,
        rowId: rowItemId,
        material: replacementItem.material,
        description: replacementItem.description,
        supplier: replacementItem.supplier,
        unit: replacementItem.unit,
        unitCost: replacementItem.itemCost,
        quantity: replacementItem.quantity,
        contingencyPercentage: replacementItem.contingencyPercentage ?? 0,
        miscCost: replacementItem.miscCost,
        sourceSnapshot: null,
        metadata: getClearedEstimateRowMetadata(currentRowItem.metadata),
        rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
        onSuccess: () => refetchProjectComponentProjection(),
      });
    }
  });

  const requestProjectSpecific = useStableCallback((rowItemId: string) => {
    const rowItem = findEstimateRowItem(estimateTree, rowItemId);
    if (!rowItem || !canMakeProjectSpecific(rowItem)) return;
    setProjectSpecificRowId(rowItemId);
  });

  const promoteRowToLibrary = useStableCallback((rowItemId: string) => {
    if (!projectId || !estimateId) return;
    const rowItem = findEstimateRowItem(estimateTree, rowItemId);
    if (!rowItem || !canPromoteEstimateRowToLibrary(rowItem)) {
      toast({ tone: "error", message: "This row is not eligible to promote to the library." });
      return;
    }
    if (saveState === "dirty" || saveState === "saving") {
      toast({ tone: "error", message: "Finish saving row edits before promoting this component." });
      return;
    }

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const rollbackRevision = getEstimateTreeRevision();
    setPromotingRowId(rowItemId);
    promoteRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      onSuccess: (result) => {
        setEstimateTree((current) =>
          current.map((node) => {
            function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
              return {
                ...areaNode,
                estimateRowItems: areaNode.estimateRowItems?.map((item) => {
                  if (item.id !== rowItemId) return item;
                  const metadata = readEstimateRowMetadata(item.metadata);
                  delete metadata.expressComponent;
                  delete metadata.projectComponentProjection;
                  return {
                    ...item,
                    source: "library",
                    sourceLibraryItemId: result.itemId,
                    metadata,
                    linkState: "linked-clean",
                  };
                }),
                children: areaNode.children?.map(visit),
              };
            }
            return visit(node);
          }),
        );
        setPromotingRowId(null);
        refetchProjectComponentProjection();
        handleLibraryDataChanged();
        toast({ tone: "success", message: `${rowItem.material || "Component"} promoted to the workspace library.` });
      },
      onError: (error) => {
        setPromotingRowId(null);
        toast({ tone: "error", message: error.message || "Could not promote component." });
      },
    });
  });

  function confirmProjectSpecific() {
    if (!projectId || !estimateId || !projectSpecificRow) {
      setProjectSpecificRowId("");
      return;
    }

    const rowItemId = projectSpecificRow.item.id;
    const previousTree = estimateTree;
    const previousRows = editableRows;
    const rollbackRevision = getEstimateTreeRevision();
    detachRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      onSuccess: () => refetchProjectComponentProjection(),
    });
    setProjectSpecificRowId("");
  }

  const moveRowComponent = useStableCallback((sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => {
    if (sourceRowItemId === targetRowItemId) return;
    if (isExpressComponentRow(movedItem)) {
      toast({ tone: "error", message: "Replace express components directly before moving them between rows." });
      return;
    }
    const sourceLocation = findEstimateRowItemLocation(estimateTree, sourceRowItemId);
    const targetLocation = findEstimateRowItemLocation(estimateTree, targetRowItemId);
    if (!sourceLocation || !targetLocation) return;

    const previousSourceEditableRow = editableRows[sourceRowItemId] ?? getInitialEditableRow(sourceLocation.item);
    const previousTargetEditableRow = editableRows[targetRowItemId] ?? getInitialEditableRow(targetLocation.item);
    const targetLibraryItem = applyEditableValuesToLibraryItem(movedItem, previousTargetEditableRow);
    const sourceBlankLibraryItem = applyEditableValuesToLibraryItem(createBlankEstimateRowTemplate(), previousSourceEditableRow);
    const targetReplacementItem = replaceRowItemWithLibraryItem(targetRowItemId, targetLibraryItem);
    const sourceReplacementItem = replaceRowItemWithLibraryItem(sourceRowItemId, sourceBlankLibraryItem);
    const replacements = new Map<string, EstimateRowItem>([
      [targetRowItemId, targetReplacementItem],
      [sourceRowItemId, sourceReplacementItem],
    ]);
    setEstimateTree((current) => replaceEstimateRowItemsInTree(current, replacements));
    setEditableRows((current) => ({
      ...current,
      [targetRowItemId]: current[targetRowItemId] ?? previousTargetEditableRow,
      [sourceRowItemId]: getInitialEditableRow(sourceReplacementItem),
    }));

    const restoreSourceRow = () => {
      setEstimateTree((current) => replaceEstimateRowItemsInTree(current, new Map([[sourceRowItemId, sourceLocation.item]])));
      setEditableRows((current) => ({
        ...current,
        [sourceRowItemId]: previousSourceEditableRow,
      }));
    };
    const restoreTargetRow = () => {
      setEstimateTree((current) => replaceEstimateRowItemsInTree(current, new Map([[targetRowItemId, targetLocation.item]])));
      setEditableRows((current) => ({
        ...current,
        [targetRowItemId]: previousTargetEditableRow,
      }));
    };
    const reportMoveError = () => toast({ tone: "error", message: "Couldn't move the component. Try again." });
    const applyMovedRowSuccess = (baseItem: EstimateRowItem) => (result: UpdateEstimateRowItemResult) => {
      const patch = estimateRowMutationResultToPatch(result);
      const nextItem = applyEstimateRowItemPatch(baseItem, patch);
      // The row mutation hook patches the query cache; the visible sheet also
      // keeps local tree state so partial move failures can reconcile row-by-row.
      setEstimateTree((current) => patchEstimateRowItemInTree(current, result.rowId, patch));
      setEditableRows((current) => ({ ...current, [result.rowId]: getInitialEditableRow(nextItem) }));
      refetchProjectComponentProjection();
    };

    if (projectId && estimateId) {
      replaceRow({
        projectId,
        estimateId,
        rowId: targetRowItemId,
        libraryItem: targetLibraryItem,
        rollback: restoreTargetRow,
        onSuccess: applyMovedRowSuccess(targetReplacementItem),
        onError: reportMoveError,
      });
      replaceRow({
        projectId,
        estimateId,
        rowId: sourceRowItemId,
        libraryItem: sourceBlankLibraryItem,
        rollback: restoreSourceRow,
        onSuccess: applyMovedRowSuccess(sourceReplacementItem),
        onError: reportMoveError,
      });
    }
  });

  const deleteRowItem = useStableCallback((rowItemId: string) => {
    const previousRowLocation = findEstimateRowItemLocation(estimateTree, rowItemId);
    const previousEditableRow = editableRows[rowItemId];
    setEstimateTree((current) => removeEstimateRowItem(current, rowItemId));
    setEditableRows((current) => {
      const remainingRows = { ...current };
      delete remainingRows[rowItemId];
      return remainingRows;
    });
    if (projectId && estimateId) {
      deleteRow({
        projectId,
        estimateId,
        rowId: rowItemId,
        rollback: () => {
          if (previousRowLocation) {
            setEstimateTree((current) => restoreEstimateRowItemAtLocation(current, previousRowLocation));
            setEditableRows((current) => ({ ...current, [rowItemId]: previousEditableRow ?? getInitialEditableRow(previousRowLocation.item) }));
          }
        },
        onSuccess: () => refetchProjectComponentProjection(),
        onError: () => toast({ tone: "error", message: "Couldn't delete the row. Try again." }),
      });
    }
  });

  function deleteSelectedRows() {
    bulkSelectedRowIds.forEach((rowItemId) => deleteRowItem(rowItemId));
    setBulkSelectedRowIds(new Set());
  }
  const isActiveTabTreeLoading = Boolean(dataTabId && tabTreeQuery.isFetching && estimateTree.length === 0);
  const activeTreeErrorMessage = activeTreeQuery.isError
    ? activeTreeQuery.error instanceof Error
      ? activeTreeQuery.error.message
      : "Could not load the estimate tree."
    : "";
  const canPreviewCurrentExport = Boolean(resolvedProposalExportMetadata);

  // Req 1 / D2: lift the "Activity" + "Preview Excel Export" triggers up to the
  // project chrome header (rendered by `EstimateHeaderActions`, a separate React
  // tree) while keeping the dialogs + their state here. Only the callbacks and the
  // export capability cross the boundary, via the shared store. `openActivity` is a
  // zero-arg wrapper that anchors the activity modal on the chrome button that was
  // clicked (falling back to <body> if focus has moved), preserving
  // `openActivityHistory`'s existing (opener) signature. `clear` on unmount is the
  // off-route gate so the chrome buttons disappear when the estimate page leaves.
  const registerEstimateHeaderActions = useEstimateHeaderActionsStore((state) => state.register);
  const clearEstimateHeaderActions = useEstimateHeaderActionsStore((state) => state.clear);
  useEffect(() => {
    registerEstimateHeaderActions({
      openActivity: () =>
        openActivityHistory(
          typeof document !== "undefined" && document.activeElement instanceof HTMLElement
            ? document.activeElement
            : (typeof document !== "undefined" ? document.body : (null as unknown as HTMLElement)),
        ),
      openProposalPreview,
      canPreviewExport: canPreviewCurrentExport,
    });
    return () => clearEstimateHeaderActions();
  }, [
    registerEstimateHeaderActions,
    clearEstimateHeaderActions,
    openActivityHistory,
    openProposalPreview,
    canPreviewCurrentExport,
  ]);

  return (
    <>
      {/* Mount-gate the code-split overlay on its open-state so its async chunk
          is fetched on first open, not on first paint. The component still
          self-guards on `open` (returns null when false) and resets its draft
          state on each open, so a fresh mount is behaviorally identical to the
          previous always-mounted-with-open=false render. */}
      {showCommandPalette ? (
        <CommandPalette
          open={showCommandPalette}
          items={shouldLoadLibraryLazily ? resolvedLibraryItems ?? EMPTY_ESTIMATE_ROW_ITEMS : libraryItems}
          canInsert={canInsertIntoSelectedNode}
          targetLabel={insertionTargetLabel}
          onClose={() => setShowCommandPalette(false)}
          onInsert={insertIntoSelectedNode}
        />
      ) : null}
      {pendingLibraryCommitGate ? (
        <Modal
          open
          title={pendingLibraryCommitGate.gate.title}
          description={pendingLibraryCommitGate.gate.summary}
          tone={pendingLibraryCommitGate.gate.severity === "block" ? "danger" : "warning"}
          size="sm"
          closeLabel="Cancel source review"
          onOpenChange={(open) => {
            if (!open) cancelPendingLibraryCommit();
          }}
          footer={(
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={cancelPendingLibraryCommit}>
                {pendingLibraryCommitGate.gate.cancelLabel}
              </Button>
              {pendingLibraryCommitGate.gate.severity !== "block" ? (
                <Button type="button" size="sm" onClick={confirmPendingLibraryCommit}>
                  {pendingLibraryCommitGate.gate.confirmLabel}
                </Button>
              ) : null}
            </div>
          )}
        >
          <div className="grid gap-3 text-[10px] leading-4">
            <div className="grid gap-1 rounded-xs border border-hairline bg-surfaceMuted p-2">
              <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">
                Incoming Library source
              </p>
              <p className="font-medium text-ink">
                {pendingLibraryCommitGate.libraryItem.name || pendingLibraryCommitGate.libraryItem.material}
              </p>
              <p className="text-tertiary">
                {pendingLibraryCommitGate.libraryItem.supplier || "No supplier"} · {pesoFormatter.format(pendingLibraryCommitGate.libraryItem.itemCost)} / {pendingLibraryCommitGate.libraryItem.unit}
              </p>
            </div>
            {pendingLibraryCommitGate.existingRow ? (
              <div className="grid gap-1 rounded-xs border border-hairline bg-white p-2">
                <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">
                  Current estimate row
                </p>
                <p className="font-medium text-ink">
                  {pendingLibraryCommitGate.existingRow.name || pendingLibraryCommitGate.existingRow.material}
                </p>
                <p className="text-tertiary">
                  {pendingLibraryCommitGate.existingRow.supplier || "No supplier"} · {pesoFormatter.format(pendingLibraryCommitGate.existingRow.itemCost)} / {pendingLibraryCommitGate.existingRow.unit}
                </p>
              </div>
            ) : null}
            <SourceTrustChips
              chips={pendingLibraryCommitGate.gate.reasons}
              ariaLabel="Library source review warnings"
              maxChips={6}
            />
            <ul className="grid gap-1">
              {pendingLibraryCommitGate.gate.reasons.map((reason) => (
                <li key={reason.id} className="rounded-xs border border-hairline bg-white px-2 py-1">
                  <span className="font-medium text-ink">{reason.label}</span>
                  <span className="text-tertiary"> · {reason.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      ) : null}
      {isProposalPreviewOpen ? (
        <ProposalExportPreviewDialog
          open={isProposalPreviewOpen}
          model={proposalPreviewModel}
          isStale={isProposalPreviewStale}
          onDownload={downloadProposalExport}
          isDownloading={isDownloadingProposal}
          downloadError={proposalDownloadError}
          canDownload={Boolean(proposalDownloadHref) && !isProposalExportEmpty}
          scopeControls={proposalPreviewScopeControls}
          exportSettings={proposalExportSettings}
          onExportSettingsChange={changeProposalExportSettings}
          onRefresh={refreshProposalPreview}
          onClose={closeProposalPreview}
        />
      ) : null}
      {inspector ? (
        <ActivityHistoryModal
          scope={inspector}
          scopeItems={activityScopeItems}
          selectedScopeItem={selectedActivityScopeItem}
          metadata={resolvedProposalExportMetadata}
          historyData={historyData}
          activityFilters={activityFilters}
          isHistoryLoading={isHistoryLoading}
          isHistoryLoadingMore={isHistoryLoadingMore}
          historyError={historyError}
          onActivityFiltersChange={replaceActivityFilters}
          onActivityFiltersReset={resetActivityFilters}
          onClose={closeInspector}
          onRetry={reloadVersionControl}
          onLoadMore={loadMoreVersionControl}
          onScopeSelect={selectActivityScope}
        />
      ) : null}
      {rowDetails ? (
        <RowDetailsModal
          row={selectedRowDetailsItem}
          tab={rowDetails.tab}
          projectId={projectId}
          estimateId={estimateId}
          onTabChange={setRowDetailsTab}
          onClose={closeRowDetails}
        />
      ) : null}
      {projectSpecificRow ? (
        // react-doctor-disable-next-line react-doctor/no-static-element-interactions -- Backdrop mouse dismissal is paired with dialog keyboard dismissal inside the row-details surface.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProjectSpecificRowId("");
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Make Project Component"
            className="w-[min(360px,calc(100vw-32px))] border border-hairline bg-white p-3 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-ink">Make Project Component</p>
                <p className="mt-1 text-[10px] leading-4 text-tertiary">
                  {projectSpecificRow.item.material} will keep its current row values and stop following library updates.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0" aria-label="Close Project Component dialog" onClick={() => setProjectSpecificRowId("")}>
                <X size={13} weight="regular" aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setProjectSpecificRowId("")}>Cancel</Button>
              <Button type="button" variant="primary" size="sm" onClick={confirmProjectSpecific}>Make Project Component</Button>
            </div>
          </section>
        </div>
      ) : null}
      <section
        id="estimate-sheet-center-column"
        className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", estimateSurfaceClass(surfaceVariant, "centerColumn"))}
        data-estimate-center-column="sheet"
        aria-label="Estimate tab content"
      >
        <EstimateSheetHeader
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          searchQuery={sheetSearchQuery}
          onSearchQueryChange={setSheetSearchQuery}
          groupMode={sheetGroupMode}
          onGroupModeChange={setSheetGroupMode}
          filterSlot={
            <FilterPopover
              trigger={<FunnelSimple size={12} weight="regular" aria-hidden="true" />}
              triggerLabel="Filter sheet"
              triggerPressed={facetsActive}
              triggerVariant="ghost"
              triggerSize="icon-sm"
              triggerClassName={cn(
                "size-6 rounded-xs p-0",
                facetsActive ? "bg-surfaceMuted text-ink" : "text-tertiary",
              )}
              title="Filter sheet"
              contentClassName="w-64"
            >
              <div className="flex flex-col gap-3">
                {sheetFacetOptions.suppliers.length > 0 ? (
                  <fieldset className="flex flex-col gap-1">
                    <legend className="text-[9px] font-medium uppercase text-tertiary">Supplier</legend>
                    {sheetFacetOptions.suppliers.map((supplier) => (
                      <label key={supplier} className="flex cursor-pointer items-center gap-2 text-[10px] font-medium leading-none text-ink">
                        <input
                          type="checkbox"
                          aria-label={`Supplier ${supplier}`}
                          checked={sheetFacets.suppliers.includes(supplier)}
                          onChange={(event) =>
                            setSheetFacets((current) => ({
                              ...current,
                              suppliers: event.currentTarget.checked
                                ? [...current.suppliers, supplier]
                                : current.suppliers.filter((value) => value !== supplier),
                            }))
                          }
                          className="size-3 rounded-xs accent-brand-orange"
                        />
                        <span className="truncate">{supplier}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                {sheetFacetOptions.categories.length > 0 ? (
                  <fieldset className="flex flex-col gap-1">
                    <legend className="text-[9px] font-medium uppercase text-tertiary">Category</legend>
                    {sheetFacetOptions.categories.map((category) => (
                      <label key={category} className="flex cursor-pointer items-center gap-2 text-[10px] font-medium leading-none text-ink">
                        <input
                          type="checkbox"
                          aria-label={`Category ${category}`}
                          checked={sheetFacets.categories.includes(category)}
                          onChange={(event) =>
                            setSheetFacets((current) => ({
                              ...current,
                              categories: event.currentTarget.checked
                                ? [...current.categories, category]
                                : current.categories.filter((value) => value !== category),
                            }))
                          }
                          className="size-3 rounded-xs accent-brand-orange"
                        />
                        <span className="truncate">{category}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                <label className="flex cursor-pointer items-center gap-2 border-t border-hairline pt-2 text-[10px] font-medium leading-none text-ink">
                  <input
                    type="checkbox"
                    aria-label="Has value"
                    checked={sheetFacets.hasValueOnly}
                    onChange={(event) =>
                      setSheetFacets((current) => ({ ...current, hasValueOnly: event.currentTarget.checked }))
                    }
                    className="size-3 rounded-xs accent-brand-orange"
                  />
                  Has value (cost &gt; 0)
                </label>
                {facetsActive ? (
                  <button
                    type="button"
                    className="self-start rounded-xs px-1 py-0.5 text-[9px] font-medium text-brand-orange hover:underline"
                    onClick={() => setSheetFacets(EMPTY_SHEET_FACETS)}
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </FilterPopover>
          }
          // C3/Req 13+6: New-tab button relocated here from the tab strip.
          // Hidden entirely when canCreate is false (non-editors see no affordance).
          addActions={createTabState.canCreate ? [
            {
              label: "New tab",
              icon: <TabsIcon size={13} weight="regular" aria-hidden="true" />,
              onClick: () => void tabStripRef.current?.createTab(),
              disabled: createTabState.pending,
              className: ADD_BUTTON_CLASSNAME,
            },
          ] : []}
        />
        {estimateTabs.length > 0 ? (
          <EstimateTabStrip
            ref={tabStripRef}
            tabs={estimateTabs}
            activeTabId={activeTabId ?? estimateTabs[0]?.id ?? "legacy-main"}
            projectId={projectId}
            estimateId={estimateId}
            enableLifecycleActions={canEditEstimate}
            canCreateTabs={canEditEstimate}
            onTabChange={onActiveTabChange ?? (() => {})}
            onTabsChange={onEstimateTabsChange}
            onCreateTabStateChange={setCreateTabState}
          />
        ) : null}
        {saveState === "saving" || saveState === "saved" || saveState === "failed" ? (
          <div
            className={cn(
              "mx-2 mt-2 rounded-xs border px-2 py-1 text-[10px] font-medium leading-4",
              saveState === "failed"
                ? "border-red-200 bg-red-50 text-red-700"
                : saveState === "saving"
                  ? "border-warningSoft bg-warningSoft/40 text-warning"
                  : "border-successSoft bg-successSoft/40 text-success",
            )}
            role="status"
            aria-live="polite"
          >
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Could not save"}
            {rowMutationError?.message.includes("refreshed") ? " · Recovered edit" : ""}
          </div>
        ) : null}
        {rowMutationError ? (
          <div className="mx-2 mt-2 flex items-start gap-2 rounded-xs border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] leading-4 text-red-700" role="alert">
            <span className="min-w-0 flex-1">
              {rowMutationError.message}
            </span>
            <button
              type="button"
              className="shrink-0 rounded-xs p-0.5 text-red-700 hover:bg-red-100"
              aria-label="Dismiss row save error"
              onClick={clearRowMutationError}
            >
              <X size={12} weight="regular" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {didTruncateInitialTree ? (
          <div className="mx-2 mt-2 rounded-xs border border-warningSoft bg-warningSoft/40 px-2 py-1.5 text-[10px] leading-4 text-warning" role="status">
            This sheet view loaded the first {activeInitialLoadLimitState?.maxNodeCount?.toLocaleString() ?? "available"} nodes and {activeInitialLoadLimitState?.maxRowItemCount?.toLocaleString() ?? "available"} rows. Proposal exports use separate full-data limits.
          </div>
        ) : null}
        {activeTreeErrorMessage ? (
          <div className="m-2 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xs border border-dashed border-red-200 bg-red-50/60 p-3 text-center" role="alert">
            <div className="max-w-md">
              <p className="text-[8px] font-medium uppercase tracking-normal text-red-700">Tree load failed</p>
              <h2 className="mt-1 text-[10px] font-medium tracking-normal text-ink">Could not load this estimate view</h2>
              <p className="mt-1 text-[10px] leading-4 text-red-700">{activeTreeErrorMessage}</p>
              <Button type="button" variant="secondary" size="xs" className="mt-3" onClick={() => void activeTreeQuery.refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : isActiveTabTreeLoading ? (
          <>
            <div role="status" aria-label="Loading estimate tab" className="min-h-0 flex-1 space-y-1 overflow-auto p-2">
              {Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-7 w-full" />)}
              <span className="sr-only">Loading estimate tab</span>
            </div>
          </>
        ) : selectedNode ? (
          <>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                ref={estimatePointerSurfaceRef}
                className={cn("relative min-h-0 flex-1 overflow-auto px-2 pt-0", bulkSelectedRowCount > 0 ? "pb-16" : "pb-1")}
                style={estimateColumnStyle}
                data-estimate-pointer-surface
              >
                <EstimateSheetCursorLayer estimateId={estimateId} tabId={dataTabId} userId={collaborationUserId} displayName={collaborationDisplayName} />
                {displayedSheetNode ? (
                  <EstimateSheetExpansionContext.Provider value={sheetExpansionContextValue}>
                    <EstimateSheetVirtualBranchList
                      node={displayedSheetNode}
                      nodeCode={selectedNodePresentation.nodeCode}
                      ancestorPath={selectedNodePresentation.ancestorPath}
                      editableRows={editableRows}
                      setEditableRows={setEditableRows}
                      onInsertLibraryItem={insertLibraryItem}
                      onInsertTemplates={insertTemplatesIntoParentById}
                      onInsertTemplateNode={insertTemplateNodeIntoParentById}
                      onAddBlankRow={insertBlankRow}
                      onReplaceRowItem={replaceRowItem}
                      onDeleteRowItem={deleteRowItem}
                      onUpdateRowItem={updateRowItem}
                      onMarkRowDirty={markRowDirty}
                      onOpenRowDetails={openRowDetails}
                      onClearRowComponent={clearRowComponent}
                      onRequestProjectSpecific={requestProjectSpecific}
                      onPromoteRowToLibrary={promoteRowToLibrary}
                      promotingRowId={promotingRowId}
                      onMoveRowComponent={moveRowComponent}
                      expressInsertDraftStates={expressInsertDraftStates}
                      onRetryExpressDraft={retryExpressDraft}
                      onDeleteExpressDraft={deleteExpressDraft}
                      selectedRowIds={bulkSelectedRowIds}
                      onToggleRowSelection={toggleRowSelection}
                      onToggleRowsSelection={toggleRowsSelection}
                      columnResize={estimateColumnResizeConfig}
                      nodeTotals={displayedNodeTotals}
                    />
                  </EstimateSheetExpansionContext.Provider>
                ) : null}
              </div>
              <BulkActionToolbar
                placement="bottom-dock"
                dockTo="container"
                selectedCount={bulkSelectedRowCount}
                selectedLabel={bulkSelectedRowCount === 1 ? "row selected" : "rows selected"}
                onClear={clearRowSelection}
                actions={[
                  {
                    label: "Delete selected rows",
                    icon: <Trash size={12} weight="regular" />,
                    variant: "danger",
                    onClick: deleteSelectedRows,
                  },
                ]}
              />
            </div>
          </>
        ) : (
          <>
            <div className="relative flex min-h-0 flex-1 overflow-auto px-2 pb-2 pt-2" data-estimate-pointer-surface>
              <EstimateSheetCursorLayer estimateId={estimateId} tabId={dataTabId} userId={collaborationUserId} displayName={collaborationDisplayName} />
            </div>
          </>
        )}
      </section>
      {renderSidebar ? (
        shouldLoadLibraryLazily && !lazyLibrary ? (
          <ComponentLibrarySidebarFallback isError={isLazyLibraryError} onRetry={() => refetchLazyLibrary()} />
        ) : (
          <EstimateRightSidebar
            onInsertComponent={insertIntoSelectedNode}
            projectId={projectId}
            estimateId={estimateId}
            selectedNodeId={resolvedSelectedNodeId}
            selectedNodeKind={selectedNode?.kind ?? null}
            selectedNodeName={selectedNode?.name ?? null}
            templateTargetName={templateInsertionTargetLabel}
            canInsertTemplate={canInsertTemplateIntoSelectedNode}
            nodes={estimateTree}
            initialLibraryItems={resolvedLibraryItems}
            templates={availableTemplates}
            categoryTree={libraryCategoryTree ?? lazyLibrary?.categoryTree}
            suppliers={librarySuppliers ?? lazyLibrary?.suppliers}
            brands={libraryBrands ?? lazyLibrary?.brands}
            libraryFolders={libraryFolders ?? lazyLibrary?.libraryFolders}
            onInsertTemplate={insertTemplateIntoSelectedGroup}
            onInsertTemplateNode={insertTemplateNodeIntoSelectedGroup}
            onInsertProjectSource={insertProjectSourceIntoSelectedGroup}
            onLibraryDataChanged={handleLibraryDataChanged}
          />
        )
      ) : null}
    </>
  );
}

// Placeholder column while the lazy component-library dataset loads. Keeps
// the sidebar footprint stable so the sheet does not reflow, and keeps load
// failures visible and retryable without blocking sheet editing.
function ComponentLibrarySidebarFallback({ isError, onRetry }: { isError: boolean; onRetry?: () => void }) {
  const surfaceVariant = useEstimateSurfaceVariant();
  return (
    <aside className={cn("flex h-full min-h-0 min-w-[320px] flex-col", estimateSurfaceClass(surfaceVariant, "libraryRail"))}>
      {isError ? (
        <div role="alert" className={cn("m-2 mt-2 rounded-xs border border-dashed p-3 text-center", surfaceVariant === "glass" ? "border-[color:var(--glass-border)] bg-white/30" : "border-hairline bg-surfaceMuted")}>
          <p className="text-[10px] font-medium text-ink">Couldn&apos;t load the component library</p>
          <p className="mt-1 text-[10px] leading-4 text-tertiary">The estimate is still editable. Retry to load components and templates.</p>
          {onRetry ? (
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : (
        <div role="status" aria-label="Loading component library" className="space-y-1 p-2">
          <Skeleton className="h-7 w-full" />
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
          <span className="sr-only">Loading component library</span>
        </div>
      )}
    </aside>
  );
}
