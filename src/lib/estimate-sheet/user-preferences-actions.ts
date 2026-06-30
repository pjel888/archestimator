"use server";

import {
  EMPTY_ESTIMATE_COLUMN_WIDTHS,
  normalizeEstimateColumnWidths,
  type EstimateColumnWidths,
} from "@/lib/estimate-sheet/column-model";
import {
  getEstimatePreferenceContextFromCloudflareD1,
  loadEstimateSheetUserPreferencesFromCloudflareD1,
  saveEstimateSheetUserPreferencesInCloudflareD1,
} from "@/lib/estimate-sheet/user-preferences-d1-store";
import { isUuid } from "@/lib/ids";
import { requireCurrentUserContext } from "@/lib/auth/session";

export type EstimateSheetUserPreferences = {
  columnWidths: EstimateColumnWidths;
  updatedAt?: string | null;
};

export type SaveEstimateSheetUserPreferencesInput = {
  estimateId: string;
  columnWidths?: EstimateColumnWidths | null;
};

function readColumnWidths(value: unknown): EstimateColumnWidths {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_ESTIMATE_COLUMN_WIDTHS;
  return normalizeEstimateColumnWidths(value as EstimateColumnWidths);
}

async function getEstimatePreferenceContext(estimateId: string) {
  if (!isUuid(estimateId)) return null;
  const currentUser = await requireCurrentUserContext();
  return getEstimatePreferenceContextFromCloudflareD1(estimateId, currentUser);
}

export async function loadEstimateSheetUserPreferences(estimateId: string): Promise<EstimateSheetUserPreferences | null> {
  try {
    const context = await getEstimatePreferenceContext(estimateId);
    if (!context) return null;

    return loadEstimateSheetUserPreferencesFromCloudflareD1(context);
  } catch {
    return null;
  }
}

export async function saveEstimateSheetUserPreferences(input: SaveEstimateSheetUserPreferencesInput) {
  try {
    const context = await getEstimatePreferenceContext(input.estimateId);
    if (!context) return { ok: false, ignored: true };

    await saveEstimateSheetUserPreferencesInCloudflareD1(context, readColumnWidths(input.columnWidths));
    return { ok: true };
  } catch {
    return { ok: false, ignored: true };
  }
}
