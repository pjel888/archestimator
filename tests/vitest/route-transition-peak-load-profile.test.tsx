import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { ProjectEstimatesTable, type ProjectEstimateTableRow } from "@/components/workshop/ProjectEstimatesTable";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const routerMock = vi.hoisted(() => ({
  prefetch: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  deleteEstimateSheet: vi.fn(),
  deleteEstimateSheetsBulk: vi.fn(),
  duplicateEstimateSheet: vi.fn(),
  fetchEstimateSheetVersionControl: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  regenerateEstimateSheetCode: vi.fn(),
  updateEstimateDetails: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  getEstimateTree: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/perf-project/estimates/perf-area",
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/repositories/estimate-repository", () => ({
  estimateRepository: repositoryMocks,
}));

type ProfileMetric = {
  scenario: string;
  projectCount?: number;
  estimateRowCount?: number;
  initialRenderMs: number;
  renderedElementCount: number;
  virtualizationDecision: "defer-until-browser-profiler-proves-jank";
  memoizationDecision: "defer-broad-memo-until-profiler-proves-re-render-cost";
};

const profileMetrics: ProfileMetric[] = [];
const PEAK_LOAD_PROFILE_SCALE = {
  projectCount: 50,
  estimateRowCount: 200,
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function timedRender(ui: React.ReactElement) {
  const startedAt = performance.now();
  const result = render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
  const initialRenderMs = Math.round((performance.now() - startedAt) * 100) / 100;
  return { ...result, initialRenderMs };
}

function makeEstimate(index: number): ProjectEstimateTableRow {
  const suffix = String(index + 1).padStart(3, "0");
  return {
    created_at: "2026-05-31T00:00:00.000Z",
    created_by: null,
    currency_code: "PHP",
    firstNodeId: `perf-node-${suffix}`,
    id: `perf-estimate-${suffix}`,
    metadata: {},
    name: `Performance Estimate ${suffix}`,
    nodeCount: 8,
    notes: `Synthetic profile estimate ${suffix}`,
    project_budget: 1_000_000 + index * 10_000,
    project_id: "perf-project",
    rowItemCount: 200,
    sheet_code: `PERF-${suffix}`,
    totalProjectCost: 250_000 + index * 1_000,
    updated_at: "2026-05-31T00:00:00.000Z",
  };
}

function makeRow(index: number): EstimateRowItem {
  const quantity = 1 + (index % 8);
  const itemCost = 450 + (index % 24) * 35;
  const miscCost = index % 5 === 0 ? 120 : 0;
  const subTotal = quantity * itemCost;
  return {
    id: `perf-row-${String(index + 1).padStart(3, "0")}`,
    material: `Performance Row ${String(index + 1).padStart(3, "0")}`,
    description: `Synthetic 200-row profile item ${index + 1}`,
    supplier: "Performance Fixture",
    source: "library",
    unit: index % 3 === 0 ? "lot" : index % 3 === 1 ? "sqm" : "pc",
    itemCost,
    quantity,
    subTotal,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost,
    totalItemCosts: subTotal + miscCost,
    category: "Performance",
    pricingSource: "Synthetic local profile fixture",
    pricingDate: "2026-05-31",
  };
}

function makeEstimateTree(rowCount: number): EstimateTreeNode[] {
  return [
    {
      id: "perf-group",
      name: "Performance Group",
      kind: "group",
      total: "₱0.00",
      children: [
        {
          id: "perf-area",
          name: "Performance Area",
          kind: "area",
          total: "₱0.00",
          estimateRowItems: Array.from({ length: rowCount }, (_, index) => makeRow(index)),
          children: [],
        },
      ],
    },
  ];
}

function recordMetric(metric: ProfileMetric) {
  profileMetrics.push(metric);
  console.log("route-transition-peak-load-profile", JSON.stringify(metric));
}

function writeProfileOutput() {
  const outputPath = process.env.ROUTE_PERF_PROFILE_OUTPUT;
  if (!outputPath) return;

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      note: "Local jsdom render profile for route-transition Phase 6. This is not a production Chrome profiler trace.",
      metrics: profileMetrics,
    }, null, 2)}\n`,
    "utf8",
  );
}

describe("route transition peak-load profile", () => {
  afterEach(() => {
    writeProfileOutput();
    cleanup();
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    profileMetrics.length = 0;
    window.localStorage.clear();
  });

  it("profiles 50 project estimates and 200 estimate rows without adding broad memoization or virtualization", async () => {
    actionMocks.fetchEstimateTree.mockResolvedValue(makeEstimateTree(200));
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({ events: [], nextCursor: null, totalCount: 0 });
    repositoryMocks.getEstimateTree.mockResolvedValue(null);

    const projectProfile = timedRender(
      <ProjectEstimatesTable
        estimates={Array.from({ length: PEAK_LOAD_PROFILE_SCALE.projectCount }, (_, index) => makeEstimate(index))}
        projectId="perf-project"
      />,
    );

    const openLinks = screen.getAllByLabelText(/^Open Performance Estimate/);
    recordMetric({
      scenario: "project-estimates-table",
      projectCount: PEAK_LOAD_PROFILE_SCALE.projectCount,
      initialRenderMs: projectProfile.initialRenderMs,
      renderedElementCount: openLinks.length,
      virtualizationDecision: "defer-until-browser-profiler-proves-jank",
      memoizationDecision: "defer-broad-memo-until-profiler-proves-re-render-cost",
    });
    expect(openLinks).toHaveLength(PEAK_LOAD_PROFILE_SCALE.projectCount);
    expect(projectProfile.initialRenderMs).toBeLessThan(10_000);

    cleanup();
    resetEstimateWorkspaceState();

    const estimateProfile = timedRender(
      <EstimateSheetContent
        selectedNodeId="perf-area"
        nodes={makeEstimateTree(PEAK_LOAD_PROFILE_SCALE.estimateRowCount)}
        projectId="perf-project"
        estimateId="perf-estimate"
        renderSidebar={false}
      />,
    );

    const rowSelectors = estimateProfile.container.querySelectorAll('input[aria-label^="Select Performance Row "]');
    recordMetric({
      scenario: "estimate-sheet-content",
      estimateRowCount: PEAK_LOAD_PROFILE_SCALE.estimateRowCount,
      initialRenderMs: estimateProfile.initialRenderMs,
      renderedElementCount: rowSelectors.length,
      virtualizationDecision: "defer-until-browser-profiler-proves-jank",
      memoizationDecision: "defer-broad-memo-until-profiler-proves-re-render-cost",
    });
    expect(rowSelectors).toHaveLength(PEAK_LOAD_PROFILE_SCALE.estimateRowCount);
    expect(estimateProfile.initialRenderMs).toBeLessThan(10_000);
  }, 30_000);
});
