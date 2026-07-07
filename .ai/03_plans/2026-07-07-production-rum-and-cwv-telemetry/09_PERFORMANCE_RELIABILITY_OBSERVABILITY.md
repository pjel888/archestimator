# 09 — Performance, Reliability, Observability — Production RUM And CWV Telemetry

## User-perceived latency impact

- The RUM client must **not** block first paint, hydration, or navigation.
  `web-vitals` callbacks are async and off the critical path; `sendBeacon`/`fetch
  keepalive` are fire-and-forget (the browser delivers them in the background).
- The client component is mounted in `AppProviders`; it must not run expensive
  work during render. All listener registration happens in a `useEffect`.

## Bundle / payload budgets

| Item | Budget | Rationale |
|---|---|---|
| `web-vitals` v5 client JS | ~2 KB brotli (zero deps) | Confirmed from research; negligible vs the existing `check-performance-budgets.mjs` 350KB default first-load budget. |
| New `RumReporter` + `rum-client` + `rum-route-bucket` | ≤1 KB brotli combined (target) | Small; must keep the per-route first-load JS budget unaffected. |
| Beacon body | ≤8 KB (hard client cap) | TRANSPORT-04; single metric object is ~0.2 KB. |
| AE data point | 1 per beacon (≤250 cap) | SINK-01. |

**Validation:** the existing `scripts/check-performance-budgets.mjs` gate should
still pass after adding `web-vitals`; the implementation must verify no route's
first-load JS crosses its budget. If `web-vitals` pushes a route over budget, the
fix is code-splitting the RUM component behind a dynamic import on routes where
it is not needed (landing already gets the managed beacon; the first-party
component could be route-gated). This is an implementation-time decision gated
by the budget check.

## Performance evaluator contract (PERFORMANCE-GOAL style)

This pack introduces RUM precisely to *have* a field-data evaluator. The
evaluator is the system itself. For the *implementation's* own performance
(adding the telemetry must not regress the app):

| Field | Value |
|---|---|
| Baseline metric | Current per-route first-load JS (from `.next/diagnostics/route-bundle-stats.json` via `check-performance-budgets.mjs`); current `e2e/route-transition-performance.spec.ts` navigation durations. |
| Target metric | No route's first-load JS increases by more than 3 KB gzipped after adding `web-vitals` + the RUM client; no navigation-duration regression beyond the existing budget tolerances. |
| Measurement command | `bun run perf:measure-routes` (or `check-performance-budgets.mjs`) for bundle; `bun run test:e2e:perf` for navigation. |
| Fixture/sample | Existing route-transition budgets JSON + Slow-3G profile. |
| Runs / flake | 3 runs, take median (match existing perf spec practice). |
| Regression threshold | >3 KB JS increase on any route, OR any existing perf-budget assertion turning red. |
| Related functional tests | `tests/vitest/perf/*` (unchanged), the new RUM unit/DOM/E2E tests. |
| Evidence artifact | Bundle stats diff before/after; perf spec report. |
| Rollback trigger | Budget regression → dynamic-import the RUM client or revert. |

## Reliability

- **Best-effort, non-blocking** (REL-01): sender wraps in try/catch; failures silent.
- **Endpoint failure swallowed** (REL-02): client treats any non-2xx/202/204 as
  best-effort failure, no retry, no UI.
- **bfcache preserved** (REL-03): flush on `visibilitychange`/`pagehide`, never
  `unload`. Validated by the existing perf spec's bfcache assertion (TEST-04).
- **AE over-quota** → log + 204 (no user impact).
- **Cron failure** → log + retry next day (idempotent upsert).
- **Worker isolate caveat:** in-memory rate limit + admission cap are per-isolate,
  not global. The daily budget alarm (SINK-04) is the global backstop. Document
  in runbook.

## Scalability

- **Beacon volume:** at 10% sampling and modest first-user traffic, daily writes
  are far under the 100K/day AE ceiling. At 10x growth, raise sampling downward
  (the sample rate is env-configurable; no code change). At 100x, the budget
  alarm fires before saturation.
- **D1 rollup writes:** ~200/day regardless of traffic (bounded by route × metric × window × day).
- **D1 rollup reads:** release-gate query is index-covered O(1).

## Caching

- None on the RUM path (write-only from client view). Operator queries are
  ad-hoc; the D1 rollup table *is* the cache for long-window AE queries.

## Observability for the RUM system itself

- The route handler logs a structured `rum_event` (count, rate-limit hits,
  schema-drop count) via `consoleAppLogger` — aggregate counters only, never
  per-beacon PII. (Match client-error's logging cadence.)
- The daily budget alarm query (SINK-04) reports AE write count vs ceiling.
- Cron logs rollup row count + retention delete count.

## Cold-start

- The route handler is a thin Worker function; cold-start cost is negligible and
  not user-perceived (the client is async to it).

## Hot paths

- The beacon POST is the only hot path. It does O(1) work: gate, rate-limit,
  schema check, one `writeDataPoint`. No DB query on the hot path (D1 is only
  touched by the daily cron). This is the key performance design choice: **the
  hot path is AE-only, never D1**, so per-row-scan read cost never applies to a
  user request.

## N/A dimensions (with reason)

- Server-side query count on user requests: N/A — no D1 read on the beacon path.
- Render-count/memoization: N/A — the RUM component renders nothing visible and
  does its work in `useEffect`; memoization is not load-bearing here.
- TanStack Query/Zustand cache: N/A — no server-state involved.
