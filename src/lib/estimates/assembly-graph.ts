import type { AssemblyQuantityRule } from "./assembly-quantity-rule";

export type AssemblyGraphScope = {
  workspaceId: string;
  projectId: string;
  estimateId: string;
  tabId: string;
};

export type AssemblyGraphRow = AssemblyGraphScope & {
  rowId: string;
  nodeId: string;
  sortOrder: number;
};

type AssemblyEdgeMode = "required" | "optional";

export type AssemblyGraphEdge = {
  edgeId: string;
  parentRowId: string;
  childRowId: string;
  mode: AssemblyEdgeMode;
  included: boolean;
  quantityRule: AssemblyQuantityRule;
  revision: number;
};

type AssemblyGraphNode = {
  rowId: string;
  rootRowId: string;
  parentRowId: string | null;
  incomingEdgeId: string | null;
  depth: number;
  edgePathIncluded: boolean;
};

type ValidAssemblyGraph = {
  scope: AssemblyGraphScope;
  rows: readonly AssemblyGraphRow[];
  edges: readonly AssemblyGraphEdge[];
  roots: readonly string[];
  orderedNodes: readonly AssemblyGraphNode[];
};

type AssemblyGraphErrorCode =
  | "invalid_scope"
  | "duplicate_row"
  | "invalid_row"
  | "wrong_scope"
  | "duplicate_edge"
  | "missing_row"
  | "self_edge"
  | "duplicate_parent"
  | "invalid_edge"
  | "cross_node"
  | "cycle"
  | "invalid_root_role"
  | "conflicting_root_role";

export type AssemblyGraphValidationResult =
  | { ok: true; graph: ValidAssemblyGraph }
  | {
    ok: false;
    error: { code: AssemblyGraphErrorCode; subjectId: string; message: string };
  };

export type ValidateAssemblyGraphInput = {
  scope: AssemblyGraphScope;
  rows: readonly AssemblyGraphRow[];
  edges: readonly AssemblyGraphEdge[];
  alternativeRootRowIds?: readonly string[];
  optionalRootRowIds?: readonly string[];
};

const ERROR_MESSAGES: Record<AssemblyGraphErrorCode, string> = {
  invalid_scope: "Assembly scope identifiers must be non-empty.",
  duplicate_row: "Assembly graph contains a duplicate row.",
  invalid_row: "Assembly row identity, node, or sort order is invalid.",
  wrong_scope: "Assembly row does not belong to the requested scope.",
  duplicate_edge: "Assembly graph contains a duplicate edge.",
  missing_row: "Assembly edge or root role references a missing row.",
  self_edge: "Assembly rows cannot be their own accessory.",
  duplicate_parent: "An accessory row can have only one parent.",
  invalid_edge: "Assembly edge mode, inclusion state, or revision is invalid.",
  cross_node: "Assembly endpoints must share the exact canonical node.",
  cycle: "Assembly graph must be acyclic.",
  invalid_root_role: "Alternative and optional rows must be assembly roots.",
  conflicting_root_role: "A root cannot be both alternative and optional.",
};

function invalid(
  code: AssemblyGraphErrorCode,
  subjectId: string,
): AssemblyGraphValidationResult {
  return { ok: false, error: { code, subjectId, message: ERROR_MESSAGES[code] } };
}

function hasIdentity(value: string) {
  return value.trim().length > 0;
}

function sameScope(left: AssemblyGraphScope, right: AssemblyGraphScope) {
  return left.workspaceId === right.workspaceId
    && left.projectId === right.projectId
    && left.estimateId === right.estimateId
    && left.tabId === right.tabId;
}

function stableRowCompare(left: AssemblyGraphRow, right: AssemblyGraphRow) {
  return left.sortOrder - right.sortOrder || left.rowId.localeCompare(right.rowId);
}

function stableEdgeCompare(left: AssemblyGraphEdge, right: AssemblyGraphEdge) {
  return left.edgeId.localeCompare(right.edgeId);
}

export function validateAssemblyGraph(
  input: ValidateAssemblyGraphInput,
): AssemblyGraphValidationResult {
  if (Object.values(input.scope).some((value) => !hasIdentity(value))) {
    return invalid("invalid_scope", "scope");
  }

  const rowById = new Map<string, AssemblyGraphRow>();
  for (const row of input.rows) {
    if (!hasIdentity(row.rowId) || !hasIdentity(row.nodeId) || !Number.isSafeInteger(row.sortOrder)) {
      return invalid("invalid_row", row.rowId);
    }
    if (!sameScope(input.scope, row)) return invalid("wrong_scope", row.rowId);
    if (rowById.has(row.rowId)) return invalid("duplicate_row", row.rowId);
    rowById.set(row.rowId, row);
  }

  const edgeById = new Map<string, AssemblyGraphEdge>();
  const parentByChild = new Map<string, AssemblyGraphEdge>();
  const childrenByParent = new Map<string, AssemblyGraphEdge[]>();
  for (const edge of input.edges) {
    if (!hasIdentity(edge.edgeId) || edgeById.has(edge.edgeId)) {
      return invalid("duplicate_edge", edge.edgeId);
    }
    const parent = rowById.get(edge.parentRowId);
    const child = rowById.get(edge.childRowId);
    if (!parent) return invalid("missing_row", edge.parentRowId);
    if (!child) return invalid("missing_row", edge.childRowId);
    if (edge.parentRowId === edge.childRowId) return invalid("self_edge", edge.childRowId);
    if (parentByChild.has(edge.childRowId)) return invalid("duplicate_parent", edge.childRowId);
    if (
      (edge.mode !== "required" && edge.mode !== "optional")
      || typeof edge.included !== "boolean"
      || (edge.mode === "required" && !edge.included)
      || !Number.isSafeInteger(edge.revision)
      || edge.revision < 1
    ) return invalid("invalid_edge", edge.edgeId);
    if (parent.nodeId !== child.nodeId) return invalid("cross_node", edge.edgeId);

    edgeById.set(edge.edgeId, edge);
    parentByChild.set(edge.childRowId, edge);
    const children = childrenByParent.get(edge.parentRowId) ?? [];
    children.push(edge);
    childrenByParent.set(edge.parentRowId, children);
  }
  for (const children of childrenByParent.values()) children.sort(stableEdgeCompare);

  for (const rowId of rowById.keys()) {
    const visited = new Set<string>();
    let cursor = rowId;
    while (parentByChild.has(cursor)) {
      if (visited.has(cursor)) return invalid("cycle", cursor);
      visited.add(cursor);
      cursor = parentByChild.get(cursor)!.parentRowId;
    }
  }

  const alternativeRoots = new Set<string>();
  for (const rowId of input.alternativeRootRowIds ?? []) {
    if (!rowById.has(rowId)) return invalid("missing_row", rowId);
    if (parentByChild.has(rowId)) return invalid("invalid_root_role", rowId);
    alternativeRoots.add(rowId);
  }
  const optionalRoots = new Set<string>();
  for (const rowId of input.optionalRootRowIds ?? []) {
    if (!rowById.has(rowId)) return invalid("missing_row", rowId);
    if (parentByChild.has(rowId)) return invalid("invalid_root_role", rowId);
    if (alternativeRoots.has(rowId)) return invalid("conflicting_root_role", rowId);
    optionalRoots.add(rowId);
  }

  const sortedRows = [...input.rows].sort(stableRowCompare);
  const roots = sortedRows.filter((row) => !parentByChild.has(row.rowId)).map((row) => row.rowId);
  const orderedNodes: AssemblyGraphNode[] = [];
  for (const rootRowId of roots) {
    const stack: Array<{
      rowId: string;
      parentRowId: string | null;
      incomingEdgeId: string | null;
      depth: number;
      edgePathIncluded: boolean;
    }> = [{
      rowId: rootRowId,
      parentRowId: null,
      incomingEdgeId: null,
      depth: 0,
      edgePathIncluded: true,
    }];
    while (stack.length > 0) {
      const node = stack.pop()!;
      orderedNodes.push({ ...node, rootRowId });
      const children = childrenByParent.get(node.rowId) ?? [];
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const edge = children[index]!;
        stack.push({
          rowId: edge.childRowId,
          parentRowId: edge.parentRowId,
          incomingEdgeId: edge.edgeId,
          depth: node.depth + 1,
          edgePathIncluded: node.edgePathIncluded && edge.included,
        });
      }
    }
  }

  return {
    ok: true,
    graph: {
      scope: { ...input.scope },
      rows: sortedRows,
      edges: [...input.edges].sort(stableEdgeCompare),
      roots,
      orderedNodes,
    },
  };
}
