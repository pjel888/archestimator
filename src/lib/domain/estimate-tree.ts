export type EstimateNodeKind = "group" | "area";

export type EstimateNode = {
  id: string;
  estimateId: string;
  parentId: string | null;
  kind: EstimateNodeKind;
  name: string;
  sortOrder: number;
};

export type EstimateRowItem = {
  id: string;
  estimateId: string;
  nodeId: string;
  sortOrder: number;
  sourceLibraryItemId: string | null;
  sourceSnapshot: Record<string, unknown> | null;
  material: string;
  description: string;
  supplier: string;
  unit: string;
  quantity: number;
  unitCost: number;
  contingencyPercentage?: number;
  miscCost: number;
  rowRevision?: number;
  discipline: string;
  designation: string;
  linkState: "unlinked" | "linked-clean" | "linked-overridden" | "detached" | "source-changed";
};

export type EstimateTree = {
  nodes: EstimateNode[];
  rows: EstimateRowItem[];
};

export function canNodeReceiveRows(kind: EstimateNodeKind) {
  return kind === "area";
}

export function getNodeById(nodes: EstimateNode[], nodeId: string) {
  return nodes.find((node) => node.id === nodeId) ?? null;
}

export function isDescendantNode(nodes: EstimateNode[], nodeId: string, possibleAncestorId: string) {
  let current = getNodeById(nodes, nodeId);

  while (current?.parentId) {
    if (current.parentId === possibleAncestorId) return true;
    current = getNodeById(nodes, current.parentId);
  }

  return false;
}
