// Golden-master oracle fixtures (plan: .ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/07).
//
// ALL_AREA_FIXTURE  — representative current-shape tree (group containers, area leaves).
//                     Its serialized outputs MUST be byte-identical before/after P1–P3
//                     (a provable prod no-op). Snapshotted.
// MIXED_FIXTURE     — synthetic node-with-both-children-and-own-rows (V2's worked example).
//                     The forward-proof that rows survive and dollars don't double-count.

import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import type { EstimateCalculationInput } from "@/lib/estimates/estimate-row-total";

// Per-phase flag so mixed-fixture acceptance tests stay green as each phase lands.
// Bump as phases ship: "P0" → "P1" → "P2" → "P3" → … . The test reads this to decide
// whether a mixed-surface assertion is expected-green yet.
export const ORACLE_PHASE: "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" = "P0";

export function phaseAtLeast(target: typeof ORACLE_PHASE): boolean {
  const order = ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7"];
  return order.indexOf(ORACLE_PHASE) >= order.indexOf(target);
}

// Canonical per-row cost (mirror of estimate-row-tree-patch.ts:30-31,40 — invariant I6).
// NB the cost field is `itemCost` in the domain row (computeRowTotal: item.itemCost*qty),
// but `unitCost` on a chart fact and `materialUnitCost` on an export row — the oracle
// pins that these all reduce to the same number. Accept either field name here.
type CostBearing = { quantity?: number; itemCost?: number; unitCost?: number; miscCost?: number; contingencyPercentage?: number };
export function canonicalRowTotal(row: CostBearing): number {
  const cost = row.itemCost ?? row.unitCost ?? 0;
  const subTotal = (row.quantity ?? 0) * cost;
  const misc = row.miscCost ?? 0;
  const contingency = (subTotal * (row.contingencyPercentage ?? 0)) / 100;
  return subTotal + misc + contingency;
}

let rowSeq = 0;
export function makeRow(partial: Partial<EstimateRowItem> & { quantity: number; unitCost: number }): EstimateRowItem {
  rowSeq += 1;
  return {
    id: partial.id ?? `row-${rowSeq}`,
    material: partial.material ?? `Material ${rowSeq}`,
    description: partial.description ?? "",
    supplier: partial.supplier ?? "Supplier",
    unit: partial.unit ?? "unit",
    quantity: partial.quantity,
    // Domain cost field is `itemCost` (computeRowTotal); mirror it onto `unitCost`
    // so the chart-fact mapping and the canonical helper agree.
    itemCost: (partial as { itemCost?: number }).itemCost ?? partial.unitCost,
    unitCost: partial.unitCost,
    miscCost: partial.miscCost ?? 0,
    contingencyPercentage: partial.contingencyPercentage ?? 0,
    ...partial,
    // The domain row carries many display/link fields the oracle does not touch.
    // Casting keeps fixtures focused on the cost-bearing fields.
  } as unknown as EstimateRowItem;
}

export function makeNode(
  id: string,
  name: string,
  kind: "group" | "area",
  opts: { children?: EstimateTreeNode[]; rows?: EstimateRowItem[] } = {},
): EstimateTreeNode {
  return {
    id,
    name,
    kind,
    total: "0", // never trusted; computeNodeTotal recomputes
    children: opts.children,
    estimateRowItems: opts.rows,
  };
}

// ── ALL_AREA_FIXTURE ────────────────────────────────────────────────────────
export const ALL_AREA_FIXTURE: EstimateTreeNode[] = [
  makeNode("t1", "Building", "group", {
    children: [
      makeNode("sub", "Substructure", "group", {
        children: [
          makeNode("footings", "Footings", "area", {
            rows: [
              makeRow({ id: "r-concrete", material: "Concrete", quantity: 10, unitCost: 500, miscCost: 200, contingencyPercentage: 5 }),
              makeRow({ id: "r-rebar", material: "Rebar", quantity: 2, unitCost: 1500 }),
            ],
          }),
        ],
      }),
      makeNode("super", "Superstructure", "group", {
        children: [
          makeNode("gf", "Ground Floor", "area", { rows: [makeRow({ id: "r-block-gf", material: "Block", quantity: 100, unitCost: 45 })] }),
          makeNode("ff", "First Floor", "area", {
            rows: [
              makeRow({ id: "r-block-ff", material: "Block", quantity: 80, unitCost: 45 }),
              makeRow({ id: "r-beam", material: "Beam", quantity: 4, unitCost: 3000, contingencyPercentage: 10 }),
            ],
          }),
        ],
      }),
    ],
  }),
];

// ── MIXED_FIXTURE (V2 worked example) ───────────────────────────────────────
// BuildingA own=100, Level2 own=50, Room201=30, Level3=20 → grand 200, each row once.
export const MIXED_FIXTURE: EstimateTreeNode[] = [
  makeNode("bldgA", "Building A", "area", {
    rows: [makeRow({ id: "R_a", material: "Site prep", quantity: 1, unitCost: 100 })],
    children: [
      makeNode("level2", "Level 2", "area", {
        rows: [makeRow({ id: "R_b", material: "Level slab", quantity: 1, unitCost: 50 })],
        children: [makeNode("room201", "Room 201", "area", { rows: [makeRow({ id: "R_c", material: "Finish", quantity: 1, unitCost: 30 })] })],
      }),
      makeNode("level3", "Level 3", "area", { rows: [makeRow({ id: "R_d", material: "Roof", quantity: 1, unitCost: 20 })] }),
    ],
  }),
];

export const MIXED_EXPECTED = {
  grandTotal: 200,
  perNodeOwn: { bldgA: 100, level2: 50, room201: 30, level3: 20 },
  // rollup (own + descendants): bldgA = 100+50+30+20 = 200, level2 = 50+30 = 80
  perNodeRollup: { bldgA: 200, level2: 80, room201: 30, level3: 20 },
  allRowIds: ["R_a", "R_b", "R_c", "R_d"],
} as const;

// ── CALCULATION_PARITY_FIXTURE v1 ──────────────────────────────────────────
// Hand-authored independently of production calculators. Values are minor units.
// It pins membership, currency, fixed clock/settings, and expected output records
// for the parity migration without coupling expected values to any consumer.
export const CALCULATION_PARITY_FIXTURE = {
  version: 1,
  clock: "2026-07-10T00:00:00.000Z",
  currencyCode: "PHP",
  rows: [
    {
      id: "parity-material-labor",
      nodeId: "parity-included",
      scopeStatus: "included",
      input: { quantity: 1.25, unit_cost: 100, adjustment_percentage: 10, misc_cost: 5 } satisfies EstimateCalculationInput,
      expected: { materialMinorUnits: 12_500, adjustmentMinorUnits: 1_250, miscMinorUnits: 500, totalMinorUnits: 14_250 },
    },
    {
      id: "parity-quantity-contingency",
      nodeId: "parity-included",
      scopeStatus: "included",
      input: { quantity: 2.5, quantity_base: 2, quantity_contingency_amount: 0.5, unit_cost: 50, misc_cost: 0 } satisfies EstimateCalculationInput,
      expected: { materialMinorUnits: 12_500, adjustmentMinorUnits: 0, miscMinorUnits: 0, totalMinorUnits: 12_500 },
    },
    {
      id: "parity-excluded",
      nodeId: "parity-excluded",
      scopeStatus: "excluded",
      input: { quantity: 1, unit_cost: 60, misc_cost: 0 } satisfies EstimateCalculationInput,
      expected: { materialMinorUnits: 6_000, adjustmentMinorUnits: 0, miscMinorUnits: 0, totalMinorUnits: 6_000 },
    },
    {
      id: "parity-by-owner",
      nodeId: "parity-by-owner",
      scopeStatus: "by_owner",
      input: { quantity: 1, unit_cost: 30, misc_cost: 0 } satisfies EstimateCalculationInput,
      expected: { materialMinorUnits: 3_000, adjustmentMinorUnits: 0, miscMinorUnits: 0, totalMinorUnits: 3_000 },
    },
    {
      id: "parity-legacy-scope",
      nodeId: "parity-included",
      scopeStatus: null,
      input: { quantity: 1.5, unit_cost: 40, contingency_percentage: 5, misc_cost: 0 } satisfies EstimateCalculationInput,
      expected: { materialMinorUnits: 6_000, adjustmentMinorUnits: 300, miscMinorUnits: 0, totalMinorUnits: 6_300 },
    },
    {
      id: "parity-archived",
      nodeId: "parity-archived",
      scopeStatus: "included",
      archived: true,
      input: { quantity: 1, unit_cost: 99, misc_cost: 0 } satisfies EstimateCalculationInput,
      expected: { materialMinorUnits: 9_900, adjustmentMinorUnits: 0, miscMinorUnits: 0, totalMinorUnits: 9_900 },
    },
  ],
  expected: {
    workingEstimateMinorUnits: 42_050,
    proposalIncludedDirectMinorUnits: 33_050,
    sheetAdjustmentMinorUnits: 3_305,
    proposalContingencyMinorUnits: 1_818,
    vatMinorUnits: 4_581,
    finalProposalMinorUnits: 42_754,
    workbookRecords: [
      { cell: "F12", valueMinorUnits: 14_250, rowId: "parity-material-labor" },
      { cell: "F13", valueMinorUnits: 12_500, rowId: "parity-quantity-contingency" },
      { cell: "F14", valueMinorUnits: 6_300, rowId: "parity-legacy-scope" },
      { cell: "F20", valueMinorUnits: 42_754, rowId: "final-proposal-total" },
    ],
    printRows: ["parity-material-labor", "parity-quantity-contingency", "parity-legacy-scope"],
  },
  invalidInputs: [
    { name: "negative quantity", input: { quantity: -1, unit_cost: 1, misc_cost: 0 } satisfies EstimateCalculationInput, code: "invalid_calculation_input" },
    { name: "quantity contingency mismatch", input: { quantity: 2, quantity_base: 1, quantity_contingency_amount: 0.5, unit_cost: 1, misc_cost: 0 } satisfies EstimateCalculationInput, code: "invalid_calculation_input" },
    { name: "unsafe amount", input: { quantity: Number.MAX_VALUE, unit_cost: 1, misc_cost: 0 } satisfies EstimateCalculationInput, code: "amount_out_of_range" },
  ],
} as const;

export function calculationParityTreeFixture(): EstimateTreeNode[] {
  const nodes = new Map<string, EstimateRowItem[]>();
  for (const row of CALCULATION_PARITY_FIXTURE.rows) {
    const rows = nodes.get(row.nodeId) ?? [];
    rows.push(makeRow({
      id: row.id,
      material: row.id,
      quantity: row.input.quantity as number,
      unitCost: row.input.unit_cost as number,
      itemCost: row.input.unit_cost as number,
      quantityBase: row.input.quantity_base as number | null | undefined,
      quantityContingencyAmount: row.input.quantity_contingency_amount as number | null | undefined,
      contingencyPercentage: row.input.contingency_percentage as number | undefined,
      adjustmentPercentage: row.input.adjustment_percentage as number | undefined,
      miscCost: row.input.misc_cost as number,
      scopeStatus: row.scopeStatus ?? undefined,
    }));
    nodes.set(row.nodeId, rows);
  }

  return [
    makeNode("parity-root", "Parity root", "group", {
      children: [
        makeNode("parity-included", "Included", "area", { rows: nodes.get("parity-included") }),
        makeNode("parity-excluded", "Excluded", "area", { rows: nodes.get("parity-excluded") }),
        makeNode("parity-by-owner", "By owner", "area", { rows: nodes.get("parity-by-owner") }),
        makeNode("parity-archived", "Archived", "area", { rows: nodes.get("parity-archived") }),
      ],
    }),
  ];
}

// ── builders that mirror the real read paths ─────────────────────────────────

// Mirror of project-charts-repository.ts:213 (kind → "Area"/"Group") + row→fact flatten.
export function treeToChartFacts(tree: EstimateTreeNode[], estimateId = "est-oracle") {
  const nodeFacts: Array<{ id: string; estimateId: string; parentId: string | null; kind: "Area" | "Group"; name: string; sortOrder: number }> = [];
  const rowFacts: Array<Record<string, unknown>> = [];
  let sort = 0;
  const visit = (node: EstimateTreeNode, parentId: string | null) => {
    nodeFacts.push({ id: node.id, estimateId, parentId, kind: node.kind === "area" ? "Area" : "Group", name: node.name, sortOrder: sort++ });
    for (const row of node.estimateRowItems ?? []) {
      rowFacts.push({
        id: (row as { id: string }).id,
        estimateId,
        nodeId: node.id,
        // post-P2 the chart leaf-detect switches to leaf-or-has-rows; the node fact `kind`
        // stays as the display label. The raw `row.kind === "area"` sum at :256 must move too.
        kind: node.kind, // lowercase output-row kind
        quantity: row.quantity,
        unitCost: row.unitCost,
        miscCost: row.miscCost ?? 0,
        contingencyPercentage: row.contingencyPercentage ?? 0,
        sourceSupplierId: null,
        sourceSupplierName: null,
        total: canonicalRowTotal(row),
      });
    }
    for (const child of node.children ?? []) visit(child, node.id);
  };
  for (const root of tree) visit(root, null);
  return { estimateId, nodeFacts, rowFacts };
}

export function flattenRows(tree: EstimateTreeNode[]): EstimateRowItem[] {
  const out: EstimateRowItem[] = [];
  const visit = (n: EstimateTreeNode) => {
    out.push(...(n.estimateRowItems ?? []));
    (n.children ?? []).forEach(visit);
  };
  tree.forEach(visit);
  return out;
}

// Deterministic, key-sorted JSON so snapshot diffs are stable.
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  2);
}
