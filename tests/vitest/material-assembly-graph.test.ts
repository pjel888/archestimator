import { describe, expect, it } from "vitest";

import {
  validateAssemblyGraph,
  type AssemblyGraphEdge,
  type AssemblyGraphRow,
  type AssemblyGraphScope,
} from "@/lib/estimates/assembly-graph";

const scope: AssemblyGraphScope = {
  workspaceId: "workspace-1",
  projectId: "project-1",
  estimateId: "estimate-1",
  tabId: "tab-1",
};
const rule = { schemaVersion: 1, kind: "fixed", quantity: 1 } as const;

function row(rowId: string, sortOrder: number, nodeId = "node-a", overrides: Partial<AssemblyGraphRow> = {}): AssemblyGraphRow {
  return { ...scope, rowId, nodeId, sortOrder, ...overrides };
}

function edge(
  edgeId: string,
  parentRowId: string,
  childRowId: string,
  overrides: Partial<AssemblyGraphEdge> = {},
): AssemblyGraphEdge {
  return {
    edgeId,
    parentRowId,
    childRowId,
    mode: "required",
    included: true,
    quantityRule: rule,
    revision: 1,
    ...overrides,
  };
}

describe("assembly graph", () => {
  it("builds deterministic same-node roots and preorder sidecar nodes", () => {
    const result = validateAssemblyGraph({
      scope,
      rows: [row("child-b", 30), row("root-b", 20), row("child-a", 40), row("root-a", 10)],
      edges: [
        edge("edge-z", "root-a", "child-b"),
        edge("edge-a", "root-a", "child-a", { mode: "optional", included: false }),
      ],
    });

    expect(result).toEqual({
      ok: true,
      graph: expect.objectContaining({
        roots: ["root-a", "root-b"],
        edges: [expect.objectContaining({ edgeId: "edge-a" }), expect.objectContaining({ edgeId: "edge-z" })],
        orderedNodes: [
          { rowId: "root-a", rootRowId: "root-a", parentRowId: null, incomingEdgeId: null, depth: 0, edgePathIncluded: true },
          { rowId: "child-a", rootRowId: "root-a", parentRowId: "root-a", incomingEdgeId: "edge-a", depth: 1, edgePathIncluded: false },
          { rowId: "child-b", rootRowId: "root-a", parentRowId: "root-a", incomingEdgeId: "edge-z", depth: 1, edgePathIncluded: true },
          { rowId: "root-b", rootRowId: "root-b", parentRowId: null, incomingEdgeId: null, depth: 0, edgePathIncluded: true },
        ],
      }),
    });
  });

  it("propagates an excluded optional edge through its descendant closure", () => {
    const result = validateAssemblyGraph({
      scope,
      rows: [row("root", 1), row("child", 2), row("grandchild", 3)],
      edges: [
        edge("edge-1", "root", "child", { mode: "optional", included: false }),
        edge("edge-2", "child", "grandchild"),
      ],
    });
    expect(result.ok && result.graph.orderedNodes.map((node) => [node.rowId, node.edgePathIncluded]))
      .toEqual([["root", true], ["child", false], ["grandchild", false]]);
  });

  it.each([
    ["self_edge", [edge("edge", "root", "root")]],
    ["duplicate_parent", [edge("edge-1", "root", "child"), edge("edge-2", "other", "child")]],
    ["cycle", [edge("edge-1", "root", "child"), edge("edge-2", "child", "root")]],
  ] as const)("rejects %s topology", (code, edges) => {
    const result = validateAssemblyGraph({
      scope,
      rows: [row("root", 1), row("other", 2), row("child", 3)],
      edges,
    });
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code }) });
  });

  it("rejects cross-scope and cross-canonical-node rows", () => {
    expect(validateAssemblyGraph({
      scope,
      rows: [row("root", 1), row("foreign", 2, "node-a", { workspaceId: "workspace-2" })],
      edges: [],
    })).toEqual({ ok: false, error: expect.objectContaining({ code: "wrong_scope" }) });

    expect(validateAssemblyGraph({
      scope,
      rows: [row("root", 1), row("child", 2, "node-b")],
      edges: [edge("edge", "root", "child")],
    })).toEqual({ ok: false, error: expect.objectContaining({ code: "cross_node" }) });
  });

  it("requires alternative and optional roles to be distinct roots", () => {
    const rows = [row("root", 1), row("child", 2), row("other-root", 3)];
    const edges = [edge("edge", "root", "child")];
    expect(validateAssemblyGraph({ scope, rows, edges, alternativeRootRowIds: ["child"] }))
      .toEqual({ ok: false, error: expect.objectContaining({ code: "invalid_root_role" }) });
    expect(validateAssemblyGraph({
      scope,
      rows,
      edges,
      alternativeRootRowIds: ["other-root"],
      optionalRootRowIds: ["other-root"],
    })).toEqual({ ok: false, error: expect.objectContaining({ code: "conflicting_root_role" }) });
  });

  it("is invariant to input row and edge ordering", () => {
    const rows = [row("root", 1), row("child-a", 2), row("child-b", 3)];
    const edges = [edge("edge-b", "root", "child-b"), edge("edge-a", "root", "child-a")];
    const forward = validateAssemblyGraph({ scope, rows, edges });
    const reverse = validateAssemblyGraph({ scope, rows: [...rows].reverse(), edges: [...edges].reverse() });
    expect(reverse).toEqual(forward);
  });
});
