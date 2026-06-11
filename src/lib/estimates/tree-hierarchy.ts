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
