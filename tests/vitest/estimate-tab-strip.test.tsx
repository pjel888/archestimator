import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState, type ComponentProps } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateTabStrip, type EstimateTabStripHandle } from "@/components/workshop/estimate-sheet/EstimateTabStrip";
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
  const result = render(
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
  return { onTabChange, onTabsChange, container: result.container };
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
  // jsdom does not implement scrollIntoView; stub it so the strip's scroll-into-view
  // calls are no-ops here (and spy-able in the U5 tests).
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
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
    expect(screen.getByRole("tab", { name: "Page 001" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Alternate" })).toHaveAttribute("aria-selected", "false");
  });

  it("renders estimate tabs through the shared Tabs primitive without default copy", () => {
    const { container } = renderStrip({ enableLifecycleActions: true, canCreateTabs: true });

    const tabRoot = container.querySelector("[data-navigation-tabs]");
    expect(tabRoot).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Page 001" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Alternate" })).toBeInTheDocument();
    expect(screen.queryByText("Default")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Main/ })).not.toBeInTheDocument();
    // C3/Req 13: "New tab" button has been relocated to the middle-panel header
    // toolbar — it is no longer rendered inside the tab strip (or its tablist).
    expect(screen.queryByRole("button", { name: "New tab" })).not.toBeInTheDocument();
  });

  it("matches the sidebar tab group surface and height contract", () => {
    const { container } = renderStrip({ enableLifecycleActions: true, canCreateTabs: true });

    expect(container.querySelector("[data-estimate-tab-strip]")).toHaveClass("bg-white");
    expect(container.querySelector("[data-estimate-tab-strip-row]")).toHaveClass("min-h-10");
    expect(screen.getByRole("tab", { name: "Page 001" })).toHaveClass("min-h-10", "border-brand-orange", "text-ink");
    expect(screen.getByRole("tab", { name: "Alternate" })).toHaveClass("min-h-10", "border-transparent", "text-secondary");
    expect(screen.getByRole("tab", { name: "Alternate" })).not.toHaveClass("text-ink");
  });

  it("uses Page 001 for only the first rendered tab after reorder", () => {
    renderStrip({
      tabs: [
        { id: "tab-alt", name: "Alternate", sortOrder: 0, isDefault: false },
        { id: "tab-main", name: "Main", sortOrder: 1, isDefault: true },
      ],
      activeTabId: "tab-alt",
    });

    expect(screen.getByRole("tab", { name: "Page 001" })).toHaveAttribute("data-estimate-tab-id", "tab-alt");
    expect(screen.getByRole("tab", { name: "Main" })).toHaveAttribute("data-estimate-tab-id", "tab-main");
    expect(screen.getAllByText("Page 001")).toHaveLength(1);
  });

  it("moves focus with roving keyboard controls and activates on Enter", () => {
    const { onTabChange } = renderStrip();
    const mainTab = screen.getByRole("tab", { name: "Page 001" });
    const alternateTab = screen.getByRole("tab", { name: "Alternate" });

    mainTab.focus();
    fireEvent.keyDown(mainTab, { key: "ArrowRight" });
    expect(document.activeElement).toBe(alternateTab);
    expect(onTabChange).not.toHaveBeenCalled();

    fireEvent.keyDown(alternateTab, { key: "Enter" });
    expect(onTabChange).toHaveBeenCalledWith("tab-alt");

    fireEvent.keyDown(alternateTab, { key: "Home" });
    expect(document.activeElement).toBe(mainTab);
  });

  it("hides every edit affordance when the lifecycle gate is closed (read-only switcher)", async () => {
    renderStrip({ enableLifecycleActions: false, canCreateTabs: true });

    // No persistent controls — the strip is a pure read-only tab switcher.
    // The "New tab" button lives in the parent header, not the strip, so it is
    // also absent here (the strip renders no button of its own).
    expect(screen.queryByRole("button", { name: "New tab" })).not.toBeInTheDocument();

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
    // C3/Req 13: "New tab" has moved to the middle-panel header; the strip itself
    // renders no persistent create button.
    expect(screen.queryByRole("button", { name: "New tab" })).not.toBeInTheDocument();
  });

  it("creates a tab through the header button (via ref), updates the list from the returned array, switches to it, and arms inline rename", async () => {
    const createdTabs = [
      { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
      { id: "tab-alt", name: "Alternate", sortOrder: 1, isDefault: false },
      { id: "tab-3", name: "Tab 3", sortOrder: 2, isDefault: false },
    ];
    actionMocks.createEstimateTab.mockResolvedValue({ estimateTabId: "tab-3", tabs: createdTabs });
    const switchedTo: string[] = [];
    // C3/Req 13: "New tab" now lives in the middle-panel header outside the strip.
    // This harness simulates that wiring: the parent holds the ref and exposes a
    // header button that calls ref.current.createTab() imperatively.
    function CreateHarness() {
      const [tabs, setTabs] = useState(fixtureTabs());
      const [activeTabId, setActiveTabId] = useState("tab-main");
      const [createState, setCreateState] = useState({ canCreate: false, pending: false });
      const stripRef = useRef<EstimateTabStripHandle | null>(null);
      return (
        <>
          {createState.canCreate && (
            <button
              type="button"
              aria-label="New tab"
              disabled={createState.pending}
              onClick={() => void stripRef.current?.createTab()}
            >
              New tab
            </button>
          )}
          <EstimateTabStrip
            ref={stripRef}
            tabs={tabs}
            activeTabId={activeTabId}
            projectId="project-1"
            estimateId="estimate-1"
            enableLifecycleActions
            canCreateTabs
            onTabChange={(id) => { switchedTo.push(id); setActiveTabId(id); }}
            onTabsChange={setTabs}
            onCreateTabStateChange={setCreateState}
          />
        </>
      );
    }
    render(<CreateHarness />);

    fireEvent.click(screen.getByRole("button", { name: "New tab" }));

    await waitFor(() => {
      // Auto-named from the returned list; the action is the single round-trip.
      expect(actionMocks.createEstimateTab).toHaveBeenCalledWith({ projectId: "project-1", estimateId: "estimate-1", name: "Page 003" });
    });
    // The list updates from the returned array and the new tab arms inline rename
    // (the input only renders if "tab-3" was added to the rendered list).
    expect(await screen.findByRole("textbox", { name: "Rename Tab 3 tab" })).toBeInTheDocument();
    expect(switchedTo).toContain("tab-3");
    expect(actionMocks.createEstimateTab).toHaveBeenCalledTimes(1);
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
    const input = await screen.findByRole("textbox", { name: "Rename Page 001 tab" });
    fireEvent.change(input, { target: { value: "Main Revised" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(actionMocks.renameEstimateTab).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        tabId: "tab-main",
        name: "Main Revised",
      });
    });
    expect(actionMocks.renameEstimateTab).toHaveBeenCalledTimes(1);
    expect(onTabsChange).toHaveBeenCalledWith(renamedTabs);
    expect(screen.getByRole("status")).toHaveTextContent("Renamed tab to Main Revised.");
  });

  it("keeps rename geometry fixed, places the caret at the end, and cancels without pointer-exit save", async () => {
    renderStrip({ enableLifecycleActions: true });
    const tab = screen.getByRole("tab", { name: "Page 001" });
    const label = tab.querySelector<HTMLElement>("[data-estimate-tab-label]");
    if (!label) throw new Error("Missing tab label");
    vi.spyOn(label, "getBoundingClientRect").mockReturnValue({
      bottom: 10,
      height: 10,
      left: 0,
      right: 64,
      top: 0,
      width: 64,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const tabClassName = tab.className;

    fireEvent.doubleClick(tab);
    const input = await screen.findByRole("textbox", { name: "Rename Page 001 tab" });

    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveStyle({ width: "64px" });
    expect(input).not.toHaveAttribute("size");
    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);

    fireEvent.change(input, { target: { value: "A much longer tab name" } });
    fireEvent.pointerLeave(tab);

    expect(input).toHaveStyle({ width: "64px" });
    expect(tabButton("tab-main")).toBe(tab);
    expect(tab).toHaveClass("border-brand-orange", "text-ink");
    expect(tab.className).toBe(tabClassName);
    expect(actionMocks.renameEstimateTab).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("textbox", { name: "Rename Page 001 tab" })).not.toBeInTheDocument();
    await waitFor(() => expect(tab).toHaveFocus());
    expect(actionMocks.renameEstimateTab).not.toHaveBeenCalled();
  });

  it("still renames a tab on double-click (regression of the previous rename path)", async () => {
    const renamedTabs = [{ id: "tab-main", name: "Main Revised", sortOrder: 0, isDefault: true }];
    actionMocks.renameEstimateTab.mockResolvedValue({ estimateTabId: "tab-main", tabs: renamedTabs });
    renderStrip({ enableLifecycleActions: true });

    fireEvent.doubleClick(tabButton("tab-main"));
    const input = await screen.findByRole("textbox", { name: "Rename Page 001 tab" });
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

  it("menu → Rename ignores the transient menu-close blur and never commits prematurely", async () => {
    renderStrip({ enableLifecycleActions: true });

    await chooseTabMenuItem("tab-main", "Rename");
    const input = screen.getByRole("textbox", { name: "Rename Page 001 tab" });
    expect(input).toHaveValue("Main");

    // Mutation-killing assertion: we are inside the suppression window (the rename
    // guard refs are armed and the menu-close focus timeouts have not fired yet).
    // A transient blur on the UNCHANGED name must be swallowed by the onBlur guard
    // so the editor stays mounted and nothing commits. Removing the guard unmounts
    // the editor here (commitRename's unchanged-name early return clears editing).
    fireEvent.blur(input);
    expect(screen.getByRole("textbox", { name: "Rename Page 001 tab" })).toBeInTheDocument();
    expect(actionMocks.renameEstimateTab).not.toHaveBeenCalled();

    // Focus settles back on the input after the menu-close dance; still no commit.
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Rename Page 001 tab" })).toHaveFocus());
    expect(actionMocks.renameEstimateTab).not.toHaveBeenCalled();

    // Esc cancels cleanly without committing.
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Rename Page 001 tab" }), { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "Rename Page 001 tab" })).not.toBeInTheDocument();
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

    const mainTab = screen.getByRole("tab", { name: "Page 001" });
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

  it("switches to and focuses the replacement tab after deleting the active tab via the context menu", async () => {
    const switchedTo: string[] = [];
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
          onTabChange={(id) => { switchedTo.push(id); setActiveTabId(id); }}
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
    // Active selection moves to the replacement (the load-bearing browser semantic)…
    await waitFor(() => expect(switchedTo).toContain("tab-alt"));
    // …and focus follows it.
    const alternateTab = await screen.findByRole("tab", { name: "Page 001" });
    await waitFor(() => expect(document.activeElement).toBe(alternateTab));
    expect(screen.getByRole("status")).toHaveTextContent("Main tab deleted.");
  });

  it("reports canCreate=true via onCreateTabStateChange when canCreateTabs is enabled (button lives in header, not strip)", () => {
    // C3/Req 13: the "New tab" button has moved to the middle-panel header toolbar.
    // The strip itself never renders it, but signals readiness via onCreateTabStateChange
    // so the parent header can render (and pin) the button outside the tab list.
    const manyTabs = Array.from({ length: 12 }, (_, index) => ({
      id: `tab-${index}`,
      name: `Tab ${index + 1}`,
      sortOrder: index,
      isDefault: index === 0,
    }));
    const stateChanges: Array<{ canCreate: boolean; pending: boolean }> = [];
    render(
      <EstimateTabStrip
        tabs={manyTabs}
        activeTabId="tab-0"
        projectId="project-1"
        estimateId="estimate-1"
        enableLifecycleActions
        canCreateTabs
        onTabChange={vi.fn()}
        onTabsChange={vi.fn()}
        onCreateTabStateChange={(s) => stateChanges.push(s)}
      />,
    );
    const tablist = screen.getByRole("tablist", { name: "Estimate tabs" });
    // The strip has no "New tab" button of its own.
    expect(screen.queryByRole("button", { name: "New tab" })).not.toBeInTheDocument();
    // The strip reported canCreate=true so the parent can render the header button.
    expect(stateChanges.some((s) => s.canCreate)).toBe(true);
    // The tablist is still present and functional.
    expect(tablist).toBeInTheDocument();
  });

  it("scrolls the active tab into view (smoothly) when the active tab changes", async () => {
    const spy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    try {
      function ActivateHarness() {
        const [activeTabId, setActiveTabId] = useState("tab-main");
        return (
          <EstimateTabStrip
            tabs={fixtureTabs()}
            activeTabId={activeTabId}
            projectId="project-1"
            estimateId="estimate-1"
            enableLifecycleActions
            onTabChange={setActiveTabId}
            onTabsChange={vi.fn()}
          />
        );
      }
      render(<ActivateHarness />);
      spy.mockClear();
      fireEvent.click(screen.getByRole("tab", { name: "Alternate" }));
      await waitFor(() => expect(spy).toHaveBeenCalled());
      const usedSmooth = spy.mock.calls.some(([options]) => (options as { behavior?: string } | undefined)?.behavior === "smooth");
      expect(usedSmooth).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it("uses instant (non-smooth) scroll when prefers-reduced-motion is set", async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    const spy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    try {
      function ReducedHarness() {
        const [activeTabId, setActiveTabId] = useState("tab-main");
        return (
          <EstimateTabStrip
            tabs={fixtureTabs()}
            activeTabId={activeTabId}
            projectId="project-1"
            estimateId="estimate-1"
            enableLifecycleActions
            onTabChange={setActiveTabId}
            onTabsChange={vi.fn()}
          />
        );
      }
      render(<ReducedHarness />);
      spy.mockClear();
      fireEvent.click(screen.getByRole("tab", { name: "Alternate" }));
      await waitFor(() => expect(spy).toHaveBeenCalled());
      const everyInstant = spy.mock.calls.every(([options]) => (options as { behavior?: string } | undefined)?.behavior === "auto");
      expect(everyInstant).toBe(true);
    } finally {
      window.matchMedia = originalMatchMedia;
      spy.mockRestore();
    }
  });

  it("reports canCreate=false and does not render a New tab button when canCreateTabs is false", () => {
    // C3/Req 13: non-editors must see no New tab affordance anywhere. Since the strip
    // now signals state via onCreateTabStateChange, verify it reports canCreate=false
    // when canCreateTabs is not set, so the parent header renders nothing.
    const stateChanges: Array<{ canCreate: boolean; pending: boolean }> = [];
    renderStrip({
      enableLifecycleActions: true,
      canCreateTabs: false,
      onCreateTabStateChange: (s) => stateChanges.push(s),
    });
    expect(screen.queryByRole("button", { name: "New tab" })).not.toBeInTheDocument();
    expect(stateChanges.every((s) => !s.canCreate)).toBe(true);
  });
});
