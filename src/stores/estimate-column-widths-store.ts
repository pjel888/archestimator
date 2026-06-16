import { create } from "zustand";

import {
  EMPTY_ESTIMATE_COLUMN_WIDTHS,
  normalizeEstimateColumnWidths,
  type EstimateColumnWidths,
} from "@/lib/estimate-sheet/column-model";
import { readJsonStorage, safeSetJsonStorage } from "@/components/workshop/component-library/helpers";

const STORAGE_VERSION = 1;
const STORAGE_PREFIX = "archestimator:estimate-column-widths:v1";
const LAST_USED_KEY = `${STORAGE_PREFIX}:__last-used`;

type StoredColumnWidths = {
  version: number;
  widths: EstimateColumnWidths;
};

type EstimateColumnWidthsState = {
  widthsByEstimateId: Record<string, EstimateColumnWidths | undefined>;
  lastUsedWidths: EstimateColumnWidths;
  hydratedEstimateIds: Record<string, true>;
  hydrateEstimateColumnWidths: (estimateId: string) => void;
  commitEstimateColumnWidths: (estimateId: string, widths: EstimateColumnWidths) => void;
  resetEstimateColumnWidths: (estimateId: string) => void;
};

function estimateStorageKey(estimateId: string) {
  return `${STORAGE_PREFIX}:${estimateId}`;
}

function removeStorageKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Private-mode and quota edge cases should never break the sheet.
  }
}

function readStoredWidths(key: string): EstimateColumnWidths {
  const stored = readJsonStorage<StoredColumnWidths | null>(key, null);
  if (!stored || stored.version !== STORAGE_VERSION) return EMPTY_ESTIMATE_COLUMN_WIDTHS;
  return normalizeEstimateColumnWidths(stored.widths);
}

function writeStoredWidths(key: string, widths: EstimateColumnWidths) {
  const normalizedWidths = normalizeEstimateColumnWidths(widths);
  if (normalizedWidths === EMPTY_ESTIMATE_COLUMN_WIDTHS) {
    removeStorageKey(key);
    return;
  }
  safeSetJsonStorage<StoredColumnWidths>(key, {
    version: STORAGE_VERSION,
    widths: normalizedWidths,
  });
}

export const useEstimateColumnWidthsStore = create<EstimateColumnWidthsState>((set, get) => ({
  widthsByEstimateId: {},
  lastUsedWidths: EMPTY_ESTIMATE_COLUMN_WIDTHS,
  hydratedEstimateIds: {},
  hydrateEstimateColumnWidths: (estimateId) => {
    if (!estimateId || get().hydratedEstimateIds[estimateId]) return;
    const estimateWidths = readStoredWidths(estimateStorageKey(estimateId));
    const lastUsedWidths = readStoredWidths(LAST_USED_KEY);
    set((state) => ({
      widthsByEstimateId: {
        ...state.widthsByEstimateId,
        [estimateId]: estimateWidths === EMPTY_ESTIMATE_COLUMN_WIDTHS ? lastUsedWidths : estimateWidths,
      },
      lastUsedWidths,
      hydratedEstimateIds: {
        ...state.hydratedEstimateIds,
        [estimateId]: true,
      },
    }));
  },
  commitEstimateColumnWidths: (estimateId, widths) => {
    if (!estimateId) return;
    const normalizedWidths = normalizeEstimateColumnWidths(widths);
    writeStoredWidths(estimateStorageKey(estimateId), normalizedWidths);
    writeStoredWidths(LAST_USED_KEY, normalizedWidths);
    set((state) => ({
      widthsByEstimateId: {
        ...state.widthsByEstimateId,
        [estimateId]: normalizedWidths,
      },
      lastUsedWidths: normalizedWidths,
      hydratedEstimateIds: {
        ...state.hydratedEstimateIds,
        [estimateId]: true,
      },
    }));
  },
  resetEstimateColumnWidths: (estimateId) => {
    if (!estimateId) return;
    removeStorageKey(estimateStorageKey(estimateId));
    removeStorageKey(LAST_USED_KEY);
    set((state) => ({
      widthsByEstimateId: {
        ...state.widthsByEstimateId,
        [estimateId]: EMPTY_ESTIMATE_COLUMN_WIDTHS,
      },
      lastUsedWidths: EMPTY_ESTIMATE_COLUMN_WIDTHS,
      hydratedEstimateIds: {
        ...state.hydratedEstimateIds,
        [estimateId]: true,
      },
    }));
  },
}));
