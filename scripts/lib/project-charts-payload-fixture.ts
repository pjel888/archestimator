import { buildSeriesByEstimate } from "../../src/lib/project-charts/project-comparison-view";
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
  ProjectChartsData,
} from "../../src/lib/project-charts/types";

export const LARGE_PROJECT_CHARTS_FIXTURE_ROWS = 5_000;
export const PROJECT_CHARTS_PAYLOAD_BUDGET_BYTES = 50_000;
export const PROJECT_CHARTS_PAYLOAD_EVIDENCE_PATH = ".ai/05_logs/2026-06-14-project-charts-implementation/payload-contract-evidence.json";

const AREA_COUNT = 30;
const CATEGORY_COUNT = 20;
const SUPPLIER_COUNT = 15;

function buildLargeProjectChartsFixture() {
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
  for (let i = 0; i < LARGE_PROJECT_CHARTS_FIXTURE_ROWS; i += 1) {
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

export function buildLargeProjectChartsPayload(): ProjectChartsData {
  const fixture = buildLargeProjectChartsFixture();
  return {
    projectId: "project-large",
    projectName: "Large Project",
    estimateOptions: fixture.estimates,
    seriesByEstimateId: buildSeriesByEstimate(fixture, ["estimate-a", "estimate-b"]),
    loadMode: "all-estimates",
    requiresSelectedPair: false,
    didTruncate: false,
    rowLimit: LARGE_PROJECT_CHARTS_FIXTURE_ROWS,
    estimateLimit: 20,
  };
}
