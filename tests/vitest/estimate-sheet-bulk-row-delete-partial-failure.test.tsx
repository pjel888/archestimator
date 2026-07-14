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
  deleteEstimateRowItemsBulk: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  moveEstimateRowComponentWithHistory: vi.fn(),
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
          canEditEstimate
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
    vi.stubEnv("NEXT_PUBLIC_TEAMSPACE_REALTIME_TRANSPORT", "off");
    actionMocks.deleteEstimateRowItemsBulk.mockRejectedValue(new Error("bulk delete failed"));
    actionMocks.restoreDeletedEstimateRows.mockResolvedValue({
      eventId: "restore-event-1",
      sourceEventId: "delete-event-1",
      restoredRowIds: [cabinetRowId, sinkRowId],
      restoredRowCount: 2,
      restoredRows: [],
    });
  });

  afterEach(() => {
    cleanup();
    resetEstimateWorkspaceState();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("restores every selected row when the atomic bulk delete fails", async () => {
    renderSheet([cabinetRow, sinkRow]);
    const user = await selectRowsInOrder(["Kitchen Cabinet", "Kitchen Sink"]);

    const deleteSelectedButton = screen.getByRole("button", { name: "Delete selected rows" });
    expect(deleteSelectedButton).toHaveAttribute(
      "title",
      "Deletes selected rows immediately. Use Undo after saving to restore them.",
    );
    await user.click(deleteSelectedButton);

    await waitFor(() => {
      expect(actionMocks.deleteEstimateRowItemsBulk).toHaveBeenCalledTimes(1);
    });
    await screen.findByText("Couldn't delete the selected rows. Try again.");

    expect(actionMocks.deleteEstimateRowItem).not.toHaveBeenCalled();
    expect(actionMocks.deleteEstimateRowItemsBulk).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      estimateId,
      rowIds: [cabinetRowId, sinkRowId],
    }));
    expect(screen.getByText("Kitchen Cabinet")).toBeInTheDocument();
    expect(screen.getByText("Kitchen Sink")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /undo/i })).not.toBeInTheDocument();
  });

  it("removes all selected rows only after the bulk delete RPC succeeds", async () => {
    actionMocks.deleteEstimateRowItemsBulk.mockResolvedValue({ eventId: "bulk-delete-event-1", deletedRowIds: [cabinetRowId, sinkRowId], deletedRowCount: 2 });
    renderSheet([cabinetRow, sinkRow]);
    const user = await selectRowsInOrder(["Kitchen Cabinet", "Kitchen Sink"]);

    await user.click(screen.getByRole("button", { name: "Delete selected rows" }));

    await waitFor(() => {
      expect(actionMocks.deleteEstimateRowItemsBulk).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Kitchen Cabinet")).not.toBeInTheDocument();
    expect(screen.queryByText("Kitchen Sink")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(actionMocks.restoreDeletedEstimateRows).toHaveBeenCalledWith(expect.objectContaining({
        projectId,
        estimateId,
        sourceEventId: "bulk-delete-event-1",
        rowIds: [cabinetRowId, sinkRowId],
      }));
    });
    expect(screen.getByText("Kitchen Cabinet")).toBeInTheDocument();
    expect(screen.getByText("Kitchen Sink")).toBeInTheDocument();
  });

  it("offers post-success undo for a single deleted row", async () => {
    actionMocks.deleteEstimateRowItem.mockResolvedValue({ eventId: "delete-event-1", deletedRowId: cabinetRowId, deletedRow: {} });
    actionMocks.restoreDeletedEstimateRows.mockResolvedValue({
      eventId: "restore-event-1",
      sourceEventId: "delete-event-1",
      restoredRowIds: [cabinetRowId],
      restoredRowCount: 1,
      restoredRows: [],
    });
    renderSheet([cabinetRow]);
    const user = userEvent.setup();

    const deleteRowButton = screen.getByRole("button", { name: "Delete row Kitchen Cabinet" });
    await user.click(deleteRowButton);

    await waitFor(() => {
      expect(actionMocks.deleteEstimateRowItem).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Kitchen Cabinet")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => {
      expect(actionMocks.restoreDeletedEstimateRows).toHaveBeenCalledWith(expect.objectContaining({
        projectId,
        estimateId,
        sourceEventId: "delete-event-1",
        rowIds: [cabinetRowId],
      }));
    });
    expect(screen.getByText("Kitchen Cabinet")).toBeInTheDocument();
  });

  it("restores a single deleted row automatically when the delete save fails", async () => {
    actionMocks.deleteEstimateRowItem.mockRejectedValue(new Error("single delete failed"));
    renderSheet([cabinetRow]);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete row Kitchen Cabinet" }));

    await screen.findByText("Couldn't delete the row. Try again.");
    expect(screen.getByText("Kitchen Cabinet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /undo/i })).not.toBeInTheDocument();
  });
});
