# Stack Contract and Production Standards

Consolidates the Next.js, React, Tailwind, Cloudflare, D1, R2, Durable Objects, Queues/Cron, Cloudflare Email, Better Auth, TypeScript, performance, security, and design-system production decisions that cut across this plan. Versions are pinned inline where relevant; numbers referenced, not duplicated, from source.

## Next.js 16 (App Router)
- Route Handlers for `/invite/[token]/{accept,continue,sign-out}` — `params` is a `Promise` (async dynamic params, already in use). `runtime = nodejs`, `force-dynamic` for the proof harness; invite routes render as Server Components.
- No Cache Components / `use cache` interaction — invite routes are `no-store`.
- `next/headers` `cookies().set` for cookie clear (existing pattern).
- No streaming/Suspense change on the invite page.
- Local docs consulted: `node_modules/next/dist/docs/` for route handler + cookie semantics.

## React 19
- Server Components for the invite page; no new `"use client"` beyond the revoke button + dialog (existing client island in the publisher panel).
- No effects for render derivation; memoization only where justified (none new).
- Stable keys for the members-panel list (existing pattern).

## Tailwind v4 + design system
- Reuse `src/components/ui/` Button + AlertDialog for the revoke control. No new design tokens (DESIGN.md is alpha-stage; defer to owner).
- Design-lint: `bun run lint:design-system` clean on changed files.

## Cloudflare Workers / OpenNext
- Worker `archestimator-proof`, custom domain `archestimator.com`. Bindings: `ARCH_DB` (D1), `EMAIL` (send_email), plus DO/Queue/Images bindings not touched by this work.
- **No new bindings, queues, or crons** (ARCH-02). `cf:typegen` not required.
- Free-tier posture: no paid add-ons.

## Data (D1 — `ARCH_DB`)
- Active store for invitations, tokens, audit events, memberships, rate-limit events, profiles.
- One additive migration `0038` (`revoked_reason`); fully reversible.
- App-level authorization (`assertProjectAccessManager`, wrong-account check) — no RLS (D1 has none).
- D1 batch for revoke atomicity.
- Better Auth tables (`user`/`session`/`account`/`verification`) are Better-Auth-generated, not in `./migrations/`.

## Cloudflare Email (`EMAIL` binding)
- Synchronous invite send via `sendCloudflareInviteEmail` → `transactional-email-client.ts` (circuit breaker) → `cloudflare-email-client.ts`.
- No bounce webhook (OPEN-REL-01). No recipient-domain allowlist.
- Provider: `ARCHESTIMATOR_EMAIL_PROVIDER=cloudflare-email`.

## Better Auth 1.6.22
- `basePath:"/api/auth"`, `baseURL` via `resolveBaseURL`, `secret:BETTER_AUTH_SECRET` (≥32 chars), `session.cookieCache.enabled:false` (DB-backed), `trustedOrigins` via `resolveTrustedOrigins`.
- Library-default CSRF on `/api/auth`; library-default cookie attributes (`__Secure-` in prod, HttpOnly, SameSite=Lax, Secure).
- Magic-link + Google plugins.
- Identity joined to app `profiles` by email at runtime (synthetic fallback).
- Not rewritten by this plan.

## TanStack Query
- Used for the members-panel revoke mutation (existing pattern). Query invalidation via `revalidatePath` after revoke.

## Zustand
- Not touched by this plan.

## TypeScript
- Typed route/action/repository boundaries. No `any` in new code. Domain types prevent impossible states (e.g., `lifecycle_state` union).
- Runtime validation at trust boundaries (existing `normalizeEmail`, shape regex, D1 CHECK constraints).

## Security
- Token model: raw bearer in URL → peppered-SHA-256 hash for lookup → never stored raw (SEC-03/06 non-regression). Full taxonomy in `20`.
- Origin/CSRF: deny-on-missing in prod for accept/sign-out/continue (SEC-01/02). No CSRF token on invites (the same-host origin check is the control).
- Rate limits: D1-backed; fail-closed on disabled flag (SEC-05).
- Audit events: `collaboration_audit_events`; new `collaboration_invite_revoked`.
- Redaction: `redact.ts` strips tokens from logs.

## Performance
- No hot-path DB-write regression (PERF-01). Revoke is manager-only. Bundle delta <1 KB (PERF-02).
- Evaluator: existing invite test suite + hosted proof harness (query-count assertions).

## Reliability/ops
- Per-phase rollback (REL-01). P1 kill switch. 24h 403 monitoring.
- Audit events for forensics. No new dashboards (free-tier).

## Verification policy (AGENTS.md)
- Proportional: origin changes → unit + curl; revoke UI → DOM/a11y + targeted keyboard; non-regression → existing suite; release → broad `validate`/build only at P6.
- Browser proof opt-in: invoked for the revoke keyboard path + FR-03 manual e2e; not for server-only origin logic.
