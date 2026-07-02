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
| IPv6 prefix | Parse and mask before HMAC; store only hash/version/coarse mask metadata where needed. |
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
| Better Auth limiter key | Provider/library-derived key from path, client identity, email/user, and storage mode | Better Auth route/runtime | No | Do not log raw key material; record authority, storage mode, path family, and hashed actor/client/resource dimensions only. | Better Auth/app divergence tests and storage readback proof. |
| Auth migration identity map | Supabase user ID, Better Auth user ID, normalized email hash, provider state | Migration/auth coordination layer | No | Prefer hashed mapping in limiter telemetry; protect raw provider IDs according to auth data policy. | Dual-provider quota proof and deletion/anonymization review. |
| Better Auth `X-Retry-After` | Provider response header | Auth client/server wrapper | Sometimes, as cooldown text | Treat as retry timing only; do not expose provider internals or account existence. | Client recovery and fake/real account tests. |
| Webhook signature/secret | Raw header/secret env | Provider webhook/callback if present and internal jobs | No | Never log raw; store event ID hash/idempotency status. | Replay and secret-rotation proof. |
| Provider/API keys | Secret env/provider config | AI, email, Cloudflare, Supabase | No | Never include in limiter events or errors. | Secret scan, provider stub tests, rollback proof. |
| Operator overrides | Config/audit rows | Admin/operator workflow | No | Store policy, scope hash, reason, owner, expiry; no raw PII. | Expiry job and audit readback proof. |
| Idempotency keys | Client-generated or server-issued opaque key plus server-side fingerprint | Expensive/destructive route/action retry flows | Sometimes as opaque client header/form value | Store key hash, normalized fingerprint hash, state, expiry, and safe result pointer only; no raw payload or secrets. | TTL cleanup, mismatch audit, and replay-window deletion proof. |
| Draft RateLimit metadata | Derived response headers/body fields | Route response helper | Yes, only where approved | Suppress or redact on sensitive auth/token/public flows; never reveal raw quota keys. | Response-profile tests verify metadata disclosure posture. |
| IPv6 prefix identity | Derived client network prefix after parsing/masking | Central identity helper | No | Never persist raw full IPv6 or raw prefix; store HMAC plus identity schema version and coarse mask length only if needed. | IPv6 canonicalization and pepper-rotation proof. |
| `Sb-Forwarded-For` value | Raw forwarded client IP header for Supabase Auth server calls | Server-only Supabase client when explicitly enabled | No | Do not log or persist; use only through documented `sb_secret_*` server-key path when approved. | Provider readback and no-raw-forwarded-header log proof. |
| Bot score or signal | Provider-derived risk signal | Cloudflare edge/provider logs and app event summaries | No | Store only coarse bucket/signal outcome and policy ID after provider proof; never treat as proof of human identity. | Observe-only provider proof, false-positive review, rollback readback. |
| WAF Ray ID / Security Event ID | Provider correlation identifier | Cloudflare WAF/Security Events for hosted proof | Sometimes visible in Cloudflare error page | Store only for incident correlation; do not use as a limiter key or expose in normal user copy. | Ray-ID lookup and deletion/retention review. |
| Queue message ID / DLQ event | Provider/job identifier | Cloudflare Queues producer/consumer/DLQ | No | Store hashed job/message/resource identifiers and retry/DLQ status; no payload secrets. | Queue replay/DLQ proof and retention cleanup. |
| Cron overlap lock | Job/schedule/run identity | Cloudflare Cron and legacy schedule coordination | No | Store schedule/run hash, idempotency key, and overlap decision only. | Overlap proof and stale lock cleanup. |
| Cloudflare Images transform key | Source image URL/path and transform parameters | Images transform/Worker route | Maybe source path visible to user | Normalize and hash sensitive source/resource identifiers; record coarse parameter family and unique-variant budget, not raw private URLs. | Transform budget and cache-key redaction proof. |
| Service-worker/offline queued work | Client-side persisted mutation intent if introduced | Browser storage | Sometimes | Bound by max count/age/bytes; purge on sign-out, workspace switch, token invalidation, or server denial; avoid raw tokens/secrets. | Queue purge and stale-auth replay proof, or static no-SW proof. |
| Cache-fill keys | Derived expensive read/provider-fill key | Server cache/coalescing layer | No | Hash or keep process-local only; never include raw token/email/IP/provider key in coalescing metrics. | Cache-fill telemetry redaction proof. |

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
| App-side denial events | security/cost denial ledger | Retain only as long as needed for tuning, support, and abuse investigation; preserve deletion/anonymization posture for hashes. |
| WAF/Security Events correlation | Ray IDs, rule IDs, action, sampled request metadata | Retain in incident scope only; do not treat as complete denial ledger. |
| Queue/DLQ/Cron events | job/message IDs, retry count, DLQ status, overlap decisions | Retain through replay/debug window and incident review; purge stale payload references. |

## Access Control

The existing `security_rate_limit_events` table revokes public/anon/authenticated access and grants service_role only in `supabase/migrations/20260601003000_security_rate_limit_events.sql:16-19`. Future tables/RPCs should preserve this pattern and avoid exposing limiter internals to client-side code.

## Compliance Risks

- Broad IP blocking can harm shared-office users and client reviewers.
- Raw telemetry can accidentally collect personal data.
- Aggressive auth/contact controls can interfere with deletion/support requests.
- Cloudflare logs may add provider-side retention and sampling considerations.
- Hashed identifiers can still be personal data when linkable to user/account behavior; deletion/anonymization posture must be explicit.
- IPv6 prefix hashes and bot-signal buckets can still be linkable to client behavior; treat them as privacy-sensitive telemetry with retention and access controls.
- `Sb-Forwarded-For` can move client identity into Supabase Auth provider processing; enable only after provider/account readback and privacy review.
- Draft quota metadata can disclose whether an account, token, or recipient exists if exposed on sensitive routes.
- Better Auth limiter keys and migration identity maps can link a human across auth providers; hash/minimize and document the unification/deletion path.
- WAF Ray IDs and Security Events can include request metadata; use scoped incident access and do not use them as ordinary dashboard dimensions.
- Cloudflare Images transform keys and cache keys can reveal private source/resource paths if logged raw.

## Required Security Review Before Enforcement

- Verify no raw IP/token/email is persisted.
- Verify secrets are not logged in error paths.
- Verify RLS/grants/RPC privileges on limiter storage.
- Verify failure modes do not leak token/account existence.
- Verify false-positive recovery for support, deletion, unsubscribe, and proposal review.
- Verify response metadata does not disclose sensitive quota, account, token, or recipient state.
- Verify retention/deletion/anonymization for expired limiter events, idempotency keys, offline queues, and provider logs.
- Verify IPv6 prefix masking happens before HMAC and raw full IP values are absent from logs/events.
- Verify `Sb-Forwarded-For` is absent or server-only according to the approved provider-auth contract.
- Verify bot-score/signal storage uses coarse buckets, observe-first proof, and false-positive rollback.
- Verify Better Auth/app limiter events do not expose raw provider keys, raw emails, raw IPs, or raw migration mappings.
- Verify WAF Ray-ID/Security Events, queue/DLQ IDs, cron locks, cache keys, and image transform identifiers are redacted or hashed according to this taxonomy.
- Verify app-side denial events meet completeness targets without expanding raw PII collection.
