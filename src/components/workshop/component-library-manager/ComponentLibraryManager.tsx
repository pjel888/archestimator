"use client";

import { useEffect, useMemo, useReducer, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CaretDown, CaretRight, FolderSimple, ImageSquare, Plus, Rows, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { ControlInput } from "@/components/ui/control-input";
import { ConfirmDialog } from "@/components/ui/overlays/confirm-dialog";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import {
  ComponentAppliedFacetChips,
  ComponentFacetFilterPopover,
} from "@/components/workshop/library/component-facet-filter";
import {
  buildComponentFacetOptions,
  componentMatchesFacets,
  COMPONENT_LIFECYCLE_FACET_LABELS,
  countActiveComponentFacets,
  parseComponentFacetSearchParams,
  type ComponentFacetFilters,
} from "@/components/workshop/library/component-facet-filter-model";
import { BulkActionToolbar } from "@/components/workshop/BulkActionToolbar";
import { BulkDestructivePreviewModal } from "@/components/workshop/BulkDestructivePreviewModal";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import {
  createCostLibraryComponent,
  createLibraryFolder,
  deleteLibraryFolder,
  executeBulkArchiveLibraryComponents,
  loadCostLibraryComponentRowDetail,
  moveCostLibraryComponentToFolder,
  previewBulkArchiveLibraryComponents,
  renameLibraryFolder,
} from "@/lib/component-library/actions";
import {
  buildComponentRouteStateHref,
  COMPONENT_ROUTE_PARAM,
} from "@/components/workshop/library/component-route-state";
import {
  useLibrarySurfaceVariant,
} from "@/components/workshop/library/library-surface-variant";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-class";
import { SourceTrustChips } from "@/components/workshop/library/source-trust-chips";
import { getComponentSourceTrustChips } from "@/components/workshop/library/source-trust-model";
import { promoteExpressRowToLibraryComponent } from "@/lib/estimates/express-promotion-actions";
import { isExpressComponentRow, readProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import { createBulkActionCorrelationId, type BulkActionPreviewResult } from "@/lib/mass-deletion/bulk-action";
import {
  buildLibraryFolderTree,
  getLibraryItemsForFolderNode,
  getUserLibraryFolders,
  planLibraryFolderDelete,
  type LibraryFolderRecord,
  type LibraryFolderTreeNode,
} from "@/lib/component-library/library-folder-reorder";
import {
  componentCategoryTree,
  type ComponentLibraryTaxonomyNode,
} from "@/lib/component-library/taxonomy";
import type { ComponentLibraryBrand } from "@/lib/repositories/component-library-repository";
import { cn } from "@/lib/ui/cn";
import { filterMapBy } from "@/lib/util/array";
import {
  isLibraryDenseModeEnabled,
  WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION,
  WORKSHOP_VIRTUALIZATION_FLAGS,
} from "@/lib/workshop/virtualization-flags";
import { recordLibraryEvent } from "@/lib/component-library/library-telemetry";
import type { EstimateRowItem } from "../estimate-tree-data";
import {
  buildLibraryTreeWithComponentRows,
  getLibraryItemsForTreeNode,
} from "../component-library/tree/buildLibraryTree";
import {
  getComponentName,
  getComponentPrice,
  pesoFormatter,
} from "../component-library/helpers";
import type { LibraryTreeNode } from "../component-library/tree/types";
import type { ComponentLibrarySupplierOption } from "../component-library/tree/buildLibraryTree";
import {
  ALL_COMPONENTS_FOLDER_ID,
  type ComponentViewMode,
  type CreateLibraryFolderHandler,
  type ReorderStatus,
  isAllComponentsFolderId,
} from "./library-folder-tree-shared";

const LibraryFolderTreeSurface = dynamic(() =>
  import("./LibraryFolderTree").then((module) => module.LibraryFolderTreeSurface),
  {
    loading: () => (
      <div className={cn("h-full p-2", librarySurfaceClass("glass", "treeRail"))} aria-hidden="true">
        <div className={cn("h-9", librarySurfaceClass("glass", "skeleton"))} />
        <div className={cn("mt-2 h-[calc(100%-44px)]", librarySurfaceClass("glass", "skeleton"))} />
      </div>
    ),
  },
);

const AddComponentModal = dynamic(() =>
  import("./AddComponentModal").then((module) => module.AddComponentModal),
  {
    loading: () => null,
  },
);

const ComponentInspectorDock = dynamic(
  () => import("@/components/workshop/library/ComponentInspectorDock").then((module) => module.ComponentInspectorDock),
  {
    loading: () => null,
  },
);

const EditComponentDrawer = dynamic(
  () => import("@/components/workshop/library/EditComponentDrawer").then((module) => module.EditComponentDrawer),
  {
    loading: () => null,
  },
);

const COMPONENT_LIBRARY_TREE_WIDTH_OFFSET = 104;
const CATALOGUE_UNASSIGNED_LABEL = "Unassigned";
const CATALOGUE_CARD_GRID_CLASS = "mt-2 grid list-none grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-2 p-0";
const CATALOGUE_CARD_SHELL_CLASS =
  "flex min-h-[236px] flex-col overflow-hidden rounded-xs border text-left";
const LIBRARY_DISPLAY_MODE_STORAGE_KEY = "archestimator_component_library_display_mode_v1";
const EMPTY_LIBRARY_ITEMS: EstimateRowItem[] = [];
const LIBRARY_GLASS_DIVIDER_CLASS = "border-[color:var(--glass-border)]";
const LIBRARY_GLASS_CONTROL_CLASS =
  "border-[color:var(--glass-border)] bg-white/60 hover:border-[color:var(--brand-orange)] hover:bg-white/75";
const LIBRARY_GLASS_SELECTED_CLASS =
  "border-[color:var(--brand-orange)] bg-white/80 shadow-[inset_2px_0_0_var(--brand-orange)]";
const LIBRARY_GLASS_TILE_CLASS = "estimate-glass-chrome border-[color:var(--glass-border)] shadow-none";
const LIBRARY_GLASS_TABLE_CLASS = "border-[color:var(--glass-border)] bg-white/30";

type CatalogueFolderMeta = {
  folderId: string;
  path: string[];
  sortKey: string;
};

type CatalogueCard = {
  item: EstimateRowItem;
  pathLabel: string;
};

type CatalogueBranch = {
  id: string;
  label: string;
  pathLabel: string;
  parentPathLabel: string;
  sortKey: string;
  depth: number;
  directItems: CatalogueCard[];
  children: CatalogueBranch[];
  totalItemCount: number;
};

type CatalogueOutline = {
  branches: CatalogueBranch[];
  items: CatalogueCard[];
};

type ComponentLibraryDisplayMode = "cards" | "dense";
type DenseSortDirection = "asc" | "desc";
type DenseSortKey =
  | "name"
  | "folder"
  | "supplier"
  | "brand"
  | "cost"
  | "pricingSource"
  | "pricingDate"
  | "confidence"
  | "lifecycle"
  | "usage";

type DenseSortState = {
  key: DenseSortKey;
  direction: DenseSortDirection;
};

type ComponentLibrarySheetState = {
  searchQuery: string;
  searchOpen: boolean;
  facetFilters: ComponentFacetFilters;
  collapsedCatalogueBranchIds: Set<string>;
  displayMode: ComponentLibraryDisplayMode;
  denseSort: DenseSortState;
};

type ComponentLibrarySheetAction =
  | { type: "searchQueryChanged"; query: string }
  | { type: "searchOpenChanged"; open: boolean }
  | { type: "facetFiltersChanged"; filters: ComponentFacetFilters }
  | { type: "facetParamsApplied"; filters: ComponentFacetFilters }
  | { type: "catalogueBranchToggled"; branchId: string }
  | { type: "displayModeChanged"; mode: ComponentLibraryDisplayMode }
  | { type: "denseSortChanged"; key: DenseSortKey };

function getInitialComponentLibraryDisplayMode(denseModeEnabled: boolean): ComponentLibraryDisplayMode {
  if (!denseModeEnabled) return "cards";
  try {
    const stored = window.localStorage.getItem(LIBRARY_DISPLAY_MODE_STORAGE_KEY);
    if (stored === "cards" || stored === "dense") return stored;
  } catch {}
  return "cards";
}

function createInitialComponentLibrarySheetState({
  denseModeEnabled,
  facetParamsKey,
}: {
  denseModeEnabled: boolean;
  facetParamsKey: string;
}): ComponentLibrarySheetState {
  return {
    searchQuery: "",
    searchOpen: false,
    facetFilters: parseComponentFacetSearchParams(new URLSearchParams(facetParamsKey)),
    collapsedCatalogueBranchIds: new Set(),
    displayMode: getInitialComponentLibraryDisplayMode(denseModeEnabled),
    denseSort: { key: "folder", direction: "asc" },
  };
}

function componentLibrarySheetReducer(
  state: ComponentLibrarySheetState,
  action: ComponentLibrarySheetAction,
): ComponentLibrarySheetState {
  switch (action.type) {
    case "searchQueryChanged":
      return {
        ...state,
        searchQuery: action.query,
      };
    case "searchOpenChanged":
      return {
        ...state,
        searchOpen: action.open,
      };
    case "facetFiltersChanged":
    case "facetParamsApplied":
      return {
        ...state,
        facetFilters: action.filters,
      };
    case "catalogueBranchToggled": {
      const collapsedCatalogueBranchIds = new Set(state.collapsedCatalogueBranchIds);
      if (collapsedCatalogueBranchIds.has(action.branchId)) {
        collapsedCatalogueBranchIds.delete(action.branchId);
      } else {
        collapsedCatalogueBranchIds.add(action.branchId);
      }
      return {
        ...state,
        collapsedCatalogueBranchIds,
      };
    }
    case "displayModeChanged":
      return {
        ...state,
        displayMode: action.mode,
      };
    case "denseSortChanged":
      return {
        ...state,
        denseSort: getNextDenseSortState(state.denseSort, action.key),
      };
    default:
      return state;
  }
}

type SheetStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

type ComponentRowsLoadState = {
  isPartial: boolean;
  loadedComponentCount: number;
  totalComponentCount?: number;
  isLoading: boolean;
  onLoadAll: () => void;
};

type StateUpdater<T> = T | ((current: T) => T);
type LibraryItemState = { source: EstimateRowItem[]; items: EstimateRowItem[] };
type ArchiveComponentState = "idle" | "loading" | "ready" | "executing";

type FolderTextPrompt = {
  title: string;
  label: string;
  confirmLabel: string;
  initialValue: string;
  onSubmit: (value: string) => void;
};

type ComponentLibraryManagerState = {
  localFolders: LibraryFolderRecord[];
  viewMode: ComponentViewMode;
  selectedFolderId: string | null;
  selectedSupplierNodeId: string;
  selectedBrandNodeId: string;
  reorderStatus: ReorderStatus;
  sheetStatus: SheetStatus;
  addComponentOpen: boolean;
  libraryItemState: LibraryItemState;
  selectedItemIds: Set<string>;
  promotingItemId: string | null;
  archiveComponentTargetIds: string[];
  archiveComponentPreview: BulkActionPreviewResult | null;
  archiveComponentError: string | null;
  archiveComponentState: ArchiveComponentState;
  folderTextPrompt: FolderTextPrompt | null;
  folderTextPromptValue: string;
  deleteFolderTarget: { folderId: string; currentName: string } | null;
  componentRouteStateVersion: number;
  editDrawerOpen: boolean;
};

type ComponentLibraryManagerInit = {
  normalizedPropFolders: LibraryFolderRecord[];
  libraryItems: EstimateRowItem[];
};

type ComponentLibraryManagerAction =
  | { type: "localFoldersChanged"; value: StateUpdater<LibraryFolderRecord[]> }
  | { type: "viewModeChanged"; value: StateUpdater<ComponentViewMode> }
  | { type: "selectedFolderIdChanged"; value: StateUpdater<string | null> }
  | { type: "selectedSupplierNodeIdChanged"; value: StateUpdater<string> }
  | { type: "selectedBrandNodeIdChanged"; value: StateUpdater<string> }
  | { type: "reorderStatusChanged"; value: StateUpdater<ReorderStatus> }
  | { type: "sheetStatusChanged"; value: StateUpdater<SheetStatus> }
  | { type: "addComponentOpenChanged"; value: StateUpdater<boolean> }
  | { type: "libraryItemStateChanged"; value: StateUpdater<LibraryItemState> }
  | { type: "selectedItemIdsChanged"; value: StateUpdater<Set<string>> }
  | { type: "promotingItemIdChanged"; value: StateUpdater<string | null> }
  | { type: "archiveComponentTargetIdsChanged"; value: StateUpdater<string[]> }
  | { type: "archiveComponentPreviewChanged"; value: StateUpdater<BulkActionPreviewResult | null> }
  | { type: "archiveComponentErrorChanged"; value: StateUpdater<string | null> }
  | { type: "archiveComponentStateChanged"; value: StateUpdater<ArchiveComponentState> }
  | { type: "folderTextPromptChanged"; value: StateUpdater<FolderTextPrompt | null> }
  | { type: "folderTextPromptValueChanged"; value: StateUpdater<string> }
  | { type: "deleteFolderTargetChanged"; value: StateUpdater<{ folderId: string; currentName: string } | null> }
  | { type: "componentRouteStateVersionBumped" }
  | { type: "editDrawerOpenChanged"; value: StateUpdater<boolean> };

function resolveStateUpdater<T>(current: T, value: StateUpdater<T>): T {
  return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

function createInitialComponentLibraryManagerState({
  normalizedPropFolders,
  libraryItems,
}: ComponentLibraryManagerInit): ComponentLibraryManagerState {
  return {
    localFolders: normalizedPropFolders,
    viewMode: "default",
    selectedFolderId: ALL_COMPONENTS_FOLDER_ID,
    selectedSupplierNodeId: "all-suppliers",
    selectedBrandNodeId: "all-brands",
    reorderStatus: { state: "idle" },
    sheetStatus: { state: "idle" },
    addComponentOpen: false,
    libraryItemState: {
      source: libraryItems,
      items: libraryItems,
    },
    selectedItemIds: new Set(),
    promotingItemId: null,
    archiveComponentTargetIds: [],
    archiveComponentPreview: null,
    archiveComponentError: null,
    archiveComponentState: "idle",
    folderTextPrompt: null,
    folderTextPromptValue: "",
    deleteFolderTarget: null,
    componentRouteStateVersion: 0,
    editDrawerOpen: false,
  };
}

function componentLibraryManagerReducer(
  state: ComponentLibraryManagerState,
  action: ComponentLibraryManagerAction,
): ComponentLibraryManagerState {
  switch (action.type) {
    case "localFoldersChanged":
      return { ...state, localFolders: resolveStateUpdater(state.localFolders, action.value) };
    case "viewModeChanged":
      return { ...state, viewMode: resolveStateUpdater(state.viewMode, action.value) };
    case "selectedFolderIdChanged":
      return { ...state, selectedFolderId: resolveStateUpdater(state.selectedFolderId, action.value) };
    case "selectedSupplierNodeIdChanged":
      return { ...state, selectedSupplierNodeId: resolveStateUpdater(state.selectedSupplierNodeId, action.value) };
    case "selectedBrandNodeIdChanged":
      return { ...state, selectedBrandNodeId: resolveStateUpdater(state.selectedBrandNodeId, action.value) };
    case "reorderStatusChanged":
      return { ...state, reorderStatus: resolveStateUpdater(state.reorderStatus, action.value) };
    case "sheetStatusChanged":
      return { ...state, sheetStatus: resolveStateUpdater(state.sheetStatus, action.value) };
    case "addComponentOpenChanged":
      return { ...state, addComponentOpen: resolveStateUpdater(state.addComponentOpen, action.value) };
    case "libraryItemStateChanged":
      return { ...state, libraryItemState: resolveStateUpdater(state.libraryItemState, action.value) };
    case "selectedItemIdsChanged":
      return { ...state, selectedItemIds: resolveStateUpdater(state.selectedItemIds, action.value) };
    case "promotingItemIdChanged":
      return { ...state, promotingItemId: resolveStateUpdater(state.promotingItemId, action.value) };
    case "archiveComponentTargetIdsChanged":
      return { ...state, archiveComponentTargetIds: resolveStateUpdater(state.archiveComponentTargetIds, action.value) };
    case "archiveComponentPreviewChanged":
      return { ...state, archiveComponentPreview: resolveStateUpdater(state.archiveComponentPreview, action.value) };
    case "archiveComponentErrorChanged":
      return { ...state, archiveComponentError: resolveStateUpdater(state.archiveComponentError, action.value) };
    case "archiveComponentStateChanged":
      return { ...state, archiveComponentState: resolveStateUpdater(state.archiveComponentState, action.value) };
    case "folderTextPromptChanged":
      return { ...state, folderTextPrompt: resolveStateUpdater(state.folderTextPrompt, action.value) };
    case "folderTextPromptValueChanged":
      return { ...state, folderTextPromptValue: resolveStateUpdater(state.folderTextPromptValue, action.value) };
    case "deleteFolderTargetChanged":
      return { ...state, deleteFolderTarget: resolveStateUpdater(state.deleteFolderTarget, action.value) };
    case "componentRouteStateVersionBumped":
      return { ...state, componentRouteStateVersion: state.componentRouteStateVersion + 1 };
    case "editDrawerOpenChanged":
      return { ...state, editDrawerOpen: resolveStateUpdater(state.editDrawerOpen, action.value) };
    default:
      return state;
  }
}

function findNode(nodes: LibraryTreeNode[], nodeId: string): LibraryTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findNode(node.children ?? [], nodeId);
    if (child) return child;
  }
  return null;
}

function findFolderNode(nodes: LibraryFolderTreeNode[], folderId: string | null): LibraryFolderTreeNode | null {
  if (!folderId) return null;
  for (const node of nodes) {
    if (node.folderId === folderId) return node;
    const child = findFolderNode(node.children ?? [], folderId);
    if (child) return child;
  }
  return null;
}

function getFirstFolderId(nodes: LibraryFolderTreeNode[]): string | null {
  return nodes[0]?.folderId ?? null;
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function itemMatchesSheetQuery(item: EstimateRowItem, query: string): boolean {
  const normalizedQuery = normalizeLabel(query);
  if (!normalizedQuery) return true;

  const searchableValues = [
    getComponentName(item),
    item.supplier,
    item.brand,
    item.category,
    item.unit,
    item.description,
    item.pricingSource,
    item.pricingDate,
    item.confidence,
    ...(item.categoryPath ?? []),
  ]
    .flatMap((value) => (typeof value === "string" && value.length > 0 ? [value] : []));

  return searchableValues.some((value) => normalizeLabel(value).includes(normalizedQuery));
}

function buildCatalogueFolderMaps(nodes: LibraryFolderTreeNode[]) {
  const folderMetaById = new Map<string, CatalogueFolderMeta>();
  const categoryMetaById = new Map<string, CatalogueFolderMeta>();

  function visit(currentNodes: LibraryFolderTreeNode[], parentPath: string[] = [], parentSortKey = "") {
    currentNodes.forEach((node, index) => {
      const path = [...parentPath, node.label];
      const sortSegment = `${String(node.sortOrder).padStart(6, "0")}-${String(index).padStart(3, "0")}-${normalizeLabel(node.label)}`;
      const sortKey = parentSortKey ? `${parentSortKey}/${sortSegment}` : sortSegment;
      const meta = { folderId: node.folderId, path, sortKey };
      folderMetaById.set(node.folderId, meta);
      if (node.sourceCategoryNodeId) categoryMetaById.set(node.sourceCategoryNodeId, meta);
      visit(node.children ?? [], path, sortKey);
    });
  }

  visit(nodes);
  return { folderMetaById, categoryMetaById };
}

function getCatalogueItemMeta(
  item: EstimateRowItem,
  folderMetaById: Map<string, CatalogueFolderMeta>,
  categoryMetaById: Map<string, CatalogueFolderMeta>,
): CatalogueFolderMeta {
  if (item.libraryFolderId) {
    const folderMeta = folderMetaById.get(item.libraryFolderId);
    if (folderMeta) return folderMeta;
  }

  if (item.categoryNodeId) {
    const categoryMeta = categoryMetaById.get(item.categoryNodeId);
    if (categoryMeta) return categoryMeta;
  }

  const path = item.categoryPath?.filter(Boolean) ?? [item.category].filter(Boolean);
  const safePath = path.length ? path : [CATALOGUE_UNASSIGNED_LABEL];
  return {
    folderId: CATALOGUE_UNASSIGNED_LABEL,
    path: safePath,
    sortKey: `zz-${safePath.map(normalizeLabel).join("/")}`,
  };
}

function buildCatalogueOutline(
  items: EstimateRowItem[],
  folderNodes: LibraryFolderTreeNode[],
  selectedFolderNode: LibraryFolderTreeNode | null,
  searchQuery: string,
): CatalogueOutline {
  const { folderMetaById, categoryMetaById } = buildCatalogueFolderMaps(folderNodes);
  const cardsByFolderId = new Map<string, CatalogueCard[]>();
  const unassignedCards: CatalogueCard[] = [];
  const normalizedQuery = normalizeLabel(searchQuery);

  for (const item of items) {
    const meta = getCatalogueItemMeta(item, folderMetaById, categoryMetaById);
    const card = {
      item,
      pathLabel: meta.path.join(" / "),
    };
    if (folderMetaById.has(meta.folderId)) {
      const folderCards = cardsByFolderId.get(meta.folderId) ?? [];
      folderCards.push(card);
      cardsByFolderId.set(meta.folderId, folderCards);
    } else {
      unassignedCards.push(card);
    }
  }

  function buildBranch(node: LibraryFolderTreeNode, depth: number, parentPath: string[]): CatalogueBranch | null {
    const path = [...parentPath, node.label];
    const directItems = (cardsByFolderId.get(node.folderId) ?? []).toSorted((left, right) => (
      getComponentName(left.item).localeCompare(getComponentName(right.item))
    ));
    const children = (node.children ?? [])
      .map((child) => buildBranch(child, depth + 1, path))
      .filter((child): child is CatalogueBranch => Boolean(child));
    const folderMatches = normalizedQuery.length > 0 && normalizeLabel(node.label).includes(normalizedQuery);
    const shouldRender = normalizedQuery.length === 0 || folderMatches || directItems.length > 0 || children.length > 0;
    if (!shouldRender) return null;

    return {
      id: node.folderId,
      label: node.label,
      pathLabel: path.join(" / "),
      parentPathLabel: parentPath.join(" / "),
      sortKey: folderMetaById.get(node.folderId)?.sortKey ?? normalizeLabel(node.label),
      depth,
      directItems,
      children,
      totalItemCount: directItems.length + children.reduce((total, child) => total + child.totalItemCount, 0),
    };
  }

  const roots = selectedFolderNode
    ? [{ node: selectedFolderNode, parentPath: folderMetaById.get(selectedFolderNode.folderId)?.path.slice(0, -1) ?? [] }]
    : folderNodes.map((node) => ({ node, parentPath: [] }));
  return {
    branches: roots
      .map(({ node, parentPath }) => buildBranch(node, 0, parentPath))
      .filter((branch): branch is CatalogueBranch => Boolean(branch))
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey) || left.label.localeCompare(right.label)),
    items: unassignedCards.sort((left, right) => getComponentName(left.item).localeCompare(getComponentName(right.item))),
  };
}

function getItemBrandLabel(item: EstimateRowItem) {
  return item.brand?.trim() || "Brand not set";
}

function getItemPricingSourceLabel(item: EstimateRowItem) {
  return item.pricingSource?.trim() || "Source not set";
}

function getCatalogueScopeSummary(totalCount: number) {
  return `${totalCount} ${totalCount === 1 ? "component" : "components"}`;
}

function flattenCatalogueBranch(branch: CatalogueBranch): CatalogueCard[] {
  return [
    ...branch.directItems,
    ...branch.children.flatMap((child) => flattenCatalogueBranch(child)),
  ];
}

function flattenCatalogueOutline(outline: CatalogueOutline): CatalogueCard[] {
  return [
    ...outline.branches.flatMap((branch) => flattenCatalogueBranch(branch)),
    ...outline.items,
  ];
}

function getComponentLifecycleLabel(item: EstimateRowItem) {
  return COMPONENT_LIFECYCLE_FACET_LABELS[item.lifecycleState ?? "available"];
}

function getComponentUsageLabel(item: EstimateRowItem) {
  return item.lastUsedAt?.trim() ? `Last used ${item.lastUsedAt.slice(0, 10)}` : "Usage not recorded";
}

function getDenseSortValue(card: CatalogueCard, key: DenseSortKey): string | number {
  const item = card.item;
  switch (key) {
    case "folder":
      return card.pathLabel;
    case "supplier":
      return item.supplier || "No supplier";
    case "brand":
      return getItemBrandLabel(item);
    case "cost":
      return getComponentPrice(item);
    case "pricingSource":
      return getItemPricingSourceLabel(item);
    case "pricingDate":
      return item.pricingDate || "";
    case "confidence":
      return item.confidence || "";
    case "lifecycle":
      return getComponentLifecycleLabel(item);
    case "usage":
      return item.lastUsedAt || "";
    case "name":
    default:
      return getComponentName(item);
  }
}

function compareDenseValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function sortDenseCatalogueCards(cards: CatalogueCard[], sort: DenseSortState): CatalogueCard[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return cards.toSorted((left, right) => {
    const primary = compareDenseValues(getDenseSortValue(left, sort.key), getDenseSortValue(right, sort.key));
    if (primary !== 0) return primary * direction;
    return getComponentName(left.item).localeCompare(getComponentName(right.item), undefined, { sensitivity: "base" });
  });
}

function getNextDenseSortState(current: DenseSortState, key: DenseSortKey): DenseSortState {
  if (current.key !== key) return { key, direction: "asc" };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

function getDenseAriaSort(sort: DenseSortState, key: DenseSortKey) {
  if (sort.key !== key) return "none" as const;
  return sort.direction === "asc" ? "ascending" as const : "descending" as const;
}

function isNextImageSafeComponentSource(src: string) {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  return false;
}

const LIFECYCLE_BADGE_CLASSES: Record<string, string> = {
  draft: "border-hairline bg-surfaceMuted text-secondary",
  in_production: "border-hairline bg-surfaceMuted text-secondary",
  discontinued: "border-warning/20 bg-warningSoft text-warning",
  archived: "border-danger/20 bg-dangerSoft text-danger",
};

function ComponentCatalogueCard({
  card,
  selected,
  inspectorSelected,
  onToggleSelected,
  onInspect,
  onPromote,
  promotePending = false,
}: {
  card: CatalogueCard;
  selected: boolean;
  inspectorSelected: boolean;
  onToggleSelected: (itemId: string) => void;
  onInspect: (itemId: string) => void;
  onPromote?: (item: EstimateRowItem) => void;
  promotePending?: boolean;
}) {
  const surfaceVariant = useLibrarySurfaceVariant();
  const item = card.item;
  const name = getComponentName(item);
  const brand = getItemBrandLabel(item);
  const pricingSource = getItemPricingSourceLabel(item);
  const canPromote = Boolean(onPromote && isPromotableProjectProjectionItem(item));
  const lifecycleBadge = item.lifecycleState && item.lifecycleState !== "available"
    ? {
        label: COMPONENT_LIFECYCLE_FACET_LABELS[item.lifecycleState],
        className: LIFECYCLE_BADGE_CLASSES[item.lifecycleState] ?? LIFECYCLE_BADGE_CLASSES.draft,
      }
    : null;

  return (
    <li
      data-component-catalogue-card-id={item.id}
      data-library-card-selected={inspectorSelected ? "true" : undefined}
      className={cn(
        "group cursor-pointer transition",
        surfaceVariant === "glass"
          ? "hover:border-[color:var(--glass-border)] hover:bg-white/75"
          : "hover:border-divider hover:shadow-[0_16px_32px_-24px_rgba(17,24,39,0.65)]",
        CATALOGUE_CARD_SHELL_CLASS,
        librarySurfaceClass(surfaceVariant, "contentTile"),
        surfaceVariant === "glass" && LIBRARY_GLASS_TILE_CLASS,
        inspectorSelected && (surfaceVariant === "glass" ? LIBRARY_GLASS_SELECTED_CLASS : "border-ink bg-surfaceMuted/40"),
      )}
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden border-b",
          surfaceVariant === "glass" ? "border-[color:var(--glass-border)] bg-white/35" : "border-hairline bg-white",
        )}
      >
        {lifecycleBadge ? (
          <span
            className={cn(
              "absolute right-2 top-2 z-10 rounded-xs border px-1 py-0.5 text-[8px] font-medium leading-3",
              lifecycleBadge.className,
            )}
            data-component-lifecycle-badge={item.lifecycleState}
          >
            {lifecycleBadge.label}
          </span>
        ) : null}
        <label
          className={cn(
            "absolute left-2 top-2 z-10 grid size-7 cursor-pointer place-items-center rounded-xs border",
            surfaceVariant === "glass"
              ? LIBRARY_GLASS_CONTROL_CLASS
              : "border-white/70 bg-white/86 shadow-sm backdrop-blur hover:bg-white",
          )}
        >
          <span className="sr-only">{`Select ${item.name ?? item.material} for archive`}</span>
          <input
            type="checkbox"
            className="size-3 rounded-xs border-hairline accent-danger"
            aria-label={`Select ${item.name ?? item.material} for archive`}
            checked={selected}
            onChange={() => onToggleSelected(item.id)}
          />
        </label>
        <button
          type="button"
          className="absolute inset-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
          data-component-card-image-inspect={item.id}
          aria-label={`View details for ${name}`}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey) {
              onToggleSelected(item.id);
              return;
            }
            onInspect(item.id);
          }}
        >
          {item.imageUrl && isNextImageSafeComponentSource(item.imageUrl) ? (
            <Image
              src={item.imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 176px"
              className="object-cover transition duration-200 group-hover:scale-[1.02]"
            />
          ) : item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 176px"
              unoptimized
              className="object-cover transition duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <span
              className={cn(
                "flex h-full w-full items-center justify-center text-tertiary",
                surfaceVariant === "glass" ? "bg-transparent" : "bg-white",
              )}
              aria-hidden="true"
            >
              <ImageSquare size={24} weight="regular" />
            </span>
          )}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
        <p className="truncate text-[8px] font-normal uppercase leading-3 tracking-normal text-tertiary" title={card.pathLabel}>
          {card.pathLabel}
        </p>
        <h3 className="line-clamp-2 text-[10px] font-medium leading-[1.25] text-ink" title={name}>
          <button
            type="button"
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            data-component-card-inspect={item.id}
            aria-label={`View details for ${name}`}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey) {
                onToggleSelected(item.id);
                return;
              }
              onInspect(item.id);
            }}
          >
            {name}
          </button>
        </h3>
        <div className="flex flex-col gap-0.5">
          <p className="truncate text-[9px] font-normal leading-3 text-secondary" title={item.supplier || "No supplier"}>
            {item.supplier || "No supplier"}
          </p>
          <p className="truncate text-[9px] font-normal leading-3 text-tertiary" title={brand}>
            {brand}
          </p>
        </div>
        <div className={cn("mt-auto border-t pt-1.5", surfaceVariant === "glass" ? LIBRARY_GLASS_DIVIDER_CLASS : "border-hairline")}>
          <p className="font-sans text-[11px] font-medium leading-4 tabular-nums text-ink">
            {pesoFormatter.format(getComponentPrice(item))}
          </p>
          <p className="truncate text-[9px] font-normal leading-3 text-tertiary">
            Cost / {item.unit}
          </p>
          {canPromote ? (
            <button
              type="button"
              className={cn(
                "mt-1 inline-flex h-6 items-center justify-center rounded-xs border px-2 text-[9px] font-medium leading-none text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60",
                surfaceVariant === "glass" ? LIBRARY_GLASS_CONTROL_CLASS : "border-hairline bg-white hover:border-accent",
              )}
              aria-label={`Promote ${name} to library`}
              title={`Promote ${name} to library`}
              disabled={promotePending}
              onClick={(event) => {
                event.stopPropagation();
                onPromote?.(item);
              }}
            >
              {promotePending ? "Promoting…" : "Promote"}
            </button>
          ) : null}
          <div className={cn("mt-1 space-y-0.5 border-t pt-1", surfaceVariant === "glass" ? LIBRARY_GLASS_DIVIDER_CLASS : "border-hairline")}>
            <SourceTrustChips
              chips={getComponentSourceTrustChips(item)}
              ariaLabel={`Source trust for ${name}`}
              maxChips={3}
              chipClassName="max-w-[96px]"
            />
            <p className="truncate text-[8px] font-normal leading-3 text-tertiary" title={pricingSource}>
              Source: {pricingSource}
            </p>
            <p className="truncate text-[8px] font-normal leading-3 text-tertiary">
              Checked {item.pricingDate || "date not set"}
            </p>
            {item.confidence ? (
              <p className="truncate text-[8px] font-normal leading-3 text-tertiary" title={item.confidence}>
                Confidence: {item.confidence}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function CatalogueCardGrid({
  cards,
  label,
  selectedItemIds,
  inspectorItemId,
  onToggleSelected,
  onInspect,
  onPromote,
  promotingItemId,
}: {
  cards: CatalogueCard[];
  label: string;
  selectedItemIds: Set<string>;
  inspectorItemId: string | null;
  onToggleSelected: (itemId: string) => void;
  onInspect: (itemId: string) => void;
  onPromote?: (item: EstimateRowItem) => void;
  promotingItemId?: string | null;
}) {
  if (cards.length === 0) return null;

  return (
    <ul
      className={CATALOGUE_CARD_GRID_CLASS}
      aria-label={`${label} component catalogue grid`}
    >
      {cards.map((card) => (
        <ComponentCatalogueCard
          key={card.item.id}
          card={card}
          selected={selectedItemIds.has(card.item.id)}
          inspectorSelected={inspectorItemId === card.item.id}
          onToggleSelected={onToggleSelected}
          onInspect={onInspect}
          onPromote={onPromote}
          promotePending={promotingItemId === card.item.id}
        />
      ))}
    </ul>
  );
}

function DenseSortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: DenseSortKey;
  sort: DenseSortState;
  onSort: (key: DenseSortKey) => void;
  className?: string;
}) {
  const surfaceVariant = useLibrarySurfaceVariant();
  const active = sort.key === sortKey;
  return (
    <th
      scope="col"
      aria-sort={getDenseAriaSort(sort, sortKey)}
      className={cn(
        "sticky top-0 z-10 border-b px-2 py-1 text-left text-[9px] font-medium leading-3 text-tertiary",
        surfaceVariant === "glass" ? "estimate-glass-headchrome border-[color:var(--glass-border)]" : "border-hairline bg-white",
        className,
      )}
    >
      <button
        type="button"
        className="inline-flex min-h-6 max-w-full items-center gap-1 text-left text-[9px] font-medium leading-3 text-tertiary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        aria-label={`Sort by ${label.toLowerCase()}`}
        onClick={() => onSort(sortKey)}
      >
        <span className="truncate">{label}</span>
        {active ? <span aria-hidden="true" className="shrink-0 text-[8px] uppercase">{sort.direction}</span> : null}
      </button>
    </th>
  );
}

function ComponentCatalogueDenseTable({
  cards,
  label,
  sort,
  selectedItemIds,
  inspectorItemId,
  onSort,
  onToggleSelected,
  onInspect,
  onPromote,
  promotingItemId,
}: {
  cards: CatalogueCard[];
  label: string;
  sort: DenseSortState;
  selectedItemIds: Set<string>;
  inspectorItemId: string | null;
  onSort: (key: DenseSortKey) => void;
  onToggleSelected: (itemId: string) => void;
  onInspect: (itemId: string) => void;
  onPromote?: (item: EstimateRowItem) => void;
  promotingItemId?: string | null;
}) {
  const surfaceVariant = useLibrarySurfaceVariant();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const virtualEnabled = Boolean(
    WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.enabled &&
      cards.length >= WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.minRows,
  );
  const virtualEstimateRowHeight = WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.estimateRowHeight;
  const virtualOverscan = WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.overscan;
  const virtualInitialViewportHeight = WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.initialViewportHeight;
  const rowVirtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => virtualEstimateRowHeight,
    overscan: virtualOverscan,
    getItemKey: (index) => cards[index]?.item.id ?? index,
    enabled: virtualEnabled,
    useFlushSync: WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.useFlushSync,
    initialRect: { height: virtualInitialViewportHeight, width: 0 },
  });
  const measuredVirtualRows = rowVirtualizer.getVirtualItems();
  const renderedVirtualRows = virtualEnabled && measuredVirtualRows.length === 0
    ? Array.from(
        {
          length: Math.min(
            cards.length,
            Math.ceil(virtualInitialViewportHeight / virtualEstimateRowHeight) + virtualOverscan * 2,
          ),
        },
        (_, index) => ({
          index,
          key: cards[index]?.item.id ?? index,
          start: index * virtualEstimateRowHeight,
          end: (index + 1) * virtualEstimateRowHeight,
        }),
      )
    : measuredVirtualRows;
  const rowSlots = virtualEnabled
    ? renderedVirtualRows
    : cards.map((card, index) => ({
        index,
        key: card.item.id,
        start: 0,
        end: 0,
      }));
  const firstVirtualRow = virtualEnabled ? renderedVirtualRows[0] : null;
  const lastVirtualRow = virtualEnabled ? renderedVirtualRows[renderedVirtualRows.length - 1] : null;
  const virtualPaddingTop = firstVirtualRow?.start ?? 0;
  const virtualPaddingBottom = Math.max(0, virtualEnabled ? rowVirtualizer.getTotalSize() - (lastVirtualRow?.end ?? 0) : 0);

  if (cards.length === 0) return null;

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "h-full max-h-full min-h-0 overflow-auto rounded-xs border",
        surfaceVariant === "glass" ? "border-[color:var(--glass-border)]" : "border-hairline",
        librarySurfaceClass(surfaceVariant, "denseTable"),
        surfaceVariant === "glass" && LIBRARY_GLASS_TABLE_CLASS,
      )}
      data-component-dense-scroll-container="true"
      data-library-virtualization-source="WORKSHOP_VIRTUALIZATION_FLAGS"
      data-library-virtualization-enabled={String(WORKSHOP_VIRTUALIZATION_FLAGS.libraryComponents)}
      data-library-virtualization-active={String(virtualEnabled)}
      data-library-virtualization-min-rows={String(WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.minRows)}
      data-library-virtual-total-count={virtualEnabled ? String(cards.length) : undefined}
      data-library-virtual-mounted-count={virtualEnabled ? String(rowSlots.length) : undefined}
    >
      <table
        className="min-w-[1120px] table-fixed border-collapse text-[10px]"
        aria-label={`${label} dense component table`}
        data-component-dense-table="true"
        data-library-virtualization-source="WORKSHOP_VIRTUALIZATION_FLAGS"
        data-library-virtualization-active={String(virtualEnabled)}
        data-library-virtual-total-count={virtualEnabled ? String(cards.length) : undefined}
        data-library-virtual-mounted-count={virtualEnabled ? String(rowSlots.length) : undefined}
      >
        <colgroup>
          <col className="w-9" />
          <col className="w-[220px]" />
          <col className="w-[160px]" />
          <col className="w-[132px]" />
          <col className="w-[132px]" />
          <col className="w-[112px]" />
          <col className="w-[148px]" />
          <col className="w-[104px]" />
          <col className="w-[104px]" />
          <col className="w-[116px]" />
          <col className="w-[128px]" />
          <col className="w-[132px]" />
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className={cn(
                "sticky top-0 z-10 border-b px-2 py-1 text-left text-[9px] font-medium leading-3 text-tertiary",
                surfaceVariant === "glass" ? "estimate-glass-headchrome border-[color:var(--glass-border)]" : "border-hairline bg-white",
              )}
            >
              <span className="sr-only">Select</span>
            </th>
            <DenseSortableHeader label="Name" sortKey="name" sort={sort} onSort={onSort} className="z-20" />
            <DenseSortableHeader label="Folder" sortKey="folder" sort={sort} onSort={onSort} />
            <DenseSortableHeader label="Supplier" sortKey="supplier" sort={sort} onSort={onSort} />
            <DenseSortableHeader label="Brand" sortKey="brand" sort={sort} onSort={onSort} />
            <DenseSortableHeader label="Cost" sortKey="cost" sort={sort} onSort={onSort} />
            <DenseSortableHeader label="Pricing source" sortKey="pricingSource" sort={sort} onSort={onSort} />
            <DenseSortableHeader label="Pricing date" sortKey="pricingDate" sort={sort} onSort={onSort} />
            <DenseSortableHeader label="Confidence" sortKey="confidence" sort={sort} onSort={onSort} />
            <DenseSortableHeader label="Lifecycle" sortKey="lifecycle" sort={sort} onSort={onSort} />
            <DenseSortableHeader label="Usage" sortKey="usage" sort={sort} onSort={onSort} />
            <th
              scope="col"
              className={cn(
                "sticky top-0 z-10 border-b px-2 py-1 text-left text-[9px] font-medium leading-3 text-tertiary",
                surfaceVariant === "glass" ? "estimate-glass-headchrome border-[color:var(--glass-border)]" : "border-hairline bg-white",
              )}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {virtualEnabled && virtualPaddingTop > 0 ? (
            <>
              {/* react-doctor-disable-next-line react-doctor/no-aria-hidden-on-focusable -- Virtualization spacer row is not user-operable content. */}
              <tr aria-hidden="true" data-component-dense-virtual-spacer="top">
                {/* react-doctor-disable-next-line react-doctor/control-has-associated-label -- Virtualization spacer cell is hidden from assistive tech. */}
                <td colSpan={12} style={{ height: virtualPaddingTop, padding: 0, border: 0 }} />
              </tr>
            </>
          ) : null}
          {rowSlots.map((virtualRow) => {
            const card = cards[virtualRow.index];
            if (!card) return null;
            const item = card.item;
            const name = getComponentName(item);
            const selected = selectedItemIds.has(item.id);
            const inspectorSelected = inspectorItemId === item.id;
            const lifecycle = getComponentLifecycleLabel(item);
            const canPromote = Boolean(onPromote && isPromotableProjectProjectionItem(item));
            return (
              <tr
                key={virtualRow.key}
                tabIndex={0}
                data-index={virtualEnabled ? virtualRow.index : undefined}
                data-component-dense-row-id={item.id}
                data-component-dense-virtual-row={virtualEnabled ? item.id : undefined}
                aria-selected={inspectorSelected || selected}
                className={cn(
                  "border-b transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
                  surfaceVariant === "glass"
                    ? "border-[color:var(--glass-border)] hover:bg-white/40"
                    : "border-hairline hover:bg-surfaceMuted/55",
                  selected && surfaceVariant === "glass" && "bg-white/30",
                  inspectorSelected && (surfaceVariant === "glass" ? "bg-white/55 shadow-[inset_2px_0_0_var(--brand-orange)]" : "bg-surfaceMuted/70"),
                )}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("label, button, a, input")) return;
                  if (event.metaKey || event.ctrlKey) {
                    onToggleSelected(item.id);
                    return;
                  }
                  onInspect(item.id);
                }}
                onKeyDown={(event) => {
                  if (event.defaultPrevented || event.target !== event.currentTarget) return;
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onInspect(item.id);
                    return;
                  }
                  if (event.key === " ") {
                    event.preventDefault();
                    onToggleSelected(item.id);
                  }
                }}
              >
                <td className="px-2 py-1 align-top">
                  <input
                    type="checkbox"
                    className="size-3 rounded-xs border-hairline accent-danger"
                    aria-label={`Select ${name} for archive`}
                    checked={selected}
                    onChange={() => onToggleSelected(item.id)}
                  />
                </td>
                <th
                  scope="row"
                  className={cn(surfaceVariant === "glass" ? "bg-transparent" : "bg-white", "px-2 py-1 text-left align-top")}
                >
                  <button
                    type="button"
                    className="block max-w-full truncate text-left text-[10px] font-medium leading-4 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    data-component-card-inspect={item.id}
                    aria-label={`View details for ${name}`}
                    title={name}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey) {
                        onToggleSelected(item.id);
                        return;
                      }
                      onInspect(item.id);
                    }}
                  >
                    {name}
                  </button>
                  <SourceTrustChips
                    chips={getComponentSourceTrustChips(item)}
                    ariaLabel={`Source trust for ${name}`}
                    maxChips={3}
                    chipClassName="max-w-[92px]"
                    className="mt-1"
                  />
                </th>
                <td className="truncate px-2 py-1 align-top text-secondary" title={card.pathLabel}>{card.pathLabel}</td>
                <td className="truncate px-2 py-1 align-top text-secondary" title={item.supplier || "No supplier"}>
                  {item.supplier || "No supplier"}
                </td>
                <td className="truncate px-2 py-1 align-top text-tertiary" title={getItemBrandLabel(item)}>
                  {getItemBrandLabel(item)}
                </td>
                <td className="px-2 py-1 align-top font-sans tabular-nums text-ink">
                  {pesoFormatter.format(getComponentPrice(item))} / {item.unit}
                </td>
                <td className="truncate px-2 py-1 align-top text-tertiary" title={getItemPricingSourceLabel(item)}>
                  {getItemPricingSourceLabel(item)}
                </td>
                <td className="truncate px-2 py-1 align-top tabular-nums text-tertiary">
                  {item.pricingDate || "Date not set"}
                </td>
                <td className="truncate px-2 py-1 align-top text-tertiary" title={item.confidence || "Not set"}>
                  {item.confidence || "Not set"}
                </td>
                <td className="truncate px-2 py-1 align-top text-tertiary">{lifecycle}</td>
                <td className="truncate px-2 py-1 align-top text-tertiary" title={getComponentUsageLabel(item)}>
                  {getComponentUsageLabel(item)}
                </td>
                <td className="px-2 py-1 align-top">
                  <div className="flex min-w-0 items-center gap-1">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-6 items-center justify-center rounded-xs border px-2 text-[9px] font-medium leading-none text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        surfaceVariant === "glass" ? LIBRARY_GLASS_CONTROL_CLASS : "border-hairline bg-white hover:border-accent",
                      )}
                      data-component-card-inspect={item.id}
                      aria-label={`View details for ${name}`}
                      onClick={() => onInspect(item.id)}
                    >
                      Details
                    </button>
                    {canPromote ? (
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-6 items-center justify-center rounded-xs border px-2 text-[9px] font-medium leading-none text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60",
                          surfaceVariant === "glass" ? LIBRARY_GLASS_CONTROL_CLASS : "border-hairline bg-white hover:border-accent",
                        )}
                        aria-label={`Promote ${name} to library`}
                        title={`Promote ${name} to library`}
                        disabled={promotingItemId === item.id}
                        onClick={() => onPromote?.(item)}
                      >
                        {promotingItemId === item.id ? "Promoting" : "Promote"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
          {virtualEnabled && virtualPaddingBottom > 0 ? (
            <>
              {/* react-doctor-disable-next-line react-doctor/no-aria-hidden-on-focusable -- Virtualization spacer row is not user-operable content. */}
              <tr aria-hidden="true" data-component-dense-virtual-spacer="bottom">
                {/* react-doctor-disable-next-line react-doctor/control-has-associated-label -- Virtualization spacer cell is hidden from assistive tech. */}
                <td colSpan={12} style={{ height: virtualPaddingBottom, padding: 0, border: 0 }} />
              </tr>
            </>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ComponentCatalogueBranch({
  branch,
  collapsedBranchIds,
  onToggleBranch,
  selectedItemIds,
  inspectorItemId,
  onToggleSelected,
  onInspect,
  onPromote,
  promotingItemId,
}: {
  branch: CatalogueBranch;
  collapsedBranchIds: Set<string>;
  onToggleBranch: (branchId: string) => void;
  selectedItemIds: Set<string>;
  inspectorItemId: string | null;
  onToggleSelected: (itemId: string) => void;
  onInspect: (itemId: string) => void;
  onPromote?: (item: EstimateRowItem) => void;
  promotingItemId?: string | null;
}) {
  const surfaceVariant = useLibrarySurfaceVariant();
  const collapsed = collapsedBranchIds.has(branch.id);
  const eyebrow = branch.parentPathLabel || "Component Library";

  return (
    <section
      aria-label={`${branch.pathLabel} component catalogue branch`}
      data-component-catalogue-section={branch.id}
      data-component-catalogue-folder-depth={branch.depth}
      className={cn("relative", branch.depth === 0 ? "pt-1" : "pt-0.5")}
    >
      <div
        className={cn(
          "flex min-h-[72px] min-w-0 items-center gap-2 px-3 py-2.5",
          librarySurfaceClass(surfaceVariant, "contentTile"),
          surfaceVariant === "glass" && LIBRARY_GLASS_TILE_CLASS,
        )}
      >
        <button
          type="button"
          className="grid size-5 shrink-0 place-items-center rounded-xs text-tertiary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${branch.pathLabel}`}
          aria-expanded={!collapsed}
          onClick={() => onToggleBranch(branch.id)}
        >
          {collapsed ? <CaretRight size={12} weight="regular" /> : <CaretDown size={12} weight="regular" />}
        </button>
        <FolderSimple size={13} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="truncate text-[8px] font-normal uppercase leading-3 tracking-normal text-tertiary/70">
            {eyebrow}
          </p>
          <h2 className="mt-0.5 truncate text-[12px] font-medium leading-4 tracking-normal text-ink">
            {branch.label}
          </h2>
        </div>
      </div>
      {!collapsed ? (
        <>
          <CatalogueCardGrid
            cards={branch.directItems}
            label={branch.pathLabel}
            selectedItemIds={selectedItemIds}
            inspectorItemId={inspectorItemId}
            onToggleSelected={onToggleSelected}
            onInspect={onInspect}
            onPromote={onPromote}
            promotingItemId={promotingItemId}
          />
          {branch.children.length > 0 ? (
            <div className={cn("flex flex-col gap-1", branch.directItems.length > 0 ? "mt-2" : "mt-1")}>
              {branch.children.map((child) => (
                <ComponentCatalogueBranch
                  key={child.id}
                  branch={child}
                  collapsedBranchIds={collapsedBranchIds}
                  onToggleBranch={onToggleBranch}
                  selectedItemIds={selectedItemIds}
                  inspectorItemId={inspectorItemId}
                  onToggleSelected={onToggleSelected}
                  onInspect={onInspect}
                  onPromote={onPromote}
                  promotingItemId={promotingItemId}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function normalizeLibraryFolderRecords(folders: LibraryFolderRecord[]): LibraryFolderRecord[] {
  return getUserLibraryFolders(folders).map((folder) => ({
    id: folder.id,
    workspace_id: folder.workspace_id,
    parent_id: folder.parent_id,
    name: folder.name,
    sort_order: folder.sort_order,
    source_category_node_id: folder.source_category_node_id,
    folder_kind: folder.folder_kind,
  }));
}

function getSupplierBackedItems(items: EstimateRowItem[]) {
  return items.filter((item) => Boolean(item.supplierId || item.supplier?.trim()));
}

function getBrandBackedItems(items: EstimateRowItem[]) {
  return items.filter((item) => Boolean(item.brandId || item.brand?.trim()));
}

function isProjectProjectionItem(item: EstimateRowItem) {
  return readProjectComponentProjectionMetadata(item.metadata) !== null;
}

function canPromoteProjectProjectionItem(item: EstimateRowItem, projectId?: string, promotionEnabled = false) {
  const projection = readProjectComponentProjectionMetadata(item.metadata);
  return Boolean(projectId && promotionEnabled && projection?.estimateId && isPromotableProjectProjectionItem(item));
}

function isPromotableProjectProjectionItem(item: EstimateRowItem) {
  const projection = readProjectComponentProjectionMetadata(item.metadata);
  if (projection?.classification === "express") return isExpressComponentRow(item);
  if (projection?.classification === "detached-library") return item.linkState === "detached";
  return false;
}

function toSupplierTreeNodeId(supplierId: string) {
  return supplierId.startsWith("supplier-") ? supplierId : `supplier-${supplierId}`;
}

function toBrandTreeNodeId(brandId: string) {
  return brandId.startsWith("brand-") ? brandId : `brand-${brandId}`;
}

function ComponentLibraryTreePanel({
  supplierNodes,
  brandNodes,
  selectedNodeId,
  selectedBrandNodeId,
  folderNodes,
  libraryItems,
  folders,
  selectedFolderId,
  selectedItemIds,
  viewMode,
  reorderStatus,
  treeMutationPending,
  onSelectNode,
  onSelectBrandNode,
  onSelectFolder,
  onToggleSelected,
  onMoveComponentToFolder,
  onViewModeChange,
  onFoldersChange,
  onReorderStatus,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  supplierNodes: LibraryTreeNode[];
  brandNodes: LibraryTreeNode[];
  selectedNodeId: string;
  selectedBrandNodeId: string;
  folderNodes: LibraryFolderTreeNode[];
  libraryItems: EstimateRowItem[];
  folders: LibraryFolderRecord[];
  selectedFolderId: string | null;
  selectedItemIds: Set<string>;
  viewMode: ComponentViewMode;
  reorderStatus: ReorderStatus;
  treeMutationPending: boolean;
  onSelectNode: (nodeId: string) => void;
  onSelectBrandNode: (nodeId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onToggleSelected: (itemId: string) => void;
  onMoveComponentToFolder: (item: EstimateRowItem, targetFolderId: string) => Promise<void>;
  onViewModeChange: (mode: ComponentViewMode) => void;
  onFoldersChange: (folders: LibraryFolderRecord[]) => void;
  onReorderStatus: (status: ReorderStatus) => void;
  onCreateFolder: CreateLibraryFolderHandler;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, currentName: string) => void;
}) {
  const surfaceVariant = useLibrarySurfaceVariant();

  return (
    <ResizableSidePanel
      side="left"
      ariaLabel="Component library tree"
      storageKey="component_library_tree_width"
      defaultWidth={272}
      minWidth={216}
      maxWidth={432}
      widthOffset={COMPONENT_LIBRARY_TREE_WIDTH_OFFSET}
    >
      <div
        className={cn("flex h-full flex-col overflow-hidden", librarySurfaceClass(surfaceVariant, "treeRail"))}
        data-component-library-tree-panel="true"
      >
        <LibraryFolderTreeSurface
          className={surfaceVariant === "glass" ? "bg-transparent" : undefined}
          folders={folders}
          folderNodes={folderNodes}
          libraryItems={libraryItems}
          selectedComponentIds={selectedItemIds}
          selectedFolderId={selectedFolderId}
          supplierNodes={supplierNodes}
          selectedSupplierNodeId={selectedNodeId}
          brandNodes={brandNodes}
          selectedBrandNodeId={selectedBrandNodeId}
          viewMode={viewMode}
          reorderStatus={reorderStatus}
          treeMutationPending={treeMutationPending}
          onSelectSupplierNode={onSelectNode}
          onSelectBrandNode={onSelectBrandNode}
          onSelectFolder={onSelectFolder}
          onToggleComponentSelected={onToggleSelected}
          onMoveComponentToFolder={onMoveComponentToFolder}
          onViewModeChange={onViewModeChange}
          onFoldersChange={onFoldersChange}
          onReorderStatus={onReorderStatus}
          onCreateFolder={onCreateFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          showAllComponentsRoot={false}
          searchAriaLabel="Search component library tree"
          folderSearchPlaceholder="Search Library Folders"
          supplierSearchPlaceholder="Search Library Tree"
          toolbarAriaLabel="Component tree tools"
          toolbarLabelPrefix={(mode) => (mode === "default" ? "library folder" : "component tree")}
          viewModeAriaLabel="Component view mode"
        />
      </div>
    </ResizableSidePanel>
  );
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
function ComponentLibrarySheet({
  selectedFolderNode,
  selectedFolderId,
  selectedSupplierNode,
  selectedBrandNode,
  folderNodes,
  viewMode,
  libraryItems,
  categoryTree,
  suppliers,
  brands,
  status,
  componentRowsLoadState,
  selectedItemIds,
  inspectorItemId,
  onAddComponent,
  onArchiveSelected,
  onClearSelected,
  onSelectVisible,
  onToggleSelected,
  onInspectItem,
  onPromoteItem,
  promotingItemId,
}: {
  selectedFolderNode: LibraryFolderTreeNode | null;
  selectedFolderId: string | null;
  selectedSupplierNode: LibraryTreeNode | null;
  selectedBrandNode: LibraryTreeNode | null;
  folderNodes: LibraryFolderTreeNode[];
  viewMode: ComponentViewMode;
  libraryItems: EstimateRowItem[];
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplierOption[];
  brands: ComponentLibraryBrand[];
  status: SheetStatus;
  componentRowsLoadState?: ComponentRowsLoadState;
  selectedItemIds: Set<string>;
  inspectorItemId: string | null;
  onAddComponent: (trigger?: HTMLElement | null) => void;
  onArchiveSelected: (itemIds: string[]) => void;
  onClearSelected: () => void;
  onSelectVisible: (itemIds: string[]) => void;
  onToggleSelected: (itemId: string) => void;
  onInspectItem: (itemId: string) => void;
  onPromoteItem?: (item: EstimateRowItem) => void;
  promotingItemId?: string | null;
}) {
  const surfaceVariant = useLibrarySurfaceVariant();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchParams = useSearchParams();
  const facetParamsKey = searchParams?.toString() ?? "";
  const denseModeEnabled = isLibraryDenseModeEnabled();
  const [sheetState, dispatchSheet] = useReducer(
    componentLibrarySheetReducer,
    { denseModeEnabled, facetParamsKey },
    createInitialComponentLibrarySheetState,
  );
  const {
    searchQuery,
    searchOpen,
    facetFilters,
    collapsedCatalogueBranchIds,
    displayMode,
    denseSort,
  } = sheetState;
  const appliedFacetParamsKeyRef = useRef(facetParamsKey);
  // Health-line deep links re-target this route with new facet params while
  // the manager stays mounted; re-seed the facet state when they change.
  useEffect(() => {
    if (facetParamsKey === appliedFacetParamsKeyRef.current) return;
    appliedFacetParamsKeyRef.current = facetParamsKey;
    dispatchSheet({
      type: "facetParamsApplied",
      filters: parseComponentFacetSearchParams(new URLSearchParams(facetParamsKey)),
    });
  }, [facetParamsKey]);
  const effectiveDisplayMode: ComponentLibraryDisplayMode = denseModeEnabled ? displayMode : "cards";
  const sheetItems = useMemo(() => {
    if (viewMode === "suppliers") {
      if (!selectedSupplierNode || selectedSupplierNode.id === "all-suppliers") return getSupplierBackedItems(libraryItems);
      return getLibraryItemsForTreeNode("suppliers", selectedSupplierNode.id, libraryItems, [], [], { categoryTree, suppliers });
    }

    if (viewMode === "brand") {
      if (!selectedBrandNode || selectedBrandNode.id === "all-brands") return getBrandBackedItems(libraryItems);
      return getLibraryItemsForTreeNode("brands", selectedBrandNode.id, libraryItems, [], [], { categoryTree, suppliers, brands });
    }

    if (isAllComponentsFolderId(selectedFolderId)) return libraryItems;
    return selectedFolderNode ? getLibraryItemsForFolderNode(selectedFolderNode, libraryItems) : libraryItems;
  }, [brands, categoryTree, libraryItems, selectedBrandNode, selectedFolderId, selectedFolderNode, selectedSupplierNode, suppliers, viewMode]);
  const facetOptions = useMemo(() => buildComponentFacetOptions(libraryItems), [libraryItems]);
  const activeFacetCount = countActiveComponentFacets(facetFilters);
  const facetedItems = useMemo(
    () => (activeFacetCount === 0 ? sheetItems : sheetItems.filter((item) => componentMatchesFacets(item, facetFilters))),
    [activeFacetCount, facetFilters, sheetItems],
  );
  const visibleItems = useMemo(
    () => facetedItems.filter((item) => itemMatchesSheetQuery(item, searchQuery)),
    [facetedItems, searchQuery],
  );

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
      event.preventDefault();
      dispatchSheet({ type: "searchOpenChanged", open: true });
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);
  const catalogueOutline = useMemo(
    () => buildCatalogueOutline(visibleItems, folderNodes, selectedFolderNode, searchQuery),
    [folderNodes, searchQuery, selectedFolderNode, visibleItems],
  );
  const denseCatalogueCards = useMemo(() => sortDenseCatalogueCards(flattenCatalogueOutline(catalogueOutline), denseSort), [catalogueOutline, denseSort]);
  const hasCatalogueResults = catalogueOutline.branches.length > 0 || catalogueOutline.items.length > 0;
  const cardScaleFallbackActive = Boolean(
    denseModeEnabled &&
      WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.enabled &&
      effectiveDisplayMode === "cards" &&
      visibleItems.length >= WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.minRows,
  );
  const selectedVisibleItemIds = filterMapBy(
    visibleItems,
    (item) => selectedItemIds.has(item.id),
    (item) => item.id,
  );
  const resultSummary = getCatalogueScopeSummary(sheetItems.length);
  const toggleCatalogueBranch = (branchId: string) => {
    dispatchSheet({ type: "catalogueBranchToggled", branchId });
  };
  const changeDisplayMode = (mode: ComponentLibraryDisplayMode) => {
    dispatchSheet({ type: "displayModeChanged", mode });
    try {
      window.localStorage.setItem(LIBRARY_DISPLAY_MODE_STORAGE_KEY, mode);
    } catch {}
  };
  const changeDenseSort = (key: DenseSortKey) => {
    dispatchSheet({ type: "denseSortChanged", key });
  };
  const selectedLabel = viewMode === "suppliers"
    ? selectedSupplierNode?.label ?? "All Suppliers"
    : viewMode === "brand"
      ? selectedBrandNode?.label ?? "All Brands"
    : isAllComponentsFolderId(selectedFolderId)
      ? "All Components"
      : selectedFolderNode?.label ?? "Components";
  const visibleSummary = searchQuery
    ? `${visibleItems.length} shown · ${facetedItems.length} after filters`
    : activeFacetCount > 0
      ? `${facetedItems.length} shown · ${sheetItems.length} in scope`
      : resultSummary;
  const partialTotalCount = componentRowsLoadState?.totalComponentCount;
  const showPartialLoadAction = Boolean(
    componentRowsLoadState?.isPartial &&
      componentRowsLoadState.loadedComponentCount > 0 &&
      (partialTotalCount === undefined || partialTotalCount > componentRowsLoadState.loadedComponentCount),
  );
  const partialLoadLabel = partialTotalCount === undefined
    ? `Showing ${componentRowsLoadState?.loadedComponentCount ?? 0}+`
    : `Showing ${componentRowsLoadState?.loadedComponentCount ?? 0} of ${partialTotalCount}`;

  return (
    <section
      id="component-library-sheet-center-column"
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden !text-[10px]",
        librarySurfaceClass(surfaceVariant, "centerColumn"),
      )}
      data-component-library-sheet="true"
      aria-label="Component table"
    >
      <header
        className={cn("sticky top-0 z-20", librarySurfaceClass(surfaceVariant, "sheetHeader"))}
        aria-label="Component table controls"
      >
        <TreePanelHeader
          className={cn("static z-auto bg-transparent", librarySurfaceClass(surfaceVariant, "railPanelHeader"))}
          toolbarClassName={librarySurfaceClass(surfaceVariant, "toolbar")}
          showToolbarBottomBorder={surfaceVariant !== "glass"}
          ariaLabel="Component table tools"
          labelPrefix="component table"
          searchValue={searchQuery}
          onSearchValueChange={(query) => dispatchSheet({ type: "searchQueryChanged", query })}
          searchPlaceholder="Search components"
          searchLabel="Search components"
          searchOpen={searchOpen}
          onSearchOpenChange={(open) => dispatchSheet({ type: "searchOpenChanged", open })}
          searchInputRef={searchInputRef}
          showDefaultActions={false}
          filterSlot={
            <ComponentFacetFilterPopover
              options={facetOptions}
              filters={facetFilters}
              onFiltersChange={(filters) => dispatchSheet({ type: "facetFiltersChanged", filters })}
            />
          }
          addActions={[
            {
              label: "Add component",
              visibleLabel: "Add component",
              showVisibleLabel: true,
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              onClick: (event) => onAddComponent(event.currentTarget),
              className: surfaceVariant === "glass"
                ? "workshop-liquid-button min-h-11 border px-3 text-secondary hover:text-ink"
                : undefined,
            },
          ]}
        />
        <div
          className={cn(
            "flex min-h-7 shrink-0 items-center justify-between gap-2 px-2",
            librarySurfaceClass(surfaceVariant, "contextStrip"),
          )}
          data-component-sheet-context-strip="true"
        >
          <p className="truncate text-[10px] font-normal leading-4 text-secondary">
            {selectedLabel} · {visibleSummary}
          </p>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            {showPartialLoadAction ? (
              <div className="flex shrink-0 items-center gap-1 text-[9px] leading-3 text-tertiary">
                <span className="hidden sm:inline">{partialLoadLabel}</span>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-6 shrink-0 items-center gap-1 rounded-xs border px-2 text-[9px] font-medium leading-none text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-wait disabled:opacity-60",
                    surfaceVariant === "glass" ? LIBRARY_GLASS_CONTROL_CLASS : "border-hairline bg-white hover:border-accent",
                  )}
                  disabled={componentRowsLoadState?.isLoading}
                  onClick={componentRowsLoadState?.onLoadAll}
                >
                  <Rows size={10} weight="regular" aria-hidden="true" />
                  {componentRowsLoadState?.isLoading ? "Loading" : "Load all"}
                </button>
              </div>
            ) : null}
            {denseModeEnabled ? (
              // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- Display mode buttons are a named control group; <address> would be incorrect.
              <div
                role="group"
                aria-label="Component display mode"
                className={cn(
                  "flex h-6 shrink-0 items-center overflow-hidden",
                  librarySurfaceClass(surfaceVariant, "segmentedControl"),
                  surfaceVariant === "glass" && LIBRARY_GLASS_TILE_CLASS,
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-full items-center gap-1 px-2 text-[9px] font-medium leading-none text-tertiary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    effectiveDisplayMode === "cards" && (surfaceVariant === "glass" ? "bg-white/70 text-ink" : "bg-surfaceMuted text-ink"),
                  )}
                  aria-pressed={effectiveDisplayMode === "cards"}
                  onClick={() => changeDisplayMode("cards")}
                >
                  <SquaresFour size={10} weight="regular" aria-hidden="true" />
                  Cards
                </button>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-full items-center gap-1 border-l px-2 text-[9px] font-medium leading-none text-tertiary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    surfaceVariant === "glass" ? "border-[color:var(--glass-border)]" : "border-hairline",
                    effectiveDisplayMode === "dense" && (surfaceVariant === "glass" ? "bg-white/70 text-ink" : "bg-surfaceMuted text-ink"),
                  )}
                  aria-pressed={effectiveDisplayMode === "dense"}
                  onClick={() => changeDisplayMode("dense")}
                >
                  <Rows size={10} weight="regular" aria-hidden="true" />
                  Dense
                </button>
              </div>
            ) : null}
            <p aria-live="polite" className="shrink-0 text-[9px] leading-3 text-tertiary">
              {searchQuery
                ? `${visibleItems.length} of ${facetedItems.length} match "${searchQuery}"`
                : activeFacetCount > 0
                  ? `${facetedItems.length} of ${sheetItems.length} after filters`
                  : effectiveDisplayMode === "dense"
                    ? "Sorted in dense table"
                    : "Sorted by folder order"}
            </p>
          </div>
        </div>
        <ComponentAppliedFacetChips
          filters={facetFilters}
          options={facetOptions}
          onFiltersChange={(filters) => dispatchSheet({ type: "facetFiltersChanged", filters })}
          className={surfaceVariant === "glass" ? "estimate-glass-chrome estimate-glass-divider border-b-0 bg-transparent" : undefined}
          chipClassName={surfaceVariant === "glass" ? LIBRARY_GLASS_CONTROL_CLASS : undefined}
        />
        {status.state !== "idle" ? (
          <output
            aria-live="polite"
            className={cn(
              "border-b px-2 py-1 text-[10px] leading-4",
              surfaceVariant === "glass" ? "border-[color:var(--glass-border)] bg-white/20" : "border-hairline",
              status.state === "error" ? "text-red-700" : "text-tertiary",
            )}
          >
            {status.message}
          </output>
        ) : null}
        <BulkActionToolbar
          selectedCount={selectedVisibleItemIds.length}
          actionLabel="Archive selected"
          helperText="Archive is reversible and hides components from sheet insertion."
          onAction={() => onArchiveSelected(selectedVisibleItemIds)}
          onClear={onClearSelected}
          onSelectVisible={() => onSelectVisible(visibleItems.map((item) => item.id))}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {effectiveDisplayMode === "dense" ? (
          <ComponentCatalogueDenseTable
            cards={denseCatalogueCards}
            label={selectedLabel}
            sort={denseSort}
            selectedItemIds={selectedItemIds}
            inspectorItemId={inspectorItemId}
            onSort={changeDenseSort}
            onToggleSelected={onToggleSelected}
            onInspect={onInspectItem}
            onPromote={onPromoteItem}
            promotingItemId={promotingItemId}
          />
        ) : cardScaleFallbackActive && hasCatalogueResults ? (
          <div
            className={cn(
              "grid h-full min-h-[240px] place-items-center border-dashed p-4 text-center",
              librarySurfaceClass(surfaceVariant, "emptyState"),
              surfaceVariant === "glass" && LIBRARY_GLASS_TILE_CLASS,
            )}
            data-component-card-scale-fallback="true"
            data-component-card-scale-fallback-count={visibleItems.length}
            data-library-virtualization-source="WORKSHOP_VIRTUALIZATION_FLAGS"
            data-library-virtualization-min-rows={WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION.minRows}
          >
            <div className="grid justify-items-center gap-2">
              <p className="text-[10px] font-medium leading-4 text-ink">
                {String(visibleItems.length)} components match.
              </p>
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-xs border px-3 text-[10px] font-medium leading-none text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  surfaceVariant === "glass" ? LIBRARY_GLASS_CONTROL_CLASS : "border-hairline bg-white hover:border-accent",
                )}
                onClick={() => changeDisplayMode("dense")}
              >
                <Rows size={12} weight="regular" aria-hidden="true" />
                Dense
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1" aria-label={`${selectedLabel} component catalogue`}>
            {catalogueOutline.branches.map((branch) => (
              <ComponentCatalogueBranch
                key={branch.id}
                branch={branch}
                collapsedBranchIds={collapsedCatalogueBranchIds}
                onToggleBranch={toggleCatalogueBranch}
                selectedItemIds={selectedItemIds}
                inspectorItemId={inspectorItemId}
                onToggleSelected={onToggleSelected}
                onInspect={onInspectItem}
                onPromote={onPromoteItem}
                promotingItemId={promotingItemId}
              />
            ))}
            {catalogueOutline.items.length > 0 ? (
              <section aria-label={`${CATALOGUE_UNASSIGNED_LABEL} component catalogue branch`} data-component-catalogue-section="unassigned">
                <div
                  className={cn(
                    "flex min-h-[72px] min-w-0 items-center gap-2 px-3 py-2.5",
                    librarySurfaceClass(surfaceVariant, "contentTile"),
                    surfaceVariant === "glass" && LIBRARY_GLASS_TILE_CLASS,
                    surfaceVariant === "paper" && "bg-surfaceMuted/70",
                  )}
                >
                  <SquaresFour size={13} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <p className="truncate text-[8px] font-normal uppercase leading-3 tracking-normal text-tertiary/70">
                      No folder assigned
                    </p>
                    <h2 className="truncate text-[12px] font-medium leading-4 tracking-normal text-ink">
                      {CATALOGUE_UNASSIGNED_LABEL}
                    </h2>
                  </div>
                </div>
                <CatalogueCardGrid
                  cards={catalogueOutline.items}
                  label={CATALOGUE_UNASSIGNED_LABEL}
                  selectedItemIds={selectedItemIds}
                  inspectorItemId={inspectorItemId}
                  onToggleSelected={onToggleSelected}
                  onInspect={onInspectItem}
                  onPromote={onPromoteItem}
                  promotingItemId={promotingItemId}
                />
              </section>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function ComponentLibrarySheetPanel({
  selectedFolderNode,
  selectedFolderId,
  selectedSupplierNode,
  selectedBrandNode,
  folderNodes,
  viewMode,
  libraryItems,
  categoryTree,
  suppliers,
  brands,
  status,
  componentRowsLoadState,
  selectedItemIds,
  inspectorItemId,
  onAddComponent,
  onArchiveSelected,
  onClearSelected,
  onSelectVisible,
  onToggleSelected,
  onInspectItem,
  onPromoteItem,
  promotingItemId,
}: {
  selectedFolderNode: LibraryFolderTreeNode | null;
  selectedFolderId: string | null;
  selectedSupplierNode: LibraryTreeNode | null;
  selectedBrandNode: LibraryTreeNode | null;
  folderNodes: LibraryFolderTreeNode[];
  viewMode: ComponentViewMode;
  libraryItems: EstimateRowItem[];
  categoryTree: ComponentLibraryTaxonomyNode[];
  suppliers: ComponentLibrarySupplierOption[];
  brands: ComponentLibraryBrand[];
  status: SheetStatus;
  componentRowsLoadState?: ComponentRowsLoadState;
  selectedItemIds: Set<string>;
  inspectorItemId: string | null;
  onAddComponent: (trigger?: HTMLElement | null) => void;
  onArchiveSelected: (itemIds: string[]) => void;
  onClearSelected: () => void;
  onSelectVisible: (itemIds: string[]) => void;
  onToggleSelected: (itemId: string) => void;
  onInspectItem: (itemId: string) => void;
  onPromoteItem?: (item: EstimateRowItem) => void;
  promotingItemId?: string | null;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1" data-component-library-sheet-panel="true">
      <ComponentLibrarySheet
        selectedFolderNode={selectedFolderNode}
        selectedFolderId={selectedFolderId}
        selectedSupplierNode={selectedSupplierNode}
        selectedBrandNode={selectedBrandNode}
        folderNodes={folderNodes}
        viewMode={viewMode}
        libraryItems={libraryItems}
        categoryTree={categoryTree}
        suppliers={suppliers}
        brands={brands}
        status={status}
        componentRowsLoadState={componentRowsLoadState}
        selectedItemIds={selectedItemIds}
        inspectorItemId={inspectorItemId}
        onAddComponent={onAddComponent}
        onArchiveSelected={onArchiveSelected}
        onClearSelected={onClearSelected}
        onSelectVisible={onSelectVisible}
        onToggleSelected={onToggleSelected}
        onInspectItem={onInspectItem}
        onPromoteItem={onPromoteItem}
        promotingItemId={promotingItemId}
      />
    </div>
  );
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- Structural split tracked in .ai/03_plans/2026-06-23-react-doctor-warning-cleanup.md; broad refactor needs behavior tests.
export function ComponentLibraryManager({
  categoryTree = componentCategoryTree,
  suppliers = [],
  brands = [],
  libraryFolders,
  libraryItems = EMPTY_LIBRARY_ITEMS,
  workspaceId = "fallback-workspace",
  onLibraryItemsMutated = () => {},
  onLibraryFoldersMutated = () => {},
  projectId,
  promotionEnabled = false,
  componentRowsLoadState,
  onProjectPromotionSucceeded = () => {},
}: {
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  brands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
  libraryItems?: EstimateRowItem[];
  workspaceId?: string;
  // Library Optimization Plan P0 T4: the Components route shell (LibraryPageClient)
  // owns the TanStack Query cache and passes these so mutations patch that warm cache
  // instead of calling router.refresh() (which re-ran the whole server segment). They
  // default to no-ops so the manager has no hard QueryClient dependency and can still
  // be mounted bare in unit tests.
  onLibraryItemsMutated?: (updater: (items: EstimateRowItem[]) => EstimateRowItem[]) => void;
  onLibraryFoldersMutated?: (updater: (folders: LibraryFolderRecord[]) => LibraryFolderRecord[]) => void;
  projectId?: string;
  promotionEnabled?: boolean;
  componentRowsLoadState?: ComponentRowsLoadState;
  onProjectPromotionSucceeded?: () => void;
} = {}) {
  const surfaceVariant = useLibrarySurfaceVariant();
  // Mutations call these to keep the route shell's warm query cache coherent
  // (T4). No-ops when mounted bare (e.g. unit tests / surfaces without the shell).
  const syncLibraryItemsCache = onLibraryItemsMutated;
  const syncLibraryFoldersCache = onLibraryFoldersMutated;
  const addButtonReturnRef = useRef<HTMLElement | null>(null);
  const quickAddSessionCounterRef = useRef(0);
  const quickAddSessionRef = useRef<{ id: string } | null>(null);
  const selectedRouteTelemetryRef = useRef<string | null>(null);
  const handledAddComponentRouteRequestRef = useRef<string | null>(null);
  const detailHydratedItemIdsRef = useRef<Set<string> | null>(null);
  if (detailHydratedItemIdsRef.current === null) detailHydratedItemIdsRef.current = new Set<string>();
  const normalizedPropFolders = useMemo(
    // react-doctor-disable-next-line react-doctor/no-event-handler -- False positive: pure prop normalization for reducer seeding, not effect-driven event logic.
    () => normalizeLibraryFolderRecords(libraryFolders ?? []),
    [libraryFolders],
  );
  // Library Optimization Plan P1 T8 (F23): the Overview "Add component" CTA navigates
  // here with ?add=component; handle it after hydration so the modal portal does not
  // change the first client render relative to server HTML.
  const pathname = usePathname();
  const addComponentSearchParams = useSearchParams();
  const componentRouteSearchParamsKey = addComponentSearchParams?.toString() ?? "";
  const routeComponentId = addComponentSearchParams?.get(COMPONENT_ROUTE_PARAM) ?? null;
  const addComponentRequested = addComponentSearchParams?.get("add") === "component";
  const [managerState, dispatchManager] = useReducer(
    componentLibraryManagerReducer,
    // react-doctor-disable-next-line react-doctor/no-event-handler -- False positive: reducer initializer payload, not effect-driven event logic.
    { normalizedPropFolders, libraryItems },
    createInitialComponentLibraryManagerState,
  );
  const {
    localFolders,
    viewMode,
    selectedFolderId,
    selectedSupplierNodeId,
    selectedBrandNodeId,
    reorderStatus,
    sheetStatus,
    addComponentOpen,
    libraryItemState,
    selectedItemIds,
    promotingItemId,
    archiveComponentTargetIds,
    archiveComponentPreview,
    archiveComponentError,
    archiveComponentState,
    folderTextPrompt,
    folderTextPromptValue,
    deleteFolderTarget,
    editDrawerOpen,
  } = managerState;
  const setLocalFolders = (value: StateUpdater<LibraryFolderRecord[]>) =>
    dispatchManager({ type: "localFoldersChanged", value });
  const setViewMode = (value: StateUpdater<ComponentViewMode>) =>
    dispatchManager({ type: "viewModeChanged", value });
  const setSelectedFolderId = (value: StateUpdater<string | null>) =>
    dispatchManager({ type: "selectedFolderIdChanged", value });
  const setSelectedSupplierNodeId = (value: StateUpdater<string>) =>
    dispatchManager({ type: "selectedSupplierNodeIdChanged", value });
  const setSelectedBrandNodeId = (value: StateUpdater<string>) =>
    dispatchManager({ type: "selectedBrandNodeIdChanged", value });
  const setReorderStatus = (value: StateUpdater<ReorderStatus>) =>
    dispatchManager({ type: "reorderStatusChanged", value });
  const setSheetStatus = (value: StateUpdater<SheetStatus>) =>
    dispatchManager({ type: "sheetStatusChanged", value });
  const setAddComponentOpen = (value: StateUpdater<boolean>) =>
    dispatchManager({ type: "addComponentOpenChanged", value });
  const setLibraryItemState = (value: StateUpdater<LibraryItemState>) =>
    dispatchManager({ type: "libraryItemStateChanged", value });
  const setSelectedItemIds = (value: StateUpdater<Set<string>>) =>
    dispatchManager({ type: "selectedItemIdsChanged", value });
  const setPromotingItemId = (value: StateUpdater<string | null>) =>
    dispatchManager({ type: "promotingItemIdChanged", value });
  const setArchiveComponentTargetIds = (value: StateUpdater<string[]>) =>
    dispatchManager({ type: "archiveComponentTargetIdsChanged", value });
  const setArchiveComponentPreview = (value: StateUpdater<BulkActionPreviewResult | null>) =>
    dispatchManager({ type: "archiveComponentPreviewChanged", value });
  const setArchiveComponentError = (value: StateUpdater<string | null>) =>
    dispatchManager({ type: "archiveComponentErrorChanged", value });
  const setArchiveComponentState = (value: StateUpdater<ArchiveComponentState>) =>
    dispatchManager({ type: "archiveComponentStateChanged", value });
  const setFolderTextPrompt = (value: StateUpdater<FolderTextPrompt | null>) =>
    dispatchManager({ type: "folderTextPromptChanged", value });
  const setFolderTextPromptValue = (value: StateUpdater<string>) =>
    dispatchManager({ type: "folderTextPromptValueChanged", value });
  const setDeleteFolderTarget = (value: StateUpdater<{ folderId: string; currentName: string } | null>) =>
    dispatchManager({ type: "deleteFolderTargetChanged", value });
  const setEditDrawerOpen = (value: StateUpdater<boolean>) =>
    dispatchManager({ type: "editDrawerOpenChanged", value });
  // Reorder + any external folder edit goes through here so the warm query cache
  // (T4) stays coherent with localFolders. The same functional updater is applied
  // independently to both — they start equal, so they stay equal.
  const handleFoldersChange = (
    action: LibraryFolderRecord[] | ((current: LibraryFolderRecord[]) => LibraryFolderRecord[]),
  ) => {
    if (typeof action === "function") {
      setLocalFolders(action);
      syncLibraryFoldersCache(action);
    } else {
      setLocalFolders(action);
      syncLibraryFoldersCache(() => action);
    }
  };
  const [isTreeMutationPending, startTreeMutation] = useTransition();
  const [isDuplicatePending, startDuplicateTransition] = useTransition();

  const localLibraryItems = libraryItemState.source === libraryItems ? libraryItemState.items : libraryItems;
  function updateLocalLibraryItems(updater: (items: EstimateRowItem[]) => EstimateRowItem[]) {
    setLibraryItemState((current) => {
      const currentItems = current.source === libraryItems ? current.items : libraryItems;
      return {
        source: libraryItems,
        items: updater(currentItems),
      };
    });
  }

  const archiveComponentPhrase = archiveComponentTargetIds.length === 1 ? "ARCHIVE COMPONENT" : `ARCHIVE ${archiveComponentTargetIds.length} COMPONENTS`;
  const archiveComponentTitle = archiveComponentTargetIds.length === 1 ? "Archive 1 component?" : `Archive ${archiveComponentTargetIds.length} components?`;

  const folderNodes = useMemo(() => buildLibraryFolderTree(localFolders), [localFolders]);
  const firstFolderId = useMemo(() => getFirstFolderId(folderNodes), [folderNodes]);

  const supplierTree = useMemo(
    () => buildLibraryTreeWithComponentRows("suppliers", localLibraryItems, [], [], { categoryTree, suppliers }),
    [categoryTree, localLibraryItems, suppliers],
  );
  const brandTree = useMemo(
    () => buildLibraryTreeWithComponentRows("brands", localLibraryItems, [], [], { categoryTree, suppliers, brands }),
    [brands, categoryTree, localLibraryItems, suppliers],
  );
  const selectedSupplierNode = useMemo(() => findNode(supplierTree, selectedSupplierNodeId) ?? supplierTree[0] ?? null, [selectedSupplierNodeId, supplierTree]);
  const selectedBrandNode = useMemo(() => findNode(brandTree, selectedBrandNodeId) ?? brandTree[0] ?? null, [brandTree, selectedBrandNodeId]);
  const selectedSupplierIdForModal = useMemo(() => {
    if (viewMode !== "suppliers" || selectedSupplierNodeId === "all-suppliers") return null;
    return suppliers.find((supplier) => toSupplierTreeNodeId(supplier.id) === selectedSupplierNodeId)?.id ?? null;
  }, [selectedSupplierNodeId, suppliers, viewMode]);
  const selectedBrandIdForModal = useMemo(() => {
    if (viewMode !== "brand" || selectedBrandNodeId === "all-brands") return null;
    return brands.find((brand) => toBrandTreeNodeId(brand.id) === selectedBrandNodeId)?.id ?? null;
  }, [brands, selectedBrandNodeId, viewMode]);
  const selectedFolderNode = useMemo(() => (
    isAllComponentsFolderId(selectedFolderId) ? null : findFolderNode(folderNodes, selectedFolderId) ?? findFolderNode(folderNodes, firstFolderId)
  ), [firstFolderId, folderNodes, selectedFolderId]);
  const effectiveSelectedFolderId = isAllComponentsFolderId(selectedFolderId)
    ? ALL_COMPONENTS_FOLDER_ID
    : selectedFolderNode?.folderId ?? firstFolderId ?? ALL_COMPONENTS_FOLDER_ID;

  function selectFolder(folderId: string) {
    setSelectedFolderId(folderId);
  }

  function selectSupplierNode(nodeId: string) {
    setSelectedSupplierNodeId(nodeId);
  }

  function selectBrandNode(nodeId: string) {
    setSelectedBrandNodeId(nodeId);
  }

  function openAddComponentModal(trigger?: HTMLElement | null) {
    addButtonReturnRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    quickAddSessionCounterRef.current += 1;
    quickAddSessionRef.current = { id: `quick-add-${quickAddSessionCounterRef.current}` };
    recordLibraryEvent("quick_add_started", {
      workspaceId,
      sessionAddId: quickAddSessionRef.current.id,
      entry: "button",
    });
    setAddComponentOpen(true);
  }

  useEffect(() => {
    if (!addComponentRequested) {
      handledAddComponentRouteRequestRef.current = null;
      return;
    }

    const requestKey = `${pathname ?? ""}?${componentRouteSearchParamsKey}`;
    if (handledAddComponentRouteRequestRef.current === requestKey) return;
    handledAddComponentRouteRequestRef.current = requestKey;
    if (addComponentOpen) return;
    setAddComponentOpen(true);
  }, [addComponentOpen, addComponentRequested, componentRouteSearchParamsKey, pathname]);

  function restoreAddComponentTriggerFocus() {
    const target = addButtonReturnRef.current;
    if (!target) return;

    const focusTarget = () => {
      if (!target.isConnected) return;
      target.focus({ preventScroll: true });
    };

    requestAnimationFrame(() => {
      focusTarget();
      window.setTimeout(focusTarget, 0);
    });
  }

  function setAddComponentOpenWithFocus(open: boolean) {
    setAddComponentOpen(open);
    if (!open) {
      restoreAddComponentTriggerFocus();
    }
  }

  function handleComponentCreated(item: EstimateRowItem) {
    updateLocalLibraryItems((items) => [item, ...items.filter((entry) => entry.id !== item.id)]);
    if (item.libraryFolderId) setSelectedFolderId(item.libraryFolderId);
    if (item.supplierId) setSelectedSupplierNodeId(toSupplierTreeNodeId(item.supplierId));
    if (item.brandId) setSelectedBrandNodeId(toBrandTreeNodeId(item.brandId));
    setSheetStatus({ state: "saved", message: "Component saved." });
    syncLibraryItemsCache((items) => [item, ...items.filter((entry) => entry.id !== item.id)]);
    writeComponentRouteState(item.id);
    const quickAddSession = quickAddSessionRef.current;
    if (quickAddSession) {
      recordLibraryEvent("quick_add_saved", {
        workspaceId,
        sessionAddId: quickAddSession.id,
        itemId: item.id,
        usedAdvanced: false,
      });
      quickAddSessionRef.current = null;
    }
  }

  const routeComponentIsValid = Boolean(routeComponentId && localLibraryItems.some((entry) => entry.id === routeComponentId));
  const inspectorItemId = routeComponentIsValid ? routeComponentId : null;
  const inspectorItem = inspectorItemId ? localLibraryItems.find((entry) => entry.id === inspectorItemId) ?? null : null;
  const inspectorItemRef = useRef<EstimateRowItem | null>(null);
  const updateLocalLibraryItemsRef = useRef(updateLocalLibraryItems);
  const syncLibraryItemsCacheRef = useRef(syncLibraryItemsCache);

  useEffect(() => {
    inspectorItemRef.current = inspectorItem;
    updateLocalLibraryItemsRef.current = updateLocalLibraryItems;
    syncLibraryItemsCacheRef.current = syncLibraryItemsCache;
  }, [inspectorItem, syncLibraryItemsCache, updateLocalLibraryItems]);

  useEffect(() => {
    const itemId = inspectorItemId;
    const currentInspectorItem = inspectorItemRef.current;
    const detailHydratedItemIds = detailHydratedItemIdsRef.current;
    if (!itemId || !currentInspectorItem || !detailHydratedItemIds || isProjectProjectionItem(currentInspectorItem)) return;
    if (detailHydratedItemIds.has(itemId)) return;

    let stale = false;
    detailHydratedItemIds.add(itemId);
    Promise.resolve()
      .then(() => loadCostLibraryComponentRowDetail(itemId))
      .then((detail) => {
        if (stale || !detail) return;
        const mergeDetail = (items: EstimateRowItem[]) =>
          items.map((entry) => (entry.id === detail.id ? { ...entry, ...detail } : entry));
        updateLocalLibraryItemsRef.current(mergeDetail);
        syncLibraryItemsCacheRef.current(mergeDetail);
      })
      .catch(() => {
        detailHydratedItemIds.delete(itemId);
      });

    return () => {
      stale = true;
    };
  }, [inspectorItemId]);

  function writeComponentRouteState(componentId: string | null, mode: "push" | "replace" = "replace") {
    const href = buildComponentRouteStateHref({
      pathname,
      searchParams: componentRouteSearchParamsKey,
      componentId,
    });
    const historyMethod = mode === "push" ? "pushState" : "replaceState";
    window.history[historyMethod](null, "", href);
    dispatchManager({ type: "componentRouteStateVersionBumped" });
  }

  useEffect(() => {
    if (!routeComponentId) return;
    if (routeComponentIsValid) {
      if (selectedRouteTelemetryRef.current !== routeComponentId) {
        recordLibraryEvent("library_component_selected", {
          workspaceId,
          surface: "components",
          kind: "component",
          itemId: routeComponentId,
        });
        selectedRouteTelemetryRef.current = routeComponentId;
      }
      return;
    }
    recordLibraryEvent("route_state_authz_denied", {
      workspaceId,
      resourceKind: "component",
      reason: "not_found",
    });
    recordLibraryEvent("component_route_not_found", {
      workspaceId,
      surface: "components",
      reason: "not_found",
    });
    window.history.replaceState(
      null,
      "",
      buildComponentRouteStateHref({
        pathname,
        searchParams: componentRouteSearchParamsKey,
        componentId: null,
      }),
    );
  }, [componentRouteSearchParamsKey, pathname, routeComponentId, routeComponentIsValid, workspaceId]);

  function inspectComponent(itemId: string) {
    writeComponentRouteState(itemId, "push");
  }

  function closeInspector() {
    const itemId = inspectorItemId;
    setEditDrawerOpen(false);
    writeComponentRouteState(null);
    if (itemId) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-component-card-inspect="${CSS.escape(itemId)}"]`)
          ?.focus();
      });
    }
  }

  function handleComponentEdited(patch: Partial<EstimateRowItem> & { id: string }) {
    updateLocalLibraryItems((items) => items.map((entry) => (entry.id === patch.id ? { ...entry, ...patch } : entry)));
    setSheetStatus({ state: "saved", message: "Component updated." });
    syncLibraryItemsCache((items) => items.map((entry) => (entry.id === patch.id ? { ...entry, ...patch } : entry)));
  }

  function duplicateInspectorComponent() {
    const source = inspectorItem;
    if (!source) return;
    const copyName = `${source.name?.trim() || source.material} copy`;
    startDuplicateTransition(async () => {
      try {
        const result = await createCostLibraryComponent({
          name: copyName,
          description: source.description,
          category: source.category?.trim() || "Component",
          categoryNodeId: source.categoryNodeId ?? null,
          supplier: source.supplier || null,
          supplierId: source.supplierId ?? null,
          brand: source.brand || null,
          brandId: source.brandId ?? null,
          unit: source.unit,
          libraryFolderId: source.libraryFolderId ?? null,
          lifecycleState: source.lifecycleState ?? "available",
          priceOptions: [
            {
              label: copyName,
              unit: source.unit,
              unitCost: source.itemCost,
              miscCost: source.miscCost,
              pricingSource: source.pricingSource || undefined,
              pricingDate: source.pricingDate || undefined,
              confidence: source.confidence || undefined,
              isDefault: true,
            },
          ],
        });
        const duplicatedItemId = result.itemId;
        if (!duplicatedItemId) throw new Error("Duplicate did not return a component ID.");
        const duplicated: EstimateRowItem = {
          ...source,
          id: duplicatedItemId,
          name: copyName,
          material: copyName,
          isCustom: true,
          history: [],
          priceOptions: undefined,
          componentVersionNumber: result.versionNumber,
        };
        handleComponentCreated(duplicated);
        writeComponentRouteState(duplicatedItemId);
      } catch (error) {
        setSheetStatus({
          state: "error",
          message: error instanceof Error ? error.message : "Could not duplicate component.",
        });
      }
    });
  }

  function toggleComponentSelection(itemId: string) {
    setSelectedItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function selectVisibleComponents(itemIds: string[]) {
    setSelectedItemIds(new Set(itemIds));
  }

  function clearComponentSelection() {
    setSelectedItemIds(new Set());
  }

  async function promoteProjectComponent(item: EstimateRowItem) {
    const projection = readProjectComponentProjectionMetadata(item.metadata);
    const targetProjectId = projection?.projectId ?? projectId;
    const targetEstimateId = projection?.estimateId ?? null;
    if (!targetProjectId || !targetEstimateId || !canPromoteProjectProjectionItem(item, projectId, promotionEnabled)) {
      setSheetStatus({ state: "error", message: "This project component is not eligible for promotion." });
      return;
    }

    setPromotingItemId(item.id);
    setSheetStatus({ state: "saving", message: `Promoting ${getComponentName(item)} to the workspace library...` });
    try {
      await promoteExpressRowToLibraryComponent({
        projectId: targetProjectId,
        estimateId: targetEstimateId,
        rowId: item.id,
      });
      updateLocalLibraryItems((items) => items.filter((entry) => entry.id !== item.id));
      syncLibraryItemsCache((items) => items.filter((entry) => entry.id !== item.id));
      setSelectedItemIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      if (inspectorItemId === item.id) {
        writeComponentRouteState(null);
      }
      onProjectPromotionSucceeded();
      setSheetStatus({ state: "saved", message: `${getComponentName(item)} promoted to the workspace library.` });
    } catch (error) {
      setSheetStatus({ state: "error", message: error instanceof Error ? error.message : "Could not promote project component." });
    } finally {
      setPromotingItemId(null);
    }
  }

  function openArchiveComponentPreview(itemIds: string[]) {
    const itemsById = new Map(localLibraryItems.map((item) => [item.id, item]));
    const ids = Array.from(new Set(itemIds)).filter((id) => {
      const item = itemsById.get(id);
      return item && !isProjectProjectionItem(item);
    });
    if (ids.length === 0) {
      setSheetStatus({ state: "error", message: "Project components cannot be archived from the workspace library." });
      return;
    }
    setArchiveComponentTargetIds(ids);
    setArchiveComponentPreview(null);
    setArchiveComponentError(null);
    setArchiveComponentState("loading");
    startTreeMutation(() => {
      void previewBulkArchiveLibraryComponents({ itemIds: ids })
        .then((preview) => {
          setArchiveComponentPreview(preview);
          setArchiveComponentState("ready");
        })
        .catch((error: unknown) => {
          setArchiveComponentError(error instanceof Error ? error.message : "Could not load archive preview.");
          setArchiveComponentState("ready");
        });
    });
  }

  function closeArchiveComponentPreview() {
    setArchiveComponentTargetIds([]);
    setArchiveComponentPreview(null);
    setArchiveComponentError(null);
    setArchiveComponentState("idle");
  }

  function executeArchiveComponentPreview() {
    if (!archiveComponentPreview?.previewHash) return;
    const previewHash = archiveComponentPreview.previewHash;
    setArchiveComponentState("executing");
    startTreeMutation(() => {
      void executeBulkArchiveLibraryComponents({
        itemIds: archiveComponentTargetIds,
        expectedPreviewHash: previewHash,
        correlationId: createBulkActionCorrelationId(),
      })
        .then((result) => {
          if (!result.ok) {
            setArchiveComponentPreview((current) => current ? { ...current, issues: result.issues, blocked: result.blocked ?? current.blocked, ok: false } : current);
            setArchiveComponentError(result.issues[0]?.message ?? "Could not archive components.");
            setArchiveComponentState("ready");
            return;
          }
          const archivedIds = result.archivedIds?.length ? result.archivedIds : archiveComponentTargetIds;
          updateLocalLibraryItems((items) => items.filter((item) => !archivedIds.includes(item.id)));
          setSelectedItemIds((current) => {
            const next = new Set(current);
            for (const id of archivedIds) next.delete(id);
            return next;
          });
          setSheetStatus({ state: "saved", message: `${archivedIds.length} component${archivedIds.length === 1 ? "" : "s"} archived.` });
          if (inspectorItemId && archivedIds.includes(inspectorItemId)) {
            writeComponentRouteState(null);
          }
          closeArchiveComponentPreview();
          syncLibraryItemsCache((items) => items.filter((item) => !archivedIds.includes(item.id)));
        })
        .catch((error: unknown) => {
          setArchiveComponentError(error instanceof Error ? error.message : "Could not archive components.");
          setArchiveComponentState("ready");
        });
    });
  }

  function openFolderTextPrompt(next: NonNullable<typeof folderTextPrompt>) {
    setFolderTextPrompt(next);
    setFolderTextPromptValue(next.initialValue);
  }

  function submitFolderTextPrompt() {
    if (!folderTextPrompt) return;
    const value = folderTextPromptValue.trim();
    const handler = folderTextPrompt.onSubmit;
    setFolderTextPrompt(null);
    if (value) handler(value);
  }

  function commitCreateFolder(parentId: string | null, name: string, options?: Parameters<CreateLibraryFolderHandler>[1]) {
    startTreeMutation(async () => {
      setReorderStatus({ state: "saving", message: "Creating folder..." });
      try {
        const result = options?.placement === "top"
          ? await createLibraryFolder(parentId, name, { placement: options.placement })
          : await createLibraryFolder(parentId, name);
        const folder = normalizeLibraryFolderRecords([result.folder as LibraryFolderRecord])[0];
        const appendFolder = (current: LibraryFolderRecord[]) => [...current, folder];
        setLocalFolders(appendFolder);
        syncLibraryFoldersCache(appendFolder);
        selectFolder(folder.id);
        options?.onCreated?.(folder);
        setReorderStatus({ state: "saved", message: "Folder created." });
      } catch (error) {
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not create folder." });
      }
    });
  }

  const createFolder: CreateLibraryFolderHandler = (parentId, options) => {
    openFolderTextPrompt({
      title: "New folder",
      label: "Folder name",
      confirmLabel: "Create folder",
      initialValue: "",
      onSubmit: (name) => commitCreateFolder(parentId, name, options),
    });
  };

  function commitRenameFolder(folderId: string, currentName: string, name: string) {
    if (name === currentName) return;
    startTreeMutation(async () => {
      setReorderStatus({ state: "saving", message: "Renaming folder..." });
      try {
        const result = await renameLibraryFolder(folderId, name);
        const folder = normalizeLibraryFolderRecords([result.folder as LibraryFolderRecord])[0];
        const renameInList = (current: LibraryFolderRecord[]) =>
          current.map((entry) => (entry.id === folder.id ? { ...entry, name: folder.name } : entry));
        setLocalFolders(renameInList);
        syncLibraryFoldersCache(renameInList);
        setReorderStatus({ state: "saved", message: "Folder renamed." });
      } catch (error) {
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not rename folder." });
      }
    });
  }

  function renameFolder(folderId: string, currentName: string) {
    openFolderTextPrompt({
      title: "Rename folder",
      label: "Folder name",
      confirmLabel: "Save name",
      initialValue: currentName,
      onSubmit: (name) => commitRenameFolder(folderId, currentName, name),
    });
  }

  function deleteFolder(folderId: string, currentName: string) {
    setDeleteFolderTarget({ folderId, currentName });
  }

  function confirmDeleteFolder() {
    const target = deleteFolderTarget;
    if (!target) return;
    const { folderId } = target;
    setDeleteFolderTarget(null);
    startTreeMutation(async () => {
      setReorderStatus({ state: "saving", message: "Deleting folder..." });
      try {
        await deleteLibraryFolder(folderId);
        const deletedParentId = localFolders.find((folder) => folder.id === folderId)?.parent_id ?? null;
        const removeFolder = (current: LibraryFolderRecord[]) =>
          planLibraryFolderDelete(current, folderId)?.nextFolders ?? current.filter((folder) => folder.id !== folderId);
        setLocalFolders(removeFolder);
        syncLibraryFoldersCache(removeFolder);
        if (selectedFolderId === folderId) {
          setSelectedFolderId(deletedParentId);
        }
        setReorderStatus({ state: "saved", message: "Folder deleted." });
      } catch (error) {
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not delete folder." });
      }
    });
  }

  function getDeleteFolderDescription(target: { folderId: string; currentName: string }) {
    const componentCount = localLibraryItems.filter((item) => item.libraryFolderId === target.folderId).length;
    const childFolderCount = localFolders.filter((folder) => folder.parent_id === target.folderId).length;
    if (childFolderCount > 0) {
      const componentPart = componentCount === 1 ? "1 component" : `${componentCount} components`;
      const folderPart = childFolderCount === 1 ? "1 subfolder" : `${childFolderCount} subfolders`;
      if (componentCount === 0) {
        const verb = childFolderCount === 1 ? "moves" : "move";
        return `Delete "${target.currentName}"? Its ${folderPart} ${verb} out of this folder; nothing is deleted from the library.`;
      }
      return `Delete "${target.currentName}"? Its ${componentPart} and ${folderPart} move out of this folder; nothing is deleted from the library.`;
    }
    if (componentCount > 0) {
      const componentPart = componentCount === 1
        ? "1 component stays in the library and loses this folder"
        : `${componentCount} components stay in the library and lose this folder`;
      return `Delete "${target.currentName}"? Its ${componentPart}.`;
    }
    return `Delete "${target.currentName}"? This folder is empty.`;
  }

  async function moveComponentToFolder(item: EstimateRowItem, targetFolderId: string) {
    if (item.libraryFolderId === targetFolderId) return;
    const previousItem = item;

    updateLocalLibraryItems((items) =>
      items.map((entry) => (entry.id === item.id ? { ...entry, libraryFolderId: targetFolderId } : entry)),
    );

    try {
      await moveCostLibraryComponentToFolder({ itemId: item.id, libraryFolderId: targetFolderId });
      setSelectedFolderId(targetFolderId);
      syncLibraryItemsCache((items) =>
        items.map((entry) => (entry.id === item.id ? { ...entry, libraryFolderId: targetFolderId } : entry)),
      );
    } catch (error) {
      updateLocalLibraryItems((items) =>
        items.map((entry) => (entry.id === previousItem.id ? previousItem : entry)),
      );
      throw error;
    }
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 overflow-hidden rounded-xs",
        surfaceVariant === "glass" ? "border border-[color:var(--glass-border)]" : "border-r border-hairline",
        surfaceVariant === "glass" && "gap-2 p-2",
        librarySurfaceClass(surfaceVariant, "root"),
      )}
      data-component-library-workspace="true"
      data-library-surface={surfaceVariant}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
        <section
          className={cn("flex h-full min-h-0 overflow-hidden bg-transparent", surfaceVariant === "glass" && "gap-2")}
          aria-label="Component library workspace"
        >
          <ComponentLibraryTreePanel
            supplierNodes={supplierTree}
            brandNodes={brandTree}
            selectedNodeId={selectedSupplierNodeId}
            selectedBrandNodeId={selectedBrandNodeId}
            folderNodes={folderNodes}
            libraryItems={localLibraryItems}
            folders={localFolders}
            selectedFolderId={effectiveSelectedFolderId}
            viewMode={viewMode}
            reorderStatus={reorderStatus}
            treeMutationPending={isTreeMutationPending}
            selectedItemIds={selectedItemIds}
            onSelectNode={selectSupplierNode}
            onSelectBrandNode={selectBrandNode}
            onSelectFolder={selectFolder}
            onToggleSelected={toggleComponentSelection}
            onMoveComponentToFolder={moveComponentToFolder}
            onViewModeChange={setViewMode}
            onFoldersChange={handleFoldersChange}
            onReorderStatus={setReorderStatus}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
          />
          <ComponentLibrarySheetPanel
            selectedFolderNode={selectedFolderNode}
            selectedFolderId={effectiveSelectedFolderId}
            selectedSupplierNode={selectedSupplierNode}
            selectedBrandNode={selectedBrandNode}
            folderNodes={folderNodes}
            viewMode={viewMode}
            libraryItems={localLibraryItems}
            categoryTree={categoryTree}
            suppliers={suppliers}
            brands={brands}
            status={sheetStatus}
            componentRowsLoadState={componentRowsLoadState}
            selectedItemIds={selectedItemIds}
            inspectorItemId={inspectorItemId}
            onAddComponent={openAddComponentModal}
            onArchiveSelected={openArchiveComponentPreview}
            onClearSelected={clearComponentSelection}
            onSelectVisible={selectVisibleComponents}
            onToggleSelected={toggleComponentSelection}
            onInspectItem={inspectComponent}
            onPromoteItem={promotionEnabled ? promoteProjectComponent : undefined}
            promotingItemId={promotingItemId}
          />
          {inspectorItem ? (
            <ComponentInspectorDock
              item={inspectorItem}
              onClose={closeInspector}
              onEdit={() => setEditDrawerOpen(true)}
              onDuplicate={duplicateInspectorComponent}
              onArchive={() => openArchiveComponentPreview([inspectorItem.id])}
              duplicatePending={isDuplicatePending}
              canEdit={!isProjectProjectionItem(inspectorItem)}
              canDuplicate={!isProjectProjectionItem(inspectorItem)}
              canArchive={!isProjectProjectionItem(inspectorItem)}
              promoteAction={canPromoteProjectProjectionItem(inspectorItem, projectId, promotionEnabled) ? {
                label: "Promote to library",
                pending: promotingItemId === inspectorItem.id,
                onClick: () => void promoteProjectComponent(inspectorItem),
              } : undefined}
            />
          ) : null}
        </section>
      </div>
      {addComponentOpen ? (
        <AddComponentModal
          open={addComponentOpen}
          folders={localFolders}
          categoryTree={categoryTree}
          suppliers={suppliers}
          brands={brands}
          libraryItems={localLibraryItems}
          selectedFolderId={effectiveSelectedFolderId}
          selectedSupplierId={selectedSupplierIdForModal}
          selectedBrandId={selectedBrandIdForModal}
          onOpenChange={setAddComponentOpenWithFocus}
          onComponentCreated={handleComponentCreated}
          catalogueOptionsStorageScope={workspaceId}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          reorderStatus={reorderStatus}
          treeMutationPending={isTreeMutationPending}
        />
      ) : null}
      {inspectorItem ? (
        <EditComponentDrawer
          item={inspectorItem}
          open={editDrawerOpen}
          onOpenChange={setEditDrawerOpen}
          onSaved={handleComponentEdited}
        />
      ) : null}
      {deleteFolderTarget ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteFolderTarget(null);
          }}
          title="Delete folder?"
          description={getDeleteFolderDescription(deleteFolderTarget)}
          tone="destructive"
          confirmLabel="Delete folder"
          cancelLabel="Keep folder"
          onConfirm={confirmDeleteFolder}
        />
      ) : null}
      {folderTextPrompt ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setFolderTextPrompt(null);
          }}
          title={folderTextPrompt.title}
          description="Enter a folder name and confirm to apply."
          confirmLabel={folderTextPrompt.confirmLabel}
          onConfirm={submitFolderTextPrompt}
        >
          <label className="grid gap-1">
            <span className="text-[9px] font-medium text-tertiary">{folderTextPrompt.label}</span>
            <ControlInput
              aria-label={folderTextPrompt.label}
              autoFocus
              value={folderTextPromptValue}
              onChange={(event) => setFolderTextPromptValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitFolderTextPrompt();
                }
              }}
            />
          </label>
        </ConfirmDialog>
      ) : null}
      <BulkDestructivePreviewModal
        open={archiveComponentTargetIds.length > 0}
        title={archiveComponentTitle}
        description="Archiving keeps component history intact while hiding selected components from library insertion."
        requiredPhrase={archiveComponentPhrase}
        executeLabel="Archive components"
        loading={archiveComponentState === "loading"}
        executing={archiveComponentState === "executing"}
        preview={archiveComponentPreview}
        previewError={archiveComponentError}
        onExecute={executeArchiveComponentPreview}
        onOpenChange={(open) => {
          if (!open) closeArchiveComponentPreview();
        }}
      />
    </div>
  );
}
