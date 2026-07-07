# 09 — Performance, Reliability, Observability

## Canonical D1 hot-path budget table (PERF-002, PERF-003)

This is the single source of truth referenced by the proof scripts (P3/P4) and the CI/release gates (P5). Numbers are sized for **free-tier/bundled Cloudflare limits** with 10× headroom over the closed-beta first-user volume assumption (A1: tens of workspaces, hundreds of projects, low-thousands of estimate rows).

`p95`/`p99` are **D1 round-trip wall-clock** for the route's total D1 work (sum of statement latencies, not including network to client). `queries` is the D1 statement count. `subreq` is the Worker subrequest count (D1 statements + any other subrequests; D1 binds count 1:1 toward the Worker subrequest ceiling).

| HP | Route | p95 ms (1×) | p95 ms (10×) | p99 ms (10×) | queries | subreq | Evidence source | Notes |
|---|---|---|---|---|---|---|---|---|
| Auth floor | every `/workshop/*` | 60 | 90 | 120 | 3 | 3 | A1+A2+A3 in `03` §2 | non-negotiable floor; `DEC-AUTH-01` may reduce |
| HP-1 | `/workshop` homebase | 250 | 400 | 550 | ≤16 | ≤18 | `workspace-repository.ts:2044` + libs | heaviest; 4 waves |
| HP-2 | `/workshop/projects` | 200 | 350 | 480 | ≤12 | ≤14 | `workspace-repository.ts:1394` | unbounded reads get LIMIT in P2 |
| HP-3 | `/workshop/projects/[id]` | 180 | 300 | 420 | ≤9 | ≤11 | multi-repo | `canAccessProjectInD1` 3-EXISTS |
| HP-4 | `/workshop/.../estimates/[nodeId]` | 220 | 360 | 500 | ≤8 | ≤10 | `workspace-repository.ts:3973` | sheet editor |
| HP-5 | `/workshop/.../estimates` | 150 | 250 | 350 | ≤6 | ≤8 | `workspace-repository.ts:2867` | **post-P2 N+1 fix**; was `4 + N` |
| HP-6 | `/workshop/library/components` | 180 | 300 | 420 | ≤8 | ≤10 | `component-library-repository.ts:1098` | global cat scan cached in P2 |
| HP-7 | `/workshop/proposals` | 120 | 200 | 280 | 1 | 1 | `recipient-proposals-repository.ts:86` | wide join; G3 index win |
| HP-8 | `/share/[token]` | 150 | 240 | 330 | ≤5 | ≤7 | `public-repository.ts` | unauthenticated; 2 deferred writes |
| HP-9 | `/invite/[token]` | 80 | 120 | 160 | ≤2 | ≤3 | `invitation-d1-store.ts` | |
| HP-10 | `/invite/[token]/accept` | 200 | 320 | 440 | ≤6 | ≤8 | `invitation-acceptance.ts:41` | write path |
| HP-11 | `/invite/[token]/continue` | 60 | 90 | 120 | 1 | 1 | rate-limit read | |

**Budget sizing rationale:**
- 1× p95 derived from existing `hostedBudgetMs` precedent (500–600ms for the 5 generic surfaces) scaled down because these are D1-only round-trips, not full route TTFB. The existing 500–600ms hosted route budget includes network + render; D1-only is a fraction.
- 10× p95 = 1× × ~1.5–1.6 (sublinear because most queries are index-probes, not scans).
- Query/subrequest budgets = observed count + 2 headroom (proof instrumentation may add a counting query).
- Subrequest ceiling: Cloudflare Workers free tier allows 50 subrequests/invocation (paid: 1000). Every HP budget is ≤18 — well under. The DISCOVERY task `T-P4-02` confirms the live hosted count.

## Performance evaluator contract (PERF-002, PERF-007, directive 4A)

| Field | Value |
|---|---|
| Baseline metric | D1 round-trip p95 + query count per HP route (table above) |
| Target metric | table above (per HP) |
| Measurement command (local) | `bun run cf:d1-{repo}-proof` (P3, sqlite3) |
| Measurement command (hosted) | `bun run cf:d1-runtime-proof` (P4, real D1) |
| Dataset/fixture | `scripts/seed-performance-test-data.ts` tiers 1×/10× (local), 1×/10×/100× (hosted) — PERF-005 |
| Runs / flake policy | local: 5 runs, nearest-rank p95; hosted: 20 runs min (matches existing `MIN_P95_RUNS=20`), 30 max |
| Regression threshold | p95 > budget OR query-count > budget → CI red (local) / release-block (hosted) |
| Related functional tests | `12` Test Execution Matrix |
| Evidence artifact | `evidence/<date>-d1-{repo}-proof.{json,md}` per script |

Passing ordinary unit tests is **not** performance readiness for this plan; the declared evaluator is the proof script + hosted runtime proof.

## Reliability

- **D1 unavailable:** routes already degrade (Better Auth + repository error paths). Not changed by this plan. P2's LIMITs and batching do not add new failure modes; they reduce payload size, which *helps* under degradation.
- **Stale app-layer cache (P2 `T-P2-03`):** category taxonomy cache has a bounded TTL + invalidation on write. Worst case: a category rename is visible after TTL. Acceptable for a global taxonomy rarely edited; if it becomes a problem, shorten TTL (a var, no migration).
- **Proof route failure:** does not affect user routes; only blocks release.

## Observability (proportional)

This plan does **not** add new observability (the Worker-production-observability sibling pack owns dashboards/alerts). It adds:

- **Proof artifacts** (JSON+MD) as the measurable evidence — these are the observability for the budget contract.
- **`EXPLAIN QUERY PLAN` evidence** in the hosted proof output (P4) — this is the index-coverage observability.

No new metrics, traces, dashboards, or alerts are introduced by this plan. If the owner later wants runtime p95 alerting on D1 hot paths, that is the observability pack's scope.

## Performance regression risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| P1 index makes a write slower (index maintenance) | Low | Low | All P1 indexes serve read-heavy hot paths; write frequency is low. Measure in P3. |
| P2 batched capability check slower than loop for small N | Medium | Low | For N≤3 the loop may be faster; batched query still O(1) round-trips. Acceptable; budget allows ≤6 queries regardless. |
| P2 LIMIT truncates a real user's list | Low | Medium (UX) | LIMITs sized to 10×; guard in `05`. |
| Local sqlite3 plan ≠ hosted D1 plan | Medium | Medium | P4 hosted `EXPLAIN` gate is authoritative; local is proxy only. |
| Hosted proof flaky under head-sampling | Low | Low | 20-run min + nearest-rank p95; rerun policy in evaluator contract. |

## Cold-start / first-use

Not in scope. Worker cold-start is the observability pack's concern. D1 has no cold-start in the Workers sense (it is a binding).
