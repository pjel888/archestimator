# 19 — Research, Review, and QA Evidence

## Research questions & sources

| # | Question | Source consulted | Outcome | Changed a decision? |
|---|---|---|---|---|
| RQ-1 | Does `wrangler queues` CLI support read-only DLQ peek/replay? | repo `package.json` (no `cf:dlq*` script), `scripts/` inventory | **Not found in repo.** ASSUMP-002 — needs official Cloudflare docs confirmation at implementation time. Runbook FR-005 hedges ("dashboard or CLI"). | No (hedged) |
| RQ-2 | Are Cloudflare Cron Triggers reliable enough for daily audit-row-absence detection? | `current-state.md` L244 ("30-day hosted cron/D1 observation" gate) | Yes-but-best-effort; the 30-day gate exists precisely to characterize this. | Confirmed REL-003 |
| RQ-3 | Do retention-target composite indexes cover `WHERE created_at < ?`? | migrations 0004/0007/0014/0025/0033 (index defs) | No — all are composite with `created_at` trailing. Confirmed DATA-001. | Yes → D-INDEX |
| RQ-4 | Is `productionJobsMessagingReady` currently true or false? | `current-state.md` L3466 + proof JSON existence | False locally; hosted provider-readiness broader gate green (L2912). Reconciliation → FR-008. | Yes → FR-008 path |
| RQ-5 | Does the queue consumer dedupe across batches? | `upload-job-queue.ts:338` (per-batch Set) | No. Confirmed D-IDEMP. | Yes → FR-003 tests |

**Searched for but not found:** an official Cloudflare docs page confirming
exact `wrangler queues` DLQ subcommands (offline repo audit; no web fetch
performed). Recorded as ASSUMP-002; executor must confirm at implementation
time. This is a bounded gap, not a blocker — the dashboard is a fallback.

**Rubric:** research was sufficient when it (a) confirmed each decision against
repo evidence, (b) labeled the one external-doc gap (RQ-1), and (c) did not
invent provider facts. Research is not included as a detached appendix; each
finding shaped a requirement/decision/risk.

## Skills / workflows used or unavailable

- **Used:** `archestimator-plan-pack` (binds generic planning to `.ai/03_plans/`
  convention), `Explore` subagent lanes (read-only evidence discovery).
- **Named but NOT invoked (correctly):** `ultrawork`, `ultragoal`, `ultraqa`,
  `autopilot`, `gitnexus`, `performance-goal`, `autoresearch`. Per the directive,
  skills whose current instructions do not materially apply to a planning-only
  deliverable were not invoked. GitNexus impact analysis was not needed (no
  symbol refactor; narrow, well-understood blast radius from the audit).
- **Unavailable:** a native independent verifier lane was not dispatched.

## Specialist workstream outputs (summary; detail in numbered docs)

- Source/routes → `03` §E, `06`, `07`.
- Tests → `12` (10 gaps).
- Migrations/scripts/runbooks → `03` §G–I, `07`, `13`.
- Architecture/data/api → `06`, `07`.
- Security → `08`.
- Performance/reliability → `09`.
- Blast radius → `10`.

## Critique-and-revision cycles (emulated)

This is an `exhaustive`-profile pack. Per the directive, ≥2 critique cycles run.

**Cycle 1 (after first-draft of 03–13):** Found (a) `07` DB-INDEX initially
proposed a `privacy_requests` index that the existing `(status,created_at)`
index already covers → removed it; (b) `11` T-004 worker test lacked the
`.open-next/worker.js` import-resolution note → added DISCOVERY-REQUIRED
sub-step; (c) `04` FR-009 under-specified the per-class options → expanded.

**Cycle 2 (cross-document consistency, after 14–18):** Found (a) `13` referenced
DLQ drain without flagging the read-only-peek assumption → added ASSUMP-002
reference; (b) `09` alert thresholds needed to mark Cloudflare Analytics metrics
as hosted-evidence-dependent → added; (c) `18` needed to state the production-
readiness cap explicitly → added final section; (d) README must list the
hosted-proof + 30-day-observation as *remaining required* → added.

No further cycle would resolve the external blockers (OPEN-DEC-004/007/008);
further iteration would be ceremony.

## UltraQA-style adversarial scenario matrix (for future implementation)

For the planning task itself, dynamic adversarial QA is N/A (docs-only; see
`05`). This matrix specifies the adversarial QA the **future implementation**
must pass.

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|
| UQ-1 | operator mistake | enqueue same-minute dup across batches | two batch calls | `runCloudflareUploadJobQueueBatch` x2 | both execute (no cross-batch dedup) | pending impl | T-003d | in-memory |
| UQ-2 | infra redelivery | poison message re-delivered | invalid body | consumer | ack invalid-message, never executes | pending impl | T-003a + existing | in-memory |
| UQ-3 | route outage | scanner down, scan job 503s | mock scanner fail | consumer + scan route | retry → DLQ after 3; rows stay failed_transient | existing + T-003b | test | none |
| UQ-4 | secret misconfig | `CRON_SECRET` unset at deploy | env without secret | cron dispatch | skipped missing-secret; route 503 | existing + T-003e | test | none |
| UQ-5 | attacker direct POST | `/api/internal/upload-cleanup` w/o/ wrong Bearer | curl | route | 401/503 | existing | upload-cleanup-route.test | none |
| UQ-6 | oversized batch | `?limit=99999` | route call | route | clamped to MAX_ROUTE_LIMIT | existing | route test | none |
| UQ-7 | retention rule bug | rule selectSql throws | FakeD1 throws | retention pass | that rule skipped error, others proceed | pending impl | T-005b | none |
| UQ-8 | DLQ saturation | DLQ grows sustained | mock persistent fail | dashboard/alert | alert fires >0 sustained | pending ops | REL-001 | drain |
| UQ-9 | partial R2 delete | R2 removeObjects partial fail | mock R2 | cleanup job | cleanup_failed recorded, re-run next day | existing | cleanup-job.test | none |
| UQ-10 | retention over-delete | bad TTL applied | dry-run first | retention dryRun | dry-run report shows selected ids | existing + D-RETDRY | retention test | none |
| UQ-11 | malformed proof id | `providerProof.id` = "x" | consumer | consumer | safeProviderProofId rejects, no receipt | pending impl | new test | none |
| UQ-12 | worker refactor breaks scheduled() | someone edits worker.ts | handler test | T-004 | test fails on broken dispatch | pending impl | T-004 | none |

## Performance evaluator contract

See `09` PERF section (retention SELECT rows-read baseline→range-scan target,
EXPLAIN measurement, 3 runs, regression threshold, rollback = DROP INDEX). This
is the single performance-sensitive claim in the pack; passing ordinary tests
is not enough — the EXPLAIN proof is the declared evaluator.

## Independent final verifier evidence

**verification_mode: emulated.** The final verification pass (in `17`) was
performed by the lead as a separated pass, not a separate agent. This caps
overall readiness at 97 and caps the high-blast-radius package at
`CONDITIONALLY READY` unless an independent reviewer or the owner later
approves. The pass checked: every requirement traced, every shadow-path cell
answered/N/A-with-reason, DB blueprint has rollback, no `TODO`/`TBD` without
owner+options+recommendation, scores non-inflated, hosted/provider proof not
claimed from local checks.

## Explicit validation gaps

| Gap | Why | Risk | Substitute | Unblock action |
|---|---|---|---|---|
| Hosted `cf:jobs-proof` not run | owner-gated (OPEN-DEC-008) | `productionJobsMessagingReady` stays false (RISK-010) | local proof green | owner authorizes run |
| 30-day observation not elapsed | calendar (REL-003) | retention not "production-proven" | local retention tests + dryRun | wait + monitor |
| `wrangler queues` DLQ CLI exact surface unconfirmed | no web fetch / offline audit | runbook §9 uses hedged wording | dashboard fallback | confirm at impl time |
| OPEN-DEC-004 TTL sign-off pending | counsel (external) | retention live-run risk (RISK-009) | ship dry-run-only / RETENTION_DRY_RUN=1 | counsel sign-off |
| Worker handler test DISCOVERY sub-step | `.open-next/worker.js` mock resolution | T-004 implementation detail | source-grep test (current) | resolve mock at impl |
