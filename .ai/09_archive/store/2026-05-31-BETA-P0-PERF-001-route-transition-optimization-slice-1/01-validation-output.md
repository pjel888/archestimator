# Validation Output

All raw command output is stored in this evidence directory.

## Baseline

- `git status --short --branch`: started on a non-dedicated branch with pre-existing dirty pitch-deck files, then switched to `feat/route-transition-perf`.
- `bun run build 2>&1 | tee baseline-build.txt`: PASS. Baseline build compiled successfully and emitted the app route table with `Proxy (Middleware)`.
- `bun run validate 2>&1 | tee baseline-validate.txt`: FAIL. Baseline failure was lint-only: 94 errors and 34 warnings, concentrated in pre-existing share/publication/deck scopes. This was recorded before route-transition edits.

## Final Commands

| Command | Result | Evidence |
|---|---:|---|
| `bun run type-check` | PASS | `type-check.txt` |
| `bun run lint` | FAIL, pre-existing | `lint.txt` |
| `bun run lint:design-system` | PASS | `design-system.txt` |
| `bun run test` | PASS, 4 tests | `unit-tests.txt` |
| `bun run test:dom` | FAIL, pre-existing/out-of-scope failures | `dom-tests.txt` |
| targeted route/auth/workshop Vitest suite | PASS, 7 files / 66 tests | `targeted-route-tests.txt` |
| touched-file ESLint | PASS with 1 existing TanStack Table warning | `touched-files-eslint.txt` |
| `bun run build` | PASS | `build.txt` |
| `bunx playwright test e2e/auth.spec.ts` | Initial server-start blocked on existing dev server | `e2e-auth.txt` |
| `PLAYWRIGHT_PORT=3000 bunx playwright test e2e/auth.spec.ts` | PASS after updating stale login-copy assertions | `e2e-auth-existing-server-rerun.txt` |
| `git diff --check` | PASS | `git-diff-check.txt` |
| `npx gitnexus detect-changes --scope all --repo archestimator` | HIGH impact due shared shell/sidebar flows | `gitnexus-detect-changes.txt` |

## Fresh Stop-Hook Verification

The stop hook requested fresh verification before closure. These checks were rerun after the evidence/doc updates:

| Command | Result | Evidence |
|---|---:|---|
| `bun run type-check` | PASS | `fresh-type-check.txt` |
| `bun run lint:design-system` | PASS | `fresh-design-system.txt` |
| targeted route/auth/workshop Vitest suite | PASS, 7 files / 66 tests | `fresh-targeted-route-tests.txt` |
| `bun run build` | PASS | `fresh-build.txt` |

## Failing Full-Suite Gates

- `bun run lint`: same 94 errors / 34 warnings as baseline; failures remain in share/publication/deck-related files, plus the known TanStack Table React Compiler warning in `ProjectEstimatesTable`.
- `bun run test:dom`: 17 failed tests in 9 files. Failing scopes are landing/security-header, project-publication/share, project-charts governance, project creation governance, and workshop-library consolidation governance. These are not caused by the route-transition slice and were not repaired under the user's explicit defer-scope instruction.

## Route-Specific Passing Coverage

Targeted route/auth/workshop suite:

```text
Test Files  7 passed (7)
Tests       66 passed (66)
```

Auth Playwright smoke:

```text
2 passed (2.0s)
```

## Impact Review

`gitnexus detect-changes` reports HIGH impact because this slice intentionally touches shared workshop shell/sidebar/navigation flows. Route-targeted regression tests, build, typecheck, design-system lint, and auth E2E smoke passed; full lint/DOM failures remain pre-existing/out of scope.
