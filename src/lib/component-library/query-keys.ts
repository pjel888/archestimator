// Shared TanStack query keys for the workspace component library. The in-estimate
// panel (consumer) and the estimate-row hover prefetch must use the EXACT same key
// or the prefetch silently misses the cache.

// Full dataset (with the per-item price-option/version/history graph) — used by the
// Library management surfaces (template editor, component manager).
export const WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"] as const;

// U18/U19: the in-estimate Templates panel uses the LITE dataset under a distinct
// sub-key so it never serves incomplete (detail-graph-less) data to the full-graph
// editor surfaces. Note the shared prefix: a non-exact
// `invalidateQueries({ queryKey: WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY })` still
// invalidates this lite key.
export const WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY = ["workspace-component-library", "lite"] as const;

export function workspaceComponentLibraryLiteQueryKey(projectId: string) {
  return [...WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_KEY, "project", projectId] as const;
}

// Library Optimization Plan P0 T3 — the Components *management* tab (LibraryPageClient
// -> ComponentLibraryManager) caches its OWN dataset shape: ComponentRowsLibraryDataset
// (rows + tree + suppliers + brands + folders, NO templates). This is a DIFFERENT shape
// from the editor dock's full ComponentLibraryDataset above, so it MUST use a distinct
// key (D4) — sharing ["workspace-component-library"] would let the two surfaces fight
// over one entry with different shapes/freshness. Reused by T4 cache invalidation.
export const WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY = ["workspace-component-rows-library"] as const;

// Library Optimization Plan P0 T3 — the Templates browse tab caches EstimateTemplate[].
export const WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY = ["workspace-estimate-templates"] as const;
