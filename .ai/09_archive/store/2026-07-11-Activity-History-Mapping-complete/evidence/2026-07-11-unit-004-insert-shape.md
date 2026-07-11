# UNIT-004 Event Insert Shape Receipt - 2026-07-11

## Result

The reusable-source writer now uses the same 19-column
`estimate_sheet_events` shape as the express-promotion and AI package-builder
writers. Its transaction-local correlation guard remains in place; the three
writers keep their established local idempotency semantics rather than sharing
an abstraction across distinct transaction clients.

## Verification

```text
bunx vitest run tests/vitest/reusable-sources-actions.test.ts tests/vitest/express-promotion-action.test.ts tests/vitest/ai-package-builder-apply.test.ts tests/vitest/activity-event-insert-shape.test.ts
Result: 4 files passed, 25 tests passed

bun run type-check
Result: passed

git diff --check
Result: passed
```

The estimate version-control read path was also inspected: its bound D1 client
is passed through normalized activity filtering, node-scope resolution, and
actor-label resolution.

Proof boundary: local source and automated tests only. No D1 migration or
deployed/provider behavior is claimed.
