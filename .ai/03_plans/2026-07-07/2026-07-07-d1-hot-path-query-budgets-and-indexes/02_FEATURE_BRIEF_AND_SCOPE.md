# 02 — Feature Brief And Scope

## Source brief (verbatim from PROMPT.md)

> **Goal:** Create a plan pack that sets D1 query budgets, index coverage, and hosted performance proof for first-user hot paths.
>
> **Evidence To Start From:**
> - Repository hot paths live in `src/lib/repositories/`, especially `workspace-repository.ts` and estimate/project/library repositories.
> - Existing proof scripts include `scripts/generate-cloudflare-d1-performance-proof.ts`, `scripts/verify-cloudflare-d1-runtime-performance-proof.ts`, `scripts/measure-library-performance-baseline.ts`, and `scripts/seed-performance-test-data.ts`.
> - `scripts/audit-dbidx-repo.ts` exists, but current proof is not clearly tied to every active repository path.
> - Performance budget and hosted checks exist in `package.json`, but some are advisory or credential-gated.
>
> **Required Plan Pack:** Map first-user flows to D1 queries, define p95/p99 and subrequest budgets, list required indexes, specify fixture sizes, identify N+1 risks, and design local plus hosted proof commands.
>
> **Constraints:** Do not add paid Cloudflare features. Avoid synthetic-only proof where hosted D1 behavior matters. Keep plan scope to D1 query/index readiness, not general UX.
>
> **Stop Condition:** The pack is ready when an executor can implement measurable D1 hot-path budgets and prove them against representative data.

## Scope (in)

- Every D1-backed repository under `src/lib/repositories/` that participates in a first-user hot path.
- Every first-user route under `src/app/workshop/**`, `src/app/share/[token]`, `src/app/invite/[token]`, `src/app/invite/[token]/accept`, `src/app/invite/[token]/continue`.
- The per-request auth read floor in `src/lib/auth/` (session, closed-beta, profile stores).
- Additive index migrations (new `0037`, `0038`).
- Local SQLite proof scripts (`scripts/generate-cloudflare-d1-*-proof.ts` family).
- Hosted D1 proof surface (`src/lib/cloudflare/d1-performance-proof-router.ts` + `scripts/verify-cloudflare-d1-runtime-performance-proof.ts`).
- The shared budget helper (`scripts/lib/d1-query-budget.ts`) and the static query inventory (`scripts/build-performance-query-inventory.ts`).
- CI gate wiring for budget regression.
- Fixture sizing for proof (`scripts/seed-performance-test-data.ts` manifest tiers).

## Non-goals (out)

- General UX, IA, or design-system changes (owned by `2026-07-06-Transition-And-Loading-UX-And-UI` and UX sibling packs).
- Bundle-size and route-transition work (owned by `2026-07-07-bundle-and-route-performance-gate-hardening`).
- D1 migration state and schema integrity audits (owned by `2026-07-07-d1-migration-state-and-schema-integrity`).
- R2 upload memory/multipart and image readiness (owned by `2026-07-07-r2-upload-memory-multipart-and-image-readiness`).
- D1/R2 backup/restore operational readiness (owned by `2026-07-07-d1-r2-backup-restore-operational-readiness`).
- Durable Object realtime scale (owned by `2026-07-07-durable-object-realtime-scale-readiness`).
- Full OWASP API authz matrix refresh (owned by `2026-07-07-owasp-api-authz-matrix-refresh`).
- Cloudflare Queues/Cron production ops (owned by `2026-07-07-cloudflare-queues-cron-production-ops`).
- Worker production observability budgets (owned by `2026-07-07-cloudflare-worker-production-observability-and-budgets`).
- Provider-exit final closure (owned by `2026-07-07-provider-exit-final-proof-closure`).
- Any mutation of the Supabase legacy archaeology (`supabase/migrations/**`) or any provider project outside `wrangler.jsonc` bindings.

## Boundary clarifications

- **Auth floor:** The 3-read per-request auth cost is *in scope* for budgeting and an optional cookie-cache fast-path recommendation, but the authz *matrix* itself (who-can-do-what denials) is out of scope and owned by the OWASP refresh pack. This plan records the cost; that pack owns the rules.
- **`listProjectEstimates` correlated subqueries:** In scope for budgeting and a documented optimization recommendation (pre-aggregated summary table). The actual implementation of a denormalized summary is a larger data-model change — this plan recommends it and sequences it as an optional P2 task (`T-P2-04`) gated on first-user volume actually justifying it, rather than committing the schema change blind.
- **Better Auth cookie cache:** The `disableCookieCache: true` decision is in scope as a *recommendation with a documented tradeoff*, not a forced change. Re-enabling cookie cache has security-revalidation implications that intersect the OWASP/auth packs; this plan flags it and defers the final call to the owner.
- **Hosted proof credentials:** The existing `cf:verify-hosted-performance` is credential-free (public routes). The D1 runtime proof requires `CRON_SECRET`. This plan does **not** add new credentials; it reuses the existing `CRON_SECRET`-gated surface. Any new credential requirement is a blocker, not an assumption.

## Assumptions (carried into `15`)

- A1: First-user volume at closed-beta launch is small (tens of workspaces, hundreds of projects, low thousands of estimate rows). Budgets are sized for 10× this.
- A2: The existing `CRON_SECRET`-gated `/__cloudflare/d1-performance-proof` endpoint can be extended without a new auth surface.
- A3: Local sqlite3 query plans are a useful-but-not-sufficient proxy for hosted D1 plans; hosted `EXPLAIN QUERY PLAN` is the authoritative gate.
- A4: Additive indexes (CREATE INDEX, no DROP) are safe to ship without a backfill window because D1 indexes are online and the queries are read-only hot paths.
- A5: No other agent is currently editing `src/lib/repositories/`, the proof scripts, or migrations `0037`/`0038` (to be re-confirmed at execution time per the README stale-plan checklist).

Each assumption is marked `assumption` strength in the traceability matrix; none is presented as repo fact.
