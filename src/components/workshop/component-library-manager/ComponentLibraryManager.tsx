"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { CaretDown, CaretRight, FolderSimple, ImageSquare, Plus, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/ui/empty-state";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import {
  buildComponentFacetOptions,
  componentMatchesFacets,
  ComponentFacetFilterPopover,
  COMPONENT_LIFECYCLE_FACET_LABELS,
  countActiveComponentFacets,
  parseComponentFacetSearchParams,
  type ComponentFacetFilters,
} from "@/components/workshop/library/component-facet-filter";
import { BulkActionToolbar } from "@/components/workshop/BulkActionToolbar";
import { BulkDestructivePreviewModal } from "@/components/workshop/BulkDestructivePreviewModal";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import {
  createCostLibraryComponent,
  createLibraryFolder,
  deleteLibraryFolder,
  executeBulkArchiveLibraryComponents,
  moveCostLibraryComponentToFolder,
  previewBulkArchiveLibraryComponents,
  renameLibraryFolder,
} from "@/lib/component-library/actions";
import { ComponentInspectorDock } from "@/components/workshop/library/ComponentInspectorDock";
import { EditComponentDrawer } from "@/components/workshop/library/EditComponentDrawer";
import { createBulkActionCorrelationId, type BulkActionPreviewResult } from "@/lib/mass-deletion/bulk-action";
import {
  buildLibraryFolderTree,
  getLibraryItemsForFolderNode,
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
import { estimateLibraryItems, type EstimateRowItem } from "../estimate-tree-data";
import {
  buildLibraryTreeWithComponentRows,
  getLibraryItemsForTreeNode,
} from "../component-library/tree";
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
      <div className="h-full bg-white p-2" aria-hidden="true">
        <div className="h-9 rounded-xs border border-hairline bg-surfaceMuted" />
        <div className="mt-2 h-[calc(100%-44px)] rounded-xs border border-hairline bg-surfaceMuted/40" />
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

const COMPONENT_LIBRARY_TREE_WIDTH_OFFSET = 104;
const CATALOGUE_UNASSIGNED_LABEL = "Unassigned";
const CATALOGUE_CARD_GRID_CLASS = "mt-2 grid list-none grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-2 p-0";
const CATALOGUE_CARD_SHELL_CLASS =
  "flex min-h-[236px] flex-col overflow-hidden rounded-xs border border-hairline bg-white text-left shadow-[0_10px_24px_-22px_rgba(17,24,39,0.55)]";
const CATALOGUE_CARD_BODY_HEIGHT_CLASS = "h-[132px]";

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

type SheetStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

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
    const directItems = [...(cardsByFolderId.get(node.folderId) ?? [])].sort((left, right) => (
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

function isNextImageSafeComponentSource(src: string) {
  if (!src) return false;
  if (src.startsWith("/")) return true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const imageUrl = new URL(src);
    const storageUrl = new URL(supabaseUrl);
    return imageUrl.protocol === storageUrl.protocol
      && imageUrl.hostname === storageUrl.hostname
      && imageUrl.port === storageUrl.port
      && imageUrl.pathname.startsWith("/storage/v1/object/public/component-images/");
  } catch {
    return false;
  }
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
}: {
  card: CatalogueCard;
  selected: boolean;
  inspectorSelected: boolean;
  onToggleSelected: (itemId: string) => void;
  onInspect: (itemId: string) => void;
}) {
  const item = card.item;
  const name = getComponentName(item);
  const brand = getItemBrandLabel(item);
  const pricingSource = getItemPricingSourceLabel(item);
  const lifecycleBadge = item.lifecycleState && item.lifecycleState !== "available"
    ? {
        label: COMPONENT_LIFECYCLE_FACET_LABELS[item.lifecycleState],
        className: LIFECYCLE_BADGE_CLASSES[item.lifecycleState] ?? LIFECYCLE_BADGE_CLASSES.draft,
      }
    : null;

  return (
    <li
      data-component-catalogue-card-id={item.id}
      className={cn(
        "group cursor-pointer transition hover:border-divider hover:shadow-[0_16px_32px_-24px_rgba(17,24,39,0.65)]",
        CATALOGUE_CARD_SHELL_CLASS,
        inspectorSelected && "border-ink bg-surfaceMuted/40",
      )}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("label, button, a, input")) return;
        if (event.metaKey || event.ctrlKey) {
          onToggleSelected(item.id);
          return;
        }
        onInspect(item.id);
      }}
    >
      <div className="relative aspect-square w-full overflow-hidden border-b border-hairline bg-white">
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
        <label className="absolute left-2 top-2 z-10 grid size-7 cursor-pointer place-items-center rounded-xs border border-white/70 bg-white/86 shadow-sm backdrop-blur hover:bg-white">
          <span className="sr-only">{`Select ${item.name ?? item.material} for archive`}</span>
          <input
            type="checkbox"
            className="size-3 rounded-xs border-hairline accent-danger"
            aria-label={`Select ${item.name ?? item.material} for archive`}
            checked={selected}
            onChange={() => onToggleSelected(item.id)}
          />
        </label>
        {item.imageUrl && isNextImageSafeComponentSource(item.imageUrl) ? (
          <Image
            src={item.imageUrl}
            alt={`${name} thumbnail`}
            fill
            sizes="(max-width: 768px) 50vw, 176px"
            className="object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        ) : item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={`${name} thumbnail`}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white text-tertiary" aria-hidden="true">
            <ImageSquare size={24} weight="regular" />
          </div>
        )}
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
        <div className="mt-auto border-t border-hairline pt-1.5">
          <p className="font-sans text-[11px] font-medium leading-4 tabular-nums text-ink">
            {pesoFormatter.format(getComponentPrice(item))}
          </p>
          <p className="truncate text-[9px] font-normal leading-3 text-tertiary">
            Cost / {item.unit}
          </p>
          <div className="mt-1 space-y-0.5 border-t border-hairline pt-1">
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
}: {
  cards: CatalogueCard[];
  label: string;
  selectedItemIds: Set<string>;
  inspectorItemId: string | null;
  onToggleSelected: (itemId: string) => void;
  onInspect: (itemId: string) => void;
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
        />
      ))}
    </ul>
  );
}

function CatalogueEmptyRow({ label }: { label: string }) {
  return (
    <div
      className={cn(CATALOGUE_CARD_GRID_CLASS, "relative")}
      aria-label={`${label} empty component catalogue row`}
      data-component-catalogue-empty-row="true"
    >
      <div className="invisible min-h-[236px]" aria-hidden="true" data-component-catalogue-empty-row-spacer="true">
        <div className="aspect-square w-full" />
        <div className={CATALOGUE_CARD_BODY_HEIGHT_CLASS} />
      </div>
      <p className="absolute inset-0 flex items-center justify-center border border-dashed border-hairline bg-surfaceMuted/30 px-2 text-center text-[10px] font-normal leading-3 text-tertiary opacity-50 transition-opacity hover:opacity-100">
        No components in this folder yet.
      </p>
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
}: {
  branch: CatalogueBranch;
  collapsedBranchIds: Set<string>;
  onToggleBranch: (branchId: string) => void;
  selectedItemIds: Set<string>;
  inspectorItemId: string | null;
  onToggleSelected: (itemId: string) => void;
  onInspect: (itemId: string) => void;
}) {
  const collapsed = collapsedBranchIds.has(branch.id);
  const empty = branch.totalItemCount === 0;
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
          "flex min-h-[72px] min-w-0 items-center gap-2 border-b border-hairline bg-white px-3 py-2.5",
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
          {empty ? (
            <CatalogueEmptyRow label={branch.pathLabel} />
          ) : null}
          <CatalogueCardGrid
            cards={branch.directItems}
            label={branch.pathLabel}
            selectedItemIds={selectedItemIds}
            inspectorItemId={inspectorItemId}
            onToggleSelected={onToggleSelected}
            onInspect={onInspect}
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
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function buildFallbackLibraryFolders(
  nodes: ComponentLibraryTaxonomyNode[],
  parentId: string | null = null,
  workspaceId = "fallback-workspace",
): LibraryFolderRecord[] {
  return nodes.flatMap((node, index) => {
    const folderId = `taxonomy-${node.id}`;
    return [
      {
        id: folderId,
        workspace_id: workspaceId,
        parent_id: parentId,
        name: node.label,
        sort_order: (index + 1) * 10,
        source_category_node_id: node.id,
        folder_kind: "taxonomy",
      } satisfies LibraryFolderRecord,
      ...buildFallbackLibraryFolders(node.children ?? [], folderId, workspaceId),
    ];
  });
}

function normalizeLibraryFolderRecords(folders: LibraryFolderRecord[]): LibraryFolderRecord[] {
  return folders.map((folder) => ({
    id: folder.id,
    workspace_id: folder.workspace_id,
    parent_id: folder.parent_id,
    name: folder.name,
    sort_order: folder.sort_order,
    source_category_node_id: folder.source_category_node_id,
    folder_kind: folder.folder_kind === "taxonomy" ? "taxonomy" : "custom",
  }));
}

function getSupplierBackedItems(items: EstimateRowItem[]) {
  return items.filter((item) => Boolean(item.supplierId || item.supplier?.trim()));
}

function getBrandBackedItems(items: EstimateRowItem[]) {
  return items.filter((item) => Boolean(item.brandId || item.brand?.trim()));
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
      <div className="flex h-full flex-col overflow-hidden bg-white" data-component-library-tree-panel="true">
        <LibraryFolderTreeSurface
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
  selectedItemIds,
  inspectorItemId,
  onAddComponent,
  onArchiveSelected,
  onClearSelected,
  onSelectVisible,
  onToggleSelected,
  onInspectItem,
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
  selectedItemIds: Set<string>;
  inspectorItemId: string | null;
  onAddComponent: () => void;
  onArchiveSelected: (itemIds: string[]) => void;
  onClearSelected: () => void;
  onSelectVisible: (itemIds: string[]) => void;
  onToggleSelected: (itemId: string) => void;
  onInspectItem: (itemId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchParams = useSearchParams();
  const facetParamsKey = searchParams?.toString() ?? "";
  const [appliedFacetParamsKey, setAppliedFacetParamsKey] = useState(facetParamsKey);
  const [facetFilters, setFacetFilters] = useState<ComponentFacetFilters>(() =>
    parseComponentFacetSearchParams(new URLSearchParams(facetParamsKey)),
  );
  // Health-line deep links re-target this route with new facet params while
  // the manager stays mounted; re-seed the facet state when they change.
  if (facetParamsKey !== appliedFacetParamsKey) {
    setAppliedFacetParamsKey(facetParamsKey);
    setFacetFilters(parseComponentFacetSearchParams(new URLSearchParams(facetParamsKey)));
  }
  const [collapsedCatalogueBranchIds, setCollapsedCatalogueBranchIds] = useState<Set<string>>(() => new Set());
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
      setSearchOpen(true);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);
  const catalogueOutline = useMemo(
    () => buildCatalogueOutline(visibleItems, folderNodes, selectedFolderNode, searchQuery),
    [folderNodes, searchQuery, selectedFolderNode, visibleItems],
  );
  const hasCatalogueResults = catalogueOutline.branches.length > 0 || catalogueOutline.items.length > 0;
  const selectedVisibleItemIds = visibleItems.filter((item) => selectedItemIds.has(item.id)).map((item) => item.id);
  const resultSummary = getCatalogueScopeSummary(sheetItems.length);
  const toggleCatalogueBranch = (branchId: string) => {
    setCollapsedCatalogueBranchIds((current) => {
      const next = new Set(current);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  };
  const selectedLabel = viewMode === "suppliers"
    ? selectedSupplierNode?.label ?? "All Suppliers"
    : viewMode === "brand"
      ? selectedBrandNode?.label ?? "All Brands"
    : isAllComponentsFolderId(selectedFolderId)
      ? "All Components"
      : selectedFolderNode?.label ?? "Components";

  return (
    <section
      id="component-library-sheet-center-column"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white !text-[10px]"
      data-component-library-sheet="true"
      aria-label="Component sheet"
    >
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur" aria-label="Component sheet controls">
        <TreePanelHeader
          className="static z-auto bg-transparent"
          ariaLabel="Component sheet tools"
          labelPrefix="component sheet"
          searchValue={searchQuery}
          onSearchValueChange={setSearchQuery}
          searchPlaceholder="Search components"
          searchLabel="Search components"
          searchOpen={searchOpen}
          onSearchOpenChange={setSearchOpen}
          searchInputRef={searchInputRef}
          showDefaultActions={false}
          filterSlot={
            <ComponentFacetFilterPopover
              options={facetOptions}
              filters={facetFilters}
              onFiltersChange={setFacetFilters}
            />
          }
          addActions={[
            {
              label: "Add component",
              visibleLabel: "Add component",
              showVisibleLabel: true,
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              onClick: onAddComponent,
            },
          ]}
        />
        <div
          className="flex h-7 shrink-0 items-center justify-between gap-2 border-b border-hairline px-2"
          data-component-sheet-context-strip="true"
        >
          <p className="truncate text-[10px] font-normal leading-4 text-secondary">
            {selectedLabel} · {resultSummary}
          </p>
          <p aria-live="polite" className="shrink-0 text-[9px] leading-3 text-tertiary">
            {searchQuery
              ? `${visibleItems.length} of ${facetedItems.length} match "${searchQuery}"`
              : activeFacetCount > 0
                ? `${facetedItems.length} of ${sheetItems.length} after filters`
                : "Sorted by folder order"}
          </p>
        </div>
        {status.state !== "idle" ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "border-b border-hairline px-2 py-1 text-[10px] leading-4",
              status.state === "error" ? "text-red-700" : "text-tertiary",
            )}
          >
            {status.message}
          </div>
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
        {hasCatalogueResults ? (
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
              />
            ))}
            {catalogueOutline.items.length > 0 ? (
              <section aria-label={`${CATALOGUE_UNASSIGNED_LABEL} component catalogue branch`} data-component-catalogue-section="unassigned">
                <div className="flex min-h-[72px] min-w-0 items-center gap-2 border-b border-hairline bg-surfaceMuted/70 px-3 py-2.5">
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
                />
              </section>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<SquaresFour size={18} weight="regular" aria-hidden="true" />}
            title={selectedLabel}
            description={searchQuery ? `No components match "${searchQuery}".` : "No components in this view yet."}
            className="h-full border-0 bg-white"
          />
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
  selectedItemIds,
  inspectorItemId,
  onAddComponent,
  onArchiveSelected,
  onClearSelected,
  onSelectVisible,
  onToggleSelected,
  onInspectItem,
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
  selectedItemIds: Set<string>;
  inspectorItemId: string | null;
  onAddComponent: () => void;
  onArchiveSelected: (itemIds: string[]) => void;
  onClearSelected: () => void;
  onSelectVisible: (itemIds: string[]) => void;
  onToggleSelected: (itemId: string) => void;
  onInspectItem: (itemId: string) => void;
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
        selectedItemIds={selectedItemIds}
        inspectorItemId={inspectorItemId}
        onAddComponent={onAddComponent}
        onArchiveSelected={onArchiveSelected}
        onClearSelected={onClearSelected}
        onSelectVisible={onSelectVisible}
        onToggleSelected={onToggleSelected}
        onInspectItem={onInspectItem}
      />
    </div>
  );
}

export function ComponentLibraryManager({
  categoryTree = componentCategoryTree,
  suppliers = [],
  brands = [],
  libraryFolders,
  libraryItems = estimateLibraryItems,
}: {
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  brands?: ComponentLibraryBrand[];
  libraryFolders?: LibraryFolderRecord[];
  libraryItems?: EstimateRowItem[];
} = {}) {
  const router = useNavigationRouter();
  const addButtonReturnRef = useRef<HTMLElement | null>(null);
  const fallbackFolders = useMemo(() => buildFallbackLibraryFolders(categoryTree), [categoryTree]);
  const normalizedPropFolders = useMemo(
    () => normalizeLibraryFolderRecords(libraryFolders?.length ? libraryFolders : fallbackFolders),
    [fallbackFolders, libraryFolders],
  );
  const [localFolders, setLocalFolders] = useState<LibraryFolderRecord[]>(normalizedPropFolders);
  const [viewMode, setViewMode] = useState<ComponentViewMode>("default");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(ALL_COMPONENTS_FOLDER_ID);
  const [selectedSupplierNodeId, setSelectedSupplierNodeId] = useState("all-suppliers");
  const [selectedBrandNodeId, setSelectedBrandNodeId] = useState("all-brands");
  const [reorderStatus, setReorderStatus] = useState<ReorderStatus>({ state: "idle" });
  const [sheetStatus, setSheetStatus] = useState<SheetStatus>({ state: "idle" });
  const [addComponentOpen, setAddComponentOpen] = useState(false);
  const [libraryItemState, setLibraryItemState] = useState<{ source: EstimateRowItem[]; items: EstimateRowItem[] }>(() => ({
    source: libraryItems,
    items: libraryItems,
  }));
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());
  const [archiveComponentTargetIds, setArchiveComponentTargetIds] = useState<string[]>([]);
  const [archiveComponentPreview, setArchiveComponentPreview] = useState<BulkActionPreviewResult | null>(null);
  const [archiveComponentError, setArchiveComponentError] = useState<string | null>(null);
  const [archiveComponentState, setArchiveComponentState] = useState<"idle" | "loading" | "ready" | "executing">("idle");
  const [isTreeMutationPending, startTreeMutation] = useTransition();
  const [inspectorItemId, setInspectorItemId] = useState<string | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [isDuplicatePending, startDuplicateTransition] = useTransition();

  let localLibraryItems = libraryItemState.items;
  if (libraryItemState.source !== libraryItems) {
    localLibraryItems = libraryItems;
    setLibraryItemState({ source: libraryItems, items: libraryItems });
  }

  const archiveComponentPhrase = archiveComponentTargetIds.length === 1 ? "ARCHIVE COMPONENT" : `ARCHIVE ${archiveComponentTargetIds.length} COMPONENTS`;
  const archiveComponentTitle = archiveComponentTargetIds.length === 1 ? "Archive component" : `Archive ${archiveComponentTargetIds.length} components`;

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

  function openAddComponentModal() {
    addButtonReturnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAddComponentOpen(true);
  }

  function setAddComponentOpenWithFocus(open: boolean) {
    setAddComponentOpen(open);
    if (!open) {
      requestAnimationFrame(() => addButtonReturnRef.current?.focus());
    }
  }

  function handleComponentCreated(item: EstimateRowItem) {
    setLibraryItemState((current) => ({
      ...current,
      items: [item, ...current.items.filter((entry) => entry.id !== item.id)],
    }));
    if (item.libraryFolderId) setSelectedFolderId(item.libraryFolderId);
    if (item.supplierId) setSelectedSupplierNodeId(toSupplierTreeNodeId(item.supplierId));
    if (item.brandId) setSelectedBrandNodeId(toBrandTreeNodeId(item.brandId));
    setSheetStatus({ state: "saved", message: "Component saved." });
    router.refresh();
  }

  const inspectorItem = localLibraryItems.find((entry) => entry.id === inspectorItemId) ?? null;

  function inspectComponent(itemId: string) {
    setInspectorItemId(itemId);
  }

  function closeInspector() {
    const itemId = inspectorItemId;
    setInspectorItemId(null);
    setEditDrawerOpen(false);
    if (itemId) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-component-card-inspect="${CSS.escape(itemId)}"]`)
          ?.focus();
      });
    }
  }

  function handleComponentEdited(patch: Partial<EstimateRowItem> & { id: string }) {
    setLibraryItemState((current) => ({
      ...current,
      items: current.items.map((entry) => (entry.id === patch.id ? { ...entry, ...patch } : entry)),
    }));
    setSheetStatus({ state: "saved", message: "Component updated." });
    router.refresh();
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
          category: source.category,
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
        setInspectorItemId(duplicatedItemId);
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

  function openArchiveComponentPreview(itemIds: string[]) {
    const availableIds = new Set(localLibraryItems.map((item) => item.id));
    const ids = Array.from(new Set(itemIds)).filter((id) => availableIds.has(id));
    if (ids.length === 0) return;
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
          setLibraryItemState((current) => ({
            ...current,
            items: current.items.filter((item) => !archivedIds.includes(item.id)),
          }));
          setSelectedItemIds((current) => {
            const next = new Set(current);
            for (const id of archivedIds) next.delete(id);
            return next;
          });
          setSheetStatus({ state: "saved", message: `${archivedIds.length} component${archivedIds.length === 1 ? "" : "s"} archived.` });
          closeArchiveComponentPreview();
          router.refresh();
        })
        .catch((error: unknown) => {
          setArchiveComponentError(error instanceof Error ? error.message : "Could not archive components.");
          setArchiveComponentState("ready");
        });
    });
  }

  const createFolder: CreateLibraryFolderHandler = (parentId, options) => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    startTreeMutation(async () => {
      setReorderStatus({ state: "saving", message: "Creating folder..." });
      try {
        const result = options?.placement === "top"
          ? await createLibraryFolder(parentId, name, { placement: options.placement })
          : await createLibraryFolder(parentId, name);
        const folder = normalizeLibraryFolderRecords([result.folder as LibraryFolderRecord])[0];
        setLocalFolders((current) => [...current, folder]);
        selectFolder(folder.id);
        options?.onCreated?.(folder);
        setReorderStatus({ state: "saved", message: "Folder created." });
      } catch (error) {
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not create folder." });
      }
    });
  };

  function renameFolder(folderId: string, currentName: string) {
    const name = window.prompt("Folder name", currentName);
    if (!name?.trim() || name.trim() === currentName) return;
    startTreeMutation(async () => {
      setReorderStatus({ state: "saving", message: "Renaming folder..." });
      try {
        const result = await renameLibraryFolder(folderId, name);
        const folder = normalizeLibraryFolderRecords([result.folder as LibraryFolderRecord])[0];
        setLocalFolders((current) => current.map((entry) => (entry.id === folder.id ? { ...entry, name: folder.name } : entry)));
        setReorderStatus({ state: "saved", message: "Folder renamed." });
      } catch (error) {
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not rename folder." });
      }
    });
  }

  function deleteFolder(folderId: string, currentName: string) {
    if (!window.confirm(`Delete "${currentName}"? Row items assigned to it will stay in the library without a folder.`)) return;
    startTreeMutation(async () => {
      setReorderStatus({ state: "saving", message: "Deleting folder..." });
      try {
        await deleteLibraryFolder(folderId);
        const deletedParentId = localFolders.find((folder) => folder.id === folderId)?.parent_id ?? null;
        setLocalFolders((current) => planLibraryFolderDelete(current, folderId)?.nextFolders ?? current.filter((folder) => folder.id !== folderId));
        if (selectedFolderId === folderId) {
          setSelectedFolderId(deletedParentId);
        }
        setReorderStatus({ state: "saved", message: "Folder deleted." });
      } catch (error) {
        setReorderStatus({ state: "error", message: error instanceof Error ? error.message : "Could not delete folder." });
      }
    });
  }

  async function moveComponentToFolder(item: EstimateRowItem, targetFolderId: string) {
    if (item.libraryFolderId === targetFolderId) return;
    const previousItem = item;

    setLibraryItemState((current) => ({
      ...current,
      items: current.items.map((entry) => (entry.id === item.id ? { ...entry, libraryFolderId: targetFolderId } : entry)),
    }));

    try {
      await moveCostLibraryComponentToFolder({ itemId: item.id, libraryFolderId: targetFolderId });
      setSelectedFolderId(targetFolderId);
      router.refresh();
    } catch (error) {
      setLibraryItemState((current) => ({
        ...current,
        items: current.items.map((entry) => (entry.id === previousItem.id ? previousItem : entry)),
      }));
      throw error;
    }
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xs border-r border-hairline bg-white" data-component-library-workspace="true">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label="Component library workspace">
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
            onFoldersChange={setLocalFolders}
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
            selectedItemIds={selectedItemIds}
            inspectorItemId={inspectorItemId}
            onAddComponent={openAddComponentModal}
            onArchiveSelected={openArchiveComponentPreview}
            onClearSelected={clearComponentSelection}
            onSelectVisible={selectVisibleComponents}
            onToggleSelected={toggleComponentSelection}
            onInspectItem={inspectComponent}
          />
          {inspectorItem ? (
            <ComponentInspectorDock
              item={inspectorItem}
              onClose={closeInspector}
              onEdit={() => setEditDrawerOpen(true)}
              onDuplicate={duplicateInspectorComponent}
              onArchive={() => openArchiveComponentPreview([inspectorItem.id])}
              duplicatePending={isDuplicatePending}
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
