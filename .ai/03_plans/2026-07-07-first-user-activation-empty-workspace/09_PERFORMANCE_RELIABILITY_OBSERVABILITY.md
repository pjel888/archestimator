# 09 — Performance, Reliability, and Observability

## 9.1 Performance evaluator contract (per directive §4A performance-goal)

| Item | Value |
|---|---|
| Baseline metric | `/workshop` RSC TTFB and homebase query count today (no milestone read). Capture via `bun run` perf-trace under `NEXT_PUBLIC_PERF_TRACE=1` (`src/lib/perf/server-timing.ts`). |
| Target metric | No regression in TTFB p95 > 5%; homebase wave count unchanged (the milestone read is appended as a 7th **parallel arm** inside the existing single `Promise.all` wave at `workspace-repository.ts:2140`, not a new wave). The per-request parallel-arm count goes 6 → 7; the serialized wave count stays at 1. |
| Measurement command | `tests/vitest/workshop-dashboard-query-batching-*.test.ts` + `workshop-dashboard-query-count-script.test.ts` (the count-script test counts queries — it must be **updated** to the new post-implementation count and assert the wave structure, not asserted "unchanged"); plus a local perf-trace capture comparing before/after. |
| Dataset/fixture size | Single empty-workspace fixture + a 10-project workspace fixture. |
| Runs / flake policy | 3 local captures; ignore single-run outliers. |
| Regression threshold | Serialized wave count > 1 (i.e., the milestone read must not serialize behind the others) OR parallel-arm count > 7 OR TTFB p95 regression > 5%. A 6→7 parallel-arm bump is the expected, acceptable change (one extra parallel single-row PK read). |
| Related functional tests | `workshop-homebase-summary-rpc-contract.test.ts`, `workshop-dashboard-recent-favorites.test.tsx`. |
| Evidence artifact location | `tests/vitest/workshop-dashboard-*` + perf-trace log pasted into the implementation PR description. |

Passing ordinary tests is not enough — the evaluator is "query count unchanged + TTFB p95 within 5%."

## 9.2 Performance budgets

| Surface | Budget |
|---|---|
| `/workshop` RSC (empty workspace) | No new serialized round trip; one single-row milestone read appended as a 7th parallel arm in the existing `Promise.all` wave (6→7 parallel arms, still 1 serialized wave). |
| Client JS | `WorkspaceWelcomePanel` is tiny (a section + a few buttons reusing `Button`/`NewProjectModal`). No new dependency. Bundle delta ≈ a few hundred bytes. |
| RSC payload | Additive `activationMilestones` object (a few hundred bytes). |
| Mutations | One single-row upsert per rung mutation; negligible. |
| Render count | Panel is a singleton; no list re-render risk. |

## 9.3 Reliability and failure modes

| Failure | Detection | Mitigation |
|---|---|---|
| Milestone read fails on homebase | Caught in homebase builder | Default `firstRun=false` (panel not shown) — projects-list zero state (FR-003) still guides. Log via observability. |
| Milestone upsert fails mid-action | Caught inline | Action still succeeds; reconciliation backfills on next homebase read (§7.7). |
| Event emit fails | Caught inline | Logged; no user impact. |
| Welcome panel modal fails to open | Existing `NewProjectModal` error path | Existing dialog error handling. |
| Concurrent first-project creation | DB unique constraints + COALESCE upsert | One milestone timestamp per column; one project per submit (existing dedupe). |

## 9.4 Observability

| Signal | Source | Schema/owner |
|---|---|---|
| Activation events | `src/lib/activation/events.ts` → observability logger | Typed: `{workspace_id, user_id, event_type, milestone_first, source, ts}`. Redaction via `src/lib/observability/redact`. |
| Structured logs | Existing `src/lib/observability/logger` | Activation adds `scope: "activation"` tag. |
| Metrics/dashboards | None for closed beta (free-tier posture) | Aggregation via log queries. If OPEN-DEC-02 accepted, a consent-gated analytics SDK is added later. |
| Alerts | None for closed beta | Funnel review is manual during beta. |
| Traces | Existing `withPerfTraceRequest` covers homebase | Milestone read inherits the trace. |

## 9.5 Rollout performance gates (per directive §13)

| Metric | Baseline | Target | Source | Gate |
|---|---|---|---|---|
| `/workshop` TTFB p95 | pre-impl capture | ≤ +5% | local perf-trace | merge gate |
| Homebase query count | existing batched count | unchanged | `workshop-dashboard-query-count-script.test.ts` | merge gate |
| Activation emit error rate | n/a | 0 user-facing failures (emits are non-throwing) | log review | post-merge review |
| Closed-beta funnel completion | n/a (no prior instrumentation) | first cohort: define after 1 week | log aggregation | beta review (not merge gate) |

Known gaps: hosted/provider production RUM/CWV does not exist yet (sibling stub `2026-07-07-production-rum-and-cwv-telemetry`). Local perf-trace + query-count tests are the strongest substitute evidence for this change.

## 9.6 Operations

- Feature flag: none required for the empty-workspace panel (it self-disables once a project exists). An env-gated kill switch (`NEXT_PUBLIC_ACTIVATION_WELCOME_ENABLED`, default true) is optional for rapid disablement without redeploy — recommend include for beta safety.
- Rollback: revert the migration (`DROP TABLE`) + revert the source diff. The activation layer is additive; revert does not affect core estimating.
- Post-release verification: confirm the first invited beta user reaches `first_publication_created_at` within their session; review activation event log for funnel drop-off points.
