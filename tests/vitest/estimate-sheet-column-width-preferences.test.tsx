import type { ComponentProps } from "react";

import { act, cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const preferenceActionMocks = vi.hoisted(() => ({
  loadEstimateSheetUserPreferences: vi.fn(),
  saveEstimateSheetUserPreferences: vi.fn(),
}));

vi.mock("@/lib/workshop/virtualization-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/workshop/virtualization-flags")>()),
  WORKSHOP_VIRTUALIZATION_FLAGS: {
    tree: true,
    estimateMasterColumn: true,
    estimateRows: true,
    estimateColumnResize: true,
    libraryComponents: false,
  },
}));

vi.mock("@/lib/estimate-sheet/user-preferences-actions", () => ({
  loadEstimateSheetUserPreferences: preferenceActionMocks.loadEstimateSheetUserPreferences,
  saveEstimateSheetUserPreferences: preferenceActionMocks.saveEstimateSheetUserPreferences,
}));

let EstimateSheetContent: typeof import("@/components/workshop/EstimateSheetContent").EstimateSheetContent;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

function renderSheet(props: Partial<ComponentProps<typeof EstimateSheetContent>> = {}) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <EstimateSheetContent
        selectedNodeId={null}
        nodes={[]}
        estimateId="estimate-column-widths"
        renderSidebar={false}
        {...props}
      />
    </QueryClientProvider>,
  );
}

function renderDuplicateSheets() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <EstimateSheetContent
        selectedNodeId={null}
        nodes={[]}
        estimateId="estimate-column-widths"
        renderSidebar={false}
      />
      <EstimateSheetContent
        selectedNodeId={null}
        nodes={[]}
        estimateId="estimate-column-widths"
        renderSidebar={false}
      />
    </QueryClientProvider>,
  );
}

describe("estimate sheet account column width preferences", () => {
  beforeAll(async () => {
    ({ EstimateSheetContent } = await import("@/components/workshop/EstimateSheetContent"));
  });

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.useFakeTimers();
    preferenceActionMocks.loadEstimateSheetUserPreferences.mockReturnValue(new Promise<null>(() => undefined));
    preferenceActionMocks.saveEstimateSheetUserPreferences.mockResolvedValue({ ok: true });
    window.localStorage.setItem(
      "archestimator:estimate-column-widths:v1:estimate-column-widths",
      JSON.stringify({ version: 1, widths: { quantity: 140 } }),
    );
  });

  afterEach(async () => {
    cleanup();
    const { resetEstimateSheetAccountPreferencesClientCacheForTests } = await import("@/components/workshop/estimate-sheet/account-preferences-client");
    resetEstimateSheetAccountPreferencesClientCacheForTests();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("does not save locally hydrated widths before the account load settles", async () => {
    renderSheet();

    await act(async () => undefined);
    expect(preferenceActionMocks.loadEstimateSheetUserPreferences).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(preferenceActionMocks.saveEstimateSheetUserPreferences).not.toHaveBeenCalled();
  });

  it("coalesces account preference loads across duplicate sheet mounts", async () => {
    renderDuplicateSheets();

    await act(async () => undefined);

    expect(preferenceActionMocks.loadEstimateSheetUserPreferences).toHaveBeenCalledTimes(1);
  });
});
