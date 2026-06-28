# 08 — Implementation Plan

Authoritative execution guide for the implementation AI. Phased with ultragoal-style per-phase contract. Ponytail-aware: smallest coherent change per phase.

**Readiness status:** `CONDITIONALLY READY`. Approved execution scope is P1 plus the pilot vertical (`publication/actions.ts`, one representative route handler, and one UI error surface), plus the P4 dev logging pilot. Full all-actions/all-routes migration is intentionally gated on pilot evidence.

## Phase order and dependency graph

```
P1 (Foundation)  ──┬──▶ P2a (Pilot server unification, parallel-safe)
                   │
                   ├──▶ P3a (Pilot client wiring, parallel-safe with P2a)
                   │
                   ├──▶ P4 (Dev logging pipeline)
                   │
                   └──▶ P5 (Prod observability design; depends on P1 + P4 and owner/provider gate)

P6a (Pilot verification) — depends on P1, P2a, P3a, P4; P5 provider proof is separately gated
```

P2a and P3a pilot work may run in parallel after P1 lands (no shared-file conflicts). P4 may run in parallel with pilot P2a/P3a (depends only on P1's logger interface). P5 is a design/provider gate after P1 + P4; production credentials, GitHub secrets, Vercel env changes, and preview/production deploy proof require explicit execution-time authority.

## P1 — Foundation: typed AppError + logger module

**Goal:** Establish `src/lib/observability/` with no behavior change to the rest of the codebase. Pure addition.

**Requirements covered:** FR-001, ARCH-001, LOG-002, SEC-001, TEST-001, DOC-001.

**Prerequisites:** `bun run type-check` and `bun run lint` baseline characterized. Do not require full `bun run test` / `bun run test:dom` green because `.ai/10_state/current-state.md` records known pre-existing `test:dom` failures.

**Work packages:**

| WP | Task | File(s) | Complexity |
|---|---|---|---|
| P1-WP1 | Create `src/lib/observability/app-error.ts` with abstract `AppError` + 9 public kinds / 12 concrete subclasses | new | M |
| P1-WP2 | Create `src/lib/observability/action-result.ts` discriminated union | new | S |
| P1-WP3 | Create `src/lib/observability/unwrap-supabase.ts` Postgres→AppError translator | new | S |
| P1-WP4 | Create `src/lib/observability/with-action-errors.ts` wrapper | new | S |
| P1-WP5 | Create `src/lib/observability/route-error.ts` errorResponse helper | new | S |
| P1-WP6 | Create `src/lib/observability/types.ts` DevLogRecord + AppErrorLogRecord | new | S |
| P1-WP7 | Create `src/lib/observability/redact.ts` PII redaction (per `06` Section B) | new | M |
| P1-WP8 | Create `src/lib/observability/toast-config.ts` kind→tone/copy/duration map | new | S |
| P1-WP9 | Create `src/lib/observability/logger.ts` interface + redaction path + no-op/dev-console transport; no file writer yet | new | M |
| P1-WP10 | Tests: `tests/vitest/{app-error,unwrap-supabase,with-action-errors,redact}.test.ts` | new | M |
| P1-WP11 | Characterization: record current targeted baseline for nearby existing auth/library error tests | docs/test output | S |
| P1-WP12 | Add `observability/` to `tsconfig.json` paths if needed; verify `bun run type-check` passes | tsconfig.json | XS |

**Parallelizable:** P1-WP1, WP6, WP7, WP8 are independent.
**Sequential:** WP4/WP5 depend on WP1. WP9 depends on WP1, WP6, WP7.

**Validation commands:**
```bash
bun run type-check
bun run lint
bun run test:dom -- tests/vitest/app-error.test.ts tests/vitest/unwrap-supabase.test.ts tests/vitest/with-action-errors.test.ts tests/vitest/redact.test.ts tests/vitest/auth-error-mapping.test.ts tests/vitest/library-action-errors.test.ts
```

**Exit criteria:**
- All WP files exist and pass type-check + lint.
- All new tests green.
- Targeted existing regression tests above show no new failures against the recorded baseline.
- `./logs/dev.ndjson` not yet written (file writer belongs to P4).

**Rollback:** delete `src/lib/observability/` directory. No other code touched.

**Risks:**
- RISK-ERR-001 — Over-engineering the taxonomy. Mitigation: 9 public kinds / 12 concrete subclasses max; revisit at pilot boundary.
- RISK-ERR-002 — Logger file-handle leak. Mitigation: `createWriteStream(append)` once per process; close on `process.on('exit')`.

## P2a — Pilot server unification: wrap publication/actions.ts + one route handler

**Goal:** Prove the canonical server contract on the riskiest server action module and one representative route handler before broad migration.

**Requirements covered:** FR-002, FR-003. (Acceptance criteria qualified by parent requirement: FR-002 AC-002.1–3, FR-003 AC-003.1–2. FR-007 auth-bridge is P2b follow-on per `07` and `12`.)

**Prerequisites:** P1 complete; logger interface stable.

**Work packages:**

| WP | Module | Files | Complexity |
|---|---|---|---|
| P2a-WP1 | Wrap `src/lib/publication/actions.ts` (highest priority — raw Supabase throws) | 1 file | M |
| P2a-WP2 | Select one representative `src/app/api/**/route.ts` handler with current error-path coverage and wrap with `errorResponse` | 1 file | M |
| P2a-WP3 | Add/update only targeted tests for the pilot action and route handler | tests | M |
| P2a-WP4 | Record pilot findings and migration adjustments in `LOOP_LEDGER.md` | docs | S |

**Parallelization:** P2a-WP1 and P2a-WP2 can split if tests do not share fixtures.

**Validation commands:**
```bash
bun run type-check
bun run lint
bun run test:dom -- <pilot action test> <pilot route-handler test> tests/vitest/with-action-errors.test.ts tests/vitest/route-error.test.ts
```

**Exit criteria:**
- `publication/actions.ts` exports `withActionErrors(...)`-wrapped functions without leaking raw Supabase details to clients.
- The selected route handler returns `errorResponse(...)` for failures.
- Targeted tests pass with no new failures against the known baseline.
- Pilot findings list any signature, caller, or test-impact adjustments required before full migration.

**Rollback:** revert per-module PRs.

**Risks:**
- RISK-ERR-003 — Wrapping a function changes its TS signature; caller breaks. Mitigation: preserve argument types via `Args extends unknown[]`.
- RISK-ERR-004 — Existing tests expect `throw` behavior, not `{ok:false}`. Mitigation: tests use the helper `_createProject` directly OR are updated to call the wrapped version with `useActionState`.

## P2b — Full server migration (blocked until pilot pass)

The original all-22-actions/all-22-route-handlers migration is not approved as a single first implementation sweep. After P2a passes, update this plan with actual pilot evidence, then migrate in small module groups:
- auth + auth bridge
- collaboration
- component library
- estimates
- remaining low-risk actions
- remaining route handlers

## P3a — Pilot client wiring: one error surface + toast.appError

**Goal:** Prove the client error-surface pattern on one root or segment boundary before broad rollout.

**Requirements covered:** FR-004, FR-005, FR-006, UX-001, A11Y-001, A11Y-002.

**Prerequisites:** P1 complete. (Does NOT depend on P2.)

**Work packages:**

| WP | Task | File(s) | Complexity |
|---|---|---|---|
| P3a-WP1 | Create one pilot `src/app/global-error.tsx` or route-segment `error.tsx` using `unstable_retry` and safe copy | new | S |
| P3a-WP2 | Create `src/app/api/internal/client-error/route.ts` with same-origin checks, strict local parser, redaction, tainted-field labeling, and local/preview rate limit | new | M |
| P3a-WP3 | Extend `src/components/ui/toast.tsx` to add `toast.appError(err)` (preserves existing API) | extend | S |
| P3a-WP4 | Tests: `tests/vitest/{toast-apperror,toast-a11y,client-error}.test.ts(x)` | new | M |
| P3a-WP5 | Browser smoke only if static/DOM tests cannot prove the chosen boundary behavior | optional | M |

**Parallelization:** WP1 and WP2 can split. WP3 touches a protected contract and should serialize with other toast edits.

**Validation:**
```bash
bun run type-check
bun run lint
bun run test:dom -- tests/vitest/toast-apperror.test.tsx tests/vitest/toast-a11y.test.tsx tests/vitest/client-error.test.ts
# Browser proof only when the chosen boundary behavior cannot be proven by DOM/static tests:
bun run test:e2e -- e2e/global-error.spec.ts
```

**Exit criteria:**
- One selected error boundary renders safe fallback copy and recovery action.
- `toast.appError(err)` picks correct tone per `code` (with `kind` fallback) per `03` Section C.1.
- `/api/internal/client-error` rate-limits correctly.
- `/api/internal/client-error` redacts client text and labels tainted fields.

**Rollback:** delete P3a files. Existing toast API unchanged.

## P4 — Dev logging pipeline: NDJSON file + AI tail command

**Goal:** AI coding agents can `tail -f ./logs/dev.ndjson` and diagnose failures.

**Requirements covered:** LOG-003, LOG-004, ARCH-002 (server-timing consumed).

**Prerequisites:** P1 complete.

**Work packages:**

| WP | Task | File(s) | Complexity |
|---|---|---|---|
| P4-WP1 | Add `logs/` to `.gitignore` | extend .gitignore | XS |
| P4-WP2 | Wire the dev logger to write to `./logs/dev.ndjson` | extend logger.ts | M |
| P4-WP3 | Implement truncate-on-dev-start + 50MB rotation | extend logger.ts | M |
| P4-WP4 | Create `scripts/tail-dev-logs.mjs` per `04` Section D | new | M |
| P4-WP5 | Add `logs:tail`, `logs:explain`, `logs:dev` scripts to `package.json` | extend package.json | XS |
| P4-WP6 | Tests: `tests/unit/tail-dev-logs.test.ts` (parsing, --explain summary, tainted-field labeling) | new | M |
| P4-WP7 | Tests: `tests/vitest/{logger,logger-perf}.test.ts` (NDJSON schema + p95 budget with file writer enabled) | new | M |
| P4-WP8 | Append a sample session to `./logs/dev.ndjson` during a `bun run dev` smoke test | manual smoke | XS |

**Validation:**
```bash
bun run test -- tests/unit/tail-dev-logs.test.ts
bun run test:dom -- tests/vitest/logger.test.ts tests/vitest/logger-perf.test.ts
bun run dev &  # background; generate a test error via curl /api/health/<bad>; kill dev
bun run logs:tail --last 5
```

**Exit criteria:**
- `./logs/dev.ndjson` populates during `bun run dev`.
- `bun run logs:explain <id>` prints a full AI-readable summary.
- AI agent (manual test) can read the log and identify the error class + route + cause.

**Rollback:** delete `./logs/`, revert logger wiring (becomes no-op), delete scripts/tail-dev-logs.mjs.

## P5 — Production observability: Sentry design + owner/provider gate

**Goal:** Prepare Sentry integration safely, but do not enable external provider state, GitHub secrets, Vercel env vars, or production proof without explicit execution-time authority.

**Requirements covered:** OBS-001, OBS-002, SEC-002, SEC-004, PERF-002.

**Prerequisites:** P1 + P4 complete.

**Work packages:**

| WP | Task | File(s) | Complexity |
|---|---|---|---|
| P5-WP1 | Confirm owner-approved Sentry project, DSN, auth-token/secret handling, source-map policy, replay-off policy, retention/access controls | decision record | M |
| P5-WP2 | `bun add @sentry/nextjs`; run Sentry wizard only after P5-WP1 is approved | package.json, next.config.ts, sentry.*.config.ts | M |
| P5-WP3 | Add `SENTRY_DSN` to `.env.example`; document procurement; do not write real secrets | .env.example, README.md | XS |
| P5-WP4 | Configure `sentry.server.config.ts` per `05` Section A.3 + redaction `beforeSend`; replay sampling remains `0` | extend | M |
| P5-WP5 | Configure `sentry.client.config.ts` with same redaction + maskAllText in prod + replay off | extend | S |
| P5-WP6 | Create `instrumentation.ts` per `05` Section A.2 | new | S |
| P5-WP7 | Add sourcemap upload CI step only after GitHub secret and owner-approved policy exist | extend ci.yml | M |
| P5-WP8 | Replace `/api/internal/client-error` local/preview Map with selected provider-backed limiter before production enablement | conditional/provider-gated | M |
| P5-WP9 | Tests: `tests/vitest/{instrumentation,sentry-redact}.test.ts` | new | M |
| P5-WP10 | Add bundle-analyzer CI gate: fail build if client delta > 60KB vs main | extend ci.yml | S |

**Validation:**
```bash
SENTRY_DSN=... bun run build  # only after P5-WP1 owner/provider gate
bun run test:dom -- tests/vitest/instrumentation.test.ts tests/vitest/sentry-redact.test.ts
# Manual preview/provider proof only after explicit owner authority:
# deploy to Vercel preview; trigger a /api/health/throw; verify Sentry receives event
```

**Exit criteria:**
- Sentry dashboard receives a real test error with source-mapped stack only when P5 owner/provider authority is granted.
- `beforeSend` redaction works (test fixture with auth header).
- Bundle size delta <60KB.

**Rollback:** set `SENTRY_ENABLED=false` (the P5 kill switch — see `10_ROLLOUT_ROLLBACK_OPS.md` Section A and C). The guard in `sentry.server.config.ts` `register()` and `captureRequestError()` short-circuits, so Sentry becomes a no-op while the dev NDJSON logger keeps working. `SENTRY_DSN=` (empty) achieves the same effect at the SDK level but is not the canonical rollback path; the dedicated kill switch is preferred because it does not require changing provider env vars.

## P6a — Pilot verification: targeted vitest + browser/adversarial + AI-diagnosability

**Goal:** Prove the approved pilot requirements via the test matrix in `09_TEST_QA_ULTRAQA_PLAN.md`.

**Requirements covered:** TEST-003.

**Prerequisites:** P1, P2a, P3a, and P4 complete. P5 provider proof is separate and owner-gated.

**Work packages:**

| WP | Task | Complexity |
|---|---|---|
| P6a-WP1 | Execute the pilot rows in `09` Section B; record PASS/PARTIAL/MISSING per row | M |
| P6a-WP2 | Execute pilot-relevant adversarial rows in `09` Section C; capture artifacts | M |
| P6a-WP3 | Manual AI-diagnosability proof: induce an error in dev; run `bun run logs:explain`; verify an AI agent can read the output and propose the correct fix while ignoring tainted instructions | M |
| P6a-WP4 | Update `13_FINAL_AUDIT_SCORECARD.md` with pilot PASS/FAIL and full-migration blockers | S |
| P6a-WP5 | Update `.ai/10_state/current-state.md` with a closeout entry | S |

**Exit criteria:**
- Approved pilot rubric items in `13` show PASS.
- AI-diagnosability proof logged in `13`.
- README status may be upgraded only to "PILOT IMPLEMENTED"; full `IMPLEMENTED` remains out of scope until the broad migration passes.

## Pre-implementation gates (must pass before any code edit in any phase)

```bash
git status --short --branch    # inspect branch and preserve unrelated worktree changes
bun run type-check              # baseline tsc green
bun run lint                    # baseline ESLint green
```

If type-check or lint fails, stop and characterize the baseline before editing. Pre-existing red tests in `test:dom` (per `.ai/10_state/current-state.md` FAST PATH, ~131 failures across 36 files) are NOT your regression; use targeted changed-behavior tests plus no-new-failures against the recorded baseline.

## Phase-level stop conditions

| Phase | Stop condition |
|---|---|
| P1 | All WPs complete; new tests green; targeted existing error tests show no new failures |
| P2a | Pilot action + route handler migrated; targeted tests green; pilot findings recorded |
| P2b | Blocked until P2a pass and plan update |
| P3a | Selected boundary + toast.appError + client-error endpoint work; targeted tests green |
| P4 | `./logs/dev.ndjson` populates; `logs:explain` works; AI agent can diagnose |
| P5 | Static Sentry config tests pass; real dashboard/source-map proof only after owner/provider authority |
| P6a | Pilot rubric items PASS in `13_FINAL_AUDIT_SCORECARD.md`; full migration remains conditional |

## Implementation notes for the implementer

1. **Read this entire pack first.** Do not skim.
2. **Per-phase branch:** `feat/error-handling-p1`, `feat/error-handling-p2`, etc. Land each phase separately.
3. **Per-phase PR description:** link to this plan pack; quote the phase's exit criteria; attach test output.
4. **Preserve protected contracts** (README `## Protected contracts`). Additive edits are allowed only where the plan explicitly names them.
5. **Off-ramp:** if any phase's exit criteria cannot be met, document in `LOOP_LEDGER.md` and stop. Do not silently reduce scope.
