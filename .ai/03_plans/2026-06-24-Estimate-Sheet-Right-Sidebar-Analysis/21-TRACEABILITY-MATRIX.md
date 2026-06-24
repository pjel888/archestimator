# 21 — Traceability Matrix

> Every P1 and P2 finding maps to a product decision, implementation task, test, and validation step.

## P1 findings

| Finding | Decision (doc 20) | Task (doc 18) | Files | Test (doc 16/19) | Validation |
| --- | --- | --- | --- | --- | --- |
| F-01: Delete calls `onLibraryDataChanged` (false signal) | Q6: Archive | 1.1: Wire delete to `executeBulkArchiveLibraryComponents` | `component-library/index.tsx`, `component-library/actions.ts` | Delete → refresh → archived; undo → restore | `bun run validate` + manual |
| F-03: `createComponent()` is local-only | Q4/Q5: Persist | 1.2: Remove legacy form; 1.3: Wire duplicate to server | `component-library/index.tsx`, `NewComponentForm.tsx`, `AddComponentModal.tsx` | Edit → refresh → persisted; duplicate → refresh → new row | `bun run validate` + manual |
| F-04: Search no cancellation | Q16: Add guard | 1.6: Request-identity guard | `component-library/index.tsx` | Stale response test (deferred resolution) | Unit test |
| F-10: Template groups local-only | Q14: Remove | 1.5: Remove "New Template Group" affordance | `component-library/index.tsx` | Group button absent; categories from templates | Component test |
| F-11: "Live source" misleading | Q15: Snapshot | 1.4: Replace chips + insert toast | `component-library/index.tsx` | "Snapshot copy" chip; no "Live source" text | Component test |

## P2 findings

| Finding | Decision | Task | Files | Test | Validation |
| --- | --- | --- | --- | --- | --- |
| F-02: Project tab name ambiguous | Q2: "Project Components" | 2.1: Rename tab | `component-library/index.tsx` | Tab text check | Component test |
| F-07: Favorites/recents device-local | Q8: Browser-local for now | (defer) | N/A | N/A | N/A |
| F-08: Custom ordering device-local | Q9: Browser-local for now | (defer) | N/A | N/A | N/A |
| F-09: Folder delete/reparent absent | Q10: Add delete | 2.2: Add delete to context menu | `LibraryTree.tsx`, `actions.ts` | Delete folder → refresh → gone | Integration test |
| F-12: Below-1024px no access | Q24: Not now | (defer Phase 4) | N/A | N/A | N/A |
| F-13: Giant reducer | — | 3.3: Extract hooks (tracked in react-doctor plan) | `component-library/index.tsx` | Behavior tests pass | Full `validate` |
| F-14: Folder rename focus race | — | 3.5: Fix focus handoff | `LibraryTree.tsx` | Context-menu rename → input focused | Manual + a11y test |

## P3 findings

| Finding | Task | Validation |
| --- | --- | --- |
| F-15: Hover prefetch dedup | 3.4: Add dedup Set | Network count test |

## Audit hypotheses verification (from prompt §30)

| # | Hypothesis | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Third tab is Templates, not Component | **VERIFIED** | `index.tsx:149-157`, test `:426` |
| 2 | Component creation uses persisted shared modal | **PARTIALLY TRUE** | AddComponentModal persists; legacy NewComponentForm does not |
| 3 | Some edit/duplicate/delete paths are local-only | **VERIFIED** | `createComponent()` helper, F-03/F-05/F-06 |
| 4 | Local-only action invokes library cache invalidation | **VERIFIED** | Delete calls `onLibraryDataChanged()`, F-01 |
| 5 | Local deletion reappears after refresh | **VERIFIED** | Code-path analysis, F-01 |
| 6 | Undo restores only local state | **VERIFIED** | Undo restores from local ref, not DB |
| 7 | Favorites/recents are browser-local | **VERIFIED** | `LIBRARY_FAVORITES_KEY`, `LIBRARY_RECENTS_KEY` |
| 8 | Custom tree ordering is browser-local | **VERIFIED** | `LIBRARY_TREE_ORDER_KEY` |
| 9 | Folder create+rename persist; delete+reparent absent | **VERIFIED** | F-09 |
| 10 | Folder creation forces Library/default view | **VERIFIED** | `component-library-ui.test.tsx` — create switches to default view |
| 11 | Template groups local until template assigned | **VERIFIED** | F-10: groups are purely local state |
| 12 | Project sources reload on Templates activation | **VERIFIED** | Effect triggers on `activeTab === "templates"` |
| 13 | Search requests not cancellable | **VERIFIED** | F-04: no AbortController |
| 14 | Old search responses arrive after newer | **VERIFIED (RISK)** | No request-identity guard, F-04 |
| 15 | Insertion responses arrive out of order | **PARTIALLY TRUE** | Revision guard protects tab tree; but concurrent different-source inserts could race |
| 16 | Bulk insert partially succeeds | **VERIFIED (DESIGN)** | Sequential per-item insertion; errors isolated |
| 17 | Component row in both copy-drag and reorder | **VERIFIED** | `LibraryTree.tsx:501-507` |
| 18 | Search disables reorder but leaves external drag | **VERIFIED** | `effectiveExpandedIds` reveals all; reorder guarded by `searchActive` |
| 19 | Project tab shows projections; Templates has project sources | **VERIFIED** | F-02 |
| 20 | Some labels say "group" despite Area model | **VERIFIED** | `summarizeEstimateTemplate` still counts groups; some copy strings |
| 21 | Sidebar hidden below desktop breakpoint | **VERIFIED** | F-12: `hidden lg:flex` |
| 22 | Orchestrator rerenders broadly | **VERIFIED** | F-13: single reducer, ~40 fields |
| 23 | Thumbnails create excessive network | **PARTIALLY TRUE** | `unoptimized` images; thumbnailPath exists but unused in sidebar |
| 24 | Tests rely on source-string assertions | **PARTIALLY TRUE** | `estimate-sheet-library-lazy-load.test.tsx:91-97` reads page source file |
| 25 | Success copy not always server-confirmed | **VERIFIED** | F-01: "removed from this sidebar view" implies local-only; F-11: "Live source" implies sync |
