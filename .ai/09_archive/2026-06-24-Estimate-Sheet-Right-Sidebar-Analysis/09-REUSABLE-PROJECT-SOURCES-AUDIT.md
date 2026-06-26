# 09 — Reusable Project Sources Audit

## Progressive hierarchy

```
Project → Estimate → Tab → Area (node) → Component Row
```

Each level loads on expand, not upfront.

## Initial project load

- **Trigger**: `activeTab === "templates"` AND `enableReusableProjectSources === true`
- **Server call**: `listReusableProjectSources()` — returns all accessible workspace projects (excludes pending-invite projects)
- **Scope**: workspace-scoped (all projects the user can access)
- **Current project inclusion**: ✅ — the current project appears in the list
- **Loading skeleton**: `useDelayedIdSet` gates loading state behind 150ms delay to avoid flash on warm expands
- **Retry**: toast with retry on failure
- **Cancellation on unmount**: React Query handles this via `gcTime`
- **Cancellation on tab switch**: the effect's cleanup runs, but **in-flight server actions are not AbortController-cancelled** — they complete and the result is discarded
- **Stale after workspace switch**: React Query keys are workspace-scoped, so switching workspaces triggers a fresh load. ✅

## Project expansion (load estimates)

- **Trigger**: expand toggle on a project row
- **Server call**: `listReusableProjectEstimateSources({ projectId })`
- **Hover prefetch**: ✅ — `onPrefetchNode` fires on `onMouseEnter` (`TemplatesTree.tsx:516`), warming the next level
- **Dedup**: `projectEstimateLoadedProjectIdsRef` (Set) tracks which projects have already loaded their estimates. **But**: this ref is NOT cleared on tab switch or workspace switch — it grows monotonically. **Minor memory leak** but bounded by workspace size.
- **Error feedback**: toast
- **Collapse while loading**: the skeleton stays until load completes; collapse removes it from view but the promise continues

## Estimate expansion (load outline)

- **Trigger**: expand toggle on an estimate row
- **Server call**: `getReusableEstimateOutline({ projectId, estimateId })` — fetches all tabs + their node trees
- **Tab list**: from `getEstimateTabs` with legacy fallback (synthetic "Main" tab)
- **Node limits**: `REUSABLE_SOURCE_SEARCH_TREE_NODE_LIMIT = 600`, `REUSABLE_SOURCE_SEARCH_TREE_ROW_ITEM_LIMIT = 1200`
- **Search-result merging**: `mergeReusableProjectSources()` and `mergeReusableSourcesByKey()` deduplicate by key (project/estimate/tab/node id)

## Server-side search

- **Trigger**: search input in the Templates tab (debounced)
- **Server call**: `searchReusableProjectSources({ query })`
- **Debounce**: inferred from the effect pattern; background agent verifying exact implementation
- **ILIKE escaping**: ✅ `toReusableSearchLikePattern` (`actions.ts:114-116`) escapes `%`, `_`, `\`
- **Scan limits**: `REUSABLE_SOURCE_SEARCH_PROJECT_SCAN_LIMIT = 50`, `ESTIMATE_SCAN_LIMIT = 200`, `NODE_MATCH_LIMIT = 300`, `TAB_MATCH_LIMIT = 120`, `MATERIALIZED_ESTIMATE_LIMIT = 25`
- **Pre-filter**: two bounded indexed ILIKE queries (on `estimate_nodes.name` and `estimate_tabs.name`) before materializing rich tab/node sources — this is the U5/PERF-1 optimization
- **"Page 001" handling**: the first rendered tab displays as "Page 001" even when stored as "Main" — the search handles this with an exact-match check on the display label, not a substring match (to avoid selecting every estimate for short queries)
- **Cancellation**: ❌ **NO AbortController or request-identity guard** — a slow earlier query can arrive after a newer query and overwrite results. **Finding F-04** (P1)
- **Out-of-order response risk**: HIGH — the `mergeReusableSourcesByKey` function unconditionally overwrites by key, so a stale response's sources replace the current response's sources for matching keys

## Preview

- **Opening**: row click on project/estimate/tab/node source → `setPreviewProjectSourceKey(key)`
- **Metadata**: project name, estimate name, sheet code, tab name, node path, last updated, row count, total cost
- **"Live source" / "Read-through source" chips**: **MISLEADING** — see Finding F-11. Insertion is a snapshot copy, not a live link.
- **Insertability**: only `project-tab` and `project-node` sources are insertable. Project and estimate rows show "Expand this source to choose a tab or group/area before inserting it."
- **Closing**: X button or selecting another preview

## Insertion

- **Entry**: context menu "Add to estimate" / preview "Add" button / drag / bulk
- **Server call**: `insertProjectSourceIntoEstimate` → RPC `insert_estimate_subtree_into_estimate_with_history`
- **Correlation id**: deterministic SHA-256-derived UUID from the insert unit — enables replay-safe dedup
- **Source re-resolution**: the server RE-READS the source estimate by id under the RLS-scoped user client at insert time (DATA-4 / denial 7 protection). If the source was deleted between browse and insert, a clear error is thrown.
- **Result**: returns the refreshed target tab's tree + `insertedRootNodeIds`
- **Snapshot vs live**: **SNAPSHOT** — the RPC copies the subtree. No ongoing link. Changes to the source after insertion do not propagate.
- **Tab-scoped refresh**: RS-1 — the refreshed tree is loaded for the tab the user is editing (`targetTabId`), not the default tab
- **Out-of-order**: if two inserts fire concurrently, the second insert's tree response could overwrite the first's. The deterministic correlation_id prevents duplicate inserts, but concurrent DIFFERENT-source inserts could still race. **Medium risk** — sequential insertion is safer.

## Read-only guarantees

Project sources are **read-only in the sidebar** — the TemplatesTree context menu for `project-tab` and `project-node` types only offers "Add to estimate" (insert). No create/edit/delete/save-as-template. **VERIFIED**: `TemplatesTree.tsx:404-427`.

**Server-side enforcement**: the RPC `insert_estimate_subtree_into_estimate_with_history` re-checks `can_edit_estimate` (target) + source accessibility. A read-only project member cannot insert even if the client UI is bypassed.
