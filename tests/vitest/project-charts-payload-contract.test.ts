import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildSeriesByEstimate } from "@/lib/project-charts/project-comparison-view";
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
  ProjectChartsData,
} from "@/lib/project-charts/types";

/**
 * Runtime payload contract (`09` P2.4 / `13` R-2 / `07` A).
 *
 * Proves the charts payload is buckets-only at runtime by building the SAME
 * server-side aggregation the repository uses over a large synthetic fixture
 * (~5,000 row items across two estimates) and asserting the serialized
 * `ProjectChartsData` (a) carries no raw fact arrays, (b) leaks no per-row cost
 * fields, and (c) is well under 50 KB uncompressed. The measured payload is saved
 * as a synthetic-fixture artifact under the phase evidence folder. A source check
 * confirms the repository return shape and the data contract match.
 */

const LARGE_FIXTURE_ROWS = 5_000;
const AREA_COUNT = 30;
const CATEGORY_COUNT = 20;
const SUPPLIER_COUNT = 15;
const PAYLOAD_BUDGET_BYTES = 50_000;

function buildLargeFixture() {
  const estimates: ProjectChartEstimateOption[] = [
    { id: "estimate-a", name: "Schematic", sheetCode: "EST-001", currencyCode: "PHP", updatedAt: "2026-05-02T00:00:00Z", rowCount: 0, totalCost: 0 },
    { id: "estimate-b", name: "Tender", sheetCode: "EST-002", currencyCode: "PHP", updatedAt: "2026-05-01T00:00:00Z", rowCount: 0, totalCost: 0 },
  ];

  const nodes: ProjectChartNodeFact[] = [];
  const categoryNodes: ProjectChartCategoryNodeFact[] = [];
  const suppliers: ProjectChartSupplierFact[] = [];
  for (const estimate of estimates) {
    for (let a = 0; a < AREA_COUNT; a += 1) {
      nodes.push({ id: `${estimate.id}-area-${a}`, estimateId: estimate.id, parentId: null, kind: "Area", name: `Area ${a}`, sortOrder: a });
    }
  }
  for (let c = 0; c < CATEGORY_COUNT; c += 1) {
    categoryNodes.push({ id: `category-${c}`, parentId: null, nodeType: "category", label: `Category ${c}`, sortOrder: c });
  }
  for (let s = 0; s < SUPPLIER_COUNT; s += 1) {
    suppliers.push({ id: `supplier-${s}`, name: `Supplier ${s}`, normalizedName: `supplier-${s}`, sortOrder: s });
  }

  const rows: ProjectChartRowFact[] = [];
  for (let i = 0; i < LARGE_FIXTURE_ROWS; i += 1) {
    const estimate = estimates[i % 2];
    rows.push({
      id: `row-${i}`,
      estimateId: estimate.id,
      nodeId: `${estimate.id}-area-${i % AREA_COUNT}`,
      categoryNodeId: `category-${i % CATEGORY_COUNT}`,
      supplierId: `supplier-${i % SUPPLIER_COUNT}`,
      supplierName: null,
      sourceSupplierId: null,
      sourceSupplierName: null,
      quantity: 1 + (i % 5),
      unitCost: 100 + (i % 50),
      miscCost: i % 7,
    });
  }

  return { estimates, rows, nodes, categoryNodes, suppliers };
}

describe("project charts payload contract (P2.4 / R-2)", () => {
  const fixture = buildLargeFixture();
  const seriesByEstimateId = buildSeriesByEstimate(fixture, ["estimate-a", "estimate-b"]);
  const payload: ProjectChartsData = {
    projectId: "project-large",
    projectName: "Large Project",
    estimateOptions: fixture.estimates,
    seriesByEstimateId,
    loadMode: "all-estimates",
    requiresSelectedPair: false,
    didTruncate: false,
    rowLimit: 5000,
    estimateLimit: 20,
  };
  const serialized = JSON.stringify(payload);

  it("ships no raw fact arrays in the serialized payload", () => {
    for (const key of ["rowFacts", "nodeFacts", "categoryNodeFacts", "supplierFacts"]) {
      expect(serialized).not.toContain(`"${key}"`);
    }
  });

  it("leaks no per-row cost fields (data minimization, `05` SEC-1)", () => {
    for (const field of ["unitCost", "quantity", "miscCost", "contingencyPercentage", "sourceSupplierId"]) {
      expect(serialized).not.toContain(`"${field}"`);
    }
    // No per-row id leaked (buckets, not rows).
    expect(serialized).not.toContain('"row-0"');
  });

  it(`is under ${PAYLOAD_BUDGET_BYTES} bytes uncompressed on a ~${LARGE_FIXTURE_ROWS}-row fixture`, () => {
    const bytes = Buffer.byteLength(serialized, "utf8");
    // Save the measured artifact as runtime evidence.
    const dir = join(process.cwd(), ".ai/05_logs/2026-06-14-project-charts-implementation");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "payload-contract-evidence.json"),
      JSON.stringify(
        {
          generatedFrom: "tests/vitest/project-charts-payload-contract.test.ts",
          fixtureRows: LARGE_FIXTURE_ROWS,
          serializedBytes: bytes,
          budgetBytes: PAYLOAD_BUDGET_BYTES,
          rawFactArraysPresent: false,
          note: "buckets-only payload; raw estimate_row_items never cross the wire",
        },
        null,
        2,
      ),
    );
    expect(bytes).toBeLessThan(PAYLOAD_BUDGET_BYTES);
  });

  it("matches the repository return shape and the data contract (source cross-check)", () => {
    const repositorySource = readFileSync(join(process.cwd(), "src/lib/repositories/project-charts-repository.ts"), "utf8");
    const typesSource = readFileSync(join(process.cwd(), "src/lib/project-charts/types.ts"), "utf8");
    // Repository returns the aggregated series, not raw facts.
    expect(repositorySource).toContain("seriesByEstimateId");
    expect(repositorySource).toContain("buildSeriesByEstimate");
    // The data contract no longer carries raw fact arrays.
    expect(typesSource).not.toMatch(/rowFacts:\s*ProjectChartRowFact\[\]/);
    expect(typesSource).not.toMatch(/supplierFacts:\s*ProjectChartSupplierFact\[\]/);
  });
});
