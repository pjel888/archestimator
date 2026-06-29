# LOOP_LEDGER — Software-Wide Error Handling Plan

Per `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`. Documents the DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE loop for this planning task.

**Loop surface used:** original in-session loop plus 2026-06-28 Codex improvement loop. The improvement loop used native read-only council lanes for feasibility, security/privacy, coherence, adversarial review, and final verification where available.

**Verification mode:** `independent` — council-improved via distinct native reviewer findings before final completion.

## Iteration log

### Iteration 1 — DISCOVER (2026-06-28 18:37 → 19:00)
- Read user-pointed prompt templates (`Creating-Plan-Prompt.md`, `Multi-Agent-Execution-Directive.md`).
- Read FAST PATH block of `.ai/10_state/current-state.md`.
- Read prior canonical plan pack structure from git history (commit `4b3d4c3ac`, `Library-Templates-Page`).
- Launched 5 background agents: client audit, server audit, infra audit, Next.js docs research, AI-logs research. ALL FAILED with 30min inactivity timeout, zero output captured.
- Relaunched client audit with tighter scope. SAME FAILURE.
- Sync plan agent. SAME FAILURE.

**Decision:** Pivot to direct execution. Justified: no running agents remain; Anti-Duplication Rule no longer applies.

### Iteration 2 — DISCOVER (direct, 2026-06-28 19:00 → 19:15)
Executed in parallel via bash/grep + websearch + context7. Captured grounded inventory of:
- Toast system (`src/components/ui/toast.tsx` + providers mount)
- 9× `error.tsx` files using `WorkshopRouteErrorState`
- 22 server action files + 22 route handlers + 1 middleware
- `action-errors.ts`, `auth/error-mapping.ts`, `perf/server-timing.ts` existing patterns
- Missing: `global-error.tsx`, `instrumentation.ts`, structured logger module, Sentry, formal validation library
- Inconsistent server action return shapes (7 distinct patterns catalogued)
- Industry research: Next.js 16 instrumentation hooks, useActionState, OTel logs data model, Sentry 2026 fit, GenAI semantic conventions, AI-decision tracing pattern

### Iteration 3 — PLAN (2026-06-28 19:15 → 19:30)
- Selected **standard** profile per `Creating-Plan-Prompt.md` line 1086-1088.
- Defined 16-file pack.
- Defined stable ID prefixes.
- Defined 7 implementation phases (P1, P2a, P2b, P3a, P4, P5, P6a). P2b (broad server migration) is blocked pending P2a pilot evidence per `08` P2b and `DEC-ERR-012`.
- Initialized OMX `autoresearch-goal` mission at `.omx/goals/autoresearch/software-wide-error-handling/`.

### Iteration 4 — EXECUTE (2026-06-28 19:30 → original pack complete)
Wrote each plan document with content grounded in the audit + research above. Original pack over-claimed implementation readiness; Iteration 5 repairs that.

### Iteration 5 — VERIFY/REPAIR (2026-06-28 Codex)
Reviewer gate: native council review found feasibility, security/privacy, coherence, and adversarial issues. The lead integrated fixes and downgraded full-package readiness to `CONDITIONALLY READY`.

### Iteration 6 — RECORD + DECIDE (verifier PASS)
- Final native verifier result: PASS — no remaining P0/P1 planning blockers for the approved conditional-ready scope.
- Keep README and `12_TRACEABILITY_AND_READINESS_REVIEW.md` at `CONDITIONALLY READY`.
- Full `IMPLEMENTATION-READY` requires P1+pilot evidence plus a fresh independent review.

### Iteration 7 — EXECUTE approved pilot (2026-06-29 Codex)

DISCOVER:
- Re-read the plan pack scope and local Next 16 docs for `global-error.tsx`, route handlers, Server Actions, and instrumentation boundaries.
- Confirmed baseline before edits: `bun run type-check` passed; `bun run lint` passed with existing warnings.
- Selected `src/app/api/share/[token]/route.ts` as the representative route handler because it already had publication coverage and public error-path risk.

EXECUTE:
- Added P1 observability modules under `src/lib/observability/`: `app-error.ts`, `action-result.ts`, `types.ts`, `redact.ts`, `logger.ts`, `with-action-errors.ts`, `unwrap-supabase.ts`, `route-error.ts`, and `toast-config.ts`.
- Wrapped the P2a publication pilot: `refreshProjectPublicationSummary` returns `ActionResult<ProjectPublicationSummary | null>` via `withActionErrors`, and `/api/share/[token]` converts unexpected throws to safe `errorResponse(...)` JSON.
- Added the P3a pilot UI/error surfaces: `src/app/global-error.tsx`, `src/app/api/internal/client-error/route.ts`, and additive `toast.appError(error)` while preserving `toast({ ... })`.
- Added the P4 dev NDJSON path and scripts: `.gitignore` `/logs/`, `scripts/tail-dev-logs.mjs`, `scripts/emit-test-log.mjs`, and `package.json` `logs:*` scripts.
- Tightened the log smoke emitter to produce a real AppError-derived record with `error.class`, `error.code`, `context.route`, `context.server_action`, stack frame, and tainted prompt-injection fields.

### Iteration 8 — VERIFY approved pilot (2026-06-29 Codex)

Targeted evidence captured:
- P1 foundation GREEN: `bun run test:dom -- tests/vitest/app-error.test.ts tests/vitest/redact.test.ts tests/vitest/unwrap-supabase.test.ts tests/vitest/with-action-errors.test.ts tests/vitest/route-error.test.ts` passed (`5` files / `15` tests before later hardening additions).
- P2a route GREEN: `bun run test:dom -- tests/vitest/project-publication-route.test.ts` passed (`17` tests).
- P2a action GREEN: `bun run test:dom -- tests/vitest/project-publication-actions.test.ts` passed (`29` tests).
- P3a GREEN: `bun run test:dom -- tests/vitest/global-error.test.tsx tests/vitest/client-error.test.ts tests/vitest/toast-apperror.test.tsx tests/vitest/toast-a11y.test.tsx` passed (`4` files / `13` tests before the prompt-injection hardening addition).
- P4 GREEN: `bun run test:dom -- tests/vitest/logger.test.ts tests/vitest/logger-perf.test.ts` passed; logger perf now asserts `1000` file writes with p95 `< 1ms`. `bun test tests/unit/tail-dev-logs.test.ts` passed (`5` tests).
- Full focused pilot matrix passed after final hardening: `bun run test:dom -- tests/vitest/app-error.test.ts tests/vitest/redact.test.ts tests/vitest/unwrap-supabase.test.ts tests/vitest/with-action-errors.test.ts tests/vitest/route-error.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-route.test.ts tests/vitest/global-error.test.tsx tests/vitest/client-error.test.ts tests/vitest/toast-apperror.test.tsx tests/vitest/toast-a11y.test.tsx tests/vitest/logger.test.ts tests/vitest/logger-perf.test.ts` (`13` files / `82` tests).
- Static gates passed after implementation: `bun run type-check`; `bun run lint` exited `0` with the same known warning class.
- AI-diagnosability smoke passed: `bun run logs:emit-test`, `bun run logs:tail --last 2`, and `bun run logs:explain 2026-06-29T02:20:19.180Z-pid16474-2`.

### Iteration 9 — RECORD + DECIDE (pilot PASS; full rollout gated)

- Update README status to `PILOT IMPLEMENTED`, not full `IMPLEMENTED` (superseded by Iterations 10-11 local rollout closeout).
- Update `13_FINAL_AUDIT_SCORECARD.md` with the P6a pilot evidence and ADV-14 proof.
- Update `.ai/10_state/current-state.md` with a closeout entry while preserving unrelated Add Component state changes already present in the worktree.
- Keep P2b strict response-shape migration and P5b provider/prod proof explicitly gated. Do not archive this plan pack until the README archive policy is met.

### Iteration 10 — EXECUTE local non-Sentry follow-up (2026-06-29 Codex)

DISCOVER:
- Re-read the current plan pack, local Next 16 docs for `error.tsx`, `not-found.tsx`, route handlers, and `instrumentation.ts`, plus existing workflow/debugger instructions.
- Used bounded read-only lanes to map server routes/actions and existing client boundary gaps.
- Found the original strict all-actions/all-routes response-shape migration would break existing custom public contracts, so selected a compatibility path for non-pilot modules.

EXECUTE:
- Added shared client-safe error-report payload building/redaction and reused it from `global-error.tsx` and `WorkshopRouteErrorState`.
- Updated existing workshop segment `error.tsx` files to accept Next 16 `unstable_retry` while preserving `reset` compatibility.
- Added root `src/app/not-found.tsx`.
- Hardened `/api/internal/client-error` with Fetch Metadata rejection, payload-size precheck, local-path/private-id redaction, normalized path/route/source context, and hashed user agent context.
- Added `src/instrumentation.ts` for local Next `onRequestError` logging, with an edge-runtime fallback that avoids Node-only imports.
- Added `mapAuthCodeToAppError(...)` without changing existing auth-code behavior.
- Added `withActionErrorLogging(...)` and structured `logAppError(...)` catch logging for selected share/export route failures while preserving public response shapes.
- Updated `logs:debug` output with a likely-next-step line for AI debugging.

### Iteration 11 — VERIFY + RECORD local non-Sentry rollout (2026-06-29 Codex)

Fresh evidence captured:
- Focused new follow-up matrix passed: `bun run test:dom -- tests/vitest/global-error.test.tsx tests/vitest/workshop-route-error-boundaries.test.tsx tests/vitest/client-error.test.ts tests/vitest/auth-error-mapping.test.ts tests/vitest/with-action-errors.test.ts tests/vitest/not-found.test.tsx tests/vitest/instrumentation.test.ts` (`7` files / `26` tests).
- Broader affected observability matrix passed: `bun run test:dom -- tests/vitest/app-error.test.ts tests/vitest/redact.test.ts tests/vitest/unwrap-supabase.test.ts tests/vitest/with-action-errors.test.ts tests/vitest/route-error.test.ts tests/vitest/project-publication-actions.test.ts tests/vitest/project-publication-route.test.ts tests/vitest/global-error.test.tsx tests/vitest/client-error.test.ts tests/vitest/toast-apperror.test.tsx tests/vitest/toast-a11y.test.tsx tests/vitest/logger.test.ts tests/vitest/logger-perf.test.ts tests/vitest/workshop-route-error-boundaries.test.tsx tests/vitest/not-found.test.tsx tests/vitest/instrumentation.test.ts tests/vitest/auth-error-mapping.test.ts` (`17` files / `98` tests).
- Tail-log unit proof passed: `bun test tests/unit/tail-dev-logs.test.ts` (`6` tests / `14` expects).
- Static gates passed: `bun run type-check`; `bun run lint` exited `0` with known unrelated warnings only.
- AI-diagnosability proof passed: `bun run logs:emit-test` then `bun run logs:debug` explained record `2026-06-29T03:28:15.308Z-pid97564-2`, identified `InternalError`, `INTERNAL_ERROR`, `/__synthetic/logger-test`, `emitTestLog`, top frame `scripts/emit-test-log.mjs:4:17`, likely next step, and untrusted-field warnings.

DECIDE:
- Mark the local non-Sentry rollout implemented.
- Keep Sentry/provider/source-map/dashboard proof gated as P5b.
- Keep forced all-actions/all-routes canonical response-shape migration gated behind caller-by-caller contract review; current compatibility logging is the implemented local path.

## Open decisions

All planning-only owner decisions resolved — see `11_RISKS_DECISIONS_ALTERNATIVES.md` for `DEC-ERR-001` through `DEC-ERR-015` with rejected alternatives.

## Skipped runtime validation

| Validation skipped | Why | Risk | Strongest substitute |
|---|---|---|---|
| Browser proof of Toast rendering | Out of scope for planning-only repair | None for this docs task; implementation phase owns runtime UI proof | Documented in `09_TEST_QA_ULTRAQA_PLAN.md` as future P3a evidence |

## Iteration 5 — Council repair pass (2026-06-28 Codex)

DISCOVER: Native feasibility and security/privacy reviewers found blocking planning contradictions: stale baseline gates, incorrect Next.js `onRequestError` signature, impossible master rollback flag, client-error log poisoning risk, AI-log prompt-injection risk, replay privacy risk, and Sentry query-detail leakage.

PLAN: Treat the user's owner-delegation as planning-only authority. Resolve open owner decisions in docs, not by changing code or provider state.

EXECUTE: Update the plan pack and prompt pair to align contracts, settle deferred decisions, and add explicit untrusted-content boundaries.

VERIFY: Run docs-only grep checks, `git diff --check`, and a final native verifier pass before claiming completion.
