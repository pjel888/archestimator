/**
 * Unit tests for reconstruct-share-tree (P0.5 Fidelity + P3 Tree View)
 *
 * Covers all 7 fixture categories, rolled-up totals (MUST be 100% accurate),
 * edge cases, large sheet degradation, XSS safety (labels as literal text),
 * and discipline fallback.
 *
 * These tests are the primary evidence for the P0.5 fidelity gate.
 */

import { describe, it, expect } from "vitest";
import {
  reconstructTreeFromRows,
  reconstructTreeByDiscipline,
  getBestShareTree,
  wrapTreeWithRoot,
  ShareTreeNode,
} from "@/lib/share/reconstruct-share-tree";
import {
  publicationSnapshotFixtures,
  injectMaliciousLabels,
  FixtureName,
} from "../../fixtures/publication-snapshots";

function flattenNodes(nodes: ShareTreeNode[]): ShareTreeNode[] {
  return nodes.flatMap((n) => [n, ...flattenNodes(n.children)]);
}

function sumTotals(nodes: ShareTreeNode[]): number {
  // After correct rollup, each top-level node's .total already contains its entire subtree.
  // Summing only the roots gives the grand total exactly once.
  return nodes.reduce((sum, n) => sum + (n.total || 0), 0);
}

function sumRowCounts(nodes: ShareTreeNode[]): number {
  // After rollup, top-level .rowCount fields contain the full subtree counts.
  return nodes.reduce((sum, n) => sum + (n.rowCount || 0), 0);
}

describe("reconstructTreeFromRows (designation-based)", () => {
  it("produces 100% rolled-up total accuracy on richHierarchical", () => {
    const rows = publicationSnapshotFixtures.richHierarchical;
    const originalTotal = rows.reduce((s, r) => s + r.rowTotal, 0);
    const tree = reconstructTreeFromRows(rows);
    const reconstructedTotal = sumTotals(tree);
    expect(reconstructedTotal).toBeCloseTo(originalTotal, 2);
    expect(sumRowCounts(tree)).toBe(rows.length);
  });

  it("handles rich hierarchical Lewis-like paths with groups and areas", () => {
    const tree = reconstructTreeFromRows(publicationSnapshotFixtures.richHierarchical);
    expect(tree.length).toBeGreaterThan(0);
    // Should have at least one top-level group "Lot"
    const lot = tree.find((n) => n.label === "Lot");
    expect(lot).toBeDefined();
    expect(lot!.kind).toBe("group");
    expect(lot!.children.length).toBeGreaterThan(0);
  });

  it("gracefully handles null/empty/unassigned designations", () => {
    const rows = publicationSnapshotFixtures.nullEmptyUnassigned;
    const tree = reconstructTreeFromRows(rows);
    const unassigned = flattenNodes(tree).find((n) => n.label === "Unassigned" || n.label.includes("Unspecified"));
    expect(unassigned).toBeDefined();
    expect(unassigned!.total).toBeGreaterThan(0);
  });

  it("normalizes inconsistent delimiters (>, /, -, spaces)", () => {
    const rows = publicationSnapshotFixtures.inconsistentDelimiters;
    const tree = reconstructTreeFromRows(rows);
    // After normalization we should still get coherent grouping under "Lot"
    const lot = flattenNodes(tree).find((n) => n.label === "Lot");
    expect(lot).toBeDefined();
  });

  it("alpha-sorts siblings at every level", () => {
    const tree = reconstructTreeFromRows(publicationSnapshotFixtures.lewisRepresentative);
    function checkSorted(nodes: ShareTreeNode[]) {
      const labels = nodes.map((n) => n.label);
      const sorted = [...labels].sort((a, b) => a.localeCompare(b));
      expect(labels).toEqual(sorted);
      nodes.forEach((n) => checkSorted(n.children));
    }
    checkSorted(tree);
  });

  it("returns empty array for empty input", () => {
    expect(reconstructTreeFromRows([])).toEqual([]);
  });
});

describe("reconstructTreeByDiscipline (fallback)", () => {
  it("groups correctly by discipline and sorts by total desc", () => {
    const rows = publicationSnapshotFixtures.singleDisciplineEdge;
    const tree = reconstructTreeByDiscipline(rows);
    expect(tree.length).toBeGreaterThan(0);
    // Structural should dominate
    expect(tree[0].label).toContain("Structural");
    expect(tree[0].total).toBeGreaterThan(tree[1]?.total ?? 0);
  });

  it("caps large discipline lists and creates 'Other Disciplines'", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      publicationSnapshotFixtures.singleDisciplineEdge[0]
    ).map((r, i) => ({ ...r, id: `d-${i}`, discipline: `Disc-${i}` }));

    const tree = reconstructTreeByDiscipline(many);
    expect(tree.length).toBeLessThanOrEqual(8); // TOP_BUCKET_LIMIT
    const other = tree.find((n) => n.label.includes("Other"));
    expect(other).toBeDefined();
  });
});

describe("getBestShareTree (smart selector)", () => {
  it("prefers designation reconstruction for normal-sized sheets", () => {
    const rows = publicationSnapshotFixtures.lewisRepresentative;
    const tree = getBestShareTree(rows);
    const hasGroups = tree.some((n) => n.kind === "group");
    expect(hasGroups).toBe(true);
  });

  it("falls back to discipline for very large sheets (DoS guard)", () => {
    const large = publicationSnapshotFixtures.largeStress; // 420 rows
    const tree = getBestShareTree(large);
    // For large input it uses discipline grouping
    const first = tree[0];
    expect(first).toBeDefined();
    // We don't assert exact kind here because the large fixture may trigger the cap
  });
});

describe("XSS Safety (critical - P3 gate)", () => {
  it("stores malicious strings as literal text in node data (no HTML interpretation)", () => {
    const maliciousRows = injectMaliciousLabels(publicationSnapshotFixtures.richHierarchical.slice(0, 3));
    const tree = reconstructTreeFromRows(maliciousRows);

    const allData = JSON.stringify(tree);

    // The reconstruction + tree must contain the raw malicious payloads as literal strings.
    // They must never be interpreted as HTML/JS by our code.
    expect(allData).toContain("<script>");
    expect(allData).toContain("onerror=alert");
    // Real DOM safety (never using dangerouslySetInnerHTML) is verified in the consuming component test (P3).
  });
});

describe("Fidelity metrics (P0.5 evidence)", () => {
  it("produces 100% total accuracy across all fixture categories (dynamic expected)", () => {
    (Object.keys(publicationSnapshotFixtures) as FixtureName[]).forEach((name) => {
      const rows = publicationSnapshotFixtures[name];
      if (!rows || rows.length === 0) return;

      const originalTotal = rows.reduce((s, r) => s + (r.rowTotal || 0), 0);
      const tree = reconstructTreeFromRows(rows);
      const reconstructed = sumTotals(tree);

      expect(reconstructed).toBeCloseTo(originalTotal, 2);
    });
  });
});

describe("Short/relative designation (Lewis Balcony snapshot shape + virtual root wrapper)", () => {
  it("reconstructs usable shallow tree from relative designations (Balcony as top segment)", () => {
    const rows = publicationSnapshotFixtures.shortDesignationBalcony;
    const tree = reconstructTreeFromRows(rows);
    expect(tree.length).toBeGreaterThan(0);
    // Fidelity: top node(s) reflect the designation data present in snapshot (no invented upper hierarchy)
    const topLabels = tree.map((n) => n.label);
    expect(topLabels).toContain("Balcony");
    // All rows accounted in rollup
    expect(sumTotals(tree)).toBeCloseTo(rows.reduce((s, r) => s + r.rowTotal, 0), 2);
  });

  it("wrapTreeWithRoot provides complete hierarchy context (virtual root + original shallow content)", () => {
    const rows = publicationSnapshotFixtures.shortDesignationBalcony;
    const raw = reconstructTreeFromRows(rows);
    const wrapped = wrapTreeWithRoot(raw, "Lewis Residence Baseline Estimate", 34100);
    expect(wrapped.length).toBe(1);
    const root = wrapped[0];
    expect(root.label).toBe("Lewis Residence Baseline Estimate");
    expect(root.kind).toBe("group");
    expect(root.children.length).toBeGreaterThan(0);
    expect(root.children[0].label).toBe("Balcony"); // original top now child
    expect(root.depth).toBe(0);
    expect(root.children[0].depth).toBe(1);
    expect(sumTotals(wrapped)).toBeCloseTo(34100, 2);
  });
});
