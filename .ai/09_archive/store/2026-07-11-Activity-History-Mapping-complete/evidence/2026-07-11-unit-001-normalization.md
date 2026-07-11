# UNIT-001 Normalization Receipt - 2026-07-11

## Scope

UNIT-001 adds canonical read-side event normalization and expands canonical
activity filters to every persisted legacy spelling. It does not rewrite stored
history rows, run migrations, or claim hosted/provider/browser proof.

## Result

- Normalized every literal D1 and AI package-builder event writer, plus the D1
  dispatch-only variants, at the estimate-history and project-activity read
  boundaries.
- Added non-generic copy and filter coverage for `nodes_restored`, `rows_moved`,
  `row_component_moved`, and `sheet_adjustment_updated`.
- Preserved the planned `row_blank_added` cleanup for UNIT-006.

## Verification

Executed on 2026-07-11:

```text
bunx vitest run tests/vitest/activity-event-type-normalization.test.ts tests/vitest/activity-filter-exhaustiveness.test.ts tests/vitest/activity-composer.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/project-activity-repository.test.ts tests/vitest/project-activity-page/repository-behavior.test.ts
Result: 6 files passed, 122 tests passed

bun run type-check
Result: passed

git diff --check
Result: passed
```

## Claim Boundary

This receipt supports `UNIT-001`, `TEST-001` through `TEST-003`, and the
implemented portions of `AC-001`, `AC-003`, and `AC-013`. `AC-002` remains
open until UNIT-006 supplies `TEST-012` dead-filter proof.
