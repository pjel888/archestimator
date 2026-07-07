# 09 — Performance, Reliability, and Observability

## Performance posture (proportional)

The start-path changes are presentational empty-state layers over already-fetched data. Performance risk is low but real (client bundle + render count). The plan reuses existing performance evaluators rather than inventing new ones.

## Performance evaluator contract (PERF)

| Evaluator | Baseline | Target | Measurement | Fixture | Runs | Regression threshold | Related tests | Evidence artifact |
|---|---|---|---|---|---|---|---|---|
| Projects-page render | current rendered-row budget in `projects-page-render-baseline.test.tsx` | no increase in cold render count; zero-workspace state renders ≤1 extra node | `bun run test:dom -- projects-page-render-baseline` | existing harness | per-run | any increase in asserted render count = fail | `perf/projects-page-render-baseline.test.tsx` | vitest output |
| Projects-page RPC contract | current RPC shape | no new server round-trip for empty state | `bun run test:dom -- projects-page-rpc-contract` | existing harness | per-run | new round-trip asserted = fail | `perf/projects-page-rpc-contract.test.ts` | vitest output |
| Client bundle | current projects-page bundle | no measurable growth from a trivial empty-state component; lazy-load if non-trivial | `bun run build` + bundle inspection (implementation) | n/a | 1 | >2KB gzip growth on projects entry → justify or lazy-load | build artifact | build output |

Passing ordinary tests is the declared evaluator for render/RPC; bundle is a manual implementation check.

## Reliability & failure modes

| Failure | Detection | User-visible | Recovery |
|---|---|---|---|
| Optimistic create rollback (project) | effect reconciliation | empty state reappears | user can retry via CTA |
| Optimistic create rollback (estimate) | store rollback | empty state reappears | user can retry |
| Partial dashboard data (`estimateCount` present, `recentEstimateSheets` empty) | derived-state render | nudge renders correctly | n/a (graceful) |
| Empty-state component throws | nearest error boundary (`estimates/error.tsx` exists; projects relies on root) | error fallback | user retries |

## Observability

- **Metrics/events:** FR-06 activation events (`project_created`, `estimate_started`, `estimate_first_area_added`, `estimate_first_row_added`) — minimal, redacted. SDK choice deferred to sibling plan; this plan names the events + redaction.
- **Logs:** no new logging. Existing Server Action error paths unchanged.
- **Dashboards/alerts:** none added (closed-beta, free-tier posture). Activation funnel can be derived from the events once an SDK is chosen (sibling plan).

## Rollout / rollback (performance gates)

- Rollout = direct merge to `main` (no staged rings; closed beta, single branch per repo convention).
- **Rollback trigger:** projects-page render baseline OR RPC contract test goes red; OR a visible regression in empty-state rendering.
- **Rollback steps:** revert the empty-state component/href change commit(s). No data migration → no data rollback.
- **Post-release verification:** confirm activation events fire (FR-06) and empty states render for the three start states (J1/J2/J4).

## Performance budgets (justified where relevant)

- TTFB/LCP on `/workshop/projects`: unchanged (no new server work).
- Client JS: empty-state components trivial; lazy-load only if measured growth justifies it.
- Render count: zero-workspace state adds ≤1 node — within baseline tolerance (verified by test).

## Browser-proof posture

Browser/Playwright proof is **deferred to implementation** for: focus order across new empty states, responsive narrow-screen layout, and the empty-state→modal→optimistic-card transition. These are browser-only claims. Static review + DOM tests are the planning-stage evidence (per AGENTS.md Codex speed guardrail).
