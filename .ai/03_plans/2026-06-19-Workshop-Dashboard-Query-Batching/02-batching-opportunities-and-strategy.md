# 02 — Batching Opportunities & Strategy

Ranked by **user-perceived latency win ÷ risk**. Each names the mechanism and the honest caveat. The guiding rule (from `00-…`): collapse *sequential waves* and *redundant same-table scans*; do not "batch" already-parallel queries.

## Opportunity ranking

### OPP-1 — Collapse the homebase serial tail (app-only wave-merging) — **DO FIRST**
- **Mechanism (d) + app code, no DB object.**
  - Run `estimates` recent + favorite (H3+H4) in one latency wave, with the preferred implementation as two bounded arms inside one `Promise.all`. A single `OR`/`IN` read is allowed only if it preserves per-arm limits and favorite estimates outside the recent window (`09-…`).
  - Merge the `projects` follow-ups (H2 favorites + H5 missing) into a single id-batched read after the merged estimate result. Recent-estimate project ids must be computed from `recentProjectIds ∪ favoriteProjectIds`, not from fetched favorite project rows.
  - Run the independent tail — `readOptionalProjectPublications` (H6), `readPendingCollaborationVisibilitySummary` (H7), `estimate_nodes` (H8) — as **one `Promise.all` wave** instead of three serial awaits.
- **Win:** removes up to 3 sequential waves from the critical branch (2 in the independent tail + 1 from the H3/H4 estimates merge), **pending transport confirmation** (see `05-…`: if the server `fetch` runs HTTP/1.1 with a bounded pool rather than HTTP/2-multiplexed, the `Promise.all` tail partially serializes and the measured win is smaller than the wave count suggests). Still **High** — this branch sets wall-clock.
- **Risk:** **Low.** Pure app code; per-query error isolation preserved; no migration, no types churn, no RLS change.
- **Caveat:** merged `IN/OR` reads can change which rows come back under a `LIMIT` or over-fetch large workspaces. `09-…` is binding: preserve per-arm limits, deterministic ordering, favorite preservation, and payload ceilings.

### OPP-2 — Dashboard-lean library fetch — **DO SECOND**
- **Mechanism (d): fetch less.** New `getLibraryDashboardSpotlight()` fetching only what the dashboard currently renders: `componentCount`, recent components (limit 5), and `templateCount`. Leave `getLibraryOverview()` for the Library page. Return `recentTemplates: []` unless a separate UI scope starts rendering templates.
- **Win:** drops ~6 unused L1 queries + L3 template-detail work from the dashboard path. **Medium** for latency (Branch C overlaps Branch A, so it only helps if it was the slow branch on a large library), **clear** for DB load.
- **Risk:** **Low.** New function, dedicated path; Library page untouched; best-effort/null contract preserved.
- **Caveat:** two functions to keep roughly in sync; acceptable — they serve different surfaces.

### OPP-3 — `workspace_homebase_summary` RPC (DB lane) — **GATED, MEASURE FIRST**
- **Mechanism (a): Postgres function** collapsing the residual homebase-dependent chain (authorized recent/favorite projects, estimates, and estimate node roots) into **one round-trip**, server-side. Publications and pending-invite summary stay app-side best-effort reads.
- **Win:** collapses the residual tail to 1 wave. **High ceiling** — but only the delta *after* OPP-1 already removed the cheap waves.
- **Risk:** **High.** New DB object; RISK-20 cross-tenant; `types.ts` additive splice; user-scoped favorites inside an aggregate; a fat query can pick a worse plan than indexed point-lookups on small workspaces.
- **Decision gate:** implement **only if** Phase 0 baseline + post-OPP-1 measurement shows the homebase branch still dominates and the residual waves are worth a DB object. Phase 2 is not a hard precondition for a homebase-only RPC unless Branch C/library load remains part of the slow-path decision. This is A-23 / Phase-8 / RISK-20 of the Performance-Refactor pack; coordinate ownership through `12-…`.
- **Reconciliation note:** if the Performance-Refactor Phase 8 contract still lists `pending-collab summary` inside `workspace_homebase_summary`, update or supersede that output before implementation. This pack's current RPC scope keeps publications and pending-invite counts out of SQL.

### OPP-4 — Collapse `getLibraryOverview` same-table aggregates (FILTER) — **OPTIONAL / LIBRARY PAGE**
- **Mechanism (c):** one `SELECT count(*) FILTER (WHERE …) …` replacing the ~5 `cost_library_items` head-count scans.
- **Win:** **DB-load only** (fewer scans / lower `pg_stat_statements` total); negligible wall-clock because L1 is already parallel and best-effort.
- **Risk:** Medium (RPC or raw SQL; RLS over aggregates). **Not a dashboard win** — pursue only for the Library page, and only if `pg_stat_statements` flags it. Out of scope for the dashboard fast-path unless OPP-2 is skipped.

### OPP-5 — Doc-accuracy fix — **TRIVIAL**
- Fix the `page.tsx` comment that claims all repository calls are React-cached. Optionally wrap `getLibraryOverview`/the new lean fetch in `React.cache` for request-dedupe (no cross-request caching). Zero behavior change.

## Rejected / not recommended

- **Monolithic "fetch the whole homebase in one RPC" beyond the dependent chain** — loses parallelism with sibling branches, worst plan risk, destroys error isolation. The RPC (OPP-3) should collapse only the *dependent* chain, not absorb independent best-effort reads.
- **PostgREST embedded resources for the homebase union/dedup** — embedding handles the projects→estimates→nodes *sub-tree* in one trip, but cannot express the favorites∪recents dedup + the cross-RPC invite summary. If used at all, only for the sub-tree.
- **Page-level ISR `revalidate`** — rejected for freshness (multi-user workspace). See `03-…` §Caching.

## Staged strategy (lowest-risk-first)

```
Phase 0  Build harness + measure baseline          ── gate: correlated numbers exist for required fixtures
   │
Phase 1  OPP-1 homebase wave-merge (app only)      ── gate: ↓ waves, no small-fixture regression
   │
Phase 2  OPP-2 dashboard-lean library fetch + OPP-5 ── gate: ↓ queries, library page unchanged (run before RPC only if Branch C remains relevant)
   │
Phase 3  OPP-3 RPC — ONLY if measurement justifies ── gate: cross-tenant denial proof + Codex review
```

Each phase is independently shippable and independently revertible. Phases 1–2 are app-only (no DB blast radius). Phase 3 is the only high-blast-radius lane and is explicitly conditional on evidence.
