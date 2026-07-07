# 16 — Requirements Traceability Matrix

Every requirement maps to source, task(s), code area, AC, test, rollout check.

| Req ID | Source | User/system outcome | Phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| FR-001 | brief + `AGENTS.md:40`/`wrangler.jsonc:59-65` | single cron SoT | 1 | T-001, T-002 | AGENTS.md, guard test | 3 crons in all surfaces; guard green | T-002 | grep check | pending |
| FR-002 | repo `upload-job-queue.ts:16-28` | taxonomy documented | 4 | T-007 | runbook | runbook §2 | doc review | n/a | pending |
| FR-003 | repo `upload-job-queue.ts:119-122,338` | idempotency explicit+tested | 2 | T-003c,d | upload-job-queue.ts | boundary tests | T-003c,d | n/a | pending |
| FR-004 | repo `wrangler.jsonc:73-81`,`upload-job-queue.ts:321` | retry/DLQ documented+both-side tested | 2,4 | T-003b, T-007 | runbook + test | `deadLetterExpected` both sides | T-003b + existing | n/a | pending |
| FR-005 | brief | DLQ drain runbook | 4 | T-007 | runbook §9 | steps present | doc review | DLQ peek dry-run | pending |
| FR-006 | brief | backlog checks | 4 | T-007 | runbook §7 | SQL+thresholds | SQL on preview D1 | n/a | pending |
| FR-007 | repo `scheduled-upload-jobs.ts:63-65` | dry-run default preserved | 2,4 | T-007 (+T-010 opt) | runbook §5 | existing tests + runbook | existing | n/a | pending |
| FR-008 | repo proof scripts | hosted proof path | 5 | T-008 | scripts | `productionJobsMessagingReady=true` | hosted (provider) | release-gates green | pending (owner-gated) |
| FR-009 | repo registry 7/14 | registry completeness decision | 0 | OPEN-DEC-007 | retention-core.ts, runbook | decision recorded | doc review | n/a | pending (owner) |
| ARCH-001 | repo `worker.ts:97-116` | cron routing documented | 4 | T-007 | runbook §1 | table present | doc review | n/a | pending |
| ARCH-002 | repo 3+ inline copies | shared helper (optional) | opt | T-011 | new helper + routes | helper + tests | unit | deploy | deferred (optional) |
| ARCH-003 | repo `worker.ts:97-115` | parallel waitUntil documented | 4 | T-007 | runbook | note + RISK-004 | doc review | n/a | pending |
| DATA-001 | repo composite indexes | retention range scan | 3 | T-006 | migrations/0039 | EXPLAIN range | EXPLAIN | PRAGMA readback | pending (D-INDEX) |
| DATA-002 | repo `retention-core.ts:231-238` | retention audit integrity | — | — (existing) | data_retention_events | audit row per delete | existing test | n/a | proven (existing) |
| API-001 | repo route handlers | route shadow paths | — | — (existing) + T-003e,f | routes | matrix complete | existing + new | n/a | pending (tests) |
| API-002 | repo `scheduled-upload-jobs.ts:67-85` | origin documented | 4 | T-007 | runbook | note | doc review | n/a | pending |
| SEC-001 | derived | secret rotation runbook | 4 | T-007 | runbook §6 | steps present | doc review | rotation drill | pending |
| SEC-002 | repo `upload-job-queue.ts:220-280` | no secret leak | — | — (existing) | proof scripts | sanitized | existing test | n/a | proven (existing) |
| REL-001 | brief | alert thresholds | 4 | T-007 | runbook §8 | table | doc review | thresholds calibrated post-obs | pending |
| REL-002 | brief | failure recovery matrix | 4 | T-007 | runbook §10 | matrix | doc review | n/a | pending |
| REL-003 | repo `current-state.md:244` | 30-day obs gate | 6 | T-009 | observation | 30 audit days | hosted | calendar | pending (time-boxed) |
| TEST-001 | `12` gaps | test gaps closed | 2 | T-003,T-005 | tests | `test:dom` green | new tests | n/a | pending |
| TEST-002 | `12` gaps | worker handler test | 2 | T-004 | tests | invocation asserts | new test | n/a | pending (DISCOVERY sub-step) |
| DOC-001 | brief | runbook created | 4 | T-007 | runbook | exists+consistent | doc review | n/a | pending |
| DOC-002 | brief + AGENTS.md:40 | AGENTS.md fixed | 1 | T-001 | AGENTS.md | diff shows fix | grep | n/a | pending |

## Performance-sensitive requirements (PERF mapping)

| Req | Baseline | Target | Measurement | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| DATA-001 | full scan retention SELECT | range scan (post-index) | `EXPLAIN` on preview D1 | rows-read doubles w/o row-count doubling | `DROP INDEX` |
| FR-008 | `productionJobsMessagingReady=false` | `=true` | `cf:jobs-proof` hosted | flag false post-deploy | re-run proof / revert deploy |
| REL-003 | no observation | 30 stable days | `data_retention_events` daily | missing day | investigate cron/D1 |

No requirement is untraced. Every task maps to ≥1 requirement.
