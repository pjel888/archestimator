# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting Next.js / React / Cloudflare / data / security /
performance / design-system decisions for this plan.

## 18.1 Stack baseline (verified from repo)

- Next.js 16 (App Router, `proxy.ts` edge gate, Server Components + Server Actions).
- React 19. Bun. TypeScript. Tailwind v4 (`@theme inline` token bridge).
- OpenNext on Cloudflare Workers (`archestimator-proof`, `compatibility_date 2026-06-29`,
  `nodejs_compat`).
- Cloudflare D1 (`ARCH_DB`), R2 (`ARCH_UPLOADS_R2`), DO (`COLLAB_ROOMS` → +
  `GLOBAL_PRESENCE`, `SUPPORT_INBOX`), Queue (`UPLOAD_JOBS_QUEUE`), Images
  (`IMAGES`), Email (`EMAIL`).
- Better Auth 1.6.22 (Google OAuth + magic link) against D1.
- TanStack Query (client server-state), Zustand (client UI state), repository boundaries.
- Phosphor icons (`@phosphor-icons/react/dist/ssr`). Inline copy (no i18n).

## 18.2 Next.js / React decisions

- Admin routes: `force-dynamic`, Server Component fetch (repository) inside
  `<Suspense>` streaming into client islands — matches `workshop/projects/page.tsx`.
- `"use client"` minimal: presence hook, inbox thread/composer, flags toggle,
  charts wrappers (dynamic-imported).
- Server Components never call internal Route Handlers for their own data —
  they call repositories directly.
- URL search params own pagination/filter (shareable, back/forward).
- TanStack Query owns client polling/invalidation; Zustand owns UI-only state
  (sidebar collapse); no server-data mirror in Zustand.
- No effects for render derivation; effects only for sync (WS) with cleanup.

## 18.3 Cloudflare decisions

- **D1:** system of record for admin tables; parameterized queries; `QueryResult<T>`;
  migrations ordered/idempotent/reversible; `bun run cf:typegen` after binding changes.
- **DO:** SQLite-backed, Hibernation API; Ed25519 token auth (existing pattern);
  per-conversation (support) + global (presence). DO migrations tagged.
- **Queue:** read depth only (no new queue).
- **Email:** outbound via `EMAIL` (replies); P2 inbound via Email Routing + Email Worker.
- **Analytics Engine (optional):** presence trend data point ≤ 1/min (free 100K/day).
- **ratelimit (free, GA):** admin login + write throttles.
- **Workers Logs:** existing `observability` config; admin errors via `emitLogRecord`.
- **KV:** NOT used as source of truth (AGENTS rule).
- **Free-tier posture:** no Logpush / Workers Paid / R2 paid / Smart Placement paid.

## 18.4 Data / auth decisions

- `profiles.role` is the only role source; `isPlatformAdminEmail` allowlist is additive.
- Better Auth identity tables read-only; admin reads via repositories.
- All writes audited (`admin_audit_events`).
- DSAR: support data covered (extend `privacy_requests`).

## 18.5 Security decisions

- Layered auth (app allowlist + role + optional CF Access).
- Secrets via `wrangler secret put` only; `NEXT_PUBLIC_*` only for public IDs.
- Server Components render PII; `server-only` markers; minimal DTOs.
- Rate-limit admin endpoints; denial tests mandatory.

## 18.6 Performance decisions

- Budgets (09): TTFB ≤ 600 ms p95, admin JS ≤ 250 KB gzip, presence ≤ 5 s.
- Evaluator: local Playwright + build analyzer.
- Charts dynamic-imported (recharts) to isolate bundle cost.
- Cache-first metrics (stale-while-revalidate); degrade on failure.

## 18.7 Design-system decisions

- Reuse tokens (`--background`, `--surface`, `--hairline`, `--brand-*`, status,
  glass optional). No new tokens for MVP.
- Reuse `ui/*` primitives (`DataTable`, `Card`, `Panel`, `Tabs`, `Badge`,
  `StatusBadge`, `SheetDrawer`, `Switch`, `Avatar`, `toast`, …).
- `lint:design-system` must pass.
- DESIGN.md is alpha — defer visual polish to Philip.

## 18.8 New env vars (implementation)

| Var | Scope | Example |
|---|---|---|
| `PLATFORM_ADMIN_EMAILS` | server | `philipjonlewis@gmail.com` |
| `ADMIN_DASHBOARD_ENABLED` | server | `true` |
| `CF_ANALYTICS_API_TOKEN` | server secret (OPEN-3) | — |
| `GA4_DATA_API_CREDENTIALS_JSON` | server secret (OPEN-1) | — |
| `CLARITY_DATA_API_TOKEN` | server secret (OPEN-2) | — |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | client (existing) | — |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | client (existing) | — |
| `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` | client (existing) | — |
| `REALTIME_IDENTITY_SIGNING_KEY` | server secret (existing) | — |
