---
title: MOP-2 Center Integrity Evidence
type: evidence
date: 2026-06-25
status: active
---

# MOP-2 Center Integrity Evidence

## Scope

Implemented the center-grid integrity slice locally:

- Added a local forward migration for atomic row-component moves through
  `move_estimate_row_component_with_history`.
- Added a local forward migration for all-or-nothing selected-row deletes
  through `delete_estimate_row_items_bulk_with_history`.
- Updated generated Supabase types, server actions, row mutation hooks, and the
  estimate sheet content component to use the new atomic contracts.
- Replaced the center move path's two separate `replaceRow` calls with one
  move mutation plus optimistic rollback.
- Replaced selected-row delete's single-row loop with one bulk mutation plus
  all-or-nothing rollback.
- Guarded project-source full-tree application by the local estimate-tree
  revision captured at request start.

No hosted Supabase migration was applied in this slice because MOP-0 recorded
linked migration drift. No provider settings, production deploys, browser
automation, paid add-ons, or destructive hosted data operations were used.

## RED Evidence

Command:

```bash
bun x vitest run tests/vitest/estimate-sheet-version-control-schema.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-sheet-center-atomic-contracts.test.ts tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1
```

Result before implementation: failed as expected.

- The atomic center migration and generated RPC types did not exist.
- The action exports for atomic move and bulk row delete did not exist.
- `moveRowComponent` still used two `replaceRow` calls.
- selected-row delete still looped over single-row delete calls.
- project-source insertion still applied the returned full tree directly.
- The DOM bulk-delete test expected one all-or-nothing action and rollback
  semantics that were not yet wired.

## GREEN Evidence

Commands after implementation:

```bash
bun x vitest run tests/vitest/estimate-sheet-version-control-schema.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/estimate-sheet-center-atomic-contracts.test.ts tests/vitest/estimate-sheet-bulk-row-delete-partial-failure.test.tsx --maxWorkers=1
bun run type-check
bun x vitest run tests/vitest/project-source-insert-action.test.ts --maxWorkers=1
git diff --check
```

Results:

- Focused MOP-2 tests: passed, 5 files / 55 tests.
- Type-check: passed.
- Project-source action regression tests: passed, 1 file / 7 tests.
- `git diff --check`: passed.

Vitest emitted the known Node `module.register()` deprecation warning; no test
failed on that warning.

## Adjacent Validation Note

An additional adjacent run:

```bash
bun x vitest run tests/vitest/live-estimate-node-route.test.ts tests/vitest/project-source-insert-action.test.ts --maxWorkers=1
```

confirmed `project-source-insert-action.test.ts` stayed green, but
`live-estimate-node-route.test.ts` failed one stale unrelated source assertion
that expected an inline estimate href string instead of the current
`getEstimateHref` helper. That failure was not introduced by MOP-2 and was not
used as MOP-2 completion evidence.

## Follow-Up Boundaries

- The new migration is local only until the linked Supabase migration drift
  recorded in MOP-0 is reconciled.
- Shared custom-event parser and trust-gate success/recents semantics remain
  MOP-4 work.
- Browser proof was intentionally skipped because this slice's claims are
  covered by SQL/source, server-action, hook, and jsdom rollback tests.
