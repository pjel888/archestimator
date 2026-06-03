import type { PublicationSnapshotRow, PublicationSnapshotTreeNode } from "@/lib/publication/types";

/**
 * Share Page Estimate View — Tree Reconstruction (client-side, from flat snapshot rows)
 *
 * P0.5 + P3 implementation.
 * Follows the spec in .ai/03_plans/share-page-estimate-view-enhancement/
 * (10-fidelity..., 11-test-data-fixture-spec, 04-data-model..., autopilot §9.2, §9.9)
 *
 * Key decisions (recorded in 12-assumptions-decisions-log.md + TRACKER):
 * - A9b: Reuse WorkshopTree<TNode> + read-only renderNode (no new recursion engine).
 * - Designation split on common delimiters with normalization.
 * - Discipline fallback when designation is absent/empty.
 * - Strict DoS guards (MAX_ROWS, MAX_DEPTH, designation length/segment caps).
 * - All output values are safe React children (XSS test required in P3).
 */

export type ShareTreeNode = {
  id: string;
  label: string;
  kind: "group" | "area";
  total: number;
  rowCount: number;
  children: ShareTreeNode[];
  rows: PublicationSnapshotRow[]; // Populated only for "area" leaves that have direct rows
  depth: number;
};

const MAX_ROWS_FOR_TREE = 500;
const MAX_DEPTH = 20;
const MAX_DESIGNATION_LENGTH = 2048;
const MAX_DESIGNATION_SEGMENTS = MAX_DEPTH + 1;
const MAX_DESIGNATION_SEGMENT_LENGTH = 120;
const TOP_BUCKET_LIMIT = 8; // For consistency with chart aggregation

const DELIMITER_REGEX = /\s*[>\/\-–—]\s*/; // " > ", ">", " - ", " / ", etc.

function stableId(label: string, depth: number, parentId?: string): string {
  // Deterministic, safe for React keys and IntersectionObserver targets
  const base = `${parentId ? parentId + ":" : ""}${label}`.toLowerCase().replace(/\s+/g, "-");
  return `share-tree-${base}-${depth}`;
}

function normalizeDesignation(designation: string | null | undefined): string[] {
  if (!designation || typeof designation !== "string") return [];
  const trimmed = designation.trim();
  if (!trimmed) return [];

  const bounded = trimmed.slice(0, MAX_DESIGNATION_LENGTH);

  // Bound split output before allocation can scale with attacker-controlled text.
  const parts = bounded
    .split(DELIMITER_REGEX, MAX_DESIGNATION_SEGMENTS)
    .map((p) => normalizeDesignationSegment(p))
    .filter(Boolean);

  return parts.length > 0 ? parts : [];
}

function normalizeDesignationSegment(segment: string): string {
  const trimmed = segment.trim();
  if (trimmed.length <= MAX_DESIGNATION_SEGMENT_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_DESIGNATION_SEGMENT_LENGTH - 3)}...`;
}

function aggregateRows(rows: PublicationSnapshotRow[]): { total: number; rowCount: number } {
  return rows.reduce(
    (acc, r) => {
      acc.total += r.rowTotal ?? 0;
      acc.rowCount += 1;
      return acc;
    },
    { total: 0, rowCount: 0 }
  );
}

/**
 * Core reconstruction: designation-based hierarchy.
 * Returns a forest of ShareTreeNode (groups contain areas or other groups).
 */
export function reconstructTreeFromRows(rows: PublicationSnapshotRow[]): ShareTreeNode[] {
  if (!rows || rows.length === 0) return [];

  if (rows.length > MAX_ROWS_FOR_TREE) {
    // Graceful degradation: fall back to discipline grouping for very large sheets
    return reconstructTreeByDiscipline(rows);
  }

  // Build a clean tree: only leaves ("area") that own rows carry initial totals.
  // All group nodes start at 0 and receive rolled-up values from children only.
  const root: ShareTreeNode[] = [];
  const nodeMap = new Map<string, ShareTreeNode>();

  for (const row of rows) {
    const pathParts = normalizeDesignation(row.designation);

    if (pathParts.length === 0) {
      let unassigned = nodeMap.get("__UNASSIGNED__");
      if (!unassigned) {
        unassigned = {
          id: stableId("Unassigned", 0),
          label: "Unassigned",
          kind: "area",
          total: 0,
          rowCount: 0,
          children: [],
          rows: [],
          depth: 0,
        };
        root.push(unassigned);
        nodeMap.set("__UNASSIGNED__", unassigned);
      }
      unassigned.rows.push(row);
      unassigned.total += row.rowTotal ?? 0;
      unassigned.rowCount += 1;
      continue;
    }

    let currentParent: ShareTreeNode | undefined = undefined;
    let currentPath = "";

    pathParts.forEach((part, idx) => {
      currentPath = currentPath ? `${currentPath} > ${part}` : part;
      const depth = idx;
      if (depth > MAX_DEPTH) return;

      let node = nodeMap.get(currentPath);
      const isLastSegment = idx === pathParts.length - 1;

      if (!node) {
        node = {
          id: stableId(part, depth, currentParent?.id),
          label: part,
          kind: "area", // provisional; will be corrected after tree is fully built
          total: 0,
          rowCount: 0,
          children: [],
          rows: [],
          depth,
        };

        if (currentParent) {
          currentParent.children.push(node);
        } else {
          root.push(node);
        }

        nodeMap.set(currentPath, node);
      }

      if (isLastSegment) {
        node.rows.push(row);
        node.total += row.rowTotal ?? 0;
        node.rowCount += 1;
      }

      currentParent = node;
    });
  }

  // Final pass: any node that has children must be a "group" (even if it also has direct rows)
  function correctKinds(nodes: ShareTreeNode[]) {
    nodes.forEach((n) => {
      if (n.children.length > 0) {
        n.kind = "group";
      }
      correctKinds(n.children);
    });
  }
  correctKinds(root);

  // Sort siblings alphabetically (stable, deterministic)
  function sortChildren(nodes: ShareTreeNode[]) {
    nodes.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    nodes.forEach((n) => sortChildren(n.children));
  }
  sortChildren(root);

  // Pure bottom-up rollup — parents must start at 0 and only accumulate from children + own direct rows
  function rollup(node: ShareTreeNode): { total: number; rowCount: number } {
    let t = node.total; // direct rows (0 for pure groups)
    let rc = node.rowCount;
    for (const child of node.children) {
      const childAgg = rollup(child);
      t += childAgg.total;
      rc += childAgg.rowCount;
    }
    node.total = t;
    node.rowCount = rc;
    return { total: t, rowCount: rc };
  }
  root.forEach(rollup);

  return root;
}

/**
 * Discipline-based fallback (used for large sheets or when designation is poor).
 * Produces a flat list of "area" nodes grouped by discipline.
 */
export function reconstructTreeByDiscipline(rows: PublicationSnapshotRow[]): ShareTreeNode[] {
  if (!rows || rows.length === 0) return [];

  const disciplineToRows = new Map<string, PublicationSnapshotRow[]>();

  for (const row of rows) {
    const disc = (row.discipline || "Unspecified Discipline").trim();
    if (!disciplineToRows.has(disc)) disciplineToRows.set(disc, []);
    disciplineToRows.get(disc)!.push(row);
  }

  const nodes: ShareTreeNode[] = Array.from(disciplineToRows.entries()).map(([disc, discRows]) => {
    const { total, rowCount } = aggregateRows(discRows);
    return {
      id: stableId(disc, 0),
      label: disc,
      kind: "area",
      total,
      rowCount,
      children: [],
      rows: discRows,
      depth: 0,
    };
  });

  // Sort by total desc (most expensive first), then alpha
  nodes.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.label.localeCompare(b.label);
  });

  // Cap at TOP_BUCKET_LIMIT + "Other" if needed (mirrors chart behavior)
  if (nodes.length > TOP_BUCKET_LIMIT) {
    const top = nodes.slice(0, TOP_BUCKET_LIMIT - 1);
    const rest = nodes.slice(TOP_BUCKET_LIMIT - 1);
    const otherAgg = rest.reduce(
      (acc, n) => {
        acc.total += n.total;
        acc.rowCount += n.rowCount;
        return acc;
      },
      { total: 0, rowCount: 0 }
    );

    const other: ShareTreeNode = {
      id: stableId("Other Disciplines", 0),
      label: "Other Disciplines",
      kind: "area",
      total: otherAgg.total,
      rowCount: otherAgg.rowCount,
      children: [],
      rows: rest.flatMap((n) => n.rows),
      depth: 0,
    };

    return [...top, other];
  }

  return nodes;
}

/**
 * Build ShareTreeNode[] from actual snapshot tree nodes (workshop estimate_nodes).
 * This preserves the exact group/area hierarchy and row grouping from the workshop.
 * Falls back gracefully when snapshot treeNodes are missing or empty.
 */
export function buildShareTreeFromSnapshotNodes(
  nodes: PublicationSnapshotTreeNode[],
  rows: PublicationSnapshotRow[]
): ShareTreeNode[] {
  if (!nodes || nodes.length === 0) return [];

  const rowsByNodeId = new Map<string, PublicationSnapshotRow[]>();
  const nodeIds = new Set<string>();
  const collectIds = (list: PublicationSnapshotTreeNode[]) => {
    for (const n of list) {
      nodeIds.add(n.id);
      collectIds(n.children);
    }
  };
  collectIds(nodes);

  const unmatched: PublicationSnapshotRow[] = [];
  for (const row of rows) {
    const nid = row.nodeId;
    if (!nid || !nodeIds.has(nid)) {
      if (nid) unmatched.push(row);
      continue;
    }
    const current = rowsByNodeId.get(nid) ?? [];
    current.push(row);
    rowsByNodeId.set(nid, current);
  }

  function visit(node: PublicationSnapshotTreeNode, depth: number): ShareTreeNode {
    const childNodes = node.children.map((c) => visit(c, depth + 1));
    const directRows = node.kind === "area" ? (rowsByNodeId.get(node.id) ?? []) : [];
    const directTotal = directRows.reduce((s, r) => s + (r.rowTotal ?? 0), 0);
    const directRowCount = directRows.length;
    const childrenTotal = childNodes.reduce((s, c) => s + c.total, 0);
    const childrenRowCount = childNodes.reduce((s, c) => s + c.rowCount, 0);

    return {
      id: `share-tree-${node.id}`,
      label: node.name,
      kind: node.kind,
      total: directTotal + childrenTotal,
      rowCount: directRowCount + childrenRowCount,
      children: childNodes,
      rows: directRows,
      depth,
    };
  }

  const result = nodes.map((n) => visit(n, 0));

  if (unmatched.length > 0) {
    const unassignedTotal = unmatched.reduce((s, r) => s + (r.rowTotal ?? 0), 0);
    result.push({
      id: "share-tree-unassigned",
      label: "Unassigned",
      kind: "area",
      total: unassignedTotal,
      rowCount: unmatched.length,
      children: [],
      rows: unmatched,
      depth: 0,
    });
  }

  return result;
}

/**
 * Convenience: returns the best available tree for the given rows.
 * Uses snapshot treeNodes when available, otherwise falls back to designation reconstruction.
 */
export function getBestShareTree(
  rows: PublicationSnapshotRow[],
  treeNodes?: PublicationSnapshotTreeNode[]
): ShareTreeNode[] {
  if (treeNodes && treeNodes.length > 0) {
    const fromNodes = buildShareTreeFromSnapshotNodes(treeNodes, rows);
    if (fromNodes.length > 0) return fromNodes;
  }
  if (rows.length > MAX_ROWS_FOR_TREE) {
    return reconstructTreeByDiscipline(rows);
  }
  const byDesignation = reconstructTreeFromRows(rows);
  if (byDesignation.length === 0) {
    return reconstructTreeByDiscipline(rows);
  }
  return byDesignation;
}

export const TREE_CONSTANTS = {
  MAX_ROWS_FOR_TREE,
  MAX_DEPTH,
  MAX_DESIGNATION_LENGTH,
  MAX_DESIGNATION_SEGMENTS,
  MAX_DESIGNATION_SEGMENT_LENGTH,
  TOP_BUCKET_LIMIT,
} as const;

/**
 * Wraps a reconstructed forest under a single virtual root group node.
 * Used by share receiver UI (Tree View + floating nav) to provide "complete available hierarchy"
 * context (e.g. estimate sheet name as top level) even when snapshot row designations produce
 * shallow/relative top segments (Balcony-only etc for certain Lewis publishes).
 *
 * - Pure, non-mutating.
 * - Bumps child depths by +1.
 * - Preserves all rollup totals/rowCounts.
 * - Does NOT change reconstructTreeFromRows output shape or behavior (fidelity tests unaffected unless wrapper called).
 */
export function wrapTreeWithRoot(
  nodes: ShareTreeNode[],
  rootLabel: string,
  rootTotal?: number
): ShareTreeNode[] {
  if (!nodes || nodes.length === 0) return [];

  // Deep enough copy for re-parenting + depth bump (trees are small <500 rows)
  const clonedChildren = nodes.map((n) => bumpDepth(n, 1));

  const total = rootTotal ?? clonedChildren.reduce((s, n) => s + (n.total || 0), 0);
  const rowCount = clonedChildren.reduce((s, n) => s + (n.rowCount || 0), 0);

  const root: ShareTreeNode = {
    id: stableId(rootLabel, -1),
    label: rootLabel || "Estimate",
    kind: "group",
    total,
    rowCount,
    children: clonedChildren,
    rows: [],
    depth: 0,
  };

  return [root];
}

function bumpDepth(node: ShareTreeNode, delta: number): ShareTreeNode {
  return {
    ...node,
    depth: (node.depth || 0) + delta,
    children: node.children.map((c) => bumpDepth(c, delta)),
  };
}
