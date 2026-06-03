export type TreeSelectionNode = {
  id: string;
  selectable?: boolean;
  children?: TreeSelectionNode[];
};

export type TreeSelectionState = {
  checked: boolean;
  indeterminate: boolean;
};

function isSelectable(node: TreeSelectionNode): boolean {
  return node.selectable !== false;
}

function visit(nodes: TreeSelectionNode[], fn: (node: TreeSelectionNode, ancestors: string[]) => void, ancestors: string[] = []) {
  for (const node of nodes) {
    fn(node, ancestors);
    if (node.children?.length) visit(node.children, fn, [...ancestors, node.id]);
  }
}

function findNode(nodes: TreeSelectionNode[], nodeId: string): TreeSelectionNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const child = node.children?.length ? findNode(node.children, nodeId) : null;
    if (child) return child;
  }
  return null;
}

function findAncestorIds(nodes: TreeSelectionNode[], nodeId: string): string[] {
  let result: string[] = [];
  visit(nodes, (node, ancestors) => {
    if (node.id === nodeId) result = ancestors;
  });
  return result;
}

function selectableIdsForSubtree(node: TreeSelectionNode, options: { includeRoot?: boolean } = {}): string[] {
  const ids: string[] = [];
  visit([node], (candidate, ancestors) => {
    if (options.includeRoot === false && ancestors.length === 0) return;
    if (isSelectable(candidate)) ids.push(candidate.id);
  });
  return ids;
}

export function selectVisibleIds(nodes: TreeSelectionNode[], visibleIds: readonly string[]): string[] {
  const selectable = new Set<string>();
  visit(nodes, (node) => {
    if (isSelectable(node)) selectable.add(node.id);
  });
  return visibleIds.filter((id) => selectable.has(id));
}

export function pruneSelection(nodes: TreeSelectionNode[], selectedIds: ReadonlySet<string>): Set<string> {
  return new Set(selectVisibleIds(nodes, [...selectedIds]));
}

export function getSelectionState(
  nodes: TreeSelectionNode[],
  selectedIds: ReadonlySet<string>,
  nodeId: string,
): TreeSelectionState {
  const node = findNode(nodes, nodeId);
  if (!node) return { checked: false, indeterminate: false };
  if (isSelectable(node) && selectedIds.has(node.id)) return { checked: true, indeterminate: false };

  const ids = selectableIdsForSubtree(node, { includeRoot: false });
  if (ids.length === 0) return { checked: false, indeterminate: false };

  const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
  return {
    checked: selectedCount === ids.length,
    indeterminate: selectedCount > 0 && selectedCount < ids.length,
  };
}

export function dedupeSelectedRoots(nodes: TreeSelectionNode[], selectedIds: ReadonlySet<string>): string[] {
  const selected = pruneSelection(nodes, selectedIds);
  const roots: string[] = [];

  visit(nodes, (node, ancestors) => {
    if (!selected.has(node.id)) return;
    if (ancestors.some((ancestorId) => selected.has(ancestorId))) return;
    roots.push(node.id);
  });

  return roots;
}

export function toggleCascadeSelection(
  nodes: TreeSelectionNode[],
  selectedIds: ReadonlySet<string>,
  nodeId: string,
  checked: boolean,
): Set<string> {
  const next = new Set(selectedIds);
  const node = findNode(nodes, nodeId);
  if (!node) return pruneSelection(nodes, next);

  for (const id of selectableIdsForSubtree(node)) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  if (!checked) {
    for (const ancestorId of findAncestorIds(nodes, nodeId)) next.delete(ancestorId);
  }

  return pruneSelection(nodes, next);
}
