# UNIT-009 Variant And Propagation Receipt - 2026-07-11

## Result

Variant changes now add an explicit `variant_changed` field and typed prior/new
variant identity to the source-row activity event. Project-component fan-out
captures up to 100 authorized sibling-row before/after facts under that same
correlation ID, together with the total propagated-row count and truncation
count. The Activity History card shows the count without rendering raw row IDs.

## Verification

```text
bunx vitest run tests/vitest/activity-variant-propagation.test.ts tests/vitest/estimate-sheet-activity-history-ui.test.tsx tests/vitest/estimate-component-fan-out.test.ts tests/vitest/estimate-component-identity.test.ts
Result: 4 files passed, 16 tests passed

bun run type-check
Result: passed

git diff --check
Result: passed
```

Proof boundary: local source and automated tests only. No deployment, provider,
or unbounded fan-out claim is made.
