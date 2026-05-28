import { create } from "zustand";

type NavigationUiState = {
  isNavigating: boolean;
  startTime: number;
  targetHref: string | null;
  show: (targetHref?: string | null) => void;
  hide: () => void;
};

const MIN_DISPLAY_MS = 250;
const SAFETY_TIMEOUT_MS = 10_000;

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

export const useNavigationUiStore = create<NavigationUiState>((set, get) => ({
  isNavigating: false,
  startTime: 0,
  targetHref: null,
  show: (targetHref = null) => {
    clearTimers();
    set({ isNavigating: true, startTime: Date.now(), targetHref });

    safetyTimer = setTimeout(() => {
      safetyTimer = null;
      set({ isNavigating: false, targetHref: null });
    }, SAFETY_TIMEOUT_MS);
  },
  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);

    const elapsed = Date.now() - get().startTime;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    hideTimer = setTimeout(() => {
      hideTimer = null;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      set({ isNavigating: false, targetHref: null });
    }, remaining);
  },
}));
