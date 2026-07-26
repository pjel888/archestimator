import { describe, expect, it } from "vitest";

import {
  CLIENT_PORTAL_BASIS_POINT_SCALE,
  CLIENT_PORTAL_QUANTITY_SCALE,
  createClientPortalIssueSourceProjection,
} from "@/lib/client-portal/issue-source-projection";
import type { SnapshotEstimateInput } from "@/lib/publication/snapshot";

function estimate(): SnapshotEstimateInput {
  return {
    id: "estimate-1",
    name: "  Architectural   Works ",
    sheetCode: " A-01 ",
    updatedAt: null,
    tabs: [{ id: "tab-1", name: " Main ", sortOrder: 0, isDefault: true }],
    nodes: [{ id: "node-1", name: " Ground  Floor ", kind: "area", parentId: null, sortOrder: 0, estimateTabId: "tab-1" }],
    rows: [
      {
        id: "row-1",
        nodeId: "node-1",
        componentId: "component-1",
        variantId: "variant-1",
        rowRevision: 3,
        description: " Convenience   outlet ",
        designation: " CO ",
        discipline: " Electrical ",
        material: " Duplex ",
        quantity: 1.234567,
        quantityBase: 1.234567,
        quantityContingencyAmount: 0,
        unit: " pc ",
        unitCost: 100.25,
        miscCost: 5.5,
        contingencyPercentage: 2.5,
        adjustmentPercentage: 10,
        scopeStatus: "included",
      },
      {
        id: "row-2",
        nodeId: "node-1",
        description: "Owner item",
        designation: "OI",
        discipline: "Electrical",
        material: "Fixture",
        quantity: 2,
        unit: "pc",
        unitCost: 1_000,
        miscCost: 0,
        contingencyPercentage: 0,
        adjustmentPercentage: 0,
        scopeStatus: "by_owner",
      },
    ],
  };
}

describe("createClientPortalIssueSourceProjection", () => {
  it("normalizes private source values and reconciles included totals", () => {
    const projection = createClientPortalIssueSourceProjection({ currencyCode: "php", estimates: [estimate()] });
    const projectedEstimate = projection.estimates[0]!;
    const included = projectedEstimate.rows[0]!;
    const informational = projectedEstimate.rows[1]!;

    expect(projectedEstimate.name).toBe("Architectural Works");
    expect(projectedEstimate.sheetCode).toBe("A-01");
    expect(included.quantityScaled).toBe(Math.round(1.234567 * CLIENT_PORTAL_QUANTITY_SCALE));
    expect(included.unitCostMinorUnits).toBe(10_025);
    expect(included.contingencyBasisPoints).toBe(2.5 * CLIENT_PORTAL_BASIS_POINT_SCALE);
    expect(included.adjustmentBasisPoints).toBe(10 * CLIENT_PORTAL_BASIS_POINT_SCALE);
    expect(included.description).toBe("Convenience outlet");
    expect(included.sourceTabId).toBe("tab-1");
    expect(informational.scopeStatus).toBe("informational");
    expect(informational.rowTotalMinorUnits).toBe(0);
    expect(projectedEstimate.totalMinorUnits).toBe(included.rowTotalMinorUnits);
    expect(projection.totalMinorUnits).toBe(projectedEstimate.totalMinorUnits);
  });

  it("is deterministic and rejects duplicate or unsafe source values", () => {
    const first = createClientPortalIssueSourceProjection({ currencyCode: "PHP", estimates: [estimate()] });
    const second = createClientPortalIssueSourceProjection({ currencyCode: "PHP", estimates: [estimate()] });
    expect(second).toEqual(first);

    const duplicateRows = estimate();
    duplicateRows.rows = [duplicateRows.rows[0]!, { ...duplicateRows.rows[0]! }];
    expect(() => createClientPortalIssueSourceProjection({ currencyCode: "PHP", estimates: [duplicateRows] })).toThrow(/unique within an estimate/i);

    const unsafe = estimate();
    unsafe.rows[0] = { ...unsafe.rows[0]!, quantity: Number.MAX_SAFE_INTEGER };
    expect(() => createClientPortalIssueSourceProjection({ currencyCode: "PHP", estimates: [unsafe] })).toThrow(/supported integer range/i);
  });
});
