# 18 — Stack Contract And Production Standards

Consolidates the cross-cutting production decisions for the in-scope stack layers. Layers not touched by this plan are marked not applicable with reason.

## Next.js 16 / React 19

- **Applicability:** minimal. All changes are server-side (repositories, scripts, one Worker route). No route segment, layout, page, loading/error UI, metadata, or navigation change.
- **Server/Client boundary:** unchanged. No `"use client"` boundary moves. No client bundle impact. P2 changes are in Server Components and Server Actions only.
- **Data fetching owner:** unchanged — repositories via `getCloudflareD1Database().prepare().bind()`. No shift to/from Server Components, TanStack Query, or Server Actions.
- **Cache/revalidation:** the only new cache is the process-local TTL for `component_category_nodes` (T-P2-03) — not a Next.js cache layer. React `cache()` request-dedup is unchanged. No `use cache`/`cacheLife`/`cacheTag`/`revalidateTag` change.
- **Streaming/Suspense:** unchanged.
- **Local Next.js docs:** consulted conceptually (route/server-action behavior); no framework-sensitive claim depends on a version detail in this plan. If P2's route change reveals version-sensitive behavior, the impl agent must read `node_modules/next/dist/docs/` before editing (per AGENTS.md).

## TypeScript / validation

- All new code typed. `scripts/lib/d1-query-budget.ts` exports typed interfaces (`QUERY_SURFACE_SPEC`, `BUDGET_RESULT`).
- No `any`, no unsafe casts in new code.
- `d1-access.ts` batched function returns `Promise<Set<string>>` — typed.

## Tailwind v4 / design system

- **Not applicable.** No UI change. No token, class, or layout change. (`05`.)

## Cloudflare D1

- Boundary: `ARCH_DB` only (`wrangler.jsonc`). No other D1, no other provider project.
- Migrations: additive `CREATE INDEX` only (`0037`, `0038`); reversible via `DROP INDEX`.
- App authorization: `getCurrentWorkspaceProject` gate unchanged. `T-P2-01` batched check is semantically identical (denial-parity mandated).
- Query plans: hosted `EXPLAIN QUERY PLAN` is the authoritative gate (T-P4-03); local sqlite3 is proxy.
- Read/write cost: P1 indexes add minor write-path index maintenance on low-frequency writes (favorites, responses) — negligible.
- Generated types: no binding change → no `cf:typegen` needed.

## Cloudflare Workers / OpenNext

- Worker `archestimator-proof`. The `/__cloudflare/d1-performance-proof` route is extended (P4), remains `CRON_SECRET`-gated.
- Subrequest budget: Cloudflare free tier 50/invocation (paid 1000). Every HP budget in `09` is ≤18. T-P4-02 confirms live count.
- Compatibility date/flags: unchanged.
- No paid features (PERF-008).

## R2 / Durable Objects / Queues / Email

- **Not applicable** to this plan (scope boundary; owned by sibling packs). Re-stated to satisfy the directive gate.

## Better Auth

- Session handling unchanged. The 3-read auth floor is budgeted (`09`) but not changed. DEC-AUTH-01 (cookie cache) is a deferred owner decision, not implemented here.

## TanStack Query / Zustand

- **Not applicable.** No client state change.

## Performance / reliability / observability standards

- Budgets defined in `09`; evaluator in `09`; CI gate local, release gate hosted (`13`).
- No new runtime observability (observability pack owns that); proof artifacts are the evidence trail.
- Regression thresholds defined per-HP in `13`.

## Security standards

- `T-P2-01` preserves authorization semantics (denial-parity test mandatory — `08`, `12`).
- Proof route PII redaction (`TEST-SEC-02`) and auth (`TEST-SEC-03`).
- No new credentials, no secret exposure.

## Design-system / a11y standards

- Not applicable (no UI change). `05`.

## Conventions reused

- Migration naming `NNNN_slug.sql` (matches `0007`…`0036`).
- Proof script naming `scripts/generate-cloudflare-d1-{repo}-proof.ts` (matches existing family).
- package.json script naming `cf:d1-{repo}-proof` (matches existing).
- `localOnly:true` / `production<Domain>D1Ready` flag convention in proof outputs (matches existing).
