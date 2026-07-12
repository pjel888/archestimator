import { describe, expect, it } from "vitest";

import { buildClientPortalEstimateBrowserPayload, getClientPortalEstimateBrowserPage } from "@/lib/client-portal/estimate-browser";

describe("client portal estimate browser", () => {
  it("preserves every legacy and tab-scoped row while omitting private source fields", () => {
    const payload = buildClientPortalEstimateBrowserPayload({
      currencyCode: "USD",
      pageSize: 1,
      estimates: [{
        id: "estimate_1", name: "Main", sheetCode: "A-100", updatedAt: null, rowCount: 2, totalCost: 30,
        rows: [
          { id: "row_1", description: "Wall", designation: "W1", discipline: "Build", material: "Private product", quantity: 1, unit: "ea", rowTotal: 10 },
          { id: "row_2", description: "Floor", designation: "F1", discipline: "Build", material: "Private product", quantity: 2, unit: "ea", rowTotal: 20 },
        ],
        tabs: [{ id: "tab_1", name: "Scope", sortOrder: 0, isDefault: true, rowCount: 2, totalCost: 30, rowIds: ["row_1", "row_2"] }],
      }],
    });

    const rows = payload.estimates[0]?.tabs[0]?.rows ?? [];
    expect(payload.totalRowCount).toBe(2);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: "row_1", designation: "W1", description: "Wall", discipline: "Build", quantity: 1, unit: "ea", rowTotal: 10 });
    expect(JSON.stringify(payload)).not.toContain("Private product");
    expect(getClientPortalEstimateBrowserPage(rows, 2, payload.pageSize)).toMatchObject({ rows: [rows[1]], totalRows: 2, hasMore: false });
  });
});
