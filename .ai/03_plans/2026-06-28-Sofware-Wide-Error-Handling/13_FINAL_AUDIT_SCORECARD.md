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
| 12 | Readiness verdict | PASS | `12` and README now declare `CONDITIONALLY READY`, not full implementation-ready. |
| 13 | Rollback safety (criterion 7 in reviewer rubric) | PASS | `08` P5 Rollback section and `10` Sections A/C agree on `SENTRY_ENABLED=false` + `NEXT_PUBLIC_SENTRY_ENABLED=false` kill switches; per-phase revert preserved; master rollback flag explicitly removed. |
| 14 | No regressions / no scope creep (criterion 9) | PASS | P1 pure addition (`08` P1 section); pilot-first preserved; baseline `test:dom` reds acknowledged (`08` Pre-implementation gates + phase-level stop conditions); no silent IMPLEMENTED upgrade. |
| 15 | Plan-pack completeness (criterion 10) | PASS | All 16 files exist; `11` has 15 ADRs + 17 risks; `12` maps every requirement; tests framed as planned deliverables. |

**Overall:** planning package is `CONDITIONALLY READY`. P1 plus the pilot vertical and P4 dev logging pilot are approved; broad migration and provider proof require the gates listed below.

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
- **Files changed:** plan-pack markdown only.
- **Application code/tests/migrations/provider state changed:** none.
- **Readiness status:** `CONDITIONALLY READY`.
- **Approved implementation scope:** P1 foundation + P2a/P3a/P4 pilot evidence loop.
- **Full migration gate:** pilot evidence + plan update + fresh independent review.
- **Provider gate:** Sentry DSN/auth token/GitHub secret/Vercel env/source-map dashboard proof require explicit execution-time owner/provider authority.
- **Skipped runtime proof:** browser, provider, deployment, and production behavior remain unproven until implementation phases capture that evidence.

## F. Stop condition

Planning improvement is complete: docs-only verification passed and the final verifier confirmed no unresolved P0/P1 planning gap remains in the approved P1+pilot scope.
