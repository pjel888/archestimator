import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildSeriesByEstimate } from "@/lib/project-charts/project-comparison-view";
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
} from "@/lib/project-charts/types";

/**
 * Cache freshness contract (`09` P2.8 / `13` R-3 / `10` D-13).
 *
 * The charts surface reads shared taxonomy/supplier facts. The freshness guarantee
 * is two-fold and proven here:
 *   1. Labels are derived from the live category/supplier facts at aggregation
 *      time — changing a label changes the bucket output, so nothing stale is baked
 *      into a returned bucket.
 *   2. The route renders dynamically (per-request server client + searchParams), so
 *      there is no static page cache for a component-library mutation to stale.
 * Together these mean a category/supplier rename can NOT leave a stale data route
 * — no extra revalidation of the charts path is required.
 */

const estimates: ProjectChartEstimateOption[] = [
  { id: "estimate-a", name: "Schematic", sheetCode: "EST-001", currencyCode: "PHP", updatedAt: null, rowCount: 0, totalCost: 0 },
];
const nodes: ProjectChartNodeFact[] = [
  { id: "area-1", estimateId: "estimate-a", parentId: null, kind: "Area", name: "Ground Floor", sortOrder: 1 },
];
const rows: ProjectChartRowFact[] = [
  { id: "r1", estimateId: "estimate-a", nodeId: "area-1", categoryNodeId: "cat-1", supplierId: "sup-1", supplierName: null, sourceSupplierId: null, sourceSupplierName: null, quantity: 1, unitCost: 100, miscCost: 0 },
];

function categoryFacts(label: string): ProjectChartCategoryNodeFact[] {
  return [{ id: "cat-1", parentId: null, nodeType: "category", label, sortOrder: 1 }];
}
function supplierFacts(name: string): ProjectChartSupplierFact[] {
  return [{ id: "sup-1", name, normalizedName: name.toLowerCase(), sortOrder: 1 }];
}

describe("project charts cache freshness (P2.8 / R-3)", () => {
  it("derives category bucket labels from the current category facts (no stale label)", () => {
    const before = buildSeriesByEstimate(
      { estimates, rows, nodes, categoryNodes: categoryFacts("Masonry"), suppliers: supplierFacts("BuildMart") },
      ["estimate-a"],
    );
    const after = buildSeriesByEstimate(
      { estimates, rows, nodes, categoryNodes: categoryFacts("Concrete Works"), suppliers: supplierFacts("BuildMart") },
      ["estimate-a"],
    );
    expect(before["estimate-a"].category.allBuckets[0].label).toBe("Masonry");
    expect(after["estimate-a"].category.allBuckets[0].label).toBe("Concrete Works");
  });

  it("derives supplier bucket labels from the current supplier facts (no stale label)", () => {
    const before = buildSeriesByEstimate(
      { estimates, rows, nodes, categoryNodes: categoryFacts("Masonry"), suppliers: supplierFacts("BuildMart") },
      ["estimate-a"],
    );
    const after = buildSeriesByEstimate(
      { estimates, rows, nodes, categoryNodes: categoryFacts("Masonry"), suppliers: supplierFacts("MegaBuild") },
      ["estimate-a"],
    );
    expect(before["estimate-a"].supplier.allBuckets[0].label).toBe("BuildMart");
    expect(after["estimate-a"].supplier.allBuckets[0].label).toBe("MegaBuild");
  });

  it("renders the data route dynamically so there is no static cache to stale", () => {
    const page = readFileSync(join(process.cwd(), "src/app/workshop/projects/[projectId]/data/page.tsx"), "utf8");
    const repository = readFileSync(join(process.cwd(), "src/lib/repositories/project-charts-repository.ts"), "utf8");
    // No opt-in to static rendering / ISR on the route.
    expect(page).not.toContain('export const dynamic = "force-static"');
    expect(page).not.toMatch(/export const revalidate\s*=/);
    // Per-request data (searchParams + cookie-bound server client) → dynamic render.
    expect(page).toContain("searchParams");
    expect(repository).toContain("createSupabaseServerClient");
  });
});
