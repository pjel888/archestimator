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
