# Regression Notes

## Guardrails Preserved

- No `src/middleware.ts` was created.
- No `getSession()` server-auth shortcut was introduced.
- No 150ms overlay show delay was added.
- No new heavy dependencies were added.
- No `unstable_cache`, `cacheTag`, `"use cache"`, broad `React.memo`, virtualization, or bundle/code-splitting work was started.
- Deferred scopes were not implemented: AI chatbot readiness, landing-page improvement, collaboration/sharing audit, and database indexing/query performance.

## Validation Regressions

No route-transition targeted regression was found:

- Targeted route/auth/workshop Vitest suite passed: 7 files / 66 tests.
- Fresh stop-hook targeted route/auth/workshop Vitest suite passed again: 7 files / 66 tests.
- Auth Playwright smoke passed: 2 tests.
- Fresh build passed.
- Fresh design-system lint passed.
- Fresh type-check passed.

## Pre-Existing Failures Still Present

- Full lint fails with the same baseline 94 errors and 34 warnings, mainly in share/publication/deck scopes.
- Full DOM tests fail with 17 failures in 9 files, mainly landing/security-header, publication/share, chart governance, project creation governance, and workshop library consolidation governance.
- Touched-file ESLint has 0 errors and 1 known React Compiler/TanStack Table warning in `ProjectEstimatesTable`.

## Working Tree Notes

- Pre-existing pitch-deck dirty files and generated screenshots remain out of scope and were not modified.
- `next-env.d.ts` was restored after build regenerated it.

## Next Recommended Route-Transition Phase

Before Phase 3+, collect missing benchmark evidence:

- Manual Chrome throttled route timings.
- Hover/focus Network proof for RSC prefetch.
- bfcache back/forward restore proof.
- Error-boundary forced-render screenshots.
- Slow-route loading skeleton screenshots/traces.

Then decide whether Phase 3 route-shell/Suspense work is justified by measured bottlenecks.
