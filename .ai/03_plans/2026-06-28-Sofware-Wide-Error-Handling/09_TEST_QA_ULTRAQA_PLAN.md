# 09 — Test, QA, and UltraQA Plan

Test execution matrix + adversarial scenario matrix. Per `Creating-Plan-Prompt.md` Section 8A and `Multi-Agent-Execution-Directive.md` Section 12.

## A. Test framework inventory

- **Vitest (jsdom)** — DOM tests, `bun run test:dom`, `tests/vitest/`. Used for unit + integration + component.
- **Bun test** — unit, `bun run test`, `tests/unit/`. Used for scripts and pure logic.
- **Playwright** — E2E, `bun run test:e2e`, `e2e/`. Used for browser-only flows.
- **React Testing Library** — available for component assertions.
- **msw** — NOT installed. Mock via `vi.fn()` or custom fetch stubs.
- **vitest-axe** — NOT installed. Manual axe-core probe for accessibility work.

## B. Test execution matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence |
|---|---|---|---|---|---|---|
| FR-001 (AppError hierarchy) | `tests/vitest/app-error.test.ts` | unit | new | synthetic AppError instances | `bun run test:dom -- tests/vitest/app-error.test.ts` | all 9 subclasses instantiate; `toClientJSON` + `toLogRecord` shape correct |
| FR-001 (unwrapSupabase) | `tests/vitest/unwrap-supabase.test.ts` | unit | new | fixture Postgres errors | same | code 42501 → AuthPermissionDeniedError; PGRST301 → AuthRequiredError; etc. |
| FR-002 (withActionErrors) | `tests/vitest/with-action-errors.test.ts` | unit | new | mock async fn that throws AppError vs generic Error | same | returns `{ok:false,error}` shape for both |
| FR-003 (errorResponse) | `tests/vitest/route-error.test.ts` | unit | new | mock NextRequest | same | returns NextResponse with correct status + JSON body |
| LOG-001 (logger) | `tests/vitest/logger.test.ts` | unit | new | tmpdir log path | same | NDJSON file written; records match schema |
| LOG-002 (redact) | `tests/vitest/redact.test.ts` | unit | new | PII input fixtures | same | no leaks in `NEVER_LOG_KEYS`; hashed IDs; masked emails |
| LOG-003 (tail-dev-logs) | `tests/unit/tail-dev-logs.test.ts` | unit | new | fixture NDJSON file | `bun run test -- tests/unit/tail-dev-logs.test.ts` | each flag works; `--explain` produces summary |
| FR-004 (global-error.tsx) | `e2e/global-error.spec.ts` | Playwright | new | force layout throw via `?forceGlobalError=1` (dev-only) | `bun run test:e2e -- e2e/global-error.spec.ts` | page renders `<h1>Something went wrong</h1>` |
| FR-006 (toast.appError) | `tests/vitest/toast-apperror.test.tsx` | DOM | new | render ToastProvider + call appError | `bun run test:dom -- tests/vitest/toast-apperror.test.tsx` | correct tone per kind |
| A11Y-001 (toast a11y) | `tests/vitest/toast-a11y.test.tsx` | DOM | new | render toast with each tone | same | `role=status` for non-error, `role=alert` for error; `aria-live` correct |
| SEC-003 (client-error rate limit) | `tests/vitest/client-error.test.ts` | integration | new | 11 sequential requests | same | 11th returns 429 |
| OBS-001 (instrumentation) | `tests/vitest/instrumentation.test.ts` | unit | new | mock Sentry init | same | `register` and `onRequestError` callable |
| OBS-002 (Sentry redact) | `tests/vitest/sentry-redact.test.ts` | unit | new | fixture Sentry event with auth header | same | `beforeSend` strips header |
| PERF-001 (logger perf) | `tests/vitest/logger-perf.test.ts` | unit | new | 1000 logger.error calls | same | p95 < 1ms |
| Existing: auth-error-mapping | `tests/vitest/auth-error-mapping.test.ts` | unit | existing | unchanged | same | still GREEN (regression check) |
| Existing: library-action-errors | `tests/vitest/library-action-errors.test.ts` | unit | existing | unchanged | same | still GREEN |
| Existing: route-error-smoke-gate | `tests/vitest/route-error-smoke-gate.test.ts` | integration | existing (extended P2-WP8) | unchanged | same | covers all 22 handlers |
| Existing: workshop-route-error-boundaries | `tests/vitest/workshop-route-error-boundaries.test.tsx` | DOM | existing | unchanged | same | still GREEN |
| Existing: estimate-sheet-tree-query-error | `tests/vitest/estimate-sheet-tree-query-error.test.tsx` | DOM | existing | unchanged | same | still GREEN |
| Existing: no-native-browser-dialogs | `tests/vitest/no-native-browser-dialogs.test.ts` | DOM | existing | unchanged | same | still GREEN |

## C. Adversarial scenario matrix (UltraQA-style)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence |
|---|---|---|---|---|---|---|---|
| ADV-01 | Anonymous attacker | POST `/api/internal/client-error` with 5KB message 11 times in 1 minute | curl loop | `for i in 1..11; do curl -X POST ...; done` | 11th response is HTTP 429 | P6 | `tests/vitest/client-error.test.ts` |
| ADV-02 | Anonymous attacker | POST `/api/internal/client-error` with malformed JSON | curl | `curl -X POST ... -d 'not json'` | HTTP 400 | P6 | same test |
| ADV-03 | Authenticated user | Server action returns `DatabaseError` — verify response body has no DB internals | vitest | call wrapped action with mock that throws raw Postgres error | response body's `error.message` is generic; cause is in server log only | P2 | `tests/vitest/with-action-errors.test.ts` |
| ADV-04 | Authenticated user | Server action throws `AuthPermissionDeniedError` — verify toast tone is `warning`, not `error` | vitest | call action with mock throwing AuthPermissionDeniedError | toast tone is `warning` | P3 | `tests/vitest/toast-apperror.test.tsx` |
| ADV-05 | Anonymous attacker | Trigger `global-error.tsx` via GET `/?forceGlobalError=1` (dev-only) | Playwright | `page.goto('/?forceGlobalError=1')` | page shows `<h1>Something went wrong</h1>`; POST to /api/internal/client-error fires | P3 | `e2e/global-error.spec.ts` |
| ADV-06 | Anonymous attacker | Inject prompt-injection text into error message via /api/internal/client-error | vitest | POST with `{"message":"<script>alert(1)</script>"}` | message stored as string in log; no eval; no HTML injection on render | P6 | `tests/vitest/client-error.test.ts` |
| ADV-07 | Anonymous attacker | Cause logger to write a record >64KB (huge stack) | vitest | throw error with 1000-frame stack | record truncated to 50 frames; WARN line about truncation | P6 | `tests/vitest/logger.test.ts` |
| ADV-08 | Anonymous attacker | Concurrent server-action invocations | vitest | 100 parallel calls | logger writes atomic lines; no interleaving | P6 | `tests/vitest/logger.test.ts` |
| ADV-09 | Anonymous attacker | Trigger unhandledrejection in client | Playwright | `page.evaluate(() => Promise.reject(new Error('x')))` | toast renders; /api/internal/client-error POSTs | P3 | `e2e/global-error.spec.ts` (or new spec) |
| ADV-10 | Anonymous attacker | Probe for source maps at `/_next/static/chunks/*.map` on production deploy | Playwright (prod URL) | `page.goto('https://archestimator.vercel.app/_next/static/chunks/foo.map')` | 404 | P5+P6 | probe in `e2e/source-map-leak.spec.ts` (new) |
| ADV-11 | Anonymous attacker | Sentry event contains `authorization` header | unit | fixture event with header | `beforeSend` strips it | P5 | `tests/vitest/sentry-redact.test.ts` |
| ADV-12 | Authenticated user | Network drops mid-server-action | Playwright | `page.context().setOffline(true); clickButton()` | toast `network` tone; action returns `{ok:false,error:{kind:'network'}}` | P6 | `e2e/network-drop.spec.ts` (new) |
| ADV-13 | Concurrent user | Two browser tabs submit the same server action simultaneously | Playwright × 2 | both click "Save" | no race; both get success or both get conflict | P6 | `e2e/concurrent-action.spec.ts` (new) |
| ADV-14 | AI agent | Tail logs and diagnose a synthetic error | manual | induce error; run `bun run logs:explain <id>` | AI agent (Claude/Codex) reads output and proposes correct fix | P6 | manual proof in `13_FINAL_AUDIT_SCORECARD.md` |

## D. Manual QA scenarios

| ID | Scenario | Setup | Steps | Pass condition |
|---|---|---|---|---|
| MQA-01 | AI-diagnosability proof | dev mode running | 1. induce a Supabase RLS denial via a test action; 2. `bun run logs:tail --error --last 5`; 3. ask an AI agent to propose a fix | AI agent identifies the RLS table, the user role, and the policy gap |
| MQA-02 | End-user error flow | staging deploy | 1. log in; 2. trigger a server action that fails; 3. observe toast | Toast shows correct tone + copy; no DB internals visible |
| MQA-03 | Production Sentry proof | staging deploy | 1. trigger an unhandled route handler error; 2. check Sentry dashboard | Event appears within 60s; stack trace is source-mapped |
| MQA-04 | Source map leak probe | production URL | `curl -I https://archestimator.vercel.app/_next/static/chunks/<chunk>.map` | HTTP 404 |

## E. Skipped validation

| Validation | Why | Risk | Substitute |
|---|---|---|---|
| 100% branch coverage on new modules | out of scope for MVP plan | minor untested branches | target 80% via existing test conventions |
| Visual regression testing | out of scope | none | none — visual QA deferred to implementation phase |
| Load testing the logger | out of scope for MVP | none — pre-launch scale | add `tests/vitest/logger-load.test.ts` after first 100 users |

## F. Ponytail counterweight

The test plan above is the minimum that proves the requirements. Adding more tests "for completeness" is debt unless they catch a real bug class. Each test file targets one requirement and one failure mode.

## G. Off-limits (per README)

Existing tests in `tests/vitest/` are preserved. The plan adds NEW test files; it does not modify existing ones (except `route-error-smoke-gate.test.ts` extension in P2-WP8, which is additive — new test cases, no removal).
