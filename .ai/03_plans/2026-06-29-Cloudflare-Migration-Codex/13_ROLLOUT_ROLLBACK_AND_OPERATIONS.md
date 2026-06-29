---
title: Rollout Rollback And Operations
plan_id: 2026-06-29-cloudflare-migration-codex
document: 13
---

# Rollout Rollback And Operations

## Rollout Policy

Roll out one provider slice at a time. Never couple DNS, runtime, database, auth, storage, and email changes in one cutover.

Recommended order:

1. Front-door Cloudflare.
2. R2 pilot.
3. Queues pilot.
4. Worker sidecars.
5. Next-on-Workers preview.
6. Better Auth proof.
7. D1 proof or rejection.
8. Production cutover slices.

## Rollback Requirements

Every slice needs:

- Named owner.
- Expected blast radius.
- Rollback trigger.
- Rollback path.
- Data reconciliation path.
- Observability dashboard/log query.
- Customer impact note.

## Front-Door Rollback

Rollback method:

- Bypass Cloudflare proxy or return DNS to previous origin path.
- Keep low TTL during initial rollout.
- Keep origin route rules unchanged.

Rollback triggers:

- OAuth failures.
- Protected-route caching.
- Upload failures.
- Webhook failures.
- High false-positive WAF rate.
- Latency or error-rate regression.

## R2 Rollback

Rollback method:

- Keep Supabase Storage as canonical until R2 proof passes.
- Dual-write or copy-forward only after reconciliation design exists.
- Retain source objects until read parity and delete behavior are proven.

Rollback triggers:

- Unauthorized public exposure.
- Signed URL failure.
- Image route failure.
- Scan/cleanup mismatch.
- Object count/byte mismatch.

## Queues Rollback

Rollback method:

- Keep existing cron route fallback.
- Disable producer or route messages to no-op consumer when safe.
- Drain or archive queue according to message semantics.

Rollback triggers:

- Duplicate mutation.
- Unbounded retry loop.
- Poison messages without operator visibility.
- Backlog growth beyond threshold.

## Auth Rollback

Rollback method:

- Do not cut over until session migration strategy exists.
- Preserve Supabase Auth as fallback during proof.
- Avoid dual-authority ambiguity for protected routes.

Rollback triggers:

- Unauthorized access.
- Session loss.
- OAuth/magic-link callback failure.
- Invite or terms gate regression.

## Database Rollback

Rollback method:

- Avoid core D1 cutover until data migration has dry-run and restore proof.
- Use read-only replica/copy for proof.
- Keep source Postgres canonical until reconciliation passes.

Rollback triggers:

- Data mismatch.
- Transaction/authorization mismatch.
- Performance regression.
- Backup/restore failure.

## Email Rollback

Rollback method:

- Keep Resend as baseline during Cloudflare Email Service proof.
- Route a small internal/test segment first.
- Keep webhook/event handling for both providers only if idempotent.

Rollback triggers:

- Delivery failure.
- Bounce/event loss.
- Webhook signature failure.
- Circuit breaker behavior regression.

