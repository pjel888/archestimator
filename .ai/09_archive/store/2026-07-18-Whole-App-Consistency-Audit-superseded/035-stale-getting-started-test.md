# Unit 035 (N-04) — Stale `getting-started-route.test.ts` (NEW, cleanup)

**Finding:** N-04 (discovered during F-08 re-verification) · **Severity:** LOW (cleanup) · **Priority:** P4 · **Status:** TODO

## Problem

`tests/vitest/getting-started-route.test.ts` references the `FirstEstimateChecklist` rendering
that was removed when `src/app/workshop/getting-started/page.tsx` became a bare
`redirect("/workshop")` (commit `a68c8393d`). The test is stale and will fail.

## Fix

Update or delete the test to match the current redirect-only route.

## Acceptance

Test (if retained) asserts the redirect; type-check of the test scope passes.

> Note: editing/running tests requires user authorization (User Test Authorization Gate). This
> unit is scoped to the test file only; execution needs a `TEST_TASK` go-ahead.
