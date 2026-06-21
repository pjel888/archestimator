import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/toast";
import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  deleteEstimateRowItem: vi.fn(),
  detachEstimateRowItemFromLibrary: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

const promotionMocks = vi.hoisted(() => ({
  promoteEstimateRowToLibraryComponent: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/estimates/express-promotion-actions", () => promotionMocks);

const projectId = "22222222-2222-4222-8222-222222222222";
const estimateId = "77777777-7777-4777-8777-777777777719";
const targetNodeId = "55555555-5555-4555-8555-555555555561";
const cabinetRowId = "66666666-6666-4666-8666-666666666661";
const sinkRowId = "66666666-6666-4666-8666-666666666662";

const cabinetRow: EstimateRowItem = {
  id: cabinetRowId,
  material: "Kitchen Cabinet",
  description: "Base cabinet",
  supplier: "Local supplier",
  source: "project",
  unit: "lm",
  itemCost: 100,
  quantity: 2,
  subTotal: 200,
  contingencyPercentage: 0,
  contingencyValue: 0,
  miscCost: 10,
  totalItemCosts: 210,
  rowRevision: 7,
  category: "Cabinetry",
  pricingSource: "Estimate row snapshot",
  pricingDate: "2026-05-22",
};

const sinkRow: EstimateRowItem = {
  id: sinkRowId,
  material: "Kitchen Sink",
  description: "Single bowl sink",
  supplier: "Local supplier",
  source: "project",
  unit: "pc",
  itemCost: 250,
  quantity: 1,
  subTotal: 250,
  contingencyPercentage: 0,
  contingencyValue: 0,
  miscCost: 0,
  totalItemCosts: 250,
  rowRevision: 3,
  category: "Plumbing Fixtures",
  pricingSource: "Estimate row snapshot",
  pricingDate: "2026-05-22",
};

function estimateTreeWithRows(rows: EstimateRowItem[]): EstimateTreeNode[] {
  return [
    {
      id: targetNodeId,
      name: "Kitchen",
      kind: "area",
      total: "PHP 0.00",
      estimateRowItems: rows,
      children: [],
    },
  ];
}

function renderSheet(rows: EstimateRowItem[]) {
  const nodes = estimateTreeWithRows(rows);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  actionMocks.fetchEstimateTree.mockResolvedValue(nodes);

  return render(
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <EstimateSheetContent
          selectedNodeId={targetNodeId}
          nodes={nodes}
          projectId={projectId}
          estimateId={estimateId}
          renderSidebar={false}
        />
      </QueryClientProvider>
    </ToastProvider>,
  );
}

async function selectRowsInOrder(rowNames: string[]) {
  const user = userEvent.setup();
  for (const rowName of rowNames) {
    await user.click(screen.getByRole("checkbox", { name: `Select ${rowName}` }));
  }
  return user;
}

describe("estimate sheet bulk row delete partial failures", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    actionMocks.deleteEstimateRowItem.mockImplementation(async ({ rowId }: { rowId: string }) => {
      if (rowId === sinkRowId) throw new Error("delete failed for sink");
      return undefined;
    });
  });

  afterEach(() => {
    cleanup();
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
  });

  it("keeps successful row deletes removed and restores only the failed row", async () => {
    renderSheet([cabinetRow, sinkRow]);
    const user = await selectRowsInOrder(["Kitchen Cabinet", "Kitchen Sink"]);

    await user.click(screen.getByRole("button", { name: "Delete selected rows" }));

    await waitFor(() => {
      expect(actionMocks.deleteEstimateRowItem).toHaveBeenCalledTimes(2);
    });
    await screen.findByText("Couldn't delete the row. Try again.");

    expect(screen.queryByText("Kitchen Cabinet")).not.toBeInTheDocument();
    expect(screen.getByText("Kitchen Sink")).toBeInTheDocument();
  });

  it("restores a failed first selection without rolling back a later successful delete", async () => {
    actionMocks.deleteEstimateRowItem.mockImplementation(async ({ rowId }: { rowId: string }) => {
      if (rowId === cabinetRowId) throw new Error("delete failed for cabinet");
      return undefined;
    });

    renderSheet([cabinetRow, sinkRow]);
    const user = await selectRowsInOrder(["Kitchen Cabinet", "Kitchen Sink"]);

    await user.click(screen.getByRole("button", { name: "Delete selected rows" }));

    await waitFor(() => {
      expect(actionMocks.deleteEstimateRowItem).toHaveBeenCalledTimes(2);
    });
    await screen.findByText("Couldn't delete the row. Try again.");

    expect(screen.getByText("Kitchen Cabinet")).toBeInTheDocument();
    expect(screen.queryByText("Kitchen Sink")).not.toBeInTheDocument();
  });
});
