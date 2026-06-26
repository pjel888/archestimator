import { create } from "zustand";
import { shouldSuppressGlobalRouteOverlay } from "@/lib/navigation/route-overlay-policy";

type NavigationUiState = {
  isNavigating: boolean;
  startTime: number;
  targetHref: string | null;
  /** Begins tracking a navigation. Returns a navigation id the caller may pass to hide(). */
  show: (targetHref?: string | null) => number;
  /** Marks the current navigation complete. Optional completedHref/navId guard against stale completions. */
  hide: (completedHref?: string | null, navId?: number | null) => void;
  bfcacheRestore: () => void;
};

// Only blur if a navigation takes longer than this. Prefetched/cached tab
// switches complete in well under this window, so they never flash the overlay.
const SHOW_DELAY_MS = 150;
// Once the overlay is actually shown, keep it visible at least this long to
// avoid a sub-perceptual flicker.
const MIN_VISIBLE_MS = 250;
const SAFETY_TIMEOUT_MS = 10_000;

let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
let shownAt = 0;
let activeNavId = 0;

function clearTimers() {
  for (const t of [showTimer, hideTimer, safetyTimer]) {
    if (t) clearTimeout(t);
  }
  showTimer = hideTimer = safetyTimer = null;
}

export const useNavigationUiStore = create<NavigationUiState>((set, get) => ({
  isNavigating: false,
  startTime: 0,
  targetHref: null,
  show: (targetHref = null) => {
    const navId = activeNavId + 1;
    activeNavId = navId;
    clearTimers();
    if (shouldSuppressGlobalRouteOverlay(targetHref)) {
      set({ isNavigating: false, targetHref, startTime: Date.now() });
      return navId;
    }
    set({ targetHref, startTime: Date.now() });
    showTimer = setTimeout(() => {
      if (activeNavId !== navId) return;
      showTimer = null;
      shownAt = Date.now();
      set({ isNavigating: true });
      safetyTimer = setTimeout(() => {
        if (activeNavId === navId) set({ isNavigating: false, targetHref: null });
      }, SAFETY_TIMEOUT_MS);
    }, SHOW_DELAY_MS);
    return navId;
  },
  hide: (completedHref = null, navId = null) => {
    const state = get();
    // A stale completion (from an older navigation) must not cancel a newer one.
    if (navId !== null && navId !== activeNavId) return;
    if (completedHref && state.targetHref && completedHref !== state.targetHref) return;
    // Never shown yet → clear the pending show timer so no late flash occurs.
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    if (!get().isNavigating) {
      clearTimers();
      set({ isNavigating: false, targetHref: null });
      return;
    }
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (navId === null || navId === activeNavId) {
        clearTimers();
        set({ isNavigating: false, targetHref: null });
      }
    }, remaining);
  },
  bfcacheRestore: () => {
    activeNavId += 1;
    clearTimers();
    set({ isNavigating: false, startTime: 0, targetHref: null });
  },
}));
