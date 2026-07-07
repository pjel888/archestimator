"use client";

import {
  loadComponentLibraryUserPreferences,
  saveComponentLibraryUserPreferences,
  type ComponentLibraryUserPreferences,
} from "@/lib/component-library/actions";

const ACCOUNT_PREFERENCES_CACHE_TTL_MS = 30_000;

let accountPreferencesLoadPromise: Promise<ComponentLibraryUserPreferences | null> | null = null;
let accountPreferencesCache: {
  loadedAt: number;
  preferences: ComponentLibraryUserPreferences | null;
} | null = null;
let accountPreferencesCacheVersion = 0;

function getCachedAccountPreferences():
  | { hit: true; preferences: ComponentLibraryUserPreferences | null }
  | { hit: false } {
  if (!accountPreferencesCache) return { hit: false };
  if (Date.now() - accountPreferencesCache.loadedAt > ACCOUNT_PREFERENCES_CACHE_TTL_MS) {
    accountPreferencesCache = null;
    return { hit: false };
  }
  return { hit: true, preferences: accountPreferencesCache.preferences };
}

function clearAccountPreferencesCache() {
  accountPreferencesCacheVersion += 1;
  accountPreferencesLoadPromise = null;
  accountPreferencesCache = null;
}

export function resetComponentLibraryAccountPreferencesClientCacheForTests() {
  clearAccountPreferencesCache();
}

export function loadComponentLibraryAccountPreferences() {
  const cached = getCachedAccountPreferences();
  if (cached.hit) return Promise.resolve(cached.preferences);
  if (accountPreferencesLoadPromise) return accountPreferencesLoadPromise;

  const loadVersion = accountPreferencesCacheVersion;
  accountPreferencesLoadPromise = loadComponentLibraryUserPreferences()
    .then((preferences) => {
      if (loadVersion === accountPreferencesCacheVersion) {
        accountPreferencesCache = { loadedAt: Date.now(), preferences };
      }
      return preferences;
    })
    .finally(() => {
      if (loadVersion === accountPreferencesCacheVersion) {
        accountPreferencesLoadPromise = null;
      }
    });

  return accountPreferencesLoadPromise;
}

export async function saveComponentLibraryAccountPreferences(preferences: ComponentLibraryUserPreferences) {
  const result = await saveComponentLibraryUserPreferences(preferences);
  if (result.ok) clearAccountPreferencesCache();
  return result;
}
