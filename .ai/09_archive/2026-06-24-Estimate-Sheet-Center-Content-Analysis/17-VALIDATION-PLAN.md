# 17 — Validation Plan

How to prove each fix works and stays working.

## Type checking

```bash
bun run type-check
```
- Catches: type drift from new types (RPC args, partial-failure response shapes, etc.).
- Required: clean exit before every merge.

## Linting

```bash
bun run lint
bun run lint:design-system
bun run lint:design
```
- Catches: design-token drift, forbidden patterns.
- Required: clean exit before every merge.

## Unit tests

```bash
bun run test      # tests/unit
bun run test:dom  # tests/vitest
```

Per-finding test files (all NEW):

| Finding | Test file | Assertions |
|---------|-----------|------------|
| ESC-P0-01 | `tests/vitest/estimate-sheet-move-component-atomicity.test.tsx` | 4 scenarios: both succeed, target fails, source fails, both fail. Plus reverse-response-order. |
| ESC-P0-02 | `tests/vitest/estimate-sheet-project-source-insert-race.test.tsx` | Newer edit survives project-source insert. |
| ESC-P1-03 | `tests/vitest/estimate-sheet-bulk-delete-atomicity.test.tsx` | 3 rows, one 409; assert tree state + toast content. |
| ESC-P1-03 | `tests/vitest/estimate-sheet-bulk-delete-mixed-revisions.test.tsx` | One row edited elsewhere; rest still delete. |
| ESC-P1-04 | `tests/vitest/estimate-sheet-concurrent-mutations-toast.test.tsx` | Two rows edited rapidly; per-row chips + global toast correct. |
| ESC-P1-05 | `tests/vitest/estimate-sheet-trust-gate-stale-target.test.tsx` | Open gate, delete target, confirm; assert Confirm disabled + banner. |
| ESC-P1-05 | `tests/vitest/estimate-sheet-trust-gate-source-changed.test.tsx` | Open gate, source pricingDate updates; assert warnings stale. |
| ESC-P1-06 | `tests/vitest/estimate-sheet-row-virtualization-editor-pinned.test.tsx` | 1000 rows, focus editor on row 800, scroll, assert row 800 mounted. |
| ESC-P1-07 | `tests/vitest/estimate-sheet-readonly-mode.test.tsx` | Render with canEditEstimate=false; assert no row mutation is clickable. |
| ESC-P2-08 | visual + a11y assertion | Clear vs Delete icons distinct. |
| ESC-P2-09 | `tests/vitest/estimate-sheet-drop-double-handle.test.tsx` | Drop with both MIMEs; assert only one mutation. |
| ESC-P2-10 | `tests/vitest/estimate-sheet-drop-zone-highlight-stale.test.tsx` | Cancel drag mid-strip; assert no stale highlight. |
| ESC-P2-12 | (covered by aria-live assertion) | Screen reader announces pruned count. |
| ESC-P2-15 | `tests/vitest/estimate-sheet-insert-focus-virtualized.test.tsx` | 1000-row area, insert at bottom, assert focus lands. |

## Component tests

Beyond the per-finding files above:
- Existing `tests/vitest/estimate-sheet-cost-inputs.test.tsx` (1019 lines) covers most happy paths. Extend with:
  - Trust-gate target-stale case.
  - Project-source race case.
  - Move-component atomicity case.
- Existing `tests/vitest/estimate-tab-strip.test.tsx` (608 lines) is comprehensive; no changes needed.

## Mutation-hook tests

- New file `tests/vitest/use-estimate-row-mutations-atomicity.test.tsx` that mocks the server actions and asserts:
  - Per-row queue serialization.
  - Operation-id guards drop stale responses.
  - Revision-conflict triggers active refetch.
  - Move-component (after M-1) is a single mutation.

## Server-action tests

- New `tests/vitest/estimate-actions-bulk-delete.test.ts` that exercises the new `deleteEstimateRowItemsBulk` action with mocked Supabase, asserting the partial-failure response shape.
- New `tests/vitest/estimate-actions-move-component.test.ts` for `moveEstimateRowComponent`.

## RPC / database tests

- For each new RPC (`move_estimate_row_component`, `delete_estimate_row_items_bulk`): a migration test that exercises the function with RLS enabled, asserting:
  - Editor can mutate own workspace's rows.
  - Viewer cannot mutate.
  - Cross-workspace ids rejected.
  - `expected_row_revision` mismatch returns the conflict code.
  - History events written in the same transaction.

## End-to-end tests (Playwright)

- `e2e/estimate-sheet-move-component.spec.ts` (NEW, gated behind `ARCHESTIMATOR_E2E_MUTATING_DND=1`):
  - Drag grip from row A to row B.
  - Assert: row A's component is gone, row B has it.
  - Assert: totals updated.
- `e2e/estimate-sheet-bulk-delete.spec.ts` (NEW):
  - Select 3 rows, delete, assert all gone.

## Accessibility checks

- Run `@axe-core/playwright` against the rendered sheet in CI:
  - No critical violations.
  - Table semantics (`scope`, `aria-rowindex`, `aria-colindex`) present.
- Manual: NVDA + VoiceOver smoke test the center sheet once per release.
  - Read a row: should announce "row 5, column 3, Materials, Hardwood Oak Flooring".
  - Edit a quantity: should announce "Saving..." then "Saved".

## Visual regression

- Add Chromatic / Percy snapshots for:
  - Empty area state.
  - Trust-gate modal (warn + block variants).
  - Bulk-action bottom dock.
  - Proposal preview dialog.
  - Activity history modal.

## Network throttling

- Playwright `--throttle-network="Slow 3G"` smoke test for:
  - Optimistic insert under load.
  - Move-component under load (verify atomicity).
  - Bulk delete under load.

## Offline simulation

- Playwright `context.setOffline(true)` mid-mutation:
  - Insert row while offline: optimistic succeeds, server retries on reconnect.
  - Edit quantity while offline: queued, committed on reconnect.

## Failure injection

- Mock server actions (Vitest) to throw specific errors:
  - 409 (revision conflict).
  - 403 (RLS denied).
  - 500 (generic).
  - Network error.
  - Slow resolve (reverse-order test).

## Reverse-response testing

- For move-component: mock both `replaceRow` calls; resolve in reverse order; assert only final canonical state applies.
- For project-source insert race: fire `setEstimateTree` between send and resolve.

## Non-default-tab testing

- All new tests parametrized across `(tabId='default-tab', tabId='non-default-tab')`.

## Large-data profiling

- Synthetic fixture: 1000 rows × 10 areas × depth 3.
- Benchmark:
  - Initial render < 1s.
  - Keystroke latency < 50ms with no editor active.
  - Keystroke latency < 100ms with editor active (after M-18).
- Capture via Playwright CPU profiling.

## Drag-and-drop testing

- HTML5 `DataTransfer` stub (already in `estimate-sheet-cost-inputs.test.tsx:62-76`).
- Add cases for:
  - Both MIMEs present.
  - Oversized payload.
  - Cross-workspace library item id.
  - Tampered prices.

## Cross-browser testing

- Chromium (primary).
- Firefox: verify drag-and-drop event dispatch matches.
- Safari: verify native `<dialog>` showModal behavior.
- (Mobile browsers out of scope; center sheet is desktop-first.)

## Touch testing

- Out of scope.

## Manual acceptance testing

Per release:
- Run through the user journey for each P0/P1 fix.
- Sign-off by product owner.

## CI integration

- All new tests added to `bun run test:dom`.
- E2E specs gated behind env flags per existing pattern.
- Coverage gate: no drop in `tests/vitest` coverage (currently uncovered).
