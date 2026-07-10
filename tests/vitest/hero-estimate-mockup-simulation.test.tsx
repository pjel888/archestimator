import { act, cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import {
  HERO_ANIMATION_PHASES,
  HERO_ESTIMATE_ID,
  HERO_FAUCET_ROW_ID,
  HERO_FLOOR_FINISH_ROW_ID,
  HERO_TAB_ID,
  HeroEstimateWorkspaceMockup,
  advanceHeroPhaseIndex,
  findHeroKitchenRowsInTree,
  getHeroKitchenRows,
  getHeroPhaseAtIndex,
  getHeroPhaseDurationMs,
  type HeroAnimationPhase,
} from "@/components/landing-v3/HeroEstimateWorkspaceMockup";
import { estimateQueryKeys } from "@/hooks/use-estimate-query";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";
import { endEstimateWorkshopDrag } from "@/components/workshop/estimate-workshop-drag";

vi.mock("@/lib/estimates/actions", () => ({
  fetchEstimateEditCapability: vi.fn(async () => true),
  fetchEstimateTabs: vi.fn(async () => []),
  fetchEstimateTabTree: vi.fn(async () => []),
  fetchEstimateTree: vi.fn(async () => []),
  restoreDeletedEstimateRows: vi.fn(),
  restoreDeletedEstimateNodes: vi.fn(),
}));

// Keep the hero phase machine + query-cache sync under test without mounting the
// full workshop editor (dynamic imports, route hooks, DnD).
vi.mock("@/components/workshop/EstimateWorkspaceClient", () => ({
  EstimateWorkspaceClient: () => <div data-testid="hero-estimate-workspace-stub" />,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useParams: () => ({}),
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

function renderHero(queryClient: QueryClient, ui: ReactElement = <HeroEstimateWorkspaceMockup />) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function kitchenRowsFromCache(queryClient: QueryClient) {
  return findHeroKitchenRowsInTree(
    queryClient.getQueryData(estimateQueryKeys.tabTree(HERO_ESTIMATE_ID, HERO_TAB_ID)),
  );
}

async function advanceHeroToPhase(target: HeroAnimationPhase) {
  let index = 0;
  while (getHeroPhaseAtIndex(index) !== target) {
    const duration = getHeroPhaseDurationMs(getHeroPhaseAtIndex(index));
    await act(async () => {
      vi.advanceTimersByTime(duration);
    });
    index = advanceHeroPhaseIndex(index);
  }
  // Allow the phase effect + query sync to flush for the landed phase.
  await act(async () => {
    vi.advanceTimersByTime(0);
  });
}

async function advanceHeroThroughPhases(from: HeroAnimationPhase, toExclusive: HeroAnimationPhase) {
  let index = HERO_ANIMATION_PHASES.indexOf(from);
  expect(index).toBeGreaterThanOrEqual(0);
  while (getHeroPhaseAtIndex(index) !== toExclusive) {
    const duration = getHeroPhaseDurationMs(getHeroPhaseAtIndex(index));
    await act(async () => {
      vi.advanceTimersByTime(duration);
    });
    index = advanceHeroPhaseIndex(index);
  }
  await act(async () => {
    vi.advanceTimersByTime(0);
  });
}

describe("hero estimate mockup simulation model", () => {
  it("does not insert a kitchen row while the faux mouse is still dragging", () => {
    expect(getHeroKitchenRows("drag-faucet")).toEqual([]);
    expect(getHeroKitchenRows("drag-ceramic").map((row) => row.id)).toEqual([HERO_FAUCET_ROW_ID]);
    expect(getHeroKitchenRows("drag-fauxwood").map((row) => row.id)).toEqual([
      HERO_FAUCET_ROW_ID,
      HERO_FLOOR_FINISH_ROW_ID,
    ]);
  });

  it("inserts the faucet row only after the simulated drop/insert phase", () => {
    const rows = getHeroKitchenRows("faucet-inserted");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(HERO_FAUCET_ROW_ID);
    expect(rows[0]?.material).toBe("Single-lever kitchen faucet");
    expect(rows[0]?.quantity).toBe(1);
    expect(rows[0]?.unit).toBe("pc");
  });

  it("replaces the floor-finish component on fauxwood drop instead of stacking a third row", () => {
    const ceramic = getHeroKitchenRows("ceramic-inserted");
    const replaced = getHeroKitchenRows("fauxwood-replaced");
    expect(ceramic.map((row) => row.material)).toEqual([
      "Single-lever kitchen faucet",
      "600x600 ceramic tiles",
    ]);
    expect(replaced.map((row) => row.material)).toEqual([
      "Single-lever kitchen faucet",
      "200x1200 faux wood tiles",
    ]);
    expect(replaced.find((row) => row.id === HERO_FLOOR_FINISH_ROW_ID)?.material).toBe(
      "200x1200 faux wood tiles",
    );
  });

  it("keeps drag phases longer than the cursor travel so land happens before insert", () => {
    expect(getHeroPhaseDurationMs("drag-faucet")).toBeGreaterThan(1800);
    expect(getHeroPhaseDurationMs("drag-ceramic")).toBeGreaterThan(1800);
    expect(getHeroPhaseDurationMs("drag-fauxwood")).toBeGreaterThan(1800);
  });

  it("advances the phase index in a stable loop", () => {
    expect(getHeroPhaseAtIndex(0)).toBe("ready");
    expect(getHeroPhaseAtIndex(HERO_ANIMATION_PHASES.length)).toBe("ready");
    expect(advanceHeroPhaseIndex(HERO_ANIMATION_PHASES.length - 1)).toBe(0);
  });
});

describe("hero estimate mockup drop → row sync (UltraQA)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetEstimateWorkspaceState();
    endEstimateWorkshopDrag();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    endEstimateWorkshopDrag();
  });

  it("normal loop: after faucet drop phase, the tab-tree cache contains the new kitchen row", async () => {
    const queryClient = makeQueryClient();
    renderHero(queryClient);

    await advanceHeroToPhase("faucet-inserted");

    expect(kitchenRowsFromCache(queryClient).map((row) => row.id)).toContain(HERO_FAUCET_ROW_ID);
  });

  it("no premature row: drag-faucet phase must not publish a kitchen faucet row yet", async () => {
    const queryClient = makeQueryClient();
    renderHero(queryClient);

    await advanceHeroToPhase("drag-faucet");

    expect(kitchenRowsFromCache(queryClient).map((row) => row.id)).not.toContain(HERO_FAUCET_ROW_ID);
  });

  it("rapid loop restart: returning to ready clears inserted kitchen rows", async () => {
    const queryClient = makeQueryClient();
    renderHero(queryClient);

    await advanceHeroToPhase("faucet-inserted");
    expect(kitchenRowsFromCache(queryClient).map((row) => row.id)).toContain(HERO_FAUCET_ROW_ID);

    await advanceHeroThroughPhases("faucet-inserted", "ready");

    expect(kitchenRowsFromCache(queryClient)).toEqual([]);
  });

  it("interrupted mid-drag: unmount during drag does not leave a published faucet row", async () => {
    const queryClient = makeQueryClient();
    const view = renderHero(queryClient);

    await advanceHeroToPhase("drag-faucet");
    expect(kitchenRowsFromCache(queryClient).map((row) => row.id)).not.toContain(HERO_FAUCET_ROW_ID);

    view.unmount();
    expect(kitchenRowsFromCache(queryClient).map((row) => row.id)).not.toContain(HERO_FAUCET_ROW_ID);
  });

  it("misleading success guard: faucet-inserted must publish the row into the sheet query cache", async () => {
    const queryClient = makeQueryClient();
    renderHero(queryClient);

    await advanceHeroToPhase("faucet-inserted");

    const rows = kitchenRowsFromCache(queryClient);
    expect(rows.some((row) => row.id === HERO_FAUCET_ROW_ID && row.material.includes("faucet"))).toBe(true);
  });
});
