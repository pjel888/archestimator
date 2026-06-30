---
title: Security Privacy And Data Retention
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Security, Privacy, And Data Retention

## Data Minimization

Rate limiting should store the minimum data required to enforce windows and investigate abuse. Persist hashed identifiers, policy IDs, coarse metadata, and expiry timestamps. Do not persist raw IP addresses, raw public tokens, auth secrets, Turnstile tokens, webhook signatures, email contents, or provider keys.

## Key Handling

| Data | Required handling |
| --- | --- |
| Client IP | HMAC with dedicated rate-limit pepper before storage. |
| Public token | HMAC/hash with purpose-specific secret; never log raw token. |
| Email | Lowercase/normalize and HMAC before limiter storage. |
| User/workspace/project IDs | Hash for logs where user-facing operations do not require direct ID. |
| Country/region | Coarse metadata only; avoid sole basis for blocking without owner approval. |

## Current Privacy Observations

- Invite limiter uses HMAC for IP via `createHmac` and a limiter/token/service-role fallback pepper in `src/lib/collaboration/invite-entry.ts:126-140`.
- Publication limiter hashes keys with SHA-256 over scope/parts in `src/lib/publication/public-repository.ts:366-370`; future work should evaluate HMAC for all client/token-derived keys.
- Client error telemetry hashes user-agent only and rate-limits by raw local key in memory at `src/app/api/internal/client-error/route.ts:38-57`, `:80-83`.

## Retention Classes

| Class | Example | Retention recommendation |
| --- | --- | --- |
| Window events | `security_rate_limit_events` rows | Expire by `expires_at`; cleanup jobs delete expired rows. |
| Security audit summaries | Abuse incident aggregates | Keep coarse hashed summaries for incident review. |
| Operational metrics | Denial counts, store latency | Retain according to observability provider defaults and privacy policy. |
| Turnstile validation | token outcome only | Do not store token; keep challenge outcome and policy ID. |
| Webhook idempotency | event ID hash and processed status | Retain per provider replay window plus audit need. |

## Access Control

The existing `security_rate_limit_events` table revokes public/anon/authenticated access and grants service_role only in `supabase/migrations/20260601003000_security_rate_limit_events.sql:16-19`. Future tables/RPCs should preserve this pattern and avoid exposing limiter internals to client-side code.

## Compliance Risks

- Broad IP blocking can harm shared-office users and client reviewers.
- Raw telemetry can accidentally collect personal data.
- Aggressive auth/contact controls can interfere with deletion/support requests.
- Cloudflare logs may add provider-side retention and sampling considerations.

## Required Security Review Before Enforcement

- Verify no raw IP/token/email is persisted.
- Verify secrets are not logged in error paths.
- Verify RLS/grants/RPC privileges on limiter storage.
- Verify failure modes do not leak token/account existence.
- Verify false-positive recovery for support, deletion, unsubscribe, and proposal review.
