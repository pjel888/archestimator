export type EstimateTreeNodeKind = "group" | "lot" | "general" | "structure" | "level" | "area";
export type EstimateTreeGroupNodeKind = Exclude<EstimateTreeNodeKind, "area">;
export type EstimateTreeDisplayNodeKind = "group" | "area";

const ROOT_PARENT_KIND = "root";
const GROUP_NODE_KINDS = ["group", "lot", "general", "structure", "level"] as const satisfies readonly EstimateTreeGroupNodeKind[];

const ALLOWED_CHILD_KINDS_BY_PARENT: Record<EstimateTreeNodeKind | typeof ROOT_PARENT_KIND, readonly EstimateTreeNodeKind[]> = {
  root: GROUP_NODE_KINDS,
  group: [...GROUP_NODE_KINDS, "area"],
  lot: [...GROUP_NODE_KINDS, "area"],
  general: [...GROUP_NODE_KINDS, "area"],
  structure: [...GROUP_NODE_KINDS, "area"],
  level: [...GROUP_NODE_KINDS, "area"],
  area: [],
};

export function isEstimateTreeNodeKind(value: string): value is EstimateTreeNodeKind {
  return value === "group" || value === "lot" || value === "general" || value === "structure" || value === "level" || value === "area";
}

export function isEstimateGroupNodeKind(kind: EstimateTreeNodeKind | null | undefined): kind is EstimateTreeGroupNodeKind {
  return Boolean(kind && kind !== "area");
}

export function getEstimateNodeDisplayKind(kind: EstimateTreeNodeKind): EstimateTreeDisplayNodeKind {
  return isEstimateGroupNodeKind(kind) ? "group" : "area";
}

export function canNestEstimateNodeKind(childKind: EstimateTreeNodeKind, parentKind: EstimateTreeNodeKind | null) {
  const parentKey = parentKind ?? ROOT_PARENT_KIND;
  return ALLOWED_CHILD_KINDS_BY_PARENT[parentKey].includes(childKind);
}

export function formatEstimateNodeKind(kind: EstimateTreeNodeKind | null) {
  if (!kind) return "estimate root";
  return getEstimateNodeDisplayKind(kind);
}

export function getEstimateNodeNestingError(childKind: EstimateTreeNodeKind, parentKind: EstimateTreeNodeKind | null) {
  return `${formatEstimateNodeKind(childKind)} nodes cannot be placed under ${formatEstimateNodeKind(parentKind)}.`;
}
