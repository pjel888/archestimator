---
title: HTTP Resource Auth And Abuse Standards Hardening
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# HTTP, Resource, Auth, And Abuse Standards Hardening

This document closes the second-pass HTTP/resource/auth standards planning gaps found in the external review pass. The third-pass provider-identity and advanced-abuse gaps are now carried by `22_PROVIDER_IDENTITY_AND_ADVANCED_ABUSE_GAP_CLOSURE.md` and by the new `SCE-010` through `SCE-017`, `FCE-008`, `FCE-009`, and `CP-008` rows. It does not authorize source edits, provider changes, new dependencies, or production enforcement. It adds contract fields that P0 must complete before implementation starts.

## Source Grounding

| Source | Planning implication |
| --- | --- |
| RFC 6585, section 4, `429 Too Many Requests` | `429` responses should explain the temporary rate-limit condition and may include `Retry-After`; this package keeps `Retry-After` mandatory where retry is allowed. Source: `https://www.rfc-editor.org/rfc/rfc6585.html#section-4`. |
| RFC 9110, `Retry-After` | `Retry-After` can be delay seconds or an HTTP-date, so route helpers and client parsers must support both. Source: `https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after`. |
| RFC 9457, Problem Details for HTTP APIs | Public HTTP APIs can use `application/problem+json` for stable machine-readable errors, but server actions may keep domain-native result shapes. Source: `https://www.rfc-editor.org/rfc/rfc9457.html`. |
| IETF HTTPAPI RateLimit header draft | `RateLimit` and `RateLimit-Policy` are current draft HTTP fields for quota metadata, not a blanket requirement. Where exposed, P0 must define policy parameters such as quota (`q`), window (`w`), quota unit (`qu`), partition key (`pk`), and unit (`u`), plus remaining/reset semantics, client max-wait/jitter behavior, and cache/current-age handling. Expose them only where quota disclosure is safe; suppress them on sensitive auth/token/public flows when metadata could aid enumeration or abuse. Source: `https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/`. |
| OWASP API4:2023 Unrestricted Resource Consumption | Abuse controls must cover CPU, memory, storage, network, provider spend, timeouts, pagination, file sizes, and concurrency, not just request count. Source: `https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/`. |
| OWASP API6:2023 Unrestricted Access to Sensitive Business Flows | Sensitive business flows need anti-automation controls even when every individual request is syntactically valid and authenticated. Source: `https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/`. |
| OWASP Authentication Cheat Sheet, OWASP Forgot Password Cheat Sheet, and NIST SP 800-63B/63-4 | Failed authentication throttles must balance per-account/subscriber protection, generic responses, response-time parity, account recovery, and provider lockout behavior. P0 must also map NIST failed-attempt rules, including the no more than 100 consecutive-attempt upper bound where applicable, no reset on new secret generation, and successful-auth reset/disregard behavior. Sources: `https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html`, `https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html`, and `https://pages.nist.gov/800-63-4/sp800-63b.html`. |
| Cloudflare Turnstile server-side validation | Turnstile is adaptive friction only after server policy asks for it. P0 must validate single-use/expiry plus expected `hostname`, `action`, and `cdata` values, and use `idempotency_key` for Siteverify retry paths. Source: `https://developers.cloudflare.com/turnstile/get-started/server-side-validation/`. |

## Mandatory P0 Additions

| Contract | P0 requirement | Why it matters |
| --- | --- | --- |
| HTTP response profile | Each route/action row must choose one response profile: `Retry-After` only, safe draft `RateLimit` metadata, `application/problem+json`, domain-native server-action result, or intentionally minimal body. | Prevents accidental metadata leakage and makes client/server tests concrete. |
| Quota disclosure posture | For every public/auth/token route, explicitly state whether remaining/reset/limit values are safe to expose. | Quota metadata can reveal account/token validity or help tune attacks. |
| Exact RateLimit syntax and client/cache interpretation | Any approved `RateLimit` or `RateLimit-Policy` surface must define `q`, `w`, `qu`, `pk`, optional unit, remaining/reset semantics, precedence with `Retry-After`, client cap/jitter behavior, and cache/current-age handling. | Prevents draft-header drift, stale cached quota hints, and retry storms caused by unreasonable server hints. |
| Algorithm and window semantics | Each policy must define fixed window, sliding window, token bucket, GCRA, exact reservation, provider soft limit, or no-generic-quota; include burst capacity, reset behavior, and overshoot tolerance. | Tests cannot prove correctness if "window" has no implementation semantics. |
| Resource budget posture | Each relevant route/action must name request-count, body-byte, item-count, result-row/page-size, CPU/duration, concurrency, provider-cost-unit, queue-depth, and circuit-breaker limits or explicitly mark them not applicable. | OWASP API4 resource exhaustion is broader than requests per minute. |
| Runtime and transformed-payload ceilings | Upload/image/export/AI/search/provider rows must define memory, decompressed-byte, media-dimension/megapixel, subrequest/provider-operation, platform-timeout, and billing-alert thresholds or mark them not applicable. | Compression/media transforms and serverless/platform limits can exhaust resources even when request counts and raw body bytes look safe. |
| Auth failed-attempt recovery | Auth/contact rows must define per-email/account/subscriber, per-client, per-IP/NAT, reset, challenge, support/unlock, and provider-coordination behavior. | Avoids account enumeration and duplicate lockout while still resisting credential stuffing and magic-link spam. |
| Auth timing and NIST failed-attempt bounds | Auth/reset/magic-link rows must define timing-parity tests, generic message behavior, consecutive failed-attempt cap, new-secret counter behavior, and successful-auth counter treatment. | Prevents enumeration through discrepancy factors and avoids unbounded or resettable brute-force windows. |
| Adaptive challenge response binding | Turnstile/challenge rows must bind validation to expected surface context, including token expiry/single-use, hostname, action, cdata, retry idempotency, accessibility fallback, and app-limiter fallback. | Prevents replay or cross-surface reuse of valid-looking challenge tokens. |
| Cache/CDN profile | Limiter denials on personalized, token, auth, or mutable API surfaces must define `Cache-Control`, `Vary`, CDN bypass/cache-key expectations, and whether any `GET` denial can be shared. | Prevents shared-cache leaks and stale denial behavior. This is defensive architecture, not an RFC 429 mandate. |
| Distributed low-and-slow detection | Operations must define anomaly signals for many accounts/IPs/tokens staying below per-key limits, plus escalation to WAF observe, Turnstile, stricter app policy, or incident mode. | Per-key rate limits miss distributed automation and sensitive business-flow abuse. |
| Sensitive business-flow sequence detection | Operations must define flow-sequence signals such as invite probe to accept, proposal view to comment/decision, contact/beta feedback bursts, impossible journeys, device/browser metadata shifts, and timing-pattern anomalies. | OWASP API6 attacks often use valid requests below individual per-key limits. |
| Retention/deletion handling | Hashed limiter data must have retention class, deletion/anonymization posture, legal/security exception, and pepper-rotation behavior. | Hashing reduces exposure but does not remove retention and deletion obligations. |

## Standards Contract Rows

P0 must expand these rows into route/action-specific answers before source edits.

| ID | Contract | Future implementation answer required | Required proof |
| --- | --- | --- | --- |
| SCE-001 | HTTP response profile | Which status/body/header shape the route/action uses for `429`, `409`, `412`, `422`, and `503`; whether RFC 9457 Problem Details is used; whether server actions keep domain-native results. | Route/action tests assert stable response envelope, safe user copy, `Retry-After` where retryable, and no provider/internal detail leakage. |
| SCE-002 | RateLimit metadata disclosure and syntax | Whether draft `RateLimit`/`RateLimit-Policy` metadata is emitted, suppressed, or redacted per surface; why exposure is safe or unsafe; exact `q`/`w`/`qu`/`pk`/unit, remaining/reset, `Retry-After` precedence, client cap/jitter, and cache/current-age behavior where emitted. | Sensitive public/auth/token routes do not reveal account/token existence or exact remaining quota unless explicitly approved; non-sensitive internal APIs can expose metadata only with parser/cache tests and client retry bounds. |
| SCE-003 | Algorithm, burst, reset, and overshoot semantics | Algorithm type, window size, burst capacity, refill/reset behavior, exactness requirement, and tolerated distributed/provider overshoot. | Boundary tests cover window edges, burst exhaustion, reset/refill, concurrent attempts, and provider-soft overshoot cases. |
| SCE-004 | Resource budget dimensions | Max body bytes, decompressed bytes, media dimensions/megapixels, file count, item count, page/result rows, memory, duration/timeout, active concurrency, provider operations/tokens/cost units, platform subrequest or binding-operation budgets, queue depth, billing alerts, and circuit breaker thresholds. | Abuse tests deny or shed before expensive CPU, memory, transform, provider spend, platform operation, storage write, or large response generation. |
| SCE-005 | Auth failed-attempt, timing, and recovery semantics | Key dimensions, generic response, response-time parity, NIST-style consecutive failed-attempt cap where applicable, new-secret counter behavior, successful-auth reset/disregard behavior, unlock/support path, adaptive challenge threshold, provider lockout coordination, and shared-NAT false-positive handling. | Auth tests cover fake/real email parity in content and timing, repeated failed attempts, no counter reset from new secret generation, successful recovery, provider duplicate-lockout avoidance, and beta-user support path. |
| SCE-006 | Cache/CDN denial profile | `Cache-Control`, `Vary`, CDN bypass/cache key, and no-store policy for personalized/token/auth/mutation denials; explicit rationale for any cacheable denial. | Shared-cache tests or static route review prove 429/403/409/412 bodies and headers cannot leak one actor's state to another. |
| SCE-007 | Distributed and sequence-aware abuse escalation | Cardinality, flow-sequence, and correlation signals across actor/client/resource hashes, ASN/country, token families, email domains, user-agent cohorts, device/browser metadata, timing patterns, invite/share/contact/publication funnels, and impossible journeys; thresholds for observe, challenge, stricter app policy, and incident response. | Synthetic low-and-slow and valid-request business-flow matrices create many below-threshold keys and still trigger dashboard/escalation signals without blocking known legitimate cohorts by broad IP alone. |
| SCE-008 | Retention, deletion, and anonymization | Retention class, expiry/delete job, summary aggregation, DSAR/deletion handling for hashed identifiers, legal/security exception, and hash pepper rotation. | Cleanup/deletion proof shows expired limiter rows and private queued/offline data are removed or anonymized without breaking active windows or incident audit requirements. |
| SCE-009 | Adaptive challenge validation binding | Challenge provider, widget surface, challenge reason, token lifetime, single-use/replay rule, expected hostname/action/cdata values, Siteverify retry `idempotency_key`, accessibility/support fallback, and app-limiter fallback when the challenge is disabled or fails closed. | Route/provider tests reject expired/reused/cross-surface tokens, validate expected response fields, preserve app limiter authority, and prove a feature-flag rollback leaves non-challenge controls active. |

## Response Profile Guidance

| Surface class | Default profile | Metadata posture |
| --- | --- | --- |
| Sensitive public token routes | Minimal safe body plus `Retry-After` when retryable; `Cache-Control: no-store`. | Suppress exact remaining/reset quota unless owner explicitly approves exposure. |
| Auth and magic-link flows | Generic response shape, `Retry-After` only when it does not aid enumeration, recovery copy through existing auth UI. | Suppress quota and account-existence metadata. |
| Authenticated expensive routes | Stable JSON or domain-native action result with `Retry-After`; consider draft `RateLimit` metadata only after leakage review. | May expose scoped retry timing; remaining quota is optional. |
| Internal/webhook/job routes | Signature/secret/idempotency errors first; rate-limit body can stay minimal. | Do not expose provider details, secret names, or replay windows. |
| Telemetry/client-error intake | Fail soft/drop with minimal response. | Do not expose limiter internals to untrusted clients. |

## Resource Budget Checklist

| Budget dimension | Examples needing a concrete limit or explicit exemption |
| --- | --- |
| Request count | Share session/password/comment/decision, invite accept/continue/resend, auth/magic, export, AI, upload init. |
| Body bytes/content type | Upload/image/contact/beta feedback/client-error/webhook routes. |
| Decompressed bytes and archive/media expansion | Any future compressed, archive, image, or document processing path; current image/upload paths must still state the exemption or explicit ceiling. |
| Image dimensions/megapixels | Component images, estimate row images, project images, thumbnails, previews, Cloudflare Images transforms, and server-side image processing. |
| Item count/page size/result rows | Search/list/load-more/server action read fanout and proposal/export data pulls. |
| Duration/timeout | XLSX export, AI package builder, image transform, upload scan, large search. |
| Memory/platform operation ceilings | Serverless runtime memory, CPU time, subrequests, D1/R2/Queue/Images operations, and other provider binding limits when running on Workers/OpenNext. |
| Concurrency/active slots | Upload sessions, image transforms, export generation, realtime room connects. |
| Provider cost units | AI tokens/model calls, email sends, image transforms, storage writes. |
| Billing alerts/spend caps | AI, email, storage, images, Workers/D1/R2/Queue usage, and any provider with metered overage. |
| Queue depth/retry budget | Upload cleanup/scan, webhooks, offline comment/event queues, future Cloudflare Queues. |
| Circuit breaker | Email provider, AI provider, storage/image provider, limiter store outage. |

## Non-Goals

- Do not emit draft `RateLimit` headers everywhere by default.
- Do not convert every server-action result into `application/problem+json`; server actions may keep existing domain-native result contracts.
- Do not treat `Cache-Control: no-store` as an RFC 429 requirement; use it as a privacy and shared-cache hardening rule for sensitive surfaces.
- Do not add dependencies, deploy Cloudflare rules, or enable provider products from this planning pass.

## Acceptance Criteria For Future Implementation Planning

- Every P0 route/action/client/provider row includes SCE-001 through SCE-009 where applicable, with explicit `not applicable` rationale where not.
- Every policy row includes an algorithm/window/burst/reset/overshoot answer before tests are written.
- Every high-cost or data-bearing route/action has a resource budget table row before enforcement mode is enabled.
- Auth/contact enforcement cannot start until provider lockout behavior, generic responses, timing parity, NIST failed-attempt bounds, support recovery, and beta-user false-positive recovery are documented.
- Any approved `RateLimit` metadata surface must document exact draft field syntax, client max-wait/jitter handling, and cache/current-age behavior before client code trusts it.
- Turnstile enforcement cannot start until Siteverify response binding covers hostname, action, cdata, token replay/expiry, and idempotent retry behavior.
- Route tests or static contract tests assert response headers, body profile, cache profile, and metadata disclosure posture.
- Operations dashboards include low-and-slow, sequence-aware business-flow anomaly signals, provider billing/resource alerts, and retention/deletion proof before production enforcement.

## Third-Pass Gaps Now Carried Forward

| Gap theme | Where this package now carries it |
| --- | --- |
| IPv6 client identity and trusted forwarded headers | `SCE-010`, `RL-FR-026`, `PROOF-RL-016`, and doc `22`. |
| Supabase Auth provider limits and `Sb-Forwarded-For` | `SCE-011`, `RL-FR-027`, `PROOF-RL-017`, `PROOF-RL-021`, and doc `22`. |
| Timing-safe equality and response parity | `SCE-013`, `RL-FR-028`, `RL-NFR-016`, `PROOF-RL-018`, and doc `22`. |
| Cache-fill stampede | `SCE-012`, `RL-FR-029`, `PROOF-RL-019`, and doc `22`. |
| Retry full jitter and `Retry-After` precedence | `FCE-008`, `RL-NFR-017`, `PROOF-RL-020`, and docs `20`/`22`. |
| Deep pagination/count budgets | `SCE-014`, `RL-FR-031`, `PROOF-RL-022`, and doc `22`. |
| CORS `OPTIONS` | `SCE-015`, `RL-FR-032`, `PROOF-RL-023`, and doc `22`. |
| Realtime message/fanout quotas | `SCE-016`, `RL-FR-033`, `PROOF-RL-024`, and doc `22`. |
| Service-worker/offline replay | `FCE-009`, `RL-FR-034`, `PROOF-RL-025`, and docs `20`/`22`. |
| Chunked/multipart/resumable body abuse | `SCE-017`, `RL-FR-035`, `PROOF-RL-026`, and doc `22`. |
| Bot Management escalation | `CP-008`, `RL-FR-036`, `PROOF-RL-027`, and docs `08`/`22`. |

Do not claim official Supabase/Auth numeric values, Cloudflare bot entitlements, or current account-level provider settings from this static plan. P0 must refresh current docs and provider/account readback immediately before implementation.
