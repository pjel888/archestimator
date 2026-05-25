"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CaretDown, CaretRight, FolderSimple, ImageSquare, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import {
  createLibraryFolder,
  deleteLibraryFolder,
  renameLibraryFolder,
} from "@/lib/component-library/actions";
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
import { AddComponentModal } from "./AddComponentModal";
import {
  ALL_COMPONENTS_FOLDER_ID,
  LibraryFolderTreeSurface,
  type ComponentViewMode,
  type CreateLibraryFolderHandler,
  type ReorderStatus,
  isAllComponentsFolderId,
} from "./LibraryFolderTree";

const COMPONENT_LIBRARY_TREE_WIDTH_OFFSET = 104;
const CATALOGUE_UNASSIGNED_LABEL = "Unassigned";
const CATALOGUE_BRANCH_INDENT_STEP = 32;
const CATALOGUE_BRANCH_MAX_INDENT = 192;
const CATALOGUE_CARD_GRID_CLASS = "mt-2 grid list-none grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-2 p-0";
const CATALOGUE_CARD_SHELL_CLASS =
  "flex min-h-[236px] flex-col overflow-hidden rounded-md border border-hairline bg-white text-left shadow-[0_10px_24px_-22px_rgba(17,24,39,0.55)]";
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

function getCatalogueIndent(depth: number) {
  return Math.min(depth * CATALOGUE_BRANCH_INDENT_STEP, CATALOGUE_BRANCH_MAX_INDENT);
}

function isNextImageSafeComponentSource(src: string) {
  if (!src) return false;
  if (src.startsWith("/")) return true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const imageUrl = new URL(src);
    const storageUrl = new URL(supabaseUrl);
    return imageUrl.hostname === storageUrl.hostname
      && imageUrl.pathname.startsWith("/storage/v1/object/public/component-images/");
  } catch {
    return false;
  }
}

function ComponentCatalogueCard({ card }: { card: CatalogueCard }) {
  const item = card.item;
  const name = getComponentName(item);
  const brand = getItemBrandLabel(item);

  return (
    <li
      data-component-catalogue-card-id={item.id}
      className={cn(
        "group transition hover:border-divider hover:shadow-[0_16px_32px_-24px_rgba(17,24,39,0.65)]",
        CATALOGUE_CARD_SHELL_CLASS,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden border-b border-hairline bg-white">
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
            <ImageSquare size={24} weight="bold" />
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
        <p className="truncate text-[8px] font-normal uppercase leading-3 tracking-[0.04em] text-tertiary" title={card.pathLabel}>
          {card.pathLabel}
        </p>
        <h3 className="line-clamp-2 text-[10px] font-semibold leading-[1.25] text-ink" title={name}>
          {name}
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
          <p className="font-mono text-[11px] font-semibold leading-4 tabular-nums text-ink">
            {pesoFormatter.format(getComponentPrice(item))}
          </p>
          <p className="truncate text-[9px] font-normal leading-3 text-tertiary">
            Cost / {item.unit}
          </p>
        </div>
      </div>
    </li>
  );
}

function CatalogueCardGrid({ cards, label }: { cards: CatalogueCard[]; label: string }) {
  if (cards.length === 0) return null;

  return (
    <ul
      className={CATALOGUE_CARD_GRID_CLASS}
      aria-label={`${label} component catalogue grid`}
    >
      {cards.map((card) => (
        <ComponentCatalogueCard key={card.item.id} card={card} />
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
}: {
  branch: CatalogueBranch;
  collapsedBranchIds: Set<string>;
  onToggleBranch: (branchId: string) => void;
}) {
  const indent = getCatalogueIndent(branch.depth);
  const collapsed = collapsedBranchIds.has(branch.id);
  const empty = branch.totalItemCount === 0;

  return (
    <section
      aria-label={`${branch.pathLabel} component catalogue branch`}
      data-component-catalogue-section={branch.id}
      data-component-catalogue-folder-depth={branch.depth}
      className={cn("relative", branch.depth === 0 ? "pt-1" : "pt-0.5")}
    >
      <div
        className={cn(
          "flex h-9 min-w-0 items-center gap-2 border-b px-2",
          branch.depth === 0 ? "border-hairline bg-surfaceMuted/70" : "border-hairline bg-white",
        )}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        <button
          type="button"
          className="grid size-5 shrink-0 place-items-center rounded-sm text-tertiary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${branch.pathLabel}`}
          aria-expanded={!collapsed}
          onClick={() => onToggleBranch(branch.id)}
        >
          {collapsed ? <CaretRight size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
        </button>
        <FolderSimple size={13} weight="bold" className="shrink-0 text-tertiary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[10px] font-bold uppercase leading-3 tracking-[0.06em] text-ink">
              {branch.label}
            </h2>
          </div>
          {branch.depth > 0 ? (
            <p className="mt-0.5 truncate text-[8px] font-normal uppercase leading-3 tracking-[0.04em] text-tertiary">
              {branch.pathLabel}
            </p>
          ) : null}
        </div>
      </div>
      {!collapsed ? (
        <>
          {empty ? (
            <CatalogueEmptyRow label={branch.pathLabel} />
          ) : null}
          <CatalogueCardGrid cards={branch.directItems} label={branch.pathLabel} />
          {branch.children.length > 0 ? (
            <div className={cn("flex flex-col gap-1", branch.directItems.length > 0 ? "mt-2" : "mt-1")}>
              {branch.children.map((child) => (
                <ComponentCatalogueBranch
                  key={child.id}
                  branch={child}
                  collapsedBranchIds={collapsedBranchIds}
                  onToggleBranch={onToggleBranch}
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
  viewMode,
  reorderStatus,
  treeMutationPending,
  onSelectNode,
  onSelectBrandNode,
  onSelectFolder,
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
  viewMode: ComponentViewMode;
  reorderStatus: ReorderStatus;
  treeMutationPending: boolean;
  onSelectNode: (nodeId: string) => void;
  onSelectBrandNode: (nodeId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onViewModeChange: (mode: ComponentViewMode) => void;
  onFoldersChange: (folders: LibraryFolderRecord[]) => void;
  onReorderStatus: (status: ReorderStatus) => void;
  onCreateFolder: CreateLibraryFolderHandler;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, currentName: string) => void;
}) {
  return (
    <ResizableSidePanel
      side="right"
      ariaLabel="Component library tree"
      storageKey="component_library_tree_width"
      defaultWidth={272}
      minWidth={216}
      maxWidth={432}
      widthOffset={COMPONENT_LIBRARY_TREE_WIDTH_OFFSET}
    >
      <div className="flex h-full flex-col overflow-hidden border-l border-hairline bg-white" data-component-library-tree-panel="true">
        <LibraryFolderTreeSurface
          folders={folders}
          folderNodes={folderNodes}
          libraryItems={libraryItems}
          selectedFolderId={selectedFolderId}
          supplierNodes={supplierNodes}
          selectedSupplierNodeId={selectedNodeId}
          brandNodes={brandNodes}
          selectedBrandNodeId={selectedBrandNodeId}
          viewMode={viewMode}
          reorderStatus={reorderStatus}
          treeMutationPending={treeMutationPending}
          bodyTopSpacer={<div className="h-6" />}
          onSelectSupplierNode={onSelectNode}
          onSelectBrandNode={onSelectBrandNode}
          onSelectFolder={onSelectFolder}
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
          tabsAriaLabel="Library views"
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
  onAddComponent,
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
  onAddComponent: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
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
  const visibleItems = useMemo(
    () => sheetItems.filter((item) => itemMatchesSheetQuery(item, searchQuery)),
    [searchQuery, sheetItems],
  );
  const catalogueOutline = useMemo(
    () => buildCatalogueOutline(visibleItems, folderNodes, selectedFolderNode, searchQuery),
    [folderNodes, searchQuery, selectedFolderNode, visibleItems],
  );
  const hasCatalogueResults = catalogueOutline.branches.length > 0 || catalogueOutline.items.length > 0;
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
        <div className="flex h-[38px] items-center">
          <SearchInput
            wrapperClassName="w-full"
            placeholder="Search Component Sheet"
            aria-label="Search component sheet"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <HeaderIconToolbar
          ariaLabel="Component sheet tools"
          labelPrefix="component sheet"
          addActions={[
            {
              label: "Add Component",
              visibleLabel: "Add Component",
              onClick: onAddComponent,
            },
          ]}
        />
        <div className="flex h-[32px] items-end gap-0 border-b border-hairline bg-surfaceMuted" role="tablist" aria-label="Component sheet tabs">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className={cn(
              "relative h-full rounded-t-md border border-b-0 px-3 text-[10px] font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              "z-10 -mb-px border-hairline bg-white text-ink",
            )}
          >
            {selectedLabel}
          </button>
          <span className="self-center px-2 text-[9px] font-bold text-tertiary">
            {visibleItems.length} / {sheetItems.length}
          </span>
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
              />
            ))}
            {catalogueOutline.items.length > 0 ? (
              <section aria-label={`${CATALOGUE_UNASSIGNED_LABEL} component catalogue branch`} data-component-catalogue-section="unassigned">
                <div className="flex h-9 min-w-0 items-center gap-2 border-b border-hairline bg-surfaceMuted/70 px-2">
                  <SquaresFour size={13} weight="bold" className="shrink-0 text-tertiary" aria-hidden="true" />
                  <h2 className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase leading-3 tracking-[0.06em] text-ink">
                    {CATALOGUE_UNASSIGNED_LABEL}
                  </h2>
                </div>
                <CatalogueCardGrid cards={catalogueOutline.items} label={CATALOGUE_UNASSIGNED_LABEL} />
              </section>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<SquaresFour size={18} weight="bold" aria-hidden="true" />}
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
  onAddComponent,
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
  onAddComponent: () => void;
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
        onAddComponent={onAddComponent}
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
  const router = useRouter();
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
  const [isTreeMutationPending, startTreeMutation] = useTransition();

  let localLibraryItems = libraryItemState.items;
  if (libraryItemState.source !== libraryItems) {
    localLibraryItems = libraryItems;
    setLibraryItemState({ source: libraryItems, items: libraryItems });
  }

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

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-hairline bg-white" data-component-library-workspace="true">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
        <div
          className="relative h-10 shrink-0 border-b border-hairline bg-white"
          data-workshop-layout="component-library-workspace-header-row"
        >
          <div
            className="absolute inset-y-0 left-0 right-0 flex min-w-0 items-center"
            data-component-library-center-header="true"
          />
        </div>

        <section className="flex h-full min-h-0 overflow-hidden bg-white" aria-label="Component library workspace">
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
            onAddComponent={openAddComponentModal}
          />
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
            onSelectNode={selectSupplierNode}
            onSelectBrandNode={selectBrandNode}
            onSelectFolder={selectFolder}
            onViewModeChange={setViewMode}
            onFoldersChange={setLocalFolders}
            onReorderStatus={setReorderStatus}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
          />
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
    </div>
  );
}
