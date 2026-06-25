// Shared TanStack query keys for the workspace component library. The in-estimate
// panel (consumer) and the estimate-row hover prefetch must use the EXACT same key
// or the prefetch silently misses the cache.

// Full dataset (with the per-item price-option/version/history graph) — used by
// editor surfaces that need the complete component/template contract. The
// Components browse tab uses the rows-only key below and hydrates selected-row
// detail separately.
const WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY = ["workspace-component-library"] as const;

export function workspaceComponentLibraryQueryKey(workspaceId: string) {
  return [...WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY, "workspace", workspaceId] as const;
}

// U18/U19: the in-estimate Templates panel uses the LITE dataset under a distinct
// sub-key so it never serves incomplete (detail-graph-less) data to the full-graph
// editor surfaces. Note the shared scoped prefix: a non-exact
// `invalidateQueries({ queryKey: workspaceComponentLibraryQueryKey(workspaceId) })`
// still invalidates this lite key without crossing workspace boundaries.
const WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_SEGMENT = "lite";

export function workspaceComponentLibraryLiteQueryKey(workspaceId: string, projectId?: string) {
  return projectId
    ? [...workspaceComponentLibraryQueryKey(workspaceId), WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_SEGMENT, "project", projectId] as const
    : [...workspaceComponentLibraryQueryKey(workspaceId), WORKSPACE_COMPONENT_LIBRARY_LITE_QUERY_SEGMENT] as const;
}

// Library Optimization Plan P0 T3 — the Components *management* tab (LibraryPageClient
// -> ComponentLibraryManager) caches its OWN dataset shape: ComponentRowsLibraryDataset
// (rows + tree + suppliers + brands + folders, NO templates). This is a DIFFERENT shape
// from the editor dock's full ComponentLibraryDataset above, so it MUST use a distinct
// key (D4) — sharing ["workspace-component-library"] would let the two surfaces fight
// over one entry with different shapes/freshness. Reused by T4 cache invalidation.
export const WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY = ["workspace-component-rows-library"] as const;

export function workspaceComponentRowsLibraryQueryKey(workspaceId: string, projectId?: string) {
  return projectId
    ? [...WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, "workspace", workspaceId, "project", projectId] as const
    : [...WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY, "workspace", workspaceId] as const;
}

// Library Optimization Plan P0 T3 — the Templates browse tab caches EstimateTemplate[].
// Keep tenant-scoped template data partitioned by the authenticated principal and
// workspace so a warm app-level QueryClient can never reuse one login's data for
// another login or workspace.
export const WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY = ["workspace-estimate-templates"] as const;

export type WorkspaceEstimateTemplatesQueryScope = {
  userId: string;
  workspaceId: string;
};

export function workspaceEstimateTemplatesQueryKey({ userId, workspaceId }: WorkspaceEstimateTemplatesQueryScope) {
  return [...WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY, workspaceId, userId] as const;
}
