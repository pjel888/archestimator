# UNIT-005 Restore Coverage Receipt - 2026-07-11

## Result

The activity-history sheet integration now verifies an editor can restore a
deleted Area and that the activity feed reloads after the mutation. It also
verifies that read-only users are not given recovery controls. The direct-D1
row-restore fixture covers collision, malformed and empty snapshot, wrong event,
oversize, atomic failure, cross-workspace denial, and idempotent replay.

## Verification

```text
bunx vitest run tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/activity-event-type-normalization.test.ts tests/vitest/activity-filter-exhaustiveness.test.ts
Result: 5 files passed, 96 tests passed

bunx vitest run tests/vitest/estimate-actions-d1-row-restore-history.test.ts
Result: 1 file passed, 3 tests passed

bun run type-check
Result: passed

git diff --check
Result: passed
```

Proof boundary: local source and automated tests only. No deployed/provider
behavior is claimed.
