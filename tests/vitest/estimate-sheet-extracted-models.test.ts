import { describe, expect, it } from "vitest";

import { buildActivityScopeTreeItems } from "@/components/workshop/estimate-sheet/activity-scope-tree";
import {
  DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS,
  appendProposalExportSettingsParams,
  countUnsavedEditableRows,
  proposalPreviewModelSettings,
} from "@/components/workshop/estimate-sheet/proposal-preview-model";
import {
  appendTemplateNodesToParent,
  cloneTemplateNodesForEstimate,
  reconcileAuthoritativeInsertedRoots,
} from "@/components/workshop/estimate-sheet/template-insertion-model";
import { getInitialEditableRow } from "@/components/workshop/estimate-sheet/rows/editable-row-model";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

function row(overrides: Partial<EstimateRowItem> = {}): EstimateRowItem {
  return {
    id: "row-1",
    material: "Oak flooring",
    name: "Oak flooring",
    description: "Engineered oak",
    supplier: "Wood Supplier",
    source: "library",
    unit: "sqm",
    itemCost: 100,
    quantity: 2,
    subTotal: 200,
    contingencyPercentage: 10,
    contingencyValue: 20,
    miscCost: 5,
    totalItemCosts: 225,
    category: "Finishes",
    pricingSource: "Quote",
    pricingDate: "2026-06-26",
    designation: "F-01",
    sourceLibraryItemId: null,
    linkState: "unlinked",
    metadata: {},
    ...overrides,
  };
}

function node(overrides: Partial<EstimateTreeNode> = {}): EstimateTreeNode {
  return {
    id: "node-1",
    name: "Living",
    kind: "area",
    total: "PHP 225.00",
    children: [],
    estimateRowItems: [],
    ...overrides,
  };
}

describe("estimate sheet extracted models", () => {
  it("keeps proposal export query params clean for default settings", () => {
    const params = new URLSearchParams();
    appendProposalExportSettingsParams(params, DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS);

    expect(params.toString()).toBe("");
    expect(proposalPreviewModelSettings(DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS)).toEqual({
      contingencyRate: 10,
      vatRate: 12,
      contingencyMode: "percentage",
      vatMode: "percentage",
      includeFormulas: true,
      sheetAdjustmentMode: "contingency",
      sheetAdjustmentRate: 0,
    });
  });

  it("appends only non-default proposal export settings", () => {
    const params = new URLSearchParams();
    appendProposalExportSettingsParams(params, {
      ...DEFAULT_PROPOSAL_EXPORT_USER_SETTINGS,
      contingencyRate: 15,
      vatIncluded: true,
      includeFormulas: false,
      includeInternalBreakdown: true,
    });

    expect(params.toString()).toBe("contingencyRate=15&vatMode=included&includeFormulas=false&audience=internal");
  });

  it("counts edited proposal preview rows by comparing against initial editable values", () => {
    const item = row();
    const tree = [node({ estimateRowItems: [item] })];
    const edited = { ...getInitialEditableRow(item), quantity: "3" };

    expect(countUnsavedEditableRows(tree, {})).toBe(0);
    expect(countUnsavedEditableRows(tree, { [item.id]: edited })).toBe(1);
  });

  it("clones template subtrees with fresh ids and recalculated row totals", () => {
    const templateRow = row({ id: "template-row", quantity: 3, itemCost: 200, miscCost: 20, contingencyPercentage: 5 });
    const templateTree = [
      node({
        id: "template-root",
        name: "Template Root",
        children: [node({ id: "template-child", name: "Template Child", estimateRowItems: [templateRow] })],
      }),
    ];

    const [clonedRoot] = cloneTemplateNodesForEstimate(templateTree);
    const clonedChild = clonedRoot.children?.[0];
    const clonedRow = clonedChild?.estimateRowItems?.[0];

    expect(clonedRoot.id).not.toBe("template-root");
    expect(clonedRoot.total).toBe("PHP 0.00");
    expect(clonedChild?.id).not.toBe("template-child");
    expect(clonedRow?.id).not.toBe("template-row");
    expect(clonedRow?.material).toBe("Oak flooring");
    expect(clonedRow?.subTotal).toBe(600);
    expect(clonedRow?.contingencyValue).toBe(0);
    expect(clonedRow?.adjustmentPercentage).toBe(5);
    expect(clonedRow?.adjustmentValue).toBe(30);
    expect(clonedRow?.totalItemCosts).toBe(650);
  });

  it("appends cloned template nodes under the requested parent only", () => {
    const existing = [
      node({ id: "root", kind: "group", name: "Root", children: [node({ id: "target", name: "Target" })] }),
    ];
    const inserted = [node({ id: "inserted", name: "Inserted" })];

    const next = appendTemplateNodesToParent(existing, "target", inserted);

    expect(next[0]).not.toBe(existing[0]);
    expect(next[0].children?.[0].children).toEqual(inserted);
    expect(existing[0].children?.[0].children).toEqual([]);
  });

  it("reconciles authoritative inserted roots without discarding later local structure", () => {
    const current = [node({
      id: "root",
      kind: "group",
      children: [node({
        id: "target",
        children: [
          node({ id: "existing", name: "Existing" }),
          node({ id: "optimistic", name: "Optimistic" }),
          node({ id: "later-local", name: "Later local" }),
        ],
      })],
    })];
    const authoritative = [node({
      id: "root",
      kind: "group",
      children: [node({
        id: "target",
        children: [node({ id: "existing", name: "Existing" }), node({ id: "server-root", name: "Server root" })],
      })],
    })];

    const reconciled = reconcileAuthoritativeInsertedRoots({
      currentTree: current,
      authoritativeTree: authoritative,
      targetParentNodeId: "target",
      authoritativeRootNodeIds: ["server-root"],
      optimisticRootNodeIds: ["optimistic"],
    });

    expect(reconciled[0].children?.[0].children?.map((child) => child.id)).toEqual([
      "existing",
      "server-root",
      "later-local",
    ]);
    expect(reconciled[0].children?.[0].children?.[1].name).toBe("Server root");
  });

  it("builds stable activity scopes from stored direct-only choices", () => {
    const item = row();
    const nodes = [
      node({
        id: "root",
        kind: "group",
        name: "Root",
        children: [node({ id: "area", name: "Area", estimateRowItems: [item] })],
      }),
    ];
    const items = buildActivityScopeTreeItems({
      nodes,
      rows: [],
      editableRows: {},
      metadata: null,
      projectTotal: 225,
      nodeTotals: new Map([
        ["root", 225],
        ["area", 225],
      ]),
      activityScopeDirectOnly: { root: true },
    });

    expect(items.find((scopeItem) => scopeItem.id === "sheet")?.total).toBe(225);
    expect(items.find((scopeItem) => scopeItem.id === "node:root")?.scope).toEqual({
      mode: "node",
      nodeId: "root",
      includeDescendants: false,
    });
    expect(items.find((scopeItem) => scopeItem.id === "node:area")?.scope).toEqual({
      mode: "node",
      nodeId: "area",
      includeDescendants: true,
    });
    expect(items.find((scopeItem) => scopeItem.id === "row:area:0:row-1")).toMatchObject({
      kind: "row",
      label: "Oak flooring",
      description: "Root / Area",
      total: 225,
    });
  });
});
