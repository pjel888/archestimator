# 08 — Execution and Traceability Plan

**Date:** 2026-06-15
**Type:** Planning / execution handoff and risk traceability only. No source code was modified.
**Goal:** Make the resizable-column plan implementable without re-discovering file boundaries, sequencing, blast radius, rollback, or verification.

This plan uses stable implementation-unit IDs. Do not renumber IDs during later plan edits; append new IDs if the work splits further.

The canonical column contract is `04 §1/§6`. This document references it instead
of redefining column labels, field names, defaults, or CSS variable names.

---

## U0. Lock the Column Contract

**Goal:** Confirm the final width semantics before implementation starts.

**Files:** planning only, then source in U1.

**Decision:** `Materials` remains `minmax(var(--est-col-material, 160px), 1fr)`. The variable controls the minimum width; the track still absorbs remaining space. Other data columns are fixed pixel tracks from CSS vars. If all fixed widths exceed the viewport, horizontal scroll belongs to the shared sheet surface.

**Express-card floor measurement:** before user-visible resize, measure the real
usable floor of the express card in `cells.tsx`. Known constituents are
`size-14` media (56px, `cells.tsx:128`), `gap-2`, `pr-[92px]`
(`cells.tsx:106`), and `w-[84px]` cost field (`cells.tsx:306`). The planning
default/min remains 160 to preserve Phase 0 byte-identical rollout. If the
measurement proves 160 unusable, raise default and min together and remove the
byte-identical guarantee from `04`/`06`.

**Verification:** `04`, `07`, and this file agree on column IDs, labels, defaults, min/max, and non-goals.

---

## U1. Column Model and CSS Variable Contract

**Goal:** Replace the hard-coded row grid literal with a named, testable column model that preserves the current default layout exactly.

**Depends on:** U0.

**Files:**

- Create: `src/lib/estimate-sheet/column-model.ts`
- Modify: `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- Test: `tests/vitest/estimate-sheet-column-model.test.ts`
- Test: `tests/vitest/estimate-row-table-virtualization.test.tsx`

**Approach:**

- Import the canonical contract from `04`: `index`, `select`, `material`, `quantity`, `subTotal`, `adjustment`, `miscCost`, `totalItemCosts`, `actions`.
- Treat `adjustment` as a semantic storage/CSS ID over `contingencyPercentage` / `contingencyValue`; do not look for an `adjustment` field.
- Mark only the six data columns as resizable.
- Build one `COLUMN_TEMPLATE` that uses CSS vars with defaults matching the current `ROW_COLUMNS`.
- Preserve `Materials` flex/min behavior.
- Apply `gridTemplateColumns` from the same template to header and body rows.
- Do not pass width objects through `EstimateSheetBranch` or `EstimateRowItemsTable` props.

**Test scenarios:**

- Default column model serializes to the same nine-track geometry as the current sheet.
- Header row and body rows both use the same template source.
- Gutter, select, and actions columns are non-resizable.
- All editable cells still expose `data-estimate-cell-index`, `data-estimate-row-id`, and `data-estimate-row-index`.
- Virtualized rows still mount a bounded row window with the default geometry.

---

## U2. Shared Surface CSS Variables

**Goal:** Make every node group inherit column widths from one common ancestor without adding high-frequency React props.

**Depends on:** U1.

**Files:**

- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Create: `src/lib/estimate-sheet/column-vars.ts` if not folded into U1's model file
- Test: `tests/vitest/estimate-sheet-column-vars.test.tsx`

**Approach:**

- Set committed/default column CSS variables on `[data-estimate-pointer-surface]`.
- Use a stable memoized style object derived from committed widths only.
- Use only `--est-col-<id>` variable names from `04`.
- Explicit rule for missing `estimateId`: no persistent estimate-scoped storage. Use session/default widths only unless a deterministic compatibility key is intentionally introduced and tested.
- Ensure the alternate centered empty/loading surface with `data-estimate-pointer-surface` cannot accidentally receive an incompatible resize style.
- Keep all live drag mutations outside React state.

**Test scenarios:**

- Rendering two row-bearing child areas places both tables under the same variable-bearing surface.
- Updating the surface CSS var changes both header/body grid computed styles in the same test frame.
- Search/filter remounting of child groups does not clear the surface variables.
- Missing `estimateId` render modes do not write per-estimate storage.

---

## U3. Shared Ruler and Resize Controller

**Goal:** Add the direct manipulation affordance with pointer, touch, and keyboard support while preserving drag/drop and edit focus behavior.

**Depends on:** U1, U2.

**Files:**

- Create: `src/components/workshop/estimate-sheet/columns/EstimateColumnRuler.tsx`
- Create: `src/components/workshop/estimate-sheet/columns/use-estimate-column-resize-controller.ts`
- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Test: `tests/vitest/estimate-sheet-column-resize-a11y.test.tsx`
- Test: `tests/vitest/estimate-component-drag.test.tsx`
- Storybook: `src/stories/domain/workshop/estimate-row.stories.tsx` or a new focused story for ruler states

**Approach:**

- Mount one shared ruler inside `[data-estimate-pointer-surface]`, as a sibling before `EstimateSheetVirtualBranchList`.
- `EstimateSheetVirtualBranchList`, `EstimateSheetBranch`, and `EstimateRowItemsTable` stay width-agnostic consumers.
- Port the proven handle behavior from `ProjectEstimatesTable.tsx`, but upgrade with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- Pointer drag writes `surface.style.setProperty("--est-col-*", "...px")` on every move.
- Pointer up commits once through U4's committed layer.
- Stop propagation on handle pointer/mouse/touch start; set `draggable={false}`.

**Test scenarios:**

- Each resizable data column has exactly one `role="separator"` handle in the shared ruler.
- Non-resizable gutter/select/actions columns do not have handles.
- Arrow keys change the CSS variable and clamp at min/max.
- Home and double-click reset a column.
- Starting a resize does not fire `dragstart`.
- Resizing while an express editor input is focused does not blur or remount that input.

---

## U4. Committed Width Store and Persistence

**Goal:** Persist final widths per estimate without writing storage or React state on every pointer move.

**Depends on:** U1-U3.

**Files:**

- Create: `src/stores/estimate-column-widths-store.ts`
- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Test: `tests/vitest/estimate-column-widths-store.test.ts`
- Test: `tests/vitest/estimate-sheet-column-width-persistence.test.tsx`

**Approach:**

- Store committed widths by `estimateId`; use a stable empty object for defaults.
- Use a versioned localStorage envelope and one `__last-used` fallback key.
- Use existing storage helpers from `@/components/workshop/component-library/helpers` (`readJsonStorage`, `safeSetJsonStorage`) rather than adding Zustand persist middleware.
- Clamp on read and write.
- Remove the estimate key when all widths match defaults.
- Do not broadcast widths to other users or collaboration channels.

**Test scenarios:**

- Commit writes once per completed resize, not on every pointer move.
- Reload restores estimate-scoped widths.
- Corrupt storage falls back to defaults.
- Stored values below min or above max clamp on read.
- Reset removes the estimate-scoped storage key and reapplies defaults.

---

## U5. Cross-Group Sync and Render-Relief Gate

**Goal:** Prove the headline behavior and the performance invariant together.

**Depends on:** U1-U4.

**Files:**

- Modify: `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`
- Create: `tests/vitest/perf/estimate-sheet-column-resize.test.tsx`
- Create: `tests/vitest/estimate-sheet-column-sync.test.tsx`

**Test scenarios:**

- Resizing `Materials` in the shared ruler changes the rendered column width in at least three visible groups.
- Dragging through 30 pointer-move events produces zero row, table, branch, and content renders during live drag.
- Pointer-up commit writes once and does not re-render rows.
- Search/filter after resize preserves the width when groups remount.
- Branch virtualization enabled path still inherits the same surface vars.

---

## U6. Collaboration, Insertion, Export, Public Share

**Goal:** Lock the blast-radius boundaries that make column widths screen-only.

**Depends on:** U1-U5.

**Files:**

- Test: `e2e/estimate-sheet-column-resize.spec.ts`
- Test: `tests/vitest/proposal-export-preview.test.tsx`
- Test: `tests/vitest/proposal-export-route-workbook.test.ts`
- Test: `tests/vitest/project-publication-snapshot.test.ts`
- Test: template/project-source insertion suites that exercise `EstimateSheetContent`

**Test scenarios:**

- Two-browser cursor test: after one user resizes a column, the other user's cursor marker remains inside the same logical cell on the receiver.
- Horizontal scroll test: wide widths create surface-level horizontal scroll, not per-group scroll desync.
- Template and project-source inserted rows remain stable at min/max widths.
- Proposal preview, XLSX/proposal workbook, and public publication snapshots ignore sheet column widths.

---

## U7. Feature Flag, Rollback, and Cleanup

**Goal:** Make the rollout reversible and remove temporary scaffolding only after evidence is green.

**Depends on:** U1-U6.

**Files:**

- Modify: `src/lib/workshop/virtualization-flags.ts`
- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Test: `tests/vitest/estimate-sheet-column-resize-flag.test.tsx`

**Approach:**

- Add `estimateColumnResize: readPublicFlag(process.env.NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED, false)` to the existing `WORKSHOP_VIRTUALIZATION_FLAGS` object in `src/lib/workshop/virtualization-flags.ts`, then consume that flag in `EstimateSheetContent.tsx`.
- Keep `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED` default false until proof is green.
- Flag off: no shared ruler, no handles, static current geometry, persisted widths ignored.
- Flag on: shared ruler, CSS-var model, sync, and persistence after U4.
- Rollback requires no database work; localStorage keys are versioned and can be ignored.

**Test scenarios:**

- Flag off restores current behavior.
- Flag on exposes handles and syncs widths.
- Reset returns to default geometry without reload.

---

## Unit-to-Phase Map

| Phase | Units | Exit evidence |
|---|---|---|
| Phase 0 — headless layout refactor | U0, U1, U2 | Canonical defaults match current geometry; header/body share one template; no persistence or visible handles. |
| Phase 1 — private resize proof | U3, U5 partial | Pointer/keyboard resize mutates CSS vars only; live-drag render/storage budget from `09` is exactly zero. |
| Phase 2 — cross-group sync | U4, U5 complete | One commit updates the shared store and all visible groups without row re-renders. |
| Phase 3 — persistence, surfaces, rollout | U6, U7 | Reload/reset/flag behavior passes; export/workbook/public share ignore view-only widths. |

---

## Plan-Level Validation Stack

Minimum implementation verification before claiming the feature is complete:

1. `bun run type-check`
2. Focused unit/component tests for U1-U5
3. Existing estimate-sheet virtualization and render-relief suites
4. Focused collaboration/horizontal-scroll e2e or documented blocker if browser auth state is unavailable
5. Export/publication tests from U6
6. Storybook or visual review for ruler states
7. Changed-file ESLint
8. `git diff --check`

---

## Requirement Traceability

| ID | Requirement | Implementation unit(s) | Proof |
|---|---|---|---|
| R1 | Users can resize estimate-sheet data columns by direct manipulation. | U3 | Separator handles, pointer, keyboard, touch tests. |
| R2 | A resize applies to all node groups in the estimate sheet. | U2, U5 | Cross-group computed-track equality across at least three groups. |
| R3 | Resize does not regress memoization or virtualization. | U1, U2, U5 | Render probes and virtualizer budgets from `09`. |
| R4 | Row height remains fixed for MVP; text truncates instead of wrapping. | U0, U1, U5 | Row-height and no-overlap tests at min/max widths. |
| R5 | Widths are a per-user screen preference, not collaboration state. | U4, U6 | No broadcast path; cursor identity test. |
| R6 | Widths do not affect proposal export, workbook/XLSX export, public share, publication snapshots, or provider data. | U6 | Export/publication snapshot tests ignore width state. |
| R7 | UI follows the compact Archestimator app design system. | U3 | Storybook/visual review against `07`. |
| R8 | Keyboard, screen reader, mouse, and touch users can operate or safely ignore the affordance. | U3, U7 | A11y tests and mobile/flag-off checks. |
| R9 | The feature is flag-gated and rollback-safe. | U7 | Flag-off tests prove no handles, static geometry, and ignored persisted widths. |
| R10 | Implementation handoff includes tests that prove behavior and performance. | U1-U7, `09` | Plan validation stack plus performance budgets. |

## Surface Blast Radius

| Surface | Risk | Required coverage |
|---|---|---|
| `EstimateSheetContent` scroll surface | CSS vars must sit on the correct shared ancestor; empty/loading surfaces must not break. | U2 inheritance tests and flag-off default. |
| Row tables | Header/body grid tracks can drift. | U1 same-template assertion for existing `<thead>` and body rows. |
| Row virtualization | Fixed 96px rows can overlap if resize changes height. | U5/`09` no-wrap and virtualizer budget tests. |
| Branch virtualization | Many groups must inherit vars without render fanout. | Branch-heavy fixture and render probes. |
| Express components | Material card can clip at min width; focus can be lost if rows remount. | U0 floor measurement; U3/U5 express-active focus tests. |
| Keyboard cell nav | `data-estimate-cell-index` must remain stable. | U1 data-attribute preservation test. |
| Collaboration cursors | Cursor marker may drift by pixel but must stay in same logical cell. | U6 two-context or component cursor test. |
| Drag/drop | Resize pointer must not start component/template drag. | U3 drag conflict tests. |
| Templates/project-source insertion | Inserted rows must honor min/max widths. | U6 insertion tests at min/max widths. |
| Export/proposal/workbook | Widths must not leak to client-facing document layouts. | U6 proposal preview/workbook tests. |
| Public share/publication | Screen-only preference must not affect snapshots/public views. | U6 publication snapshot tests. |
| Storybook/design review | Handle and min/max states need visual review. | U3 story/harness with shared surface wrapper. |
| Storage | Corrupt/unavailable localStorage must not break sheet. | U4 malformed/quota/default tests. |
| Mobile/tablet | Persisted desktop widths can make mobile unusable. | U7 mobile breakpoint clamp/ignore checks. |

## Rollback Plan

Rollback must be possible without data repair because MVP persistence is local,
versioned, and screen-only.

1. Set `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED=false`.
2. Render the current default column geometry from the static/default model.
3. Hide the shared ruler and handles.
4. Ignore existing localStorage width keys; do not delete automatically unless a storage bug requires cleanup.
5. If storage cleanup is needed, remove only keys matching the versioned `archestimator:estimate-column-widths:*` namespace.
6. Do not run database rollback; no database change is planned.

Rollback evidence:

- Flag-off component test proves no handles and default geometry.
- Existing estimate-sheet editing tests still pass.
- Proposal/export/public share tests remain unchanged.

## Non-goals

- Full TanStack row-model rewrite.
- Dynamic row-height measurement or wrap-on-narrow behavior.
- Server-side or cross-device column width persistence.
- Collaborative broadcasting of column widths.
- Column reorder, hide/show, pinning, sorting, or filtering.
- Proposal/export/public-share formatting controls.
- Database migrations or Supabase provider changes.
- New design system primitives beyond a small column-ruler/handle if existing primitives are insufficient.
