import { afterEach, describe, expect, it } from "vitest";

import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";
import {
  buildEffectiveEstimateTreeTotals,
  clearEstimateTreeTotals,
  getEstimateTreeSubtotalPresentation,
  getEstimateTreeTotalsAnnouncement,
  getEstimateTreeTotalsCompleteness,
  publishEstimateTreeTotals,
  readEstimateTreeTotals,
  resolveEstimateTreeTotalsMutationState,
  type EstimateTreeTotalsDataState,
  type EstimateTreeTotalsMutationState,
} from "@/lib/estimates/estimate-tree-totals-store";

const complete = getEstimateTreeTotalsCompleteness([]);

function publish(input: {
  estimateId?: string;
  tabId?: string;
  currencyCode?: string | null;
  nodeTotals?: ReadonlyMap<string, number>;
  projectTotal?: number;
  dataState?: EstimateTreeTotalsDataState;
  mutationState?: EstimateTreeTotalsMutationState;
  revision?: number;
}) {
  return publishEstimateTreeTotals({
    estimateId: input.estimateId ?? "estimate-1",
    tabId: input.tabId,
    currencyCode: input.currencyCode === undefined ? "PHP" : input.currencyCode,
    nodeTotals: input.nodeTotals ?? new Map([["area-1", 12_500]]),
    projectTotal: input.projectTotal ?? 12_500,
    dataState: input.dataState ?? "ready",
    mutationState: input.mutationState ?? "authoritative",
    completeness: complete,
    revision: input.revision ?? 1,
  });
}

function projectedRow(id: string, overrides: Partial<EstimateRowItem> = {}): EstimateRowItem {
  return {
    id,
    material: id,
    description: "",
    supplier: "",
    unit: "ea",
    quantity: 1,
    itemCost: 0,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 0,
    subTotal: 0,
    totalItemCosts: 0,
    category: "General",
    pricingSource: "test",
    pricingDate: "2026-07-30",
    ...overrides,
  };
}

describe("estimate tree live subtotal bridge", () => {
  afterEach(() => {
    clearEstimateTreeTotals("estimate-1");
    clearEstimateTreeTotals("estimate-1", "tab-a");
    clearEstimateTreeTotals("estimate-1", "tab-b");
    clearEstimateTreeTotals("estimate-2", "tab-a");
  });

  it("keeps exact estimate/tab scopes isolated and clears only the mounted scope", () => {
    publish({ tabId: "tab-a", nodeTotals: new Map([["area-1", 100]]), projectTotal: 100 });
    publish({ tabId: "tab-b", nodeTotals: new Map([["area-1", 200]]), projectTotal: 200 });
    publish({ estimateId: "estimate-2", tabId: "tab-a", nodeTotals: new Map([["area-1", 300]]), projectTotal: 300 });

    expect(readEstimateTreeTotals("estimate-1", "tab-a")?.nodeTotals.get("area-1")).toBe(100);
    expect(readEstimateTreeTotals("estimate-1", "tab-b")?.nodeTotals.get("area-1")).toBe(200);
    expect(readEstimateTreeTotals("estimate-2", "tab-a")?.nodeTotals.get("area-1")).toBe(300);

    clearEstimateTreeTotals("estimate-1", "tab-a");
    expect(readEstimateTreeTotals("estimate-1", "tab-a")).toBeNull();
    expect(readEstimateTreeTotals("estimate-1", "tab-b")?.nodeTotals.get("area-1")).toBe(200);
  });

  it("publishes frozen copied totals, ignores regressions, and is idempotent", () => {
    const totals = new Map([["area-1", 12_500]]);
    expect(publish({ tabId: "tab-a", nodeTotals: totals, revision: 4 })).toBe(true);
    expect(publish({ tabId: "tab-a", nodeTotals: totals, revision: 4 })).toBe(false);
    totals.set("area-1", 99_999);

    const snapshot = readEstimateTreeTotals("estimate-1", "tab-a");
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot?.scope)).toBe(true);
    expect(Object.isFrozen(snapshot?.nodeTotals)).toBe(true);
    expect(snapshot?.nodeTotals.get("area-1")).toBe(12_500);
    expect("set" in (snapshot?.nodeTotals ?? {})).toBe(false);

    expect(publish({ tabId: "tab-a", nodeTotals: new Map([["area-1", 1]]), revision: 3 })).toBe(false);
    expect(readEstimateTreeTotals("estimate-1", "tab-a")?.nodeTotals.get("area-1")).toBe(12_500);
  });

  it.each([
    [null, "Loading", "Loading subtotal", true],
    ["loading", "Loading", "Loading subtotal", true],
    ["unavailable", "Unavailable", "Subtotal unavailable", false],
  ] as const)("renders no precise amount for %s", (dataState, statusText, accessibleText, showSkeleton) => {
    if (dataState) publish({ dataState });
    const presentation = getEstimateTreeSubtotalPresentation(
      readEstimateTreeTotals("estimate-1"),
      "area-1",
      "Ground Floor",
    );
    expect(presentation.amountText).toBeNull();
    expect(presentation.statusText).toBe(statusText);
    expect(presentation.ariaLabel).toContain(accessibleText);
    expect(presentation.showSkeleton).toBe(showSkeleton);
  });

  it.each([
    ["ready", "authoritative", []],
    ["updating", "authoritative", ["updating"]],
    ["partial", "optimistic", ["partial", "unsaved"]],
    ["stale-error", "pending", ["stale after update error", "saving"]],
    ["ready", "rejected-retained", ["unsaved after rejection"]],
    ["ready", "rolled-back", ["rolled back"]],
  ] as const)("labels %s/%s amounts without presenting status as final", (dataState, mutationState, statuses) => {
    publish({ dataState, mutationState });
    const presentation = getEstimateTreeSubtotalPresentation(
      readEstimateTreeTotals("estimate-1"),
      "area-1",
      "Ground Floor",
    );
    expect(presentation.amountText).toContain("PHP");
    expect(presentation.ariaLabel).toContain("Ground Floor subtotal");
    for (const status of statuses) expect(presentation.ariaLabel).toContain(status);
  });

  it("fails closed when currency metadata or a precise amount is invalid", () => {
    publish({ currencyCode: null });
    expect(readEstimateTreeTotals("estimate-1")).toMatchObject({
      currencyCode: null,
      dataState: "unavailable",
      safeErrorCode: "invalid-currency",
    });

    clearEstimateTreeTotals("estimate-1");
    publish({ currencyCode: "PHP", nodeTotals: new Map([["area-1", Number.NaN]]) });
    expect(readEstimateTreeTotals("estimate-1")).toMatchObject({
      dataState: "unavailable",
      safeErrorCode: "invalid-total",
    });
  });

  it("preserves partiality alongside mutation priority and pane announcements", () => {
    expect(resolveEstimateTreeTotalsMutationState({
      hasOptimistic: true,
      hasPending: true,
      hasRejectedRetained: true,
      hasRolledBack: true,
    })).toBe("rejected-retained");

    publish({ dataState: "partial", mutationState: "rejected-retained" });
    expect(getEstimateTreeTotalsAnnouncement(readEstimateTreeTotals("estimate-1")))
      .toBe("Subtotal changes were rejected and remain unsaved.");
    expect(getEstimateTreeSubtotalPresentation(
      readEstimateTreeTotals("estimate-1"),
      "area-1",
      "Area",
    ).statusText).toBe("partial · unsaved after rejection");
  });
});

describe("effective contribution subtotal parity", () => {
  it("zeros excluded alternatives and optionals, counts accessories once, and rolls descendants into the main area", () => {
    const alternativeGroup = {
      id: "finish-options",
      name: "Finish options",
      selectedRowItemId: "selected-finish",
      memberRowItemIds: ["selected-finish", "excluded-finish"],
      revision: 1,
    };
    const accessoryChild = {
      edgeId: "edge-included",
      childRowItemId: "included-accessory",
      mode: "required" as const,
      isIncluded: true,
      quantityRule: { schemaVersion: 1, kind: "fixed", quantity: 1 },
      revision: 1,
    };
    const excludedAccessory = {
      edgeId: "edge-excluded",
      childRowItemId: "excluded-accessory",
      mode: "optional" as const,
      isIncluded: false,
      quantityRule: { schemaVersion: 1, kind: "fixed", quantity: 1 },
      revision: 1,
    };
    const nodes: EstimateTreeNode[] = [{
      id: "main-area",
      name: "Main Area",
      kind: "group",
      total: "not-used",
      estimateRowItems: [
        projectedRow("selected-finish", { alternativeGroup }),
        projectedRow("excluded-finish", { alternativeGroup }),
        projectedRow("excluded-optional", { optionalContribution: { isIncluded: false, revision: 1 } }),
        projectedRow("assembly-root", { accessoryChildren: [accessoryChild, excludedAccessory] }),
        projectedRow("included-accessory", {
          accessoryParent: { ...accessoryChild, parentRowItemId: "assembly-root" },
        }),
        projectedRow("excluded-accessory", {
          accessoryParent: { ...excludedAccessory, parentRowItemId: "assembly-root" },
        }),
      ],
      children: [{
        id: "nested-area",
        name: "Nested Area",
        kind: "area",
        total: "not-used",
        estimateRowItems: [projectedRow("nested-row")],
      }],
    }];
    const amounts = new Map([
      ["selected-finish", 100],
      ["excluded-finish", 200],
      ["excluded-optional", 300],
      ["assembly-root", 400],
      ["included-accessory", 50],
      ["excluded-accessory", 40],
      ["nested-row", 25],
    ]);

    const result = buildEffectiveEstimateTreeTotals(nodes, (row, quantityOverride) => {
      const quantity = quantityOverride ?? 1;
      return {
        amount: (amounts.get(row.id) ?? 0) * quantity,
        quantity,
      };
    });

    expect(result).toMatchObject({ ok: true, projectTotal: 575 });
    if (!result.ok) return;
    expect(result.nodeTotals.get("nested-area")).toBe(25);
    expect(result.nodeTotals.get("main-area")).toBe(575);
  });

  it("matches export quantity-rule semantics for per-parent accessories", () => {
    const parent = projectedRow("parent", {
      quantity: 3,
      accessoryChildren: [{
        edgeId: "edge-1",
        childRowItemId: "child",
        mode: "required",
        isIncluded: true,
        quantityRule: { schemaVersion: 1, kind: "per-parent", factor: 2 },
        revision: 1,
      }],
    });
    const child = projectedRow("child", {
      accessoryParent: {
        edgeId: "edge-1",
        parentRowItemId: "parent",
        mode: "required",
        isIncluded: true,
        quantityRule: { schemaVersion: 1, kind: "per-parent", factor: 2 },
        revision: 1,
      },
    });
    const result = buildEffectiveEstimateTreeTotals([{
      id: "area",
      name: "Area",
      kind: "area",
      total: "",
      estimateRowItems: [parent, child],
    }], (row, quantityOverride) => {
      const quantity = quantityOverride ?? row.quantity;
      const unitAmount = row.id === "parent" ? 10 : 5;
      return { amount: unitAmount * quantity, quantity };
    });

    expect(result).toMatchObject({ ok: true, projectTotal: 60 });
    if (result.ok) expect(result.nodeTotals.get("area")).toBe(60);
  });

  it("keeps fixed-rule descendants excluded when an accessory ancestor is excluded", () => {
    const excludedEdge = {
      edgeId: "edge-excluded",
      childRowItemId: "excluded-child",
      mode: "optional" as const,
      isIncluded: false,
      quantityRule: { schemaVersion: 1, kind: "fixed", quantity: 2 },
      revision: 1,
    };
    const descendantEdge = {
      edgeId: "edge-descendant",
      childRowItemId: "fixed-grandchild",
      mode: "required" as const,
      isIncluded: true,
      quantityRule: { schemaVersion: 1, kind: "fixed", quantity: 3 },
      revision: 1,
    };
    const rows = [
      projectedRow("root", { accessoryChildren: [excludedEdge] }),
      projectedRow("excluded-child", {
        accessoryParent: { ...excludedEdge, parentRowItemId: "root" },
        accessoryChildren: [descendantEdge],
      }),
      projectedRow("fixed-grandchild", {
        accessoryParent: { ...descendantEdge, parentRowItemId: "excluded-child" },
      }),
    ];

    const result = buildEffectiveEstimateTreeTotals([{
      id: "area",
      name: "Area",
      kind: "area",
      total: "",
      estimateRowItems: rows,
    }], (row, quantityOverride) => {
      const quantity = quantityOverride ?? 1;
      return { amount: (row.id === "root" ? 100 : 10) * quantity, quantity };
    });

    expect(result).toMatchObject({ ok: true, projectTotal: 100 });
    if (result.ok) expect(result.nodeTotals.get("area")).toBe(100);
  });

  it("fails closed when an accessory rule needs unavailable area input", () => {
    const parent = projectedRow("parent", {
      accessoryChildren: [{
        edgeId: "edge-1",
        childRowItemId: "child",
        mode: "required",
        isIncluded: true,
        quantityRule: { schemaVersion: 1, kind: "area", factor: 2, unit: "m2" },
        revision: 1,
      }],
    });
    const child = projectedRow("child", {
      accessoryParent: {
        edgeId: "edge-1",
        parentRowItemId: "parent",
        mode: "required",
        isIncluded: true,
        quantityRule: { schemaVersion: 1, kind: "area", factor: 2, unit: "m2" },
        revision: 1,
      },
    });

    expect(buildEffectiveEstimateTreeTotals([{
      id: "area",
      name: "Area",
      kind: "area",
      total: "",
      estimateRowItems: [parent, child],
    }], () => ({ amount: 10, quantity: 1 }))).toEqual({
      ok: false,
      safeErrorCode: "accessory-quantity-missing_variable",
    });
  });

  it("fails closed instead of reattributing a cross-area accessory", () => {
    const parent = projectedRow("parent", {
      accessoryChildren: [{
        edgeId: "edge-1",
        childRowItemId: "child",
        mode: "required",
        isIncluded: true,
        quantityRule: { schemaVersion: 1, kind: "fixed", quantity: 1 },
        revision: 1,
      }],
    });
    const child = projectedRow("child", {
      accessoryParent: {
        edgeId: "edge-1",
        parentRowItemId: "parent",
        mode: "required",
        isIncluded: true,
        quantityRule: { schemaVersion: 1, kind: "fixed", quantity: 1 },
        revision: 1,
      },
    });
    const result = buildEffectiveEstimateTreeTotals([
      { id: "area-a", name: "A", kind: "area", total: "", estimateRowItems: [parent] },
      { id: "area-b", name: "B", kind: "area", total: "", estimateRowItems: [child] },
    ], () => ({ amount: 10, quantity: 1 }));

    expect(result).toEqual({ ok: false, safeErrorCode: "invalid-accessory-area" });
  });
});
