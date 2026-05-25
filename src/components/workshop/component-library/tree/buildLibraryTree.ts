import { componentCategoryTree, type ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { EstimateRowItem } from "../../estimate-tree-data";
import type { LibraryTreeNode, LibraryTreeTab } from "./types";

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
};

type BuildLibraryTreeOptions = ComponentLibraryTreeSourceOptions & {
  includeComponentRows?: boolean;
};

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreCategoryMatch(componentCategory: string, nodeLabel: string): number {
  const comp = normalizeLabel(componentCategory);
  const node = normalizeLabel(nodeLabel);

  if (comp === node) return 100;
  if (comp.includes(node) || node.includes(comp)) return 80;

  // Fuzzy partial word matches
  const compWords = comp.split(" ");
  const nodeWords = node.split(" ");
  const shared = compWords.filter((w) => nodeWords.includes(w));
  if (shared.length > 0) return shared.length * 15;

  return 0;
}

function findBestCategoryNode(
  nodes: LibraryTreeNode[],
  componentCategory: string,
  depth = 0
): { node: LibraryTreeNode; score: number; depth: number } | null {
  let best: { node: LibraryTreeNode; score: number; depth: number } | null = null;

  for (const node of nodes) {
    const score = scoreCategoryMatch(componentCategory, node.label);
    if (score > 0) {
      if (!best || score > best.score || (score === best.score && depth > best.depth)) {
        best = { node, score, depth };
      }
    }

    if (node.children) {
      const childBest = findBestCategoryNode(node.children, componentCategory, depth + 1);
      if (childBest) {
        if (!best || childBest.score > best.score || (childBest.score === best.score && childBest.depth > best.depth)) {
          best = childBest;
        }
      }
    }
  }

  return best;
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

function cloneTree(nodes: LibraryTreeNode[]): LibraryTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneTree(node.children) : undefined,
  }));
}

function buildCategoryTreeShell(categoryTree: ComponentLibraryTaxonomyNode[] = componentCategoryTree): LibraryTreeNode[] {
  return [
    {
      id: "all-components",
      label: "All Components",
      meta: "All categories",
      kind: "organizer",
      children: cloneTree(categoryTree),
    },
  ];
}

function attachComponentsToTree(
  nodes: LibraryTreeNode[],
  items: EstimateRowItem[],
  getKey: (item: EstimateRowItem) => string
): void {
  const unmatched: EstimateRowItem[] = [];

  for (const item of items) {
    const key = getKey(item);
    const exactNode = item.categoryNodeId ? findNodeById(nodes, item.categoryNodeId) : null;
    const match = exactNode ? { node: exactNode, score: 1000, depth: item.categoryPath?.length ?? 0 } : findBestCategoryNode(nodes, key);
    if (match) {
      const target = match.node;
      if (!target.children) target.children = [];
      target.children.push({
        id: item.id,
        label: item.name ?? item.material,
        kind: "component",
        item,
      });
    } else {
      unmatched.push(item);
    }
  }

  // Add unmatched items to an "Uncategorized" bucket at the root
  if (unmatched.length > 0) {
    nodes.push({
      id: "uncategorized",
      label: "Uncategorized",
      kind: "category",
      children: unmatched.map((item) => ({
        id: item.id,
        label: item.name ?? item.material,
        kind: "component",
        item,
      })),
    });
  }
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

function sortComponentRowsOnly(nodes: LibraryTreeNode[]): LibraryTreeNode[] {
  return nodes.map((node) => {
    if (!node.children) return node;

    const children = sortComponentRowsOnly(node.children);
    const folders = children.filter((child) => !child.item);
    const components = children
      .filter((child) => child.item)
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      ...node,
      children: [...folders, ...components],
    };
  });
}

function stripComponentRows(nodes: LibraryTreeNode[]): LibraryTreeNode[] {
  return nodes.flatMap((node) => {
    if (node.item) return [];
    return [
      {
        ...node,
        children: node.children ? stripComponentRows(node.children) : undefined,
      },
    ];
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

  const derivedSupplierNames = Array.from(new Set(items.map((item) => item.supplier).filter(Boolean))).sort();
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

  if (tab === "categories") {
    const tree = buildCategoryTreeShell(options.categoryTree);
    attachComponentsToTree(tree, items, (item) => item.category);
    if (!includeComponentRows) return stripComponentRows(tree);

    return sortComponentRowsOnly(tree);
  }

  if (tab === "suppliers") {
    return sortTreeNodes(buildSupplierTree(items, options.suppliers, includeComponentRows));
  }

  if (tab === "brands") {
    return sortTreeNodes(buildBrandTree(items, options.brands, includeComponentRows));
  }

  return sortTreeNodes(buildCustomTree(items, favoriteIds, recentIds, includeComponentRows));
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
