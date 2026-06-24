import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { readProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";
import type { EstimateRowItem } from "../../estimate-tree-data";
import type { LibraryTreeNode, LibraryTreeTab } from "./types";

const PROJECT_COMPONENTS_FOLDER_ID_PREFIX = "project-components";

export type ComponentLibrarySupplierOption = {
  id: string;
  name: string;
  sort_order?: number | null;
};

export type ComponentLibraryBrandOption = {
  id: string;
  name: string;
  sort_order?: number | null;
};

export type ComponentLibraryTreeSourceOptions = {
  categoryTree?: ComponentLibraryTaxonomyNode[];
  suppliers?: ComponentLibrarySupplierOption[];
  brands?: ComponentLibraryBrandOption[];
  libraryFolders?: Array<{
    id: string;
    parent_id: string | null;
    name: string;
    sort_order?: number | null;
  }>;
  /**
   * In insertion surfaces, avoid rendering hundreds of empty taxonomy folders
   * ahead of the actual matched components. Manager/navigation surfaces keep
   * the full taxonomy by omitting this option.
   */
  pruneEmptyFolders?: boolean;
};

type BuildLibraryTreeOptions = ComponentLibraryTreeSourceOptions & {
  includeComponentRows?: boolean;
};

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findNodeById(nodes: LibraryTreeNode[], nodeId: string): LibraryTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = node.children ? findNodeById(node.children, nodeId) : null;
    if (child) return child;
  }
  return null;
}

function collectItemsFromNode(node: LibraryTreeNode): EstimateRowItem[] {
  const itemsById = new Map<string, EstimateRowItem>();

  function visit(current: LibraryTreeNode) {
    if (current.item) {
      itemsById.set(current.item.id, current.item);
      return;
    }

    for (const child of current.children ?? []) visit(child);
  }

  visit(node);
  return Array.from(itemsById.values());
}

function isProjectComponentFolderId(folderId: string | null | undefined) {
  return typeof folderId === "string" && folderId.startsWith(`${PROJECT_COMPONENTS_FOLDER_ID_PREFIX}-`);
}

export function isProjectComponentProjectionItem(item: EstimateRowItem) {
  return readProjectComponentProjectionMetadata(item.metadata) !== null;
}

export function splitSidebarComponentItems(items: EstimateRowItem[]) {
  const libraryItems: EstimateRowItem[] = [];
  const projectItems: EstimateRowItem[] = [];

  for (const item of items) {
    if (isProjectComponentProjectionItem(item)) projectItems.push(item);
    else libraryItems.push(item);
  }

  return { libraryItems, projectItems };
}

function createComponentTreeNode(item: EstimateRowItem): LibraryTreeNode {
  return {
    id: item.id,
    label: item.name ?? item.material,
    kind: "component",
    item,
  };
}

function buildReusableComponentFolderTree(
  items: EstimateRowItem[],
  folders: NonNullable<ComponentLibraryTreeSourceOptions["libraryFolders"]> = [],
  includeComponentRows = true,
): LibraryTreeNode[] {
  const reusableFolders = folders.filter((folder) => !isProjectComponentFolderId(folder.id));
  const folderById = new Map(reusableFolders.map((folder) => [folder.id, folder]));
  const childrenByParentId = new Map<string | null, typeof reusableFolders>();

  for (const folder of reusableFolders) {
    const parentId = folder.parent_id && folderById.has(folder.parent_id) ? folder.parent_id : null;
    childrenByParentId.set(parentId, [...(childrenByParentId.get(parentId) ?? []), folder]);
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.name.localeCompare(right.name));
  }

  const itemsByFolderId = new Map<string, EstimateRowItem[]>();
  const unfiledItems: EstimateRowItem[] = [];

  for (const item of items) {
    const folderId = item.libraryFolderId;
    if (folderId && folderById.has(folderId)) {
      itemsByFolderId.set(folderId, [...(itemsByFolderId.get(folderId) ?? []), item]);
    } else {
      unfiledItems.push(item);
    }
  }

  function toFolderNode(folder: typeof reusableFolders[number]): LibraryTreeNode {
    const childFolders = (childrenByParentId.get(folder.id) ?? []).map(toFolderNode);
    const childItems = includeComponentRows
      ? (itemsByFolderId.get(folder.id) ?? [])
          .slice()
          .sort((left, right) => (left.name ?? left.material).localeCompare(right.name ?? right.material))
          .map(createComponentTreeNode)
      : [];

    return {
      id: folder.id,
      label: folder.name,
      kind: "folder",
      children: [...childFolders, ...childItems],
    };
  }

  const folderNodes = (childrenByParentId.get(null) ?? []).map(toFolderNode);
  const unfiledNodes = includeComponentRows
    ? unfiledItems
        .slice()
        .sort((left, right) => (left.name ?? left.material).localeCompare(right.name ?? right.material))
        .map(createComponentTreeNode)
    : [];

  return [...folderNodes, ...unfiledNodes];
}

function buildProjectComponentFolderTree(
  items: EstimateRowItem[],
  folders: NonNullable<ComponentLibraryTreeSourceOptions["libraryFolders"]> = [],
): { nodes: LibraryTreeNode[]; itemIds: Set<string> } {
  const projectFolders = folders.filter((folder) => isProjectComponentFolderId(folder.id));
  if (projectFolders.length === 0) return { nodes: [], itemIds: new Set() };

  const folderById = new Map(projectFolders.map((folder) => [folder.id, folder]));
  const childrenByParentId = new Map<string | null, typeof projectFolders>();
  for (const folder of projectFolders) {
    const parentId = folder.parent_id && folderById.has(folder.parent_id) ? folder.parent_id : null;
    childrenByParentId.set(parentId, [...(childrenByParentId.get(parentId) ?? []), folder]);
  }
  for (const siblings of childrenByParentId.values()) {
    siblings.sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.name.localeCompare(right.name));
  }

  const itemsByFolderId = new Map<string, EstimateRowItem[]>();
  const projectedItemIds = new Set<string>();
  for (const item of items) {
    const folderId = item.libraryFolderId;
    if (!folderId || !folderById.has(folderId)) continue;
    if (!isProjectComponentProjectionItem(item)) continue;
    projectedItemIds.add(item.id);
    itemsByFolderId.set(folderId, [...(itemsByFolderId.get(folderId) ?? []), item]);
  }

  function toFolderNode(folder: typeof projectFolders[number]): LibraryTreeNode | null {
    const childFolders = (childrenByParentId.get(folder.id) ?? []).flatMap((child) => {
      const node = toFolderNode(child);
      return node ? [node] : [];
    });
    const childItems = (itemsByFolderId.get(folder.id) ?? [])
      .slice()
      .sort((left, right) => (left.name ?? left.material).localeCompare(right.name ?? right.material))
      .map(createComponentTreeNode);
    const children = [...childFolders, ...childItems];
    if (children.length === 0) return null;
    return {
      id: folder.id,
      label: folder.name,
      kind: "folder",
      children,
    };
  }

  const nodes = (childrenByParentId.get(null) ?? []).flatMap((folder) => {
    const node = toFolderNode(folder);
    return node ? [node] : [];
  });

  return { nodes, itemIds: projectedItemIds };
}

export function buildProjectComponentTree(
  items: EstimateRowItem[],
  options: ComponentLibraryTreeSourceOptions = {},
): LibraryTreeNode[] {
  return buildProjectComponentFolderTree(items, options.libraryFolders).nodes;
}

function sortTreeNodes(nodes: LibraryTreeNode[]): LibraryTreeNode[] {
  return nodes
    .map((node) => {
      if (node.children) {
        return { ...node, children: sortTreeNodes(node.children) };
      }
      return node;
    })
    .sort((a, b) => {
      // Components come after folders
      const aIsComp = Boolean(a.item);
      const bIsComp = Boolean(b.item);
      if (aIsComp && !bIsComp) return 1;
      if (!aIsComp && bIsComp) return -1;
      return a.label.localeCompare(b.label);
    });
}

function pruneEmptyFolders(nodes: LibraryTreeNode[], depth = 0): LibraryTreeNode[] {
  return nodes.flatMap((node) => {
    if (node.item) return [node];

    const children = node.children ? pruneEmptyFolders(node.children, depth + 1) : [];
    // Keep top-level browse sections and their immediate category folders as
    // navigation context in the estimate sidebar, but still prune deeper empty
    // taxonomy leaves so insertion surfaces do not render the entire catalog.
    if (children.length === 0 && depth > 1) return [];

    return [{ ...node, children }];
  });
}

/* ─── Suppliers tree ─── */

function normalizeSupplierKey(value: string): string {
  return normalizeLabel(value).replace(/\s+/g, "-");
}

/* ─── Brands tree ─── */

function normalizeBrandKey(value: string): string {
  return normalizeLabel(value).replace(/\s+/g, "-");
}

function toBrandTreeNodeId(brandId: string) {
  return brandId.startsWith("brand-") ? brandId : `brand-${brandId}`;
}

function buildBrandTree(
  items: EstimateRowItem[],
  brands: ComponentLibraryBrandOption[] = [],
  includeComponentRows = true,
): LibraryTreeNode[] {
  const brandsByKey = new Map<string, ComponentLibraryBrandOption>();
  for (const brand of brands) {
    brandsByKey.set(brand.id, brand);
    brandsByKey.set(normalizeBrandKey(brand.name), brand);
  }

  const derivedBrandNames = Array.from(new Set(items.map((item) => item.brand).filter((brand): brand is string => Boolean(brand)))).sort();
  for (const brandName of derivedBrandNames) {
    const normalized = normalizeBrandKey(brandName);
    if (!brandsByKey.has(normalized)) {
      brandsByKey.set(normalized, { id: `brand-${normalized}`, name: brandName, sort_order: Number.MAX_SAFE_INTEGER });
    }
  }

  const orderedBrands = Array.from(new Map(Array.from(brandsByKey.values()).map((brand) => [brand.id, brand])).values())
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.name.localeCompare(right.name));

  return [
    {
      id: "all-brands",
      label: "All Brands",
      kind: "organizer",
      children: orderedBrands.map((brand) => {
        const brandKey = normalizeBrandKey(brand.name);
        const brandItems = items.filter((item) => item.brandId === brand.id || normalizeBrandKey(item.brand ?? "") === brandKey);
        return {
          id: toBrandTreeNodeId(brand.id),
          label: brand.name,
          kind: "brand",
          children: includeComponentRows
            ? brandItems.map((item) => ({
                id: item.id,
                label: item.name ?? item.material,
                kind: "component",
                item,
              }))
            : undefined,
        };
      }),
    },
  ];
}

function buildSupplierTree(
  items: EstimateRowItem[],
  suppliers: ComponentLibrarySupplierOption[] = [],
  includeComponentRows = true,
): LibraryTreeNode[] {
  const suppliersByKey = new Map<string, ComponentLibrarySupplierOption>();
  for (const supplier of suppliers) {
    suppliersByKey.set(supplier.id, supplier);
    suppliersByKey.set(normalizeSupplierKey(supplier.name), supplier);
  }

  const derivedSupplierNames = Array.from(new Set(items.flatMap((item) => item.supplier ? [item.supplier] : []))).sort();
  for (const supplierName of derivedSupplierNames) {
    const normalized = normalizeSupplierKey(supplierName);
    if (!suppliersByKey.has(normalized)) {
      suppliersByKey.set(normalized, { id: `supplier-${normalized}`, name: supplierName, sort_order: Number.MAX_SAFE_INTEGER });
    }
  }

  const orderedSuppliers = Array.from(new Map(Array.from(suppliersByKey.values()).map((supplier) => [supplier.id, supplier])).values())
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.name.localeCompare(right.name));

  return [
    {
      id: "all-suppliers",
      label: "All Suppliers",
      kind: "organizer",
      children: orderedSuppliers.map((supplier) => {
        const supplierKey = normalizeSupplierKey(supplier.name);
        const supplierItems = items.filter((item) => item.supplierId === supplier.id || normalizeSupplierKey(item.supplier ?? "") === supplierKey);
        return {
          id: supplier.id.startsWith("supplier-") ? supplier.id : `supplier-${supplier.id}`,
          label: supplier.name,
          kind: "supplier",
          children: includeComponentRows
            ? supplierItems.map((item) => ({
                id: item.id,
                label: item.name ?? item.material,
                kind: "component",
                item,
              }))
            : undefined,
        };
      }),
    },
  ];
}

/* ─── Custom tree ─── */

function buildCustomTree(
  items: EstimateRowItem[],
  favoriteIds: string[],
  recentIds: string[],
  includeComponentRows = true,
): LibraryTreeNode[] {
  const favorites = items.filter((i) => i.isFavorite || favoriteIds.includes(i.id));
  const recents = items.filter((i) => recentIds.includes(i.id) || i.lastUsedAt);
  const custom = items.filter((i) => i.isCustom);

  function toNodes(source: EstimateRowItem[]): LibraryTreeNode[] {
    return source.map((item) => ({
      id: item.id,
      label: item.name ?? item.material,
      kind: "component",
      item,
    }));
  }

  return [
    {
      id: "custom-root",
      label: "My Components",
      kind: "organizer",
      children: [
        {
          id: "custom-favorites",
          label: `Favorites (${favorites.length})`,
          kind: "group",
          children: includeComponentRows ? toNodes(favorites) : undefined,
        },
        {
          id: "custom-recent",
          label: `Recent (${recents.length})`,
          kind: "group",
          children: includeComponentRows ? toNodes(recents) : undefined,
        },
        {
          id: "custom-all",
          label: `All Custom (${custom.length})`,
          kind: "group",
          children: includeComponentRows ? toNodes(custom) : undefined,
        },
        {
          id: "custom-library",
          label: `Library (${items.length})`,
          kind: "group",
          children: includeComponentRows ? toNodes(items) : undefined,
        },
      ],
    },
  ];
}

/* ─── Public API ─── */

function buildLibraryTree(
  tab: LibraryTreeTab,
  items: EstimateRowItem[],
  favoriteIds: string[],
  recentIds: string[],
  options: BuildLibraryTreeOptions = {},
): LibraryTreeNode[] {
  const includeComponentRows = options.includeComponentRows ?? true;
  const libraryItems = items.filter((item) => !isProjectComponentProjectionItem(item));

  if (tab === "categories") {
    return buildReusableComponentFolderTree(libraryItems, options.libraryFolders, includeComponentRows);
  }

  if (tab === "suppliers") {
    const sortedTree = sortTreeNodes(buildSupplierTree(libraryItems, options.suppliers, includeComponentRows));
    return options.pruneEmptyFolders && includeComponentRows ? pruneEmptyFolders(sortedTree) : sortedTree;
  }

  if (tab === "brands") {
    const sortedTree = sortTreeNodes(buildBrandTree(libraryItems, options.brands, includeComponentRows));
    return options.pruneEmptyFolders && includeComponentRows ? pruneEmptyFolders(sortedTree) : sortedTree;
  }

  const sortedTree = sortTreeNodes(buildCustomTree(libraryItems, favoriteIds, recentIds, includeComponentRows));
  return options.pruneEmptyFolders && includeComponentRows ? pruneEmptyFolders(sortedTree) : sortedTree;
}

export function buildLibraryTreeWithComponentRows(
  tab: LibraryTreeTab,
  items: EstimateRowItem[],
  favoriteIds: string[],
  recentIds: string[],
  options: ComponentLibraryTreeSourceOptions = {},
): LibraryTreeNode[] {
  return buildLibraryTree(tab, items, favoriteIds, recentIds, { ...options, includeComponentRows: true });
}

export function buildComponentLibraryNavigationTree(
  tab: LibraryTreeTab,
  items: EstimateRowItem[],
  favoriteIds: string[],
  recentIds: string[],
  options: ComponentLibraryTreeSourceOptions = {},
): LibraryTreeNode[] {
  return buildLibraryTree(tab, items, favoriteIds, recentIds, { ...options, includeComponentRows: false });
}

export function getLibraryItemsForTreeNode(
  tab: LibraryTreeTab,
  selectedNodeId: string | null,
  items: EstimateRowItem[],
  favoriteIds: string[],
  recentIds: string[],
  options: ComponentLibraryTreeSourceOptions = {},
): EstimateRowItem[] {
  if (!selectedNodeId || selectedNodeId === "all-components") {
    return items;
  }

  if (selectedNodeId === "custom-root") {
    return items.filter((item) => item.isCustom);
  }

  const tree = buildLibraryTreeWithComponentRows(tab, items, favoriteIds, recentIds, options);
  const node = findNodeById(tree, selectedNodeId);
  return node ? collectItemsFromNode(node) : [];
}
