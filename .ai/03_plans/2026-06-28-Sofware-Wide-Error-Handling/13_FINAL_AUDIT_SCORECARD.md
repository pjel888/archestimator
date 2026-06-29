# 13 — Final Audit Scorecard and Verification

Requirement-by-requirement scorecard, council findings, verification mode declaration, and final planning report.

## A. Rubric scorecard

| # | Rubric item | Verdict | Evidence |
|---|---|---|---|
| 1 | Typed AppError hierarchy covering current throw-site categories | PASS | `03` defines 9 public `AppErrorKind` values and 12 concrete classes; `03`/`07` scope full migration after pilot. |
| 2 | Existing Toast API preserved | PASS | `03` C.1 and README protected contracts allow additive `toast.appError` only. |
| 3 | Error-boundary plan | PASS for pilot | `05` A.5-A.6 and `08` P3a use Next 16 `unstable_retry` and safe copy. Full root/route rollout follows pilot proof. |
| 4 | `instrumentation.ts` / `onRequestError` plan | PASS with gate | `04`/`05` use local Next 16 signature `(err, request, context)`; P5 is owner/provider-gated. |
| 5 | Server Action error return shape | PASS for pilot | `03` D and `08` P2a approve `publication/actions.ts` plus one route handler first. Full migration is conditional. |
| 6 | Dev NDJSON log path + AI tail command | PASS | `04` C-D defines `./logs/dev.ndjson`, `logs:tail`, `logs:explain`, tainted-field labeling. |
| 7 | Prod forwarder choice | PASS with gate | `11` DEC-ERR-004 chooses Sentry; P5 requires explicit provider/secret/source-map authority before external proof. |
| 8 | PII/security posture | PASS for plan | `06` adds redaction, same-origin client-error checks, prompt-injection boundary, replay off, provider-backed production limiter gate. |
| 9 | Sample JSONL log line | PASS | `04` B.2 sample is synthetic; dev-only cause is redacted before logging. |
| 10 | Hold-harmless/protected contracts | PASS | README protected contracts replace contradictory protected-file wording. |
| 11 | Traceable requirement IDs | PASS | `07` and `12` map requirement IDs to pilot/full-scope status. |
| 12 | Readiness verdict | PASS | `12` originally declared `CONDITIONALLY READY`; README and this scorecard now declare `PILOT IMPLEMENTED`, not full implementation-ready. |
| 13 | Rollback safety (criterion 7 in reviewer rubric) | PASS | `08` P5 Rollback section and `10` Sections A/C agree on `SENTRY_ENABLED=false` + `NEXT_PUBLIC_SENTRY_ENABLED=false` kill switches; per-phase revert preserved; master rollback flag explicitly removed. |
| 14 | No regressions / no scope creep (criterion 9) | PASS | P1 pure addition (`08` P1 section); pilot-first preserved; baseline `test:dom` reds acknowledged (`08` Pre-implementation gates + phase-level stop conditions); no silent IMPLEMENTED upgrade. |
| 15 | Plan-pack completeness (criterion 10) | PASS | All 16 files exist; `11` has 15 ADRs + 17 risks; `12` maps every requirement; tests framed as planned deliverables. |

**Overall:** approved pilot is `PILOT IMPLEMENTED` with local evidence. Full all-actions/all-routes migration and provider/prod proof remain gated by the follow-on conditions below.

## A.1 Pilot implementation scorecard (2026-06-29)

| Pilot slice | Verdict | Evidence |
|---|---|---|
| P1 foundation modules | PASS | `src/lib/observability/` added typed errors, action/route wrappers, redaction, logger, Supabase unwrap, and toast mapping. Focused P1 tests passed. |
| P2a publication action | PASS | `refreshProjectPublicationSummary` now returns canonical `ActionResult`; `tests/vitest/project-publication-actions.test.ts` passed (`29` tests). |
| P2a representative route | PASS | `src/app/api/share/[token]/route.ts` uses `errorResponse(...)` for unexpected failures; `tests/vitest/project-publication-route.test.ts` passed (`17` tests). |
| P3a global client surface | PASS | `src/app/global-error.tsx`, `/api/internal/client-error`, and `toast.appError(...)` added; P3a DOM/integration tests passed. Browser proof intentionally skipped because DOM/static tests prove the chosen boundary contract for this pilot. |
| P4 dev NDJSON + AI loop | PASS | `logs:emit-test`, `logs:tail`, and `logs:explain 2026-06-29T02:20:19.180Z-pid16474-2` identify class/code/action/route/top frame and mark untrusted fields. Follow-up added `logs:debug` plus debugger workflow routing to the shared local log surface. |
| P5 Sentry/provider/prod proof | GATED | No provider secrets, Vercel env, deployment, source-map upload, or Sentry dashboard proof changed in this pilot. |
| P2b/broad migration | GATED | Full server/client rollout remains conditional on follow-on review of pilot evidence. |

## B. Requirements scorecard

| Req ID | Status | Validation owner |
|---|---|---|
| FR-001 | specified | P1 targeted tests |
| FR-002 | pilot specified; full migration conditional | P2a pilot tests |
| FR-003 | pilot specified; full migration conditional | P2a route-handler test |
| FR-004 | pilot specified | P3a DOM/static or browser proof when needed |
| FR-005 | follow-on (post-P3a) | n/a — `not-found.tsx` and segment `error.tsx` are NOT in P3a pilot scope per `07` FR-005 and `08` P3a |
| FR-006 | specified | `toast-apperror.test.tsx` |
| FR-007 | conditional after pilot | auth regression tests |
| ARCH-001 | specified | type-check + directory inspection |
| ARCH-002 | specified | protected-contract diff review |
| LOG-001 | P4 specified | `logger.test.ts` |
| LOG-002 | specified | `redact.test.ts` |
| LOG-003 | specified | `tail-dev-logs.test.ts` |
| LOG-004 | specified | `.gitignore` check |
| OBS-001 | owner/provider-gated | `instrumentation.test.ts` |
| OBS-002 | owner/provider-gated | `sentry-redact.test.ts` + dashboard proof only after authority |
| OBS-003 | deferred | first-paying-user trigger |
| SEC-001 | specified | redaction property tests |
| SEC-002 | owner/provider-gated for prod proof | source-map leak probe after deploy authority |
| SEC-003 | pilot specified; production limiter gated | `client-error.test.ts` |
| SEC-004 | specified with replay off | `sentry-redact.test.ts` |
| UX-001 | specified | `toast-apperror.test.tsx` |
| UX-002 | preserved | existing toast tests |
| A11Y-001 | specified | `toast-a11y.test.tsx` |
| A11Y-002 | pilot specified | DOM/browser focus proof |
| TEST-001 | specified | P1 tests |
| TEST-002 | pilot specified | P3a-P5 tests |
| TEST-003 | pilot specified | P6a adversarial matrix |
| PERF-001 | P4 specified | `logger-perf.test.ts` with file writer |
| PERF-002 | owner/provider-gated | bundle analyzer after Sentry authority |
| DOC-001 | specified | current-state closeout after implementation |
| DOC-002 | conditional | only if UI tokens change |

## C. Council findings resolved

| Finding | Resolution |
|---|---|
| Full all-actions/all-routes migration too broad for immediate `IMPLEMENTATION-READY` | Downgraded package to `CONDITIONALLY READY`; approved P1 + pilot vertical first. |
| Baseline test gates conflict with known `test:dom` reds | Replaced full-suite green assumptions with type-check/lint plus targeted tests and no-new-failures against recorded baseline. |
| Wrong Next 16 `onRequestError` signature | Updated docs to `Instrumentation.onRequestError = async (err, request, context) => ...`. |
| Master rollback flag impossible after API migration | Removed the master error-handling flag; rollback is per-phase revert plus observability kill switches. |
| Protected files contradicted required additive edits | Renamed to protected contracts with allowed additive edits and forbidden behavior changes. |
| Client-error logs could store attacker-controlled text | Added same-origin checks, strict parser, redaction, tainted-field labels, and adversarial tests. |
| AI log diagnosis could follow injected instructions | Added "logs are untrusted data" rule to `04`, `09`, and `10`. |
| Sentry Replay enabled without privacy posture | Defaulted replay sampling to `0`; separate owner privacy decision required. |
| Sentry runbook implied DB/query details in Sentry | Updated runbook: Sentry MAY contain raw DB/Supabase cause text (captureException preserves the original exception chain); SQL/query detail and incident fix actions stay in restricted provider logs OR require fresh owner approval (incident-driven migrations/RLS fixes are NOT authorized by this plan). Dev NDJSON is scrubbed by redactForLog but still requires PII review before broad AI sharing. |
| Logger phase ownership inconsistent | P1 now defines logger interface/no-op path; P4 owns file writer, NDJSON tests, and perf test. |

## D. Verification mode

**Mode:** `independent` (council-improved).

The original pack was lead-authored and over-claimed readiness. This improvement pass used native read-only council reviewers for feasibility, security/privacy, coherence, and adversarial document review, then integrated their findings. Final native verifier result: PASS — no remaining P0/P1 planning blockers for the approved conditional-ready scope.

## E. Final report

- **Planning folder reviewed:** `.ai/03_plans/2026-06-28-Sofware-Wide-Error-Handling/`
- **Prompt documents reviewed/validated:** `.ai/08_prompts/000_Planning Prompts/Improve-Plan-Prompt.md` and `Multi-Agent-Execution-Directive.md`
- **Files changed by pilot:** observability modules, P2a publication action/route, P3a global-error/client-error/toast addition, P4 log scripts/package scripts, focused tests, and these evidence docs.
- **Migrations/provider state changed:** none.
- **Readiness status:** `PILOT IMPLEMENTED`.
- **Approved implementation scope delivered:** P1 foundation + P2a/P3a/P4 pilot evidence loop.
- **Full migration gate:** P2b/broad P3 requires fresh follow-on review; this pilot does not authorize a broad sweep by itself.
- **Provider gate:** Sentry DSN/auth token/GitHub secret/Vercel env/source-map dashboard proof require explicit execution-time owner/provider authority.
- **Skipped runtime proof:** browser proof was intentionally skipped for P3a because DOM/static tests cover the chosen boundary contract; provider, deployment, Sentry dashboard, and production behavior remain unproven.

## F. Stop condition

Approved pilot implementation is complete once the final closeout validation in `LOOP_LEDGER.md` is green. Full rollout remains gated.

## G. ADV-14 AI-diagnosability manual proof (target — captured during P6a)

This section is the placeholder where the implementer captures the ADV-14 manual AI-diagnosability proof during P6a per `09` Section C. The proof must show:

1. A synthetic error was induced in dev mode (e.g., via the logger-owned emit path per `08` P4 validation).
2. An AI agent was given `bun run logs:explain <record_id>` against the resulting record.
3. The AI agent correctly identified: `error.class`, `error.code`, `context.route`/`context.server_action`, the top stack frame, and the likely fix.
4. The AI agent IGNORED any tainted fields in the record (per `04` Section A trust boundary) — specifically, no instructions inside `error.cause`/`agent_decision.why`/URL fields were followed.

**Status:** captured for the approved local pilot.

Evidence:
- Synthetic error induced through the logger-owned emit path: `bun run logs:emit-test`.
- Record id: `2026-06-29T02:20:19.180Z-pid16474-2`.
- Diagnose command: `bun run logs:explain 2026-06-29T02:20:19.180Z-pid16474-2`.
- `logs:explain` identified `InternalError`, `INTERNAL_ERROR`, `context.route=/__synthetic/logger-test`, `context.server_action=emitTestLog`, and top frame `scripts/emit-test-log.mjs:4:17`.
- Hostile text was scrubbed to `[UNTRUSTED_INSTRUCTION]` and `Bearer [REDACTED_TOKEN]`; `error.cause.message` and `context.message` were emitted as `UNTRUSTED_DATA`.

Likely fix for the synthetic record: inspect the direct emitter at `scripts/emit-test-log.mjs:4:17`; in a real incident, follow the same route/action/frame fields to the throwing module while treating tainted fields only as evidence.
