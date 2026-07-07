# 16 — Requirements Traceability Matrix

Required column shape (per `Improve-Plan-Prompt.md` §PHASE 3.2):
`Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`

Source-strength legend: `brief` = PROMPT.md; `repo evidence` = source file:line;
`official docs` = Cloudflare/Next docs (cited in `19`); `provider proof` =
hosted evidence; `assumption` = inferred (labeled); `derived` = synthesized;
`owner-delegated` = planning decision.

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-BRIEF | FR-001 single cron SoT | `AGENTS.md:40` (2 crons) vs `wrangler.jsonc:59-65` (3 crons); `scheduled-upload-jobs.ts:1-2` | repo evidence + brief | 04, 13 | T-001, T-002 | 3 crons in all 5 surfaces; guard test green | T-002 vitest | RISK-001 | pending | none |
| SRC-REPO | FR-002 queue taxonomy | `upload-job-queue.ts:16-28` (message v1) | repo evidence | 04 | T-007 | runbook §2 lists jobs+fields+version rule | doc review | — | pending | none |
| SRC-REPO | FR-003 idempotency contract | `upload-job-queue.ts:119-122` (key), `:338` (per-batch Set) | repo evidence | 04, 06 | T-003c,d | minute-boundary + cross-batch tests | T-003c,d | RISK-002, RISK-013 | pending | none |
| SRC-REPO+OFFICIAL | FR-004 retry/DLQ policy | `wrangler.jsonc:73-81` (max_retries 3, DLQ); `upload-job-queue.ts:321`; official DLQ/retries docs (`19`) | repo evidence + official docs | 04, 07, 18 | T-003b, T-007 | `deadLetterExpected` both sides; numbers in runbook | T-003b + existing | RISK-003 | pending | D-DLQDRAIN (drain mechanism) |
| SRC-BRIEF | FR-005 DLQ drain/replay runbook | PROMPT "failure recovery"; official DLQ/pull-consumer docs | brief + official docs | 04, 13 | T-007 | runbook §9 uses real mechanisms (consumer/pull/dashboard) | doc review + pull-consumer drill | RISK-003, RISK-013 | pending | D-DLQDRAIN recommended |
| SRC-BRIEF+REPO | FR-006 backlog checks | PROMPT "backlog checks"; route `scan_status`/`status` queries | brief + repo evidence | 04, 13 | T-007 | SQL+thresholds in runbook §7 | SQL on preview D1 (read-only) | — | pending | thresholds `assumption` |
| SRC-REPO | FR-007 dry-run default | `scheduled-upload-jobs.ts:63-65`; `retention-core.ts:212-223` | repo evidence | 04, 13 | T-007 (+T-010 opt) | existing tests + runbook §5 | existing | — | pending | D-RETDRY owner-delegated |
| SRC-REPO | FR-008 hosted proof path | `generate-cloudflare-queues-cron-proof.ts:388-407`; `verify-cloudflare-jobs-proof.ts` | repo evidence | 04, 13 | T-008 | `productionJobsMessagingReady=true` | hosted `cf:jobs-proof` (provider) | RISK-010 | pending | OPEN-DEC-008 owner-gated |
| SRC-REPO | FR-009 registry completeness | `retention-core.ts:79-143` (7/14); `retention-schedule.md` | repo evidence | 04, 15 | OPEN-DEC-007 | decision recorded per class | doc review | — | pending | OPEN-DEC-007 owner |
| SRC-REPO | ARCH-001 cron routing | `worker.ts:97-116`; `scheduled-upload-jobs.ts:100-112` | repo evidence | 06 | T-007 | runbook §1 routing table | doc review | — | pending | none |
| SRC-REPO | ARCH-002 shared auth helper | route handlers (3+ inline copies) | repo evidence | 06, 11 | T-011 (opt) | helper+tests if implemented | unit | RISK-006 | deferred | optional follow-up |
| SRC-REPO | ARCH-003 parallel waitUntil | `worker.ts:97-115` | repo evidence | 06 | T-007 | runbook note + RISK-004 | doc review | RISK-004 | pending | none |
| SRC-REPO+INFER | DATA-001 created_at indexes | migrations 0004/0007/0014/0025/0033 (composite only); inference on scan cost | repo evidence + derived | 07 (DB-INDEX) | T-006 | EXPLAIN range scan; PRAGMA readback | EXPLAIN on preview D1 | RISK-008 | pending | D-INDEX owner-approved-pending |
| SRC-REPO | DATA-002 retention audit | `retention-core.ts:231-238` | repo evidence | 07 | — (existing) | audit row per delete | existing test | — | proven (existing) | none |
| SRC-REPO | API-001 route shadow paths | route handlers; `04` shadow matrix | repo evidence | 04 | T-003e,f (+existing) | matrix cells all answered | existing + T-003e,f | — | pending | none |
| SRC-REPO | API-002 origin header | `scheduled-upload-jobs.ts:67-85` | repo evidence | 04, 13 | T-007 | runbook note | doc review | — | pending | none |
| SRC-DERIVED | SEC-001 secret rotation | secret-fallback semantics; `cf:sync-worker-secrets` | derived | 04, 13 | T-007 | runbook §6 steps; overlap procedure | doc review + rotation drill | RISK-005 | pending | none |
| SRC-REPO | SEC-002 no secret leak | `upload-job-queue.ts:220-280` | repo evidence | 08 | — (existing) | sanitized receipts | existing `markdown no secret leak` test | — | proven (existing) | none |
| SRC-BRIEF | REL-001 alert thresholds | PROMPT "alert thresholds" | brief | 04, 09, 13 | T-007 | runbook §8 table; hosted metrics flagged | doc review | RISK-007 | pending | thresholds `assumption` |
| SRC-BRIEF | REL-002 failure recovery | PROMPT "failure recovery" | brief | 04, 13 | T-007 | runbook §10 matrix | doc review | — | pending | none |
| SRC-REPO | REL-003 30-day observation | `current-state.md:244` | repo evidence | 13 | T-009 | 30 consecutive audit days | hosted observation | RISK-012 | pending | calendar-gated |
| SRC-ANALYSIS | TEST-001 test gaps | `12` gap analysis | derived | 12 | T-003, T-005 | `test:dom` green | new vitest | — | pending | none |
| SRC-ANALYSIS | TEST-002 worker handler test | `12` gap | derived | 12 | T-004 | handler invocation asserts | new vitest | RISK-011 | pending | DISCOVERY sub-step (opennext mock) |
| SRC-BRIEF | DOC-001 runbook | PROMPT | brief | 11, 13 | T-007 | doc exists+consistent | doc review | — | pending | none |
| SRC-BRIEF+REPO | DOC-002 AGENTS.md fix | PROMPT + `AGENTS.md:40` | brief + repo evidence | 11 | T-001 | diff shows fix | grep check | — | pending | none |

## Performance-sensitive requirements (PERF mapping)

| Req | Baseline | Target | Measurement source | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| DATA-001 | full-scan retention SELECT | range scan (post-index) | `EXPLAIN` on preview D1 | rows-read doubles w/o row-count doubling | `DROP INDEX` |
| FR-008 | `productionJobsMessagingReady=false` | `=true` | hosted `cf:jobs-proof` | flag false post-deploy | re-run proof / revert deploy |
| REL-003 | no observation | 30 stable days | `data_retention_events` daily | missing day | investigate cron/D1 |

## Completion-criteria check

- No requirement lacks source evidence: ✅ (every row has Source evidence + strength).
- No requirement lacks AC: ✅.
- No requirement lacks a planned proof path: ✅.
- Every work item traces back to a source requirement or recorded decision: ✅ (T-010→D-RETDRY, T-011→ARCH-002, T-012→OPEN-DEC-007 are decision-linked; T-001…T-009 are requirement-linked).
