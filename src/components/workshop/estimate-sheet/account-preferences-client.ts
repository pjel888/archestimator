"use client";

import {
  loadEstimateSheetUserPreferences,
  saveEstimateSheetUserPreferences,
  type EstimateSheetUserPreferences,
  type SaveEstimateSheetUserPreferencesInput,
} from "@/lib/estimate-sheet/user-preferences-actions";

const ACCOUNT_PREFERENCES_CACHE_TTL_MS = 30_000;

const accountPreferenceLoadPromises = new Map<string, Promise<EstimateSheetUserPreferences | null>>();
const accountPreferenceCache = new Map<string, {
  loadedAt: number;
  preferences: EstimateSheetUserPreferences | null;
}>();

function getCachedAccountPreferences(estimateId: string):
  | { hit: true; preferences: EstimateSheetUserPreferences | null }
  | { hit: false } {
  const cached = accountPreferenceCache.get(estimateId);
  if (!cached) return { hit: false };
  if (Date.now() - cached.loadedAt > ACCOUNT_PREFERENCES_CACHE_TTL_MS) {
    accountPreferenceCache.delete(estimateId);
    return { hit: false };
  }
  return { hit: true, preferences: cached.preferences };
}

function invalidateAccountPreferences(estimateId: string) {
  accountPreferenceCache.delete(estimateId);
  accountPreferenceLoadPromises.delete(estimateId);
}

export function resetEstimateSheetAccountPreferencesClientCacheForTests() {
  accountPreferenceCache.clear();
  accountPreferenceLoadPromises.clear();
}

export function loadEstimateSheetAccountPreferences(estimateId: string) {
  const cached = getCachedAccountPreferences(estimateId);
  if (cached.hit) return Promise.resolve(cached.preferences);

  const existingLoad = accountPreferenceLoadPromises.get(estimateId);
  if (existingLoad) return existingLoad;

  const loadPromise = loadEstimateSheetUserPreferences(estimateId)
    .then((preferences) => {
      accountPreferenceCache.set(estimateId, { loadedAt: Date.now(), preferences });
      return preferences;
    })
    .finally(() => {
      accountPreferenceLoadPromises.delete(estimateId);
    });

  accountPreferenceLoadPromises.set(estimateId, loadPromise);
  return loadPromise;
}

export async function saveEstimateSheetAccountPreferences(input: SaveEstimateSheetUserPreferencesInput) {
  const result = await saveEstimateSheetUserPreferences(input);
  if (result.ok) invalidateAccountPreferences(input.estimateId);
  return result;
}
