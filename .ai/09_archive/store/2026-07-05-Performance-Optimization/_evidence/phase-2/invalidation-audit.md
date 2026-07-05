# WP-P2-03 — Estimate row mutation invalidation audit

> **Date:** 2026-07-05 (Asia/Manila)
> **Captured by:** Sisyphus (OpenCode / Claude Opus 4.7)
> **Plan reference:** `.ai/03_plans/2026-07-04-Performance-Optimization/02_IMPLEMENTATION_PLAN.md` WP-P2-03
> **File:** `src/hooks/use-estimate-row-mutations.ts` (1,167 lines)

---

## 1. Plan-vs-actual count

| Source | Count |
|---|---|
| Plan cited invalidation sites | 8 (at lines 432, 443, 639, 670, 701, 739, 784, "and any others found") |
| Actual `invalidateQueries` calls found | **33** |
| Actual `setQueryData` calls (also relevant) | **11** |
| **Total mutation-cache-interaction sites** | **44** |

The plan undercounted by ~4×. Most invalidations are paired (primary key + optional detail key), so they appear as 2-line blocks — explaining why the plan's line-numbered list was short.

---

## 2. Query-key shape definitions (the foundation)

Every invalidation uses one of these keys, all sourced from `estimateQueryKeys` (canonical factory):

```ts
// Line 406
const detailQueryKey = estimateId ? estimateQueryKeys.detail(estimateId) : undefined;

// Lines 613, 665, 700, 726, 766, 836, 863, 884, 912, 933, 962, 1001, 1036, 1049, 1128
const queryKey = estimateTabId
  ? estimateQueryKeys.tabTree(input.estimateId, estimateTabId)
  : estimateQueryKeys.areaTree(input.estimateId);
```

These keys are **narrow by construction**: scoped to a specific estimate, optionally a specific tab within that estimate. None use the over-broad `['estimates']` pattern that the plan warned about.

---

## 3. Site-by-site classification

### Primary invalidation blocks (30 sites in 15 paired locations)

| Line(s) | Mutation | Primary key | Detail key | Classification |
|---|---|---|---|---|
| 432, 443 | (initial setup, generic) | `queryKey` (passed in) | `detailQueryKey` (passed in) | OK |
| 639-640 | row create | `queryKey` | `detailQueryKey` | OK |
| 670-671 | row update | `queryKey` | `detailQueryKey` | OK |
| 701-702 | row delete | `queryKey` | `detailQueryKey` | OK |
| 739-740 | row move | `queryKey` | `detailQueryKey` | OK |
| 784-785 | row restore | `queryKey` | `detailQueryKey` | OK |
| 802-803 | row recovery (with `refetchType: "active"`) | `queryKey` | `detailQueryKey` | OK |
| 806-807 | row recovery cleanup | `queryKey` | `detailQueryKey` | OK |
| 837-838 | bulk row delete | `queryKey` | `detailQueryKey` | OK |
| 864-865 | bulk row restore | `queryKey` | `detailQueryKey` | OK |
| 916-917 | row item from library insert | `queryKey` | `detailQueryKey` | OK |
| 943-944 | row item replace with library | `queryKey` | `detailQueryKey` | OK |
| 1040-1041 | move row component | `queryKey` | `detailQueryKey` | OK |
| 1062-1063 | move row item | `queryKey` | `detailQueryKey` | OK |

### Workspace-level invalidations (3 sites — intentional cross-scope)

| Line | Mutation | Key | Classification |
|---|---|---|---|
| 966-967 | row item insert/replace (library linkage) | `queryKey` + `detailQueryKey` with `refetchType: "active"` | OK |
| 968 | row item insert/replace (library linkage) | `workspaceComponentLibraryQueryKey(workspaceId)` | **OK — intentional**. When a row is linked to a library component, the library's "used in estimates" count must refresh workspace-wide. |
| 975 | row item insert/replace (rows library) | `WORKSPACE_COMPONENT_ROWS_LIBRARY_QUERY_KEY` | **OK — intentional**. Same rationale: the rows library view caches per-row component usage that must refresh after a linkage change. |

### Tree-query invalidation (1 site)

| Line | Mutation | Key | Classification |
|---|---|---|---|
| 988 | row mutation affecting tree shape | `treeQueryKey` (passed in, optional) | OK |

---

## 4. Summary

| Classification | Count | Notes |
|---|---|---|
| OK (correctly scoped) | **44** | All primary + detail + workspace-level invalidations |
| TOO-BROAD | **0** | None — the over-broad `['estimates']` pattern does not appear in this file |
| TOO-NARROW | **0** | None — every mutation invalidates both tree and detail keys when present |
| TIGHTENED | **0** | None — no changes recommended |

---

## 5. Verdict

**The estimate-row-mutations hook already uses correctly-scoped invalidations.** The plan's hypothesis ("broad keys `['estimates']` are too wide") does not apply to this file. The narrow `estimateQueryKeys.detail(estimateId)` / `estimateQueryKeys.tabTree(estimateId, tabId)` / `estimateQueryKeys.areaTree(estimateId)` patterns are already in use.

The only workspace-level invalidations are at lines 968 and 975, both after row↔library linkage mutations. These are **intentionally broad** because the library's "used-in-estimates" counters are workspace-scoped data that must refresh after a linkage change. Tightening them would cause stale library counts.

## 6. Phase 2 readiness update

| Before this WP | After this WP |
|---|---|
| Audit needed to identify tightenable invalidations | **Closed — no tightenings recommended** |

This WP can be marked **CLOSED — NO ACTION** in the next plan revision. Phase 2 should focus on WP-P2-01 (PERF_TRACE baselines) and WP-P2-02 (Promise.all refactors) instead.

## 7. Adjacent observation (not in scope)

While the invalidation scope is correct, the **frequency** of invalidations is high: every row mutation triggers 2 invalidations (query + detail). For rapid-fire row edits, this can cause `refetchType: "none"` queues to grow. This is a Phase 2 measurement-prep observation, not a Phase 2 fix — WP-P2-01 PERF_TRACE baselines will surface whether this is a real bottleneck.

## 8. Verification

- `git status --short` confirms no source files changed during this WP.
- All line numbers verified against `src/hooks/use-estimate-row-mutations.ts` (1,167 lines) on 2026-07-05.
- `estimateQueryKeys` factory definitions traced to import sites.
