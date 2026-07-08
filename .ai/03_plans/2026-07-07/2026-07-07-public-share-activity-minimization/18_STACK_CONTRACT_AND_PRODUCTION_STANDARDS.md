# Stack Contract and Production Standards

Cross-cutting production decisions for this plan. Stack baseline (from `AGENTS.md`): Next.js 16, React 19, Bun, TypeScript, Tailwind v4, OpenNext on Cloudflare Workers, Cloudflare D1, R2, Durable Objects/WebSockets, Queues/Cron, Cloudflare Email, Better Auth, TanStack Query, Zustand, repository boundaries.

## Next.js App Router

- Activity surface = Route Handlers (`src/app/api/share/[token]/*/route.ts`) + one Server Component page (`src/app/share/[token]/page.tsx`).
- `export const dynamic = "force-dynamic"` on activity route (preserve).
- `Cache-Control: no-store` on every share response (API-01). No Cache Components on share routes (token-bearing private data).
- No Server Action changes for the public surface (the owner action `loadSharedLinkActivity` is unchanged).
- No `"use client"` introduced by Phases 1-5.

## React

- No new client components in Phases 1-5.
- `SharePageComments.tsx` WP-1.7 cleanup is a TS-interface change only (no hooks/effects).
- Memoization: unchanged (no render-cost change).

## Tailwind v4 / design system

- No UI/markup change in Phases 1-5 (except the dead-field cleanup, which is type-only).
- `DESIGN.md` is alpha, not law; no design-system gate.

## Cloudflare Workers / OpenNext

- Standard deploy for Phases 1-5 (code-only).
- Free-tier posture: no paid add-ons (Phase 6 Turnstile free tier; WAF free-tier custom-rule limits to confirm).
- Worker Env: no binding change in Phases 1-5; Phase 7 migration-only (no new binding).

## Cloudflare D1

- Binding: `ARCH_DB` (`archestimator-proof-db`, id `9bdb29bb-687e-4f51-ae81-7659c426ea5f`).
- No schema change in Phases 1-5.
- Phase 7 (owner-gated): `shared_link_recipients.session_generation` (new column, default 0).
- App-layer authz (no RLS): preserve. Token hash = only public credential; `recipient_id` from signed cookie, re-checked at every write (SEC-06).
- Retention cron (`30 3 * * *`) delivers Phase 5 rules.
- Daily D1 backups + `cf:d1-restore-rehearsal` for recovery.

## R2 / DO / Queues / Email

- Unaffected by Phases 1-5.
- Phase 6 (owner-gated) may add Turnstile (no R2/DO/Queue/Email change).
- Resend tags (P2-3, SEC-11) deferred.

## Better Auth

- Unchanged. Recipient session is separate from Better Auth session (`shared-link-session-v1` cookie).

## TanStack Query / Zustand

- Unchanged. No client state change in Phases 1-5.

## TypeScript / validation

- `PublicActivityViewModel` `Pick<>` allow-list (tightened Phase 1).
- Repository row types narrowed (SEC-01/02).
- No `any`, no unsafe casts introduced.
- Runtime validation at trust boundaries: cursor AES-GCM authenticated; recipient text sanitized; event metadata allow-listed.

## Security / privacy

- Threat model `08_…md`; credential taxonomy `21_…md`.
- Tokens HMAC-hashed before lookup; never stored raw.
- IP/UA HMAC-hashed with pepper.
- `no-store` everywhere; `Referrer-Policy: no-referrer`; `X-Frame-Options: DENY` on `/share/*`.
- Redactor (`redact.ts`) on all share-route logging (Phase 4).

## Performance

- PERF-01 evaluator (Phase 0 baseline + benchmark).
- No denormalization justified at current volume.

## Reliability / operations

- `13_…md` runbooks.
- 5xx → uniform error; rate limits; circuit breaker on comment POST.

## Testing

- `12_…md` matrix. Vitest + fake D1 for route-handler tests. Provider readback for over-fetch proof.

## Design-system lint

- `bun run lint:design-system` only if UI touched (WP-1.7).

## Cost posture

- Free-tier first. No paid add-ons without owner approval (Phase 6 confirms Turnstile free tier; WAF free-tier limits).
