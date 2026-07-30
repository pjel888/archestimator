import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetTree } from "@/components/workshop/EstimateSheetTree";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import {
  clearEstimateTreeTotals,
  getEstimateTreeTotalsCompleteness,
  publishEstimateTreeTotals,
} from "@/lib/estimates/estimate-tree-totals-store";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  fetchEstimateTabTree: vi.fn(),
  fetchEstimateTree: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  useParams: () => ({ projectId: "project-1", nodeId: "nested-area" }),
  useRouter: () => routerMock,
}));
vi.mock("@/lib/estimates/actions", () => actionMocks);

const nodes: EstimateTreeNode[] = [{
  id: "main-area",
  name: "Main Area",
  kind: "group",
  total: "server-total-must-not-render",
  children: [{
    id: "nested-area",
    name: "Nested Area",
    kind: "area",
    total: "server-total-must-not-render",
    estimateRowItems: [],
  }],
}];

function renderTree() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetTree
        projectId="project-1"
        estimateId="estimate-1"
        projectName="Subtotal Test"
        selectedNodeId="nested-area"
        nodes={nodes}
      />
    </QueryClientProvider>,
  );
}

describe("estimate tree live subtotal UI", () => {
  beforeEach(() => {
    clearEstimateTreeTotals("estimate-1");
    resetEstimateWorkspaceState();
    actionMocks.fetchEstimateTree.mockResolvedValue(nodes);
  });

  it("renders recursive main-area and child amounts from the live snapshot with accessible names", () => {
    publishEstimateTreeTotals({
      estimateId: "estimate-1",
      currencyCode: "PHP",
      nodeTotals: new Map([
        ["main-area", 575],
        ["nested-area", 25],
      ]),
      projectTotal: 575,
      dataState: "ready",
      mutationState: "authoritative",
      completeness: getEstimateTreeTotalsCompleteness(nodes),
      revision: 1,
    });

    renderTree();

    expect(screen.getByLabelText(/Main Area subtotal, PHP\s*575\.00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nested Area subtotal, PHP\s*25\.00/i)).toBeInTheDocument();
    expect(screen.queryByText("server-total-must-not-render")).not.toBeInTheDocument();
  });

  it("keeps stale partial retained values visibly qualified and announces only the transition", () => {
    publishEstimateTreeTotals({
      estimateId: "estimate-1",
      currencyCode: "USD",
      nodeTotals: new Map([
        ["main-area", 575],
        ["nested-area", 25],
      ]),
      projectTotal: 575,
      dataState: "stale-error",
      mutationState: "rejected-retained",
      completeness: {
        nodes: "partial",
        rows: "partial",
        reasons: ["subarea-not-loaded", "rows-not-loaded"],
      },
      safeErrorCode: "tree-update-failed",
      revision: 2,
    });

    renderTree();

    const subtotal = screen.getByLabelText(
      /Main Area subtotal, USD\s*575\.00, stale after update error, partial, unsaved after rejection/i,
    );
    expect(subtotal).toHaveTextContent(/stale after update error/i);
    expect(subtotal).toHaveTextContent(/partial/i);
    expect(subtotal).toHaveTextContent(/unsaved after rejection/i);
    expect(screen.getByText("Subtotal changes were rejected and remain unsaved.")).toHaveAttribute("aria-live", "polite");
    expect(subtotal).not.toHaveAttribute("aria-live");
  });

  it("shows loading and unavailable states without a precise amount", () => {
    renderTree();
    expect(screen.getByLabelText("Main Area subtotal. Loading subtotal.")).not.toHaveTextContent(/\d/);

    act(() => {
      clearEstimateTreeTotals("estimate-1");
      publishEstimateTreeTotals({
        estimateId: "estimate-1",
        currencyCode: null,
        nodeTotals: new Map([["main-area", 575]]),
        projectTotal: 575,
        dataState: "ready",
        mutationState: "authoritative",
        completeness: getEstimateTreeTotalsCompleteness(nodes),
        revision: 1,
      });
    });

    expect(screen.getByLabelText("Main Area subtotal. Subtotal unavailable.")).not.toHaveTextContent("575");
  });
});
