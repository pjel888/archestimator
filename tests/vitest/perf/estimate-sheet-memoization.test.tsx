import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import {
  setEstimateNodeTotalsProbe,
  setEstimateProposalPreviewSignatureProbe,
  setEstimateSelectedNodePresentationProbe,
  setEstimateSheetBranchRenderProbe,
} from "@/components/workshop/estimate-sheet-render-probe";
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
  deleteEstimateRowItem: vi.fn(),
  fetchEstimateSheetVersionControl: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  insertEstimateTemplateNodeIntoEstimate: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/memo-project/estimates/memo-group",
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

function makeRow(areaIndex: number, rowIndex: number): EstimateRowItem {
  const itemCost = 450;
  return {
    id: `memo-row-${areaIndex + 1}-${rowIndex + 1}`,
    material: `Memo Row A${areaIndex + 1} R${rowIndex + 1}`,
    description: `Memo fixture item ${rowIndex + 1}`,
    supplier: "Memo Fixture",
    source: "library",
    unit: "pc",
    itemCost,
    quantity: 1,
    subTotal: itemCost,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 0,
    totalItemCosts: itemCost,
    category: "Memo",
    pricingSource: "Synthetic memo fixture",
    pricingDate: "2026-06-15",
  };
}

function makeTree(areaCount: number, rowsPerArea: number): EstimateTreeNode[] {
  return [
    {
      id: "memo-group",
      name: "Memo Group",
      kind: "group",
      total: "₱0.00",
      children: Array.from({ length: areaCount }, (_, areaIndex) => ({
        id: `memo-area-${areaIndex + 1}`,
        name: `Memo Area ${areaIndex + 1}`,
        kind: "area" as const,
        total: "₱0.00",
        estimateRowItems: Array.from({ length: rowsPerArea }, (_, rowIndex) => makeRow(areaIndex, rowIndex)),
        children: [],
      })),
    },
  ];
}

function renderSheet() {
  const branchRenderCounts = new Map<string, number>();
  let proposalSignatureComputes = 0;
  let selectedPresentationComputes = 0;
  let nodeTotalsComputes = 0;

  setEstimateSheetBranchRenderProbe((nodeId) => {
    branchRenderCounts.set(nodeId, (branchRenderCounts.get(nodeId) ?? 0) + 1);
  });
  setEstimateProposalPreviewSignatureProbe(() => {
    proposalSignatureComputes += 1;
  });
  setEstimateSelectedNodePresentationProbe(() => {
    selectedPresentationComputes += 1;
  });
  setEstimateNodeTotalsProbe(() => {
    nodeTotalsComputes += 1;
  });

  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId="memo-group"
        nodes={makeTree(3, 3)}
        projectId="memo-project"
        estimateId="memo-estimate"
        canEditEstimate
        renderSidebar={false}
      />
    </QueryClientProvider>,
  );

  return {
    view,
    branchRenderCounts,
    clearCounts: () => {
      branchRenderCounts.clear();
      proposalSignatureComputes = 0;
      selectedPresentationComputes = 0;
      nodeTotalsComputes = 0;
    },
    counts: () => ({
      proposalSignatureComputes,
      selectedPresentationComputes,
      nodeTotalsComputes,
    }),
  };
}

function quantityInput(view: ReturnType<typeof render>, rowId: string) {
  const input = view.container.querySelector<HTMLInputElement>(
    `[data-estimate-row-id="${rowId}"][data-estimate-cell-index="0"]`,
  );
  expect(input).not.toBeNull();
  return input!;
}

describe("estimate sheet memoization (U1-U5)", () => {
  afterEach(() => {
    setEstimateSheetBranchRenderProbe(null);
    setEstimateProposalPreviewSignatureProbe(null);
    setEstimateSelectedNodePresentationProbe(null);
    setEstimateNodeTotalsProbe(null);
    cleanup();
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("keeps proposal signatures and selected-node presentation lazy during ordinary row edits", () => {
    const { view, clearCounts, counts } = renderSheet();
    const input = quantityInput(view, "memo-row-1-1");
    act(() => input.focus());

    clearCounts();
    act(() => {
      fireEvent.change(input, { target: { value: "3" } });
    });

    expect(input.value).toBe("3");
    expect(document.activeElement).toBe(input);
    expect(within(input.closest("tr")!).getAllByText(/1,350\.00/).length).toBeGreaterThan(0);
    expect(counts().proposalSignatureComputes).toBe(0);
    expect(counts().selectedPresentationComputes).toBe(0);
  });

  it("re-renders the edited branch path without waking sibling branches", () => {
    const { view, branchRenderCounts, clearCounts } = renderSheet();
    const input = quantityInput(view, "memo-row-1-1");

    clearCounts();
    act(() => {
      fireEvent.change(input, { target: { value: "4" } });
    });

    expect(within(input.closest("tr")!).getAllByText(/1,800\.00/).length).toBeGreaterThan(0);
    expect(branchRenderCounts.get("memo-group") ?? 0).toBeGreaterThan(0);
    expect(branchRenderCounts.get("memo-area-1") ?? 0).toBeGreaterThan(0);
    expect(branchRenderCounts.get("memo-area-2") ?? 0).toBe(0);
    expect(branchRenderCounts.get("memo-area-3") ?? 0).toBe(0);
  });

  it("updates node totals incrementally while preserving visible totals", () => {
    const { view, clearCounts, counts } = renderSheet();
    const projectTotals: number[] = [];
    const onTotalChange = (event: Event) => projectTotals.push((event as CustomEvent<{ total: number }>).detail.total);
    window.addEventListener("archestimator:project-total-change", onTotalChange);

    try {
      const input = quantityInput(view, "memo-row-2-1");
      clearCounts();
      act(() => {
        fireEvent.change(input, { target: { value: "5" } });
      });

      expect(within(input.closest("tr")!).getAllByText(/2,250\.00/).length).toBeGreaterThan(0);
      expect(projectTotals.at(-1)).toBe(5850);
      expect(counts().nodeTotalsComputes).toBe(0);
    } finally {
      window.removeEventListener("archestimator:project-total-change", onTotalChange);
    }
  });
});
