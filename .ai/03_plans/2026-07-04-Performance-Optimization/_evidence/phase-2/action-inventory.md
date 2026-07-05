# WP-P2-01 prep — Server-action inventory

> **Date:** 2026-07-05 (Asia/Manila)
> **Captured by:** Sisyphus (OpenCode / Claude Opus 4.7)
> **Plan reference:** `.ai/03_plans/2026-07-04-Performance-Optimization/02_IMPLEMENTATION_PLAN.md` WP-P2-01
> **Files:** `src/lib/estimates/actions.ts` (3,682 lines, 38 exports), `src/lib/component-library/actions.ts` (2,863 lines, 32 exports)

---

## 1. Estimate server actions — exports inventory

> Both files start with `"use server";` at line 1 — every exported async function is a Server Action.

### Plan-candidate verification (5 estimates)

| Plan-candidate name | Status | Actual name | File:Line |
|---|---|---|---|
| `loadEstimateSheet` | **NOT FOUND** | `fetchEstimateTree` is the closest equivalent (loads the tree) | `src/lib/estimates/actions.ts:1953` |
| `createEstimateRow` | **NOT FOUND** | `insertEstimateRowItemFromLibrary` (insert from library) + `updateEstimateRowItem` (the row-create/update path) | `src/lib/estimates/actions.ts:3239` and `:3337` |
| `updateEstimateRow` | **RENAMED** | `updateEstimateRowItem` | `src/lib/estimates/actions.ts:3337` |
| `deleteEstimateRow` | **RENAMED** | `deleteEstimateRowItem` | `src/lib/estimates/actions.ts:3443` |
| `reorderEstimateNodes` | **FOUND** | `reorderEstimateTreeNodes` (note: "Tree" added) | `src/lib/estimates/actions.ts:2170` |

**1 of 5 plan candidates was verifiable; 4 had wrong names.** This is a planning correction.

### Recommended top-5 estimate hot-path actions

| Rank | Action | Line | Why hot-path |
|---|---|---|---|
| 1 | `fetchEstimateTree` | 1953 | Initial tree load on every estimate open |
| 2 | `updateEstimateRowItem` | 3337 | Per-keystroke save (optimistic, but server-persisted) |
| 3 | `reorderEstimateTreeNodes` | 2170 | Drag-and-drop reorder |
| 4 | `insertEstimateRowItemFromLibrary` | 3239 | Insert-from-library (frequent sidebar action) |
| 5 | `deleteEstimateRowItem` | 3443 | Row delete |

(Plan's `createEstimateRow` and `loadEstimateSheet` should be replaced with these actual names in WP-P2-01's action selection table.)

---

## 2. Library server actions — exports inventory

### Plan-candidate verification (5 library)

| Plan-candidate name | Status | File:Line |
|---|---|---|
| `loadCurrentWorkspaceComponentLibrary` | **FOUND** | `src/lib/component-library/actions.ts:1132` |
| `loadCurrentWorkspaceComponentLibraryLite` | **FOUND** | `src/lib/component-library/actions.ts:1140` |
| `createCostLibraryComponent` | **FOUND** | `src/lib/component-library/actions.ts:1189` |
| `updateCostLibraryComponent` | **FOUND** | `src/lib/component-library/actions.ts:1341` |
| `executeBulkArchiveLibraryComponents` | **FOUND** | `src/lib/component-library/actions.ts:1609` |

**5 of 5 plan candidates verified.** Library action names are accurate.

### Recommended top-5 library hot-path actions (matches plan)

| Rank | Action | Line |
|---|---|---|
| 1 | `loadCurrentWorkspaceComponentLibrary` | 1132 |
| 2 | `loadCurrentWorkspaceComponentLibraryLite` | 1140 |
| 3 | `createCostLibraryComponent` | 1189 |
| 4 | `updateCostLibraryComponent` | 1341 |
| 5 | `executeBulkArchiveLibraryComponents` | 1609 |

---

## 3. Waterfall analysis (preview — full PERF_TRACE needed in WP-P2-01)

> This is a static-read preview. The actual sequential-vs-parallel classification needs PERF_TRACE timing data per WP-P2-01.

### Estimate actions with potential waterfalls

Sampling the bodies of the top-5:

- **`fetchEstimateTree`** (line 1953-): The body fetches the tree, then fetches edit capability + version control in parallel via `Promise.all` (verified by sampling). Likely already optimized.
- **`updateEstimateRowItem`** (line 3337-): The body awaits auth context, then performs the update, then invalidates. Sequential by necessity (auth before write before invalidate).
- **`reorderEstimateTreeNodes`** (line 2170-): The body fetches the current order, computes the new order, then writes. The fetch and write are sequential by necessity.
- **`insertEstimateRowItemFromLibrary`** (line 3239-): The body resolves the library item, then creates the row, then invalidates. Library-resolution and row-creation are sequential by necessity.
- **`deleteEstimateRowItem`** (line 3443-): Single delete + invalidate. No waterfall to optimize.

**Preview verdict:** Most estimate actions are sequential by necessity. WP-P2-02 (Promise.all refactors) may find fewer opportunities here than the plan hoped.

### Library actions with potential waterfalls

- **`loadCurrentWorkspaceComponentLibrary`** (line 1132-): Loads items + variants + price options + folders + categories. If these are currently sequential, **this is the highest-ROI refactor target in the entire plan** — typical library view loads do 4-6 round-trips that could parallelize.
- **`loadCurrentWorkspaceComponentLibraryLite`** (line 1140-): Should be a strict subset of the above. Verify it's actually a parallel-fetch lite path.
- **`createCostLibraryComponent`** (line 1189-): Single insert + side-effect invalidations. Sequential by necessity.
- **`updateCostLibraryComponent`** (line 1341-): Single update + side-effect invalidations. Sequential by necessity.
- **`executeBulkArchiveLibraryComponents`** (line 1609-): Bulk operation — should already use a single SQL `UPDATE ... WHERE id IN (...)`.

**Preview verdict:** `loadCurrentWorkspaceComponentLibrary` is the strongest Phase 2 candidate. WP-P2-01 PERF_TRACE should prioritize this action.

---

## 4. Phase 2 readiness update

| Before this WP | After this WP |
|---|---|
| Plan names 5 estimate + 5 library actions; 4 estimate names were wrong | All 10 actual names verified; `loadCurrentWorkspaceComponentLibrary` flagged as the highest-ROI Phase 2 target |

**Promotion to `IMPLEMENTATION-READY`** still requires the PERF_TRACE baselines per WP-P2-01. The corrected action list above should be substituted into the plan's WP-P2-01 selection table.

## 5. Verification

- `git status --short` confirms no source files changed during this WP.
- All line numbers verified against `src/lib/estimates/actions.ts` and `src/lib/component-library/actions.ts` on 2026-07-05.
- `"use server";` directive confirmed at line 1 of both files.
