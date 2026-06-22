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

  it("renders the normal empty tab shell for editors", () => {
    renderEmptyTab({ canEditEstimate: true });

    expect(screen.queryByRole("heading", { name: "This tab is empty" })).not.toBeInTheDocument();
    expect(screen.queryByText("Add an Area to start, or drag a template or project content here.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Branch" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Group" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Browse templates" })).not.toBeInTheDocument();
  });

  it("Add Branch from the empty tree requests a write-valid root create in the active (new) tab", () => {
    const createRequests: Array<{ kind?: string }> = [];
    const handler = (event: Event) => createRequests.push((event as CustomEvent<{ kind?: string }>).detail);
    window.addEventListener(REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, handler);
    try {
      renderEmptyTab({ canEditEstimate: true });
      fireEvent.click(screen.getByRole("button", { name: "Add Branch" }));
      // Root create stays write-valid (internal kind "group"); the tree's event
      // handler routes it through the single Add Branch flow.
      expect(createRequests).toEqual([{ kind: "group" }]);
    } finally {
      window.removeEventListener(REQUEST_ESTIMATE_TREE_NODE_CREATE_EVENT, handler);
    }
  });

  it("hides edit actions for viewers (canEditEstimate=false / omitted)", () => {
    renderEmptyTab({ canEditEstimate: false });

    expect(screen.queryByRole("heading", { name: "This tab is empty" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Branch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Group" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Browse templates" })).not.toBeInTheDocument();
  });

  it("defaults to read-only empty shell actions when canEditEstimate is omitted", () => {
    renderEmptyTab();

    expect(screen.queryByRole("heading", { name: "This tab is empty" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Branch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Group" })).not.toBeInTheDocument();
  });
});
