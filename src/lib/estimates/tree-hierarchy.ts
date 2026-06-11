export type EstimateTreeNodeKind = "group" | "area";
export type EstimateTreeGroupNodeKind = "group";
export type EstimateTreeDisplayNodeKind = EstimateTreeNodeKind;

const LEGACY_ESTIMATE_GROUP_NODE_KINDS = new Set(["lot", "general", "structure", "level", "assembly"]);

export function isEstimateTreeNodeKind(value: string): value is EstimateTreeNodeKind {
  return value === "group" || value === "area";
}

export function normalizeEstimateTreeNodeKind(value: string): EstimateTreeNodeKind | null {
  if (isEstimateTreeNodeKind(value)) return value;
  if (LEGACY_ESTIMATE_GROUP_NODE_KINDS.has(value)) return "group";
  return null;
}

export function isEstimateGroupNodeKind(kind: EstimateTreeNodeKind | null | undefined): kind is EstimateTreeGroupNodeKind {
  return kind === "group";
}

export function getEstimateNodeDisplayKind(kind: EstimateTreeNodeKind): EstimateTreeDisplayNodeKind {
  return kind;
}

export function canNestEstimateNodeKind(childKind: EstimateTreeNodeKind, parentKind: EstimateTreeNodeKind | null) {
  if (parentKind === null) return childKind === "group";
  return parentKind === "group";
}

export function formatEstimateNodeKind(kind: EstimateTreeNodeKind | null) {
  if (!kind) return "estimate root";
  return getEstimateNodeDisplayKind(kind);
}

/**
 * Name for the group auto-created when a template drops onto an area node.
 * Areas cannot take child nodes, so the drop wraps the area and the template
 * in a new sibling-replacing group; client (optimistic) and server both
 * derive the same name from here.
 */
export function getEstimateWrapGroupName(areaName: string) {
  const trimmed = areaName.trim();
  return trimmed ? `${trimmed} Group` : "New Group";
}

export function getEstimateNodeNestingError(childKind: EstimateTreeNodeKind, parentKind: EstimateTreeNodeKind | null) {
  return `${formatEstimateNodeKind(childKind)} nodes cannot be placed under ${formatEstimateNodeKind(parentKind)}.`;
}

export type EstimateFirstNodeSourceRow = {
  id: string;
  estimate_id: string;
  kind: string;
  parent_id: string | null;
};

/**
 * First node to land on when opening an estimate sheet: the first area in
 * depth-first tree order, falling back to the first root when the estimate
 * has no areas. Input must be in query order (sort_order ASC) — sort_order
 * is a per-sibling-level value, so comparing it across parents is
 * meaningless and selection has to walk the tree. Assembly mirrors
 * buildEstimateTree (unknown kinds drop, their children promote to roots)
 * so the landing node always agrees with the first area the sheet renders.
 */
export function selectFirstEstimateNodeIds(nodes: EstimateFirstNodeSourceRow[]): Map<string, string> {
  const nodesByEstimateId = new Map<string, EstimateFirstNodeSourceRow[]>();
  for (const node of nodes) {
    const estimateNodes = nodesByEstimateId.get(node.estimate_id);
    if (estimateNodes) estimateNodes.push(node);
    else nodesByEstimateId.set(node.estimate_id, [node]);
  }

  const firstNodeByEstimateId = new Map<string, string>();
  for (const [estimateId, estimateNodes] of nodesByEstimateId) {
    const firstNodeId = findFirstNodeInTreeOrder(estimateNodes);
    if (firstNodeId) firstNodeByEstimateId.set(estimateId, firstNodeId);
  }
  return firstNodeByEstimateId;
}

function findFirstNodeInTreeOrder(nodes: EstimateFirstNodeSourceRow[]): string | null {
  const kindById = new Map<string, EstimateTreeNodeKind>();
  for (const node of nodes) {
    const kind = normalizeEstimateTreeNodeKind(node.kind);
    if (kind) kindById.set(node.id, kind);
  }

  const childIdsByParentId = new Map<string, string[]>();
  const rootIds: string[] = [];
  for (const node of nodes) {
    if (!kindById.has(node.id)) continue;
    if (node.parent_id && kindById.has(node.parent_id)) {
      const siblingIds = childIdsByParentId.get(node.parent_id);
      if (siblingIds) siblingIds.push(node.id);
      else childIdsByParentId.set(node.parent_id, [node.id]);
    } else {
      rootIds.push(node.id);
    }
  }

  const findFirstArea = (ids: string[]): string | null => {
    for (const id of ids) {
      if (kindById.get(id) === "area") return id;
      const nestedAreaId = findFirstArea(childIdsByParentId.get(id) ?? []);
      if (nestedAreaId) return nestedAreaId;
    }
    return null;
  };

  return findFirstArea(rootIds) ?? rootIds[0] ?? null;
}
