# Stack Contract And Production Standards

Consolidates the cross-cutting stack decisions for this pack. Active baseline: Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4 + OpenNext/Cloudflare Workers + D1 + R2 + Durable Objects + Queues/Cron + Cloudflare Email + Better Auth + TanStack Query + Zustand + repository boundaries.

## Next.js (App Router, Next 16)

- **Source of truth for bundle claims:** `.next/diagnostics/route-bundle-stats.json` produced by `next build` (Turbopack). Array of `{ route, firstLoadChunkPaths }`.
- **Deep-dive:** `@next/bundle-analyzer` via `ANALYZE=true bun run build` (`next.config.ts:292`).
- **Cache/Cache Components:** off (sibling plan `OPEN-ARCH-01` owns adoption). This pack treats cache behavior as an input to hosted TTFB, not something it changes.
- **`experimental.staleTimes`:** `dynamic: 60`, `static: 180` (`next.config.ts`). Relevant to warm-revisit route-transition scenarios; unchanged by this pack.
- **RSC requests:** counted via `_rsc=` URL matching in both Playwright harnesses; prefetch (hover) RSC evidence separated from click RSC evidence.

## React 19

- React Compiler **off** (sibling plan). Manual memoization is current posture. Bundle budgets measure the result; they do not assume Compiler tree-shaking.
- `"use client"` boundaries unchanged by this pack.

## TypeScript

- `bun run type-check` (`tsc --noEmit`) is the compile-time gate. Known-red: default Node heap (use `--max-old-space-size` per sibling plan known-red ledger).
- Budget file reconciliation (P2-T1) must pass type-check.

## Tailwind v4 / design-system

- Unchanged by this pack. `lint:design-system` + `lint:design` continue to run in `validate`.

## Cloudflare Workers / OpenNext

- Build: `bun run cf:build` (OpenNext). Deploy: `cf:deploy`. Preview: `cf:preview`.
- **Hosted proof:** `cf:verify-hosted-performance` (credential-free TTFB p95). Targets bound Worker `archestimator-proof` / custom domain `archestimator.com` only. Never the historical Supabase project, the unrelated `archestimator` provider project, or other accounts.
- **Resource boundary:** D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES` — none mutated by this pack.
- **Cost posture:** free-tier/bundled; no paid observability add-on. Hosted p95 uses outbound HTTPS only.

## D1 / R2 / DO / Queue / Email

- Not in scope for this pack (no data work). Authenticated Tier-B fixture uses an existing seeded fixture and existing dev-auth paths.

## Better Auth

- Unchanged. The authenticated perf fixture uses dev-auth bypass (localhost only) or a storage-state artifact from a real sign-in; never production credentials.

## TanStack Query / Zustand

- Unchanged. Route-transition harness observes RSC requests and overlay/skeleton behavior; it does not inspect query/client-state internals.

## Performance budgets (consolidated)

- See `09_*.md` §3 for full tables. Headline: bundle = per-route (Phase-0-derived, 15% headroom) + global backstop ≥ 350 KB; route-transition Tier-A loose (CI), Tier-B tight (on-demand); hosted per-probe TTFB p95 (values unchanged).

## Security posture

- Hosted verifier credential-free, fake-token, non-mutating (`BODY_NOTE`). Dev-auth bypass localhost-only. Sanitization of all perf outputs. No new secrets/dependencies. SEC-01 locks the posture.

## Observability

- This pack consumes build-time + on-demand signals only. Production CWV (LCP/INP/CLS) via Cloudflare Web Analytics Tier-1 is the sibling RUM plan's (`OPEN-PERF-01`) responsibility; Workers Observability is the sibling observability plan's responsibility.

## Verification commands (canonical for this pack)

| Purpose | Command |
|---|---|
| Full local gate | `bun run validate` |
| Build (produces diagnostics) | `bun run build` |
| Bundle gate (advisory) | `bun run scripts/check-performance-budgets.mjs` |
| Bundle gate (strict) | `bun run scripts/check-performance-budgets.mjs --strict` |
| Bundle analyzer | `ANALYZE=true bun run build` |
| Route-transition CI smoke | `bun run test:e2e:perf` |
| Route-transition deep | `bun run perf:measure-routes` then `bun run perf:check-routes` |
| Peak-load profile | `bun run perf:profile-peak-load` |
| Seed fixture | `bun run perf:seed-fixture` |
| Hosted p95 | `CLOUDFLARE_HOSTED_PERFORMANCE_BASE_URL=… bun run cf:verify-hosted-performance` |
