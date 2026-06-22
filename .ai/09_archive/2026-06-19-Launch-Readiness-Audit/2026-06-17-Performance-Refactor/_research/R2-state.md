# R2 — State Architecture Dossier (TanStack Query + Zustand + Optimistic Mutations + Derived State)

Scope: TanStack Query keys/settings, Zustand stores, optimistic mutation flows, derived/local state.
Method: graph + targeted reads. Every claim cites `path:line — observation`. READ-ONLY audit.

---

## Query architecture (key inventory + settings)

### Query-key factories (5 separate, inconsistent conventions)
- `src/hooks/use-estimate-query.ts:10-16` — `estimateQueryKeys` factory: `detail`, `tabs`, `tabTree`, `areaTree`. Comment at `:14` flags `areaTree` as **legacy kept for compatibility** — two parallel key shapes (`tabTree` vs `areaTree`) coexist; every mutation branches `estimateTabId ? tabTree : areaTree` (e.g. `use-estimate-row-mutations.ts:204, 212, 229, 278, 303, 313, 328, 353, 383, 394`). This ternary is repeated ~14 times.
- `src/lib/favorites/query-keys.ts:1-5` — `favoritesQueryKeys` factory (`all`, `sidebar(scope)`). Clean nested-factory pattern (the model to standardize on).
- `src/features/notifications/hooks/useNotificationsQuery.ts:19-24` — `notificationQueryKeys` factory (`all`, `feed`, `unreadCount`, `releaseModal`). Also clean.
- `src/lib/component-library/query-keys.ts:7-47` — **bare `as const` array constants** (`WORKSPACE_COMPONENT_LIBRARY_QUERY_KEY` etc.) + standalone builder fns (`workspaceComponentLibraryLiteQueryKey`, `workspaceComponentRowsLibraryQueryKey`, `workspaceEstimateTemplatesQueryKey`). A 3rd, different convention.
- `src/hooks/use-project-collaboration-query.ts:16-18` — `projectCollaborationQueryKey(projectId)` inline standalone fn. A 4th convention.
- Inline ad-hoc keys also exist: `EstimateSheetContent.tsx:1181-1183` builds `lazyLibraryQueryKey` via the component-library builder.

Net: **5 different key-definition styles** (nested factory ×3, bare-const+builders ×1, standalone-fn ×1). No single source of truth; mutation invalidation must hand-replicate the `tabTree/areaTree` branch.

### staleTime / gcTime settings (no central policy)
- Global default `src/app/providers.tsx:18-19` — `staleTime 5*60_000`, `gcTime 5*60_000`, `refetchOnWindowFocus:false`, `retry:1`.
- Estimate trees `use-estimate-query.ts:47,108,161` — `staleTime 5*60_000` (redundant with global).
- Collaboration `use-project-collaboration-query.ts:30` — `staleTime 60_000`.
- Sidebar favorites `use-sidebar-favorites-query.ts:30` — `staleTime: 0` (intentional override; comment cites D4 so remount + onSettled refetch).
- Notifications `useNotificationsQuery.ts:15-17,60,69,78` — three named constants (30s/30s/60s).
- Lazy library `EstimateSheetContent.tsx:1193,1196` — `staleTime 5*60*1000`, **`gcTime 30*60*1000`** (long-warm cache).
- Repeated literal `5 * 60 * 1000` / `5 * 60_000` appears in ≥7 sites (`ProjectEstimatesTable.tsx:817,822,827`, `LibraryPageClient.tsx:105`, `templates-browse:76`, `template-editor:162`, estimate trees) — all duplicating the global default, mostly unnecessary.

### invalidate vs setQueryData
- `setQueryData` (direct cache writes) used in 9 files; heaviest: `use-estimate-row-mutations.ts` (8), `use-estimate-query.ts` (8), `useNotificationsQuery.ts` (9).
- `invalidateQueries` 31 call sites; `refetchType` qualifier on 22 of them. The codebase leans heavily on `refetchType:"none"` to mark-stale-without-refetch after an optimistic `setQueryData` (e.g. `use-estimate-row-mutations.ts:212,213,253,254,308,309,388,389,401`). This is a deliberate, repeated 2-step idiom (write cache, then invalidate-none) — a prime kernel candidate.

---

## Zustand stores (enumerated)

| Store | File | Shape | Selector granularity | Notes |
|---|---|---|---|---|
| `useEstimateWorkspaceState` | `src/hooks/use-estimate-workspace-state.ts:30-93` | 5 record maps: `selectedNodeIdByEstimateId`, `expandedNodeIdsByEstimateId`, `selectedNodeIdByTabId`, `expandedNodeIdsByTabId`, `activeTabIdByEstimateId` | Good — selectors index by id (`:127, :158, :181`), and setters bail early when unchanged (`:38, :50, :61, :73, :84`) | `expandedNodeIds` stored as **`string[]`** with O(n) `areNodeIdsEqual` (`:105-108`) per set — set/map would be O(1). UI state correctly in Zustand. |
| `useEstimateUiStore` | `src/stores/estimate-ui-store.ts:34-51` | `selectedNodeId`, `focusedCell`, `selectedRowIds: string[]`, `expandedNodeIds: string[]`, `activityScopeDirectOnly: Record`, `dragState` | Coarse — single global store; `dragState` is high-frequency (drag move) and lives beside selection | **`dragState` mutates on every drag-over** (`:49`); any component subscribing to the whole store re-renders per pointer move. `selectedRowIds`/`expandedNodeIds` as arrays. **Overlaps `useEstimateWorkspaceState`** (both hold selectedNodeId/expandedNodeIds) — two stores model the same concept. |
| `useEstimateColumnWidthsStore` | `src/stores/estimate-column-widths-store.ts:59-112` | `widthsByEstimateId`, `lastUsedWidths`, `hydratedEstimateIds` | Selector-scoped at consumer (`EstimateSheetContent.tsx:1108-1113`) | localStorage-backed; clean. |
| `useNavigationUiStore` | `src/stores/navigation-ui-store.ts:35-84` | `isNavigating`, `startTime`, `targetHref` + timer module-globals | Fine | Pure UI; module-level timers (`:22-25`). Clean. |
| `useEstimateHeaderActionsStore` | `src/components/workshop/use-estimate-header-actions-store.ts:33-38` | `openActivity`, `openProposalPreview`, `canPreviewExport` | Whole-store | **Stores React callbacks** as cross-tree event bridge — works but couples render trees via a global. Co-located (not in `src/stores`). |
| `createProjectEstimatesStore` (vanilla, per-mount) | `src/stores/project-estimates-store.ts:35-102` | `estimates: ProjectEstimateListRow[]`, `pendingInsertIds: Set<string>` | Per-mount instance store | **Holds server state** (estimate list rows) in Zustand — the canonical "server state in client store" anti-pattern, mitigated only by `reseed` from props (`:40-48`). Has its own bespoke optimistic insert/reconcile/rollback/remove (`:50-95`) — a 2nd parallel optimistic engine to TanStack's. |

Anti-pattern summary: (1) **two stores model selection/expansion** (`use-estimate-workspace-state` vs `estimate-ui-store`); (2) **server state in Zustand** (`project-estimates-store`); (3) **high-frequency `dragState` in a shared store**; (4) **arrays where sets/maps fit** (`selectedRowIds`, `expandedNodeIds`).

---

## Optimistic mutations (per-flow table)

| Flow | File:line | Pending-id strategy | Reconcile | Rollback |
|---|---|---|---|---|
| Row update (cell edit) | `use-estimate-row-mutations.ts:347-403` | `mutationId` (uuid) + per-row `operationId` counter (`:201,351`) + per-row serialized promise queue (`rowUpdateQueuesRef`, `:202,426-436`) | `setQueryData` patch w/ `toServerRowPatch`, gated on `operationId` match (`:382,384`) | `context.previousPatch` via `patchEstimateRowItemInTree` (`:395-398`); falls back to `input.rollback?.()` |
| Row insert (from library) | `use-estimate-row-mutations.ts:224-262` | `mutationId` only (`:419-424`); **no optimistic onMutate** (server-source not resident, see `:1201` comment) | `setQueryData` patch on success (`:231-251`) | `input.rollback?.()` (`:257`) |
| Row replace | `use-estimate-row-mutations.ts:264-267` (uses shared `mutationOptions:206-222`) | `mutationId` + `expectedRowRevision` | invalidate-none only | `input.rollback?.()` (`:216`) |
| Row delete | `use-estimate-row-mutations.ts:269-272` (shared `mutationOptions`) | `mutationId` + `expectedRowRevision` | invalidate-none | `input.rollback?.()` |
| Row detach | `use-estimate-row-mutations.ts:274-322` | `mutationId` + `expectedRowRevision` | onMutate patch + onSuccess `toDetachedRowPatch` (`:302-306`) | `context.previousPatch` (`:312-318`) — its OWN snapshot logic, different from update's |
| Row promote | `use-estimate-row-mutations.ts:324-345` | `mutationId` | onSuccess `toPromotedRowPatch` + 4 cross-key invalidations (`:333-336`) | `input.rollback?.()` |
| Move row item | `use-estimate-query.ts:167-184` | none | onMutate `moveEstimateRowItem` on `detail` key (`:176`); `onSettled` **refetch** invalidate (`:182`) | `context.previous` whole-tree restore (`:180`) — **different rollback shape** (full snapshot, not patch) |
| Tree reorder (drag) | `use-estimate-query.ts:59-79` via `setTree`/`snapshot`/`restore`/`getTreeRevision` + revision counter | revision counter (`:50-58,111-119`) | `setTree` writes cache, bumps revision | `restore(prev, expectedRevision)` guarded by revision match (`:70-75`) — a THIRD rollback model |
| Project favorite toggle | `use-toggle-project-favorite.ts:19-37` | none | onMutate `patchSidebarFavoritesCache`; `onSettled` invalidate (`:36`) | `ctx.previousSidebar` snapshot (`:35`) |
| Estimate favorite toggle | `use-toggle-estimate-favorite.ts:22-51` | none | onMutate patches BOTH sidebar cache AND `project-estimates-store` (`:34,43`); `onSettled` invalidate | dual rollback: `ctx.previousSidebar` + store `patch` (`:46-49`) |
| Project estimate list (create/dup/delete/edit) | `project-estimates-store.ts:50-95` | `pendingInsertIds: Set` (`:38,51-55`) | `reconcileInsert(tempId,row)` (`:57-65`) | `rollbackInsert`/`removeOptimistic` returns position-restoring closure (`:67-95`) |
| Collaborator role | `use-project-collaboration-query.ts:45-63` | none | `setQueryData` map-patch (`:51-62`); invalidate elsewhere | none (no rollback) |
| Notifications (read/dismiss/ack) | `useNotificationsQuery.ts:83-164` | none | `setQueryData` on feed + unread-count + release-modal, then invalidate-none (`:93-105`) | **none** — no onError rollback on any of the 3 mutations |

**At least 5 distinct rollback mechanisms** coexist: (a) patch-based `context.previousPatch` (row update/detach), (b) whole-tree `context.previous` (move), (c) revision-guarded `restore` (reorder), (d) cache-snapshot `ctx.previousSidebar` (favorites), (e) closure-returning `removeOptimistic` (project list). Plus flows with no rollback (notifications, collaborator role).

---

## Derived/local state

- `src/components/workshop/EstimateSheetContent.tsx` is **2949 lines** with **109 `useState/useMemo/useRef/useCallback`** occurrences — local-state sprawl epicenter.
- **`editableRows` fan-out (confirms R4):** single `useState<Record<string, EditableRowValue>>` at `:1093`. Read by **6+ tree-wide memos**: `getProposalPreviewSignature` (`:1252,1258`), `estimateNodeTotals = computeNodeTotals(tree, editableRows)` (`:1401`), `displayedNodeTotals` (`:1405-1406`), `currentRows = flattenEstimateRows` (`:1413-1414`), `activityScopeItems` (`:1423,1429`), proposal preview model `materializeEditableEstimateTree` (`:1590,1596`). Plus read in ~10 mutation handlers as `previousRows` (`:1817,1974,2034,2081,2192,2328,2372,2434,2487,2512`). One keystroke replacing the `editableRows` map identity recomputes every one of these whole-tree memos.
- **`getEstimateTreeContentSignature` (confirms R3):** `estimate-tree-reorder.ts:181-220` builds a nested array of ~19 fields per row for **every row in the whole tree** then `JSON.stringify`s it. Called in `EstimateSheetTree.tsx:300,301,411,418,440` — including two refs computed on the **initial render** (`:300-301`) and on each incoming-nodes diff (`:411,418,440`). O(rows × fields) stringify per reconcile pass.
- `bulkSelectedRowIds` correctly a `Set<string>` (`:1099`) — good; but `selectedRowIds`/`expandedNodeIds` in `estimate-ui-store` are arrays.
- `mergeEstimateTreeStructureWithCachedNodes` (`estimate-tree-reorder.ts:222-251`) rebuilds a `Map` index + clones every node each call (confirms R3 reconciliation path).
- Tree-as-mutable-state (confirms R3): `useEstimateAreaTreeQuery`/`useEstimateTabTreeQuery` return `setTree`/`snapshot`/`restore`/revision (`use-estimate-query.ts:59-82,120-143`) — the TanStack cache doubles as optimistic mutable state via a hand-rolled revision counter stored under a sibling `...queryKey,"revision"` key (`:40,101`).

---

## Repeated patterns → candidate kernels

1. **Optimistic-mutation adapter.** 13 mutation flows hand-roll the same skeleton (onMutate snapshot → setQueryData patch → onError rollback → onSettled/onSuccess invalidate-none). Standardize a `createOptimisticMutation({ key, patch, rollback })` helper. Subsumes the 5 divergent rollback mechanisms and the `withMutationIdentity`/`mutationId`/`operationId` boilerplate (`use-estimate-row-mutations.ts:411-436`).
2. **Query-key factory.** Collapse the 5 styles into one nested-factory module (favorites/notifications are the template). Critically, fold the `estimateTabId ? tabTree : areaTree` branch (repeated ~14×) into a single `estimateQueryKeys.tree(estimateId, tabId?)` resolver.
3. **`setQueryData` + `invalidate(refetchType:"none")` idiom** (22 refetchType sites) → one `patchAndMarkStale(client, key, updater)` helper.
4. **Tree-patch reconciliation.** `patchEstimateRowItemInTree` + `findEstimateRowItemInTree` + per-flow `toXxxRowPatch` builders are a reusable patch kernel already half-formed; centralize the optimistic-vs-server patch pair.
5. **Selection/expansion store unification.** Merge `estimate-ui-store` and `use-estimate-workspace-state` into one workspace store; switch `selectedRowIds`/`expandedNodeIds` to `Set`/`Map`. Split high-frequency `dragState` into its own store/atom.
6. **Signature kernel.** Replace full-tree `JSON.stringify` content signature with structural hashing or per-row dirty tracking (revision counters already exist for structure).

---

## Top findings (ranked)

1. **`editableRows` single-map fan-out** — `EstimateSheetContent.tsx:1093` feeds 6+ whole-tree memos (`:1401,1405,1413,1429,1590` + signature `:1252`); every keystroke (map identity change) triggers full-tree recompute. (Confirms R4.) HIGH.
2. **`getEstimateTreeContentSignature` full-tree JSON.stringify** — `estimate-tree-reorder.ts:181-220`, called 5× in `EstimateSheetTree.tsx` incl. on initial render; O(rows×19 fields) per reconcile. (Confirms R3.) HIGH.
3. **13 hand-rolled optimistic flows, 5 rollback mechanisms** — `use-estimate-row-mutations.ts`, `use-estimate-query.ts:167-184`, favorites/list hooks. No shared adapter; notifications + collaborator-role have NO rollback (`useNotificationsQuery.ts:83-164`, `use-project-collaboration-query.ts:45-63`). HIGH (correctness + maintainability).
4. **5 query-key conventions + repeated tabTree/areaTree branch** — `use-estimate-query.ts:10-16` (legacy areaTree), component-library bare consts, ×3 inline fns; branch replicated ~14×. MEDIUM.
5. **Server state in Zustand + duplicate selection stores** — `project-estimates-store.ts:35-102` holds estimate rows with its own optimistic engine; `estimate-ui-store` overlaps `use-estimate-workspace-state` on selection/expansion; `dragState` high-frequency in a shared store. MEDIUM.

---

## Sibling-claim confirmations / corrections

- **R3 — CONFIRMED.** `mergeEstimateTreeStructureWithCachedNodes` + structure/content signatures (`estimate-tree-reorder.ts:168-251`), scoped TanStack cache doubling as mutable optimistic state via `setTree`/revision counters (`use-estimate-query.ts:13-15` keys, `:50-82,111-143` machinery). `getEstimateTreeContentSignature` JSON.stringifies the whole tree (`:181-220`). `expandedNodeIds`/`bulkSelectedNodeIds`: expansion lives in both Zustand stores; bulk selection is the local `bulkSelectedRowIds` Set (`EstimateSheetContent.tsx:1099`), not a Zustand `bulkSelectedNodeIds` — verify exact naming with R3.
- **R4 — CONFIRMED.** selection/active-tab in `use-estimate-workspace-state.ts:30-93`; column widths in `estimate-column-widths-store.ts`; activity scope (`activityScopeDirectOnly`) in `estimate-ui-store.ts:39`; cross-tree header actions in `use-estimate-header-actions-store.ts`. `editableRows` central fan-out confirmed (finding 1). ~15 row mutations: I count 13 distinct mutation flows in the hooks layer (table above) plus more inline handlers in EstimateSheetContent — consistent.
- **R1 — PARTIAL CORRECTION.** `project-estimates-store.ts` does NOT call `router.refresh()` — the only `router.refresh` references in that file are **prose comments** (`:11,16`) describing what the store *replaced*. The real `router.refresh()` lives in the consumer `ProjectEstimatesClient.tsx:215`. `router.refresh()` appears across **11 files** (rg confirmed), corroborating R1's "router.refresh vs scoped invalidation" tension (~12 claim ≈ correct).

## Open questions
- Should `editableRows` move into the TanStack tree cache (single source) or become per-row atoms to kill the fan-out? Interacts with R3's tree-as-cache model.
- Is the per-row `operationId` + promise-queue (`use-estimate-row-mutations.ts:201-202,426-436`) still needed if a standardized optimistic adapter handles ordering?
- Can the `tabTree`/`areaTree` legacy split be fully retired (key factory item 2), or is `areaTree` still load-bearing for any non-tab estimate?
- `useNotificationsQuery` mutations have no onError rollback — intentional (optimistic-but-eventually-consistent) or a latent bug?
