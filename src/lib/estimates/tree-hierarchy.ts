export type EstimateTreeNodeKind = "group" | "area";
export type EstimateTreeGroupNodeKind = "group";
export type EstimateTreeDisplayNodeKind = EstimateTreeNodeKind;

export function isEstimateTreeNodeKind(value: string): value is EstimateTreeNodeKind {
  return value === "group" || value === "area";
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

export function getEstimateNodeNestingError(childKind: EstimateTreeNodeKind, parentKind: EstimateTreeNodeKind | null) {
  return `${formatEstimateNodeKind(childKind)} nodes cannot be placed under ${formatEstimateNodeKind(parentKind)}.`;
}
