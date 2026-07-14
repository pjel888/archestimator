import { describe, expect, it } from "vitest";

import { buildClientPortalEstimateBrowserPayload, buildClientPortalEstimateBrowserRowProjection, getClientPortalEstimateBrowserPage, getClientPortalEstimateBrowserRowsPage, summarizeClientPortalEstimateBrowserPayload } from "@/lib/client-portal/estimate-browser";

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
    expect(payload.paging).toEqual({ mode: "inline" });
    expect(payload.estimates[0]?.tabs[0]?.branches).toEqual([
      expect.objectContaining({ id: "f1", label: "F1", rowCount: 1, total: 20 }),
      expect.objectContaining({ id: "w1", label: "W1", rowCount: 1, total: 10 }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: "row_1", componentAnchor: null, variantAnchor: null, componentVersionNumber: null, variantLabel: null, rowRevision: 0, linkState: "unlinked", designation: "W1", description: "Wall", discipline: "Build", nodeId: null, quantity: 1, unit: "ea", rowTotal: 10, rowTotalMinorUnits: 1000, imageUrl: null });
    expect(JSON.stringify(payload)).not.toContain("Private product");
    expect(getClientPortalEstimateBrowserPage(rows, 2, payload.pageSize)).toMatchObject({ rows: [rows[1]], totalRows: 2, hasMore: false });
  });

  it("summarizes large client payloads and pages immutable rows by branch and search", () => {
    const payload = buildClientPortalEstimateBrowserPayload({
      currencyCode: "USD",
      pageSize: 1,
      estimates: [{
        id: "estimate_1", name: "Main", sheetCode: "A-100", updatedAt: null, rowCount: 2, totalCost: 30,
        rows: [
          { id: "row_1", description: "Wall framing", designation: "Shell / Walls", discipline: "Build", material: "", quantity: 1, unit: "ea", rowTotal: 10 },
          { id: "row_2", description: "Floor finish", designation: "Shell / Floors", discipline: "Build", material: "", quantity: 2, unit: "ea", rowTotal: 20 },
        ],
      }],
    });
    const summary = summarizeClientPortalEstimateBrowserPayload(payload);
    const branchId = payload.estimates[0]!.tabs[0]!.branches.find((branch) => branch.label === "Walls")!.id;
    const page = getClientPortalEstimateBrowserRowsPage(payload, { branchId, estimateId: "estimate_1", search: "wall", tabId: "estimate_1" });

    expect(summary.paging).toEqual({ mode: "server" });
    expect(summary.estimates[0]?.tabs[0]?.rows).toEqual([]);
    expect(page).toMatchObject({ hasMore: false, rows: [expect.objectContaining({ id: "row_1" })], totalRows: 1 });
  });

  it("materializes searchable row and branch membership once for D1 projection", () => {
    const payload = buildClientPortalEstimateBrowserPayload({
      currencyCode: "USD",
      estimates: [{
        id: "estimate_1", name: "Main", sheetCode: "A-100", updatedAt: null, rowCount: 2, totalCost: 30,
        rows: [
          { id: "row_1", description: "Wall framing", designation: "Shell / Walls", discipline: "Build", material: "", quantity: 1, unit: "ea", rowTotal: 10 },
          { id: "row_2", description: "Floor finish", designation: "Shell / Floors", discipline: "Build", material: "", quantity: 2, unit: "ea", rowTotal: 20 },
        ],
      }],
    });

    const projection = buildClientPortalEstimateBrowserRowProjection(payload);
    const wallBranch = payload.estimates[0]!.tabs[0]!.branches.find((branch) => branch.label === "Walls")!;

    expect(projection).toHaveLength(2);
    expect(projection[0]).toMatchObject({ estimateId: "estimate_1", tabId: "estimate_1", sortOrder: 0, searchText: expect.stringContaining("wall framing") });
    expect(projection[0]?.branchIds).toContain(wallBranch.id);
  });

  it("redacts raw broker paths from issued row projections", () => {
    const payload = buildClientPortalEstimateBrowserPayload({
      currencyCode: "USD",
      estimates: [{
        id: "estimate_1", name: "Main", sheetCode: "A-100", updatedAt: null, rowCount: 2, totalCost: 30,
        rows: [
          { id: "row_1", description: "Private image", designation: "W1", discipline: "Build", material: "", quantity: 1, unit: "ea", rowTotal: 10, imageUrl: "/api/component-library/images?path=workspace/user/components/private.webp" },
          { id: "row_2", description: "Public thumbnail", designation: "W2", discipline: "Build", material: "", quantity: 1, unit: "ea", rowTotal: 20, imageUrl: "/component-thumbnails/public.webp" },
        ],
      }],
    });

    expect(payload.estimates[0]?.tabs[0]?.rows[0]?.imageUrl).toBeNull();
    expect(payload.estimates[0]?.tabs[0]?.rows[1]?.imageUrl).toBe("/component-thumbnails/public.webp");
    expect(JSON.stringify(payload)).not.toContain("workspace/user/components/private.webp");
  });
});
