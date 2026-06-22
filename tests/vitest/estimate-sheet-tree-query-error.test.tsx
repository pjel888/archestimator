import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  deleteEstimateRowItem: vi.fn(),
  detachEstimateRowItemFromLibrary: vi.fn(),
  fetchEstimateTabTree: vi.fn(),
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
const estimateTabs = [
  { id: "tab-1", name: "Default", sortOrder: 0, isDefault: true },
  { id: "tab-2", name: "Alternate", sortOrder: 1, isDefault: false },
];

function renderAlternateTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId={null}
        nodes={[]}
        projectId={projectId}
        estimateId={estimateId}
        estimateTabs={estimateTabs}
        activeTabId="tab-2"
        dataTabId="tab-2"
        initialTabId="tab-1"
        renderSidebar={false}
      />
    </QueryClientProvider>,
  );
}

describe("estimate sheet tree query errors", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
  });

  it("shows a retryable tab-tree error instead of successful empty-tab copy", async () => {
    actionMocks.fetchEstimateTabTree
      .mockRejectedValueOnce(new Error("Tab API down"))
      .mockResolvedValueOnce([]);

    renderAlternateTab();

    const errorPanel = await screen.findByRole("alert");
    expect(errorPanel).toHaveTextContent("Could not load this estimate view");
    expect(errorPanel).toHaveTextContent("Tab API down");
    expect(screen.queryByText("This tab is empty")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(actionMocks.fetchEstimateTabTree).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.queryByText("This tab is empty")).not.toBeInTheDocument();
  });
});
