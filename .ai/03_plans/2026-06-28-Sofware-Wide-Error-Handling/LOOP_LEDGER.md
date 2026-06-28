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
- Defined 6 implementation phases (P1–P6).
- Initialized OMX `autoresearch-goal` mission at `.omx/goals/autoresearch/software-wide-error-handling/`.

### Iteration 4 — EXECUTE (2026-06-28 19:30 → original pack complete)
Wrote each plan document with content grounded in the audit + research above. Original pack over-claimed implementation readiness; Iteration 5 repairs that.

### Iteration 5 — VERIFY/REPAIR (2026-06-28 Codex)
Reviewer gate: native council review found feasibility, security/privacy, coherence, and adversarial issues. The lead integrated fixes and downgraded full-package readiness to `CONDITIONALLY READY`.

### Iteration 6 — RECORD + DECIDE (verifier PASS)
- Final native verifier result: PASS — no remaining P0/P1 planning blockers for the approved conditional-ready scope.
- Keep README and `12_TRACEABILITY_AND_READINESS_REVIEW.md` at `CONDITIONALLY READY`.
- Full `IMPLEMENTATION-READY` requires P1+pilot evidence plus a fresh independent review.

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
