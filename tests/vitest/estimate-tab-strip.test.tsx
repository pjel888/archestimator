import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ComponentProps } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateTabStrip } from "@/components/workshop/estimate-sheet/EstimateTabStrip";
import { ESTIMATE_TREE_DRAG_MIME_TYPE } from "@/components/workshop/estimate-sheet/drag-types";
import type { EstimateTabSummary } from "@/lib/estimates/types";

const actionMocks = vi.hoisted(() => ({
  archiveEstimateTab: vi.fn(),
  createEstimateTab: vi.fn(),
  deleteEstimateTab: vi.fn(),
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

function tabButton(tabId: string) {
  const element = document.querySelector(`[data-estimate-tab-id="${tabId}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tab button ${tabId}`);
  return element;
}

async function openTabContextMenu(tabId: string) {
  fireEvent.contextMenu(tabButton(tabId), { clientX: 24, clientY: 24 });
  return screen.findByRole("menu");
}

async function chooseTabMenuItem(tabId: string, name: string) {
  await openTabContextMenu(tabId);
  fireEvent.click(screen.getByRole("menuitem", { name }));
}

beforeAll(() => {
  if (!window.PointerEvent) {
    window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("EstimateTabStrip", () => {
  beforeEach(() => {
    actionMocks.createEstimateTab.mockReset();
    actionMocks.archiveEstimateTab.mockReset();
    actionMocks.deleteEstimateTab.mockReset();
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

  it("hides every edit affordance when the lifecycle gate is closed (read-only switcher)", async () => {
    renderStrip({ enableLifecycleActions: false, canCreateTabs: true });

    // No persistent controls — the strip is a pure read-only tab switcher.
    expect(screen.queryByRole("button", { name: "Create tab" })).not.toBeInTheDocument();

    // No context menu attaches: right-click opens nothing.
    fireEvent.contextMenu(tabButton("tab-alt"), { clientX: 24, clientY: 24 });
    await Promise.resolve();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Double-click does not enter inline rename.
    fireEvent.doubleClick(tabButton("tab-alt"));
    expect(screen.queryByRole("textbox", { name: /Rename/ })).not.toBeInTheDocument();
  });

  it("removes the legacy toolbar action buttons even when lifecycle actions are enabled", () => {
    renderStrip({ enableLifecycleActions: true, canCreateTabs: true });

    // The persistent Duplicate / Rename-pencil / Archive / Delete buttons are gone;
    // those actions now live in the right-click context menu (U2).
    expect(screen.queryByRole("button", { name: "Duplicate tab" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rename active tab" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive active tab" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete active tab" })).not.toBeInTheDocument();
    // The "+" remains the only persistent control.
    expect(screen.getByRole("button", { name: "Create tab" })).toBeInTheDocument();
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

  it("rejects cross-tab tree-node drops instead of spring-loading another tab", () => {
    vi.useFakeTimers();
    const { onTabChange } = renderStrip();
    const alternateTab = screen.getByRole("tab", { name: "Alternate" });
    const dataTransfer = { dropEffect: "move", types: [ESTIMATE_TREE_DRAG_MIME_TYPE] };

    fireEvent.dragOver(alternateTab, { dataTransfer });
    act(() => vi.advanceTimersByTime(450));
    expect(onTabChange).not.toHaveBeenCalled();
    expect(dataTransfer.dropEffect).toBe("none");

    fireEvent.drop(alternateTab, { dataTransfer });

    expect(onTabChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Moving between tabs isn't supported yet — duplicate the tab or save the group as a template.");
  });

  it("renames a tab through the context menu and commits on Enter", async () => {
    const renamedTabs = [{ id: "tab-main", name: "Main Revised", sortOrder: 0, isDefault: true }];
    actionMocks.renameEstimateTab.mockResolvedValue({ estimateTabId: "tab-main", tabs: renamedTabs });
    const { onTabsChange } = renderStrip({ enableLifecycleActions: true });

    await chooseTabMenuItem("tab-main", "Rename");
    const input = await screen.findByRole("textbox", { name: "Rename Main tab" });
    fireEvent.change(input, { target: { value: "Main Revised" } });
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
    expect(screen.getByRole("status")).toHaveTextContent("Renamed tab to Main Revised.");
  });

  it("still renames a tab on double-click (regression of the previous rename path)", async () => {
    const renamedTabs = [{ id: "tab-main", name: "Main Revised", sortOrder: 0, isDefault: true }];
    actionMocks.renameEstimateTab.mockResolvedValue({ estimateTabId: "tab-main", tabs: renamedTabs });
    renderStrip({ enableLifecycleActions: true });

    fireEvent.doubleClick(tabButton("tab-main"));
    const input = await screen.findByRole("textbox", { name: "Rename Main tab" });
    fireEvent.change(input, { target: { value: "Main Revised" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(actionMocks.renameEstimateTab).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-main",
        name: "Main Revised",
      });
    });
  });

  it("menu → Rename keeps the input focused with the existing name and does not commit on the menu-close focus event", async () => {
    renderStrip({ enableLifecycleActions: true });

    await chooseTabMenuItem("tab-main", "Rename");
    const input = await screen.findByRole("textbox", { name: "Rename Main tab" });

    // The Radix menu-close focus return must NOT fire an empty/early onBlur commit.
    expect(input).toHaveValue("Main");
    await waitFor(() => expect(input).toHaveFocus());
    expect(actionMocks.renameEstimateTab).not.toHaveBeenCalled();

    // Esc cancels cleanly without committing.
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "Rename Main tab" })).not.toBeInTheDocument();
    expect(actionMocks.renameEstimateTab).not.toHaveBeenCalled();
  });

  it("targets the right-clicked background tab for Rename without force-activating it", async () => {
    const { onTabChange } = renderStrip({ enableLifecycleActions: true });

    await chooseTabMenuItem("tab-alt", "Rename");
    expect(await screen.findByRole("textbox", { name: "Rename Alternate tab" })).toBeInTheDocument();
    // Right-clicking a background tab must not switch to it.
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it("duplicates the right-clicked tab through the context menu and switches to the copy", async () => {
    const duplicatedTabs = [
      { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
      { id: "tab-alt", name: "Alternate", sortOrder: 1, isDefault: false },
      { id: "tab-copy", name: "Alternate copy", sortOrder: 2, isDefault: false },
    ];
    actionMocks.duplicateEstimateTab.mockResolvedValue({ estimateTabId: "tab-copy", tabs: duplicatedTabs });
    const { onTabChange, onTabsChange } = renderStrip({ enableLifecycleActions: true });

    await chooseTabMenuItem("tab-alt", "Duplicate");

    await waitFor(() => {
      expect(actionMocks.duplicateEstimateTab).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-alt",
      });
    });
    expect(onTabsChange).toHaveBeenCalledWith(duplicatedTabs);
    expect(onTabChange).toHaveBeenCalledWith("tab-copy");
  });

  it("deletes the right-clicked background tab and leaves the active tab unchanged", async () => {
    const remainingTabs = [{ id: "tab-main", name: "Main", sortOrder: 0, isDefault: true }];
    actionMocks.deleteEstimateTab.mockResolvedValue({ estimateTabId: "tab-alt", replacementTabId: "tab-main", tabs: remainingTabs });
    const { onTabChange, onTabsChange } = renderStrip({ enableLifecycleActions: true });

    await chooseTabMenuItem("tab-alt", "Delete");

    await waitFor(() => {
      expect(actionMocks.deleteEstimateTab).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-alt",
      });
    });
    expect(onTabsChange).toHaveBeenCalledWith(remainingTabs);
    // Deleting a background tab must not move the active selection.
    expect(onTabChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Alternate tab deleted.");
  });

  it("disables Delete in the context menu when only one tab remains", async () => {
    render(
      <EstimateTabStrip
        tabs={[{ id: "tab-main", name: "Main", sortOrder: 0, isDefault: true }]}
        activeTabId="tab-main"
        projectId="project-1"
        estimateId="estimate-1"
        enableLifecycleActions
        onTabChange={vi.fn()}
        onTabsChange={vi.fn()}
      />,
    );

    await openTabContextMenu("tab-main");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute("data-disabled");
  });

  it("announces keyboard reorder and keeps focus on the moved tab", async () => {
    actionMocks.reorderEstimateTabs.mockResolvedValue({
      estimateTabId: "tab-main",
      tabs: [
        { id: "tab-alt", name: "Alternate", sortOrder: 0, isDefault: false },
        { id: "tab-main", name: "Main", sortOrder: 1, isDefault: true },
      ],
    });
    renderStrip({ enableLifecycleActions: true });

    const mainTab = screen.getByRole("tab", { name: /Main/ });
    mainTab.focus();
    fireEvent.keyDown(mainTab, { key: "ArrowRight", metaKey: true, shiftKey: true });

    await waitFor(() => {
      expect(actionMocks.reorderEstimateTabs).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        updates: [
          { id: "tab-alt", sortOrder: 0 },
          { id: "tab-main", sortOrder: 1 },
        ],
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Main tab moved right.");
    expect(document.activeElement).toBe(mainTab);
  });

  it("focuses the nearest remaining tab after deleting the active tab via the context menu", async () => {
    function Harness() {
      const [tabs, setTabs] = useState(fixtureTabs());
      const [activeTabId, setActiveTabId] = useState("tab-main");
      return (
        <EstimateTabStrip
          tabs={tabs}
          activeTabId={activeTabId}
          projectId="project-1"
          estimateId="estimate-1"
          enableLifecycleActions
          onTabChange={setActiveTabId}
          onTabsChange={setTabs}
        />
      );
    }
    const remainingTabs = [{ id: "tab-alt", name: "Alternate", sortOrder: 0, isDefault: false }];
    actionMocks.deleteEstimateTab.mockResolvedValue({
      estimateTabId: "tab-main",
      replacementTabId: "tab-alt",
      tabs: remainingTabs,
    });
    render(<Harness />);

    await chooseTabMenuItem("tab-main", "Delete");

    await waitFor(() => {
      expect(actionMocks.deleteEstimateTab).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-main",
      });
    });
    const alternateTab = await screen.findByRole("tab", { name: "Alternate" });
    await waitFor(() => expect(document.activeElement).toBe(alternateTab));
    expect(screen.getByRole("status")).toHaveTextContent("Main tab deleted.");
  });
});
