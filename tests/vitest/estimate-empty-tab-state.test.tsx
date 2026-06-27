import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT } from "@/components/workshop/estimate-sheet/events";

beforeAll(() => {
  if (!window.PointerEvent) window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function scrollIntoView() {};
});

// A freshly "+"-created tab resolves a real tab id with zero nodes. Omitting
// projectId leaves the per-tab tree query disabled, so the editor settles
// straight onto the empty-tab state instead of a loading skeleton.
function renderEmptyTab(overrides: Partial<ComponentProps<typeof EstimateSheetContent>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId={null}
        nodes={[]}
        estimateId="estimate-1"
        estimateTabs={[
          { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
          { id: "tab-new", name: "Tab 2", sortOrder: 1, isDefault: false },
        ]}
        activeTabId="tab-new"
        dataTabId="tab-new"
        renderSidebar={false}
        {...overrides}
      />
    </QueryClientProvider>,
  );
}

describe("new-tab empty shell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an actionable empty tab shell for editors", () => {
    renderEmptyTab({ canEditEstimate: true });

    expect(screen.getByRole("heading", { name: "This tab is empty" })).toBeInTheDocument();
    expect(screen.getByText("Add an Area to start, or drag a template or project content here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Area" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse templates" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Branch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Group" })).not.toBeInTheDocument();
  });

  it("routes the center Add Area action through the shared tree create event", () => {
    const listener = vi.fn();
    window.addEventListener(REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, listener);

    try {
      renderEmptyTab({ canEditEstimate: true });

      expect(screen.getByRole("region", { name: "Estimate tab content" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Add Area" }));

      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ kind: "group" });
      expect(screen.queryByRole("button", { name: "Add Branch" })).not.toBeInTheDocument();
    } finally {
      window.removeEventListener(REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, listener);
    }
  });

  it("hides edit actions for viewers (canEditEstimate=false / omitted)", () => {
    renderEmptyTab({ canEditEstimate: false });

    expect(screen.getByRole("heading", { name: "This tab is empty" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Area" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Branch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Group" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Browse templates" })).not.toBeInTheDocument();
  });

  it("defaults to read-only empty shell actions when canEditEstimate is omitted", () => {
    renderEmptyTab();

    expect(screen.getByRole("heading", { name: "This tab is empty" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Area" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Branch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Group" })).not.toBeInTheDocument();
  });
});
