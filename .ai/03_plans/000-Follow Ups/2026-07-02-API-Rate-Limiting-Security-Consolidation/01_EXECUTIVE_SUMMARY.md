# Executive Summary

## Readiness

Status: **IMPLEMENTATION-READY** for first-slice execution (PH-0 through PH-3, covering WP-A, WP-I, WP-B) per owner acceptance recorded in `.ai/10_state/decisions.md` 2026-07-05. Production enforcement, provider cutover, and broad WAF/Turnstile/rate-rule enforcement remain `NOT READY` — gated by implementation-time hosted/provider/two-client/runtime proof.

The two source packs overlap heavily and should be treated as one program: API security, app-level authorization, rate limiting, privacy governance, and provider controls must be planned together. Rate limiting alone cannot protect an authorization gap. An API audit alone cannot close abuse risk if enforcement creates privacy or false-positive risk.

## Primary Finding

The active production direction is Cloudflare-only:

- Next.js 16 / React 19 application.
- OpenNext on Cloudflare Workers.
- Cloudflare D1.
- Cloudflare R2.
- Durable Objects.
- Better Auth.
- Cloudflare queues/cron/WAF/observability surfaces as configured.

Historical Supabase/Postgres artifacts still exist, but current planning must not use them as active-runtime authority without fresh proof.

## What The Source Packs Contributed

The Rate Limiting pack contributes:

- Abuse threat modeling.
- Public share limiter inventory.
- Cloudflare-native and app-layer limiter options.
- Better Auth coordination.
- A useful Lean P0A slice around public share limiter consolidation.
- Client friction and false-positive guidance.

The API Audit pack contributes:

- Current Cloudflare runtime framing.
- Broad API route and Server Action surface framing.
- D1 no-RLS authorization concerns.
- WebSocket/Durable Object realtime risk.
- Upload/R2/security-event considerations.
- Independent verification corrections.

## What This Pack Changes

This pack improves the combined plan by:

- Making realtime WebSocket tickets a P0 build requirement.
- Turning D1 authorization into a release-gate proof matrix.
- Treating Server Actions as API endpoints for authz, validation, idempotency, CSRF/origin, and error envelope purposes.
- Resolving store-authority conflicts by naming D1, Durable Objects, Better Auth storage, app event ledgers, provider logs, and historical artifacts separately.
- Adding GDPR-facing data minimization, retention, DSAR/delete/anonymize, provider retention, and breach-response requirements for new ledgers.
- Adding standards-backed idempotency, retry, conditional update, cache, error-envelope, trace-correlation, and async at-least-once delivery gates.
- Connecting OWASP API Top 10 risks directly to work packages and validation gates.
- Keeping WAF, Turnstile, and Cloudflare rate rules observe-first until hosted false-positive proof exists.

## Recommended First Slice

The first implementation slice should be narrow and behavior-preserving:

1. Refresh the current runtime/store ledger from source.
2. Add the WP-I cross-surface request-semantics baseline before broad mutation or queue edits.
3. Consolidate public share/invite limiter documentation and tests against existing D1-backed controls.
4. Normalize Retry-After, no-store, error-envelope, and idempotency behavior where the source already has durable controls.
5. Add missing denial and privacy fixtures before expanding enforcement.

This first slice should not add broad WAF enforcement, provider-wide rate limiting, or realtime quotas.

## Blocking Work Before Wider Enforcement

Wider enforcement is blocked until:

- WebSocket room tickets are implemented and verified before Durable Object forwarding.
- D1 access paths have a complete app-level authorization matrix and denial tests.
- Touched Server Actions have explicit authz/idempotency/CSRF/origin/error-envelope posture.
- Unsafe Route Handler, Server Action, public-token, internal, provider-callback, queue, cron, and Durable Object alarm mutations have request-semantics and idempotency/retry rows.
- Queue and alarm paths have at-least-once duplicate-delivery, poison-message, retry/backoff, DLQ, and idempotent side-effect proof plans.
- Route Handler and Server Action errors have a stable external contract that prevents provider, D1, token, prompt, object-key, and tenant-existence leakage.
- Privacy retention and DSAR handling exist for new or expanded ledgers.
- WAF/Turnstile/Rate Limiting provider decisions are backed by hosted evidence.

## Main Implementation Sequence

1. WP-A: current-runtime authority and store ledger.
2. WP-I: idempotency, retry, conditional update, cache, error, trace, and async at-least-once contract baseline.
3. WP-B: public share and existing limiter consolidation.
4. WP-C: Better Auth boundary hardening.
5. WP-D: D1 app authorization and Server Action API safety.
6. WP-E: realtime WebSocket ticketing and Durable Object abuse controls.
7. WP-F: AI, uploads, internal jobs, queues, email, and observability privacy controls.
8. WP-G: Cloudflare provider controls in observe-first rollout.
9. WP-H: final hosted verification, rollback rehearsal, and release decision.

## Decision

Use this pack as the new canonical plan for API and rate limiting security work. Do not continue implementation from either superseded source folder.
