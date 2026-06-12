import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateTabStrip } from "@/components/workshop/estimate-sheet/EstimateTabStrip";
import type { EstimateTabSummary } from "@/lib/estimates/types";

const actionMocks = vi.hoisted(() => ({
  createEstimateTab: vi.fn(),
  duplicateEstimateTab: vi.fn(),
  renameEstimateTab: vi.fn(),
  reorderEstimateTabs: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

function fixtureTabs(): EstimateTabSummary[] {
  return [
    { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
    { id: "tab-alt", name: "Alternate", sortOrder: 1, isDefault: false },
  ];
}

function renderStrip(overrides: Partial<ComponentProps<typeof EstimateTabStrip>> = {}) {
  const onTabChange = vi.fn();
  const onTabsChange = vi.fn();
  render(
    <EstimateTabStrip
      tabs={fixtureTabs()}
      activeTabId="tab-main"
      projectId="project-1"
      estimateId="estimate-1"
      onTabChange={onTabChange}
      onTabsChange={onTabsChange}
      {...overrides}
    />,
  );
  return { onTabChange, onTabsChange };
}

describe("EstimateTabStrip", () => {
  beforeEach(() => {
    actionMocks.createEstimateTab.mockReset();
    actionMocks.duplicateEstimateTab.mockReset();
    actionMocks.renameEstimateTab.mockReset();
    actionMocks.reorderEstimateTabs.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a WAI-ARIA tablist with the active estimate tab", () => {
    renderStrip();

    expect(screen.getByRole("tablist", { name: "Estimate tabs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Main/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Alternate" })).toHaveAttribute("aria-selected", "false");
  });

  it("moves focus with roving keyboard controls and activates on Enter", () => {
    const { onTabChange } = renderStrip();
    const mainTab = screen.getByRole("tab", { name: /Main/ });
    const alternateTab = screen.getByRole("tab", { name: "Alternate" });

    mainTab.focus();
    fireEvent.keyDown(mainTab, { key: "ArrowRight" });
    expect(document.activeElement).toBe(alternateTab);

    fireEvent.keyDown(alternateTab, { key: "Enter" });
    expect(onTabChange).toHaveBeenCalledWith("tab-alt");

    fireEvent.keyDown(alternateTab, { key: "Home" });
    expect(document.activeElement).toBe(mainTab);
  });

  it("keeps create, duplicate, and rename controls hidden until the lifecycle gate opts in", () => {
    renderStrip({ enableLifecycleActions: false, canCreateTabs: true, canDuplicateTabs: true });

    expect(screen.queryByRole("button", { name: "Create tab" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duplicate tab" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rename active tab" })).not.toBeInTheDocument();
  });

  it("spring-loads inactive tabs during drag hover so drops can target another tab tree", () => {
    vi.useFakeTimers();
    const { onTabChange } = renderStrip();
    const alternateTab = screen.getByRole("tab", { name: "Alternate" });

    fireEvent.dragOver(alternateTab, { dataTransfer: { dropEffect: "none", types: ["application/x-archestimator-estimate-template"] } });
    act(() => vi.advanceTimersByTime(449));
    expect(onTabChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));

    expect(onTabChange).toHaveBeenCalledWith("tab-alt");
  });

  it("cancels spring-loaded tab targeting when the drag leaves before the delay", () => {
    vi.useFakeTimers();
    const { onTabChange } = renderStrip();
    const alternateTab = screen.getByRole("tab", { name: "Alternate" });

    fireEvent.dragOver(alternateTab, { dataTransfer: { dropEffect: "none", types: ["application/x-archestimator-estimate-template"] } });
    fireEvent.dragLeave(alternateTab);
    act(() => vi.advanceTimersByTime(450));

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it("renames the active tab only through the gated lifecycle path", async () => {
    const user = userEvent.setup();
    const renamedTabs = [{ id: "tab-main", name: "Main Revised", sortOrder: 0, isDefault: true }];
    actionMocks.renameEstimateTab.mockResolvedValue({ estimateTabId: "tab-main", tabs: renamedTabs });
    const { onTabsChange } = renderStrip({ enableLifecycleActions: true });

    await user.click(screen.getByRole("button", { name: "Rename active tab" }));
    const input = screen.getByRole("textbox", { name: "Rename Main tab" });
    await user.clear(input);
    await user.type(input, "Main Revised");
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(actionMocks.renameEstimateTab).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-main",
        name: "Main Revised",
      });
    });
    expect(onTabsChange).toHaveBeenCalledWith(renamedTabs);
  });
});
