# Prioritized Performance Recommendations — Oracle-Corrected

**Date**: 2026-06-11
**Prior Review**: Oracle-audited (ses_14d7fd71bffeTjzSxp7XMF1sQk)
**Sorted by**: Impact x urgency / effort, then corrected by current source inspection on 2026-06-11
**Current Gate**: Do not implement from this file alone. Execute [13-implementation-readiness-plan.md](./13-implementation-readiness-plan.md) and [14-adversarial-qa-matrix.md](./14-adversarial-qa-matrix.md) first.

---

## Critical Oracle Findings (Blind Spots in Initial Audit)

1. **`projectTotal` is NOT memoized** — Line 3488 of `EstimateSheetContent.tsx`: bare variable in render body, recalculates on EVERY state change (even unrelated ones). This was the #1 missed bottleneck.
2. **React render waterfall** — `EstimateSheetBranch` is recursively rendered; no `React.memo`, no `useDeferredValue`, no `useTransition`, and no `useOptimistic` appear in the 4,336-line component in the current worktree snapshot.
3. **`computedRows` does 500+ object spreads per keystroke** in `EstimateRowItemsTable` — a pure computation waste independent of DOM count.
4. **No React 19 concurrent features used** — `useDeferredValue`, `useOptimistic`, `startTransition`, `use()` all unused. Manual debounce + manual rollback patterns replicate what React 19 provides natively.
5. **Pointer-move handler does DOM traversal at 60fps** — in addition to the 80ms-throttled broadcast, the `onPointerMove` handler traverses the DOM tree for hit-testing.

---

## Implementation Sequence (Oracle-Corrected)

```
Baseline — Proof Before Changes (0.5-1 day):
  B0a: Capture 50/200/500-row load and keystroke traces
  B0b: Pin current editing, totals, drag/drop, bulk selection, and cursor behavior
  B0c: Record bundle/payload/select-star baseline

Sprint 0 — Low-risk render relief (0.5-1 day):
  S0a: React.memo on EstimateRowItemsTable
  S0b: Memoize projectTotal (useMemo)
  S0c: Keep all input semantics unchanged; do not introduce deferred row state yet

Sprint 1 — Data Layer (3 days):
  R2: select('*') → explicit columns  [Day 1-2]
  R3: Parallelize data fetching        [Day 2-3]
  R-E1: Replace estimate-list JS aggregate with SQL/RPC aggregate [Day 2]
  R7: Add composite indexes            [Day 2]
  R8: Replace backgroundImage → next/image only after URL/layout/network proof [Day 3]

Sprint 2 — Computation Storm (3 days):
  R9+R5: useDeferredValue refactoring + useMemo cleanup [Day 1-2]
  R5b: useOptimistic for row mutations [Day 2-3]
  R6: Optimize cursor re-renders       [Day 2-3]
  R4: Lazy-load component library      [Day 3]

Sprint 3 — Structure & DOM (5 days):
  R12: Split 4,336-line EstimateSheetContent [Day 1-2]
  R1: Virtualize estimate sheet grid        [Day 2-5]
```

### Why This Order

- **Baseline first**: This path is too stateful for a blind optimization pass. Pin behavior and capture flame charts before future code edits.
- **Sprint 0 first**: `React.memo` + `projectTotal` memoization are the lowest-risk code candidates. Broader `useDeferredValue` work changes input scheduling and belongs after focus/navigation tests exist.
- **Data layer before computation**: Smaller payloads (R2) and parallel fetching (R3) benefit EVERY user on every page load. These compound — less data means faster parsing means less JS execution.
- **Computation before DOM**: `useDeferredValue` (R9+R5) is a candidate fix for O(n) traversal pressure, but it must preserve input behavior before it ships. Virtualization (R1) fixes DOM count while traversal work can remain.
- **Structure last**: The 4,336-line monolith must be split BEFORE virtualization, or the virtualizer gets entangled in an already-overgrown component.

---

## Baseline — Proof Before Changes

| Action | Detail |
|--------|--------|
| **B0a: Behavior characterization** | Add or run focused coverage for quantity edit, misc cost edit, contingency/discount, row add/delete, template insert, bulk selection pruning, drag/drop, remote cursor render, proposal preview signature, and activity scope. |
| **B0b: Performance fixtures** | Generate or select 50-, 200-, and 500-row sheets. Record the exact project/node IDs, row counts, and whether rows are linked to library items. |
| **B0c: Runtime traces** | Capture Chrome Performance traces for first load and ten-character quantity entry. Store flame-chart screenshots or JSON traces under `.ai/09_archive/store/` or the future implementation evidence folder. |
| **B0d: Static counts** | Record `wc -l`, hook counts, `rg -n '\.select\("\*"\)' src`, package dependency state, and current worktree dirt before editing. |
| **B0e: Provider posture** | Do not claim Speed Insights or hosted RES improvement unless `vercel metrics` or dashboard/export evidence is scoped to the current deployment, route, device class, and date window. |

---

## Sprint 0 — Characterization + Low-Risk Relief

### S0a: `React.memo` on `EstimateRowItemsTable`

| Attribute | Detail |
|-----------|--------|
| **File** | `src/components/workshop/EstimateSheetContent.tsx` |
| **Problem** | Every keystroke in ANY row causes ALL `EstimateRowItemsTable` instances to re-render, even if their items didn't change. |
| **Solution** | Wrap `EstimateRowItemsTable` in `React.memo` with shallow comparison on `items` prop. |
| **Impact** | **CRITICAL candidate** — should eliminate render cascade for non-edited rows if prop identity is stable. |
| **Effort** | Low |
| **Risk** | Low/Medium — memoization can hide stale callbacks or mutated item arrays. Require a failing render-count test and behavior parity tests before/after. |

### S0b: Memoize `projectTotal`

| Attribute | Detail |
|-----------|--------|
| **File** | `src/components/workshop/EstimateSheetContent.tsx` (current snapshot line ~3559) |
| **Problem** | `projectTotal` is computed as a bare variable in the render body — recalculates on EVERY state change, even unrelated ones (cursor movement, selection, modal open/close). |
| **Solution** | `const projectTotal = useMemo(() => computeRowTotal(estimateTree), [estimateTree, deferredRows]);` |
| **Impact** | **HIGH candidate** — eliminates redundant O(n) tree summation on every non-row state change. |
| **Effort** | Low |
| **Risk** | Low — verify totals update after quantity, misc, contingency/discount, row add/delete, template insert, and rollback. |

### S0c: Keep Deferred Row State Out of Sprint 0

| Attribute | Detail |
|-----------|--------|
| **File** | `src/components/workshop/EstimateSheetContent.tsx` |
| **Problem** | Every keystroke updates `editableRows` and triggers expensive derivations, but introducing deferred global row state affects input focus, tab navigation, rollback, proposal previews, and activity scopes. |
| **Solution** | In Sprint 0, only measure and characterize the deferred-state candidate. Implement `useDeferredValue` in Sprint 2 after input-focus and rollback tests exist. |
| **Impact** | Prevents the highest-risk "quick win" from being merged without proof. |
| **Effort** | Low |
| **Risk** | Low — planning/measurement only in this packet. |

---

## Sprint 1 — Data Layer (3 days)

### R2: Replace `select('*')` with Explicit Column Selections

| Attribute | Detail |
|-----------|--------|
| **Files** | `src/lib/repositories/workspace-repository.ts`, `src/lib/repositories/component-library-repository.ts`, `src/lib/auth/session.ts` |
| **Problem** | 17 `select('*')` queries across 15+ tables, including large JSONB columns (`metadata` up to 5KB, `source_snapshot` up to 10KB, `snapshot_json` up to 100KB). |
| **Solution** | Replace every `select('*')` with explicit column lists. Most critical: exclude `source_snapshot` on `estimate_row_items` when `link_state != 'linked'`, exclude `snapshot_json` on `project_publications` unless viewing details. |
| **Impact** | **CRITICAL candidate** — 60-80% payload reduction is the working hypothesis for JSONB-heavy tree loads; actual byte savings must be measured per fixture. |
| **Effort** | Low (1-2 days) — mechanical change. |
| **Risk** | Low — verify all downstream column usage. |
| **Approach** | 1. Audit every `select('*')` call (see [02-data-fetching-audit.md](./02-data-fetching-audit.md) §2) 2. Map used columns per call site 3. Replace with explicit lists 4. Verify with integration tests |

### R-E1: Replace Estimate List JavaScript Aggregate With SQL/RPC Aggregate

| Attribute | Detail |
|-----------|--------|
| **Files** | `src/lib/repositories/workspace-repository.ts`, new Supabase migration or RPC if selected |
| **Problem** | Current `listProjectEstimates()` already uses explicit row-item aggregate columns, but it still transfers every row item for all project estimates and computes totals in JavaScript. |
| **Solution** | Replace row transfer plus JavaScript reduction with a Postgres aggregate query/RPC returning `estimate_id`, `row_count`, `node_count`, and `total_cost`. Preserve exact arithmetic parity with current JavaScript formula. |
| **Impact** | **HIGH for large projects** — reduces payload and server CPU for estimate-list navigation. |
| **Effort** | Medium |
| **Risk** | Medium — numeric rounding, null handling, discount sign semantics, and RLS policy behavior must match current code. |
| **Approach** | Add a parity test using current fixtures, run `EXPLAIN ANALYZE`, and keep the current JavaScript path as a rollback fallback until aggregate proof is green. |

### R3: Parallelize Data Fetching Waterfall

| Attribute | Detail |
|-----------|--------|
| **Files** | `src/app/workshop/projects/[projectId]/layout.tsx`, `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx` |
| **Problem** | Sequential waterfall: `getUser()` → `ensureDefaultWorkspace()` → `getCurrentWorkspaceProject()` → `Promise.all()` → `getProjectEstimateTreeByNode()`. Each step blocks. |
| **Solution** | Pre-compute workspace ID in proxy (`src/proxy.ts`), start project + collaboration fetches in parallel. Use React `cache()` for cross-layout deduplication. |
| **Impact** | **HIGH** — 30-50% TTFB reduction (from ~300-750ms to ~200-400ms). |
| **Effort** | Medium (2-3 days) |
| **Risk** | Medium — `ensureDefaultWorkspace` may create records; test race conditions. |

### R7: Add Composite Database Indexes

| Attribute | Detail |
|-----------|--------|
| **Files** | New migration in `supabase/migrations/` |
| **Problem** | Missing composite indexes: `(workspace_id, item_id)` on 6 cost library tables, `(workspace_id, lifecycle_state)` on `cost_library_items`, `(user_id, terms_key, terms_version, accepted_at DESC)` on `legal_terms_acceptances`. |
| **Solution** | Create migration with targeted composite indexes. Verify with `EXPLAIN ANALYZE`. |
| **Impact** | **MEDIUM** — 2-5x speed improvement on affected sub-queries. |
| **Effort** | Low (0.5 day) |
| **Risk** | Low — additive, no schema changes. Note: indexes are additive but must be verified — the planner may still seq-scan for large `.in()` lists. |

### R8: Replace Inline `backgroundImage` with `<Image>`

| Attribute | Detail |
|-----------|--------|
| **File** | `src/components/workshop/EstimateSheetContent.tsx` |
| **Problem** | Component thumbnails use inline `backgroundImage`, bypassing Next.js image optimization (resize, WebP, lazy load). |
| **Solution** | Use `next/image` with existing Supabase storage remote patterns only after proving URLs are public/allowed. Use `fill`, stable containers, and `sizes`; capture network/layout/accessibility proof. |
| **Impact** | **MEDIUM** — reduced LCP, better caching. |
| **Effort** | Low (0.5 day) |
| **Risk** | Low — remote patterns already configured. |

---

## Sprint 2 — Computation Storm (3 days)

### R9+R5 (Paired): `useDeferredValue` Refactoring + `useMemo` Cleanup

| Attribute | Detail |
|-----------|--------|
| **File** | `src/components/workshop/EstimateSheetContent.tsx` |
| **Problem** | 5 critical `useMemo` hooks depend on `editableRows` and recalculate on every keystroke: `currentRows`, `projectTotal`, `displayedSheetNode`, `visibleSheetRowIds`, `activityScopeItems`. Each does recursive tree traversal. |
| **Solution** | **Replace manual debounce (R5) with `useDeferredValue`**: split state into `editableRows` (for inputs — immediate) and `deferredRows` (for calculations — deferred). Wire all 5 `useMemo` hooks to depend on `deferredRows` instead of `editableRows`. If `useDeferredValue` is sufficient (likely), separate manual debounce (R5) becomes unnecessary. |
| **Impact** | **CRITICAL** — eliminates O(n) computation on every keystroke. Combined with S0 (React.memo + projectTotal memo), this eliminates the keystroke lag entirely. |
| **Effort** | Medium (1-2 days) |
| **Risk** | Medium — `useDeferredValue` requires cells to use uncontrolled local state (input cursor jumps if the deferred value resets the input). Test rapid typing + tab navigation. |

### R5b: `useOptimistic` for Row Mutations

| Attribute | Detail |
|-----------|--------|
| **File** | `src/hooks/use-estimate-row-mutations.ts`, `src/components/workshop/EstimateSheetContent.tsx` (line ~3802) |
| **Problem** | `updateRowItem` manually snapshots `previousTree`/`previousRows`/`rollbackRevision` and restores on error — 100+ lines of manual optimistic update/rollback code. |
| **Solution** | Replace with React 19 `useOptimistic(state, (currentState, mutation) => reducer)`. React handles rollback through its reducer pattern with built-in concurrent interruptability for rapid typing sequences. |
| **Impact** | **MEDIUM** — simplifies mutation lifecycle, eliminates manual rollback bugs, improves concurrent safety. |
| **Effort** | Medium (1 day) — requires refactoring mutation hooks to use `useOptimistic` reducer pattern. |
| **Risk** | Medium — `useOptimistic` requires rethinking the `rollback` callback pattern. |

### R6: Optimize Cursor Broadcast Re-renders

| Attribute | Detail |
|-----------|--------|
| **Files** | `src/hooks/use-estimate-cursor-broadcast.ts`, `src/components/workshop/EstimateSheetContent.tsx` |
| **Problem** | Cursor broadcasts (80ms throttle) trigger full sheet re-render. During collaboration, compounds with keystroke re-renders. |
| **Solution** | Move `RemoteEstimateCursorsOverlay` to separate React subtree with `React.memo`. Use dedicated Zustand slice for cursor state (isolated from sheet state). |
| **Impact** | **MEDIUM** — improved collaboration UX. |
| **Effort** | Low (1 day) |
| **Risk** | Low — cursors are visual-only. Also: audit the `onPointerMove` handler — it traverses DOM for hit-testing at 60fps in addition to the 80ms broadcast. |

### R4: Lazy-Load the Component Library

| Attribute | Detail |
|-----------|--------|
| **Files** | `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`, `src/lib/repositories/component-library-repository.ts` |
| **Problem** | `getCurrentWorkspaceComponentLibrary()` fetches 8+ tables on EVERY page load — even if sidebar is closed. |
| **Solution** | Remove from server page. Add TanStack Query hook with `enabled: false` triggered by sidebar open. Cache with `staleTime: Infinity` per session. |
| **Impact** | **HIGH** — removes 8+ queries from initial load, saves ~50KB+. |
| **Effort** | Medium (2-3 days) |
| **Risk** | Low — library is only used by right sidebar. |

---

## Sprint 3 — Structure & DOM (5 days)

### R12: Split `EstimateSheetContent.tsx` (4,336 lines in current snapshot)

| Attribute | Detail |
|-----------|--------|
| **File** | `src/components/workshop/EstimateSheetContent.tsx` |
| **Problem** | Monolithic 4,336-line component. Violates single-responsibility. Blocks safe virtualization. |
| **Solution** | Split into: `EstimateSheetHeader`, `EstimateSheetBody` (grid), `EstimateSheetModals` (RowDetails, ActivityHistory, ProposalExport), `EstimateSheetFooter`. |
| **Impact** | **HIGH** — enables safe R1 virtualization; improves maintainability. |
| **Effort** | Medium (1-2 days) |
| **Risk** | Medium — significant refactor; characterize current behavior with tests first. |
| **Approach** | 1. Write characterization tests pinning current behavior 2. Extract `EstimateSheetHeader` (lines 1-200) 3. Extract `EstimateSheetModals` (RowDetailsModal, ActivityHistoryModal, ProposalExportPreviewDialog) 4. Extract `EstimateSheetFooter` 5. Keep `EstimateSheetBody` as the virtualized grid container |

### R1: Virtualize the Estimate Sheet Grid

| Attribute | Detail |
|-----------|--------|
| **File** | `src/components/workshop/EstimateSheetContent.tsx` → `EstimateSheetBody.tsx` |
| **Problem** | Renders ALL rows in DOM. After computation fixes (Sprint 0-2), DOM count remains the limiting factor for 500+ row sheets. |
| **Solution** | Implement `@tanstack/react-virtual` in the now-split `EstimateSheetBody`. |
| **Impact** | **CRITICAL** — enables 1000+ row sheets with sub-16ms paint. |
| **Effort** | Medium (3-5 days) — handle variable row heights (measureElement), focus management for editable inputs, drag-and-drop zones with shifting virtual positions. |
| **Risk** | Medium — drag-over expansion zones must be accounted for in virtualizer's `measureElement`. Input focus must survive row recycling. |
| **Approach** | 1. Wrap rows in `useVirtualizer` with `estimateSize: () => 48` 2. `measureElement` for dynamic heights 3. Ensure Realtime cursors map to virtualized positions 4. Handle drag-drop: account for expansion zones in virtual measurements |

---

## Tier 4 — Backlog

| # | Item | Notes |
|---|------|-------|
| R10 | Cache proxy auth lookups | `supabase.auth.getUser()` round-trip on every /workshop request |
| R11 | Reduce realtime channel overhead | 3 channels active; consider multiplexing |
| R13 | Remote/shared cache for component library | Only after lazy/session cache still misses budget and [16-dependency-cache-image-decision-matrix.md](./16-dependency-cache-image-decision-matrix.md) approves privacy, invalidation, and cost |
| R14 | Profile RLS policy overhead | `can_access_project` and `can_access_estimate` use nested EXISTS — may contribute 100-200ms cumulative per request |
| R15 | Replace PointerMove DOM traversal | `onPointerMove` handler traverses DOM for hit-testing at 60fps |

---

## Escalation Trigger

If after **Sprint 1** (R2 + R3 + R7 + R8) the initial page load TTFB is still above 500ms for a 100-row sheet:

→ Profile RLS policies (`can_access_project`, `can_access_estimate`) with `EXPLAIN ANALYZE`. The nested `EXISTS` pattern on 15+ tables per request may be contributing 100-200ms of cumulative overhead that the audit lists as "MEDIUM" but may be "HIGH". Consider materializing access checks into JWT claims or session variables.

## Oracle Review Notes

- **Original audit missed**: `projectTotal` is a bare variable (not useMemo'd), `computedRows` does 500+ object spreads per keystroke, no React 19 concurrent features used anywhere, pointer-move handler does DOM traversal at 60fps.
- **R1 (virtualization) is NOT the right first priority**: It fixes DOM count but not the computation storm. Data-layer fixes (R2, R3) and computation fixes (S0, R9+R5) must come first.
- **`useDeferredValue` remains a candidate, not a guarantee**: React 19's `useDeferredValue` may reduce calculation pressure, but this sheet's controlled inputs, rollback paths, proposal previews, and activity scope require parity tests before replacing manual scheduling.
- **`useOptimistic` simplifies 100+ lines**: The manual `previousTree`/`previousRows`/`rollbackRevision` snapshot-and-restore pattern is exactly what `useOptimistic` was designed to eliminate.
- **Sprint 0 is now a characterization-first packet**: React.memo and projectTotal memoization are high-ROI candidates, while `useDeferredValue` moves behind input-focus and rollback proof.
