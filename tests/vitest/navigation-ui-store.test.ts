import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

function reset() {
  // bfcacheRestore clears all timers and resets state to idle.
  useNavigationUiStore.getState().bfcacheRestore();
}

beforeEach(() => {
  reset();
});

afterEach(() => {
  vi.useRealTimers();
  reset();
});

describe("navigation-ui-store delay-before-show", () => {
  it("does NOT show the overlay if navigation completes before the show delay", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/workshop/library/components");
    // CRITICAL: the overlay must not appear synchronously on click. A fast,
    // prefetched tab switch should never flash the blur.
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
    // navigation completes quickly (pathname effect calls hide before 150ms)
    vi.advanceTimersByTime(100);
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
    s.hide();
    vi.advanceTimersByTime(500);
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
  });

  it("DOES show the overlay if navigation exceeds the show delay", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/somewhere/slow");
    vi.advanceTimersByTime(200); // past SHOW_DELAY_MS
    expect(useNavigationUiStore.getState().isNavigating).toBe(true);
  });

  it("suppresses the global overlay for estimate sheet routes with a leaf skeleton", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/workshop/projects/project-1/estimates/estimate-1");
    vi.advanceTimersByTime(10_000);
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
    expect(useNavigationUiStore.getState().targetHref).toBe("/workshop/projects/project-1/estimates/estimate-1");
  });

  it("keeps the overlay visible at least MIN_VISIBLE_MS once shown (no flicker)", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/somewhere/slow");
    vi.advanceTimersByTime(160); // overlay becomes visible at 150ms
    expect(useNavigationUiStore.getState().isNavigating).toBe(true);
    s.hide(); // nav completed right after overlay appeared
    vi.advanceTimersByTime(50); // not yet past min-visible floor
    expect(useNavigationUiStore.getState().isNavigating).toBe(true);
    vi.advanceTimersByTime(300); // past the floor
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
  });

  it("a fast nav after a slow nav does not get cancelled by the slow nav's stale hide", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    // Slow nav A becomes visible.
    s.show("/slow/a");
    vi.advanceTimersByTime(160);
    expect(useNavigationUiStore.getState().isNavigating).toBe(true);
    // A completes -> hide() schedules a deferred hide.
    s.hide();
    // Before A's hide fires, a new slow nav B starts.
    vi.advanceTimersByTime(10);
    s.show("/slow/b");
    // A's deferred hide must NOT tear down B's pending overlay.
    vi.advanceTimersByTime(300); // B's show-delay elapses, A's old hide would have fired
    expect(useNavigationUiStore.getState().isNavigating).toBe(true);
  });

  it("overlapping fast tab clicks never flash the overlay", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/tab/a");
    vi.advanceTimersByTime(40);
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
    s.show("/tab/b"); // user clicked another tab quickly
    vi.advanceTimersByTime(40);
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
    s.hide(); // b completed fast
    vi.advanceTimersByTime(500);
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
  });

  it("hide() before show-delay clears the pending timer (no late flash)", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/quick");
    vi.advanceTimersByTime(50);
    s.hide();
    // The pending show timer must be cleared; advancing past the delay shows nothing.
    vi.advanceTimersByTime(1000);
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
  });

  it("bfcacheRestore() forces the overlay off and clears timers", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/slow");
    vi.advanceTimersByTime(200);
    expect(useNavigationUiStore.getState().isNavigating).toBe(true);
    s.bfcacheRestore();
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
  });

  it("safety timeout force-hides a navigation that never completes", () => {
    vi.useFakeTimers();
    const s = useNavigationUiStore.getState();
    s.show("/never/completes");
    vi.advanceTimersByTime(160); // visible
    expect(useNavigationUiStore.getState().isNavigating).toBe(true);
    vi.advanceTimersByTime(10_000); // safety floor
    expect(useNavigationUiStore.getState().isNavigating).toBe(false);
  });
});
