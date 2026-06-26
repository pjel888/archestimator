import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { estimateQueryKeys, useEstimateTabsQuery } from "@/hooks/use-estimate-query";
import type { EstimateTabSummary } from "@/lib/estimates/types";

const actionMocks = vi.hoisted(() => ({
  fetchEstimateEditCapability: vi.fn(),
  fetchEstimateTabs: vi.fn(),
  fetchEstimateTabTree: vi.fn(),
  fetchEstimateTree: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

const INITIAL_TABS_A: EstimateTabSummary[] = [
  { id: "tab-a", name: "Architecture", sortOrder: 0, isDefault: true },
];

const INITIAL_TABS_B: EstimateTabSummary[] = [
  { id: "tab-b", name: "Interiors", sortOrder: 0, isDefault: true },
];

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function QueryHarness({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function TabsProbe({
  projectId = "project-1",
  estimateId,
  initialTabs,
}: {
  projectId?: string;
  estimateId: string;
  initialTabs: EstimateTabSummary[];
}) {
  const query = useEstimateTabsQuery({ projectId, estimateId, initialTabs });

  return (
    <>
      <output data-testid="tab-names">{query.tabs.map((tab) => tab.name).join(",")}</output>
      <output data-testid="tab-count">{query.tabs.length}</output>
      <output data-testid="status">{query.status}</output>
      <output data-testid="is-error">{String(query.isError)}</output>
    </>
  );
}

describe("estimate query cache hydration", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses server-seeded tabs without an immediate duplicate fetch", async () => {
    actionMocks.fetchEstimateTabs.mockResolvedValue(INITIAL_TABS_A);
    const queryClient = makeQueryClient();

    render(
      <QueryHarness queryClient={queryClient}>
        <TabsProbe estimateId="estimate-a" initialTabs={INITIAL_TABS_A} />
      </QueryHarness>,
    );

    expect(screen.getByTestId("tab-names")).toHaveTextContent("Architecture");
    expect(queryClient.getQueryData(estimateQueryKeys.tabs("estimate-a"))).toEqual(INITIAL_TABS_A);
    await waitFor(() => {
      expect(actionMocks.fetchEstimateTabs).not.toHaveBeenCalled();
    });
  });

  it("keeps hydrated tab caches scoped by estimate id", async () => {
    const queryClient = makeQueryClient();
    const { rerender } = render(
      <QueryHarness queryClient={queryClient}>
        <TabsProbe estimateId="estimate-a" initialTabs={INITIAL_TABS_A} />
      </QueryHarness>,
    );

    rerender(
      <QueryHarness queryClient={queryClient}>
        <TabsProbe estimateId="estimate-b" initialTabs={INITIAL_TABS_B} />
      </QueryHarness>,
    );

    expect(screen.getByTestId("tab-names")).toHaveTextContent("Interiors");
    expect(queryClient.getQueryData(estimateQueryKeys.tabs("estimate-a"))).toEqual(INITIAL_TABS_A);
    expect(queryClient.getQueryData(estimateQueryKeys.tabs("estimate-b"))).toEqual(INITIAL_TABS_B);
    await waitFor(() => {
      expect(actionMocks.fetchEstimateTabs).not.toHaveBeenCalled();
    });
  });

  it("treats an empty server-seeded tab list as a successful empty state", async () => {
    const queryClient = makeQueryClient();

    render(
      <QueryHarness queryClient={queryClient}>
        <TabsProbe estimateId="estimate-empty" initialTabs={[]} />
      </QueryHarness>,
    );

    expect(screen.getByTestId("tab-count")).toHaveTextContent("0");
    expect(screen.getByTestId("status")).toHaveTextContent("success");
    expect(screen.getByTestId("is-error")).toHaveTextContent("false");
    expect(queryClient.getQueryData(estimateQueryKeys.tabs("estimate-empty"))).toEqual([]);
    await waitFor(() => {
      expect(actionMocks.fetchEstimateTabs).not.toHaveBeenCalled();
    });
  });
});
