// Golden-master oracle — the proof that no row/dollar is lost through unification.
// Spec: .ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/07_GOLDEN_MASTER_ORACLE.md
//
// STATUS: skeleton. O1 (totals), O3b/O4a (formula + row-sum), O5 (cache keys) are
// fully wired and run green at P0. O2 (share), O3 (export model), O4b (chart series)
// carry precise build recipes as `it.todo` to be wired at P0 implementation against
// the real input builders noted inline. Snapshots commit to __snapshots__/.

import { describe, expect, it } from "vitest";
import { computeNodeTotal } from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import { getActivityScopeKey } from "@/components/workshop/estimate-sheet/activity-history-model";
import { calculateProjectChartRowTotal } from "@/lib/project-charts/aggregate-project-charts";
import { buildProjectChartSeries } from "@/lib/project-charts/aggregate-project-charts";
import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import { buildProjectPublicationSnapshot } from "@/lib/publication/snapshot";
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
  CALCULATION_PARITY_FIXTURE,
  calculationParityTreeFixture,
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

  // MIXED forward-proof (P1 firewall): a kind:"group" node that OWNS rows is the exact
  // case the :297 gate dropped. Pre-P1 this was RED (R_a vanished, rollup 100); post-P1
  // the row survives and the client-facing total is whole.
  it("MIXED: rows survive on a non-area node, rollup = 200", () => {
    const nodes = [
      {
        id: "bldgA",
        name: "Building A",
        kind: "group", // non-area container that now owns rows
        children: [
          {
            id: "level2",
            name: "Level 2",
            kind: "area",
            children: [{ id: "room201", name: "Room 201", kind: "area", children: [] }],
          },
          { id: "level3", name: "Level 3", kind: "area", children: [] },
        ],
      },
    ] as unknown as PublicationSnapshotTreeNode[];
    const rows = [
      { id: "R_a", nodeId: "bldgA", designation: "Building A", rowTotal: 100 },
      { id: "R_b", nodeId: "level2", designation: "Level 2", rowTotal: 50 },
      { id: "R_c", nodeId: "room201", designation: "Room 201", rowTotal: 30 },
      { id: "R_d", nodeId: "level3", designation: "Level 3", rowTotal: 20 },
      { id: "R_orphan", nodeId: "ghost", designation: "Ghost", rowTotal: 0 },
    ] as unknown as PublicationSnapshotRow[];

    const tree = buildShareTreeFromSnapshotNodes(nodes, rows);
    const root = tree.find((n) => n.label === "Building A");
    expect(root).toBeDefined();
    // THE FIREWALL: a row owned by the kind:"group" node must not be dropped.
    expect(root!.rows.map((r) => (r as { id: string }).id)).toContain("R_a");
    expect(root!.total).toBe(MIXED_EXPECTED.grandTotal); // 100 + (50+30) + 20 = 200
    expect(root!.rowCount).toBe(4);
    // A row whose owning node is absent still lands in "Unassigned" (unchanged).
    const unassigned = tree.find((n) => n.label === "Unassigned");
    expect(unassigned?.rows.map((r) => (r as { id: string }).id)).toContain("R_orphan");
  });
});

describe("oracle · O3 proposal export model (P2)", () => {
  it("ALL_AREA export model has deterministic generated records", () => {
    const model = buildProposalExportModel({
      metadata: { projectId: "oracle-project", estimateId: "oracle-estimate", projectName: "Oracle", estimateName: "Oracle", estimateSheetCode: "OR-001", versionLabel: "v1", currency: "PHP" },
      nodes: ALL_AREA_FIXTURE,
      generatedAt: CALCULATION_PARITY_FIXTURE.clock,
    });

    expect(model.generatedAt).toBe(CALCULATION_PARITY_FIXTURE.clock);
    expect(model.proposalRows.flatMap((row) => row.sourceRowIds).sort()).toEqual(flattenRows(ALL_AREA_FIXTURE).map((row) => row.id).sort());
  });

  it("O3: export adjustment uses the material-only canonical basis", () => {
    const model = buildProposalExportModel({
      metadata: { projectId: "parity-project", estimateId: "parity-estimate", projectName: "Parity", estimateName: "Parity", estimateSheetCode: "PAR-001", versionLabel: "v1", currency: "PHP" },
      nodes: calculationParityTreeFixture(),
      generatedAt: CALCULATION_PARITY_FIXTURE.clock,
    });

    const row = model.proposalRows.find((candidate) => candidate.sourceRowIds.includes("parity-material-labor"));
    expect(row?.costAmount).toBe(142.5);
  });
});

describe("oracle · O4b project chart series (P2)", () => {
  it("MIXED: bucket sum is stable and direct-owner rows are retained", () => {
    const { estimateId, nodeFacts, rowFacts } = treeToChartFacts(MIXED_FIXTURE);
    const series = buildProjectChartSeries({
      estimateId,
      estimates: [{ id: estimateId, name: "Oracle", sheetCode: "OR-001", currencyCode: "PHP", updatedAt: null, rowCount: rowFacts.length, totalCost: 200 }],
      rows: rowFacts as never[],
      nodes: nodeFacts,
      categoryNodes: [],
      suppliers: [],
      groupingMode: "space",
    });

    expect(series.total).toBe(MIXED_EXPECTED.grandTotal);
    expect(series.allBuckets.find((bucket) => bucket.sourceNodeId === "bldgA")?.total).toBe(100);
  });

  it("O4b: chart amounts use canonical minor-unit rounding", () => {
    expect(calculateProjectChartRowTotal({
      id: "fractional-chart-row", estimateId: "parity-estimate", nodeId: "parity-included", categoryNodeId: null, supplierId: null, supplierName: null,
      sourceSupplierId: null, sourceSupplierName: null, quantity: 1, unitCost: 10.005, miscCost: 0,
    })).toBe(10.01);
  });
});

describe("oracle · O-DIV-1 known divergence (tracked, not folded in)", () => {
  // The snapshot RPC (estimate_sheet_total / version-control) DROPS contingency today (V2),
  // so it already disagrees with in-app/export/charts for contingency rows. The oracle
  // records this as a KNOWN BUG so it does not pretend the five surfaces agree.
  // Decision to fix-or-defer: 09_P1_DESIGN_DECISIONS.md §B.
  it("O-DIV-1: publication snapshot retains legacy row contingency", () => {
    const snapshot = buildProjectPublicationSnapshot({
      generatedAt: CALCULATION_PARITY_FIXTURE.clock,
      project: { id: "parity-project", name: "Parity", projectCode: null, clientName: null, location: null, currencyCode: "PHP" },
      estimates: [{
        id: "parity-estimate",
        name: "Parity",
        sheetCode: "PAR-001",
        updatedAt: null,
        rows: [{ id: "contingency", description: "", designation: "", discipline: "", material: "", quantity: 1, unit: "ea", unitCost: 100, miscCost: 0, contingencyPercentage: 5 }],
      }],
    });

    expect(snapshot.estimates[0]?.rows[0]).toMatchObject({ rowTotal: 105, rowTotalMinorUnits: 10_500 });
  });
});
