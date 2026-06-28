# 08 — Implementation Plan

Authoritative execution guide for the implementation AI. Phased with ultragoal-style per-phase contract. Ponytail-aware: smallest coherent change per phase.

## Phase order and dependency graph

```
P1 (Foundation)  ──┬──▶ P2 (Server unification, parallel-safe)
                   │
                   ├──▶ P3 (Client wiring, parallel-safe with P2)
                   │
                   ├──▶ P4 (Dev logging pipeline)
                   │
                   └──▶ P5 (Prod observability; depends on P1 + P4)

P6 (Verification) — depends on P1–P5
```

P2 and P3 may run in parallel after P1 lands (no shared-file conflicts). P4 may run in parallel with P2/P3 (depends only on P1's logger interface). P5 depends on P1 (AppError) + P4 (logger).

## P1 — Foundation: typed AppError + logger module

**Goal:** Establish `src/lib/observability/` with no behavior change to the rest of the codebase. Pure addition.

**Requirements covered:** FR-001, ARCH-001, LOG-001, LOG-002, SEC-001, PERF-001, TEST-001, DOC-001.

**Prerequisites:** baseline green (`bun run type-check && bun run lint && bun run test && bun run test:dom`).

**Work packages:**

| WP | Task | File(s) | Complexity |
|---|---|---|---|
| P1-WP1 | Create `src/lib/observability/app-error.ts` with abstract `AppError` + 9 subclasses | new | M |
| P1-WP2 | Create `src/lib/observability/action-result.ts` discriminated union | new | S |
| P1-WP3 | Create `src/lib/observability/unwrap-supabase.ts` Postgres→AppError translator | new | S |
| P1-WP4 | Create `src/lib/observability/with-action-errors.ts` wrapper | new | S |
| P1-WP5 | Create `src/lib/observability/route-error.ts` errorResponse helper | new | S |
| P1-WP6 | Create `src/lib/observability/types.ts` DevLogRecord + AppErrorLogRecord | new | S |
| P1-WP7 | Create `src/lib/observability/redact.ts` PII redaction (per `06` Section B) | new | M |
| P1-WP8 | Create `src/lib/observability/toast-config.ts` kind→tone/copy/duration map | new | S |
| P1-WP9 | Create `src/lib/observability/logger.ts` NDJSON writer + PERF_TRACE integration + Sentry shim (no-op in P1) | new | M |
| P1-WP10 | Tests: `tests/vitest/{app-error,unwrap-supabase,with-action-errors,logger,redact}.test.ts` | new | M |
| P1-WP11 | Tests: `tests/vitest/logger-perf.test.ts` (1000 calls, p95 <1ms) | new | S |
| P1-WP12 | Add `pino-pretty` to devDependencies (dev-only pretty printer) | package.json | XS |
| P1-WP13 | Add `observability/` to `tsconfig.json` paths if needed; verify `bun run type-check` passes | tsconfig.json | XS |

**Parallelizable:** P1-WP1, WP6, WP7, WP8 are independent.
**Sequential:** WP4/WP5 depend on WP1. WP9 depends on WP1, WP6, WP7.

**Validation commands:**
```bash
bun run type-check
bun run lint
bun run test:dom -- tests/vitest/app-error.test.ts tests/vitest/unwrap-supabase.test.ts tests/vitest/with-action-errors.test.ts tests/vitest/logger.test.ts tests/vitest/redact.test.ts tests/vitest/logger-perf.test.ts
```

**Exit criteria:**
- All WP files exist and pass type-check + lint.
- All new tests green.
- Existing tests still green.
- `./logs/dev.ndjson` not yet written (logger is wired but no callers exist yet — still pure addition).

**Rollback:** delete `src/lib/observability/` directory + remove `pino-pretty` from devDeps. No other code touched.

**Risks:**
- RISK-ERR-001 — Over-engineering the taxonomy. Mitigation: 9 leaf classes max; revisit at P2 boundary.
- RISK-ERR-002 — Logger file-handle leak. Mitigation: `createWriteStream(append)` once per process; close on `process.on('exit')`.

## P2 — Server unification: wrap all 22 server actions + 22 route handlers

**Goal:** Every server entry point returns `ActionResult<T>` or `errorResponse(...)`.

**Requirements covered:** FR-002, FR-003, FR-007, AC-002.1-3, AC-003.1-2, AC-007.1-3.

**Prerequisites:** P1 complete; logger interface stable.

**Work packages (parallel-safe per module):**

| WP | Module | Files | Complexity |
|---|---|---|---|
| P2-WP1 | Wrap publication/actions.ts (HIGHEST PRIORITY — raw Supabase throws) | 1 file | M |
| P2-WP2 | Wrap auth/{account,actions,beta-allowlist-admin}-actions.ts + add mapAuthCodeToAppError bridge | 3 files + bridge | M |
| P2-WP3 | Wrap collaboration/{actions,pending-invite,realtime-identity,summary}-actions.ts | 4 files | M |
| P2-WP4 | Wrap component-library/{actions,template-editor-actions}.ts (migrate throwActionError) | 2 files | S |
| P2-WP5 | Wrap estimates/{actions,express-promotion,subtree}-actions.ts | 3 files | M |
| P2-WP6 | Wrap favorites/, legal/, notifications/, projects/, publisher/, reusable-sources/, workshop/, estimate-sheet/ actions.ts | 12 files | M |
| P2-WP7 | Wrap all 22 route handlers in `src/app/api/**/route.ts` with try/catch + `errorResponse` | 22 files | M |
| P2-WP8 | Extend `tests/vitest/route-error-smoke-gate.test.ts` to cover all 22 handlers | test extension | M |

**Parallelization:** each WP can be a separate PR. WPs do not share files.

**Validation commands:**
```bash
bun run type-check
bun run lint
bun run test:dom
# All existing tests must still pass
```

**Exit criteria:**
- All 22 action files export `withActionErrors(...)`-wrapped functions.
- All 22 route handlers have try/catch with `errorResponse`.
- `grep -rn "throw new Error(" src/lib/*/actions.ts src/app/api/**/route.ts` returns nothing outside tests.
- Existing server-action tests still green.

**Rollback:** revert per-module PRs.

**Risks:**
- RISK-ERR-003 — Wrapping a function changes its TS signature; caller breaks. Mitigation: preserve argument types via `Args extends unknown[]`.
- RISK-ERR-004 — Existing tests expect `throw` behavior, not `{ok:false}`. Mitigation: tests use the helper `_createProject` directly OR are updated to call the wrapped version with `useActionState`.

## P3 — Client wiring: error.tsx, global-error.tsx, not-found.tsx, toast.appError

**Goal:** Every React error boundary renders brand UI; client-side errors get toasted and logged.

**Requirements covered:** FR-004, FR-005, FR-006, UX-001, A11Y-001, A11Y-002.

**Prerequisites:** P1 complete. (Does NOT depend on P2.)

**Work packages:**

| WP | Task | File(s) | Complexity |
|---|---|---|---|
| P3-WP1 | Create `src/app/global-error.tsx` (renders `<html><body>`, POSTs to /api/internal/client-error) | new | S |
| P3-WP2 | Create `src/app/error.tsx` (renders inside layout, calls toast.appError on mount) | new | S |
| P3-WP3 | Create `src/app/not-found.tsx` (brand-styled 404) | new | S |
| P3-WP4 | Create `src/app/api/internal/client-error/route.ts` (rate-limited per `06` Section F) | new | M |
| P3-WP5 | Extend `src/components/ui/toast.tsx` to add `toast.appError(err)` (preserves existing API) | extend | S |
| P3-WP6 | Update `WorkshopRouteErrorState` to call `toast.appError` + log via /api/internal/client-error | extend | M |
| P3-WP7 | Add global `unhandledrejection` listener in `src/app/providers.tsx` that calls toast.appError + POSTs to /api/internal/client-error | extend providers.tsx | S |
| P3-WP8 | Tests: `tests/vitest/{toast-apperror,toast-a11y,client-error}.test.ts(x)` | new | M |
| P3-WP9 | Playwright `e2e/global-error.spec.ts` that forces a layout-level throw | new | M |

**Parallelization:** WP1-3 parallel. WP4 independent. WP5-6 sequential (both touch toast).

**Validation:**
```bash
bun run type-check
bun run lint
bun run test:dom -- tests/vitest/toast-apperror.test.tsx tests/vitest/toast-a11y.test.tsx tests/vitest/client-error.test.ts
bun run test:e2e -- e2e/global-error.spec.ts
```

**Exit criteria:**
- `global-error.tsx` exists; Playwright test proves it works.
- `error.tsx` toasts on mount.
- `toast.appError(err)` picks correct tone per kind.
- `/api/internal/client-error` rate-limits correctly.

**Rollback:** delete P3 files. Existing toast API unchanged.

## P4 — Dev logging pipeline: NDJSON file + AI tail command

**Goal:** AI coding agents can `tail -f ./logs/dev.ndjson` and diagnose failures.

**Requirements covered:** LOG-003, LOG-004, ARCH-002 (server-timing consumed).

**Prerequisites:** P1 complete.

**Work packages:**

| WP | Task | File(s) | Complexity |
|---|---|---|---|
| P4-WP1 | Add `logs/` to `.gitignore` | extend .gitignore | XS |
| P4-WP2 | Wire the dev logger to actually write to `./logs/dev.ndjson` (was no-op in P1) | extend logger.ts | M |
| P4-WP3 | Implement truncate-on-dev-start + 50MB rotation | extend logger.ts | M |
| P4-WP4 | Create `scripts/tail-dev-logs.mjs` per `04` Section D | new | M |
| P4-WP5 | Add `logs:tail`, `logs:explain`, `logs:dev` scripts to `package.json` | extend package.json | XS |
| P4-WP6 | Tests: `tests/unit/tail-dev-logs.test.ts` (parsing, --explain summary) | new | M |
| P4-WP7 | Append a sample session to `./logs/dev.ndjson` during a `bun run dev` smoke test | manual smoke | XS |

**Validation:**
```bash
bun run test:unit -- tests/unit/tail-dev-logs.test.ts
bun run dev &  # background; generate a test error via curl /api/health/<bad>; kill dev
bun run logs:tail --last 5
```

**Exit criteria:**
- `./logs/dev.ndjson` populates during `bun run dev`.
- `bun run logs:explain <id>` prints a full AI-readable summary.
- AI agent (manual test) can read the log and identify the error class + route + cause.

**Rollback:** delete `./logs/`, revert logger wiring (becomes no-op), delete scripts/tail-dev-logs.mjs.

## P5 — Production observability: Sentry + instrumentation.ts

**Goal:** Production errors flow to Sentry with source maps.

**Requirements covered:** OBS-001, OBS-002, SEC-002, SEC-004, PERF-002.

**Prerequisites:** P1 + P4 complete.

**Work packages:**

| WP | Task | File(s) | Complexity |
|---|---|---|---|
| P5-WP1 | `bun add @sentry/nextjs`; run `npx @sentry/wizard@latest -i nextjs` | package.json, next.config.ts, sentry.*.config.ts | M |
| P5-WP2 | Add `SENTRY_DSN` to `.env.example`; document procurement | .env.example, README.md | XS |
| P5-WP3 | Configure `sentry.server.config.ts` per `05` Section A.3 + redaction `beforeSend` | extend | M |
| P5-WP4 | Configure `sentry.client.config.ts` with same redaction + maskAllText in prod | extend | S |
| P5-WP5 | Create `instrumentation.ts` per `05` Section A.2 | new | S |
| P5-WP6 | Add sourcemap upload step to `.github/workflows/ci.yml` (only on main pushes; uses `SENTRY_AUTH_TOKEN` secret) | extend ci.yml | M |
| P5-WP7 | Replace `/api/internal/client-error` rateLimiter Map with Upstash Redis (or keep in-memory for MVP) | conditional | M |
| P5-WP8 | Tests: `tests/vitest/{instrumentation,sentry-redact}.test.ts` | new | M |
| P5-WP9 | Add bundle-analyzer CI gate: fail build if client delta > 60KB vs main | extend ci.yml | S |

**Validation:**
```bash
SENTRY_DSN=... bun run build
bun run test:dom -- tests/vitest/instrumentation.test.ts tests/vitest/sentry-redact.test.ts
# Manual: deploy to Vercel preview; trigger a /api/health/throw; verify Sentry receives event
```

**Exit criteria:**
- Sentry dashboard receives a real test error with source-mapped stack.
- `beforeSend` redaction works (test fixture with auth header).
- Bundle size delta <60KB.

**Rollback:** set `SENTRY_DSN=` (empty) — Sentry becomes no-op; logger still writes dev NDJSON.

## P6 — Verification: targeted vitest + Playwright + adversarial + AI-diagnosability

**Goal:** Prove every requirement via the test matrix in `09_TEST_QA_ULTRAQA_PLAN.md`.

**Requirements covered:** TEST-003.

**Prerequisites:** P1–P5 complete.

**Work packages:**

| WP | Task | Complexity |
|---|---|---|
| P6-WP1 | Execute `09` Section B test execution matrix; record PASS/PARTIAL/MISSING per row | M |
| P6-WP2 | Execute `09` Section C adversarial matrix; capture artifacts | M |
| P6-WP3 | Manual AI-diagnosability proof: induce an error in dev; run `bun run logs:explain`; verify AI agent (Claude/Codex) can read the output and propose the correct fix | M |
| P6-WP4 | Update `13_FINAL_AUDIT_SCORECARD.md` with PASS/FAIL per rubric item | S |
| P6-WP5 | Update `.ai/10_state/current-state.md` with a closeout entry | S |

**Exit criteria:**
- Every rubric item in `13` shows PASS.
- AI-diagnosability proof logged in `13`.
- README status flipped to "IMPLEMENTED" (out of planning scope).

## Pre-implementation gates (must pass before any code edit in any phase)

```bash
git status --short --branch    # confirm clean tree on main
bun run type-check              # baseline tsc green
bun run lint                    # baseline ESLint green
```

If any of these fail, stop and resolve first. Pre-existing red tests in `test:dom` (per `.ai/10_state/current-state.md` FAST PATH, ~131 failures across 36 files) are NOT your regression — do not fix them in this plan's PRs.

## Phase-level stop conditions

| Phase | Stop condition |
|---|---|
| P1 | All WPs complete; new tests green; existing tests green |
| P2 | All 22+22 files migrated; existing tests green; `grep "throw new Error" src/lib/*/actions.ts` empty |
| P3 | `global-error.tsx` Playwright test passes; toast.appError works |
| P4 | `./logs/dev.ndjson` populates; `logs:explain` works; AI agent can diagnose |
| P5 | Sentry dashboard receives real error with source-mapped stack |
| P6 | All rubric items PASS in `13_FINAL_AUDIT_SCORECARD.md` |

## Implementation notes for the implementer

1. **Read this entire pack first.** Do not skim.
2. **Per-phase branch:** `feat/error-handling-p1`, `feat/error-handling-p2`, etc. Land each phase separately.
3. **Per-phase PR description:** link to this plan pack; quote the phase's exit criteria; attach test output.
4. **Preserve off-limits files** (README `## Files off-limits`). Any PR touching them is rejected.
5. **Off-ramp:** if any phase's exit criteria cannot be met, document in `LOOP_LEDGER.md` and stop. Do not silently reduce scope.
