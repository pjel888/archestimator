import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EstimateTreeNode } from "@/lib/estimates/types";

const mocks = vi.hoisted(() => ({
  getProjectEstimateTreeByEstimate: vi.fn(),
  getEstimateTabs: vi.fn(),
  getEstimateTabTree: vi.fn(),
  getEstimateTreesForTabs: vi.fn(),
  createProposalWorkbookBuffer: vi.fn(),
  getCurrentUserContext: vi.fn(),
  checkProposalExportRateLimit: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getCurrentUserTermsAcceptanceStatus: vi.fn(),
}));

const baseProjectEstimate = {
  workspace: { id: "workspace-1", name: "BuildCo Workspace" },
  project: { id: "project-1", name: "Synthetic Hotel Fit-Out Study", project_code: "SYN-001", location: "Metro City", currency_code: "PHP", client_name: "Acme Developers Inc." },
  estimate: { id: "estimate-1", name: "Interior Fit-Out Estimate", sheet_code: "EST-001", currency_code: "PHP", metadata: { versionNumber: 3 } },
};

// Chainable Supabase mock for the workspace_members membership lookup (audience gate).
function membershipClient(role: string | null) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({ data: role ? { role } : null }),
  };
  return { from: vi.fn(() => builder) };
}

vi.mock("@/lib/repositories/workspace-repository", () => ({
  getProjectEstimateTreeByEstimate: mocks.getProjectEstimateTreeByEstimate,
  getEstimateTabs: mocks.getEstimateTabs,
  getEstimateTabTree: mocks.getEstimateTabTree,
  getEstimateTreesForTabs: mocks.getEstimateTreesForTabs,
}));

vi.mock("@/lib/proposal-export/create-proposal-workbook", () => ({
  createProposalWorkbookBuffer: mocks.createProposalWorkbookBuffer,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: mocks.getCurrentUserContext,
}));

vi.mock("@/lib/legal/terms-acceptance", () => ({
  getCurrentUserTermsAcceptanceStatus: mocks.getCurrentUserTermsAcceptanceStatus,
}));

vi.mock("@/lib/publication/public-repository", () => ({
  checkProposalExportRateLimit: mocks.checkProposalExportRateLimit,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

const authedContext = {
  userId: "user-1",
  email: "owner@example.com",
  role: "member",
  profile: { id: "user-1", role: "member" },
  displayName: "Owner",
  avatarUrl: null,
};

import { GET, maxDuration } from "@/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route";
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

function tabRequest(tabId: string) {
  return new Request(`http://localhost/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx?tab=${tabId}`);
}

describe("proposal xlsx export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserContext.mockResolvedValue(authedContext);
    mocks.checkProposalExportRateLimit.mockResolvedValue({ allowed: true });
    mocks.getCurrentUserTermsAcceptanceStatus.mockResolvedValue({ requiresAcceptance: false });
    mocks.createSupabaseServerClient.mockResolvedValue(membershipClient(null));
    mocks.createProposalWorkbookBuffer.mockResolvedValue(Buffer.from("xlsx-bytes"));
    mocks.getEstimateTabs.mockResolvedValue([]);
    mocks.getProjectEstimateTreeByEstimate.mockResolvedValue({
      workspace: { id: "workspace-1", name: "BuildCo Workspace" },
      project: {
        id: "project-1",
        name: "Synthetic Hotel Fit-Out Study",
        project_code: "SYN-001",
        location: "Metro City",
        currency_code: "PHP",
        client_name: "Acme Developers Inc.",
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
    mocks.getEstimateTabTree.mockResolvedValue({
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
      tab: { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
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
          // P2-T4: Owner/Client (DB-free) + contractor interim (workspace name) + subject.
          clientName: "Acme Developers Inc.",
          contractorName: "BuildCo Workspace",
          subject: "BID FORM — Interior Fit-Out Estimate",
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

  it("fails closed with a 401 JSON body when no authenticated user context is present", async () => {
    mocks.getCurrentUserContext.mockResolvedValueOnce(null);

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
    expect(mocks.getEstimateTabs).not.toHaveBeenCalled();
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
  });

  it("requires current Terms acceptance before exporting proposal data", async () => {
    mocks.getCurrentUserTermsAcceptanceStatus.mockResolvedValueOnce({ requiresAcceptance: true });

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Current Terms acceptance is required before using protected workshop APIs.",
    });
    expect(mocks.checkProposalExportRateLimit).not.toHaveBeenCalled();
    expect(mocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
  });

  it("returns a logged JSON 500 when the Terms acceptance lookup fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getCurrentUserTermsAcceptanceStatus.mockRejectedValueOnce(
      new Error("legal_terms_acceptances unavailable"),
    );

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to generate the spreadsheet export. Please try again.",
    });
    expect(mocks.checkProposalExportRateLimit).not.toHaveBeenCalled();
    expect(mocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ route: "proposal_export", outcome: "error" }),
    );
    errorSpy.mockRestore();
  });

  it("returns a clean 429 JSON when the per-user export rate limit is exceeded", async () => {
    mocks.checkProposalExportRateLimit.mockResolvedValueOnce({
      allowed: false,
      message: "Too many attempts. Please wait 60 seconds.",
      retryAfter: 60,
    });

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({
      error: "Too many attempts. Please wait 60 seconds.",
      retryAfter: 60,
    });
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
  });

  it("rejects out-of-band VAT/contingency rates with a 400 (no silent clamp)", async () => {
    const response = await GET(
      new Request("http://localhost/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx?vatRate=200"),
      { params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }) },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/vatRate/);
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
  });

  it("plumbs validated export settings into the model", async () => {
    await GET(
      new Request("http://localhost/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx?contingencyRate=5&vatRate=8&includeFormulas=false"),
      { params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }) },
    );

    expect(mocks.createProposalWorkbookBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({ contingencyRate: 5, vatRate: 8, includeFormulas: false, audience: "client" }),
      }),
    );
  });

  it("ignores a client-supplied audience=internal for a non-member (no Source Breakdown exfiltration)", async () => {
    mocks.createSupabaseServerClient.mockResolvedValueOnce(membershipClient(null)); // not a workspace member

    await GET(
      new Request("http://localhost/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx?audience=internal"),
      { params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }) },
    );

    expect(mocks.createProposalWorkbookBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ settings: expect.objectContaining({ audience: "client" }) }),
    );
  });

  it("grants audience=internal only to a workspace member (server-derived)", async () => {
    mocks.createSupabaseServerClient.mockResolvedValueOnce(membershipClient("owner"));

    await GET(
      new Request("http://localhost/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx?audience=internal"),
      { params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }) },
    );

    expect(mocks.createProposalWorkbookBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ settings: expect.objectContaining({ audience: "internal" }) }),
    );
  });

  it("exports a requested active tab in the legacy four-sheet workbook shape", async () => {
    const response = await GET(tabRequest("tab-main"), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(mocks.getEstimateTabTree).toHaveBeenCalledWith(
      "project-1",
      "estimate-1",
      "tab-main",
      expect.objectContaining({
        maxNodeCount: expect.any(Number),
        maxRowItemCount: expect.any(Number),
      }),
    );
    expect(mocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
    expect(mocks.createProposalWorkbookBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ estimateSheetCode: "EST-001" }),
        totals: expect.objectContaining({ grandTotal: 11_900 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("SYN-001-EST-001-Main-proposal.xlsx");
  });

  it("exports all active tabs by default via the batched de-dup fetch (P2-T7)", async () => {
    mocks.getEstimateTabs.mockResolvedValueOnce([
      { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
      { id: "tab-alt", name: "Alt / Scope", sortOrder: 10, isDefault: false },
    ]);
    mocks.getEstimateTreesForTabs.mockResolvedValueOnce({
      ...baseProjectEstimate,
      tabs: [
        { tab: { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true }, tree },
        { tab: { id: "tab-alt", name: "Alt / Scope", sortOrder: 10, isDefault: false }, tree },
      ],
      loadLimitState: { maxNodeCount: 1200, maxRowItemCount: 3000, fetchedNodeCount: 2, fetchedRowItemCount: 2, didExceedNodeLimit: false, didExceedRowItemLimit: false },
    });

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    // One batched fetch instead of a per-tab fan-out.
    expect(mocks.getEstimateTreesForTabs).toHaveBeenCalledTimes(1);
    expect(mocks.getEstimateTabTree).not.toHaveBeenCalled();
    expect(mocks.getProjectEstimateTreeByEstimate).not.toHaveBeenCalled();
    expect(mocks.createProposalWorkbookBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        tabs: [
          expect.objectContaining({ tabId: "tab-main", tabName: "Main", worksheetName: "Main" }),
          expect.objectContaining({ tabId: "tab-alt", tabName: "Alt / Scope", worksheetName: "Alt Scope" }),
        ],
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("SYN-001-EST-001-proposal.xlsx");
  });

  it("rejects all-tabs exports above the tab cap before fetching workbook trees", async () => {
    mocks.getEstimateTabs.mockResolvedValueOnce(
      Array.from({ length: 51 }, (_, index) => ({
        id: `tab-${index}`,
        name: `Tab ${index}`,
        sortOrder: index,
        isDefault: index === 0,
      })),
    );

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      limits: expect.objectContaining({ maxTabCount: 50 }),
    });
    expect(mocks.getEstimateTreesForTabs).not.toHaveBeenCalled();
    expect(mocks.getEstimateTabTree).not.toHaveBeenCalled();
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
  });

  it("rejects an oversized all-tabs export early via the batched over-fetch guard (P2-T7, F-24)", async () => {
    mocks.getEstimateTabs.mockResolvedValueOnce([
      { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
      { id: "tab-alt", name: "Alt / Scope", sortOrder: 10, isDefault: false },
    ]);
    mocks.getEstimateTreesForTabs.mockResolvedValueOnce({
      ...baseProjectEstimate,
      tabs: [{ tab: { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true }, tree }],
      loadLimitState: { maxNodeCount: 1200, maxRowItemCount: 3000, fetchedNodeCount: 1201, fetchedRowItemCount: 3001, didExceedNodeLimit: true, didExceedRowItemLimit: true },
    });

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(413);
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
  });

  it("returns a logged JSON 500 (not a stack page) when workbook generation throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createProposalWorkbookBuffer.mockRejectedValueOnce(new Error("ExcelJS exploded"));

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toContain("ExcelJS exploded");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ route: "proposal_export", outcome: "error" }),
    );
    errorSpy.mockRestore();
  });

  it("includes a tab with no exportable rows in the all-tabs export (P2-T7)", async () => {
    mocks.getEstimateTabs.mockResolvedValueOnce([
      { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
      { id: "tab-empty", name: "Empty", sortOrder: 10, isDefault: false },
    ]);
    mocks.getEstimateTreesForTabs.mockResolvedValueOnce({
      ...baseProjectEstimate,
      tabs: [
        { tab: { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true }, tree },
        { tab: { id: "tab-empty", name: "Empty", sortOrder: 10, isDefault: false }, tree: [] },
      ],
      loadLimitState: { maxNodeCount: 1200, maxRowItemCount: 3000, fetchedNodeCount: 1, fetchedRowItemCount: 1, didExceedNodeLimit: false, didExceedRowItemLimit: false },
    });

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.createProposalWorkbookBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        tabs: [expect.objectContaining({ tabId: "tab-main" }), expect.objectContaining({ tabId: "tab-empty" })],
      }),
    );
  });

  it("returns a logged JSON 500 when the batched all-tabs fetch fails (P2-T7)", async () => {
    mocks.getEstimateTabs.mockResolvedValueOnce([
      { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
      { id: "tab-alt", name: "Alt", sortOrder: 10, isDefault: false },
    ]);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getEstimateTreesForTabs.mockRejectedValueOnce(new Error("batched fetch failed"));

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(500);
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns 404 when an explicit tab is unknown or archived", async () => {
    mocks.getEstimateTabTree.mockResolvedValueOnce({
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
      tab: null,
      selectedNodeId: null,
      tree: [],
    });

    const response = await GET(tabRequest("archived-tab"), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Estimate not found." });
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
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
        maxTabCount: 50,
      },
    });
    expect(mocks.createProposalWorkbookBuffer).not.toHaveBeenCalled();
  });

  it("returns 400 (not 500) for a malformed identifier via the Postgres 22P02 error (P2-T8, F-33)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getProjectEstimateTreeByEstimate.mockRejectedValueOnce({ code: "22P02", message: "invalid input syntax for type uuid" });

    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/identifier/i);
    errorSpy.mockRestore();
  });

  it("declares an explicit serverless maxDuration (P3-T5, F-34)", () => {
    expect(typeof maxDuration).toBe("number");
    expect(maxDuration).toBeGreaterThan(0);
  });

  it("sets X-Content-Type-Options nosniff on the download (P2-T8, F-33)", async () => {
    const response = await GET(request(), {
      params: Promise.resolve({ projectId: "project-1", estimateId: "estimate-1" }),
    });

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("sanitizes workbook filenames for content-disposition", () => {
    expect(buildProposalWorkbookFilename("Synthetic Hotel / Tower?", "EST:001")).toBe(
      "Synthetic-Hotel-Tower-EST-001-proposal.xlsx",
    );
    expect(buildProposalWorkbookFilename("Synthetic Hotel / Tower?", "EST:001", "Main Tab")).toBe(
      "Synthetic-Hotel-Tower-EST-001-Main-Tab-proposal.xlsx",
    );
    expect(buildProposalWorkbookFilename("", "")).toBe("estimate-proposal.xlsx");
  });
});
