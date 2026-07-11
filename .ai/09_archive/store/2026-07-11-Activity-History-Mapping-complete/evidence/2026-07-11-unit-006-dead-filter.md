# UNIT-006 Dead Filter Receipt - 2026-07-11

## Result

Removed the unproduced `row_blank_added` selector value while retaining legacy
blank-row composition and accessibility-label compatibility. The filter contract
now asserts every visible option expands to a persisted spelling and that the
dead option is absent.

## Verification

```text
bunx vitest run tests/vitest/activity-composer.test.ts tests/vitest/activity-copy-regression.test.ts tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/activity-event-type-normalization.test.ts tests/vitest/activity-filter-exhaustiveness.test.ts
Result: 5 files passed, 149 tests passed

bun run type-check
Result: passed

git diff --check
Result: passed
```

Proof boundary: local source and automated tests only. No deployed/provider
behavior is claimed.
