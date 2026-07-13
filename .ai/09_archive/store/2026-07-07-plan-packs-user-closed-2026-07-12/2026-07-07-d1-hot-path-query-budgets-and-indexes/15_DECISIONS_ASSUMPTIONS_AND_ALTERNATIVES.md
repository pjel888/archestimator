# 15 — Decisions, Assumptions, And Alternatives

## Decisions

### DEC-001 — Plan profile: exhaustive
- **Problem:** what profile per directive §9?
- **Options:** compact / standard / exhaustive.
- **Decision:** exhaustive.
- **Reason:** touches D1 indexes + migrations + app authorization (`T-P2-01`) + release readiness. Directive §9 mandates exhaustive for database/auth/release work.
- **Rejected alternatives:** standard (insufficient for authz-changing task); compact (rule out).

### DEC-002 — Additive indexes only (no rewrite)
- **Problem:** how to close G1–G4?
- **Options:** rewrite existing indexes / add new additive indexes / denormalize.
- **Decision:** additive `CREATE INDEX IF NOT EXISTS` only.
- **Reason:** no downtime (D1 online); reversible; no rewrite risk. Matches migration `0031` precedent.
- **Rejected:** rewriting `idx_estimate_favorites_workspace_user_created` to lead on `user_id` would change the workspace-scoped reads that *do* use it. Additive coexists.

### DEC-003 — G5 (category scan) by app-layer cache, not index
- **Problem:** `component_category_nodes` global scan has no helpful index.
- **Options:** add an index on `(sort_order, label)` / cache the result / denormalize.
- **Decision:** process-local TTL cache with write-time invalidation.
- **Reason:** the table is small, static, global (`using(true)` RLS). An index on `(sort_order, label)` still requires a full scan (no WHERE). Cache removes the scan entirely.
- **Rejected:** index (doesn't help a WHERE-less scan); denormalize (over-engineering for a small static table).

### DEC-004 — Local proof uses real repository SQL, not synthetic tables
- **Problem:** today local proofs use `__archestimator_d1_proof_*` synthetic tables, making local≠hosted.
- **Options:** keep synthetic / use real repository SQL / use real repository functions.
- **Decision:** use real repository SQL (extract SQL to constants where needed).
- **Reason:** makes local and hosted comparable; closes Gap F4. Extracting SQL to constants is a small testability win.
- **Rejected:** synthetic (status quo, gap remains); full repository-function calls against local sqlite3 (too coupled to D1 binding).

### DEC-005 — CI gate = local; release gate = hosted
- **Problem:** where do budget checks run?
- **Options:** both in CI / both hosted / split.
- **Decision:** local proof in CI (fast, no creds); hosted proof as release gate (needs CRON_SECRET).
- **Reason:** hosted proof can't run in CI without secret exposure; local proof is fast and catches regressions.
- **Rejected:** hosted in CI (secret risk); local only (misses D1-specific planner behavior).

### DEC-006 — Batched capability check co-located with `canEditEstimateInD1`
- **Problem:** where does the batched variant live to avoid drift?
- **Options:** in the route / in a new util / in `d1-access.ts` alongside the per-id fn.
- **Decision:** `src/lib/authz/d1-access.ts` alongside `canEditEstimateInD1`.
- **Reason:** co-location minimizes drift risk; the parity test references both.

### DEC-SEC-01 — Batched check preserves authorization semantics (security posture unchanged-or-strengthened)
- **Problem:** does `T-P2-01` change who-can-edit-what?
- **Decision:** no. The batched SQL is a literal generalization (same 6-clause OR-of-EXISTS, `IN` instead of `=`). Denial-parity test is mandatory.
- **See:** `08`.

### DEC-007 — Subrequest capture: DISCOVERY-first with D1-call-counting fallback
- **Problem:** no known runtime subrequest API.
- **Decision:** T-P4-02 DISCOVERY step first; fallback to counting `prepare().bind()` calls (documented as proxy evidence).
- **Reason:** honest about the gap; doesn't block the budget on an uncertain API.

### DEC-AUTH-01 — Better Auth cookie cache is a recommendation, not implemented here (owner decision)
- **Problem:** re-enabling cookie cache would cut the 3-read auth floor but has session-revalidation implications.
- **Decision:** flag in `15`, defer to OWASP/authz pack + owner. Do not implement in this plan.
- **Reason:** intersects security posture owned by another pack.

### DEC-008 — Optional denormalized `estimate_summary` deferred (T-P2-04 gated)
- **Problem:** the 3-correlated-subquery cost in `listProjectEstimates`.
- **Decision:** do not build speculatively; gate on P4 hosted evidence exceeding budget.
- **Reason:** blind schema change is high-blast-radius; first-user volume (A1) likely doesn't justify it.

## Assumptions (each marked; none presented as repo fact)

- **A1** (`assumption`): first-user closed-beta volume is small (tens of workspaces, hundreds of projects, low-thousands of estimate rows). Budgets sized for 10×. To validate: P4 hosted proof at 10×.
- **A2** (`assumption`): the existing `CRON_SECRET`-gated proof endpoint can be extended without new auth. To validate: P4 implementation.
- **A3** (`assumption`): local sqlite3 plans are a useful-but-insufficient proxy for hosted D1. Mitigated by hosted EXPLAIN gate (T-P4-03).
- **A4** (`assumption`): additive indexes are safe to ship without backfill (D1 online). Validated by `0031` precedent.
- **A5** (`assumption`): no concurrent agent owns the target files. To validate: README checklist at execution.

## Rejected alternatives (consolidated)

- **Runtime query-budget enforcement middleware** — out of scope (observability pack); adds latency.
- **Move all proof to hosted** — loses fast local iteration; CI needs local.
- **Generic query-builder for index-friendliness** — harms readability and EXPLAIN transparency.
- **Rewrite existing favorites indexes** — breaks workspace-scoped reads that use them.
- **Index on `(sort_order, label)` for categories** — doesn't help a WHERE-less scan.
- **Hyperdrive for D1** — Hyperdrive is for external Postgres/MySQL, not D1 (directive 8A). Rejected on factual grounds.
- **D1 paid plan for higher query limits** — violates PERF-008 / AGENTS.md cost posture.
- **Workers Smart Placement paid / Workers Analytics paid** — same; PERF-008.
- **Synthetic-only hosted proof** — violates PROMPT constraint "avoid synthetic-only proof where hosted D1 behavior matters."
