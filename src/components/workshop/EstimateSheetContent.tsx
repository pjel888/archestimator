"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { ClockCounterClockwise, FileXls, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { dispatchProjectTotalChange } from "@/components/workshop/ProjectTotalHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useEstimateRowMutations } from "@/hooks/use-estimate-row-mutations";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { loadCurrentWorkspaceComponentLibrary } from "@/lib/component-library/actions";
import { useEstimateCursorCollaboration, type RemoteEstimateCursor } from "@/hooks/use-estimate-cursor-broadcast";
import { useEstimateAreaTreeQuery, useEstimateTabTreeQuery } from "@/hooks/use-estimate-query";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection, useEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { fetchEstimateSheetVersionControl, insertEstimateTemplateIntoEstimate, insertEstimateTemplateNodeIntoEstimate, wrapEstimateAreaAndInsertTemplate, type EstimateSheetVersionControlData } from "@/lib/estimates/actions";
import { getCollaborationColorForUser } from "@/lib/collaboration/colors";
import { getEstimateWrapGroupName } from "@/lib/estimates/tree-hierarchy";
import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import type { ProposalExportMetadata, ProposalExportModel } from "@/lib/proposal-export/types";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";
import { EstimateRightSidebar } from "./component-library";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import { CommandPalette } from "./component-library/CommandPalette";
import {
  INSERT_ESTIMATE_TEMPLATE_EVENT,
  type EstimateTemplate,
  type EstimateTemplateDragPayload,
  type InsertEstimateTemplateEventDetail,
} from "./component-library/templates";
import { reportEstimateSheetContentRender } from "./estimate-sheet-render-probe";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";
import { findEstimateNode, sampleEstimateTree, type EstimateTreeNode, type EstimateRowItem } from "./estimate-tree-data";
import { EstimateTabStrip } from "./estimate-sheet/EstimateTabStrip";
import { REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT } from "./estimate-sheet/events";
import { ProposalExportPreviewDialog, type ProposalExportPreviewScope } from "./ProposalExportPreviewDialog";
import type { EstimateTabSummary } from "@/lib/estimates/types";
import {
  ActivityHistoryModal,
  BLANK_ESTIMATE_ROW_AUDIT_LABEL,
  BLANK_ESTIMATE_ROW_COMPONENT_LABEL,
  BLANK_ESTIMATE_ROW_TAG,
  DEFAULT_ACTIVITY_FILTERS,
  RowDetailsModal,
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
} from "./estimate-sheet/rows/cells";
import { EstimateSheetBranch } from "./estimate-sheet/rows/branch";

/* Re-export component library helpers and sidebar so existing imports don't break */
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
export { EstimateRightSidebar } from "./component-library";
export { pesoFormatter };

// legacy "EstimateSheetContent" name kept for compatibility; see plan 2026-06-12 §01-17
type EstimateSheetContentProps = {
  selectedNodeId: string | null;
  nodes?: EstimateTreeNode[];
  projectId?: string;
  estimateId?: string;
  estimateTabs?: EstimateTabSummary[];
  activeTabId?: string;
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






function findNodePath(nodes: EstimateTreeNode[], targetId: string): EstimateTreeNode[] {
  for (const node of nodes) {
    if (node.id === targetId) return [node];
    if (node.children) {
      const childPath = findNodePath(node.children, targetId);
      if (childPath.length > 0) return [node, ...childPath];
    }
  }
  return [];
}

function computeNodeCode(nodes: EstimateTreeNode[], targetId: string): string {
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


function createProposalPreviewSignature(nodes: EstimateTreeNode[], editableRows: Record<string, EditableRowValue>, metadata: ProposalExportMetadata | null) {
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

/**
 * Replaces an area node in place with a wrapper group holding the area and
 * the dropped template roots — the optimistic mirror of
 * wrapEstimateAreaAndInsertTemplate.
 */
function wrapAreaNodeWithGroup(nodes: EstimateTreeNode[], areaNodeId: string, groupId: string, groupName: string, templateNodes: EstimateTreeNode[]): EstimateTreeNode[] {
  return nodes.map((node) => {
    if (node.id === areaNodeId) {
      return {
        id: groupId,
        name: groupName,
        kind: "group",
        total: "₱0.00",
        children: [node, ...templateNodes],
      } satisfies EstimateTreeNode;
    }
    return {
      ...node,
      children: node.children ? wrapAreaNodeWithGroup(node.children, areaNodeId, groupId, groupName, templateNodes) : node.children,
    };
  });
}

/**
 * Reveals a freshly created group in the left tree. When no explicit
 * expansion is stored, the tree already expands every folder row by default,
 * so only an existing explicit list needs the new id appended.
 */
function expandTreeNodeForEstimate(estimateId: string | undefined, nodeId: string) {
  if (!estimateId) return;
  const state = useEstimateWorkspaceState.getState();
  const expanded = state.expandedNodeIdsByEstimateId[estimateId];
  if (!expanded || expanded.includes(nodeId)) return;
  state.setExpandedNodeIds(estimateId, [...expanded, nodeId]);
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
}: {
  nodes: EstimateTreeNode[];
  rows: FlattenedEstimateRow[];
  editableRows: Record<string, EditableRowValue>;
  metadata: ProposalExportMetadata | null;
  projectTotal: number;
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
      scope: { mode: "node", nodeId: node.id, includeDescendants: isGroup },
      depth,
      kind: isGroup ? "group" : "area",
      label: node.name,
      eyebrow: `${nodeCode} ${isGroup ? "Group Node" : "Area Node"}`,
      description: isGroup ? "Includes descendant node and row activity" : pathLabel,
      total: computeNodeTotal(node, editableRows),
      row: null,
    });

    node.children?.forEach((child, childIndex) => {
      visit(child, depth + 1, getNodeCode(nodeCode, childIndex), [...ancestorNames, node.name]);
    });

    if (node.kind !== "area") return;

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

function EstimateSheetHeader({
  onExpandAll,
  onCollapseAll,
  onPreviewProposalExport,
  canPreviewProposalExport = false,
  onOpenSheetActivity,
  searchQuery,
  onSearchQueryChange,
}: {
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onPreviewProposalExport?: () => void;
  canPreviewProposalExport?: boolean;
  onOpenSheetActivity?: (opener: HTMLElement) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}) {
  return (
    // z-30: the search dropdown must paint above the sheet's sticky branch
    // headers (z-20), which sit later in the DOM.
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur" aria-label="Tab controls">
      <TreePanelHeader
        className="static z-auto bg-transparent"
        ariaLabel="Tab tools"
        labelPrefix="tab"
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        startActionsLabel="Tab search"
        searchValue={searchQuery}
        onSearchValueChange={onSearchQueryChange}
        searchPlaceholder="Search Tab"
        searchLabel="Search Tab"
        addActions={[
          {
            label: "Activity",
            icon: <ClockCounterClockwise size={12} weight="regular" aria-hidden="true" />,
            onClick: onOpenSheetActivity
              ? function openSheetActivity(event?: unknown) {
                const target = event && typeof event === "object" && "currentTarget" in event ? (event as { currentTarget?: EventTarget | null }).currentTarget : null;
                onOpenSheetActivity(target instanceof HTMLElement ? target : document.body);
              }
              : undefined,
            className: "text-tertiary hover:bg-orange-50 hover:text-orange-700 focus-visible:bg-orange-50 focus-visible:text-orange-700",
          },
          {
            label: "Preview Excel Export",
            icon: <FileXls size={12} weight="regular" aria-hidden="true" />,
            onClick: onPreviewProposalExport,
            disabled: !canPreviewProposalExport,
            className: "text-tertiary hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700",
          },
        ]}
      />
    </header>
  );
}

const EMPTY_COLLAPSED_NODE_IDS = new Set<string>();

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

function getRemoteCursorLabel(cursor: RemoteEstimateCursor) {
  return cursor.displayName ?? `User ${cursor.userId.slice(0, 8)}`;
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
      broadcastCursor({
        x: Math.round(event.clientX - bounds.left + surface.scrollLeft),
        y: Math.round(event.clientY - bounds.top + surface.scrollTop),
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
  if (cursors.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30 min-h-full min-w-full"
      aria-hidden="true"
      data-estimate-cursor-layer
    >
      {cursors.map((cursor) => (
        <RemoteEstimateCursorMarker key={cursor.userId} cursor={cursor} />
      ))}
    </div>
  );
}

function RemoteEstimateCursorMarker({ cursor }: { cursor: RemoteEstimateCursor }) {
  const color = getCollaborationColorForUser(cursor.userId);

  return (
    <div
      className="absolute left-0 top-0 flex items-start gap-1"
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
  estimateId,
  estimateTabs = [],
  activeTabId,
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
  const tabInitialNodes = dataTabId && dataTabId === initialTabId ? nodes : [];
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId, dataTabId);
  const { saveState, markRowDirty: markRowDirtyNow, insertRow, replaceRow, detachRow, deleteRow, updateRow } = useEstimateRowMutations(estimateId, dataTabId);
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
  const {
    tree: estimateTree,
    setTree: setEstimateTreeData,
    restore: restoreEstimateTree,
    getTreeRevision: getEstimateTreeRevision,
  } = dataTabId ? tabTreeQuery : legacyTreeQuery;
  const skipEditableRowsSyncRef = useRef(0);
  const [editableRows, setEditableRows] = useState<Record<string, EditableRowValue>>(() => collectEditableRows(nodes));
  const [pendingFocusRowId, setPendingFocusRowId] = useState("");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [collapsedNodeIdsByScope, setCollapsedNodeIdsByScope] = useState<Record<string, string[]>>({});
  const [bulkSelectedRowIds, setBulkSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [isProposalPreviewOpen, setIsProposalPreviewOpen] = useState(false);
  const [proposalPreviewScope, setProposalPreviewScope] = useState<ProposalExportPreviewScope>("all-tabs");
  const [proposalPreviewModel, setProposalPreviewModel] = useState<ProposalExportModel | null>(null);
  const [proposalPreviewSignature, setProposalPreviewSignature] = useState("");
  const [inspector, setInspector] = useState<EstimateActivityScope | null>(null);
  const [rowDetails, setRowDetails] = useState<RowDetailsState | null>(null);
  const [projectSpecificRowId, setProjectSpecificRowId] = useState("");
  const [activityFilters, setActivityFilters] = useState<ActivityFilterState>(DEFAULT_ACTIVITY_FILTERS);
  const [historyData, setHistoryData] = useState<EstimateSheetVersionControlData | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const inspectorOpenerRef = useRef<HTMLElement | null>(null);
  const rowDetailsOpenerRef = useRef<HTMLElement | null>(null);
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
  const libraryQuery = useQuery({
    queryKey: ["workspace-component-library"],
    queryFn: () => loadCurrentWorkspaceComponentLibrary(),
    enabled: shouldLoadLibraryLazily && (renderSidebar || showCommandPalette),
    staleTime: 5 * 60 * 1000,
  });
  const lazyLibrary = shouldLoadLibraryLazily ? libraryQuery.data : undefined;
  const resolvedLibraryItems = libraryItems ?? lazyLibrary?.libraryItems;
  const queryClient = useQueryClient();
  // Library mutations in the sidebar update its local state; the lazy query
  // cache must also be marked stale or remounts re-seed from pre-mutation data.
  const handleLibraryDataChanged = useStableCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["workspace-component-library"] });
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
    ].join("::"),
    [dataTabId, editableRows, estimateTree, resolvedProposalExportMetadata, tabScopeSignature],
  );
  const currentProposalPreviewSignature = useMemo(
    () => getProposalPreviewSignature(proposalPreviewScope),
    [getProposalPreviewSignature, proposalPreviewScope],
  );
  const proposalDownloadHref = useMemo(() => {
    if (!projectId || !estimateId) return null;
    const baseHref = `/api/projects/${encodeURIComponent(projectId)}/estimates/${encodeURIComponent(estimateId)}/export/proposal.xlsx`;
    return hasMultiplePersistedTabs && proposalPreviewScope === "active-tab" && dataTabId
      ? `${baseHref}?tab=${encodeURIComponent(dataTabId)}`
      : baseHref;
  }, [dataTabId, estimateId, hasMultiplePersistedTabs, projectId, proposalPreviewScope]);
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
  const [sheetSearchQuery, setSheetSearchQuery] = useState("");
  const sheetSearchActive = sheetSearchQuery.trim().length > 0;
  // Render-only filtered copy: row edits and inserts keep targeting the real
  // tree state by node/item id.
  const displayedSheetNode = useMemo(
    () => (selectedNode && sheetSearchActive ? filterEstimateSheetNode(selectedNode, sheetSearchQuery) : selectedNode),
    [selectedNode, sheetSearchActive, sheetSearchQuery],
  );
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
  // Searches reveal every match: collapse state pauses while filtering.
  const sheetExpansionContextValue = useMemo(
    () => ({
      collapsedNodeIds: sheetSearchActive ? EMPTY_COLLAPSED_NODE_IDS : collapsedNodeIds,
      setCollapsedNodeIds,
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
  const insertTargetNodeId = selectedNode?.kind === "area" ? selectedNode.id : "";
  const selectedNodePath = useMemo(
    () => (resolvedSelectedNodeId ? findNodePath(estimateTree, resolvedSelectedNodeId) : []),
    [estimateTree, resolvedSelectedNodeId],
  );
  const templateTargetParentNode = useMemo(() => {
    if (selectedNode?.kind === "group") return selectedNode;
    return [...selectedNodePath].reverse().find((node) => node.kind === "group") ?? null;
  }, [selectedNode, selectedNodePath]);
  const canInsertIntoSelectedNode = Boolean(insertTargetNodeId);
  // With an area selected, template adds wrap the area in a new group
  // instead of targeting an ancestor group.
  const canInsertTemplateIntoSelectedNode = selectedNode?.kind === "area" || Boolean(templateTargetParentNode);
  const insertionTargetLabel = selectedNode?.kind === "area" ? selectedNode.name : "selected area";
  const templateInsertionTargetLabel = selectedNode?.kind === "area"
    ? `a new ${getEstimateWrapGroupName(selectedNode.name)}`
    : templateTargetParentNode?.name ?? "selected group";
  const projectTotal = useMemo(
    () => estimateTree.reduce((total, node) => total + computeNodeTotal(node, editableRows), 0),
    [editableRows, estimateTree],
  );
  const currentRows = useMemo(() => flattenEstimateRows(estimateTree, editableRows), [editableRows, estimateTree]);
  const inspectorScopeKey = getActivityScopeKey(inspector);
  const activityFilterKey = useMemo(() => createActivityFilterKey(activityFilters), [activityFilters]);
  const activityScopeItems = useMemo(
    () => buildActivityScopeTreeItems({
      nodes: estimateTree,
      rows: currentRows,
      editableRows,
      metadata: resolvedProposalExportMetadata,
      projectTotal,
    }),
    [currentRows, editableRows, estimateTree, projectTotal, resolvedProposalExportMetadata],
  );
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

    const model = buildProposalExportModel({
      metadata: resolvedProposalExportMetadata,
      nodes: materializeEditableEstimateTree(estimateTree, editableRows),
    });
    setProposalPreviewModel(model);
    setProposalPreviewSignature(getProposalPreviewSignature(scope));
    return model;
  }, [editableRows, estimateTree, getProposalPreviewSignature, proposalPreviewScope, resolvedProposalExportMetadata]);
  const changeProposalPreviewScope = useCallback((scope: ProposalExportPreviewScope) => {
    setProposalPreviewScope(scope);
    if (isProposalPreviewOpen) buildProposalPreview(scope);
  }, [buildProposalPreview, isProposalPreviewOpen]);
  const openProposalPreview = useCallback(() => {
    const model = buildProposalPreview();
    if (model) setIsProposalPreviewOpen(true);
  }, [buildProposalPreview]);
  const refreshProposalPreview = useCallback(() => {
    buildProposalPreview();
  }, [buildProposalPreview]);
  const proposalPreviewScopeControls = hasMultiplePersistedTabs
    ? {
        selectedScope: proposalPreviewScope,
        activeTabName: activeProposalExportTabName,
        tabCount: persistedTabs.length,
        onScopeChange: changeProposalPreviewScope,
      }
    : undefined;
  const isProposalPreviewStale = Boolean(proposalPreviewModel && proposalPreviewSignature !== currentProposalPreviewSignature);
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
      setEditableRows(collectEditableRows(estimateTree));
    });
  }, [estimateTree, saveState]);

  useEffect(() => {
    if (!pendingFocusRowId) return;
    let attempts = 0;
    let frameId = 0;

    function tryFocus() {
      const quantityInput = document.querySelector<HTMLInputElement>(`[data-estimate-row-id="${pendingFocusRowId}"][data-estimate-cell-index="0"]`);
      if (quantityInput) {
        quantityInput.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
        quantityInput.focus();
        quantityInput.select();
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

  const updateRowItem = useStableCallback((rowItemId: string, values: Partial<EditableRowValue>) => {
    if (!projectId || !estimateId) return;
    const previousTree = estimateTree;
    const previousRows = collectEditableRows(estimateTree);
    const rollbackRevision = getEstimateTreeRevision();
    const currentEditableRow = editableRows[rowItemId] ?? previousRows[rowItemId];
    const nextEditableRow: EditableRowValue = {
      quantity: currentEditableRow?.quantity ?? "0",
      contingencyMode: currentEditableRow?.contingencyMode ?? "contingency",
      contingencyPercentage: currentEditableRow?.contingencyPercentage ?? "0",
      miscCost: currentEditableRow?.miscCost ?? "0",
      ...values,
    };
    updateRow({
      projectId,
      estimateId,
      rowId: rowItemId,
      ...(values.quantity !== undefined ? { quantity: parseNonNegativeEditableNumber(values.quantity) } : {}),
      ...(values.contingencyPercentage !== undefined || values.contingencyMode !== undefined ? { contingencyPercentage: parseEditableContingencyPercentage(nextEditableRow) } : {}),
      ...(values.miscCost !== undefined ? { miscCost: parseNonNegativeEditableNumber(values.miscCost) } : {}),
      rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
    });
  });

  const insertLibraryItem = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
    const targetNode = findEstimateNode(estimateTree, targetNodeId);
    if (targetNode?.kind !== "area") return;

    const previousTree = estimateTree;
    const previousRows = editableRows;
    const newItem = cloneLibraryItemForEstimate(libraryItem);
    setPendingFocusRowId(newItem.id);
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
        rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision),
      });
    }
  });

  const insertIntoSelectedNode = useCallback(
    (libraryItem: EstimateRowItem) => {
      if (!insertTargetNodeId) return false;
      insertLibraryItem(insertTargetNodeId, libraryItem);
      return true;
    },
    [insertLibraryItem, insertTargetNodeId],
  );

  const insertTemplateIntoParent = useStableCallback(
    (targetParentNodeId: string, template: EstimateTemplate) => {
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (targetParentNode?.kind !== "group") return false;

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
        })
          .then((result) => {
            setEstimateTreeData(() => result.tree);
          })
          .catch(() => restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision));
      }

      return true;
    },
  );

  const insertTemplateIntoParentById = useCallback(
    (targetParentNodeId: string, templateId: string) => {
      const template = templateById.get(templateId);
      if (!template) return false;
      return insertTemplateIntoParent(targetParentNodeId, template);
    },
    [insertTemplateIntoParent, templateById],
  );

  // A template dropped on an area cannot nest inside it (areas take no child
  // nodes), so the drop wraps the area and the template content in a new
  // group occupying the area's slot. Selection follows the new group: the
  // sheet re-scopes and the left tree highlights it through the shared
  // workspace selection.
  const wrapAreaAndInsertTemplates = useStableCallback(
    (areaNodeId: string, payload: EstimateTemplateDragPayload): boolean => {
      const areaNode = findEstimateNode(estimateTree, areaNodeId);
      if (areaNode?.kind !== "area") return false;

      let optimisticTemplateNodes: EstimateTreeNode[];
      if (payload.kind === "template-node") {
        const template = templateById.get(payload.templateId);
        const templateNode = template ? findEstimateNode(template.nodes, payload.templateNodeId) : null;
        if (!templateNode) return false;
        optimisticTemplateNodes = cloneTemplateNodesForEstimate([templateNode]);
      } else {
        const payloadTemplates = payload.templateIds
          .map((templateId) => templateById.get(templateId))
          .filter((template): template is EstimateTemplate => Boolean(template));
        if (payloadTemplates.length === 0) return false;
        optimisticTemplateNodes = cloneTemplateNodesForEstimate(payloadTemplates.flatMap((template) => template.nodes));
      }

      const previousTree = estimateTree;
      const previousRows = editableRows;
      const rollbackRevision = getEstimateTreeRevision();
      const optimisticGroupId = `optimistic-group-${createEstimateRowItemId()}`;
      const groupName = getEstimateWrapGroupName(areaNode.name);
      const nextEditableRows = collectEditableRows(optimisticTemplateNodes);
      const nextRevision = setEstimateTree((current) => wrapAreaNodeWithGroup(current, areaNodeId, optimisticGroupId, groupName, optimisticTemplateNodes));
      setEditableRows((current) => ({ ...current, ...nextEditableRows }));
      setSelectedNodeId(optimisticGroupId);
      expandTreeNodeForEstimate(estimateId, optimisticGroupId);

      if (projectId && estimateId) {
        const reselectWrapGroup = (nodeId: string) => {
          // Only steer selection if the user is still on the wrap group.
          const currentSelection = useEstimateWorkspaceState.getState().selectedNodeIdByEstimateId[estimateId];
          if (currentSelection === optimisticGroupId) setSelectedNodeId(nodeId);
        };
        wrapEstimateAreaAndInsertTemplate({
          projectId,
          estimateId,
          areaNodeId,
          insert: payload.kind === "template-node"
            ? { templateId: payload.templateId, templateNodeId: payload.templateNodeId }
            : { templateIds: payload.templateIds },
        })
          .then((result) => {
            setEstimateTreeData(() => result.tree);
            expandTreeNodeForEstimate(estimateId, result.newGroupNodeId);
            reselectWrapGroup(result.newGroupNodeId);
          })
          .catch(() => {
            restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision);
            reselectWrapGroup(areaNodeId);
          });
      }

      return true;
    },
  );

  const insertTemplateIntoSelectedGroup = useCallback(
    (template: EstimateTemplate) => {
      if (selectedNode?.kind === "area") {
        return wrapAreaAndInsertTemplates(selectedNode.id, { kind: "templates", templateIds: [template.id] });
      }
      if (!templateTargetParentNode) return false;
      return insertTemplateIntoParent(templateTargetParentNode.id, template);
    },
    [insertTemplateIntoParent, selectedNode, templateTargetParentNode, wrapAreaAndInsertTemplates],
  );

  // Inserts ONE node of a template (a group or area inside it) with its
  // subtree. Same optimistic shape as whole-template insertion; the server
  // recreates the subtree through the history-aware node/row RPCs.
  const insertTemplateNodeIntoParent = useStableCallback(
    (targetParentNodeId: string, template: EstimateTemplate, templateNode: EstimateTreeNode) => {
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (targetParentNode?.kind !== "group") return false;

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
        })
          .then((result) => {
            setEstimateTreeData(() => result.tree);
          })
          .catch(() => restoreEstimateState(previousTree, previousRows, nextRevision ?? rollbackRevision));
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
      if (selectedNode?.kind === "area") {
        return wrapAreaAndInsertTemplates(selectedNode.id, { kind: "template-node", templateId: template.id, templateNodeId: templateNode.id });
      }
      if (!templateTargetParentNode) return false;
      return insertTemplateNodeIntoParent(templateTargetParentNode.id, template, templateNode);
    },
    [insertTemplateNodeIntoParent, selectedNode, templateTargetParentNode, wrapAreaAndInsertTemplates],
  );

  const insertBlankRow = useCallback(
    (targetNodeId: string) => {
      insertLibraryItem(targetNodeId, createBlankEstimateRowTemplate());
    },
    [insertLibraryItem],
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

  // Template drops on the left estimate tree arrive here: that panel can
  // target a group or area row but the optimistic insert + rollback flow
  // lives in this component. Category drags carry several template ids;
  // dragging a node from inside a template carries that node's id. Area
  // targets wrap the area and the payload in a new group.
  useEffect(() => {
    function handleInsertTemplateEvent(event: Event) {
      const detail = (event as CustomEvent<Partial<InsertEstimateTemplateEventDetail> & { targetParentNodeId?: string; wrapAreaNodeId?: string; templateId?: string; templateNodeId?: string; templateIds?: unknown }>).detail;
      if (typeof detail?.wrapAreaNodeId === "string") {
        if (typeof detail.templateId === "string" && typeof detail.templateNodeId === "string") {
          wrapAreaAndInsertTemplates(detail.wrapAreaNodeId, { kind: "template-node", templateId: detail.templateId, templateNodeId: detail.templateNodeId });
          return;
        }
        if (!Array.isArray(detail.templateIds)) return;
        const wrapTemplateIds = detail.templateIds.filter((templateId): templateId is string => typeof templateId === "string" && templateId.length > 0);
        if (wrapTemplateIds.length > 0) wrapAreaAndInsertTemplates(detail.wrapAreaNodeId, { kind: "templates", templateIds: wrapTemplateIds });
        return;
      }
      if (typeof detail?.targetParentNodeId !== "string") return;
      if (typeof detail.templateId === "string" && typeof detail.templateNodeId === "string") {
        insertTemplateNodeIntoParentById(detail.targetParentNodeId, detail.templateId, detail.templateNodeId);
        return;
      }
      if (!Array.isArray(detail.templateIds)) return;
      for (const templateId of detail.templateIds) {
        if (typeof templateId === "string" && templateId) insertTemplateIntoParentById(detail.targetParentNodeId, templateId);
      }
    }
    window.addEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
    return () => window.removeEventListener(INSERT_ESTIMATE_TEMPLATE_EVENT, handleInsertTemplateEvent);
  }, [insertTemplateIntoParentById, insertTemplateNodeIntoParentById, wrapAreaAndInsertTemplates]);

  const replaceRowItem = useStableCallback((rowItemId: string, libraryItem: EstimateRowItem) => {
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
    setEditableRows((current) => ({
      ...current,
      [rowItemId]: current[rowItemId] ?? previousRows[rowItemId] ?? getInitialEditableRow(replacementItem),
    }));
    if (projectId && estimateId) {
      replaceRow({ projectId, estimateId, rowId: rowItemId, libraryItem: replacementLibraryItem, rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision) });
    }
  });

  const clearRowComponent = useStableCallback((rowItemId: string) => {
    replaceRowItem(rowItemId, createBlankEstimateRowTemplate());
  });

  const requestProjectSpecific = useStableCallback((rowItemId: string) => {
    const row = currentRows.find((candidate) => candidate.item.id === rowItemId);
    if (!row || !canMakeProjectSpecific(row.item)) return;
    setProjectSpecificRowId(rowItemId);
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
    });
    setProjectSpecificRowId("");
  }

  const moveRowComponent = useStableCallback((sourceRowItemId: string, targetRowItemId: string, movedItem: EstimateRowItem) => {
    if (sourceRowItemId === targetRowItemId) return;
    replaceRowItem(targetRowItemId, movedItem);
    clearRowComponent(sourceRowItemId);
  });

  const deleteRowItem = useStableCallback((rowItemId: string) => {
    const previousTree = estimateTree;
    const previousRows = editableRows;
    const rollbackRevision = setEstimateTree((current) =>
      current.map((node) => {
        function visit(areaNode: EstimateTreeNode): EstimateTreeNode {
          return {
            ...areaNode,
            estimateRowItems: areaNode.estimateRowItems?.filter((item) => item.id !== rowItemId),
            children: areaNode.children?.map(visit),
          };
        }
        return visit(node);
      }),
    );
    setEditableRows((current) => {
      const remainingRows = { ...current };
      delete remainingRows[rowItemId];
      return remainingRows;
    });
    if (projectId && estimateId) {
      deleteRow({ projectId, estimateId, rowId: rowItemId, rollback: () => restoreEstimateState(previousTree, previousRows, rollbackRevision) });
    }
  });

  function deleteSelectedRows() {
    bulkSelectedRowIds.forEach((rowItemId) => deleteRowItem(rowItemId));
    setBulkSelectedRowIds(new Set());
  }
  const isActiveTabTreeLoading = Boolean(dataTabId && tabTreeQuery.isFetching && estimateTree.length === 0);
  const canPreviewCurrentExport = Boolean(resolvedProposalExportMetadata);

  return (
    <>
      <CommandPalette
        open={showCommandPalette}
        items={shouldLoadLibraryLazily ? resolvedLibraryItems ?? EMPTY_ESTIMATE_ROW_ITEMS : libraryItems}
        canInsert={canInsertIntoSelectedNode}
        targetLabel={insertionTargetLabel}
        onClose={() => setShowCommandPalette(false)}
        onInsert={insertIntoSelectedNode}
      />
      <ProposalExportPreviewDialog
        open={isProposalPreviewOpen}
        model={proposalPreviewModel}
        isStale={isProposalPreviewStale}
        downloadHref={proposalDownloadHref}
        scopeControls={proposalPreviewScopeControls}
        onRefresh={refreshProposalPreview}
        onClose={() => setIsProposalPreviewOpen(false)}
      />
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProjectSpecificRowId("");
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Make component project-specific"
            className="w-[min(360px,calc(100vw-32px))] border border-hairline bg-white p-3 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-ink">Make component project-specific</p>
                <p className="mt-1 text-[10px] leading-4 text-tertiary">
                  {projectSpecificRow.item.material} will keep its current row values and stop following library updates.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0" aria-label="Close project-specific dialog" onClick={() => setProjectSpecificRowId("")}>
                <X size={13} weight="regular" aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setProjectSpecificRowId("")}>Cancel</Button>
              <Button type="button" variant="primary" size="sm" onClick={confirmProjectSpecific}>Make project-specific</Button>
            </div>
          </section>
        </div>
      ) : null}
      <section
        id="estimate-sheet-center-column"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white"
        data-estimate-center-column="sheet"
        aria-label="Estimate tab content"
      >
        {estimateTabs.length > 0 ? (
          <EstimateTabStrip
            tabs={estimateTabs}
            activeTabId={activeTabId ?? estimateTabs[0]?.id ?? "legacy-main"}
            projectId={projectId}
            estimateId={estimateId}
            enableLifecycleActions={canEditEstimate}
            canCreateTabs={canEditEstimate}
            onTabChange={onActiveTabChange ?? (() => {})}
            onTabsChange={onEstimateTabsChange}
          />
        ) : null}
        {hasMultiplePersistedTabs ? (
          <p className="border-b border-hairline bg-white px-3 py-1 text-[10px] leading-4 text-tertiary">
            XLSX export includes all tabs by default. Use the preview scope chips to download all tabs or just the active tab.
          </p>
        ) : null}
        {isActiveTabTreeLoading ? (
          <>
            <EstimateSheetHeader
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onPreviewProposalExport={openProposalPreview}
              canPreviewProposalExport={canPreviewCurrentExport}
              onOpenSheetActivity={openActivityHistory}
              searchQuery={sheetSearchQuery}
              onSearchQueryChange={setSheetSearchQuery}
            />
            <div role="status" aria-label="Loading estimate tab" className="min-h-0 flex-1 space-y-1 overflow-auto p-2">
              {Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-7 w-full" />)}
              <span className="sr-only">Loading estimate tab</span>
            </div>
          </>
        ) : selectedNode ? (
          <>
            <EstimateSheetHeader
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onPreviewProposalExport={openProposalPreview}
              canPreviewProposalExport={canPreviewCurrentExport}
              onOpenSheetActivity={openActivityHistory}
              searchQuery={sheetSearchQuery}
              onSearchQueryChange={setSheetSearchQuery}
            />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                className={cn("relative min-h-0 flex-1 overflow-auto px-2", bulkSelectedRowCount > 0 ? "pb-16" : "pb-2")}
                data-estimate-pointer-surface
              >
                <EstimateSheetCursorLayer estimateId={estimateId} tabId={dataTabId} userId={collaborationUserId} displayName={collaborationDisplayName} />
                {displayedSheetNode ? (
                <EstimateSheetExpansionContext.Provider value={sheetExpansionContextValue}>
                  <EstimateSheetBranch
                    node={displayedSheetNode}
                    nodeCode={resolvedSelectedNodeId ? computeNodeCode(estimateTree, resolvedSelectedNodeId) : ""}
                    ancestorPath={resolvedSelectedNodeId ? findNodePath(estimateTree, resolvedSelectedNodeId).slice(0, -1).map((n) => ({ id: n.id, name: n.name })) : []}
                    editableRows={editableRows}
                    setEditableRows={setEditableRows}
                    onInsertLibraryItem={insertLibraryItem}
                    onInsertTemplate={insertTemplateIntoParentById}
                    onInsertTemplateNode={insertTemplateNodeIntoParentById}
                    onWrapAreaWithTemplate={wrapAreaAndInsertTemplates}
                    onAddBlankRow={insertBlankRow}
                    onReplaceRowItem={replaceRowItem}
                    onDeleteRowItem={deleteRowItem}
                    onUpdateRowItem={updateRowItem}
                    onMarkRowDirty={markRowDirty}
                    onOpenRowDetails={openRowDetails}
                    onClearRowComponent={clearRowComponent}
                    onRequestProjectSpecific={requestProjectSpecific}
                    onMoveRowComponent={moveRowComponent}
                    selectedRowIds={bulkSelectedRowIds}
                    onToggleRowSelection={toggleRowSelection}
                    onToggleRowsSelection={toggleRowsSelection}
                  />
                </EstimateSheetExpansionContext.Provider>
                ) : (
                  <div className="mt-4 rounded-xs border border-dashed border-hairline bg-surfaceMuted p-3 text-center text-[10px] leading-4 text-tertiary">
                    No rows in this tab match &quot;{sheetSearchQuery}&quot;.
                  </div>
                )}
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
            <EstimateSheetHeader
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onPreviewProposalExport={openProposalPreview}
              canPreviewProposalExport={canPreviewCurrentExport}
              onOpenSheetActivity={openActivityHistory}
              searchQuery={sheetSearchQuery}
              onSearchQueryChange={setSheetSearchQuery}
            />
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-2 pb-2" data-estimate-pointer-surface>
              <EstimateSheetCursorLayer estimateId={estimateId} tabId={dataTabId} userId={collaborationUserId} displayName={collaborationDisplayName} />
              <div className="max-w-md rounded-xs border border-dashed border-hairline bg-surface-muted p-3 text-center">
                {dataTabId ? (
                  <>
                    <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Empty tab</p>
                    <h2 className="mt-1 text-[10px] font-medium tracking-normal text-ink">This tab is empty</h2>
                    <p className="mt-1 text-[10px] leading-4 text-tertiary">
                      Add a group to start the tree, or drag a template or project content here.
                    </p>
                    {canEditEstimate ? (
                      <div className="mt-3 flex justify-center gap-2">
                        <Button type="button" variant="secondary" size="xs" onClick={requestRootGroupCreate}>Add Group</Button>
                        <Button type="button" variant="ghost" size="xs" onClick={openTemplateBrowser}>Browse templates</Button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Empty estimate</p>
                    <h2 className="mt-1 text-[10px] font-medium tracking-normal text-ink">No estimate tree yet</h2>
                    <p className="mt-1 text-[10px] leading-4 text-tertiary">
                      This estimate has no Group Nodes, Area Nodes, or cost estimate rows. Rebuild the tree first, then place cost rows only inside Area Nodes.
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </section>
      {renderSidebar ? (
        shouldLoadLibraryLazily && !lazyLibrary ? (
          <ComponentLibrarySidebarFallback isError={libraryQuery.isError} onRetry={() => libraryQuery.refetch()} />
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
function ComponentLibrarySidebarFallback({ isError, onRetry }: { isError: boolean; onRetry: () => void }) {
  return (
    <aside className="flex h-full min-h-0 min-w-[320px] flex-col border-l border-hairline bg-white p-2">
      {isError ? (
        <div role="alert" className="mt-2 rounded-xs border border-dashed border-hairline bg-surfaceMuted p-3 text-center">
          <p className="text-[10px] font-medium text-ink">Couldn&apos;t load the component library</p>
          <p className="mt-1 text-[10px] leading-4 text-tertiary">The estimate is still editable. Retry to load components and templates.</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : (
        <div role="status" aria-label="Loading component library" className="space-y-1">
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
