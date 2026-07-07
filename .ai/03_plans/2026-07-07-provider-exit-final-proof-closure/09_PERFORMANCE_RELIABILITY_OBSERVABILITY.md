# 09 — Performance, Reliability, and Observability

## 9.1 Applicability

This plan produces no runtime code, no route, no query, no bundle change, and
no client behavior change. Therefore **no performance budget, evaluator, or
regression threshold is required** for the *planning task*. Performance
readiness scores `100 (n/a)` in `17_…`.

This document defines the **observability and reliability posture of the
closure procedure itself** and confirms the Cloudflare runtime's existing
observability covers post-exit smoke needs.

## 9.2 Existing runtime observability (unchanged, evidence)

From `wrangler.jsonc` lines 83-97:
- `observability.enabled: true`, `head_sampling_rate: 0.1`.
- `logs`: enabled, sampling 0.1, `invocation_logs: true`, `persist: true`.
- `traces`: enabled, sampling 0.05, `persist: true`.

This existing observability is sufficient for post-exit smoke correlation
(request IDs, invocation logs, trace persistence). No observability change is
proposed.

## 9.3 Closure-procedure reliability

| Property | Posture |
|---|---|
| Idempotency | `cf:provider-exit-pack` is idempotent — re-running produces a fresh derived pack from the same inputs. Smoke commands are read-only and re-runnable. |
| Partial-failure | If smoke partially fails, `cloudflareSmokePassed=false`; closure is not claimed. Operator diagnoses via `cf:check-readiness`. |
| Concurrency | Operator-record JSON is the single mutable artifact; LOOP_LEDGER file-ownership lease prevents lost updates. |
| Staleness | Upstream artifacts may go stale; re-run their generator scripts before trusting the pack. (RISK-PE-04) |
| Rollback of the procedure itself | The procedure mutates only the operator record (sanitized). Revert by restoring the prior JSON; the pack is derived. |

## 9.4 Post-exit smoke signals (what "healthy" means)

The smoke (§13.3) checks, at minimum:
- Hosted route reachability on `archestimator.com` (read-only probe).
- Worker version freshness / deploy-source-smoke consistency.
- D1/R2/Queue/DO/Email binding readability (provider-resource readback).
- Release-gates green (production cutover readiness).

A smoke "pass" = all read-only commands exit 0 and report ready=true. This is
recorded as `postExitSmoke.cloudflareSmokePassed=true` with the exact
`commands[]` and `runAt`.

## 9.5 No performance evaluator (justified)

Per directive §4A (performance-goal contract), an evaluator is required when
performance is in scope. Here, closure is a one-time CLI procedure with no
throughput, latency, or bundle implications. The strongest relevant
"performance" signal is *pack generation time* (a few seconds, local) and
*smoke command latency* (bounded by wrangler/HTTP). Neither is a product
performance claim, so no evaluator harness is defined. If a future task adds
runtime behavior, it must define its own evaluator.

## 9.6 Operations handoff

Closure does not change operations. Existing ops posture (daily D1 backups,
`cf:d1-restore-rehearsal`, Workers Observability, the 3 crons, Queue DLQ)
remains the operational baseline. The only ops-adjacent output of closure is
the recommendation to update `current-state.md` after closure lands (DOC-PE-02).
