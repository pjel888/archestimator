import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import {
  ActivityHistoryModal,
  DEFAULT_ACTIVITY_FILTERS,
} from "@/components/workshop/estimate-sheet/activity-history";

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

  it("closes only the listbox on Escape; the modal has no Escape close to trigger", () => {
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
    const backdrop = screen.getByRole("dialog", { name: "Activity History" }).parentElement as HTMLElement;

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
