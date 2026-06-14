# RS-2 / RS-3 / RS-4 — Reusable-source query performance

**Last updated:** 2026-06-14
**Status:** Deferred — real but bounded; gets worse as projects/estimates grow.
**Severity:** Medium · **Effort:** Medium · **Risk:** Low (server-side, no UI change)

The "reusable sources" feature (insert structure from *other* projects/estimates) has three N+1 / over-fetch problems in `src/lib/reusable-sources/actions.ts`. None break correctness; they're latency that scales with workspace size.

---

## RS-2 — `getReusableEstimateOutline` re-resolves the estimate per tab (N+1)

**Where:** `src/lib/reusable-sources/actions.ts:262-297`.
**Problem:** For an N-tab estimate it calls `getEstimateTabs` then `getEstimateTabTree` ×N. Each `getEstimateTabTree` re-runs an `estimates` lookup + a per-tab `estimate_tabs` lookup + nodes + rows (~4 queries/tab) — ~`2 + 4N` round-trips, and it discards the row payloads (only `summarizeEstimateTreeNodes` counts/sums survive).
**Fix:** Switch to the **existing batched loader** `getEstimateTreesForTabs` (`src/lib/repositories/workspace-repository.ts:2058`) — one nodes query + one rows query for all tabs. Then project only what the outline needs (node id/name/kind/parent + row count/cost), dropping the full `ESTIMATE_TREE_ROW_ITEM_COLUMNS` set.
**Acceptance:** outline for an N-tab estimate issues a constant number of queries (not `O(N)`); outline counts/totals unchanged.

---

## RS-3 — `searchReusableProjectSources` materializes full tab trees per keystroke; no cap

**Where:** `src/lib/reusable-sources/actions.ts:107-260`.
**Problem:** Step 1 lists every accessible project's estimates via `Promise.all(listProjectEstimateSheets …)` — one `estimates` query per project (N+1 over projects). Steps 2–3 do bounded indexed ILIKE pre-filters (good), but each matched estimate then materializes its **full** tab trees (same heavy per-tab loader as RS-2). There's no `LIMIT` on the pre-filters and no cap on matched results, so a broad query (e.g. "a") fans out to many full-tree loads. The 250ms debounce caps frequency, not cost.
**Fix:** (a) Replace per-project `listProjectEstimateSheets` with one `estimates` query `.in("project_id", accessibleProjectIds)`. (b) Add `.limit(...)` to the ILIKE pre-filters and cap materialized estimates (e.g. top 20). (c) Reuse `getEstimateTreesForTabs` + the lighter projection from RS-2. (d) **`log()`/surface the cap** so "showing first N" is honest.
**Acceptance:** a broad query loads a bounded number of trees; result count is capped and labeled.

---

## RS-4 — "Current project only" scope filters client-side after fetching everything

**Where:** action has no projectId param (`actions.ts:107`); UI filters post-fetch (`component-library/index.tsx:1136-1144`, `sourceBelongsToProject`).
**Problem:** When scoped to the current project, the server still does the full cross-workspace fan-out (RS-3 cost) and the browser throws most of it away.
**Fix:** Thread the scope/`projectId` into `searchReusableProjectSources` / `listReusableProjectSources` and filter **server-side** when current-project scope is active.
**Acceptance:** with "current project" active, the server only queries that project's estimates.

## References

- Audit finding RS-2/RS-3/RS-4 (reusable-sources audit). DB layer confirmed applied (A5) — these are pure query-shape improvements, no migration needed.
