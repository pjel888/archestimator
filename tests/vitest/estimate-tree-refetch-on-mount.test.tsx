/**
 * Regression guard: estimate-tree data freshness.
 *
 * BACKGROUND
 * A perf change set the two server-seeded estimate tree query hooks in
 * `src/hooks/use-estimate-query.ts` to stale-aware mount refetching
 * (`useEstimateAreaTreeQuery` and `useEstimateTabTreeQuery`). The client therefore
 * keeps freshly server-seeded data without a duplicate request, then refetches
 * stale cache entries on revisit. Freshness also depends on:
 *   (a) the route re-supplying fresh server-rendered `nodes` props on every
 *       navigation, which `EstimateSheetTree` reconciles into the TanStack Query
 *       cache via `syncLocalNodesFromProps`, and
 *   (b) optimistic mutations writing directly to the cache.
 *
 * RISK GUARDED
 * A future change to `refetchOnMount`, or to the prop-sync reconciliation, could
 * re-introduce stale tree state after a mutate -> navigate-away -> navigate-back
 * flow (where the seeded `initialData` snapshot would otherwise win and never be
 * refreshed because no refetch fires on mount).
 *
 * WHAT THIS FILE PROVES
 *  1. PRIMARY — prop-sync reconciliation: when `EstimateSheetTree` receives a NEW
 *     `nodes` prop (simulating fresh server-rendered props after navigating back
 *     to the route), the rendered tree reflects the NEW nodes, NOT the stale
 *     seeded snapshot that initialised the query cache. This is the mechanism
 *     that compensates for `refetchOnMount: false`.
 *  2. SECONDARY — config guard: both tree hooks pass `refetchOnMount: true` with
 *     a short stale window so revisits cannot indefinitely retain old cache data.
 *
 * WHAT THIS FILE DOES NOT PROVE
 *  - It does NOT exercise a full real-router mutate -> navigate-away ->
 *    navigate-back integration flow with Next.js RSC re-rendering. The PRIMARY
 *    test simulates "fresh server props on navigation" by re-rendering the
 *    component with a new `nodes` prop, which is exactly what the route does, but
 *    it stops short of driving the actual Next router.
 *  - It does NOT assert that a server fetch fires or does not fire on mount in a
 *    live network sense; #2 inspects the query OPTIONS rather than observing
 *    network behaviour over time.
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useEstimateAreaTreeQuery,
  useEstimateTabTreeQuery,
} from "@/hooks/use-estimate-query";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { ToastProvider } from "@/components/ui/toast";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

// ---------------------------------------------------------------------------
// Mocks (mirror estimate-tree-filter.test.tsx / estimate-tree-modal.test.tsx)
// ---------------------------------------------------------------------------

const actionMocks = vi.hoisted(() => ({
  createEstimateNode: vi.fn(),
  deleteEstimateNode: vi.fn(),
  fetchEstimateEditCapability: vi.fn(),
  fetchEstimateTree: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  fetchEstimateTabTree: vi.fn(),
  fetchEstimateTabs: vi.fn(),
  renameEstimateNode: vi.fn(),
  reorderEstimateTreeNodes: vi.fn(),
}));

// ESM-safe interception of useQuery: vi.spyOn can't redefine an ESM namespace
// export, so we mock the module and forward to the real implementation while
// (when armed) recording the options each call receives. Capture is OFF by
// default so the PRIMARY render tests behave exactly like production.
const reactQueryCapture = vi.hoisted(() => ({
  armed: false,
  options: [] as Array<Record<string, unknown>>,
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQuery: (options: Parameters<typeof actual.useQuery>[0]) => {
      if (reactQueryCapture.armed) {
        reactQueryCapture.options.push(options as unknown as Record<string, unknown>);
      }
      return actual.useQuery(options);
    },
  };
});

vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
  useParams: () => ({ projectId: "project-1", nodeId: "estimate-1" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

// ---------------------------------------------------------------------------
// Fixtures: a "seeded" tree (initial server props) and a "fresh" tree
// (the props the route would re-supply after navigating back to it).
// getEstimateTreeContentSignature only hashes id/kind/name/total/row-items, so
// changing a name is enough to make the signatures differ and trigger a sync.
// ---------------------------------------------------------------------------

const SEEDED_TREE: EstimateTreeNode[] = [
  { id: "area-1", name: "Seeded Foundations", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
];

const FRESH_TREE: EstimateTreeNode[] = [
  { id: "area-1", name: "Fresh Foundations", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
  { id: "area-2", name: "Fresh Roofing", kind: "area", total: "₱0.00", estimateRowItems: [], children: [] },
];

// ---------------------------------------------------------------------------
// PRIMARY: prop-sync reconciliation through the real component
// ---------------------------------------------------------------------------

// EstimateSheetTree is heavy; import lazily so the action mock above is in place.
async function renderSheetTree(nodes: EstimateTreeNode[]) {
  const { EstimateSheetTree } = await import("@/components/workshop/EstimateSheetTree");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Tree({ nodes: treeNodes }: { nodes: EstimateTreeNode[] }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <EstimateSheetTree
            projectId="project-1"
            estimateId="estimate-1"
            projectName="Test Project"
            selectedNodeId="area-1"
            nodes={treeNodes}
          />
        </ToastProvider>
      </QueryClientProvider>
    );
  }

  const view = render(<Tree nodes={nodes} />);
  return { ...view, queryClient, Tree };
}

describe("estimate tree freshness — prop-sync reconciliation (PRIMARY)", () => {
  beforeEach(() => {
    resetEstimateWorkspaceState();
    for (const fn of Object.values(actionMocks)) fn.mockReset();
    // initialData is fresh (5-min staleTime) + refetchOnMount:false, so the
    // queryFn must NOT need to run for the seeded data to render. Stub anyway so
    // an accidental fetch resolves rather than throwing.
    actionMocks.fetchEstimateTree.mockResolvedValue(SEEDED_TREE);
    actionMocks.fetchEstimateTabTree.mockResolvedValue({ tree: [], loadLimitState: undefined });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the seeded nodes from initialData without a mount refetch", async () => {
    await renderSheetTree(SEEDED_TREE);

    expect(await screen.findByText("Seeded Foundations")).toBeInTheDocument();
    // No mount refetch fired: the seeded initialData is treated as fresh.
    expect(actionMocks.fetchEstimateTree).not.toHaveBeenCalled();
  });

  it("reflects NEW server-supplied nodes when the prop changes (navigate-back freshness)", async () => {
    const { rerender, Tree } = await renderSheetTree(SEEDED_TREE);

    expect(await screen.findByText("Seeded Foundations")).toBeInTheDocument();

    // Simulate the route re-supplying fresh server-rendered props (what happens
    // on navigate-back). With refetchOnMount:false this is the ONLY thing that
    // keeps the tree fresh — syncLocalNodesFromProps must reconcile it into the
    // cache.
    act(() => {
      rerender(<Tree nodes={FRESH_TREE} />);
    });

    // The tree must now show the fresh nodes, not the stale seeded snapshot.
    await waitFor(() => {
      expect(screen.getByText("Fresh Foundations")).toBeInTheDocument();
      expect(screen.getByText("Fresh Roofing")).toBeInTheDocument();
    });
    expect(screen.queryByText("Seeded Foundations")).not.toBeInTheDocument();

    // Reconciliation happens via prop-sync, not via a network refetch.
    expect(actionMocks.fetchEstimateTree).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SECONDARY: config guard — assert both tree hooks pass refetchOnMount:false
// to useQuery. Done by spying on @tanstack/react-query's useQuery and capturing
// the options object the hook hands it.
// ---------------------------------------------------------------------------

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("estimate tree freshness — hook config guard (SECONDARY)", () => {
  beforeEach(() => {
    reactQueryCapture.armed = true;
    reactQueryCapture.options.length = 0;
    actionMocks.fetchEstimateTree.mockResolvedValue(SEEDED_TREE);
    actionMocks.fetchEstimateTabTree.mockResolvedValue({ tree: [], loadLimitState: undefined });
  });

  afterEach(() => {
    reactQueryCapture.armed = false;
    reactQueryCapture.options.length = 0;
    vi.clearAllMocks();
  });

  it("useEstimateAreaTreeQuery configures stale-aware mount refetching", async () => {
    const { renderHook } = await import("@testing-library/react");

    renderHook(
      () =>
        useEstimateAreaTreeQuery({
          projectId: "project-1",
          estimateId: "estimate-1",
          initialNodes: SEEDED_TREE,
        }),
      { wrapper: makeWrapper() },
    );

    // The tree query is the one seeded with initialData.
    const treeOptions = reactQueryCapture.options.find((opts) => "initialData" in opts);
    expect(treeOptions).toBeDefined();
    expect(treeOptions).toHaveProperty("refetchOnMount", true);
    expect(treeOptions).toHaveProperty("staleTime", 30_000);
  });

  it("useEstimateTabTreeQuery configures stale-aware mount refetching", async () => {
    const { renderHook } = await import("@testing-library/react");

    renderHook(
      () =>
        useEstimateTabTreeQuery({
          projectId: "project-1",
          estimateId: "estimate-1",
          tabId: "tab-main",
          initialNodes: SEEDED_TREE,
        }),
      { wrapper: makeWrapper() },
    );

    const treeOptions = reactQueryCapture.options.find((opts) => "initialData" in opts);
    expect(treeOptions).toBeDefined();
    expect(treeOptions).toHaveProperty("refetchOnMount", true);
    expect(treeOptions).toHaveProperty("staleTime", 30_000);
  });
});
