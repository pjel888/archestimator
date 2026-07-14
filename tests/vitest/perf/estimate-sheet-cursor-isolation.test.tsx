import { useSyncExternalStore } from "react";

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import {
  setEstimateSheetContentRenderProbe,
  setEstimateSheetRenderProbe,
} from "@/components/workshop/estimate-sheet-render-probe";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import type { RemoteEstimateCursor } from "@/hooks/use-estimate-cursor-broadcast";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

const routerMock = vi.hoisted(() => ({
  prefetch: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}));

const estimateActionMocks = vi.hoisted(() => ({
  deleteEstimateRowItem: vi.fn(),
  fetchEstimateSheetVersionControl: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  insertEstimateTemplateNodeIntoEstimate: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

const cursorStore = vi.hoisted(() => {
  let cursors: unknown[] = [];
  const listeners = new Set<() => void>();
  return {
    set(next: unknown[]) {
      cursors = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: () => cursors,
    reset() {
      cursors = [];
      listeners.clear();
    },
  };
});

const broadcastCursorMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/cursor-project/estimates/cursor-area-1",
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => estimateActionMocks);

vi.mock("@/hooks/use-estimate-cursor-broadcast", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    useEstimateCursorCollaboration: () => ({
      broadcastCursor: broadcastCursorMock,
      channelStatus: "subscribed",
      lastSendStatus: "idle",
      remoteCursors: useSyncExternalStore(cursorStore.subscribe, cursorStore.get, cursorStore.get),
    }),
  };
});

function makeRow(areaIndex: number, rowIndex: number): EstimateRowItem {
  return {
    id: `cursor-row-${areaIndex + 1}-${rowIndex + 1}`,
    material: `Cursor Row A${areaIndex + 1} R${rowIndex + 1}`,
    description: "",
    supplier: "Fixture",
    source: "library",
    unit: "pc",
    itemCost: 100,
    quantity: 1,
    subTotal: 100,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 0,
    totalItemCosts: 100,
    category: "Fixture",
    pricingSource: "fixture",
    pricingDate: "2026-05-31",
  };
}

function makeTree(): EstimateTreeNode[] {
  return [
    {
      id: "cursor-group",
      name: "Cursor Group",
      kind: "group",
      total: "₱0.00",
      children: Array.from({ length: 3 }, (_, areaIndex) => ({
        id: `cursor-area-${areaIndex + 1}`,
        name: `Cursor Area ${areaIndex + 1}`,
        kind: "area" as const,
        total: "₱0.00",
        estimateRowItems: Array.from({ length: 3 }, (_, rowIndex) => makeRow(areaIndex, rowIndex)),
        children: [],
      })),
    },
  ];
}

function makeCursor(userId: string, x: number, y: number): RemoteEstimateCursor {
  return {
    userId,
    displayName: `Collaborator ${userId}`,
    x,
    y,
    rowId: null,
    columnId: null,
    sentAt: "2026-06-11T00:00:00.000Z",
    receivedAt: 1_000,
  };
}

function renderSheet() {
  const tableRenders = new Map<string, number>();
  let contentRenders = 0;
  setEstimateSheetRenderProbe((tableNodeId) => {
    tableRenders.set(tableNodeId, (tableRenders.get(tableNodeId) ?? 0) + 1);
  });
  setEstimateSheetContentRenderProbe(() => {
    contentRenders += 1;
  });
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId="cursor-group"
        nodes={makeTree()}
        projectId="cursor-project"
        estimateId="cursor-estimate"
        collaborationUserId="local-user"
        collaborationDisplayName="Local User"
        canEditEstimate
        renderSidebar={false}
      />
    </QueryClientProvider>,
  );
  return {
    view,
    tableRenders,
    contentRenders: () => contentRenders,
    resetCounts: () => {
      tableRenders.clear();
      contentRenders = 0;
    },
  };
}

describe("remote cursor isolation (U8)", () => {
  afterEach(() => {
    setEstimateSheetRenderProbe(null);
    setEstimateSheetContentRenderProbe(null);
    cursorStore.reset();
    cleanup();
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders incoming remote cursors without re-rendering the sheet or any row table", () => {
    const { view, tableRenders, contentRenders, resetCounts } = renderSheet();
    resetCounts();

    act(() => {
      cursorStore.set([makeCursor("remote-user-1", 120, 60)]);
    });

    expect(view.container.querySelector('[data-estimate-remote-cursor="remote-user-1"]')).not.toBeNull();
    expect(contentRenders()).toBe(0);
    let totalTableRenders = 0;
    for (const count of tableRenders.values()) totalTableRenders += count;
    expect(totalTableRenders).toBe(0);
  });

  it("keeps focus and typed value intact while cursor broadcasts arrive mid-typing", () => {
    const { view, tableRenders, resetCounts } = renderSheet();
    const input = view.container.querySelector<HTMLInputElement>(
      '[data-estimate-row-id="cursor-row-1-1"][data-estimate-cell-index="0"]',
    )!;
    act(() => input.focus());
    resetCounts();

    act(() => {
      fireEvent.change(input, { target: { value: "12" } });
    });
    act(() => {
      cursorStore.set([makeCursor("remote-user-2", 40, 200)]);
    });
    act(() => {
      fireEvent.change(input, { target: { value: "123" } });
    });

    expect(input.value).toBe("123");
    expect(document.activeElement).toBe(input);
    expect(view.container.querySelector('[data-estimate-remote-cursor="remote-user-2"]')).not.toBeNull();
    // Other tables stay quiet through both keystrokes and the cursor frame.
    expect(tableRenders.get("cursor-area-2") ?? 0).toBe(0);
    expect(tableRenders.get("cursor-area-3") ?? 0).toBe(0);
  });

  it("clears the overlay when the remote cursor list empties without touching row tables", () => {
    const { view, tableRenders, resetCounts } = renderSheet();
    act(() => {
      cursorStore.set([makeCursor("remote-user-3", 10, 10)]);
    });
    resetCounts();

    act(() => {
      cursorStore.set([]);
    });

    expect(view.container.querySelector("[data-estimate-cursor-layer]")).toBeNull();
    let totalTableRenders = 0;
    for (const count of tableRenders.values()) totalTableRenders += count;
    expect(totalTableRenders).toBe(0);
  });
});
