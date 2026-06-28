# LOOP_LEDGER — Software-Wide Error Handling Plan

Per `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`. Documents the DISCOVER → PLAN → EXECUTE → VERIFY → RECORD → DECIDE loop for this planning task.

**Loop surface used:** in-session loop (lead only). Background `explore` / `librarian` / `plan` agents were attempted but the agent runtime was unavailable this session (5 background + 1 sync all returned zero output after 30min inactivity timeout). Lead executed the loop directly with bash/grep/read/websearch/context7.

**Verification mode:** `emulated` — lead performed all lanes as separated passes. Readiness capped at 97 per `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md` Section 2.

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
- Missing: `global-error.tsx`, `instrumentation.ts`, structured logger dep, Sentry, Zod
- Inconsistent server action return shapes (7 distinct patterns catalogued)
- Industry research: Next.js 16 instrumentation hooks, useActionState, OTel logs data model, Sentry 2026 fit, GenAI semantic conventions, AI-decision tracing pattern

### Iteration 3 — PLAN (2026-06-28 19:15 → 19:30)
- Selected **standard** profile per `Creating-Plan-Prompt.md` line 1086-1088.
- Defined 16-file pack.
- Defined stable ID prefixes.
- Defined 6 implementation phases (P1–P6).
- Initialized OMX `autoresearch-goal` mission at `.omx/goals/autoresearch/software-wide-error-handling/`.

### Iteration 4 — EXECUTE (2026-06-28 19:30 → in progress)
Writing each plan document with content grounded in the audit + research above. Ponytail mode: tight docs, no fluff.

### Iteration 5 — VERIFY (planned)
Reviewer gate: re-read every doc against the user's verbatim requirements + rubric. Since agent runtime is unavailable, lead does this as a separated pass.

### Iteration 6 — RECORD + DECIDE (planned)
- Update this ledger with verdict.
- Run `omx autoresearch-goal verdict --slug software-wide-error-handling --verdict <pass|fail|blocked> --evidence "..."`.
- If pass: declare plan IMPLEMENTATION-READY in README and `12_TRACEABILITY_AND_READINESS_REVIEW.md`.

## Open decisions

All resolved — see `11_RISKS_DECISIONS_ALTERNATIVES.md` for `DEC-ERR-001` through `DEC-ERR-011` with rejected alternatives.

## Skipped validation

| Validation skipped | Why | Risk | Strongest substitute |
|---|---|---|---|
| Independent reviewer agent | Agent runtime unavailable | Plan may have blind spots an independent reviewer would catch | Lead does emulated reviewer pass with fresh context |
| Plan agent graph | Same runtime issue | Plan structure may be less optimal than what a dedicated plan agent would produce | Lead applied plan-graph pattern from prior canonical packs |
| Browser proof of Toast rendering | Out of scope (planning only) | None — implementation phase will own this | Documented in `09_TEST_QA_ULTRAQA_PLAN.md` as future P3 evidence |
