# 08 — Phase 0 Instrumentation & Measurement Harness

> Planning scope only. This document makes Phase 0 implementable; it does not add code or run provider actions.

## Why this document exists

The original pack said Phase 0 was "no code change" while also requiring `Server-Timing` headers and a Supabase round-trip counter. Current repo reality is narrower:

- `src/lib/perf/server-timing.ts` only logs `PERF_TRACE=1` console timings through `traced(...)`.
- `src/lib/supabase/server.ts` creates the server client but has no request counter or tagged fetch wrapper.
- A React Server Component page is not, by itself, a response-header writer. Browser-visible `Server-Timing` is useful, but it must be implemented through a response-capable surface or replaced by structured server logs for Phase 0.

Phase 0 is therefore split into two units:

1. **U1a — Build the measurement harness.** Temporary/dev-only instrumentation, no optimization.
2. **U1b/U2 — Capture baseline numbers.** Run the harness against fixtures and record evidence.

No implementation phase may treat missing Phase 0 tooling as an "executor detail"; it is a first-class deliverable.

## Harness Contract

### Timing output

Required minimum output:

- request-local id, generated per `/workshop` render;
- the 5 top-level branch durations from `src/app/workshop/page.tsx`;
- internal wave durations for `getWorkshopHomebaseData`;
- branch C timing for the new or existing library path;
- sample count, median, p95, p99.

Allowed surfaces, in order:

1. Structured `PERF_TRACE=1` server logs with safe labels.
2. A dev-only local trace collector consumed by a script.
3. Browser-visible `Server-Timing`, only if implemented through a response-capable route/middleware/test surface without corrupting the RSC response path.

`Server-Timing` is no longer a hard Phase 0 premise. The hard premise is correlated per-request timing evidence.

### Round-trip counter

The counter must count actual Supabase network requests, not static call sites only.

Required fields per counted event:

- request-local id;
- sanitized branch label, for example `homebase.H3.recent-estimates`;
- operation family: `select`, `rpc`, `insert`, `update`, `delete`;
- table/function family when safe, for example `estimates` or `workspace_homebase_summary`;
- elapsed milliseconds if available.

Forbidden fields in logs, headers, or debug output:

- workspace ids, project ids, estimate ids, email addresses, names, raw SQL, raw PostgREST URLs with tenant identifiers, service-role tokens, cookies, auth headers, or exact tenant row counts when those counts are not synthetic.

### Concurrent-request correlation

The harness must survive `Promise.all` branches and concurrent dashboard loads. A timing line without a request-local id is not admissible evidence for the concurrency gate.

If request-local propagation is infeasible in the first pass, the fallback is:

- static call-site inventory for labels;
- isolated single-render timing evidence only;
- explicit downgrade recorded in `LOOP_LEDGER.md`;
- no Phase 3 RPC work until correlated branch-DB evidence exists.

## Fixture Profiles

All profiles use synthetic or explicitly approved beta/dev data. Production data is never copied into a branch fixture.

| Profile | Projects | Estimates | Library items | Purpose |
|---|---:|---:|---:|---|
| Small | ~5 | ~10 | ~20 | Catches overhead regressions where point lookups already dominate. |
| Medium | ~25 | ~250 | ~500 | Represents the common closed-beta middle and catches slope changes. |
| Large | ~200 | ~2,000 | ~5,000 | Shows waterfall depth, payload pressure, invite/publication optional paths. |
| XLarge | optional | optional | optional | Only if Phase 0 shows nonlinear planner/payload behavior. |

Branch DB is mandatory before Phase 3. For Phase 1 and Phase 2 app-only work, a **minimum viable baseline** may start with Small + Medium using synthetic/local or safe dev data if branch provisioning is temporarily blocked. Record the downgrade and do not claim final performance proof until branch data exists.

## Harness Acceptance

Phase 0 is complete only when `LOOP_LEDGER.md` contains:

- fixture profile used and data source classification;
- N>=30 sequential samples per profile for server-fetch median/p95;
- one 20-concurrent and one 50-concurrent run for Medium or Large, if branch DB is available;
- round-trip count and latency-wave count per branch;
- payload row/byte estimates for changed queries;
- `pg_stat_statements` and `EXPLAIN (ANALYZE, BUFFERS)` for the current baseline homebase reads when branch DB is available;
- transport note: whether Supabase calls effectively multiplex or serialize under provider/runtime conditions.

## Stop Rules

- If the harness cannot correlate timings to a request under concurrency, Phase 1 may still proceed as app-only only after single-render parity tests exist; Phase 3 is blocked.
- If fixture seeding is infeasible, record the downgrade and use synthetic-only no-regression gates; do not turn synthetic-only evidence into a production latency claim.
- If instrumentation changes visible output, auth behavior, or Supabase cookie/session behavior, revert the harness and redesign before optimization.
