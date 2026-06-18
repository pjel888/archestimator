# 00 — Executive Brief & Scope

## The question this pack answers

> "Can we batch the queries to make it faster? Will it become faster if we batch them?"

**Honest verdict: Yes — but only where the queries are actually *sequential*. Batching the parts that already run in parallel buys almost nothing, and a naive "one big query" can regress.**

The dashboard's data fetch has three layers, and only one of them is the real cost:

1. **Top-level `Promise.all` of 5 repository functions** (`src/app/workshop/page.tsx`). Already concurrent — their round-trips overlap. **Batching here ≈ 0 gain.**
2. **The `getLibraryOverview` fan-out** (~11 aggregate queries, `component-library-repository.ts`). Already in one `Promise.all` — also overlapping. Collapsing it is a **DB-load** win (fewer table scans), not a user-latency win. *But* the dashboard throws away ~6 of those queries' results — so the real win here is **fetching less**, not batching.
3. **The serial tail inside `getWorkshopHomebaseData`** (`workspace-repository.ts:1050`–~1222). After a 6-way parallel wave, it issues **up to ~6 more sequential round-trip waves**, each gated on the previous one's result. **This is the critical path and the real prize.**

The efficacy model the whole pack rests on:

> **Total server-fetch latency ≈ (number of *sequential* round-trip waves) × (network RTT + query exec).**
> Batching helps *only* by reducing the number of sequential waves, or by removing redundant same-table scans. It does nothing for queries that already share a wave.

This is why "batch everything into one RPC" is the wrong instinct: it can *reduce* parallelism (one big query can't overlap with the other dashboard branches) and can pick a worse query plan than several indexed point-lookups — especially on small workspaces. The strategy is therefore **staged and lowest-risk-first**, not "rewrite it all as an RPC."

## What we will do (in priority order)

- **P1 — Collapse the homebase serial tail with app-only wave-merging** (no DB object): run recent/favorite estimate arms in one latency wave, merge project backfills after the estimate result, and run the independent tail reads (publications, pending-invite summary, estimate nodes) as one `Promise.all` wave instead of three serial `await`s. A single `OR`/`IN` query is allowed only if `09-…` proves per-arm limits, favorite preservation, URL safety, and `EXPLAIN` parity. Removes ~3 sequential waves while preserving per-query error isolation.
- **P2 — Dashboard-lean library fetch** (no DB object): a dedicated function that fetches only what the dashboard currently renders — component count, recent components, and template count — instead of the full 11-query `getLibraryOverview` (which also computes supplier/brand/stale/discontinued health stats and template detail the dashboard discards). Leaves `getLibraryOverview` untouched for the Library page.
- **P3 — Candidate `workspace_homebase_summary` RPC** (DB lane, gated): collapse the *remaining* homebase-dependent tail into a single round-trip server-side, while keeping publications and pending-invite summary app-side. **Only if** Phase 0/P1 measurement shows the homebase waterfall still dominates. This is A-23 / Phase-8 / RISK-20 from the Performance-Refactor pack; implementation ownership is decided by `12-…` so the RPC is authored once. Requires `SECURITY INVOKER` + membership-joined `WHERE` + cross-tenant denial proof + additive `types.ts` splice + Codex review.

## Non-goals (out of scope)

- No deliberate UI/UX change to the dashboard. "Unchanged" means the state, loading, degraded, responsive, accessibility, and perceived-performance contract in `10-…` remains true; the Workshop Dashboard still follows the exploratory exception in `DESIGN.md`.
- No new index DDL (that is the `database-indexing-and-query-performance` pack; this pack only *feeds* it candidate shapes via `EXPLAIN`).
- No page-level ISR / `revalidate` caching of the dashboard — rejected for freshness (see `03-…` §Caching). Multi-user workspace data (recent projects/estimates) must stay per-request fresh.
- No change to the React Server Component boundary (already done 2026-06-19; see memory *Workshop dashboard RSC*).
- No new package dependencies.

## Definition of done (for the eventual implementation, not this plan)

A phase ships only when, on **Small, Medium, and Large** fixture profiles: round-trip/latency-wave count on the critical branch drops as planned, p95 server-fetch wall-clock meets the numeric threshold in `05-…`/`13-…`, behavior is byte-identical, UX state gates pass, and the smaller fixtures show no meaningful regression. Any new/merged DB query also needs `EXPLAIN (ANALYZE, BUFFERS)` proof. Phase 3 additionally requires the `11-…` security matrix and `12-…` rollout gate.

## Honesty note on baseline numbers

Investigation produced *estimates* (e.g. "~11 round-trips", "~2–3s"). Those are **hypotheses to be measured in Phase 0**, not facts. No latency number in this pack is provider-proven yet; the measurement protocol exists precisely to replace estimates with evidence before any DB change.
