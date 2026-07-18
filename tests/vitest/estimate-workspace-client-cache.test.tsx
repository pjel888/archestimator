import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateWorkspaceClient } from "@/components/workshop/EstimateWorkspaceClient";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import type { EstimateTabSummary } from "@/lib/estimates/types";

// Capture the onEstimateTabsChange the workspace client wires into the (heavy,
// dynamically imported) sheet content, so we can exercise the cache reconciliation
// directly without rendering the whole editor.
const captured: { onEstimateTabsChange?: (tabs: EstimateTabSummary[]) => void } = {};
const fetchEstimateTabs = vi.fn();
const fetchEstimateEditCapability = vi.fn();

vi.mock("@/components/workshop/EstimateSheetTree", () => ({ EstimateSheetTree: () => null }));
vi.mock("@/components/workshop/EstimateSheetContent", () => ({
  EstimateSheetContent: (props: { onEstimateTabsChange?: (tabs: EstimateTabSummary[]) => void }) => {
    captured.onEstimateTabsChange = props.onEstimateTabsChange;
    return null;
  },
}));
vi.mock("@/lib/estimates/actions", () => ({
  fetchEstimateEditCapability: (...args: unknown[]) => fetchEstimateEditCapability(...args),
  fetchEstimateTabs: (...args: unknown[]) => fetchEstimateTabs(...args),
  fetchEstimateTabTree: vi.fn(),
  fetchEstimateTree: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
}));

const INITIAL_TABS: EstimateTabSummary[] = [{ id: "tab-main", name: "Main", sortOrder: 0, isDefault: true }];

function renderClient(queryClient: QueryClient, canEditEstimate = true) {
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateWorkspaceClient
        projectId="project-1"
        estimateId="estimate-1"
        projectName="Demo project"
        selectedNodeId={null}
        nodes={[]}
        estimateTabs={INITIAL_TABS}
        activeTabId="tab-main"
        canEditEstimate={canEditEstimate}
      />
    </QueryClientProvider>,
  );
}

describe("EstimateWorkspaceClient tab-cache reconciliation", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    captured.onEstimateTabsChange = undefined;
    fetchEstimateEditCapability.mockReset();
    fetchEstimateEditCapability.mockResolvedValue(true);
    fetchEstimateTabs.mockReset();
    fetchEstimateTabs.mockResolvedValue(INITIAL_TABS);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets the tabs query cache from the returned array on create — a single round-trip, no refetch (U4 / R10)", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderClient(queryClient);

    // The workspace client wires onEstimateTabsChange into the sheet content.
    await waitFor(() => expect(typeof captured.onEstimateTabsChange).toBe("function"));
    // SSR-seeded initialData is fresh (5-min staleTime), so no fetch fires on mount.
    fetchEstimateTabs.mockClear();

    const created: EstimateTabSummary[] = [
      ...INITIAL_TABS,
      { id: "tab-2", name: "Tab 2", sortOrder: 1, isDefault: false },
    ];
    act(() => {
      captured.onEstimateTabsChange?.(created);
    });

    // The cache reflects the action's canonical array verbatim…
    expect(queryClient.getQueryData(estimateQueryKeys.tabs("estimate-1"))).toEqual(created);
    // …and no second network round-trip (refetch) was issued.
    expect(fetchEstimateTabs).not.toHaveBeenCalled();
  });

  it("renders a below-desktop fallback notice for the estimate workspace without adding a dead tab stop", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderClient(queryClient);

    const notice = screen.getByRole("note", { name: "Desktop workspace notice" });

    expect(notice).toHaveClass("lg:hidden");
    expect(notice).not.toHaveAttribute("tabindex");
    expect(notice).toHaveTextContent("Estimate editing works best on a desktop-width screen.");
    expect(notice).toHaveTextContent("Side panels open as compact drawers on this width; use a wider display for full three-panel editing.");
  });

  it("keeps a server-authoritative read-only capability without refetching on mount", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderClient(queryClient, false);

    await waitFor(() => expect(typeof captured.onEstimateTabsChange).toBe("function"));
    expect(queryClient.getQueryData(estimateQueryKeys.editCapability("estimate-1"))).toBe(false);
    expect(fetchEstimateEditCapability).not.toHaveBeenCalled();
  });
});
