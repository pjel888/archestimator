import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import {
  ActivityHistoryModal,
  RowDetailsModal,
} from "@/components/workshop/estimate-sheet/activity-history";
import { DEFAULT_ACTIVITY_FILTERS, type FlattenedEstimateRow } from "@/components/workshop/estimate-sheet/activity-history-model";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";

const actionMocks = vi.hoisted(() => ({
  fetchEstimateSheetVersionControl: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

const projectId = "22222222-2222-4222-8222-222222222222";
const estimateId = "77777777-7777-4777-8777-777777777719";
const rowId = "66666666-6666-4666-8666-666666666671";

const rowItem: EstimateRowItem = {
  id: rowId,
  material: "Custom Built-in Cabinet",
  description: "Detached cabinet snapshot",
  supplier: "Local millwork shop",
  source: "project",
  unit: "lm",
  itemCost: 1500,
  quantity: 2,
  subTotal: 3000,
  contingencyPercentage: 5,
  contingencyValue: 150,
  miscCost: 250,
  totalItemCosts: 3400,
  rowRevision: 7,
  category: "Cabinetry",
  pricingSource: "Estimate row snapshot",
  pricingDate: "2026-06-15",
  sourceLibraryItemId: null,
  linkState: "detached",
  discipline: "Architectural",
  designation: "CAB-01",
};

const rowDetails: FlattenedEstimateRow = {
  item: rowItem,
  nodeId: "55555555-5555-4555-8555-555555555561",
  nodePath: ["Kitchen"],
  quantity: 2,
  contingencyPercentage: 5,
  contingencyValue: 150,
  miscCost: 250,
  lineTotal: 3400,
};

beforeEach(() => {
  vi.clearAllMocks();
  actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
    rowEvents: [],
    rowNextCursor: null,
  });
});

function renderModal({
  onActivityFiltersChange = vi.fn(),
  onClose = vi.fn(),
}: {
  onActivityFiltersChange?: ReturnType<typeof vi.fn>;
  onClose?: ReturnType<typeof vi.fn>;
} = {}) {
  render(
    <ActivityHistoryModal
      scope={{ mode: "sheet" }}
      scopeItems={[]}
      selectedScopeItem={null}
      metadata={null}
      historyData={null}
      activityFilters={DEFAULT_ACTIVITY_FILTERS}
      isHistoryLoading={false}
      isHistoryLoadingMore={false}
      historyError=""
      onActivityFiltersChange={onActivityFiltersChange}
      onActivityFiltersReset={vi.fn()}
      onClose={onClose}
      onRetry={vi.fn()}
      onLoadMore={vi.fn()}
      onScopeSelect={vi.fn()}
    />,
  );
  return { onActivityFiltersChange, onClose };
}

function openEventTypeListbox() {
  fireEvent.click(screen.getByRole("button", { name: "Filter activity" }));
  const combobox = screen.getByRole("combobox", { name: "Filter activity by event type" });
  fireEvent.click(combobox);
  return combobox;
}

describe("activity history modal filters", () => {
  it("filters by event type through the shared dropdown select", () => {
    const { onActivityFiltersChange } = renderModal();

    openEventTypeListbox();
    const listbox = screen.getByRole("listbox");
    expect(listbox.parentElement).toBe(document.body);

    fireEvent.click(screen.getByRole("option", { name: "Templates" }));

    expect(onActivityFiltersChange).toHaveBeenCalledWith({
      ...DEFAULT_ACTIVITY_FILTERS,
      eventType: "template_inserted",
    });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes only the listbox on Escape before the modal sees the key press", () => {
    const { onClose } = renderModal();

    openEventTypeListbox();
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Activity History" })).toBeInTheDocument();
  });

  it("keeps the modal open when a backdrop gesture dismisses the listbox", () => {
    const { onClose } = renderModal();

    openEventTypeListbox();
    const backdrop = screen.getByRole("dialog", { name: "Activity History" });

    // The dismissing gesture: pointerdown closes the listbox; the same
    // gesture's mousedown is suppressed so the backdrop must not close.
    fireEvent.pointerDown(backdrop);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.mouseDown(backdrop);
    expect(onClose).not.toHaveBeenCalled();

    // A later, separate backdrop gesture still closes the modal.
    fireEvent.pointerDown(backdrop);
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("row details activity", () => {
  it("loads row activity through the row details Activity tab", async () => {
    render(
      <RowDetailsModal
        row={rowDetails}
        tab="activity"
        projectId={projectId}
        estimateId={estimateId}
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Row item details" });
    await waitFor(() => expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenCalledWith(expect.objectContaining({
      estimateId,
      eventLimit: 50,
      projectId,
      rowId,
      scope: "row",
    })));

    expect(await within(dialog).findByText("No row activity yet")).toBeInTheDocument();
  });
});
