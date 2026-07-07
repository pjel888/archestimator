# 18 — Stack Contract And Production Standards

> Cross-cutting production decisions for this plan. References `AGENTS.md` stack baseline and the patterns audited in `03`; does not duplicate version numbers except where load-bearing.

## Next.js 16 (App Router)
- Route Handlers for intake/lookup (anonymous + token-bearer public surfaces); Server Components for queue/detail; Server Actions for operator mutations.
- `dynamic = "force-dynamic"` + `Cache-Control: no-store` on all privacy surfaces (privacy-sensitive, low-volume).
- Executor must re-read `node_modules/next/dist/docs/` for route-handler/Server-Action/caching behavior before framework-sensitive edits.
- No Server Component calls an internal route handler; it calls the repository directly.

## React 19
- Server Components for queue/detail shells; smallest `"use client"` island for interactive filters/dialogs/transitions.
- Pessimistic mutations (await action; inline pending) — no optimistic UI for state transitions.
- Stable keys for the queue list (request id); no effect-driven derivation.

## Tailwind v4 + design system
- Reuse `src/components/ui/` (table, badge, button, dialog, alert, skeleton, empty-state).
- `DESIGN.md` is alpha-stage; does not override these contracts or owner direction.
- No new design tokens for closed-beta.

## Cloudflare Workers / OpenNext
- Worker = `archestimator-proof`; bindings `ARCH_DB`, `ARCH_UPLOADS_R2`, `EMAIL` from `wrangler.jsonc`.
- Stay within free-tier; no paid add-ons without owner approval (`AGENTS.md`).
- Standing authorization covers D1/R2/Email changes inside bound resources.

## D1 (`ARCH_DB`)
- `privacy_requests` (0033) + `0037` additive cols + `privacy_request_events` + `privacy_request_verification_tokens`.
- Reuse `data_retention_events` (0034) as erasure audit sink.
- HMAC hashing via `AUTH_AUDIT_HASH_PEPPER` (production throws if absent).
- No FKs (consistent with 0033); integrity enforced in the repository.
- Migration additive + reversible; `EXPLAIN QUERY PLAN` on new SELECTs.

## R2 (`ARCH_UPLOADS_R2`)
- New namespace `privacy-exports/<requestId>/<uuid>.json` for export packages.
- Operator-only access via Server Action (no public URL).
- Object lifecycle follows retention.

## Cloudflare Email (`EMAIL`)
- `sendEmail` (`transactional-email-client.ts`) + circuit breaker.
- `ARCHESTIMATOR_EMAIL_PROVIDER` must resolve to `cloudflare-email*`; gated by `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`.
- Deliverability proof at execution.

## Better Auth / sessions
- `getCurrentUserContext` for the authenticated fast path; `isPlatformAdminRole` for the operator gate.
- No new auth primitive; no new role for closed-beta.

## TanStack Query
- Operator queue/detail client-state; invalidate after transition action.

## Zustand
- Not required for this workflow (no cross-component client state beyond TanStack Query).

## TypeScript
- Typed repository/route/action boundaries; row-model types updated for `0037` columns.
- No `any`; discriminated union for status; exhaustive transition handling.

## Security
- Authorization at server boundaries; HMAC-only personal data; raw verification token never persisted.
- Erasure is two-step (dry-run + confirm + re-auth); `legal_hold` flag forward-compatible.

## Performance
- Evaluators `EV-01..10` in `09`; baselines captured at execution; regression threshold 2x (3x for export/erasure).

## Reliability / ops
- Best-effort audit (transition succeeds even if event write fails — opaque log); circuit breaker on email; fix-forward via retention cron for erasure partial failure.

## Verification policy
- Proportional (`AGENTS.md`): focused `vitest` + `type-check` for narrow slices; browser proof only for the two browser-only claims (`05` §11); provider proof at execution for D1/R2/Email.
