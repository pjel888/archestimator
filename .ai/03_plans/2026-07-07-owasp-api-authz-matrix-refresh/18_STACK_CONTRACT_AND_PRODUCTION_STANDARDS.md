# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting stack decisions for this authz refresh. The stack is
**Next.js 16 + React 19 + Bun + TypeScript + Tailwind v4 + OpenNext on Cloudflare
Workers + D1 + R2 + Durable Objects + Queues/Cron + Cloudflare Email + Better Auth +
TanStack Query + Zustand**, with repository boundaries. Supabase/Postgres/Vercel/Resend
are historical.

## Next.js 16 (App Router)
- Route Handlers under `src/app/api/**`; Server Actions as `"use server"` modules;
  Server Components for data loading; `"use client"` scoped to interactive components.
- Next 16 `proxy.ts` convention (NOT `middleware.ts`) — verified absent.
- `force-dynamic` + `Cache-Control: no-store` on all auth/share/privacy routes.
- No Cache Components / `use cache` on auth surfaces.
- Better Auth mounted at `/api/auth/[...all]` via `toNextJsHandler(auth.handler)`.
- `cookies()`/`headers()` read server-side only; no secret leakage to client bundles.

## React 19
- Server Components default; effects only for synchronization with cleanup.
- TanStack Query for client server-state (estimates, library, publications) with
  pessimistic invalidate-on-success on mutations.
- Zustand for cross-component client ephemeral state (estimate editor).
- Optimistic UI where safe; conflicts surfaced via `expectedRowRevision`.

## Better Auth (the sole authN)
- magicLink + Google OAuth plugins only. **No email/password, organization, admin,
  twoFactor, bearer, or apiKey plugins.**
- D1 as the database adapter (`ARCH_DB`); `session.cookieCache.enabled: false`
  (every check hits D1 — good for security).
- `trustedOrigins` from `BETTER_AUTH_TRUSTED_ORIGINS`.
- Verification tokens hashed in `verification.value` (single-use).
- Better Auth tables (`user`/`session`/`account`/`verification`) created via generated
  DDL + idempotent inline DDL in `better-auth-proof-router.ts`.

## Cloudflare D1 (the sole relational store)
- App-authorization is the gate (`src/lib/authz/d1-access.ts`) — **no RLS** (Postgres
  RLS is historical).
- Membership probes fail-closed; platform-admin bypass centralized.
- `workspaceId` always session-derived.
- Durable rate limiter via `security_rate_limit_events` (append-only scope union).
- Free-tier posture; daily backups + restore rehearsal.

## Cloudflare R2 (object storage)
- Reads server-mediated + app-authorized; **no presigned URLs** issued.
- Key design `{workspaceId}/{userId}/...` enforces tenant+actor partition.
- DELETE re-validates ownership prefix.
- `signedReadUrlFactory` unused (must not bypass authz if wired — SEC-09).

## Cloudflare Durable Object (`COLLAB_ROOMS`)
- `CollaborationRoom` class; per-message authz (`authorizeSocket` + `isSocketAuthorized`).
- Token issued by `issueRealtimeRoomToken` bound to authenticated `sub` + project/estimate access.
- Upgrade accepts socket before auth — SEC-04 (rate-limit/token-gate remediation).

## Cloudflare Queues / Cron (`UPLOAD_JOBS_QUEUE`)
- Cron-driven upload scan/cleanup/lifecycle jobs; `Bearer CRON_SECRET`/job-secret gated.
- Idempotent consumer (`idempotencyKey`); DLQ configured.

## Cloudflare Email (`EMAIL`)
- Magic-link delivery via `send_email` binding; outbound only.
- (Legacy Resend webhook directory exists but has no route file — confirmed absent.)

## Cloudflare WAF / rate limiting
- **No binding today** (SEC-02) — owner decision to enable free-tier rules.

## TypeScript / validation
- Typed boundaries throughout; no broad `any` on auth surfaces.
- **No zod** — hand-rolled validation (`readRequiredText`, `isUuid`, regex, magic-byte).
  SEC-06 / REQ-VALID-01 records the centralization decision as owner-gated.

## CSP / transport security (`next.config.ts`)
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- HSTS preload; `Referrer-Policy: no-referrer` on share/invite/workshop; `nosniff`.
- CSP enforced only on `/share`; Report-Only elsewhere; `unsafe-inline`/`unsafe-eval`
  retained (SEC-07 nonce pipeline deferred).

## Secrets
- Server-only: `BETTER_AUTH_SECRET`, `DEEPSEEK_API_KEY`, publication secrets, invite
  pepper, realtime secret, job secrets.
- `NEXT_PUBLIC_*` are all non-secret config/IDs.
- No secrets in `.ai/` or committed (AGENTS.md).

## Performance / reliability standards (auth-relevant)
- Session cookie-cache disabled (security over speed).
- Per-request React `cache` memoization on user context + publication access rows.
- Fail-closed on every authz probe and missing-env path.
- Rate-limit GC via `expires_at`.

## Production deployment
- Worker `archestimator-proof`, custom domain `archestimator.com`.
- GitHub Actions temporarily disabled (`.github/workflows-disabled/`) — release-gate gap.
