import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";

const mocks = vi.hoisted(() => ({
  getProjectEstimateTreeByEstimate: vi.fn(),
  getEstimateTabs: vi.fn(),
  getEstimateTabTree: vi.fn(),
  getEstimateTreesForTabs: vi.fn(),
  getCurrentUserContext: vi.fn(),
  checkProposalExportRateLimit: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getProjectEstimateTreeByEstimate: mocks.getProjectEstimateTreeByEstimate,
  getEstimateTabs: mocks.getEstimateTabs,
  getEstimateTabTree: mocks.getEstimateTabTree,
  getEstimateTreesForTabs: mocks.getEstimateTreesForTabs,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: mocks.getCurrentUserContext,
}));

vi.mock("@/lib/publication/public-repository", () => ({
  checkProposalExportRateLimit: mocks.checkProposalExportRateLimit,
}));

import { GET } from "@/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route";

function makeRow(index: number): EstimateRowItem {
  const quantity = 1 + (index % 8);
  const itemCost = 700 + index * 13;
  const miscCost = index % 4 === 0 ? 250 : 0;

  return {
    id: `route-workbook-row-${index}`,
    material: `Route proof item ${index}`,
    description: `Generated line item ${index}`,
    supplier: "Route Proof Supplier",
    source: "supplier",
    unit: index % 3 === 0 ? "lot" : index % 3 === 1 ? "sqm" : "pc",
    itemCost,
    quantity,
    subTotal: itemCost * quantity,
    miscCost,
    totalItemCosts: itemCost * quantity + miscCost,
    category: index % 2 === 0 ? "Architectural Works" : "Electrical Works",
    discipline: index % 2 === 0 ? "Architectural" : "Electrical",
    designation: index % 2 === 0 ? "Finish" : "Power",
    tags: ["route-proof", "export"],
    pricingSource: "Route proof fixture",
    pricingDate: "2026-06-02",
    confidence: "allowance",
  };
}

function makeTree(rowCount: number): EstimateTreeNode[] {
  const rows = Array.from({ length: rowCount }, (_, index) => makeRow(index + 1));

  return [
    {
      id: "route-proof-group",
      name: "Route Proof Group",
      kind: "group",
      total: "0",
      children: [
        {
          id: "route-proof-area-a",
          name: "Route Proof Area A",
          kind: "area",
          total: "0",
          estimateRowItems: rows.slice(0, Math.ceil(rows.length / 2)),
        },
        {
          id: "route-proof-area-b",
          name: "Route Proof Area B",
          kind: "area",
          total: "0",
          estimateRowItems: rows.slice(Math.ceil(rows.length / 2)),
        },
      ],
    },
  ];
}

function request() {
  return new Request("http://localhost/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx");
}

describe("proposal xlsx export route workbook integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserContext.mockResolvedValue({
      userId: "user-1",
      email: "owner@example.com",
      role: "member",
      profile: { id: "user-1", role: "member" },
      displayName: "Owner",
      avatarUrl: null,
    });
    mocks.checkProposalExportRateLimit.mockResolvedValue({ allowed: true });
    mocks.getEstimateTabs.mockResolvedValue([]);
    mocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
      workspace: { id: "workspace-1" },
      project: {
        id: "project-1",
        name: "Route Proof Residence",
        project_code: "RTE-001",
        location: "Makati City",
        currency_code: "PHP",
      },
      estimate: {
        id: "estimate-1",
        name: "Route Proof Estimate",
        sheet_code: "RTE-EST",
        currency_code: "PHP",
        metadata: { versionNumber: 4 },
      },
      selectedNodeId: "route-proof-area-a",
      tree: makeTree(60),
    });
  });

  it("builds a real xlsx workbook through the route handler without mocking the workbook builder", async () => {
    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });
    const buffer = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(mocks.getProjectEstimateTreeByEstimate).toHaveBeenCalledWith(
      "project-1",
      "estimate-1",
      expect.objectContaining({
        maxNodeCount: expect.any(Number),
        maxRowItemCount: expect.any(Number),
      }),
    );
    expect(response.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(response.headers.get("content-disposition")).toContain("RTE-001-RTE-EST-proposal.xlsx");
    expect(Number(response.headers.get("content-length"))).toBe(buffer.byteLength);
    expect(buffer.byteLength).toBeGreaterThan(10_000);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Default audience is client (D0=A) → the internal Source Breakdown sheet is redacted out.
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Bid Form",
      "Summary",
      "Commercial Terms",
    ]);
    expect(workbook.getWorksheet("Bid Form")?.getCell("A1").value).toBe("BID FORM / BILL OF QUANTITIES");
    expect(workbook.getWorksheet("Bid Form")?.getCell("H19").value).toEqual(expect.objectContaining({ formula: expect.any(String) }));
    // P1-T6: dynamic Summary totals. makeTree(60) → 2 sections (rows 15-16) → totals start
    // at row 18, Grand Total at row 21.
    expect(workbook.getWorksheet("Summary")?.getCell("B21").value).toEqual(expect.objectContaining({ formula: "B18+B19+B20" }));
  });

  it("round-trips a multi-tab export through the route workbook builder", async () => {
    mocks.getEstimateTabs.mockResolvedValueOnce([
      { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
      { id: "tab-alt", name: "Alt / Scope", sortOrder: 10, isDefault: false },
    ]);
    mocks.getEstimateTreesForTabs.mockResolvedValueOnce({
      workspace: { id: "workspace-1", name: "Route Proof Co" },
      project: { id: "project-1", name: "Route Proof Residence", project_code: "RTE-001", location: "Makati City", currency_code: "PHP" },
      estimate: { id: "estimate-1", name: "Route Proof Estimate", sheet_code: "RTE-EST", currency_code: "PHP", metadata: { versionNumber: 4 } },
      tabs: [
        { tab: { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true }, tree: makeTree(4) },
        { tab: { id: "tab-alt", name: "Alt / Scope", sortOrder: 10, isDefault: false }, tree: makeTree(4) },
      ],
      loadLimitState: { maxNodeCount: 1200, maxRowItemCount: 3000, fetchedNodeCount: 6, fetchedRowItemCount: 8, didExceedNodeLimit: false, didExceedRowItemLimit: false },
    });

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(response.status).toBe(200);
    // Default audience is client (D0=A) → no internal Source Breakdown sheet.
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Summary",
      "Main",
      "Alt Scope",
      "Commercial Terms",
    ]);
    expect(workbook.getWorksheet("Summary")?.getCell("C16").value).toEqual(expect.objectContaining({ formula: expect.stringMatching(/^'Main'!H/) }));
    expect(workbook.getWorksheet("Summary")?.getCell("C19").value).toEqual(expect.objectContaining({ formula: expect.stringMatching(/^'Alt Scope'!H/) }));
    expect(workbook.getWorksheet("Source Breakdown")).toBeUndefined();
  });
});
