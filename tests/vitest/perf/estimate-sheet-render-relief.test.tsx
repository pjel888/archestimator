import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { setEstimateRowItemRenderProbe, setEstimateSheetRenderProbe } from "@/components/workshop/estimate-sheet-render-probe";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { withExpressComponentMetadata } from "@/lib/estimates/express-components";

const routerMock = vi.hoisted(() => ({
  prefetch: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  deleteEstimateRowItem: vi.fn(),
  detachEstimateRowItemFromLibrary: vi.fn(),
  fetchEstimateSheetVersionControl: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  insertEstimateTemplateNodeIntoEstimate: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/relief-project/estimates/relief-group",
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

function makeRow(areaIndex: number, rowIndex: number): EstimateRowItem {
  const itemCost = 450;
  return {
    id: `relief-row-${areaIndex + 1}-${rowIndex + 1}`,
    material: `Relief Row A${areaIndex + 1} R${rowIndex + 1}`,
    description: `Relief fixture item ${rowIndex + 1}`,
    supplier: "Relief Fixture",
    source: "library",
    unit: "pc",
    itemCost,
    quantity: 1,
    subTotal: itemCost,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost: 0,
    totalItemCosts: itemCost,
    category: "Relief",
    pricingSource: "Synthetic relief fixture",
    pricingDate: "2026-05-31",
  };
}

function makeTree(areaCount: number, rowsPerArea: number): EstimateTreeNode[] {
  return [
    {
      id: "relief-group",
      name: "Relief Group",
      kind: "group",
      total: "₱0.00",
      children: Array.from({ length: areaCount }, (_, areaIndex) => ({
        id: `relief-area-${areaIndex + 1}`,
        name: `Relief Area ${areaIndex + 1}`,
        kind: "area" as const,
        total: "₱0.00",
        estimateRowItems: Array.from({ length: rowsPerArea }, (_, rowIndex) => makeRow(areaIndex, rowIndex)),
        children: [],
      })),
    },
  ];
}

function makeExpressTree(): EstimateTreeNode[] {
  const tree = makeTree(3, 3);
  const firstArea = tree[0]?.children?.[0];
  const firstRow = firstArea?.estimateRowItems?.[0];
  if (firstArea && firstRow) {
    firstArea.estimateRowItems = [
      {
        ...firstRow,
        source: "project",
        sourceLibraryItemId: null,
        metadata: withExpressComponentMetadata({}, {
          id: "express-render-relief-row",
          componentName: firstRow.material,
        }),
      },
      ...firstArea.estimateRowItems!.slice(1),
    ];
  }
  return tree;
}

function renderSheet({ expressFirstRow = false }: { expressFirstRow?: boolean } = {}) {
  const renderCounts = new Map<string, number>();
  setEstimateSheetRenderProbe((tableNodeId) => {
    renderCounts.set(tableNodeId, (renderCounts.get(tableNodeId) ?? 0) + 1);
  });
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId="relief-group"
        nodes={expressFirstRow ? makeExpressTree() : makeTree(3, 3)}
        projectId="relief-project"
        estimateId="relief-estimate"
        renderSidebar={false}
      />
    </QueryClientProvider>,
  );
  return { view, renderCounts };
}

function quantityInput(view: ReturnType<typeof render>, rowId: string) {
  const input = view.container.querySelector<HTMLInputElement>(
    `[data-estimate-row-id="${rowId}"][data-estimate-cell-index="0"]`,
  );
  expect(input).not.toBeNull();
  return input!;
}

function rendersOutside(renderCounts: Map<string, number>, editedTableId: string) {
  let total = 0;
  for (const [tableNodeId, count] of renderCounts) {
    if (tableNodeId !== editedTableId) total += count;
  }
  return total;
}

describe("estimate sheet render relief (U1)", () => {
  afterEach(() => {
    setEstimateSheetRenderProbe(null);
    setEstimateRowItemRenderProbe(null);
    cleanup();
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("typing in one row's quantity does not re-render other area tables", () => {
    const { view, renderCounts } = renderSheet();
    const input = quantityInput(view, "relief-row-1-1");
    act(() => input.focus());

    renderCounts.clear();
    for (const value of ["3", "34", "345"]) {
      act(() => {
        fireEvent.change(input, { target: { value } });
      });
    }

    expect(input.value).toBe("345");
    expect(document.activeElement).toBe(input);
    expect(renderCounts.get("relief-area-1") ?? 0).toBeGreaterThan(0);
    expect(rendersOutside(renderCounts, "relief-area-1")).toBe(0);
  });

  it("typing in one row's quantity does not re-render sibling rows in the same table", () => {
    const rowRenderCounts = new Map<string, number>();
    setEstimateRowItemRenderProbe((rowItemId) => {
      rowRenderCounts.set(rowItemId, (rowRenderCounts.get(rowItemId) ?? 0) + 1);
    });
    const { view } = renderSheet();
    const input = quantityInput(view, "relief-row-1-1");
    act(() => input.focus());

    rowRenderCounts.clear();
    for (const value of ["3", "34", "345"]) {
      act(() => {
        fireEvent.change(input, { target: { value } });
      });
    }

    expect(rowRenderCounts.get("relief-row-1-1") ?? 0).toBeGreaterThan(0);
    expect(rowRenderCounts.get("relief-row-1-2") ?? 0).toBe(0);
    expect(rowRenderCounts.get("relief-row-1-3") ?? 0).toBe(0);
  });

  it("typing in one express text field re-renders only that row and area table", () => {
    const rowRenderCounts = new Map<string, number>();
    setEstimateRowItemRenderProbe((rowItemId) => {
      rowRenderCounts.set(rowItemId, (rowRenderCounts.get(rowItemId) ?? 0) + 1);
    });
    const { view, renderCounts } = renderSheet({ expressFirstRow: true });
    const input = within(view.container as HTMLElement).getByLabelText("Component name") as HTMLInputElement;
    act(() => input.focus());

    renderCounts.clear();
    rowRenderCounts.clear();
    for (const value of ["Custom vanity", "Custom vanity long", "Custom vanity long run"]) {
      act(() => {
        fireEvent.change(input, { target: { value } });
      });
    }

    expect(input.value).toBe("Custom vanity long run");
    expect(document.activeElement).toBe(input);
    expect(renderCounts.get("relief-area-1") ?? 0).toBeGreaterThan(0);
    expect(rendersOutside(renderCounts, "relief-area-1")).toBe(0);
    expect(rowRenderCounts.get("relief-row-1-1") ?? 0).toBeGreaterThan(0);
    expect(rowRenderCounts.get("relief-row-1-2") ?? 0).toBe(0);
    expect(rowRenderCounts.get("relief-row-1-3") ?? 0).toBe(0);
  });

  it("edits in two different tables keep both subtotals live with no stale rows", () => {
    const { view } = renderSheet();
    const projectTotals: number[] = [];
    const onTotalChange = (event: Event) => projectTotals.push((event as CustomEvent<{ total: number }>).detail.total);
    window.addEventListener("archestimator:project-total-change", onTotalChange);

    try {
      const firstInput = quantityInput(view, "relief-row-1-1");
      act(() => input_setValue(firstInput, "3"));
      const secondInput = quantityInput(view, "relief-row-2-1");
      act(() => input_setValue(secondInput, "4"));

      const firstRow = firstInput.closest("tr")!;
      const secondRow = secondInput.closest("tr")!;
      expect(within(firstRow).getAllByText(/1,350\.00/).length).toBeGreaterThan(0);
      expect(within(secondRow).getAllByText(/1,800\.00/).length).toBeGreaterThan(0);
      // 9 rows at 450 baseline = 4050; +2*450 (qty 3) +3*450 (qty 4) = 6300.
      expect(projectTotals.at(-1)).toBe(6300);
    } finally {
      window.removeEventListener("archestimator:project-total-change", onTotalChange);
    }
  });

  it("opening the command palette does not re-render any row table", () => {
    const { renderCounts } = renderSheet();
    renderCounts.clear();

    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });

    let totalTableRenders = 0;
    for (const count of renderCounts.values()) totalTableRenders += count;
    expect(totalTableRenders).toBe(0);
  });

  it("bulk-selecting a row re-renders only that row's table", () => {
    const { view, renderCounts } = renderSheet();
    const checkbox = within(view.container as HTMLElement).getByRole("checkbox", { name: "Select Relief Row A1 R1" });

    renderCounts.clear();
    act(() => {
      fireEvent.click(checkbox);
    });

    expect(renderCounts.get("relief-area-1") ?? 0).toBeGreaterThan(0);
    expect(rendersOutside(renderCounts, "relief-area-1")).toBe(0);
  });
});

function input_setValue(input: HTMLInputElement, value: string) {
  fireEvent.change(input, { target: { value } });
}
