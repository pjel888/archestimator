# 05 — Validation & Measurement Protocol

The whole pack stands or falls on **measuring waves and per-branch latency**, not total page time — because the top-level `Promise.all` means only the slowest branch matters. Every phase carries a before/after gate. Nothing in Phase 3 (DB) ships on estimates.

## Metrics

| Metric | How | What it proves |
|---|---|---|
| Per-branch + per-wave timing | `08-…` harness: request-correlated structured `PERF_TRACE` logs as minimum; `Server-Timing` only if implemented through a response-capable surface | Which branch is the critical path; how many waves it has. |
| Round-trip count per render | actual Supabase network-request counter, tagged by safe branch/function labels (U1) | The headline before/after number (waves cut and no new N+1). |
| Transport multiplexing check | inspect the server `fetch`/undici connection to the Supabase edge (HTTP/2 vs HTTP/1.1 + pool size) | Whether a `Promise.all` "wave" truly runs concurrently on the wire. If HTTP/1.1 with a bounded pool, the parallelized tail partially serializes and the measured win will be **less** than the wave-count predicts — attribute the gain accordingly before claiming it. |
| `EXPLAIN (ANALYZE, BUFFERS)` | run each new/merged query on Small/Medium/Large when branch DB is available | Index use (no seq scan on large), and `shared read/hit` buffers ≤ sum of the replaced queries (proves scans actually dropped). |
| `pg_stat_statements` total exec time | `reset()` → 100 scripted dashboard loads → top-by-`total_exec_time` | DB-side win (e.g. OPP-4 aggregate merge shows here even when wall-clock doesn't). |
| End-to-end wall clock | `performance.now()` around the page `Promise.all`, N=30, median + p95/p99 | User-perceived server-fetch latency. **Measure from the deployed environment or branch preview, not localhost** — localhost RTT ≈ 0 hides the waterfall win. |
| Concurrent-load behavior | 20 and 50 simultaneous dashboard renders on branch DB | Verifies app-only `Promise.all` wave-merging does not trade latency for 429s, connection pressure, lock/wait events, or p99 collapse. |
| UX/perceived-performance gate | state/a11y/visual matrix in `10-…` | Verifies a data-layer win does not create a worse user-visible loading/degraded/mobile experience. |
| Cross-tenant denial (Phase 3) | fresh `prove:*` test modelled on the EXISTING `prove:estimate-list-summaries` (not `prove:project-chart-buckets`, which doesn't exist) | The RPC cannot leak across workspaces (RISK-20). |
| Supabase advisor | `get_advisors` security + perf after any RPC | No new policy/index regressions. |

## Fixtures

- **Small:** ~5 projects / ~10 estimates / ~20 library items. Catches over-batching regressions (point-lookups are near-instant; a fat RPC can be *slower*).
- **Medium:** ~25 projects / ~250 estimates / ~500 library items. Catches the common beta middle and query-plan slope changes.
- **Large:** ~200 projects / ~2k estimates / ~5k library items, with publications + pending invites. This is where waterfall depth hurts and where the win shows.

Seed against a Supabase **branch** DB, never prod, before Phase 3. Phase 1/2 app-only work may start from a recorded minimum viable baseline if branch DB is temporarily unavailable, but the final performance claim must identify that downgrade.

## Numeric pass/fail defaults

These are defaults until Phase 0 ratifies or revises them with evidence:

- Phase 1 Large p95 server-fetch improves by **>=20% or >=200ms**, whichever is easier to satisfy after baseline.
- Phase 1 Small and Medium p95 regression is **<=5% or <=25ms**, whichever is larger.
- Phase 1 Branch A latency-wave count drops by the expected count and request count does not exceed the accepted two-arm/one-tail contract in `09-…`.
- Phase 2 dashboard library request count is **<=3** for the currently rendered fields, and payload bytes drop materially from `getLibraryOverview`.
- Phase 3 is considered only if it predicts **>=15% or >=150ms** additional p95 improvement after Phase 1/2.
- 20/50 concurrent-load runs show **0 429s**, no sustained pool saturation, and DB total time/buffers no worse than **10%** unless explicitly accepted with evidence.

## Per-phase gates

- **Phase 0:** harness acceptance from `08-…` passes and baseline numbers are recorded in `LOOP_LEDGER.md` for the available fixture profiles. Identify the empirically slowest branch (hypothesis: homebase). **No optimization starts before a minimum viable baseline exists; no Phase 3 starts before branch-DB baseline exists.**
- **Phase 1 (OPP-1):** Branch A round-trip/wave count drops; `WorkshopHomebaseData` output is byte-identical to baseline for the same fixture; Small/Medium regressions stay within numeric tolerance; Large improves by threshold; error-isolation behavior unchanged (kill an optional table, siblings still resolve). Run `bun run type-check`, the relevant `tests/vitest` parity/DOM tests, and `next build`.
  - **Tie-break determinism:** merging two `LIMIT 12 ORDER BY updated_at` reads into one `OR` query can return a *different* 12-row window when >12 rows share an `updated_at` (the DB-side `LIMIT` picked an arbitrary tie-break before the merge). Add a deterministic secondary key — `ORDER BY updated_at DESC, id DESC` on the DB read **and** the TS re-sort — and assert parity after that stable sort, or the "byte-identical" gate will flap on tied timestamps in the 2k-estimate fixture.
- **Phase 2 (OPP-2):** Branch C query count drops 11(+conditional)→<=3 for the current rendered fields; Library *page* output unchanged; dashboard still renders when the spotlight degrades to null; no unused template detail query unless a new UI scope renders it.
- **UX gate:** the loading/degraded/empty/mobile/a11y matrix in `10-…` passes for every phase that changes data composition.
- **Phase 3 (OPP-3):** only entered if `12-…` says the residual homebase tail still dominates after Phase 1/2. Then: `EXPLAIN` confirms index use + reduced buffers; parity vs the app path; **cross-tenant denial and same-workspace user-favorite isolation proof green**; Small/Medium non-regression; Supabase advisor clean; server-only flag fallback proven; **Codex review pass** (HIGH blast radius). If the smaller fixtures regress or the planner picks a worse plan, **reject the RPC** and keep the Phase-1 app-only result.

## Repo gates to wire (proportional)

- `bun run type-check`, the relevant repository/DOM tests, `next build` — every phase (per memory: `next build` is the only thing that catches `"use server"`/async-export breakage).
- A `perf:dashboard-query-count` or shared `perf:query-count` assertion for the dashboard. **It does not exist yet** — both this pack and the Performance-Refactor pack list it as new; Phase 0's round-trip counter (U1) is effectively its first implementation. Build it here and contribute it back as the shared gate rather than assuming it's available.
- Phase 3 only: the `prove:*` cross-tenant denial gate + `get_advisors`.

## Acceptance rule

A change is accepted iff it **measurably reduces sequential waves or redundant scans on the target fixture profile, stays within Small/Medium regression tolerance, preserves identical behavior and UX state, and does not raise DB/security/concurrency risk beyond the gate budget**. "Looks batched" is not acceptance — the before/after numbers are.
