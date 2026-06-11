import type { LibraryTreeNode } from "./types";

export function matchesQuery(node: LibraryTreeNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [
    node.label,
    node.meta,
    node.code,
    ...(node.aliases ?? []),
    node.item?.material,
    node.item?.supplier,
    node.item?.brand,
    node.item?.category,
    node.item?.unit,
    node.item?.description,
    node.item?.pricingSource,
    node.item?.pricingDate,
    node.item?.confidence,
    ...(node.item?.categoryPath ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterTree(nodes: LibraryTreeNode[], query: string): LibraryTreeNode[] {
  if (!query.trim()) return nodes;
  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], query);
    if (matchesQuery(node, query) || children.length > 0) {
      return [{ ...node, children }];
    }
    return [];
  });
}

export function findNode(nodes: LibraryTreeNode[], nodeId: string): LibraryTreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = findNode(node.children ?? [], nodeId);
    if (child) return child;
  }
  return null;
}

export function getAllNodeIds(nodes: LibraryTreeNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...getAllNodeIds(node.children ?? [])]);
}

export function collectComponentIds(node: LibraryTreeNode): string[] {
  if (node.item) return [node.id];
  return (node.children ?? []).flatMap(collectComponentIds);
}

/** Sibling-order overrides keyed by parent node id; root siblings use this key. */
export const LIBRARY_TREE_ROOT_ORDER_KEY = "__root__";

export type LibraryTreeOrder = Record<string, string[]>;

/**
 * Applies user sibling ordering to a derived tree. Ordered ids sort by their
 * saved position; ids the order has never seen keep their natural position
 * after the ordered ones, so new taxonomy entries still appear.
 */
export function applyLibraryTreeOrder(
  nodes: LibraryTreeNode[],
  orderByParent: LibraryTreeOrder | undefined,
  parentKey: string = LIBRARY_TREE_ROOT_ORDER_KEY,
): LibraryTreeNode[] {
  if (!orderByParent) return nodes;
  const order = orderByParent[parentKey];
  let sorted = nodes;
  if (order?.length) {
    const rank = new Map(order.map((id, index) => [id, index]));
    sorted = nodes
      .map((node, index) => ({ node, index }))
      .sort(
        (left, right) =>
          (rank.get(left.node.id) ?? order.length + left.index) -
          (rank.get(right.node.id) ?? order.length + right.index),
      )
      .map(({ node }) => node);
  }
  return sorted.map((node) =>
    node.children?.length
      ? { ...node, children: applyLibraryTreeOrder(node.children, orderByParent, node.id) }
      : node,
  );
}

/** Locates the shared parent of two nodes and its current sibling id order. */
export function findLibrarySiblingOrder(
  nodes: LibraryTreeNode[],
  draggedId: string,
  targetId: string,
  parentKey: string = LIBRARY_TREE_ROOT_ORDER_KEY,
): { parentKey: string; siblingIds: string[] } | null {
  const ids = nodes.map((node) => node.id);
  if (ids.includes(draggedId) && ids.includes(targetId)) return { parentKey, siblingIds: ids };
  for (const node of nodes) {
    if (!node.children?.length) continue;
    const found = findLibrarySiblingOrder(node.children, draggedId, targetId, node.id);
    if (found) return found;
  }
  return null;
}
