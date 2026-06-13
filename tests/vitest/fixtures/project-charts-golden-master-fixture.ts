/**
 * Golden-master fixture for project-chart aggregation (`09` P-1.4 / `07` F).
 *
 * This is the equivalence baseline the P2 `get_project_chart_buckets` RPC must
 * reproduce byte-for-byte (totals/labels/ids/order) for all three grouping modes,
 * BEFORE the read path is swapped server-side. It deliberately exercises every
 * non-trivial ancestor-walk semantic the RPC has to replicate:
 *   - SPACE: attribute each row to its OWN owning node (kind-agnostic). A row
 *     with a null node falls into "Unassigned space"; a row on a non-area node
 *     (e.g. r4 on the "House" Group) buckets to that node, not an area ancestor.
 *   - CATEGORY: walk to the highest `category` node; organizer-only / null fall
 *     into "Uncategorized".
 *   - SUPPLIER: prefer the resolved supplier, then the source_snapshot supplier
 *     name, then the legacy `supplier` text, else "No supplier".
 *   - A bucket present in only one estimate → `deltaPercent === null` ("new").
 *
 * The expected values below are computed by hand from the fixture arithmetic, so
 * the test is an independent oracle, not a self-referential snapshot.
 */
import type {
  ProjectChartCategoryNodeFact,
  ProjectChartEstimateOption,
  ProjectChartNodeFact,
  ProjectChartRowFact,
  ProjectChartSupplierFact,
} from "@/lib/project-charts/types";

export const GOLDEN_ESTIMATES: ProjectChartEstimateOption[] = [
  { id: "estimate-a", name: "Schematic", sheetCode: "EST-001", currencyCode: "PHP", updatedAt: "2026-05-02T00:00:00Z", rowCount: 0, totalCost: 0 },
  { id: "estimate-b", name: "Tender", sheetCode: "EST-002", currencyCode: "PHP", updatedAt: "2026-05-01T00:00:00Z", rowCount: 0, totalCost: 0 },
];

export const GOLDEN_NODES: ProjectChartNodeFact[] = [
  // estimate-a tree: House > Level 1 > Ground Floor (Area); Roof (Area, root)
  { id: "group-house-a", estimateId: "estimate-a", parentId: null, kind: "Group", name: "House", sortOrder: 1 },
  { id: "group-l1-a", estimateId: "estimate-a", parentId: "group-house-a", kind: "Group", name: "Level 1", sortOrder: 1 },
  { id: "area-ground-a", estimateId: "estimate-a", parentId: "group-l1-a", kind: "Area", name: "Ground Floor", sortOrder: 1 },
  { id: "area-roof-a", estimateId: "estimate-a", parentId: null, kind: "Area", name: "Roof", sortOrder: 2 },
  // estimate-b tree: Ground Floor (Area), MEP (Area)
  { id: "area-ground-b", estimateId: "estimate-b", parentId: null, kind: "Area", name: "Ground Floor", sortOrder: 1 },
  { id: "area-mep-b", estimateId: "estimate-b", parentId: null, kind: "Area", name: "MEP", sortOrder: 2 },
];

export const GOLDEN_CATEGORY_NODES: ProjectChartCategoryNodeFact[] = [
  { id: "organizer", parentId: null, nodeType: "organizer", label: "Scopes", sortOrder: 1 },
  { id: "cat-masonry", parentId: "organizer", nodeType: "category", label: "Masonry", sortOrder: 2 },
  { id: "subcat-chb", parentId: "cat-masonry", nodeType: "subcategory", label: "CHB", sortOrder: 3 },
  { id: "cat-concrete", parentId: null, nodeType: "category", label: "Concrete", sortOrder: 4 },
];

export const GOLDEN_SUPPLIERS: ProjectChartSupplierFact[] = [
  { id: "supplier-bm", name: "BuildMart", normalizedName: "buildmart", sortOrder: 1 },
];

export const GOLDEN_ROWS: ProjectChartRowFact[] = [
  // estimate-a
  // r1: Ground Floor / Masonry(top of CHB) / BuildMart; total = 2*100 + 25 = 225
  { id: "r1", estimateId: "estimate-a", nodeId: "area-ground-a", categoryNodeId: "subcat-chb", supplierId: "supplier-bm", supplierName: null, sourceSupplierId: null, sourceSupplierName: null, quantity: 2, unitCost: 100, miscCost: 25 },
  // r2: Roof / Concrete / source_snapshot supplier "Acme Steel"; total = 100
  { id: "r2", estimateId: "estimate-a", nodeId: "area-roof-a", categoryNodeId: "cat-concrete", supplierId: null, supplierName: null, sourceSupplierId: null, sourceSupplierName: "Acme Steel", quantity: 1, unitCost: 100, miscCost: 0 },
  // r3: null node / organizer-only / no supplier; total = 50  -> Unassigned space, Uncategorized, No supplier
  { id: "r3", estimateId: "estimate-a", nodeId: null, categoryNodeId: "organizer", supplierId: null, supplierName: null, sourceSupplierId: null, sourceSupplierName: null, quantity: 1, unitCost: 50, miscCost: 0 },
  // r4: Group node "House" (no Area ancestor) / null category / legacy supplier text "Legacy Co"; total = 30
  //     SPACE: OWN-node bucket "House" (space:house); CATEGORY: Uncategorized; SUPPLIER: Legacy Co
  { id: "r4", estimateId: "estimate-a", nodeId: "group-house-a", categoryNodeId: null, supplierId: null, supplierName: "Legacy Co", sourceSupplierId: null, sourceSupplierName: null, quantity: 1, unitCost: 30, miscCost: 0 },
  // estimate-b
  // r5: Ground Floor / Masonry / BuildMart; total = 100
  { id: "r5", estimateId: "estimate-b", nodeId: "area-ground-b", categoryNodeId: "subcat-chb", supplierId: "supplier-bm", supplierName: null, sourceSupplierId: null, sourceSupplierName: null, quantity: 1, unitCost: 100, miscCost: 0 },
  // r6: MEP / Concrete / "Acme Steel"; total = 200
  { id: "r6", estimateId: "estimate-b", nodeId: "area-mep-b", categoryNodeId: "cat-concrete", supplierId: null, supplierName: null, sourceSupplierId: null, sourceSupplierName: "Acme Steel", quantity: 2, unitCost: 100, miscCost: 0 },
];

export const GOLDEN_AGGREGATION_INPUT = {
  estimates: GOLDEN_ESTIMATES,
  rows: GOLDEN_ROWS,
  nodes: GOLDEN_NODES,
  categoryNodes: GOLDEN_CATEGORY_NODES,
  suppliers: GOLDEN_SUPPLIERS,
};

/** Expected per-bucket totals (id, label, total, rowCount) per estimate and mode. */
export type GoldenBucket = { id: string; label: string; total: number; rowCount: number };

export const GOLDEN_EXPECTED: Record<
  "space" | "category" | "supplier",
  Record<"estimate-a" | "estimate-b", GoldenBucket[]>
> = {
  space: {
    "estimate-a": [
      { id: "space:ground-floor", label: "Ground Floor", total: 225, rowCount: 1 },
      { id: "space:roof", label: "Roof", total: 100, rowCount: 1 },
      // OWN-node bucketing: r4 (on the "House" Group node, no Area ancestor) now
      // attributes to its own node instead of falling into "Unassigned space".
      { id: "unassigned-space", label: "Unassigned space", total: 50, rowCount: 1 },
      { id: "space:house", label: "House", total: 30, rowCount: 1 },
    ],
    "estimate-b": [
      { id: "space:mep", label: "MEP", total: 200, rowCount: 1 },
      { id: "space:ground-floor", label: "Ground Floor", total: 100, rowCount: 1 },
    ],
  },
  category: {
    "estimate-a": [
      { id: "cat-masonry", label: "Masonry", total: 225, rowCount: 1 },
      { id: "cat-concrete", label: "Concrete", total: 100, rowCount: 1 },
      { id: "uncategorized", label: "Uncategorized", total: 80, rowCount: 2 },
    ],
    "estimate-b": [
      { id: "cat-concrete", label: "Concrete", total: 200, rowCount: 1 },
      { id: "cat-masonry", label: "Masonry", total: 100, rowCount: 1 },
    ],
  },
  supplier: {
    "estimate-a": [
      { id: "supplier-bm", label: "BuildMart", total: 225, rowCount: 1 },
      { id: "supplier:acme-steel", label: "Acme Steel", total: 100, rowCount: 1 },
      { id: "supplier:no-supplier", label: "No supplier", total: 50, rowCount: 1 },
      { id: "supplier:legacy-co", label: "Legacy Co", total: 30, rowCount: 1 },
    ],
    "estimate-b": [
      { id: "supplier:acme-steel", label: "Acme Steel", total: 200, rowCount: 1 },
      { id: "supplier-bm", label: "BuildMart", total: 100, rowCount: 1 },
    ],
  },
};
