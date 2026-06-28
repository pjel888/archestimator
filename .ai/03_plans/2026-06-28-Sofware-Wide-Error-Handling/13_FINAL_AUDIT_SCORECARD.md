# 13 — Final Audit Scorecard and Verification

Requirement-by-requirement scorecard + OMX autoresearch-goal critic verdict + verification mode declaration + final report.

## A. Rubric scorecard

The rubric from `.omx/goals/autoresearch/software-wide-error-handling/rubric.md` has 12 items. Each scored PASS / PARTIAL / MISSING.

| # | Rubric item | Verdict | Evidence |
|---|---|---|---|
| 1 | Plan defines typed AppError hierarchy covering all current throw sites | PASS | `03` Section B (9 leaf classes + `unwrapSupabase` covering Postgres codes 42501, PGRST301, PGRST309). Migration inventory in `03` Section G covers all 22 server action modules. |
| 2 | Plan preserves existing Toast API surface | PASS | `03` Section C.1 (`toast.appError` additive); `05` Section B.5 (extend only); `07` FR-006 AC-006.1; README "Files off-limits". |
| 3 | Plan adds root global-error.tsx | PASS | `05` Section A.5; `07` FR-004; `08` P3-WP1; `09` ADV-05. |
| 4 | Plan adds instrumentation.ts onRequestError | PASS | `05` Section A.2; `07` OBS-001; `08` P5-WP5; `02` Section A.3. |
| 5 | Plan unifies server action error return shape | PASS | `03` Section D; `07` FR-002; `08` P2 (8 WPs covering 22 action files). |
| 6 | Plan specifies dev JSONL log path + AI tail command | PASS | `04` Section C-D. |
| 7 | Plan specifies prod forwarder choice with pricing for pre-launch MVP | PASS | `02` Section D-E; `04` Section F; `10` Section H; `11` DEC-ERR-004. |
| 8 | Plan includes PII redaction rules | PASS | `06` Section B; `07` SEC-001, SEC-004; `11` DEC-ERR-005. |
| 9 | Plan includes sample JSONL log line | PASS | `04` Section B.2. |
| 10 | Plan includes hold-harmless list | PASS | README "Files off-limits". |
| 11 | Traceable requirement IDs | PASS | `07_REQUIREMENTS_SPEC.md`; this Section A; `12` Section A. |
| 12 | Readiness verdict | PASS | `12` Section D: `IMPLEMENTATION-READY`, verification mode `emulated`, cap 97. |

**Overall: 12/12 PASS.** Rubric satisfied.

## B. Requirements scorecard

| Req ID | Specified? | Validated by | Status |
|---|---|---|---|
| FR-001 | yes | P1 tests | specified |
| FR-002 | yes | P2 tests + existing regression | specified |
| FR-003 | yes | extended smoke-gate | specified |
| FR-004 | yes | Playwright global-error.spec.ts | specified |
| FR-005 | yes | Playwright + manual | specified |
| FR-006 | yes | toast-apperror.test.tsx | specified |
| FR-007 | yes | existing auth-error-mapping.test.ts | specified |
| ARCH-001 | yes | directory + type-check | specified |
| ARCH-002 | yes | git diff on off-limits | specified |
| LOG-001 | yes | logger.test.ts | specified |
| LOG-002 | yes | redact.test.ts | specified |
| LOG-003 | yes | tail-dev-logs.test.ts | specified |
| LOG-004 | yes | .gitignore grep | specified |
| OBS-001 | yes | instrumentation.test.ts | specified |
| OBS-002 | yes | sentry-redact.test.ts + manual dashboard | specified |
| OBS-003 | deferred | n/a | deferred |
| SEC-001 | yes | redact.test.ts property | specified |
| SEC-002 | yes | e2e/source-map-leak.spec.ts | specified |
| SEC-003 | yes | client-error.test.ts | specified |
| SEC-004 | yes | sentry-redact.test.ts | specified |
| UX-001 | yes | toast-apperror.test.tsx | specified |
| UX-002 | preserved | existing tests | specified |
| A11Y-001 | yes | toast-a11y.test.tsx | specified |
| A11Y-002 | yes | Playwright focus assertion | specified |
| TEST-001 | yes | P1 test files | specified |
| TEST-002 | yes | P3-P5 test files | specified |
| TEST-003 | yes | adversarial matrix at P6 | specified |
| PERF-001 | yes | logger-perf.test.ts | specified |
| PERF-002 | yes | bundle-analyzer CI gate | specified |
| DOC-001 | yes | current-state.md at P6 | specified |
| DOC-002 | conditional | n/a | conditional |

**Specified: 30. Deferred: 1 (OBS-003). Conditional: 1 (DOC-002).**

## C. User's original request — verbatim compliance

> "we need to plan our ptroper error handling of the whole codebase"

✓ Plan covers client (`01` A, `03` C, `05` A.5-A.7), server (`01` B, `03` D-E, `05` B), middleware (`01` B.3, `05` D), edge (`01` B.5), auth (`01` B.7, `03` F), infra (`01` C, `04`).

> "put it here '/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-28-Sofware-Wide-Error-Handling'"

✓ All 16 plan-pack files written to this directory.

> "toast and also error logging things locall for dev mode as well and also for production"

✓ Toast (`03` Section C, `05` A.5-A.6, B.5). Dev logs (`04` C-D). Prod logs (`04` F, `02` D).

> "research this and plan this out comprehensively"

✓ `02_INDUSTRY_RESEARCH.md` with official docs citations (nextjs.org, react.dev, opentelemetry.io, docs.sentry.io) + 2026 industry reviews. Standard profile 16-file pack.

> "study and review the whole codebase"

✓ `01_SOURCE_AUDIT.md` Sections A (client), B (server, 22+22+middleware+Supabase+edge+auth callback), C (infra), D (test infra). Concrete file paths throughout.

> "against industry standard research"

✓ `02` cites: Next.js 16 docs, React 19 docs, OTel logs data model, OTel GenAI semantic conventions, Sentry docs, 2026 industry reviews.

> "in dev mode our goal is for the codebase ai to be able to look at the errors logs as well and be able to diagnose the problem too"

✓ `04_LOGGING_PIPELINE_AND_AI_LOOP.md` Section D defines:
- `./logs/dev.ndjson` path (C.1)
- `bun run logs:tail` and `logs:explain` (D.1-D.2)
- AI-readable summary output from `--explain` (D.2)
- Concrete AI agent diagnostic loop prompt (D.3)
- AI-decision tracing fields (`intent`, `why`, `context_source`, `risk`, `reversible`) per OTel GenAI conventions (B.1)

> "so we need to plan out for that since we are AI agent driven development"

✓ AI-diagnosability is a first-class requirement (`LOG-003`), with adversarial proof (`09` ADV-14) and manual QA scenario (`09` MQA-01).

> "this is not a coding task this is a planning/audit/readiness task"

✓ No code, tests, migrations, or provider state changed. Only `.ai/03_plans/2026-06-28-Sofware-Wide-Error-Handling/` and `.omx/goals/autoresearch/software-wide-error-handling/` artifacts created.

> User-pointed: `Creating-Plan-Prompt.md`

✓ Plan-pack structure follows canonical 00-19+README convention (adapted to standard profile per line 1086-1088). All 12 specialist workstreams addressed via lead-emulated lanes. Workflow contracts (Section 4A) in `00` "Workflow routing".

> User-pointed: `Multi-Agent-Execution-Directive.md`

✓ Authority model (Section 0) in `00` "Authoritative inputs". Master goal (Section 1) in `00`. Lane orchestration (Section 2) in `00`. Coordination ledger (Section 5) in `00` + `LOOP_LEDGER.md`. Traceability (Section 7) in `12`. Execution loop (Section 8) in `LOOP_LEDGER.md`. Validation rules (Section 11) in `09`. Adversarial QA (Section 12) in `09` C. Completion audit (Section 14) here in Section A-B. Final report (Section 15) below.

**All 12 user-stated intents satisfied.**

## D. Critic verdict (emulated)

Per `autoresearch-goal` skill flow: critic review required before completion. The skill's critic_command is `echo 'Critic review pending - lead agent will run reviewer gate after writing all docs'`. Since the agent runtime is unavailable, the lead performs the critic role as an emulated separated pass.

**Critic pass findings:**
- Re-read every doc in the pack fresh.
- Cross-checked each requirement against audit + research evidence.
- Confirmed every rubric item satisfied.
- Confirmed every user-stated intent satisfied.
- Confirmed no off-limits file changes planned.
- Confirmed ponytail counterweight applied.
- Confirmed stable IDs throughout.
- Confirmed all decisions have rejected alternatives.

**Verdict: PASS.**

## E. OMX autoresearch-goal ledger entry

To record this verdict in the durable OMX state:

```bash
omx autoresearch-goal verdict \
  --slug software-wide-error-handling \
  --verdict pass \
  --evidence "All 12 rubric items PASS; all 30 requirements specified; all 12 user-stated intents satisfied; verification_mode=emulated; readiness=IMPLEMENTATION-READY (cap 97)." \
  --summary "Standard-profile 16-file plan pack covers AppError hierarchy, unified Server Action shape, dev NDJSON logger with AI tail command, prod Sentry forwarder, PII redaction, all grounded in codebase audit + industry research." \
  --artifact .ai/03_plans/2026-06-28-Sofware-Wide-Error-Handling/README.md
```

**Note on `complete`:** The skill flow's final step is `omx autoresearch-goal complete --slug <slug> --codex-goal-json <get_goal-json-or-path>`. Since I am not in a Codex thread (OpenCode environment), there is no `get_goal` output to pass. Per the skill boundary: "Use `get_goal`, `create_goal`, and `update_goal` only through the active Codex thread when those tools are available." They are not available; the OMX `verdict=pass` artifact is the load-bearing durable state.

## F. Final report (per `Multi-Agent-Execution-Directive.md` Section 15)

- **Master goal:** Produce a comprehensive software-wide error-handling plan pack at the user-specified path. (Met.)
- **Final task status:** complete (planning task).
- **Planning/readiness status:** `IMPLEMENTATION-READY` (standard profile), verification mode `emulated`, readiness cap 97.
- **Workstreams/agents used:** lead only (emulated). Background `explore`, `librarian`, and `plan` agents attempted but runtime unavailable.
- **Skills, tools, repo instructions used:** `autoresearch-goal` (OMX CLI), `request-refactor-plan`, `writing-plans`, `improve-codebase-architecture`, `best-practice-research`, `verification-before-completion`, `ponytail` mode, bash/grep/find direct, websearch (Exa), Context7 (`/vercel/next.js`, `/react/react`).
- **Source documents inspected:** `AGENTS.md`, `.ai/README.md`, `.ai/10_state/current-state.md` FAST PATH, `.ai/08_prompts/000_Planning Prompts/{Creating-Plan-Prompt,Multi-Agent-Execution-Directive}.md`, `.ai/03_plans/README.md`, prior canonical pack `Library-Templates-Page` from git history (commit `4b3d4c3ac`), project README, `.cursor/rules/*`.
- **Codebase areas inspected:** `src/components/ui/toast.tsx`, `src/app/providers.tsx`, all 9× `error.tsx` files, `src/proxy.ts`, `next.config.ts`, `package.json`, `.env.example`, `vercel.json`, `supabase/config.toml`, `.github/workflows/{ci,codeql,react-doctor}.yml`, `src/lib/component-library/action-errors.ts`, `src/lib/auth/error-mapping.ts`, `src/lib/perf/server-timing.ts`, `src/app/auth/callback/route.ts`, `src/app/api/health/route.ts`, 22 server action files, 22 route handler files, existing error tests.
- **Files and systems changed (this planning task):**
  - Created: `.ai/03_plans/2026-06-28-Sofware-Wide-Error-Handling/{README,LOOP_LEDGER,00_AGENT_COORDINATION,01_SOURCE_AUDIT,02_INDUSTRY_RESEARCH,03_ERROR_TAXONOMY_AND_TOAST_PLAN,04_LOGGING_PIPELINE_AND_AI_LOOP,05_ARCHITECTURE_AND_TECH_DESIGN,06_SECURITY_PRIVACY_THREAT_MODEL,07_REQUIREMENTS_SPEC,08_IMPLEMENTATION_PLAN,09_TEST_QA_ULTRAQA_PLAN,10_ROLLOUT_ROLLBACK_OPS,11_RISKS_DECISIONS_ALTERNATIVES,12_TRACEABILITY_AND_READINESS_REVIEW,13_FINAL_AUDIT_SCORECARD}.md` (16 files)
  - Created: `.omx/goals/autoresearch/software-wide-error-handling/{mission.json, rubric.md, ledger.jsonl}` (via OMX CLI)
  - NO application source, tests, migrations, configs, or provider state changed.
- **Requirements completed:** 30 specified, 1 deferred (OBS-003 Vercel Log Drain), 1 conditional (DOC-002).
- **Requirement-to-evidence traceability summary:** see Section B + `12` Section A.
- **Tests and validation executed:** none — this is a planning task. Future implementation phase owns test execution per `09`.
- **Skipped validations and residual risks:**
  - Independent reviewer agent — skipped (runtime unavailable); residual: blind spots an independent reviewer would catch. Mitigation: lead did emulated separated-pass review.
  - Browser proof — skipped (planning only); residual: none.
  - Provider proof — skipped (planning only); residual: none.
- **Defects found and corrected:** none in the planning task itself. The audit identified 12 gaps in the current codebase; the plan addresses each.
- **Conflicts encountered and resolved:** none.
- **Major decisions and rejected alternatives:** `11` Section A (11 ADRs) + Section C (rejected alternatives summary).
- **Security/privacy/data/accessibility/performance/reliability/rollout/operations implications:** addressed in `06`, `08`, `10`, and per-requirement in `07`.
- **Adversarial-review result:** `09` Section C defines 14 adversarial scenarios; all will execute in P6. No P0/P1 findings to resolve at planning stage.
- **Final verification result and verification mode:** PASS — `emulated` mode — readiness capped at 97 per directive.
- **Generated artifacts and cleanup status:** 16 plan-pack markdown files (kept; this is the deliverable) + OMX mission/rubric/ledger artifacts (kept; durable state). No temp files left.
- **Confirmation that no known concurrent work was overwritten:** Yes — `git status --short --branch` at start showed unrelated `Library-Templates-Page` deletions (not mine); all my writes were inside the empty plan dir.
- **Remaining risks or exact unblock actions:** `RISK-ERR-013` (plan drift) and `RISK-ERR-014` (agent runtime) are accepted. No external unblock actions required for the planning task itself.

## G. Stop condition

**Planning task: COMPLETE.**

The plan pack at `/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-06-28-Sofware-Wide-Error-Handling/` is ready for a separate implementation agent to execute P1–P6 per `08_IMPLEMENTATION_PLAN.md`.
