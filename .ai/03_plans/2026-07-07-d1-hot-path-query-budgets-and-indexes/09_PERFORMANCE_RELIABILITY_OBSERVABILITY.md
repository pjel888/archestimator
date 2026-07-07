# 09 — Performance, Reliability, Observability

## Canonical D1 hot-path budget table (PERF-002, PERF-003, PERF-011)

This is the single source of truth referenced by the proof scripts (P3/P4) and the CI/release gates (P5). Numbers are sized for **Cloudflare Workers Free / D1 Free limits** (verified against official docs, 2026-07-07 — see "Free-tier ceilings" below) with 10× headroom over the closed-beta first-user volume assumption (A1: tens of workspaces, hundreds of projects, low-thousands of estimate rows).

Column definitions:

- **p95 / p99 ms** — D1 round-trip wall-clock for the route's total D1 work (sum of statement latencies, not including network to client).
- **queries** — D1 statement count.
- **subreq** — Worker subrequest count (D1 binds count 1:1; see free-tier ceiling below).
- **rowsRead/request** — **D1 rows scanned per request.** This is the load-bearing free-tier metric: D1 bills "rows read" by counting every row the engine *scans* (including JOIN rows and rows filtered out by predicates), not rows returned. A single 5-table JOIN or an unindexed `ORDER BY` over 10k rows counts ~10k rows read even if it returns 10 rows. This is why the P1 indexes and P2 LIMITs are non-optional.
- **rowsRead/day** — projected daily rows-read against the 5M/day free ceiling, assuming a closed-beta first-user daily-activation profile (see A1 and the projection note below).

| HP | Route | p95 ms (1×) | p95 ms (10×) | p99 ms (10×) | queries | subreq | rowsRead/req (10×) | rowsRead/day (proj.) | Evidence source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Auth floor | every `/workshop/*` | 60 | 90 | 120 | 3 | 3 | ~3 (PK/email-idx probes) | ~60k | `03` §2; better-auth `disableCookieCache:true` | non-negotiable floor; `DEC-AUTH-01` may reduce |
| HP-1 | `/workshop` homebase | 250 | 400 | 550 | ≤16 | ≤18 | ~600 (favorites+projects+pubs scans) | ~600k | `workspace-repository.ts:2044` + libs | heaviest; 4 waves |
| HP-2 | `/workshop/projects` | 200 | 350 | 480 | ≤12 | ≤14 | ~500 | ~500k | `workspace-repository.ts:1394` | P2 LIMITs cap the unbounded scans |
| HP-3 | `/workshop/projects/[id]` | 180 | 300 | 420 | ≤9 | ≤11 | ~400 | ~400k | multi-repo | `canAccessProjectInD1` 3-EXISTS |
| HP-4 | `/workshop/.../estimates/[nodeId]` | 220 | 360 | 500 | ≤8 | ≤10 | ~800 (full tree for one estimate) | ~300k | `workspace-repository.ts:3973` | sheet editor |
| HP-5 | `/workshop/.../estimates` | 150 | 250 | 350 | ≤6 | ≤8 | ~250 post-P2 | ~250k | `workspace-repository.ts:2867` | **post-P2 N+1 fix**; was `4 + N` queries and `~50 + N×(rows×3)` rows-read from the correlated subqueries |
| HP-6 | `/workshop/library/components` | 180 | 300 | 420 | ≤8 | ≤10 | ~400 (cat scan cached after P2 → ~50 warm) | ~400k cold / ~80k warm | `component-library-repository.ts:1098` | global cat scan cached in P2 (`T-P2-03`) |
| HP-7 | `/workshop/proposals` | 120 | 200 | 280 | 1 | 1 | ~120 (wide 5-table join, LIMIT 50) | ~120k | `recipient-proposals-repository.ts:86` | G3 index reduces per-recipient residual scan |
| HP-8 | `/share/[token]` | 150 | 240 | 330 | ≤5 | ≤7 | ~60 | ~300k (public, higher fan-out) | `public-repository.ts` | unauthenticated; 2 deferred writes |
| HP-9 | `/invite/[token]` | 80 | 120 | 160 | ≤2 | ≤3 | ~5 | ~10k | `invitation-d1-store.ts` | |
| HP-10 | `/invite/[token]/accept` | 200 | 320 | 440 | ≤6 | ≤8 | ~30 (mostly writes) | ~10k | `invitation-acceptance.ts:41` | write path; rows-written budget ~30/req |
| HP-11 | `/invite/[token]/continue` | 60 | 90 | 120 | 1 | 1 | ~3 | ~5k | rate-limit read | |

**Projected daily total at closed-beta first-user activation (A1):** summing the rows-read/day column with the activation profile (estimate: ~1000 `/workshop/*` navigations/day, ~200 dashboard loads, ~150 project views, ~50 library opens, ~100 share views, ~30 estimate edits) → **approximately 1.8–2.4M rows read/day** at 1× volume, leaving ~50–60% headroom under the **5M/day free ceiling**. At **10×** first-user volume this would exceed 5M/day and *require* either the P1 indexes (which collapse scans to probes) or an owner decision to move to D1 paid. This is the single most important planning fact in this pack: **the P1 index work is not an optimization, it is a free-tier-budget necessity at 10× volume.** Recorded as assumption A1 (volume) + derived projection; to validate via P4 hosted `rows_read` capture.

### Free-tier ceilings (verified against official Cloudflare docs, 2026-07-07)

Sourced from Cloudflare D1 Pricing/Limits and Workers Limits docs (citations in `20_AUDIT_AND_REVISION_LOG.md` §"Research sources"). These are the hard ceilings this pack budgets against:

| Resource | Free-tier limit | Source | Daily-reset behavior |
|---|---|---|---|
| D1 rows read | **5,000,000 / day** | developers.cloudflare.com/d1/platform/pricing | resets 00:00 UTC; queries error when exhausted until reset |
| D1 rows written | **100,000 / day** | same | same |
| D1 total storage | **5 GB** included | same | hard cap |
| D1 max DB size | 500 MB | same | hard cap |
| Workers subrequests / invocation | **50** (free); 10,000 default / up to 10M on paid (since 2026-02-11 changelog) | developers.cloudflare.com/workers/platform/limits | per-invocation |
| Workers requests / day | 100,000 | same | resets daily |
| Workers CPU / invocation | 10ms (free) | same | per-invocation |

**Implications for this pack:**
- Every HP budget's `subreq` column (≤18 max) is well under the 50 free per-invocation ceiling.
- The `rowsRead/day` projection (1.8–2.4M at 1×) is under 5M/day but has <2.5× headroom; this is why P1 indexes and P2 LIMITs are mandatory, not optional.
- The `rows written` budget (HP-10 ~30/req, plus per-request auth-boundary `account_security_events` writes) is negligible against the 100k/day write ceiling at first-user volume.
- The 10ms free Workers CPU/invocation ceiling is not directly budgeted here (CPU is the observability pack's concern) but the HP-1 4-wave fan-out is the closest candidate to approach it; flagged for the observability pack.

## Performance evaluator contract (PERF-002, PERF-007, PERF-011, directive 4A)

| Field | Value |
|---|---|
| Baseline metric | (a) D1 round-trip p95 per HP route; (b) D1 query count; (c) **D1 rows read per request** (the free-tier load-bearing metric); (d) Worker subrequest count |
| Target metric | the four-column budget table above (per HP) |
| Measurement command (local) | `bun run cf:d1-{repo}-proof` (P3, sqlite3 — measures query count + local p95; **rows-read is a hosted-only signal**, see note) |
| Measurement command (hosted) | `bun run cf:d1-runtime-proof` (P4, real D1 — measures all four including rows-read via `EXPLAIN` row-count estimation or D1's `rows_read` if exposed) |
| Dataset/fixture | `scripts/seed-performance-test-data.ts` tiers 1×/10× (local), 1×/10×/100× (hosted) — PERF-005 |
| Runs / flake policy | local: 5 runs, nearest-rank p95; hosted: 20 runs min (matches existing `MIN_P95_RUNS=20`), 30 max |
| Regression threshold | p95 > budget OR query-count > budget OR **rows-read/req > budget** OR subrequest > budget → CI red (local, where measurable) / release-block (hosted) |
| Related functional tests | `12` Test Execution Matrix |
| Evidence artifact | `evidence/<date>-d1-{repo}-proof.{json,md}` per script |

**Rows-read measurement note:** local sqlite3 cannot reproduce D1's exact rows-read accounting (sqlite3 `EXPLAIN QUERY PLAN` gives a *plan* but not a scanned-row count; D1's billing counts scanned rows including JOIN fan-out). Therefore:
- Local proof asserts **query count** and **p95** (deterministic, reproducible).
- Hosted proof is the authoritative source for **rows-read/request** and **rows-read/day** projection against the 5M ceiling.
- A `DISCOVERY-REQUIRED` sub-step in `T-P4-02` confirms whether D1 exposes a `rows_read` metric per statement (e.g., via `meta.rows_read` on the result, or via the Workers analytics). If exposed, the hosted proof captures it directly. If not, the proof estimates rows-read from `EXPLAIN` + fixture row counts and labels `evidenceClass: derived`. This is the one measurement gap that cannot be closed locally and is honestly labeled as such.

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
| **P1 indexes not applied → rows-read exceeds 5M/day free ceiling at 10× volume** | High (if P1 skipped) | **Critical** (D1 returns errors; app degrades) | P1 is mandatory; CI gate (P5) fails if a hot-path query's `EXPLAIN` shows a scan; this is the single most important mitigation in the pack |
| P1 index makes a write slower (index maintenance) | Low | Low | All P1 indexes serve read-heavy hot paths; write frequency is low. Measure in P3. |
| P2 batched capability check slower than loop for small N | Medium | Low | For N≤3 the loop may be faster; batched query still O(1) round-trips. Acceptable; budget allows ≤6 queries regardless. |
| P2 LIMIT truncates a real user's list | Low | Medium (UX) | LIMITs sized to 10×; guard in `05`. |
| Local sqlite3 plan ≠ hosted D1 plan | Medium | Medium | P4 hosted `EXPLAIN` gate is authoritative; local is proxy only. |
| D1 `rows_read` metric not exposed → rows-read/day projection stays an estimate | Medium | Medium | `T-P4-02` DISCOVERY confirms; fallback is `EXPLAIN`+fixture-count estimate labeled `derived`. Does not block p95/query-count gates. |
| Hosted proof flaky under head-sampling | Low | Low | 20-run min + nearest-rank p95; rerun policy in evaluator contract. |

## Cold-start / first-use

Not in scope. Worker cold-start is the observability pack's concern. D1 has no cold-start in the Workers sense (it is a binding).
