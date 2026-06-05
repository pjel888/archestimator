import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EstimateTreeNode } from "@/lib/estimates/types";

const mocks = vi.hoisted(() => ({
  getProjectEstimateTreeByEstimate: vi.fn(),
  createProposalWorkbookBuffer: vi.fn(),
}));

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getProjectEstimateTreeByEstimate: mocks.getProjectEstimateTreeByEstimate,
}));

vi.mock("@/lib/proposal-export/create-proposal-workbook", () => ({
  createProposalWorkbookBuffer: mocks.createProposalWorkbookBuffer,
}));

import { GET } from "@/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route";
import { buildProposalWorkbookFilename } from "@/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/filename";

const tree: EstimateTreeNode[] = [
  {
    id: "area-1",
    name: "Bedroom A",
    kind: "area",
    total: "₱0.00",
    estimateRowItems: [
      {
        id: "row-1",
        material: "Porcelain Tile",
        description: "Supply and install porcelain floor tile",
        supplier: "Sample Supplier",
        source: "supplier",
        unit: "sqm",
        itemCost: 950,
        quantity: 12,
        subTotal: 11_400,
        miscCost: 500,
        totalItemCosts: 11_900,
        category: "Finishes",
        discipline: "Architectural",
        designation: "Floor Finish",
        pricingSource: "Supplier allowance",
        pricingDate: "2026-05-23",
      },
    ],
  },
];

function request() {
  return new Request("http://localhost/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx");
}

describe("proposal xlsx export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createProposalWorkbookBuffer.mockResolvedValue(Buffer.from("xlsx-bytes"));
    mocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
      workspace: { id: "workspace-1" },
      project: {
        id: "project-1",
        name: "Synthetic Hotel Fit-Out Study",
        project_code: "SYN-001",
        location: "Metro City",
        currency_code: "PHP",
      },
      estimate: {
        id: "estimate-1",
        name: "Interior Fit-Out Estimate",
        sheet_code: "EST-001",
        currency_code: "PHP",
        metadata: { versionNumber: 3 },
      },
      selectedNodeId: "area-1",
      tree,
    });
  });

  it("returns an editable xlsx attachment scoped to the current project estimate", async () => {
    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(mocks.getProjectEstimateTreeByEstimate).toHaveBeenCalledWith(
      "project-1",
      "estimate-1",
      expect.objectContaining({
        maxNodeCount: expect.any(Number),
        maxRowItemCount: expect.any(Number),
      }),
    );
    expect(mocks.createProposalWorkbookBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          projectId: "project-1",
          estimateId: "estimate-1",
          projectName: "Synthetic Hotel Fit-Out Study",
          projectCode: "SYN-001",
          projectAddress: "Metro City",
          estimateName: "Interior Fit-Out Estimate",
          estimateSheetCode: "EST-001",
          versionLabel: "V3",
          currency: "PHP",
        }),
        totals: expect.objectContaining({ grandTotal: 11_900 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-disposition")).toContain("SYN-001-EST-001-proposal.xlsx");
    expect(await response.text()).toBe("xlsx-bytes");
  });

  it("treats version labels as mutable estimate metadata, not dormant named-version snapshots", () => {
    const routeSource = readFileSync(
      join(process.cwd(), "src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts"),
      "utf8",
    );
    const pageSource = readFileSync(
      join(process.cwd(), "src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx"),
      "utf8",
    );
    const combinedSource = `${routeSource}\n${pageSource}`;

    expect(combinedSource).toContain("readVersionLabel");
    expect(combinedSource).toContain("readEstimateVersionLabel");
    expect(combinedSource).toContain("estimate.metadata");
    expect(combinedSource).not.toContain("estimate_sheet_versions");
    expect(combinedSource).not.toContain("create_estimate_sheet_version");
    expect(combinedSource).not.toContain("restore_estimate_sheet_version_as_copy");
  });

  it("returns 404 when the project or estimate is outside the current workspace", async () => {
    mocks.getProjectEstimateTreeByEstimate.mockResolvedValueOnce({
      workspace: { id: "workspace-1" },
      project: null,
      estimate: null,
      selectedNodeId: null,
      tree: [],
    });

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "missing-project", estimateId: "missing-estimate" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Estimate not found." });
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
  });

  it("rejects oversized exports before building the workbook", async () => {
    mocks.getProjectEstimateTreeByEstimate.mockResolvedValueOnce({
      workspace: { id: "workspace-1" },
      project: {
        id: "project-1",
        name: "Synthetic Hotel Fit-Out Study",
        project_code: "SYN-001",
        location: "Metro City",
        currency_code: "PHP",
      },
      estimate: {
        id: "estimate-1",
        name: "Interior Fit-Out Estimate",
        sheet_code: "EST-001",
        currency_code: "PHP",
        metadata: { versionNumber: 3 },
      },
      selectedNodeId: "area-1",
      tree,
      loadLimitState: {
        maxNodeCount: 1200,
        maxRowItemCount: 3000,
        fetchedNodeCount: 1201,
        fetchedRowItemCount: 3001,
        didExceedNodeLimit: true,
        didExceedRowItemLimit: true,
      },
    });

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: "Estimate is too large to export as XLSX right now.",
      limits: {
        maxNodeCount: 1200,
        maxRowItemCount: 3000,
      },
    });
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
  });

  it("sanitizes workbook filenames for content-disposition", () => {
    expect(buildProposalWorkbookFilename("Synthetic Hotel / Tower?", "EST:001")).toBe(
      "Synthetic-Hotel-Tower-EST-001-proposal.xlsx",
    );
    expect(buildProposalWorkbookFilename("", "")).toBe("estimate-proposal.xlsx");
  });
});
