export type EstimateTreeNodeKind = "group" | "area";

/**
 * The single user-facing name for every estimate tree node. The unification
 * collapses the old "Group Node" / "Area Node" split into one concept the
 * user reads as an "Area" — the internal `kind` discriminant stays only as a
 * vestigial write-path label (see the unification plan, P4/P6 split).
 */
export const ESTIMATE_NODE_DISPLAY_NAME = "Area";

const LEGACY_ESTIMATE_GROUP_NODE_KINDS = new Set(["lot", "general", "structure", "level", "assembly"]);

export function isEstimateTreeNodeKind(value: string): value is EstimateTreeNodeKind {
  return value === "group" || value === "area";
}

// Maps any DB `kind` value (active or legacy enum) to one of the two active
// labels. The single-node model treats `kind` as a vestigial label only — no
// nesting/containment rule reads it anymore (P6) — but legacy values must
// still collapse to a known label so tree assembly and snapshots stay stable.
export function normalizeEstimateTreeNodeKind(value: string): EstimateTreeNodeKind | null {
  if (isEstimateTreeNodeKind(value)) return value;
  if (LEGACY_ESTIMATE_GROUP_NODE_KINDS.has(value)) return "group";
  return null;
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
