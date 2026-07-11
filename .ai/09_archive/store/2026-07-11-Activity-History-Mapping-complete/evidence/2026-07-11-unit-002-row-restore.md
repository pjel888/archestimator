# UNIT-002 Row Restore Receipt - 2026-07-11

## Scope

UNIT-002 resolves the Cloudflare D1 row-restore dispatcher from durable delete
snapshots and proves that normalized bulk row deletion renders the existing
restore action. It does not change node restore behavior, write migrations, or
make hosted/provider/browser claims.

## Result

- Restores selected or complete `row_deleted` and `rows_deleted` snapshots in
  one D1 batch with exact project, estimate, and workspace scoping.
- Rejects malformed snapshots, invalid selections, row collisions, oversized
  batches, wrong event types, and cross-workspace event references before write.
- Replays a matching restore correlation from its persisted rows without
  inserting duplicate rows or history.

## Verification

Executed on 2026-07-11:

```text
bunx vitest run tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-actions-d1-row-restore-history.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/estimate-sheet-version-control-actions.test.ts tests/vitest/activity-event-type-normalization.test.ts tests/vitest/activity-filter-exhaustiveness.test.ts tests/vitest/activity-composer.test.ts tests/vitest/project-activity-repository.test.ts tests/vitest/project-activity-page/repository-behavior.test.ts
Result: 9 files passed, 152 tests passed

bun run type-check
Result: passed

git diff --check
Result: passed
```

## Claim Boundary

This receipt supports UNIT-002, TEST-004 through TEST-006, and AC-004 through
AC-006 in the local D1 contract. It does not prove production D1 state or a
browser session against a deployed environment.
