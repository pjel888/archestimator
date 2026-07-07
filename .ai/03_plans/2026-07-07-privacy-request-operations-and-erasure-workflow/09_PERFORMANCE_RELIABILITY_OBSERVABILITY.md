# 09 — Performance, Reliability, And Observability

## Performance evaluator contracts

| ID | Surface | Baseline (to capture) | Target | Measurement command | Fixture | Runs/flake | Regression threshold | Rollback trigger | Evidence location |
|---|---|---|---|---|---|---|---|---|---|
| EV-01 | Intake POST p95 | capture at execution | < 300ms p95 (D1 INSERT + rate-limit check) | focused route test + local timing | 1 row | 20 runs | >2x baseline | p95 > 600ms | execution evidence ledger |
| EV-02 | Queue GET p95 | capture | < 250ms p95 (indexed SELECT) | focused test | 100 rows | 20 runs | >2x | > 500ms | ledger |
| EV-03 | Detail GET p95 | capture | < 250ms p95 | focused test | 1 req + 20 events | 20 runs | >2x | > 500ms | ledger |
| EV-04 | Transition action p95 | capture | < 300ms p95 (3 D1 stmts) | focused test | 1 req | 20 runs | >2x | > 600ms | ledger |
| EV-05 | Verify action p95 | capture | < 300ms p95 | focused test | 1 token | 20 runs | >2x | > 600ms | ledger |
| EV-06 | Export action | capture | < 2s p95 (data-dependent) | focused test | small user dataset | 5 runs | >3x | failure or >6s | ledger |
| EV-07 | Erasure dry-run | capture | < 1s p95 (read-only) | focused test | seeded rows | 5 runs | >3x | > 3s | ledger |
| EV-08 | Bundle impact (queue page) | capture | < +5 KB JS | `bun run build` + bundle analysis | n/a | 1 | > +10 KB | > +20 KB | ledger |
| EV-09 | RSC payload (detail) | capture | < +2 KB | build + payload inspection | n/a | 1 | > +5 KB | > +10 KB | ledger |
| EV-10 | Rate-limit counter | capture | < 100ms p95 (indexed) | focused test | 100 events | 20 runs | >2x | > 300ms | ledger |

- Passing ordinary unit tests is not enough for performance claims; the evaluator above is the declared proof for each.
- Flake policy: drop the min/max, take median of the remaining; a >2x regression that persists on rerun is real.

## Measurement architecture

- Closed-beta volume is low (tens–hundreds of requests); performance risk is minimal. The evaluators exist to catch gross regressions (e.g. an accidental table scan) and bundle bloat.
- For browser-only claims (queue responsive collapse, dialog focus) see `05` §11 — those are not performance evaluators.

## Reliability

| Failure mode | Behavior | Recovery |
|---|---|---|
| D1 unavailable at intake | 500 opaque; request lost (no queue) | user retries; logged |
| D1 unavailable at transition | 500 opaque; no state change | operator retries |
| R2 write fail at export | 500; no evidence pointer written; request stays `in_progress` | operator retries; no partial state |
| Email send fail (circuit open) | intake still returns 201; confirmation best-effort; logged | circuit auto-closes after cooldown |
| Erasure partial delete | `data_retention_events` records what ran; retention cron reconciles remaining rows | fix-forward via cron |
| Rate-limit D1 fail | fail-open (logged) in closed-beta; intake still accepts | monitor; switch to fail-closed post-beta |

- Timeouts: all D1/R2 calls via existing helpers (no explicit timeout added; Cloudflare Workers CPU/wall limits apply).
- Retries: intake is not auto-retried (idempotent-by-new-id); operator actions are user-retried.
- Cancellation: not applicable (short actions).

## Observability

| Signal | Today | Planned |
|---|---|---|
| Structured log on intake failure | yes (`privacy_request_intake_failed`) | extend to transitions/fulfillment |
| `privacy_request_events` audit row | none | every transition + fulfillment |
| `data_retention_events` for erasure | existing (cron) | reused by erasure action |
| Error → `AppError` mapping | existing | transition/action errors mapped (404/403/409/500) |
| Metrics/alerts | none | closed-beta: no new alert; SLA breach (`P4`) would add one |

- No new external metrics sink in closed-beta (free-tier posture). `console.error` structured logs + D1 audit rows are the evidence surface.
- Alert threshold: none until `P4` (SLA breach). If added, owner + runbook must be named (per directive §10).

## Rollout performance gates

- Gate to merge: focused tests green; no >2x evaluator regression.
- Gate to closed-beta: operator surfaces exercised on local D1 + R2 mock.
- Gate to production: D1/R2/Email provider proof recorded.
- Rollback trigger: any evaluator >2x regression, or a data-integrity finding on erasure.
