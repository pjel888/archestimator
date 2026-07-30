import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { setEstimateRowItemRenderProbe, setEstimateSheetRenderProbe } from "@/components/workshop/estimate-sheet-render-probe";
import type { EstimateRowItem, EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

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
  fetchEstimateSheetVersionControl: vi.fn(),
  fetchEstimateTree: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  insertEstimateTemplateNodeIntoEstimate: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  restoreDeletedEstimateRows: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/perf-project/estimates/perf-area-01",
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

type KeystrokeProfile = {
  scenario: string;
  rowCount: number;
  areaCount: number;
  initialRenderMs: number;
  keystrokes: number;
  keystrokeMsAvg: number;
  keystrokeMsWorst: number;
  editedRowRenders: number;
  editedTableRenders: number;
  otherTableRendersTotal: number;
  otherTableCount: number;
};

const profiles: KeystrokeProfile[] = [];
const KEYSTROKE_AVG_BUDGET_MS = 16;
const KEYSTROKE_WORST_BUDGET_MS = 50;

function writeProfileOutput() {
  const outputPath = process.env.SHEET_PERF_BASELINE_OUTPUT;
  if (!outputPath || profiles.length === 0) return;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: "Local jsdom render/keystroke budget proof. Not a production Chrome trace; use browser benchmarks for frame-timing claims.",
        budgets: {
          keystrokeMsAvgMax: KEYSTROKE_AVG_BUDGET_MS,
          keystrokeMsWorstMax: KEYSTROKE_WORST_BUDGET_MS,
          editedTableRendersTotalMax: 0,
          otherTableRendersTotalMax: 0,
        },
        profiles,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
}

function makeRow(areaIndex: number, rowIndex: number): EstimateRowItem {
  const quantity = 1 + (rowIndex % 8);
  const itemCost = 450 + (rowIndex % 24) * 35;
  const miscCost = rowIndex % 5 === 0 ? 120 : 0;
  const subTotal = quantity * itemCost;
  return {
    id: `perf-row-${areaIndex + 1}-${String(rowIndex + 1).padStart(3, "0")}`,
    material: `Perf Row A${areaIndex + 1} ${String(rowIndex + 1).padStart(3, "0")}`,
    description: `Synthetic profile item ${rowIndex + 1}`,
    supplier: "Performance Fixture",
    source: "library",
    unit: rowIndex % 3 === 0 ? "lot" : rowIndex % 3 === 1 ? "sqm" : "pc",
    itemCost,
    quantity,
    subTotal,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost,
    totalItemCosts: subTotal + miscCost,
    category: "Performance",
    pricingSource: "Synthetic local profile fixture",
    pricingDate: "2026-05-31",
  };
}

function makeSheetTree(areaCount: number, rowsPerArea: number): EstimateTreeNode[] {
  return [
    {
      id: "perf-group",
      name: "Performance Group",
      kind: "group",
      total: "₱0.00",
      children: Array.from({ length: areaCount }, (_, areaIndex) => ({
        id: `perf-area-${String(areaIndex + 1).padStart(2, "0")}`,
        name: `Performance Area ${areaIndex + 1}`,
        kind: "area" as const,
        total: "₱0.00",
        estimateRowItems: Array.from({ length: rowsPerArea }, (_, rowIndex) => makeRow(areaIndex, rowIndex)),
        children: [],
      })),
    },
  ];
}

async function profileKeystrokes(scenario: string, areaCount: number, rowsPerArea: number) {
  const tree = makeSheetTree(areaCount, rowsPerArea);
  const renderCounts = new Map<string, number>();
  const rowRenderCounts = new Map<string, number>();
  setEstimateSheetRenderProbe((tableNodeId) => {
    renderCounts.set(tableNodeId, (renderCounts.get(tableNodeId) ?? 0) + 1);
  });
  setEstimateRowItemRenderProbe((rowItemId) => {
    rowRenderCounts.set(rowItemId, (rowRenderCounts.get(rowItemId) ?? 0) + 1);
  });

  const startedAt = performance.now();
  const view = render(
    <QueryClientProvider client={makeQueryClient()}>
      <EstimateSheetContent
        selectedNodeId="perf-group"
        nodes={tree}
        projectId="perf-project"
        estimateId="perf-estimate"
        canEditEstimate
        renderSidebar={false}
      />
    </QueryClientProvider>,
  );
  const initialRenderMs = Math.round((performance.now() - startedAt) * 100) / 100;
  await act(async () => {
    await Promise.resolve();
  });

  const editedRowId = "perf-row-1-001";
  const quantityInput = view.container.querySelector<HTMLInputElement>(
    `[data-estimate-row-id="${editedRowId}"][data-estimate-cell-index="0"]`,
  );
  expect(quantityInput).not.toBeNull();
  act(() => {
    quantityInput!.focus();
  });

  renderCounts.clear();
  rowRenderCounts.clear();
  const characters = "1234567890";
  const keystrokeDurations: number[] = [];
  for (let index = 0; index < characters.length; index += 1) {
    const nextValue = characters.slice(0, index + 1);
    const keystrokeStartedAt = performance.now();
    act(() => {
      fireEvent.change(quantityInput!, { target: { value: nextValue } });
    });
    keystrokeDurations.push(performance.now() - keystrokeStartedAt);
  }

  // Characterization: typed value survives, focus stays on the edited cell.
  expect(quantityInput!.value).toBe("1234567890");
  expect(document.activeElement).toBe(quantityInput);

  const editedTableRenders = renderCounts.get("perf-area-01") ?? 0;
  const editedRowRenders = rowRenderCounts.get(editedRowId) ?? 0;
  let otherTableRendersTotal = 0;
  for (const [tableNodeId, count] of renderCounts) {
    if (tableNodeId !== "perf-area-01") otherTableRendersTotal += count;
  }

  const profile: KeystrokeProfile = {
    scenario,
    rowCount: areaCount * rowsPerArea,
    areaCount,
    initialRenderMs,
    keystrokes: characters.length,
    keystrokeMsAvg: Math.round((keystrokeDurations.reduce((total, value) => total + value, 0) / keystrokeDurations.length) * 100) / 100,
    keystrokeMsWorst: Math.round(Math.max(...keystrokeDurations) * 100) / 100,
    editedRowRenders,
    editedTableRenders,
    otherTableRendersTotal,
    otherTableCount: areaCount - 1,
  };
  profiles.push(profile);
  console.log("estimate-sheet-render-baseline", JSON.stringify(profile));
  return profile;
}

function expectProfileWithinLocalBudget(profile: KeystrokeProfile) {
  expect(profile.keystrokeMsAvg).toBeLessThanOrEqual(KEYSTROKE_AVG_BUDGET_MS);
  expect(profile.keystrokeMsWorst).toBeLessThanOrEqual(KEYSTROKE_WORST_BUDGET_MS);
  expect(profile.editedRowRenders).toBeGreaterThan(0);
  expect(profile.editedTableRenders).toBe(0);
  expect(profile.otherTableRendersTotal).toBe(0);
}

describe("estimate sheet render/keystroke baseline", () => {
  afterEach(() => {
    writeProfileOutput();
    setEstimateSheetRenderProbe(null);
    setEstimateRowItemRenderProbe(null);
    cleanup();
    resetEstimateWorkspaceState();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("profiles a 50-row sheet (5 areas x 10 rows)", async () => {
    const profile = await profileKeystrokes("sheet-50", 5, 10);
    expectProfileWithinLocalBudget(profile);
  }, 60_000);

  it("profiles a 200-row sheet (10 areas x 20 rows)", async () => {
    const profile = await profileKeystrokes("sheet-200", 10, 20);
    expectProfileWithinLocalBudget(profile);
  }, 60_000);

  it("profiles a 500-row sheet (10 areas x 50 rows)", async () => {
    const profile = await profileKeystrokes("sheet-500", 10, 50);
    expectProfileWithinLocalBudget(profile);
  }, 120_000);
});
