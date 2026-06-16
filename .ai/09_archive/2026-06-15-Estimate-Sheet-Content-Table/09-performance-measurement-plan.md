# 09 — Performance Measurement Plan

**Date:** 2026-06-15
**Type:** Planning / performance validation only. No source code was modified.
**Goal:** Define measurable budgets so implementation cannot pass on appearance while regressing render, layout, virtualization, or storage behavior.

---

## 1. Performance thesis

The feature is acceptable only if column resize is a browser layout update, not a React render storm.

The current sheet earned its performance through row-table memo comparators, stable callback identities, fixed-height row virtualization, branch virtualization behind a threshold, render probes, and a shared scroll surface. Resizable columns must preserve that structure.

---

## 2. Workloads to measure

| Fixture | Shape | Purpose |
|---|---|---|
| Small | 2 row-bearing groups x 5 rows | Proves base behavior and a11y without virtualization noise. |
| Many medium groups | 10 groups x 50 rows | Catches high DOM count where per-table row virtualization may not activate. |
| Row-virtualized | 2 groups x 120 rows each | Proves fixed-height row virtualization remains stable. |
| Branch-heavy | 100 visible branches x 3 rows | Proves branch-list scale and CSS-var fanout across many tables. |
| Express-active | 3 groups x 80 rows with one active express editor | Proves focus retention and virtualization-disable path. |

---

## 3. Render budgets

### Live pointer drag

For a drag with 30 pointer-move events:

- `reportEstimateSheetContentRender`: **0** calls.
- `reportEstimateSheetBranchRender`: **0** calls.
- `reportEstimateRowItemsTableRender`: **0** calls.
- `reportEstimateRowItemRender`: **0** calls.
- Storage writes: **0**.

### Commit on pointer up

On drag end:

- Store commits: **1**.
- Storage writes: **<= 1** after debounce/coalescing.
- `reportEstimateRowItemRender`: **0**.
- Content renders: **<= 1** unless implementation proves a different bounded result.
- Branch/table renders: **0** target; any non-zero value must be justified and bounded.

### Keyboard resize

Each keypress may commit unless implementation batches keyboard changes until blur:

- Row renders: **0**.
- Storage writes: debounced so rapid key repeats do not write once per keypress.
- Visible width change occurs within one animation frame.

---

## 4. Layout and virtualizer budgets

- Normal row height remains 96px.
- Mounted virtualized row count for a 1,000-row single group is <= `ceil(viewportHeight / 96) + overscan * 2 + 2`. With the current 720px/overscan 6 defaults, budget is <= 22.
- Mounted branch count is <= `ceil(900 / 192) + 10 + 2`, budget <= 17 with current defaults.
- `data-estimate-row-scroll-margin` remains stable during width-only resize.
- No resize operation changes mounted row count except normal virtualizer behavior caused by scrolling.
- No overlap/gap appears after narrowing `Materials`, `Adjustment`, or currency columns to min bounds.

---

## 5. Browser interaction budgets

When browser proof is available, use a branch-heavy or many-medium-groups fixture:

- p95 frame time during a 1s resize drag <= 24ms.
- median frame time <= 16.7ms.
- long tasks > 50ms = 0.
- CLS = 0.
- localStorage writes during drag = 0.
- writes on commit <= 1.
- No text selection appears during drag.
- No native row/component `dragstart` fires from a resize handle.

Manual FPS numbers are useful but not required for MVP. Render-probe evidence plus no visible jank in a focused browser smoke is the minimum.

---

## 6. Storage and hydration budgets

- Initial render with no stored widths matches current default geometry.
- Hydrating stored widths happens after mount without a broken intermediate grid.
- Corrupt JSON, unknown version, unknown column IDs, and out-of-bound values recover to clamped/default values.
- Private browsing/quota errors are swallowed, matching existing storage-helper behavior from `@/components/workshop/component-library/helpers` (`readJsonStorage`, `safeSetJsonStorage`).
- Missing `estimateId` mode does not write estimate-scoped storage.

---

## 7. Instrumentation plan

Use existing probes:

- `setEstimateSheetContentRenderProbe`
- `setEstimateSheetBranchRenderProbe`
- `setEstimateSheetRenderProbe`
- `setEstimateRowItemRenderProbe`

Optional additions only if needed:

- `setEstimateColumnResizeCommitProbe` to count store commits.
- `setEstimateColumnCssVarWriteProbe` to count live DOM writes in tests without inspecting implementation internals.

Do not add permanent production logging for every pointer move.

---

## 8. No-go signals

Stop implementation and redesign if any occur:

- Row render probe fires during live pointer drag.
- Width state is threaded through `EstimateSheetBranch` or `EstimateRowItemsTable` props.
- `columnSizing` or `columnSizingInfo` is shared as high-frequency React state across every group during drag.
- Narrowing a column changes non-express row height.
- Horizontal scroll happens per group instead of on the shared surface.
- Resize handles appear in every node-group header as separate active controls.
- Stored widths affect proposal/export/public share layout.

---

## Measurement Checkpoint - 2026-06-16

**Local evidence collected:**

- Ruler pointer-drag test dispatches multiple `pointermove` events and verifies CSS-var mutation happens on the shared surface while the committed store callback is not called until `pointerup`.
- Store tests verify committed widths persist via versioned localStorage and reset removes scoped/last-used keys.
- Row-table virtualization tests still pass with the shared template applied to header/body rows.
- Existing render-relief suite passed under `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED=1`.
- Export/publication isolation suites passed under `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED=1`.

**Not measured in this shell:**

- Real-browser p95/median frame-time budgets.
- CLS, text-selection behavior, and horizontal-scroll sync in a live authenticated worksheet.
- Two-context collaboration cursor anchoring after local-only width divergence.

**Reason:** authenticated browser proof was `AUTH-BLOCKED`; `/workshop` redirected to login and no dev-auth/storage-state/Supabase test env was present.
