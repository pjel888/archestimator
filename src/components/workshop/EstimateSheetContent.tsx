"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode, type SetStateAction } from "react";
import { FunnelSimple, SidebarSimple, StackPlus, Tabs as TabsIcon, Trash, X } from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { FilterPopover } from "@/components/ui/overlays/popover";
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";
import type { HeaderIconToolbarAddAction } from "@/components/ui/header-icon-toolbar";
import { dispatchProjectTotalChange } from "@/components/workshop/project-total-events";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";

import { useEstimateRowMutations, type EstimateRowMutationError, type EstimateSaveState } from "@/hooks/use-estimate-row-mutations";
import { useEstimateRowUpdateBroadcast } from "@/hooks/use-estimate-row-update-broadcast";
import { useStableCallback } from "@/hooks/use-stable-callback";
import { buildEstimateColumnVars, EMPTY_ESTIMATE_COLUMN_WIDTHS } from "@/lib/estimate-sheet/column-model";
import { loadProjectComponentLibraryLite } from "@/lib/component-library/actions";
import { WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, workspaceComponentLibraryLiteQueryKey, workspaceComponentLibraryQueryKey, workspaceComponentRowsLibraryQueryKey } from "@/lib/component-library/query-keys";
import { recordLibraryEvent } from "@/lib/component-library/library-telemetry";
import { useEstimateCursorCollaboration, type RemoteEstimateCursor } from "@/hooks/use-estimate-cursor-broadcast";
import { useEstimateAreaTreeQuery, useEstimateTabTreeQuery } from "@/hooks/use-estimate-query";
import { resolveEstimateWorkspaceSelection, useEstimateWorkspaceSelection } from "@/hooks/use-estimate-workspace-state";
import { useEstimateHeaderActionsStore } from "./use-estimate-header-actions-store";
import { restoreDeletedEstimateNodes, restoreDeletedEstimateRows, type EstimateSheetVersionControlData } from "@/lib/estimates/actions";
import { getCollaborationColorForUser } from "@/lib/collaboration/colors";
import type { ProposalExportMetadata, ProposalExportModel } from "@/lib/proposal-export/types";
import { isExpressComponentRow } from "@/lib/estimates/express-components";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { cn } from "@/lib/ui/cn";
import { filterMapBy } from "@/lib/util/array";
import { estimateSurfaceClass } from "./estimate-surface-class";
import { useEstimateSurfaceVariant } from "./estimate-surface-variant";
import { WORKSHOP_VIRTUALIZATION_FLAGS } from "@/lib/workshop/virtualization-flags";
import { useEstimateColumnWidthsStore } from "@/stores/estimate-column-widths-store";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { ComponentLibraryBrand, ComponentLibraryDataset } from "@/lib/repositories/component-library-repository";
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
const AddComponentModal = dynamic(
  () => import("./component-library-manager/AddComponentModal").then((mod) => mod.AddComponentModal),
  { ssr: false },
);
const ESTIMATE_LIBRARY_DEFAULT_WIDTH_CLASS = "w-[560px]";
const ESTIMATE_CURSOR_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESTIMATE_LIBRARY_POST_PAINT_DELAY_MS = 800;
import {
  INSERT_PROJECT_SOURCE_EVENT,
  readInsertProjectSourceEventDetail,
  type EstimateTemplate,
} from "./component-library/templates";
import {
  reportEstimateSheetContentRender,
} from "./estimate-sheet-render-probe";
import { createEstimateTreeIndex, getEstimateComponentInstanceRowIds } from "@/lib/estimates/estimate-tree-index";
import type { ComponentLibrarySupplierOption } from "./component-library/tree/buildLibraryTree";
import { buildComponentCatalogueComboboxOptions } from "./component-catalogue-combobox-options";
import { findEstimateNode, sampleEstimateTree, type EstimateTreeNode, type EstimateRowItem } from "./estimate-tree-data";
import { EstimateTabStrip, type EstimateTabStripHandle } from "./estimate-sheet/EstimateTabStrip";
import { loadEstimateSheetAccountPreferences, saveEstimateSheetAccountPreferences } from "./estimate-sheet/account-preferences-client";
import {
  REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT,
  REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT,
  readRequestEstimateRowItemMoveEventDetail,
} from "./estimate-sheet/events";
import type { ProposalExportPreviewScope, ProposalExportUserSettings } from "./ProposalExportPreviewDialog";
// Interaction-gated overlay: only mounts when its `open` prop is true, so it
// contributes nothing to first paint. Code-split out of the initial bundle.
const ProposalExportPreviewDialog = dynamic(
  () => import("./ProposalExportPreviewDialog").then((mod) => mod.ProposalExportPreviewDialog),
  { ssr: false },
);
import type { EstimateSheetAdjustment, EstimateTabSummary, EstimateTreeLoadLimitState } from "@/lib/estimates/types";
import {
  DEFAULT_ACTIVITY_FILTERS,
  // Aliased: the helpers barrel re-exported below also has a
  // getComponentImageUrl with a different parameter type.
  pesoFormatter,
  type ActivityFilterState,
  type EstimateActivityScope,
  type FlattenedEstimateRow,
  type RowDetailsState,
} from "./estimate-sheet/activity-history-model";
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
  ADD_LIBRARY_ITEM_EVENT,
  EMPTY_ESTIMATE_ROW_ITEMS,
  readAddLibraryItemEventDetail,
  type EstimateLibraryItemPayloadRejectReason,
} from "./estimate-sheet/rows/constants";
import {
  collectEditableRows,
  computeEditableRowTotal,
  computeNodeTotals,
  flattenEstimateRows,
  type EditableRowValue,
} from "./estimate-sheet/rows/editable-row-model";
import { createEditableRowStore, EditableRowStoreContext } from "./estimate-sheet/rows/editable-row-store";
import {
  DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS,
} from "./estimate-sheet/proposal-preview-model";
import { useEstimateHistoryPanel } from "./estimate-sheet/use-estimate-history-panel";
import { useEstimateProposalPreview } from "./estimate-sheet/use-estimate-proposal-preview";
import {
  findEstimateRowItem,
  useEstimateRowHandlers,
  type ExpressInsertDraft,
  type RowComponentPickerState,
} from "./estimate-sheet/use-estimate-row-handlers";
import { applyEstimateRowItemPatch, patchComponentInstanceRowsInTree, patchEstimateRowItemsInTree, type EstimateRowItemPatch } from "@/lib/estimates/estimate-row-tree-patch";
import type { LibraryComponentInstanceSyncResult } from "@/lib/component-library/actions";
import { useEstimateTemplateInsertion } from "./estimate-sheet/use-estimate-template-insertion";
import {
  type ExpressInsertDraftState,
} from "./estimate-sheet/rows/cells";
import { EstimateSheetVirtualBranchList } from "./estimate-sheet/rows/virtual-branch-list";
import type { BreadcrumbNode } from "./estimate-sheet/rows/branch";

const EMPTY_ESTIMATE_TABS: EstimateTabSummary[] = [];

function useNativeModalDialog(onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const handleDialogMouseDown = useCallback(
    (event: MouseEvent) => {
      if (event.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  return useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current?.removeEventListener("mousedown", handleDialogMouseDown);
      dialogRef.current = node;
      if (!node) return;

      node.addEventListener("mousedown", handleDialogMouseDown);
      if (node.open) return;

      if (typeof node.showModal === "function") {
        try {
          node.showModal();
        } catch {
          node.setAttribute("open", "");
        }
        return;
      }

      node.setAttribute("open", "");
    },
    [handleDialogMouseDown],
  );
}

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
  sheetAdjustment?: EstimateSheetAdjustment;
  /** Real persisted tab id. Undefined means pre-tab compatibility mode; see plan 2026-06-12 §01-17. */
  dataTabId?: string;
  /** Server-resolved edit capability (UX gating only; default false fails closed). */
  canEditEstimate?: boolean;
  initialTabId?: string;
  disableRouteSync?: boolean;
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
  libraryUseStoredPreferences?: boolean;
  libraryEnableReusableProjectSources?: boolean;
  libraryUsePersistentPanelWidth?: boolean;
};

const EMPTY_ESTIMATE_TEMPLATES: EstimateTemplate[] = [];
const EMPTY_FLATTENED_ESTIMATE_ROWS: FlattenedEstimateRow[] = [];
const EMPTY_BREADCRUMB_NODES: BreadcrumbNode[] = [];
const EMPTY_SELECTED_NODE_PRESENTATION = {
  nodeCode: "",
  ancestorPath: EMPTY_BREADCRUMB_NODES,
};

function createDefaultSheetAdjustment(estimateId: string): EstimateSheetAdjustment {
  return {
    estimateId,
    mode: "contingency",
    percentage: 0,
    rowRevision: 0,
    updatedBy: null,
  };
}

function resolveSheetAdjustment(estimateId: string, adjustment: EstimateSheetAdjustment | undefined): EstimateSheetAdjustment {
  return adjustment ?? createDefaultSheetAdjustment(estimateId);
}

type LibraryInsertPayloadSurface = "custom_event" | "insert" | "replace";

const SHEET_GROUP_OPTIONS: { mode: SheetGroupMode; label: string }[] = [
  { mode: "default", label: "Default" },
  { mode: "category", label: "Category" },
  { mode: "supplier", label: "Supplier" },
  { mode: "cost", label: "Cost (high to low)" },
];
const ESTIMATE_SOURCES_DRAWER_ID = "estimate-sources-drawer";

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
  return [item.material, item.name, item.category, item.brand, item.supplier, item.description]
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

function estimateRowItemValue(item: EstimateRowItem, editableRows?: Record<string, Partial<EditableRowValue>>) {
  if (editableRows) return computeEditableRowTotal(item, editableRows);
  // Best-effort "row value" without recomputing the full editable total: the
  // seed total, else cost × quantity. Used only for the "has value" facet and
  // the cost sort ordering — never for display.
  if (typeof item.totalItemCosts === "number" && item.totalItemCosts !== 0) return item.totalItemCosts;
  return (item.itemCost ?? 0) * (item.quantity ?? 0);
}

function estimateRowMatchesFacets(item: EstimateRowItem, facets: SheetFacetState, editableRows: Record<string, Partial<EditableRowValue>>) {
  if (facets.suppliers.length > 0 && !facets.suppliers.includes(item.supplier || "")) return false;
  if (facets.categories.length > 0 && !facets.categories.includes(item.category || "")) return false;
  if (facets.hasValueOnly && estimateRowItemValue(item, editableRows) <= 0) return false;
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

function collectEstimateTreeComponentCatalogueInputs(nodes: EstimateTreeNode[]) {
  const suppliers: string[] = [];
  const brands: string[] = [];

  function visit(current: EstimateTreeNode) {
    current.estimateRowItems?.forEach((item) => {
      if (item.supplier) suppliers.push(item.supplier);
      if (item.brand) brands.push(item.brand);
    });
    current.children?.forEach(visit);
  }

  nodes.forEach(visit);
  return { suppliers, brands };
}

/**
 * Prune a sheet node to rows matching the active facets, mirroring
 * `filterEstimateSheetNode`'s keep-ancestors recursion: an area survives iff it
 * keeps a row OR a kept descendant. Returns the SAME node when no facet is
 * active (identity preserved).
 */
function filterEstimateSheetNodeByFacets(node: EstimateTreeNode, facets: SheetFacetState, editableRows: Record<string, Partial<EditableRowValue>>): EstimateTreeNode | null {
  if (!sheetFacetsActive(facets)) return node;

  function visit(current: EstimateTreeNode): EstimateTreeNode | null {
    const children = (current.children ?? [])
      .map(visit)
      .filter((child): child is EstimateTreeNode => child !== null);
    const estimateRowItems = (current.estimateRowItems ?? []).filter((item) => estimateRowMatchesFacets(item, facets, editableRows));
    if (children.length > 0 || estimateRowItems.length > 0) {
      return { ...current, children, estimateRowItems };
    }
    return null;
  }

  return visit(node);
}

type SheetGroupMode = "default" | "category" | "supplier" | "cost";

type EstimateCreateTabState = {
  canCreate: boolean;
  pending: boolean;
};

type RowMoveDialogState = {
  rowItemId: string;
  opener: HTMLElement | null;
  targetNodeId: string;
  position: string;
};

type RowMoveNodeOption = {
  id: string;
  name: string;
  path: string;
  depth: number;
  rowCount: number;
};

const EMPTY_COMPONENT_CATALOGUE_INPUTS: ReturnType<typeof collectEstimateTreeComponentCatalogueInputs> = {
  suppliers: [],
  brands: [],
};
const EMPTY_ROW_MOVE_NODE_OPTIONS: RowMoveNodeOption[] = [];

type EstimateSheetContentState = {
  editableRows: Record<string, EditableRowValue>;
  expressInsertDrafts: Record<string, ExpressInsertDraft>;
  showCommandPalette: boolean;
  collapsedNodeIdsByScope: Record<string, string[]>;
  bulkSelectedRowIds: Set<string>;
  isProposalPreviewOpen: boolean;
  proposalPreviewScope: ProposalExportPreviewScope;
  proposalPreviewModel: ProposalExportModel | null;
  proposalPreviewSignature: string;
  isDownloadingProposal: boolean;
  proposalDownloadError: string | null;
  proposalExportSettings: ProposalExportUserSettings;
  inspector: EstimateActivityScope | null;
  rowDetails: RowDetailsState | null;
  rowComponentPicker: RowComponentPickerState | null;
  rowComponentPickerQuery: string;
  projectSpecificRowId: string;
  promotingRowId: string | null;
  activityFilters: ActivityFilterState;
  historyData: EstimateSheetVersionControlData | null;
  isHistoryLoading: boolean;
  isHistoryLoadingMore: boolean;
  historyError: string;
  createTabState: EstimateCreateTabState;
  sheetSearchQuery: string;
  sheetFacets: SheetFacetState;
  sheetGroupMode: SheetGroupMode;
};

type EstimateSheetContentAction = {
  [K in keyof EstimateSheetContentState]: {
    type: "fieldChanged";
    field: K;
    value: SetStateAction<EstimateSheetContentState[K]>;
  };
}[keyof EstimateSheetContentState];

function estimateSheetContentFieldAction<K extends keyof EstimateSheetContentState>(
  field: K,
  value: SetStateAction<EstimateSheetContentState[K]>,
): EstimateSheetContentAction {
  return { type: "fieldChanged", field, value } as EstimateSheetContentAction;
}

function createInitialEstimateSheetContentState(nodes: EstimateTreeNode[]): EstimateSheetContentState {
  return {
    editableRows: collectEditableRows(nodes),
    expressInsertDrafts: {},
    showCommandPalette: false,
    collapsedNodeIdsByScope: {},
    bulkSelectedRowIds: new Set(),
    isProposalPreviewOpen: false,
    proposalPreviewScope: "all-tabs",
    proposalPreviewModel: null,
    proposalPreviewSignature: "",
    isDownloadingProposal: false,
    proposalDownloadError: null,
    proposalExportSettings: DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS,
    inspector: null,
    rowDetails: null,
    rowComponentPicker: null,
    rowComponentPickerQuery: "",
    projectSpecificRowId: "",
    promotingRowId: null,
    activityFilters: DEFAULT_ACTIVITY_FILTERS,
    historyData: null,
    isHistoryLoading: false,
    isHistoryLoadingMore: false,
    historyError: "",
    createTabState: { canCreate: false, pending: false },
    sheetSearchQuery: "",
    sheetFacets: EMPTY_SHEET_FACETS,
    sheetGroupMode: "default",
  };
}

function collectRowMoveNodeOptions(
  nodes: EstimateTreeNode[],
  path: string[] = [],
  depth = 0,
  into: RowMoveNodeOption[] = [],
): RowMoveNodeOption[] {
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    into.push({
      id: node.id,
      name: node.name,
      path: nextPath.join(" / "),
      depth,
      rowCount: node.estimateRowItems?.length ?? 0,
    });
    collectRowMoveNodeOptions(node.children ?? [], nextPath, depth + 1, into);
  }
  return into;
}

function findRowItemNodeContext(
  nodes: EstimateTreeNode[],
  rowItemId: string,
  path: string[] = [],
): { nodeId: string; nodePath: string[]; index: number } | null {
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    const rowItems = node.estimateRowItems ?? [];
    for (let rowIndex = 0; rowIndex < rowItems.length; rowIndex += 1) {
      if (rowItems[rowIndex]?.id === rowItemId) return { nodeId: node.id, nodePath: nextPath, index: rowIndex };
    }
    const child = findRowItemNodeContext(node.children ?? [], rowItemId, nextPath);
    if (child) return child;
  }
  return null;
}

function resolveRowMoveDialogTargetIndex(position: string, targetNode: EstimateTreeNode | null): number {
  const targetRows = targetNode?.estimateRowItems ?? [];
  if (position === "start") return 0;
  if (position === "end") return targetRows.length;
  if (position.startsWith("after:")) {
    const rowId = position.slice("after:".length);
    const rowIndex = targetRows.findIndex((item) => item.id === rowId);
    return rowIndex >= 0 ? rowIndex + 1 : targetRows.length;
  }
  return targetRows.length;
}

function estimateSheetContentReducer(
  state: EstimateSheetContentState,
  action: EstimateSheetContentAction,
): EstimateSheetContentState {
  switch (action.type) {
    case "fieldChanged": {
      const currentValue = state[action.field] as never;
      const nextValue = typeof action.value === "function"
        ? (action.value as (current: never) => unknown)(currentValue)
        : action.value;
      return {
        ...state,
        [action.field]: nextValue,
      } as EstimateSheetContentState;
    }
    default:
      return state;
  }
}

/**
 * Reorder each area's `estimateRowItems` WITHIN that area (hierarchy preserved):
 * - category/supplier: flatten grouped buckets back to one array;
 * - cost: live editable line total, high to low.
 * This is a within-area reorder only — it does NOT add group-header rows (that
 * would require changing the row renderer and risk the perf guard; out of
 * scope). Returns the SAME node when mode === "default" (identity preserved).
 */
function reorderEstimateSheetNodeRows(node: EstimateTreeNode, mode: SheetGroupMode, editableRows: Record<string, Partial<EditableRowValue>>): EstimateTreeNode {
  if (mode === "default") return node;

  function groupRows(items: EstimateRowItem[], groupBy: "category" | "supplier"): [string, EstimateRowItem[]][] {
    const groups = new Map<string, EstimateRowItem[]>();
    for (const item of items) {
      const key = groupBy === "supplier" ? item.supplier || "No supplier" : item.category || "General";
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(item);
      } else {
        groups.set(key, [item]);
      }
    }
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
  }

  function orderRows(items: EstimateRowItem[]): EstimateRowItem[] {
    if (items.length <= 1) return items;
    if (mode === "category" || mode === "supplier") {
      return groupRows(items, mode === "category" ? "category" : "supplier").flatMap(([, bucket]) => bucket);
    }
    // cost: high -> low by live editable line total, with stable input-order ties.
    return items
      .map((item, index) => ({ item, index, total: estimateRowItemValue(item, editableRows) }))
      .sort((left, right) => right.total - left.total || left.index - right.index)
      .map(({ item }) => item);
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
  userId?: string | null;
  displayName: string | null;
}) {
  const canUseRealtimeCursor = Boolean(estimateId && ESTIMATE_CURSOR_UUID_PATTERN.test(estimateId));
  const { broadcastCursor, channelStatus, lastSendStatus, remoteCursors } = useEstimateCursorCollaboration({
    estimateId,
    tabId,
    userId,
    displayName,
    enabled: canUseRealtimeCursor,
  });
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const surface = layerRef.current?.closest<HTMLElement>("[data-estimate-pointer-surface]");
    if (!surface || !estimateId || !canUseRealtimeCursor) return;

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
  }, [broadcastCursor, canUseRealtimeCursor, estimateId]);

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
  const markerRefs = useRef<Map<string, HTMLDivElement>>(null!);
  if (markerRefs.current === null) markerRefs.current = new Map();
  const positionsRef = useRef<Map<string, CursorTarget>>(null!);
  if (positionsRef.current === null) positionsRef.current = new Map();
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
      <output className="sr-only" aria-live="polite" data-estimate-cursor-sr>
        {editingAnnouncement}
      </output>
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

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function EstimateSheetContent({
  selectedNodeId,
  nodes = sampleEstimateTree,
  projectId,
  workspaceId,
  estimateId,
  estimateTabs = EMPTY_ESTIMATE_TABS,
  activeTabId,
  loadLimitState,
  sheetAdjustment,
  dataTabId,
  canEditEstimate = false,
  initialTabId,
  disableRouteSync = false,
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
  libraryUseStoredPreferences = true,
  libraryEnableReusableProjectSources = true,
  libraryUsePersistentPanelWidth = !disableRouteSync,
}: EstimateSheetContentProps) {
  reportEstimateSheetContentRender();
  const surfaceVariant = useEstimateSurfaceVariant();
  const tabInitialNodes = dataTabId && dataTabId === initialTabId ? nodes : undefined;
  const { selectedNodeId: activeSelectedNodeId, setSelectedNodeId } = useEstimateWorkspaceSelection(estimateId, selectedNodeId, dataTabId);
  const { toast, dismissToast } = useToast();
  const notifySaveState = useCallback((state: EstimateSaveState, error: EstimateRowMutationError | null) => {
    if (state === "saving" || state === "saved" || state === "idle") {
      dismissToast("estimate-row-save");
      return;
    }
    if (state === "failed") {
      toast({ id: "estimate-row-save", tone: "error", message: error?.message ?? "Could not save." });
    }
  }, [dismissToast, toast]);
  const recordLibraryInsertPayloadRejected = useCallback(
    (reason: EstimateLibraryItemPayloadRejectReason, surface: LibraryInsertPayloadSurface, field?: string) => {
      recordLibraryEvent("insert_payload_rejected", {
        workspaceId,
        projectId,
        estimateId,
        surface: "components",
        action: surface,
        eventName: ADD_LIBRARY_ITEM_EVENT,
        reason,
        field,
      });
    },
    [estimateId, projectId, workspaceId],
  );
  const recordReadOnlyLibraryMutationAttempt = useCallback(
    (action: string) => {
      recordLibraryEvent("authz_denied", {
        workspaceId,
        projectId,
        estimateId,
        resourceKind: "estimate",
        role: "viewer",
        action,
      });
    },
    [estimateId, projectId, workspaceId],
  );
  const broadcastRowUpdate = useEstimateRowUpdateBroadcast({ estimateId, tabId: dataTabId });
  const {
    saveState,
    rowMutationStatuses,
    hasPendingRowMutation,
    markRowDirty: markRowDirtyNow,
    insertRow,
    replaceRow,
    moveRows,
    moveRowItem,
    detachRow,
    promoteRow,
    deleteRow,
    deleteRows,
    restoreDeletedRows,
    updateRow,
  } = useEstimateRowMutations(
    estimateId,
    dataTabId,
    workspaceId,
    projectId,
    notifySaveState,
    broadcastRowUpdate,
  );
  const rowSaveStatusMessage =
    saveState === "saving"
      ? "Saving row changes"
      : saveState === "saved"
        ? "Row changes saved"
        : "";
  const resolvedSheetAdjustment = useMemo(
    () => resolveSheetAdjustment(estimateId ?? "local-estimate", sheetAdjustment),
    [estimateId, sheetAdjustment],
  );
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
  const canMoveRowItems = !didTruncateInitialTree;
  const {
    refetch: refetchActiveTree,
    tree: estimateTree,
    setTree: setEstimateTreeData,
    restore: restoreEstimateTree,
    getTreeRevision: getEstimateTreeRevision,
  } = activeTreeQuery;
  const estimatePointerSurfaceRef = useRef<HTMLDivElement | null>(null);
  const skipEditableRowsSyncRef = useRef(0);
  const accountColumnWidthsSnapshotRef = useRef<string | null>(null);
  const accountColumnWidthsDirtyRef = useRef(false);
  const committedEstimateColumnWidthsRef = useRef(EMPTY_ESTIMATE_COLUMN_WIDTHS);
  const [accountColumnWidthsLoadedEstimateId, setAccountColumnWidthsLoadedEstimateId] = useState<string | null>(null);
  const [contentState, dispatchContentState] = useReducer(
    estimateSheetContentReducer,
    nodes,
    createInitialEstimateSheetContentState,
  );
  const {
    editableRows,
    expressInsertDrafts,
    showCommandPalette,
    collapsedNodeIdsByScope,
    bulkSelectedRowIds,
    isProposalPreviewOpen,
    proposalPreviewScope,
    proposalPreviewModel,
    proposalPreviewSignature,
    isDownloadingProposal,
    proposalDownloadError,
    proposalExportSettings,
    inspector,
    rowDetails,
    rowComponentPicker,
    rowComponentPickerQuery,
    projectSpecificRowId,
    promotingRowId,
    activityFilters,
    historyData,
    isHistoryLoading,
    isHistoryLoadingMore,
    historyError,
    createTabState,
    sheetSearchQuery,
    sheetFacets,
    sheetGroupMode,
  } = contentState;
  const [sourcesDrawerOpen, setSourcesDrawerOpen] = useState(false);
  const [rowMoveDialog, setRowMoveDialog] = useState<RowMoveDialogState | null>(null);
  const [componentEditor, setComponentEditor] = useState<{ rowItemId: string; opener: HTMLElement | null } | null>(null);
  const [componentEditorPendingRowIds, setComponentEditorPendingRowIds] = useState<ReadonlySet<string>>(() => new Set());
  const [editableRowStore] = useState(() => createEditableRowStore(editableRows, estimateTree));
  const setEditableRows = useStableCallback((value: SetStateAction<Record<string, EditableRowValue>>) => {
    const nextRows = typeof value === "function"
      ? (value as (current: Record<string, EditableRowValue>) => Record<string, EditableRowValue>)(editableRowStore.getState().rows)
      : value;
    editableRowStore.getState().replaceRows(nextRows);
    dispatchContentState(estimateSheetContentFieldAction("editableRows", nextRows));
  });
  const setExpressInsertDrafts = useStableCallback((value: SetStateAction<Record<string, ExpressInsertDraft>>) => {
    dispatchContentState(estimateSheetContentFieldAction("expressInsertDrafts", value));
  });
  useEffect(() => {
    editableRowStore.getState().syncTree(estimateTree);
  }, [editableRowStore, estimateTree]);
  const setShowCommandPalette = useStableCallback((value: SetStateAction<boolean>) => {
    dispatchContentState(estimateSheetContentFieldAction("showCommandPalette", value));
  });
  const setCollapsedNodeIdsByScope = useStableCallback((value: SetStateAction<Record<string, string[]>>) => {
    dispatchContentState(estimateSheetContentFieldAction("collapsedNodeIdsByScope", value));
  });
  const setBulkSelectedRowIds = useStableCallback((value: SetStateAction<Set<string>>) => {
    dispatchContentState(estimateSheetContentFieldAction("bulkSelectedRowIds", value));
  });
  const setIsProposalPreviewOpen = useStableCallback((value: SetStateAction<boolean>) => {
    dispatchContentState(estimateSheetContentFieldAction("isProposalPreviewOpen", value));
  });
  const setProposalPreviewScope = useStableCallback((value: SetStateAction<ProposalExportPreviewScope>) => {
    dispatchContentState(estimateSheetContentFieldAction("proposalPreviewScope", value));
  });
  const setProposalPreviewModel = useStableCallback((value: SetStateAction<ProposalExportModel | null>) => {
    dispatchContentState(estimateSheetContentFieldAction("proposalPreviewModel", value));
  });
  const setProposalPreviewSignature = useStableCallback((value: SetStateAction<string>) => {
    dispatchContentState(estimateSheetContentFieldAction("proposalPreviewSignature", value));
  });
  const setIsDownloadingProposal = useStableCallback((value: SetStateAction<boolean>) => {
    dispatchContentState(estimateSheetContentFieldAction("isDownloadingProposal", value));
  });
  const setProposalDownloadError = useStableCallback((value: SetStateAction<string | null>) => {
    dispatchContentState(estimateSheetContentFieldAction("proposalDownloadError", value));
  });
  const setProposalExportSettings = useStableCallback((value: SetStateAction<ProposalExportUserSettings>) => {
    dispatchContentState(estimateSheetContentFieldAction("proposalExportSettings", value));
  });
  const setInspector = useStableCallback((value: SetStateAction<EstimateActivityScope | null>) => {
    dispatchContentState(estimateSheetContentFieldAction("inspector", value));
  });
  const setRowDetails = useStableCallback((value: SetStateAction<RowDetailsState | null>) => {
    dispatchContentState(estimateSheetContentFieldAction("rowDetails", value));
  });
  const setRowComponentPicker = useStableCallback((value: SetStateAction<RowComponentPickerState | null>) => {
    dispatchContentState(estimateSheetContentFieldAction("rowComponentPicker", value));
  });
  const setRowComponentPickerQuery = useStableCallback((value: SetStateAction<string>) => {
    dispatchContentState(estimateSheetContentFieldAction("rowComponentPickerQuery", value));
  });
  const setProjectSpecificRowId = useStableCallback((value: SetStateAction<string>) => {
    dispatchContentState(estimateSheetContentFieldAction("projectSpecificRowId", value));
  });
  const setPromotingRowId = useStableCallback((value: SetStateAction<string | null>) => {
    dispatchContentState(estimateSheetContentFieldAction("promotingRowId", value));
  });
  const setActivityFilters = useStableCallback((value: SetStateAction<ActivityFilterState>) => {
    dispatchContentState(estimateSheetContentFieldAction("activityFilters", value));
  });
  const setHistoryData = useStableCallback((value: SetStateAction<EstimateSheetVersionControlData | null>) => {
    dispatchContentState(estimateSheetContentFieldAction("historyData", value));
  });
  const setIsHistoryLoading = useStableCallback((value: SetStateAction<boolean>) => {
    dispatchContentState(estimateSheetContentFieldAction("isHistoryLoading", value));
  });
  const setIsHistoryLoadingMore = useStableCallback((value: SetStateAction<boolean>) => {
    dispatchContentState(estimateSheetContentFieldAction("isHistoryLoadingMore", value));
  });
  const setHistoryError = useStableCallback((value: SetStateAction<string>) => {
    dispatchContentState(estimateSheetContentFieldAction("historyError", value));
  });
  const setCreateTabState = useStableCallback((value: SetStateAction<EstimateCreateTabState>) => {
    dispatchContentState(estimateSheetContentFieldAction("createTabState", value));
  });
  const setSheetSearchQuery = useStableCallback((value: SetStateAction<string>) => {
    dispatchContentState(estimateSheetContentFieldAction("sheetSearchQuery", value));
  });
  const setSheetFacets = useStableCallback((value: SetStateAction<SheetFacetState>) => {
    dispatchContentState(estimateSheetContentFieldAction("sheetFacets", value));
  });
  const setSheetGroupMode = useStableCallback((value: SetStateAction<SheetGroupMode>) => {
    dispatchContentState(estimateSheetContentFieldAction("sheetGroupMode", value));
  });
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
      onCommitWidths: (widths: typeof committedEstimateColumnWidths) => {
        accountColumnWidthsDirtyRef.current = true;
        commitEstimateColumnWidths(estimateId, widths);
      },
      onResetWidths: () => {
        accountColumnWidthsDirtyRef.current = true;
        resetEstimateColumnWidths(estimateId);
      },
    };
  }, [commitEstimateColumnWidths, committedEstimateColumnWidths, estimateColumnResizeEnabled, estimateId, resetEstimateColumnWidths]);

  useEffect(() => {
    if (!estimateColumnResizeEnabled || !estimateId) return;
    hydrateEstimateColumnWidths(estimateId);
  }, [estimateColumnResizeEnabled, estimateId, hydrateEstimateColumnWidths]);

  useEffect(() => {
    committedEstimateColumnWidthsRef.current = committedEstimateColumnWidths;
  }, [committedEstimateColumnWidths]);

  useEffect(() => {
    if (!estimateColumnResizeEnabled || !estimateId || process.env.NODE_ENV === "test") return undefined;
    accountColumnWidthsSnapshotRef.current = null;
    accountColumnWidthsDirtyRef.current = false;
    let cancelled = false;
    void loadEstimateSheetAccountPreferences(estimateId)
      .then((preferences) => {
        if (cancelled) return;
        if (preferences) {
          const snapshot = JSON.stringify(preferences.columnWidths);
          accountColumnWidthsSnapshotRef.current = snapshot;
          if (!accountColumnWidthsDirtyRef.current) {
            commitEstimateColumnWidths(estimateId, preferences.columnWidths);
          }
          return;
        }
        if (!accountColumnWidthsDirtyRef.current) {
          accountColumnWidthsSnapshotRef.current = JSON.stringify(committedEstimateColumnWidthsRef.current);
        }
      })
      .catch(() => {
        if (!cancelled && !accountColumnWidthsDirtyRef.current) {
          accountColumnWidthsSnapshotRef.current = JSON.stringify(committedEstimateColumnWidthsRef.current);
        }
      })
      .finally(() => {
        if (!cancelled) setAccountColumnWidthsLoadedEstimateId(estimateId);
      });
    return () => {
      cancelled = true;
    };
  }, [commitEstimateColumnWidths, estimateColumnResizeEnabled, estimateId]);

  useEffect(() => {
    if (!estimateColumnResizeEnabled || !estimateId || process.env.NODE_ENV === "test") return undefined;
    if (accountColumnWidthsLoadedEstimateId !== estimateId) return undefined;
    if (accountColumnWidthsSnapshotRef.current === null) return undefined;
    const snapshot = JSON.stringify(committedEstimateColumnWidths);
    if (accountColumnWidthsSnapshotRef.current === snapshot) return undefined;
    accountColumnWidthsSnapshotRef.current = snapshot;
    const timer = window.setTimeout(() => {
      void saveEstimateSheetAccountPreferences({
        estimateId,
        columnWidths: committedEstimateColumnWidths,
      })
        .then((result) => {
          if (result.ok) accountColumnWidthsDirtyRef.current = false;
        })
        .catch(() => undefined);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [accountColumnWidthsLoadedEstimateId, committedEstimateColumnWidths, estimateColumnResizeEnabled, estimateId]);

  const expressInsertDraftStates = useMemo<Record<string, ExpressInsertDraftState>>(
    () => Object.fromEntries(Object.entries(expressInsertDrafts).map(([rowId, draft]) => [rowId, draft.status])),
    [expressInsertDrafts],
  );
  // C3/Req 13: ref to the tab strip's imperative handle so the middle-panel
  // header can trigger createTab without prop-drilling.
  const tabStripRef = useRef<EstimateTabStripHandle | null>(null);
  // Lazy library path: production pages no longer pass library props, so the
  // dataset loads through a server action once the sidebar (or palette) needs
  // it. Server-provided props short-circuit the fetch for tests/embeds.
  const hasServerProvidedLibrary = Boolean(libraryItems);
  const shouldLoadLibraryLazily = !hasServerProvidedLibrary && Boolean(projectId && estimateId);
  const libraryIntentActive = showCommandPalette || rowComponentPicker?.mode === "replace" || sourcesDrawerOpen;
  const libraryReleaseKey = shouldLoadLibraryLazily && renderSidebar && projectId && estimateId
    ? `${projectId}:${estimateId}`
    : null;
  const [releasedLibrarySidebarKey, setReleasedLibrarySidebarKey] = useState<string | null>(null);
  const delayedLibrarySidebarReleased = libraryReleaseKey !== null && releasedLibrarySidebarKey === libraryReleaseKey;
  useEffect(() => {
    if (!libraryReleaseKey || libraryIntentActive || delayedLibrarySidebarReleased) {
      return undefined;
    }

    let frameId: number | null = null;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const releaseSidebar = () => setReleasedLibrarySidebarKey(libraryReleaseKey);

    frameId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        if (typeof window.requestIdleCallback === "function") {
          idleId = window.requestIdleCallback(releaseSidebar, { timeout: 400 });
          return;
        }
        releaseSidebar();
      }, ESTIMATE_LIBRARY_POST_PAINT_DELAY_MS);
    });

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [delayedLibrarySidebarReleased, libraryIntentActive, libraryReleaseKey]);
  const libraryQueryCanRun = !shouldLoadLibraryLazily || libraryIntentActive || delayedLibrarySidebarReleased;
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
    enabled: shouldLoadLibraryLazily && libraryQueryCanRun,
    staleTime: 5 * 60 * 1000,
    // U19: keep the warmed cache long after navigate-away so returning to the
    // estimate doesn't re-run the cold load (it's workspace-global + mutation-invalidated).
    gcTime: 30 * 60 * 1000,
  });
  const lazyLibrary = shouldLoadLibraryLazily ? lazyLibraryData : undefined;
  const librarySidebarCanHydrate = !shouldLoadLibraryLazily || libraryIntentActive || delayedLibrarySidebarReleased || Boolean(lazyLibrary);
  const isLazyLibraryLoading = shouldLoadLibraryLazily && !lazyLibrary && !isLazyLibraryError;
  const resolvedLibraryItems = libraryItems ?? lazyLibrary?.libraryItems;
  const sheetCatalogueInputs = useMemo(
    () => libraryIntentActive
      ? collectEstimateTreeComponentCatalogueInputs(estimateTree)
      : EMPTY_COMPONENT_CATALOGUE_INPUTS,
    [estimateTree, libraryIntentActive],
  );
  const resolvedSupplierOptions = useMemo(
    () => buildComponentCatalogueComboboxOptions("supplier", [
      ...(librarySuppliers ?? lazyLibrary?.suppliers ?? []),
      ...((resolvedLibraryItems ?? EMPTY_ESTIMATE_ROW_ITEMS).map((item) => ({
        id: item.supplierId,
        name: item.supplier,
        searchText: [item.material, item.name, item.category].filter(Boolean).join(" "),
      }))),
      ...sheetCatalogueInputs.suppliers,
    ]),
    [lazyLibrary?.suppliers, librarySuppliers, resolvedLibraryItems, sheetCatalogueInputs.suppliers],
  );
  const resolvedBrandOptions = useMemo(
    () => buildComponentCatalogueComboboxOptions("brand", [
      ...(libraryBrands ?? lazyLibrary?.brands ?? []),
      ...((resolvedLibraryItems ?? EMPTY_ESTIMATE_ROW_ITEMS).map((item) => ({
        id: item.brandId,
        name: item.brand,
        searchText: [item.material, item.name, item.category, item.supplier].filter(Boolean).join(" "),
      }))),
      ...sheetCatalogueInputs.brands,
    ]),
    [lazyLibrary?.brands, libraryBrands, resolvedLibraryItems, sheetCatalogueInputs.brands],
  );
  const queryClient = useQueryClient();
  // Library mutations in the sidebar update its local state and persist every
  // linked estimate-row projection. Refresh the mounted tree as well so the
  // current sheet converges immediately instead of waiting for navigation.
  // Non-exact invalidation on the shared prefix covers both the lite (panel) and
  // full (editor) datasets. PERF-7: refetchType "none" marks the heavy lite
  // dataset stale without eagerly refetching it while the panel is open — the
  // sidebar's local optimistic state is already correct, and the next cold mount
  // reseeds fresh. Avoids a full-library refetch after common in-panel actions.
  const handleLibraryDataChanged = useStableCallback(() => {
    if (workspaceId) void queryClient.invalidateQueries({ queryKey: workspaceComponentLibraryQueryKey(workspaceId), refetchType: "none" });
    void refetchActiveTree();
  });
  const refetchProjectComponentProjection = useStableCallback(() => {
    // Project-row mutations can alter the mounted Project tab projection. Keep
    // active sidebar observers reconciled even when the row mutation already
    // applied an optimistic cache patch.
    if (workspaceId) void queryClient.invalidateQueries({ queryKey: workspaceComponentLibraryLiteQueryKey(workspaceId, projectId), refetchType: "active" });
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
  const {
    changeProposalExportSettings,
    closeProposalPreview,
    downloadProposalExport,
    openProposalPreview,
    proposalPreviewScopeControls,
    proposalPreviewStatus,
    refreshProposalPreview,
  } = useEstimateProposalPreview({
    projectId,
    estimateId,
    activeTabId,
    dataTabId,
    estimateTabs,
    estimateTree,
    editableRows,
    getEditableRows: () => editableRowStore.getState().rows,
    sheetAdjustment: resolvedSheetAdjustment,
    resolvedProposalExportMetadata,
    isProposalPreviewOpen,
    proposalPreviewScope,
    proposalPreviewModel,
    proposalPreviewSignature,
    isDownloadingProposal,
    proposalDownloadError,
    proposalExportSettings,
    setIsProposalPreviewOpen,
    setProposalPreviewScope,
    setProposalPreviewModel,
    setProposalPreviewSignature,
    setIsDownloadingProposal,
    setProposalDownloadError,
    setProposalExportSettings,
  });
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
  const estimateTreeIndex = useMemo(() => createEstimateTreeIndex(estimateTree), [estimateTree]);
  const handleComponentEditorPendingChange = useStableCallback((item: EstimateRowItem, pending: boolean) => {
    setComponentEditorPendingRowIds(
      pending ? new Set(getEstimateComponentInstanceRowIds(estimateTreeIndex, item.id)) : new Set(),
    );
  });
  const selectedNodePresentation = useMemo(() => {
    const selectedNodeLocation = resolvedSelectedNodeId ? estimateTreeIndex.nodesById.get(resolvedSelectedNodeId) : undefined;
    if (!selectedNodeLocation) return EMPTY_SELECTED_NODE_PRESENTATION;
    return {
      nodeCode: selectedNodeLocation.nodeCode,
      ancestorPath: selectedNodeLocation.ancestorNodes.map((node) => ({ id: node.id, name: node.name })),
    };
  }, [estimateTreeIndex, resolvedSelectedNodeId]);
  const sheetSearchActive = sheetSearchQuery.trim().length > 0;
  // D2 / Req 10 (middle): faceted filter + within-area group/sort. Client state
  // only; both compose into `displayedSheetNode` and NEVER reach the rows.
  const facetsActive = sheetFacetsActive(sheetFacets);
  const groupActive = sheetGroupMode !== "default";
  const activeDisplayDraftRevision = useStore(
    editableRowStore,
    (state) => (facetsActive || groupActive ? state.revision : 0),
  );
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
    const currentEditableRows = editableRowStore.getState().rows;
    if (node && facetsActive) node = filterEstimateSheetNodeByFacets(node, sheetFacets, currentEditableRows);
    if (node && groupActive) node = reorderEstimateSheetNodeRows(node, sheetGroupMode, currentEditableRows);
    return node;
  }, [activeDisplayDraftRevision, editableRowStore, facetsActive, groupActive, selectedNode, sheetFacets, sheetGroupMode, sheetSearchActive, sheetSearchQuery]);
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
  }, [collapsedScopeKey, setCollapsedNodeIdsByScope]);
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
  }, [setBulkSelectedRowIds, visibleSheetRowIds]);

  const toggleRowSelection = useCallback((rowItemId: string, checked: boolean) => {
    setBulkSelectedRowIds((current) => {
      const next = new Set(current);
      if (checked) next.add(rowItemId);
      else next.delete(rowItemId);
      return next;
    });
  }, [setBulkSelectedRowIds]);
  const toggleRowsSelection = useCallback((rowItemIds: string[], checked: boolean) => {
    setBulkSelectedRowIds((current) => {
      const next = new Set(current);
      rowItemIds.forEach((rowId) => {
        if (checked) next.add(rowId);
        else next.delete(rowId);
      });
      return next;
    });
  }, [setBulkSelectedRowIds]);
  const clearRowSelection = useCallback(() => setBulkSelectedRowIds(new Set()), [setBulkSelectedRowIds]);
  const bulkSelectedRowCount = bulkSelectedRowIds.size;
  // P6 single-node model: a row OR a template/subtree inserts directly into ANY
  // selected node — no kind gate, no ancestor-group resolution, no area-wrap.
  const insertTargetNodeId = selectedNode?.id ?? "";
  const templateTargetParentNode = selectedNode ?? null;
  const canInsertIntoSelectedNode = Boolean(insertTargetNodeId);
  const canInsertTemplateIntoSelectedNode = Boolean(templateTargetParentNode);
  const insertionTargetLabel = selectedNode?.name ?? "selected area";
  const templateInsertionTargetLabel = templateTargetParentNode?.name ?? "selected area";
  const estimateNodeTotals = useStore(editableRowStore, (state) => state.nodeTotals);
  const projectTotal = useStore(editableRowStore, (state) => state.projectTotal);
  const displayedNodeTotals = useMemo(() => {
    if (!displayedSheetNode) return EMPTY_NODE_TOTALS;
    if (displayedSheetNode === selectedNode) return estimateNodeTotals;
    return computeNodeTotals([displayedSheetNode], editableRowStore.getState().rows);
  }, [displayedSheetNode, editableRowStore, estimateNodeTotals, projectTotal, selectedNode]);
  const shouldBuildFlattenedRows = Boolean(inspector || rowDetails || componentEditor || projectSpecificRowId || rowComponentPicker?.mode === "move");
  const activeDetailDraftRevision = useStore(
    editableRowStore,
    (state) => (shouldBuildFlattenedRows ? state.revision : 0),
  );
  const currentEditableRows = editableRowStore.getState().rows;
  const currentRows = useMemo(
    () => (shouldBuildFlattenedRows ? flattenEstimateRows(estimateTree, currentEditableRows) : EMPTY_FLATTENED_ESTIMATE_ROWS),
    [activeDetailDraftRevision, currentEditableRows, estimateTree, shouldBuildFlattenedRows],
  );
  const {
    activityScopeItems,
    closeInspector,
    closeRowDetails,
    loadMoreVersionControl,
    openActivityHistory,
    openRowDetails,
    reloadVersionControl,
    replaceActivityFilters,
    resetActivityFilters,
    selectActivityScope,
    selectedActivityScopeItem,
    selectedRowDetailsItem,
    setRowDetailsTab,
  } = useEstimateHistoryPanel({
    projectId,
    estimateId,
    estimateTree,
    currentRows,
    editableRows: currentEditableRows,
    resolvedProposalExportMetadata,
    projectTotal,
    estimateNodeTotals,
    inspector,
    rowDetails,
    activityFilters,
    historyData,
    isHistoryLoadingMore,
    setInspector,
    setRowDetails,
    setActivityFilters,
    setHistoryData,
    setIsHistoryLoading,
    setIsHistoryLoadingMore,
    setHistoryError,
  });
  const rowComponentPickerSourceItem = useMemo(
    () => (rowComponentPicker ? findEstimateRowItem(estimateTree, rowComponentPicker.rowItemId) : null),
    [estimateTree, rowComponentPicker],
  );
  const rowComponentPickerSourceLabel =
    rowComponentPickerSourceItem?.material || rowComponentPickerSourceItem?.name || "Selected component";
  const componentEditorRow = useMemo(
    () => (componentEditor ? currentRows.find((row) => row.item.id === componentEditor.rowItemId) ?? null : null),
    [componentEditor, currentRows],
  );
  const componentEditorLibraryItems = useMemo(
    () => [
      ...(resolvedLibraryItems ?? EMPTY_ESTIMATE_ROW_ITEMS),
      ...currentRows.map((row) => row.item),
    ],
    [currentRows, resolvedLibraryItems],
  );
  const normalizedRowComponentPickerQuery = rowComponentPickerQuery.trim().toLocaleLowerCase();
  const rowComponentReplaceOptions = useMemo(() => {
    if (rowComponentPicker?.mode !== "replace") return EMPTY_ESTIMATE_ROW_ITEMS;
    const items = resolvedLibraryItems ?? EMPTY_ESTIMATE_ROW_ITEMS;
    if (!normalizedRowComponentPickerQuery) return items.slice(0, 50);
    return items
      .filter((item) =>
        [
          item.name,
          item.material,
          item.brand,
          item.supplier,
          item.category,
          item.unit,
        ].some((value) => value?.toLocaleLowerCase().includes(normalizedRowComponentPickerQuery))
      )
      .slice(0, 50);
  }, [normalizedRowComponentPickerQuery, resolvedLibraryItems, rowComponentPicker?.mode]);
  const rowComponentMoveOptions = useMemo(() => {
    if (rowComponentPicker?.mode !== "move") return [];
    const sourceIsMovable = Boolean(rowComponentPickerSourceItem && !isExpressComponentRow(rowComponentPickerSourceItem));
    return currentRows
      .filter((row) => {
        if (!normalizedRowComponentPickerQuery) return true;
        return [
          row.item.material,
          row.item.brand,
          row.item.supplier,
          row.item.unit,
          row.nodePath.join(" / "),
        ].some((value) => value?.toLocaleLowerCase().includes(normalizedRowComponentPickerQuery));
      })
      .slice(0, 100)
      .map((row) => {
        const isSource = row.item.id === rowComponentPicker.rowItemId;
        return {
          row,
          disabled: !sourceIsMovable || isSource,
          reason: !sourceIsMovable
            ? "Express components must be replaced directly before they can be moved."
            : isSource
              ? "A component cannot be moved into its current row."
              : "",
        };
      });
  }, [currentRows, normalizedRowComponentPickerQuery, rowComponentPicker, rowComponentPickerSourceItem]);
  const projectSpecificRow = useMemo(
    () => (projectSpecificRowId ? currentRows.find((row) => row.item.id === projectSpecificRowId) ?? null : null),
    [currentRows, projectSpecificRowId],
  );
  const closeProjectSpecificDialog = useCallback(() => setProjectSpecificRowId(""), [setProjectSpecificRowId]);
  const projectSpecificDialogRef = useNativeModalDialog(closeProjectSpecificDialog);
  const allNodeIds = useMemo(() => (selectedNode ? collectAllNodeIds([selectedNode]) : []), [selectedNode]);
  const expandAll = useCallback(() => setCollapsedNodeIds(new Set()), [setCollapsedNodeIds]);
  const collapseAll = useCallback(() => setCollapsedNodeIds(new Set(allNodeIds)), [allNodeIds, setCollapsedNodeIds]);
  const requestRootGroupCreate = useCallback(() => {
    window.dispatchEvent(new CustomEvent(REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, { detail: { kind: "group" } }));
  }, []);
  const openTemplateBrowser = useCallback(() => {
    setShowCommandPalette(true);
  }, [setShowCommandPalette]);
  const syncActiveTabRouteUrl = useCallback((nodeId: string | null) => {
    if (disableRouteSync) return;
    if (!projectId || !estimateId || typeof window === "undefined") return;
    const href = nodeId
      ? `/workshop/projects/${projectId}/estimates/${nodeId}`
      : `/workshop/projects/${projectId}/estimates/${estimateId}`;
    if (window.location.pathname === href) return;
    window.history.replaceState(null, "", href);
  }, [disableRouteSync, estimateId, projectId]);
  const openReplaceComponentPicker = useCallback((rowItemId: string, opener: HTMLElement) => {
    setRowComponentPicker({ mode: "replace", rowItemId, opener });
    setRowComponentPickerQuery("");
  }, [setRowComponentPicker, setRowComponentPickerQuery]);
  const openMoveComponentPicker = useCallback((rowItemId: string, opener: HTMLElement) => {
    setRowComponentPicker({ mode: "move", rowItemId, opener });
    setRowComponentPickerQuery("");
  }, [setRowComponentPicker, setRowComponentPickerQuery]);
  const openComponentEditor = useCallback((rowItemId: string, opener: HTMLElement) => {
    setComponentEditor({ rowItemId, opener });
  }, []);
  const closeComponentEditor = useCallback(() => {
    const opener = componentEditor?.opener;
    setComponentEditor(null);
    window.requestAnimationFrame(() => opener?.focus());
  }, [componentEditor?.opener]);
  const closeRowComponentPicker = useCallback(() => {
    const opener = rowComponentPicker?.opener;
    setRowComponentPicker(null);
    setRowComponentPickerQuery("");
    window.requestAnimationFrame(() => opener?.focus());
  }, [rowComponentPicker?.opener, setRowComponentPicker, setRowComponentPickerQuery]);

  useEffect(() => {
    dispatchProjectTotalChange(projectTotal);
  }, [projectTotal]);

  useEffect(() => {
    if (!estimateId || activeSelectedNodeId === resolvedSelectedNodeId) return;
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- Workspace selection lives in the shared estimate store; this route/tab bridge is not parent data handoff.
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
  }, [restoreEstimateTree, setEditableRows]);

  const restoreDeletedRowsFromHistory = useCallback(async ({
    sourceEventId,
    rowIds,
  }: {
    sourceEventId: string;
    rowIds: string[];
  }) => {
    if (!projectId || !estimateId) throw new Error("Estimate context is required to restore deleted rows.");
    const restoreToastId = `estimate-history-row-restore-${sourceEventId}`;
    toast({
      id: restoreToastId,
      tone: "loading",
      message: rowIds.length === 1 ? "Restoring row..." : "Restoring rows...",
      durationMs: null,
    });

    try {
      const restoreResult = await restoreDeletedEstimateRows({
        projectId,
        estimateId,
        sourceEventId,
        rowIds,
      });
      const refreshedTree = await refetchActiveTree();
      const nextTree = refreshedTree.data;
      if (Array.isArray(nextTree)) {
        setEstimateTree(() => nextTree);
        setEditableRows(collectEditableRows(nextTree));
      }
      refetchProjectComponentProjection();
      reloadVersionControl();
      toast({
        id: restoreToastId,
        tone: "success",
        message: `${restoreResult.restoredRowCount} ${restoreResult.restoredRowCount === 1 ? "row" : "rows"} restored.`,
      });
    } catch (error) {
      toast({
        id: restoreToastId,
        tone: "error",
        message: error instanceof Error ? error.message : "Couldn't restore deleted rows. Try again.",
      });
      throw error;
    }
  }, [
    estimateId,
    projectId,
    refetchActiveTree,
    refetchProjectComponentProjection,
    reloadVersionControl,
    setEditableRows,
    setEstimateTree,
    toast,
  ]);

  const restoreDeletedNodesFromHistory = useCallback(async ({
    sourceEventId,
    nodeIds,
  }: {
    sourceEventId: string;
    nodeIds: string[];
  }) => {
    if (!projectId || !estimateId) throw new Error("Estimate context is required to restore deleted Areas.");
    const restoreToastId = `estimate-history-node-restore-${sourceEventId}`;
    toast({
      id: restoreToastId,
      tone: "loading",
      message: nodeIds.length === 1 ? "Restoring Area..." : "Restoring Areas...",
      durationMs: null,
    });

    try {
      const restoreResult = await restoreDeletedEstimateNodes({
        projectId,
        estimateId,
        sourceEventId,
        nodeIds,
        targetTabId: dataTabId,
      });
      setEstimateTree(() => restoreResult.tree);
      setEditableRows(collectEditableRows(restoreResult.tree));
      const restoredNodeId = restoreResult.restoredRootNodeIds[0] ?? restoreResult.restoredNodeIds[0] ?? null;
      if (!resolvedSelectedNodeId && restoredNodeId) {
        setSelectedNodeId(restoredNodeId);
        syncActiveTabRouteUrl(restoredNodeId);
      }
      refetchProjectComponentProjection();
      reloadVersionControl();
      toast({
        id: restoreToastId,
        tone: "success",
        message: `${restoreResult.restoredNodeCount} ${restoreResult.restoredNodeCount === 1 ? "Area" : "Areas"} restored.`,
      });
    } catch (error) {
      toast({
        id: restoreToastId,
        tone: "error",
        message: error instanceof Error ? error.message : "Couldn't restore deleted Areas. Try again.",
      });
      throw error;
    }
  }, [
    dataTabId,
    estimateId,
    projectId,
    refetchProjectComponentProjection,
    reloadVersionControl,
    resolvedSelectedNodeId,
    setEditableRows,
    setEstimateTree,
    setSelectedNodeId,
    syncActiveTabRouteUrl,
    toast,
  ]);

  const {
    clearRowComponent,
    confirmProjectSpecific,
    deleteExpressDraft,
    deleteRowItem,
    deleteSelectedRows,
    insertBlankRow,
    insertIntoSelectedNode,
    insertLibraryItem,
    markRowDirty,
    moveFromComponentPicker,
    moveRowComponent,
    moveRowItemToNode,
    promoteRowToLibrary,
    replaceFromComponentPicker,
    replaceRowItem,
    requestProjectSpecific,
    retryExpressDraft,
    updateRowItem,
  } = useEstimateRowHandlers({
    canEditEstimate,
    canMoveRowItems,
    projectId,
    estimateId,
    activeTabId: dataTabId,
    estimateTree,
    editableRows,
    getEditableRows: () => editableRowStore.getState().rows,
    saveState,
    rowMutationStatuses,
    insertTargetNodeId,
    expressInsertDrafts,
    bulkSelectedRowIds,
    rowComponentPicker,
    projectSpecificRowItem: projectSpecificRow?.item ?? null,
    markRowDirtyNow,
    insertRow,
    replaceRow,
    moveRows,
    moveRowItem,
    hasPendingRowMutation,
    detachRow,
    promoteRow,
    deleteRow,
    deleteRows,
    restoreDeletedRows,
    updateRow,
    setEstimateTree,
    setEditableRows,
    setExpressInsertDrafts,
    setBulkSelectedRowIds,
    setProjectSpecificRowId,
    setPromotingRowId,
    skipEditableRowsSyncRef,
    getEstimateTreeRevision,
    restoreEstimateState,
    closeRowComponentPicker,
    handleLibraryDataChanged,
    recordReadOnlyLibraryMutationAttempt,
    toast,
  });
  const updateComponentFromEditor = useStableCallback((item: EstimateRowItem, instanceSync?: LibraryComponentInstanceSyncResult) => {
    const values = {
      name: item.material,
      description: item.description,
      brand: item.brand ?? "",
      supplier: item.supplier,
      unit: item.unit,
      unitCost: String(item.itemCost),
      imageUrl: item.imageUrl ?? "",
      sourceUrl: item.sourceUrl ?? "",
      category: item.category,
      categoryNodeId: item.categoryNodeId ?? null,
      brandId: item.brandId ?? null,
      supplierId: item.supplierId ?? null,
      sku: item.sku ?? null,
      priceOptionId: item.priceOptionId ?? null,
      priceOptionLabel: item.priceOptionLabel ?? null,
      priceOptions: item.priceOptions,
      pricingDate: item.pricingDate ?? null,
      pricingSource: item.pricingSource ?? null,
      lifecycleState: item.lifecycleState ?? null,
      lifecycleStateChangedAt: item.lifecycleStateChangedAt ?? null,
      notes: item.notes ?? null,
    };
    if (item.sourceLibraryItemId && item.linkState !== "detached" && item.linkState !== "unlinked") {
      const patch: EstimateRowItemPatch = {
        material: item.material,
        description: item.description,
        brand: item.brand ?? null,
        supplier: item.supplier,
        unit: item.unit,
        itemCost: item.itemCost,
        imageUrl: item.imageUrl ?? null,
        sourceUrl: item.sourceUrl ?? null,
        category: item.category,
        categoryNodeId: item.categoryNodeId ?? null,
        brandId: item.brandId ?? null,
        supplierId: item.supplierId ?? null,
        sku: item.sku ?? null,
        priceOptionId: item.priceOptionId ?? null,
        priceOptionLabel: item.priceOptionLabel ?? null,
        priceOptions: item.priceOptions,
        pricingDate: item.pricingDate ?? null,
        pricingSource: item.pricingSource ?? null,
        lifecycleState: item.lifecycleState ?? null,
        lifecycleStateChangedAt: item.lifecycleStateChangedAt ?? null,
        componentVersionNumber: item.componentVersionNumber ?? null,
        notes: item.notes ?? null,
        updatedAt: item.updatedAt ?? null,
        linkState: "linked-clean",
      };
      if (workspaceId && item.sourceLibraryItemId) {
        queryClient.setQueryData<ComponentLibraryDataset>(lazyLibraryQueryKey, (current) => current ? {
          ...current,
          libraryItems: current.libraryItems.map((libraryItem) => (
            libraryItem.id === item.sourceLibraryItemId
              ? { ...applyEstimateRowItemPatch(libraryItem, patch), id: libraryItem.id }
              : libraryItem
          )),
        } : current);
      }
      let patchedTree = estimateTree;
      setEstimateTree((current) => {
        patchedTree = patchComponentInstanceRowsInTree(current, item.id, patch);
        if (instanceSync && Object.keys(instanceSync.rowRevisions).length > 0) {
          patchedTree = patchEstimateRowItemsInTree(
            patchedTree,
            Object.fromEntries(Object.entries(instanceSync.rowRevisions).map(([rowId, rowRevision]) => [rowId, { rowRevision }])),
          );
        }
        return patchedTree;
      });
      setEditableRows(collectEditableRows(patchedTree));
      handleLibraryDataChanged();
      if (workspaceId) void queryClient.invalidateQueries({ queryKey: workspaceComponentLibraryQueryKey(workspaceId), refetchType: "active" });
      return;
    }
    updateRowItem(item.id, values);
  });

  const rowMoveNodeOptions = useMemo(
    () => rowMoveDialog ? collectRowMoveNodeOptions(estimateTree) : EMPTY_ROW_MOVE_NODE_OPTIONS,
    [estimateTree, rowMoveDialog],
  );
  const rowMoveSourceItem = useMemo(
    () => (rowMoveDialog ? findEstimateRowItem(estimateTree, rowMoveDialog.rowItemId) : null),
    [estimateTree, rowMoveDialog],
  );
  const rowMoveSourceContext = useMemo(
    () => (rowMoveDialog ? findRowItemNodeContext(estimateTree, rowMoveDialog.rowItemId) : null),
    [estimateTree, rowMoveDialog],
  );
  const rowMoveTargetNode = useMemo(
    () => (rowMoveDialog ? findEstimateNode(estimateTree, rowMoveDialog.targetNodeId) : null),
    [estimateTree, rowMoveDialog],
  );
  const rowMovePositionOptions = useMemo(() => {
    const targetRows = rowMoveTargetNode?.estimateRowItems ?? [];
    if (targetRows.length === 0) return [{ value: "end", label: "Empty area" }];
    const options = [{ value: "start", label: "Top of area" }];
    for (const item of targetRows) {
      if (item.id === rowMoveDialog?.rowItemId) continue;
      options.push({
        value: `after:${item.id}`,
        label: `After ${item.material || item.name || "row"}`,
      });
    }
    options.push({ value: "end", label: "Bottom of area" });
    return options;
  }, [rowMoveDialog?.rowItemId, rowMoveTargetNode]);
  const closeRowMoveDialog = useCallback(() => {
    const opener = rowMoveDialog?.opener;
    setRowMoveDialog(null);
    window.requestAnimationFrame(() => opener?.focus());
  }, [rowMoveDialog?.opener]);
  const openMoveRowItemDialog = useCallback((rowItemId: string, opener: HTMLElement) => {
    const sourceContext = findRowItemNodeContext(estimateTree, rowItemId);
    const targetNodeId = sourceContext?.nodeId ?? resolvedSelectedNodeId ?? estimateTree[0]?.id ?? "";
    if (!targetNodeId) return;
    setRowMoveDialog({
      rowItemId,
      opener,
      targetNodeId,
      position: "end",
    });
  }, [estimateTree, resolvedSelectedNodeId]);
  const confirmRowMoveDialog = useCallback(() => {
    if (!rowMoveDialog || !rowMoveTargetNode) return;
    const targetIndex = resolveRowMoveDialogTargetIndex(rowMoveDialog.position, rowMoveTargetNode);
    const moved = moveRowItemToNode(rowMoveDialog.rowItemId, rowMoveDialog.targetNodeId, targetIndex);
    if (moved !== false) closeRowMoveDialog();
  }, [closeRowMoveDialog, moveRowItemToNode, rowMoveDialog, rowMoveTargetNode]);

  const {
    insertTemplateIntoSelectedGroup,
    insertTemplatesIntoParentById,
    insertTemplateNodeIntoParentById,
    insertTemplateNodeIntoSelectedGroup,
  } = useEstimateTemplateInsertion({
    canEditEstimate,
    projectId,
    estimateId,
    dataTabId,
    estimateTree,
    editableRows,
    templateById,
    templateTargetParentNode,
    setEstimateTree,
    setEditableRows,
    setSelectedNodeId,
    getEstimateTreeRevision,
    restoreEstimateState,
    recordReadOnlyLibraryMutationAttempt,
    toast,
  });

  // U2: insert a project-derived source (whole tab / node subtree) as a child of
  // a target node. Non-optimistic — the server copies the subtree via the
  // hardened RPC and returns the refreshed tree. P6: any node is a valid target
  // (no group gate); the relaxed insert_estimate_subtree RPC accepts it.
  const insertProjectSourceIntoParentById = useStableCallback(
    async (targetParentNodeId: string, source: { projectId: string; estimateId: string; tabId: string; nodeId: string | null }) => {
      if (!canEditEstimate) {
        recordReadOnlyLibraryMutationAttempt("insert_project_source");
        return false;
      }
      const targetParentNode = findEstimateNode(estimateTree, targetParentNodeId);
      if (!targetParentNode) return false;
      if (!projectId || !estimateId) return false;
      const projectSourceRequestRevision = getEstimateTreeRevision();

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
        if (getEstimateTreeRevision() === projectSourceRequestRevision) setEstimateTree(() => result.tree);
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

  useEffect(() => {
    function handleCommandPaletteShortcut(event: globalThis.KeyboardEvent) {
      if (event.defaultPrevented) return;
      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = activeElement?.tagName;
      const isTypingTarget = activeElement?.isContentEditable || activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
      const hasBlockingDialog = Boolean(document.querySelector("dialog[open], [role='dialog'], [role='alertdialog']"));

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
  }, [setShowCommandPalette]);

  const handleSidebarAddLibraryItemEvent = useEffectEvent((event: Event) => {
    const customEvent = event as CustomEvent<unknown>;
    const result = readAddLibraryItemEventDetail(customEvent.detail);
    if (!result.ok) {
      recordLibraryInsertPayloadRejected(result.reason, "custom_event", result.field);
      result.onAccepted?.(false);
      customEvent.preventDefault();
      return;
    }
    const targetNodeId = result.targetNodeId ?? insertTargetNodeId;
    if (!targetNodeId) {
      result.onAccepted?.(false);
      customEvent.preventDefault();
      return;
    }
    const accepted = insertLibraryItem(targetNodeId, result.item);
    result.onAccepted?.(accepted);
    if (!accepted) customEvent.preventDefault();
  });

  useEffect(() => {
    function handleSidebarAdd(event: Event) {
      handleSidebarAddLibraryItemEvent(event);
    }
    window.addEventListener(ADD_LIBRARY_ITEM_EVENT, handleSidebarAdd);
    return () => window.removeEventListener(ADD_LIBRARY_ITEM_EVENT, handleSidebarAdd);
  }, []);

  // U2: a project source dropped onto a group row hands the insert over here (the
  // sheet owns the tree + the action), mirroring the template-drop event flow.
  useEffect(() => {
    if (!libraryEnableReusableProjectSources) return undefined;
    function handleInsertProjectSourceEvent(event: Event) {
      const detail = readInsertProjectSourceEventDetail((event as CustomEvent<unknown>).detail);
      if (!detail) return;
      insertProjectSourceIntoParentById(detail.targetParentNodeId, detail.source);
    }
    window.addEventListener(INSERT_PROJECT_SOURCE_EVENT, handleInsertProjectSourceEvent);
    return () => window.removeEventListener(INSERT_PROJECT_SOURCE_EVENT, handleInsertProjectSourceEvent);
  }, [insertProjectSourceIntoParentById, libraryEnableReusableProjectSources]);

  useEffect(() => {
    function handleMoveRowItemEvent(event: Event) {
      const detail = readRequestEstimateRowItemMoveEventDetail((event as CustomEvent<unknown>).detail);
      if (!detail) return;
      moveRowItemToNode(detail.rowItemId, detail.targetNodeId, detail.targetIndex, { targetPlacement: detail.targetPlacement });
    }
    window.addEventListener(REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT, handleMoveRowItemEvent);
    return () => window.removeEventListener(REQUEST_ESTIMATE_ROW_ITEM_MOVE_EVENT, handleMoveRowItemEvent);
  }, [moveRowItemToNode]);

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
      {isProposalPreviewOpen ? (
        <ProposalExportPreviewDialog
          open={isProposalPreviewOpen}
          model={proposalPreviewModel}
          status={proposalPreviewStatus}
          onDownload={downloadProposalExport}
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
          onRestoreDeletedNodes={canEditEstimate ? restoreDeletedNodesFromHistory : undefined}
          onRestoreDeletedRows={canEditEstimate ? restoreDeletedRowsFromHistory : undefined}
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
      {componentEditor && componentEditorRow ? (
        <AddComponentModal
          open
          editingItem={componentEditorRow.item}
          folders={libraryFolders ?? lazyLibrary?.libraryFolders ?? []}
          categoryTree={libraryCategoryTree ?? lazyLibrary?.categoryTree ?? []}
          suppliers={librarySuppliers ?? lazyLibrary?.suppliers ?? []}
          brands={libraryBrands ?? lazyLibrary?.brands ?? []}
          libraryItems={componentEditorLibraryItems}
          selectedFolderId={null}
          imageUploadProjectId={projectId ?? null}
          onOpenChange={(open) => {
            if (!open) closeComponentEditor();
          }}
          onComponentCreated={() => undefined}
          onComponentUpdated={updateComponentFromEditor}
          onComponentUpdatePendingChange={handleComponentEditorPendingChange}
          catalogueOptionsStorageScope={projectId ?? estimateId ?? "estimate-component-editor"}
        />
      ) : null}
      {rowComponentPicker ? (
        <Modal
          open
          title={rowComponentPicker.mode === "replace" ? "Replace component" : "Move component"}
          description={rowComponentPicker.mode === "replace"
            ? "Choose a library component for this estimate row."
            : "Choose the row that should receive this component."}
          size="md"
          closeLabel={rowComponentPicker.mode === "replace" ? "Close replace component picker" : "Close move component picker"}
          onOpenChange={(open) => {
            if (!open) closeRowComponentPicker();
          }}
          bodyClassName="max-h-[min(480px,70dvh)] overflow-auto"
        >
          <div className="grid gap-3 text-[10px] leading-4">
            <div className="grid gap-1 rounded-xs border border-hairline bg-surfaceMuted p-2">
              <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Current component</p>
              <p className="font-medium text-ink">{rowComponentPickerSourceLabel}</p>
              {rowComponentPickerSourceItem ? (
                <p className="text-tertiary">
                  {rowComponentPickerSourceItem.supplier || "No supplier"} · {pesoFormatter.format(rowComponentPickerSourceItem.itemCost)} / {rowComponentPickerSourceItem.unit}
                </p>
              ) : (
                <p className="text-tertiary">This row could not be found in the current sheet.</p>
              )}
            </div>
            <label className="grid gap-1">
              <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">
                {rowComponentPicker.mode === "replace" ? "Search library" : "Search rows"}
              </span>
              <input
                aria-label={rowComponentPicker.mode === "replace" ? "Component search" : "Move target search"}
                value={rowComponentPickerQuery}
                onChange={(event) => setRowComponentPickerQuery(event.currentTarget.value)}
                className="h-8 rounded-xs border border-hairline bg-white px-2 text-[11px] font-medium text-ink outline-none transition placeholder:text-tertiary hover:border-tertiary focus:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40"
                placeholder={rowComponentPicker.mode === "replace" ? "Find component" : "Find target row"}
              />
            </label>
            {rowComponentPicker.mode === "replace" ? (
              <menu className="m-0 grid list-none gap-1 p-0" aria-label="Replacement components">
                {isLazyLibraryLoading ? (
                  <p className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-tertiary">
                    Loading library components...
                  </p>
                ) : rowComponentReplaceOptions.length > 0 ? rowComponentReplaceOptions.map((item) => {
                  const itemLabel = item.material || item.name || "Component";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="grid gap-0.5 rounded-xs border border-hairline bg-white px-2 py-1.5 text-left hover:border-brand-orange hover:bg-brand-orange/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-orange"
                      aria-label={`Replace with ${itemLabel}`}
                      onClick={() => replaceFromComponentPicker(item)}
                    >
                      <span className="font-medium text-ink">{itemLabel}</span>
                      <span className="truncate text-tertiary">
                        {item.supplier || "No supplier"} · {pesoFormatter.format(item.itemCost)} / {item.unit}
                      </span>
                    </button>
                  );
                }) : (
                  <p className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-tertiary">
                    No matching library components.
                  </p>
                )}
              </menu>
            ) : (
              <menu className="m-0 grid list-none gap-1 p-0" aria-label="Move target rows">
                {rowComponentMoveOptions.length > 0 ? rowComponentMoveOptions.map((option) => {
                  const itemLabel = option.row.item.material || option.row.item.name || "Component";
                  const pathLabel = option.row.nodePath.join(" / ") || "Current area";
                  return (
                    <button
                      key={option.row.item.id}
                      type="button"
                      className={cn(
                        "grid gap-0.5 rounded-xs border border-hairline bg-white px-2 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-orange",
                        option.disabled
                          ? "cursor-not-allowed text-tertiary opacity-60"
                          : "hover:border-brand-orange hover:bg-brand-orange/5",
                      )}
                      aria-label={`Move to ${itemLabel}`}
                      title={option.reason || `Move to ${itemLabel}`}
                      disabled={option.disabled}
                      onClick={() => moveFromComponentPicker(option.row.item.id)}
                    >
                      <span className="font-medium text-ink">{itemLabel}</span>
                      <span className="truncate text-tertiary">{pathLabel}</span>
                      {option.reason ? <span className="text-[9px] text-tertiary">{option.reason}</span> : null}
                    </button>
                  );
                }) : (
                  <p className="rounded-xs border border-dashed border-hairline bg-surfaceMuted p-2 text-tertiary">
                    No matching target rows.
                  </p>
                )}
              </menu>
            )}
          </div>
        </Modal>
      ) : null}
      {rowMoveDialog ? (
        <Modal
          open
          title="Move row"
          description="Target area and insertion point."
          size="sm"
          closeLabel="Close move row dialog"
          onOpenChange={(open) => {
            if (!open) closeRowMoveDialog();
          }}
        >
          <div className="grid gap-3 text-[10px] leading-4">
            <div className="grid gap-1 rounded-xs border border-hairline bg-surfaceMuted p-2">
              <p className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Current row</p>
              <p className="font-medium text-ink">{rowMoveSourceItem?.material || rowMoveSourceItem?.name || "Selected row"}</p>
              <p className="text-tertiary">{rowMoveSourceContext?.nodePath.join(" / ") || "Current area"}</p>
            </div>
            <label className="grid gap-1">
              <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Target area</span>
              <select
                aria-label="Target area"
                value={rowMoveDialog.targetNodeId}
                onChange={(event) => {
                  const targetNodeId = event.currentTarget.value;
                  setRowMoveDialog((current) => current ? { ...current, targetNodeId, position: "end" } : current);
                }}
                className="h-8 rounded-xs border border-hairline bg-white px-2 text-[11px] font-medium text-ink outline-none transition hover:border-tertiary focus:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40"
              >
                {rowMoveNodeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${"  ".repeat(option.depth)}${option.name} (${option.rowCount})`}
                  </option>
                ))}
              </select>
              <span className="truncate text-[9px] leading-3 text-tertiary">
                {rowMoveNodeOptions.find((option) => option.id === rowMoveDialog.targetNodeId)?.path || ""}
              </span>
            </label>
            <label className="grid gap-1">
              <span className="text-[8px] font-medium uppercase tracking-normal text-tertiary">Position</span>
              <select
                aria-label="Insertion position"
                value={rowMoveDialog.position}
                disabled={!rowMoveTargetNode}
                onChange={(event) => {
                  const position = event.currentTarget.value;
                  setRowMoveDialog((current) => current ? { ...current, position } : current);
                }}
                className="h-8 rounded-xs border border-hairline bg-white px-2 text-[11px] font-medium text-ink outline-none transition hover:border-tertiary focus:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:bg-surfaceMuted disabled:text-tertiary"
              >
                {rowMovePositionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={closeRowMoveDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!rowMoveTargetNode}
                onClick={confirmRowMoveDialog}
              >
                Move
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
      {projectSpecificRow ? (
        <dialog
          ref={projectSpecificDialogRef}
          aria-label="Make Project Component"
          className="z-50 m-auto w-[min(360px,calc(100vw-32px))] border border-hairline bg-white p-3 text-ink shadow-2xl outline-none backdrop:bg-black/20"
          onCancel={(event) => {
            event.preventDefault();
            closeProjectSpecificDialog();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-ink">Make Project Component</p>
              <p className="mt-1 text-[10px] leading-4 text-tertiary">
                {projectSpecificRow.item.material} will keep its current row values and stop following library updates.
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" className="size-6 rounded-xs p-0" aria-label="Close Project Component dialog" onClick={closeProjectSpecificDialog}>
              <X size={13} weight="regular" aria-hidden="true" />
            </Button>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeProjectSpecificDialog}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" onClick={confirmProjectSpecific}>Make Project Component</Button>
          </div>
        </dialog>
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
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setSheetFacets((current) => ({
                              ...current,
                              suppliers: checked
                                ? [...current.suppliers, supplier]
                                : current.suppliers.filter((value) => value !== supplier),
                            }));
                          }}
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
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setSheetFacets((current) => ({
                              ...current,
                              categories: checked
                                ? [...current.categories, category]
                                : current.categories.filter((value) => value !== category),
                            }));
                          }}
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
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setSheetFacets((current) => ({ ...current, hasValueOnly: checked }));
                    }}
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
          addActions={[
            ...(renderSidebar ? [
              {
                label: "Open Sources drawer",
                visibleLabel: "Sources",
                icon: <SidebarSimple size={13} weight="regular" aria-hidden="true" className="rotate-180" />,
                onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
                  event.currentTarget.focus({ preventScroll: true });
                  setSourcesDrawerOpen(true);
                },
                ariaControls: ESTIMATE_SOURCES_DRAWER_ID,
                ariaExpanded: sourcesDrawerOpen,
                ariaHasPopup: "dialog" as const,
                className: "lg:hidden text-secondary hover:bg-surfaceMuted hover:text-ink focus-visible:bg-surfaceMuted focus-visible:text-ink",
              },
            ] : []),
            ...(createTabState.canCreate ? [
              {
                label: "New tab",
                icon: <TabsIcon size={13} weight="regular" aria-hidden="true" />,
                onClick: () => void tabStripRef.current?.createTab(),
                disabled: createTabState.pending,
                className: ADD_BUTTON_CLASSNAME,
              },
            ] : []),
          ]}
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
        <output
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
          data-estimate-row-save-status
        >
          {rowSaveStatusMessage}
        </output>
        {didTruncateInitialTree ? (
          <output className="mx-2 mt-2 rounded-xs border border-warningSoft bg-warningSoft/40 px-2 py-1.5 text-[10px] leading-4 text-warning">
            This sheet view loaded the first {activeInitialLoadLimitState?.maxNodeCount?.toLocaleString() ?? "available"} nodes and {activeInitialLoadLimitState?.maxRowItemCount?.toLocaleString() ?? "available"} rows. Proposal exports use separate full-data limits.
          </output>
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
            <output aria-label="Loading estimate tab" className="min-h-0 flex-1 space-y-1 overflow-auto p-2">
              {Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-7 w-full" />)}
              <span className="sr-only">Loading estimate tab</span>
            </output>
          </>
        ) : selectedNode ? (
          <>
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                ref={estimatePointerSurfaceRef}
                className={cn("relative min-h-0 flex-1 overflow-auto px-2 pt-1", bulkSelectedRowCount > 0 ? "pb-16" : "pb-1")}
                style={estimateColumnStyle}
                data-estimate-pointer-surface
              >
                <EstimateSheetCursorLayer estimateId={estimateId} tabId={dataTabId} userId={collaborationUserId} displayName={collaborationDisplayName} />
                {displayedSheetNode ? (
                  <EditableRowStoreContext.Provider value={editableRowStore}>
                    <EstimateSheetExpansionContext.Provider value={sheetExpansionContextValue}>
                      <EstimateSheetVirtualBranchList
                        node={displayedSheetNode}
                        nodeCode={selectedNodePresentation.nodeCode}
                        ancestorPath={selectedNodePresentation.ancestorPath}
                        canEditEstimate={canEditEstimate}
                        brandOptions={resolvedBrandOptions}
                        supplierOptions={resolvedSupplierOptions}
                        projectId={projectId}
                        estimateId={estimateId}
                        onInsertLibraryItem={insertLibraryItem}
                        onInsertTemplates={insertTemplatesIntoParentById}
                        onInsertTemplateNode={insertTemplateNodeIntoParentById}
                        onAddBlankRow={insertBlankRow}
                        onReplaceRowItem={replaceRowItem}
                        onDeleteRowItem={deleteRowItem}
                        onUpdateRowItem={updateRowItem}
                        onMarkRowDirty={markRowDirty}
                        onOpenRowDetails={openRowDetails}
                        onOpenComponentEditor={openComponentEditor}
                        onClearRowComponent={clearRowComponent}
                        onRequestProjectSpecific={requestProjectSpecific}
                        onPromoteRowToLibrary={promoteRowToLibrary}
                        promotingRowId={promotingRowId}
                        rowMutationStatuses={rowMutationStatuses}
                        componentSyncPendingRowIds={componentEditorPendingRowIds}
                        onMoveRowComponent={moveRowComponent}
                        onMoveRowItem={moveRowItemToNode}
                        onOpenMoveRowItemDialog={openMoveRowItemDialog}
                        onOpenReplaceComponentPicker={openReplaceComponentPicker}
                        onOpenMoveComponentPicker={openMoveComponentPicker}
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
                  </EditableRowStoreContext.Provider>
                ) : null}
              </div>
              {canEditEstimate ? (
                <BulkActionToolbar
                  placement="bottom-dock"
                  dockTo="container"
                  selectedCount={bulkSelectedRowCount}
                  selectedLabel={bulkSelectedRowCount === 1 ? "row selected" : "rows selected"}
                  onClear={clearRowSelection}
                  actions={[
                    {
                      label: "Delete selected rows",
                      ariaLabel: "Delete selected rows",
                      title: "Deletes selected rows immediately. Use Undo after saving to restore them.",
                      icon: <Trash size={12} weight="regular" />,
                      variant: "danger",
                      onClick: deleteSelectedRows,
                    },
                  ]}
                />
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="relative flex min-h-0 flex-1 overflow-auto px-2 pb-2 pt-2" data-estimate-pointer-surface>
              <EstimateSheetCursorLayer estimateId={estimateId} tabId={dataTabId} userId={collaborationUserId} displayName={collaborationDisplayName} />
              <div className="m-auto flex max-w-sm flex-col items-center gap-3 px-3 py-8 text-center">
                <div className="space-y-1">
                  <p className="text-[9px] font-medium uppercase tracking-normal text-tertiary">
                    Estimate sheet
                  </p>
                  <h2 className="text-[12px] font-medium tracking-normal text-ink">
                    {estimateTree.length === 0 ? "This tab is empty" : "Select an area"}
                  </h2>
                  <p className="text-[10px] leading-4 text-tertiary">
                    {estimateTree.length === 0
                      ? "Add an Area to start, or drag a template or project content here."
                      : "Choose an Area from the estimate tree to edit its rows."}
                  </p>
                </div>
                {canEditEstimate ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button type="button" variant="primary" size="sm" className="gap-1.5" onClick={requestRootGroupCreate}>
                      <StackPlus size={13} weight="regular" aria-hidden="true" />
                      Add Area
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={openTemplateBrowser}>
                      Browse templates
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </section>
      {renderSidebar ? (
        shouldLoadLibraryLazily && !librarySidebarCanHydrate ? (
          <ComponentLibrarySidebarFallback isError={false} />
        ) : shouldLoadLibraryLazily && isLazyLibraryError && !lazyLibrary ? (
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
            initialLibraryItems={resolvedLibraryItems ?? EMPTY_ESTIMATE_ROW_ITEMS}
            templates={availableTemplates}
            categoryTree={libraryCategoryTree ?? lazyLibrary?.categoryTree}
            suppliers={librarySuppliers ?? lazyLibrary?.suppliers}
            brands={libraryBrands ?? lazyLibrary?.brands}
            libraryFolders={libraryFolders ?? lazyLibrary?.libraryFolders}
            libraryDataLoading={isLazyLibraryLoading}
            useStoredPreferences={libraryUseStoredPreferences}
            enableReusableProjectSources={libraryEnableReusableProjectSources}
            usePersistentPanelWidth={libraryUsePersistentPanelWidth}
            mobileDrawerOpen={sourcesDrawerOpen}
            onMobileDrawerOpenChange={setSourcesDrawerOpen}
            mobileDrawerId={ESTIMATE_SOURCES_DRAWER_ID}
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
    <aside className={cn("flex h-full min-h-0 flex-col", ESTIMATE_LIBRARY_DEFAULT_WIDTH_CLASS, estimateSurfaceClass(surfaceVariant, "libraryRail"))}>
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
        <output aria-label="Loading component library" className="space-y-1 p-2">
          <Skeleton className="h-7 w-full" />
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
          <span className="sr-only">Loading component library</span>
        </output>
      )}
    </aside>
  );
}
