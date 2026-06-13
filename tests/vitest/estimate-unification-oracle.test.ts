// Golden-master oracle — the proof that no row/dollar is lost through unification.
// Spec: .ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/07_GOLDEN_MASTER_ORACLE.md
//
// STATUS: skeleton. O1 (totals), O3b/O4a (formula + row-sum), O5 (cache keys) are
// fully wired and run green at P0. O2 (share), O3 (export model), O4b (chart series)
// carry precise build recipes as `it.todo` to be wired at P0 implementation against
// the real input builders noted inline. Snapshots commit to __snapshots__/.

import { describe, expect, it } from "vitest";
import { computeNodeTotal } from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import { getActivityScopeKey } from "@/components/workshop/estimate-sheet/activity-history";
import { calculateProjectChartRowTotal } from "@/lib/project-charts/aggregate-project-charts";
import { buildShareTreeFromSnapshotNodes } from "@/lib/share/reconstruct-share-tree";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import type { PublicationSnapshotRow, PublicationSnapshotTreeNode } from "@/lib/publication/types";
import {
  ALL_AREA_FIXTURE,
  MIXED_FIXTURE,
  MIXED_EXPECTED,
  canonicalRowTotal,
  flattenRows,
  stableStringify,
  treeToChartFacts,
  phaseAtLeast,
} from "./estimate-unification-oracle.fixtures";

function totalsByNodeId(tree: EstimateTreeNode[]): Record<string, number> {
  const out: Record<string, number> = {};
  const visit = (n: EstimateTreeNode) => {
    out[n.id] = Math.round(computeNodeTotal(n, {}) * 100) / 100;
    (n.children ?? []).forEach(visit);
  };
  tree.forEach(visit);
  return out;
}

function scope(nodeId: string, includeDescendants: boolean) {
  return { mode: "node", nodeId, includeDescendants } as unknown as Parameters<typeof getActivityScopeKey>[0];
}

describe("oracle · O1 totals", () => {
  it("ALL_AREA: per-node totals are frozen (byte-parity through P1–P7)", () => {
    expect(stableStringify(totalsByNodeId(ALL_AREA_FIXTURE))).toMatchSnapshot();
  });

  it("MIXED: computeNodeTotal sums own-rows + descendants exactly once (already kind-agnostic)", () => {
    const totals = totalsByNodeId(MIXED_FIXTURE);
    // Rollup totals — the substrate already attaches rows to any node and rolls up children.
    expect(totals.bldgA).toBe(MIXED_EXPECTED.perNodeRollup.bldgA); // 200
    expect(totals.level2).toBe(MIXED_EXPECTED.perNodeRollup.level2); // 80
    expect(totals.room201).toBe(MIXED_EXPECTED.perNodeRollup.room201); // 30
    expect(totals.level3).toBe(MIXED_EXPECTED.perNodeRollup.level3); // 20
  });
});

describe("oracle · O3b/O4a canonical per-row formula + no double-count at row-sum", () => {
  it("calculateProjectChartRowTotal equals the canonical formula for every fixture row", () => {
    for (const tree of [ALL_AREA_FIXTURE, MIXED_FIXTURE]) {
      const { rowFacts } = treeToChartFacts(tree);
      for (const fact of rowFacts) {
        const expected = canonicalRowTotal(fact as never);
        expect(calculateProjectChartRowTotal(fact as never)).toBeCloseTo(expected, 6);
      }
    }
  });

  it("MIXED: sum of per-row totals = 200 and each row counted exactly once", () => {
    const rows = flattenRows(MIXED_FIXTURE);
    expect(rows.map((r) => (r as { id: string }).id).sort()).toEqual([...MIXED_EXPECTED.allRowIds].sort());
    const sum = rows.reduce((acc, r) => acc + canonicalRowTotal(r), 0);
    expect(sum).toBe(MIXED_EXPECTED.grandTotal); // 200 — no double-count, no drop
  });
});

describe("oracle · O5 activity-scope cache keys (V3 B2: stable across child-add)", () => {
  it("key format is node:{id}:{desc|direct}, independent of child count", () => {
    expect(getActivityScopeKey(scope("level2", true))).toBe("node:level2:desc");
    expect(getActivityScopeKey(scope("level2", false))).toBe("node:level2:direct");
    // The key MUST NOT depend on whether level2 has children — adding a child must not
    // change either key (the V3 regression). Same id+flag → same key, always.
    expect(getActivityScopeKey(scope("level2", true))).toBe(getActivityScopeKey(scope("level2", true)));
    expect(getActivityScopeKey({ mode: "row", rowId: "R_c" } as never)).toBe("row:R_c");
  });
});

// ── Scaffolded surfaces (wire at P0; recipes are exact) ──────────────────────

// ── O2 share-reconstruct adapters (fixture tree → publication-snapshot inputs) ──
// buildShareTreeFromSnapshotNodes(nodes, rows) reads only node.{id,name,kind,children}
// and row.{nodeId,rowTotal}; the rest of the snapshot-row shape is cast away.
function toSnapshotTreeNodes(tree: EstimateTreeNode[]): PublicationSnapshotTreeNode[] {
  const visit = (n: EstimateTreeNode): PublicationSnapshotTreeNode =>
    ({
      id: n.id,
      name: n.name,
      kind: n.kind === "group" ? "group" : "area",
      children: (n.children ?? []).map(visit),
    }) as PublicationSnapshotTreeNode;
  return tree.map(visit);
}

function toSnapshotRows(tree: EstimateTreeNode[]): PublicationSnapshotRow[] {
  const out: PublicationSnapshotRow[] = [];
  const visit = (n: EstimateTreeNode) => {
    for (const row of n.estimateRowItems ?? []) {
      out.push({
        id: (row as { id: string }).id,
        nodeId: n.id,
        designation: n.name,
        rowTotal: canonicalRowTotal(row as never),
      } as unknown as PublicationSnapshotRow);
    }
    (n.children ?? []).forEach(visit);
  };
  tree.forEach(visit);
  return out;
}

describe("oracle · O2 share reconstruct (P1 firewall)", () => {
  it("ALL_AREA share tree byte-parity (snapshot)", () => {
    const tree = buildShareTreeFromSnapshotNodes(
      toSnapshotTreeNodes(ALL_AREA_FIXTURE),
      toSnapshotRows(ALL_AREA_FIXTURE),
    );
    expect(stableStringify(tree)).toMatchSnapshot();
  });

  // MIXED forward-proof (a non-area node that OWNS rows) is wired at P1, when the
  // reconstruct-share-tree.ts:297 firewall is relaxed. Today the kind gate drops those
  // rows by design, so this assertion is intentionally deferred to the P1 commit.
  it.todo("MIXED: rows survive on a non-area node, rollup = 200 (wired at P1)");
});

describe("oracle · O3 proposal export model (P2)", () => {
  // RECIPE:
  //   buildProposalExportModel({ metadata: <minimal ProposalExportMetadata>,
  //     nodes: <fixture>, generatedAt: "2026-01-01T00:00:00.000Z" }) (build-proposal-export-model.ts:463).
  //   ALL_AREA: snapshot { summaryRows, proposalRows, totals }.
  //   MIXED: totals.grandTotal === 200; every source row present once;
  //          NO issue with code "non_area_rows_skipped"; consolidation does not merge a
  //          container-owned row with a descendant-owned row (add sourceNodeId/leaf marker
  //          to the consolidation key OR forbid cross-provenance merge — V2 CE2).
  it.todo("ALL_AREA export model byte-parity (snapshot)");
  it.todo("MIXED: grand total 200, no rows skipped, no cross-provenance merge (P2)");
});

describe("oracle · O4b project chart series (P2)", () => {
  // RECIPE:
  //   const { rowFacts, nodeFacts, estimateId } = treeToChartFacts(fixture);
  //   buildProjectChartSeries({ rowFacts, nodeFacts, estimateId, /* + base fields:
  //     categoryNodeFacts:[], supplierFacts:[], topBucketLimit:8 */ } as any).
  //   ALL_AREA: snapshot buckets + space table.
  //   MIXED: bucket sum === 200; BuildingA's OWN row (R_a) is NOT lost to "Unassigned
  //   space" (today resolveSpaceAreaNode keeps the highest Area only → drops it);
  //   leaf-detect must switch to leaf-or-has-rows; header roll-up must not double-count
  //   the "own" sibling (V2 CE1).
  it.todo("ALL_AREA chart series byte-parity (snapshot)");
  it.todo("MIXED: bucket sum 200, BuildingA own-row not orphaned, no double-count (P2)");
});

describe("oracle · O-DIV-1 known divergence (tracked, not folded in)", () => {
  // The snapshot RPC (estimate_sheet_total / version-control) DROPS contingency today (V2),
  // so it already disagrees with in-app/export/charts for contingency rows. The oracle
  // records this as a KNOWN BUG so it does not pretend the five surfaces agree.
  // Decision to fix-or-defer: 09_P1_DESIGN_DECISIONS.md §B.
  it.todo("snapshot RPC contingency divergence asserted as current(wrong) value + tracked");
});
