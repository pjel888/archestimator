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

## Credential Material Taxonomy

| Material | Raw/hash/encrypted/public marker | Creation/read points | Client visible? | Logging/storage rule | Rotation/revocation/destruction proof |
| --- | --- | --- | --- | --- | --- |
| Client IP | Raw request header, stored only as HMAC hash | Request headers and proxy/Cloudflare edge | No | Never persist raw; store HMAC client hash and optional coarse country/ASN. | Pepper rotation test; no raw IP in event/log fixtures. |
| Public share token | Raw URL token, stored/used as token hash | Share routes and publication helpers | Yes, in URL | Never log raw; hash/HMAC resource key before limiter storage. | Token rotation/revoke tests; old token uniformly denied. |
| Recipient/session token | Raw cookie/body/token, stored as hash where needed | Share session/comment/decision/unsubscribe | Sometimes | Do not emit raw token; resource/recipient hashes only. | Session revoke and cleanup proof. |
| Invite token | Raw URL token, HMAC/keyed limiter parts | Invite page/routes/actions | Yes, in URL | No raw logs; limiter uses token/client/user dimensions without existence leak. | Invite revoke/expiry tests. |
| Email address | Raw user input/provider value, HMAC normalized for limiter | Auth/contact/invite/email actions | User-provided | Store email hash for limiter; avoid dashboard raw email dimensions. | Lowercase/normalization and deletion support proof. |
| Turnstile token | Raw short-lived verification token | Browser widget to server-side validation | Submitted by client | Never store token; record validation outcome, policy ID, and challenge reason only. | Single-use/300-second expiry and replay tests. |
| OAuth/session cookies | HttpOnly/provider session material | Auth provider, cookies, server actions | Cookie only | Do not place in limiter keys or logs; read session server-side. | Sign-out/session invalidation tests. |
| Webhook signature/secret | Raw header/secret env | Resend webhook and internal jobs | No | Never log raw; store event ID hash/idempotency status. | Replay and secret-rotation proof. |
| Provider/API keys | Secret env/provider config | AI, email, Cloudflare, Supabase | No | Never include in limiter events or errors. | Secret scan, provider stub tests, rollback proof. |
| Operator overrides | Config/audit rows | Admin/operator workflow | No | Store policy, scope hash, reason, owner, expiry; no raw PII. | Expiry job and audit readback proof. |
| Idempotency keys | Client-generated or server-issued opaque key plus server-side fingerprint | Expensive/destructive route/action retry flows | Sometimes as opaque client header/form value | Store key hash, normalized fingerprint hash, state, expiry, and safe result pointer only; no raw payload or secrets. | TTL cleanup, mismatch audit, and replay-window deletion proof. |
| Draft RateLimit metadata | Derived response headers/body fields | Route response helper | Yes, only where approved | Suppress or redact on sensitive auth/token/public flows; never reveal raw quota keys. | Response-profile tests verify metadata disclosure posture. |

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
| Idempotency key/result rows | key hash, fingerprint hash, state, safe result pointer | Retain for the operation replay window, then delete unless scoped security audit exception applies. |
| Low-and-slow anomaly aggregates | coarse hashed/cohort summaries | Retain only aggregate signal long enough for incident review; avoid reconstructing raw identities. |
| Cloudflare logs/traces | provider logs with sampled fields | Align retention/sampling with provider plan, privacy policy, and no-secret redaction proof. |

## Access Control

The existing `security_rate_limit_events` table revokes public/anon/authenticated access and grants service_role only in `supabase/migrations/20260601003000_security_rate_limit_events.sql:16-19`. Future tables/RPCs should preserve this pattern and avoid exposing limiter internals to client-side code.

## Compliance Risks

- Broad IP blocking can harm shared-office users and client reviewers.
- Raw telemetry can accidentally collect personal data.
- Aggressive auth/contact controls can interfere with deletion/support requests.
- Cloudflare logs may add provider-side retention and sampling considerations.
- Hashed identifiers can still be personal data when linkable to user/account behavior; deletion/anonymization posture must be explicit.
- Draft quota metadata can disclose whether an account, token, or recipient exists if exposed on sensitive routes.

## Required Security Review Before Enforcement

- Verify no raw IP/token/email is persisted.
- Verify secrets are not logged in error paths.
- Verify RLS/grants/RPC privileges on limiter storage.
- Verify failure modes do not leak token/account existence.
- Verify false-positive recovery for support, deletion, unsubscribe, and proposal review.
- Verify response metadata does not disclose sensitive quota, account, token, or recipient state.
- Verify retention/deletion/anonymization for expired limiter events, idempotency keys, offline queues, and provider logs.
