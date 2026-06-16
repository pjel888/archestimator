# Estimate Sheet Resizable Columns — Implementation Worker Handoff

> **For agentic workers:** Use this as the implementation goal prompt. This is not another audit. Execute the feature behind a disabled-by-default flag, preserve the performance invariants, and verify each phase before moving on.

**Goal:** Implement user-resizable estimate-sheet content columns so one resize applies to every row-bearing node group in the current estimate sheet.

**Architecture:** Keep the existing CSS-grid row-table renderer and fixed-height virtualization. Replace the hardcoded column track literal with one shared CSS-variable-driven column model, write live drag widths imperatively to the shared pointer surface, and commit final widths once to a per-estimate store. Do not rewrite the sheet into a full TanStack row model.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Zustand, Vitest, Playwright, `@tanstack/react-table` patterns only where useful.

---

## Worker Prompt

You are implementing the Estimate Sheet Content resizable-column feature in Archestimator.

This feature is not implemented yet. Treat future `Create:` paths in `08` and
this handoff as intended files, not evidence that those files already exist.
Inspect live source before editing.

Read these docs first, in this order:

1. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/00-README.md`
2. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/06-recommendation-and-migration-plan.md`
3. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/04-shared-width-state-design.md`
4. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/07-ux-ui-interaction-spec.md`
5. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/08-execution-and-traceability.md`
6. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/09-performance-measurement-plan.md`
7. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/05-risk-edgecase-readiness.md`
8. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/01-current-architecture-audit.md`
9. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/02-memoization-virtualization-audit.md`
10. `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/03-tanstack-resizing-research.md`

If the docs conflict, use this precedence:

1. This handoff for execution instructions.
2. `06` for the governing recommendation.
3. `04` for the canonical column contract, IDs, defaults, bounds, and CSS vars.
4. `07` for UX, keyboard, accessibility, responsive, and design-system behavior.
5. `08` for implementation units, file ownership, tests, rollout, and traceability.
6. `09` for render, storage, virtualizer, layout, and browser budgets.
7. `05` for risks and blast-radius pitfalls.
8. `01`-`03` for historical evidence and research background.

Before editing, run `git status --short --branch` and inspect modified files that overlap your work. The worktree may already contain unrelated changes. Do not revert or overwrite unrelated user/agent edits.

---

## Scope

### Build

- A canonical estimate-sheet column model with stable IDs, defaults, bounds, CSS var names, and a shared grid template.
- A shared CSS-var surface on `[data-estimate-pointer-surface]` so all node-group tables inherit the same widths.
- One shared column ruler/header with accessible resize handles.
- A resize controller that mutates CSS vars imperatively during drag and commits once on drag end.
- A committed width store with per-estimate localStorage persistence and reset behavior.
- Feature flag wiring and rollback behavior.
- Tests and proof for cross-group sync, render-relief, virtualization safety, storage safety, accessibility, export/public-share isolation, and flag-off behavior.

### Do Not Build

- Full TanStack row-model rewrite.
- Dynamic row-height measurement.
- Wrap-on-narrow behavior.
- Server-side or cross-device column-width persistence.
- Collaboration broadcasting of column widths.
- Column reorder, hide/show, pinning, sorting, or filtering.
- Proposal/export/public-share formatting controls.
- Database migrations, Supabase changes, provider changes, or production deploys.
- Per-node, per-table, or per-tab width state.

---

## Canonical Column Contract

Implement exactly this 9-track model:

| Track | ID | Header / role | Backing source | Default | Min | Max | Resizable |
|---:|---|---|---|---:|---:|---:|---:|
| 1 | `index` | `#` | row index display | 36 | 36 | 36 | No |
| 2 | `select` | selection checkbox | selection chrome | 32 | 32 | 32 | No |
| 3 | `material` | `Materials` | material card / express component content | 160 | 160 | 640 | Yes |
| 4 | `quantity` | `Qty` | editable quantity plus inline unit suffix | 58 | 52 | 140 | Yes |
| 5 | `subTotal` | `Subtotal` | `subTotal` | 92 | 76 | 220 | Yes |
| 6 | `adjustment` | `Adjustment` | `contingencyPercentage` / `contingencyValue` | 106 | 92 | 240 | Yes |
| 7 | `miscCost` | `Misc Cost` | `miscCost` | 92 | 76 | 220 | Yes |
| 8 | `totalItemCosts` | `Total Item Cost` | `totalItemCosts` | 108 | 88 | 260 | Yes |
| 9 | `actions` | row actions | row action buttons | 30 | 30 | 30 | No |

Only these six IDs may be user-resizable:

- `material`
- `quantity`
- `subTotal`
- `adjustment`
- `miscCost`
- `totalItemCosts`

Use exactly these CSS variables:

- `--est-col-material`
- `--est-col-quantity`
- `--est-col-subTotal`
- `--est-col-adjustment`
- `--est-col-miscCost`
- `--est-col-totalItemCosts`

The default grid geometry must match the current live literal:

```text
36px 32px minmax(160px,1fr) 58px 92px 106px 92px 108px 30px
```

`material` remains flexible:

```text
minmax(var(--est-col-material, 160px), 1fr)
```

The other resizable data columns are fixed px CSS-var tracks. The `index`, `select`, and `actions` tracks stay literal and non-resizable.

---

## Hard Invariants

- Live pointer drag must never route through React state, store subscriptions, row props, branch props, or table props.
- Live pointer drag mutates the shared surface style only, e.g. `surface.style.setProperty("--est-col-material", "220px")`.
- Pointer-up commits once to the committed store.
- No width object may be threaded through `EstimateSheetBranch`, `EstimateSheetVirtualBranchList`, or `EstimateRowItemsTable` props.
- Rows stay fixed-height. Preserve the 96px fast path and single-line/truncate behavior. Do not introduce wrapping that changes row height.
- Preserve these DOM contracts byte-for-byte where they already exist:
  - `data-estimate-cell-index`
  - `data-estimate-cell-active`
  - `data-estimate-row-id`
  - `data-estimate-row-index`
- Widths are a private screen preference. Do not broadcast them through collaboration, do not persist them server-side, and do not let them affect proposal export, workbook export, public share, publication snapshots, or provider data.
- Feature flag off means current behavior: no ruler, no handles, current default geometry, no width-store hydration, no storage writes, persisted width keys ignored.

---

## Implementation Units

### U0. Lock the Column Contract and Express-Card Floor

**Goal:** Confirm column semantics and keep Phase 0 byte-identical before user-visible resize ships.

**Dependencies:** None.

**Files:**

- Inspect: `src/components/workshop/estimate-sheet/rows/cells.tsx`
- Inspect: `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/04-shared-width-state-design.md`
- Inspect: `.ai/03_plans/2026-06-15-Estimate-Sheet-Content-Table/07-ux-ui-interaction-spec.md`

**Approach:**

- Keep `material` default/min at `160` for Phase 0.
- Before enabling user-visible resize, measure the express-card usable floor. Known fixed constituents are `size-14` image, `gap-2`, `pr-[92px]`, and `w-[84px]` cost field.
- If 160 is unusable, raise `material` default and min together and update `04`, `06`, `07`, `08`, and this handoff to remove the byte-identical rollout claim.

**Verification:**

- Column IDs, labels, defaults, min/max, and non-goals agree across `04`, `07`, `08`, and this handoff.
- If no source changes are needed for measurement yet, record the measured result in the implementation summary.

---

### U1. Column Model and Shared Grid Template

**Goal:** Replace the hardcoded grid literal with a named, testable model that preserves default layout exactly.

**Dependencies:** U0.

**Files:**

- Create: `src/lib/estimate-sheet/column-model.ts`
- Modify: `src/components/workshop/estimate-sheet/rows/row-table.tsx`
- Test: `tests/vitest/estimate-sheet-column-model.test.ts`
- Test: `tests/vitest/estimate-row-table-virtualization.test.tsx`

**Approach:**

- Define the canonical IDs, resizable IDs, defaults, bounds, fixed tracks, and `COLUMN_TEMPLATE`.
- Build `COLUMN_TEMPLATE` from the canonical model, not from duplicated strings.
- Apply `gridTemplateColumns` from the same template to the existing header row and body rows.
- Preserve the current `<thead>` and body row structure.
- Preserve every `data-estimate-*` attribute used by keyboard navigation and collaboration.
- Keep row-table memo comparator semantics intact.

**Test scenarios:**

- Default model serializes to the current 9-track geometry.
- Header and body rows use the same template source.
- `index`, `select`, and `actions` are non-resizable.
- The six data columns are resizable and use the canonical IDs.
- Editable cells still expose the required `data-estimate-*` attributes.
- Virtualized rows still mount a bounded row window with default geometry.

---

### U2. Shared Surface CSS Variables

**Goal:** Make every row-bearing node group inherit widths from one common ancestor.

**Dependencies:** U1.

**Files:**

- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Create: `src/lib/estimate-sheet/column-vars.ts` if not folded into `src/lib/estimate-sheet/column-model.ts`
- Test: `tests/vitest/estimate-sheet-column-vars.test.tsx`

**Approach:**

- Set default/committed column vars on `[data-estimate-pointer-surface]`.
- Use a stable memoized style object derived from committed widths only.
- Ensure alternate empty/loading surfaces with `data-estimate-pointer-surface` cannot receive incompatible resize style.
- If `estimateId` is missing, use defaults/session-only behavior and do not write estimate-scoped storage.
- Keep live drag writes outside React state entirely.

**Test scenarios:**

- Two or more row-bearing groups sit under the same variable-bearing surface.
- Changing a surface CSS var changes header/body computed grid styles in the same frame.
- Search/filter remounting does not clear surface vars.
- Missing `estimateId` modes do not write estimate-scoped storage.

---

### U3. Shared Ruler and Resize Controller

**Goal:** Add the direct manipulation affordance without breaking drag/drop, editing focus, keyboard operation, or touch behavior.

**Dependencies:** U1, U2.

**Files:**

- Create: `src/components/workshop/estimate-sheet/columns/EstimateColumnRuler.tsx`
- Create: `src/components/workshop/estimate-sheet/columns/use-estimate-column-resize-controller.ts`
- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Test: `tests/vitest/estimate-sheet-column-resize-a11y.test.tsx`
- Test: `tests/vitest/estimate-component-drag.test.tsx`
- Storybook: `src/stories/domain/workshop/estimate-row.stories.tsx` or an equivalent focused ruler story

**Approach:**

- Mount one shared ruler inside `[data-estimate-pointer-surface]`, before `EstimateSheetVirtualBranchList`.
- Do not add active resize handles to every node-group table header.
- Port the proven handle behavior from `ProjectEstimatesTable.tsx`, adapting it to the shared CSS-var model.
- Pointer drag writes `surface.style.setProperty("--est-col-<id>", "...px")`.
- Pointer-up commits once through U4.
- Stop propagation on pointer/mouse/touch start.
- Set `draggable={false}` on resize handles.
- Keep the ruler horizontally aligned with rows: it must either participate in the same scroll flow or explicitly mirror `surface.scrollLeft`.

**Keyboard and ARIA contract:**

- Each data-column handle has `role="separator"`.
- Use `aria-orientation="vertical"`.
- Use `aria-label="Resize {Column} column"`.
- Use `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- `Tab` focuses handles in header order.
- `ArrowLeft` / `ArrowRight` resize by 16px in LTR.
- `Shift+ArrowLeft` / `Shift+ArrowRight` resize by 48px.
- `Home` resets that column to default.
- `Escape` restores the width active at the start of the keyboard-resize session and blurs; if deterministic restore is not practical, omit Escape cancel behavior rather than leaving partial state.

**Test scenarios:**

- Exactly one `role="separator"` handle exists for each resizable data column.
- No handles exist for `index`, `select`, or `actions`.
- Pointer drag changes the CSS var and does not fire native `dragstart`.
- Arrow keys change width, clamp at min/max, and update `aria-valuenow`.
- Home and double-click reset the column.
- Active express editor focus is retained through resize.
- Horizontal scroll does not desync ruler handles from body columns.

---

### U4. Committed Width Store and Persistence

**Goal:** Persist final widths per estimate without high-frequency state or storage writes.

**Dependencies:** U1, U2, U3.

**Files:**

- Create: `src/stores/estimate-column-widths-store.ts`
- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Test: `tests/vitest/estimate-column-widths-store.test.ts`
- Test: `tests/vitest/estimate-sheet-column-width-persistence.test.tsx`

**Approach:**

- Use a new store, not `estimate-ui-store`.
- Store committed widths by `estimateId`.
- Use a module-level frozen empty widths object for stable defaults.
- Use one `__last-used` fallback for new estimates.
- Persist manually with `readJsonStorage` and `safeSetJsonStorage` from `@/components/workshop/component-library/helpers`.
- Do not add Zustand persist middleware.
- Use this key shape:
  - `archestimator:estimate-column-widths:v1:${estimateId}`
  - `archestimator:estimate-column-widths:v1:__last-used`
- Use this envelope:
  - `{ v: 1, widths }`
- Clamp on read and write.
- Remove the estimate key when all widths match defaults.
- Swallow corrupt storage, unavailable storage, private browsing, and quota errors.
- Do not broadcast widths to collaboration or server state.

**Test scenarios:**

- Pointer drag produces zero storage writes until commit.
- Commit writes once per completed resize.
- Reload restores estimate-scoped widths.
- Corrupt storage falls back to defaults.
- Unknown versions or unknown columns fall back/drop safely.
- Below-min and above-max stored values clamp on read.
- Reset removes the estimate-scoped key and reapplies defaults.
- Missing `estimateId` never writes an estimate-scoped key.

---

### U5. Cross-Group Sync and Render-Relief Proof

**Goal:** Prove the headline behavior and performance invariant together.

**Dependencies:** U1, U2, U3, U4.

**Files:**

- Modify: `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`
- Create: `tests/vitest/perf/estimate-sheet-column-resize.test.tsx`
- Create: `tests/vitest/estimate-sheet-column-sync.test.tsx`

**Approach:**

- Use fixtures with at least three visible row-bearing groups.
- Drive resize from the shared ruler.
- Verify body/header computed grid tracks update across groups through the shared surface vars.
- Use existing render probes to prove no live-drag render fanout.
- Do not weaken render-probe expectations to match an implementation mistake.

**Live pointer drag budget for 30 pointer-move events:**

- `reportEstimateSheetContentRender`: 0 calls.
- `reportEstimateSheetBranchRender`: 0 calls.
- `reportEstimateRowItemsTableRender`: 0 calls.
- `reportEstimateRowItemRender`: 0 calls.
- Storage writes: 0.

**Commit budget:**

- Store commits: 1.
- Storage writes: <= 1 after debounce/coalescing.
- Row renders: 0.
- Content renders: <= 1 unless a different bounded result is justified.
- Branch/table renders: 0 target; any non-zero result must be justified and bounded.

**Test scenarios:**

- Resizing `Materials` changes rendered width in at least three visible groups.
- Search/filter after resize preserves widths.
- Branch virtualization enabled path inherits the same surface vars.
- Row-virtualized path does not change mounted row count except from scrolling.
- Narrowing columns to min bounds creates no row overlap/gap.

---

### U6. Collaboration, Insertion, Export, Public Share

**Goal:** Prove column widths are workshop-only view state and do not leak into durable/collaborative/document surfaces.

**Dependencies:** U1-U5.

**Files:**

- Test: `e2e/estimate-sheet-column-resize.spec.ts`
- Test: `tests/vitest/proposal-export-preview.test.tsx`
- Test: `tests/vitest/proposal-export-route-workbook.test.ts`
- Test: `tests/vitest/project-publication-snapshot.test.ts`
- Test: relevant template/project-source insertion suites that exercise `EstimateSheetContent`

**Approach:**

- Treat widths as per-user, screen-only presentation state.
- Collaboration cursors may drift proportionally inside a resized cell, but they must stay anchored to the same logical cell.
- Proposal export, workbook export, public share, and publication snapshots must ignore the width store and CSS vars.
- Inserted rows must inherit the shared surface vars without per-row width state.

**Test scenarios:**

- Two-context cursor test proves the marker remains inside the same `data-estimate-cell-index` after resize.
- Horizontal scroll lives on the shared surface, not per group.
- Template and project-source inserted rows remain stable at min/max widths.
- Proposal preview ignores width state.
- XLSX/proposal workbook route ignores width state.
- Public publication snapshots ignore width state.

---

### U7. Feature Flag, Rollback, and Cleanup

**Goal:** Make rollout reversible and keep partial implementation inert while disabled.

**Dependencies:** U1-U6.

**Files:**

- Modify: `src/lib/workshop/virtualization-flags.ts`
- Modify: `src/components/workshop/EstimateSheetContent.tsx`
- Test: `tests/vitest/estimate-sheet-column-resize-flag.test.tsx`

**Approach:**

- Add `estimateColumnResize: readPublicFlag(process.env.NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED, false)` to `WORKSHOP_VIRTUALIZATION_FLAGS`.
- Consume `WORKSHOP_VIRTUALIZATION_FLAGS.estimateColumnResize` in `EstimateSheetContent.tsx`.
- Default the flag off.
- Flag off:
  - render current default geometry
  - hide shared ruler and handles
  - skip width-store hydration
  - skip localStorage writes
  - ignore persisted widths
- Flag on:
  - render shared ruler
  - use CSS-var column model
  - sync groups
  - persist final widths after U4
- Rollback is one env change plus redeploy. Do not add database rollback.

**Test scenarios:**

- Flag off restores current behavior.
- Flag off exposes no handles and performs no width hydration/write.
- Flag on exposes handles and syncs widths.
- Reset returns to default geometry without reload.
- Existing localStorage keys are inert while flag is off.

---

## UX and Visual Requirements

- The resize UI must feel like a quiet spreadsheet/workshop tool.
- Use SF Pro/system app typography and existing compact product scale.
- Resting divider: hairline `#F2F2F2`.
- Hover divider: secondary `#5D5D5D`.
- Focus/active divider: accent `#3D3D3D`.
- Do not hardcode blue focus colors.
- No heavy shadows, gradient handles, decorative animation, or marketing-style affordances.
- Hit area: at least 8px mouse target and at least 24px touch target; prefer 44px on coarse pointers where resize remains enabled.
- Below the workshop mobile breakpoint, hide resize handles or clamp/ignore desktop custom widths so mobile stays usable.
- `title` alone is not an accessible full-text path for truncated material/meta content. Provide label/description or row-inspector access where truncation hides load-bearing text.
- Supplier/source meta must not rely on tertiary `#7F7F7F` when it is load-bearing at narrow `Materials` width; use secondary `#5D5D5D` or another AA-safe treatment.
- 200% zoom must keep handles reachable and labels/cells non-overlapping.
- Forced-colors / high-contrast mode must preserve visible separator and focus states.

---

## Phase Gates

### Phase 0 — Headless Layout Refactor

**Units:** U0, U1, U2.

**Exit evidence:**

- Defaults reproduce current geometry.
- Header/body share one template.
- `data-estimate-*` contracts preserved.
- No visible resize UI yet.
- No persistence yet.
- Existing virtualization/render-relief behavior does not regress.

### Phase 1 — Private Resize Proof

**Units:** U3 and U5 partial.

**Exit evidence:**

- Pointer and keyboard resize mutate CSS vars only.
- Live drag render/storage budget is exactly zero.
- A11y separator handles pass.
- Resize does not start native drag/drop.
- Express editor focus is retained.

### Phase 2 — Cross-Group Sync

**Units:** U4 and U5 complete.

**Exit evidence:**

- One resize updates all visible groups.
- One commit updates committed store.
- Row renders remain zero.
- Search/filter remounts preserve widths.

### Phase 3 — Persistence, Blast Radius, Rollout

**Units:** U6, U7.

**Exit evidence:**

- Reload restores widths.
- Reset clears persisted estimate width and restores defaults.
- Flag-off is current behavior.
- Export/workbook/public share ignore widths.
- Collaboration cursor remains inside the same logical cell.

---

## Required Verification Before Claiming Completion

Run the narrowest checks that prove each changed behavior, then broaden only where the feature touches shared logic or user-visible surfaces.

Minimum completion stack:

1. `bun run type-check`
2. Focused unit/component tests for U1-U5.
3. Existing estimate-sheet virtualization and render-relief suites.
4. Focused collaboration/horizontal-scroll E2E or a documented blocker if browser/auth state is unavailable.
5. Export/publication tests from U6.
6. Storybook or visual review for ruler states.
7. Changed-file ESLint.
8. `git diff --check`.

The feature is not complete if any no-go signal from `09-performance-measurement-plan.md` occurs:

- Row render probe fires during live pointer drag.
- Width state is threaded through `EstimateSheetBranch` or `EstimateRowItemsTable` props.
- `columnSizing` or `columnSizingInfo` is shared as high-frequency React state across groups during drag.
- Narrowing a column changes non-express row height.
- Horizontal scroll happens per group instead of on the shared surface.
- Resize handles appear in every node-group header as separate active controls.
- Stored widths affect proposal/export/public share layout.

---

## Final Implementation Report Requirements

When done, report:

- Files changed, grouped by implementation unit.
- Which phase gates passed.
- Exact tests/checks run and their results.
- Any planned checks that could not run and why.
- Whether `material` stayed at 160 or was raised after express-card floor measurement.
- Whether the feature flag remains off by default.
- Whether any width state touches collaboration, server data, export, workbook, or public share surfaces.
- Remaining risks or follow-up items.

Do not claim completion from appearance alone. Completion requires evidence for behavior, performance, storage, a11y, blast-radius isolation, and rollback.

If browser/auth E2E cannot run, do not silently skip it. Record the blocker,
run the strongest available component/performance/browser-smoke substitute, and
leave the exact missing proof in the final report.
