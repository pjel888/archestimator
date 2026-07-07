# 09 — Performance, Reliability, and Observability

## Performance evaluator contract (PERF-01)

| Aspect | Detail |
|---|---|
| Baseline metric | Drawer Time-to-Interactive (drawer open → readiness visible) today, measured locally |
| Target metric | Readiness adds **≤ 30 ms p95** over the existing drawer load (parallel prefetch, PERF-02); drawer TTI unchanged within noise |
| Measurement command | Focused Vitest bench on `computeProposalReadiness` over a maximal fixture (1200 nodes / 3000 rows, the export caps), 50 runs, report p50/p95 |
| Fixture size | Reuse the existing export-cap fixture shape (`PROPOSAL_EXPORT_NODE_LIMIT=1200`, `ROW_ITEM_LIMIT=3000`); plus a small fixture (50 nodes / 100 rows) for the common case |
| Runs / flake policy | 50 runs; report median + p95; ignore first 5 (warmup); flag if p95 variance > 20% |
| Regression threshold | p95 of `computeProposalReadiness` ≤ 50 ms; if exceeded, the readiness prefetch must be moved off the drawer's critical path (show skeleton, compute in background) |
| Related functional tests | TEST-01/02/03 (readiness correctness) |
| Evidence artifact | `tests/vitest/perf/proposal-readiness.bench.test.ts` (new); CI/local run output committed to run log |

Passing ordinary unit tests is **not** sufficient to claim performance readiness; the bench above is the declared evaluator.

## Performance budgets / expectations

| Surface | Budget | Justification |
|---|---|---|
| Drawer open → readiness visible | ≤ existing drawer TTI + 30 ms p95 | Parallel prefetch (PERF-02) |
| `computeProposalReadiness` standalone | ≤ 50 ms p95 at export-cap fixture | Bounded by export caps; reuses existing helpers |
| `responded` flip (decision submit) | ≤ existing decision submit + one indexed UPDATE | O(1) indexed update |
| Notification dispatch | ≤ 5 ms added to action (best-effort, non-blocking) | Single insert; fire-and-forget with `after()` or try/catch |
| Owner message send | ≤ existing invite send + negligible (string concat) | No extra round-trip |
| Client bundle | no increase (readiness DTO only; no new client lib) | Server-only module |
| RSC payload | readiness DTO added to drawer data (a few hundred bytes) | Negligible |
| D1 query count | 0 new queries on the critical path | Reuses existing drawer load; `responded` flip is on decision path (already a write) |

## Hot paths / bottlenecks

- The readiness model calls `buildProposalExportModel` (the heaviest existing helper). On the **server** this is already used by the export route and is bounded by the export caps. On the **client** it is already used by the preview hook. Reusing it server-side for the drawer adds no client cost.
- **Avoid** recomputing readiness on every drawer tab switch — compute once per drawer open (via the drawer React Query, 10s staleTime) and pass the DTO down.

## Reliability / failure modes

| Failure | Behavior | Detection |
|---|---|---|
| Readiness computation throws | REL-02: catch → log structured `readiness_unavailable` → return a single non-blocking warning; hard blockers (cheap counts/config) still computed separately so the gate still works for the enumerated cases | log + test |
| Email send fails (circuit open) | existing: recipient stays `pending`; composer shows retry + honest "Sent requires email configured" | existing circuit breaker |
| `responded` flip fails (D1 error) | whole decision txn rolls back (same batch) → user sees decision error; no `responded` without a decision | txn atomicity |
| Notification dispatch fails | REL-03: swallow + log; parent action unaffected | log |
| Migration `0037` apply fails | additive nullable columns; safe retry; no data loss | `wrangler` exit code |
| Stale readiness (revoke during compose) | FR-04 re-checks at action time; revoke flips status; action rejects | existing optimistic lock |
| Provider webhook absent (bounce) | REL-01: `bounced` never set; UI honestly states unavailable | documented gap |

## Observability

| Signal | Sink | Schema | Redaction | Owner | Threshold |
|---|---|---|---|---|---|
| `readiness_blocked` publish attempt | structured log (existing logger) | `{projectId, blockerIds[]}` | no message content | frontend/backend | alert if spike |
| `readiness_unavailable` | structured log | `{projectId, error}` | none | backend | alert on any (bug indicator) |
| `responded` flip count | existing activity feed (decision events already logged) | n/a | n/a | n/a | n/a |
| notification dispatch failure | structured log | `{projectId, eventKind, error}` | none | backend | alert if spike |
| email send (existing) | existing `recordEmailFail` + circuit breaker | unchanged | unchanged | existing | existing thresholds |
| owner message over-limit reject | structured log (debug) | `{projectId}` | **no message content** | backend | n/a |

No new dashboards required for v1 (closed-beta, no external users). Implementation should add a manual-query runbook entry for "how many publishes were readiness-blocked in the last N days" once metrics exist; today this is a structured-log grep.

## Rollout / rollback gates

- OPS-01: feature flag (existing rollout mechanism) gates: readiness gate, owner message UI, notification dispatch, `responded` flip — each independently toggleable.
- OPS-02: rollback = disable flag → readiness gate becomes pass-through (today's behavior); message fields ignored (default copy); notifications off; `responded` flip off (status stays `opened` — harmless).
- Rollout rings: (1) local dev → (2) Philip's workspace (closed beta) → (3) all workspaces. No external users yet, so no staged external rollout needed.
- Rollback trigger: any P0 defect (readiness leak, broken publish, email regression). Rollback via flag; no migration revert needed (nullable columns).

## Known gaps

- No production/hosted performance proof (closed-beta, local-only evidence is proportional and sufficient per AGENTS.md).
- No Cloudflare Analytics dashboard wiring (out of scope; structured logs are the evidence surface for now).
- Bounce/complaint signal gap (REL-01) — operational gap recorded.
