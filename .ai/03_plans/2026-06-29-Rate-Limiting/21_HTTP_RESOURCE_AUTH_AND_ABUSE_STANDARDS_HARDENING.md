---
title: HTTP Resource Auth And Abuse Standards Hardening
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# HTTP, Resource, Auth, And Abuse Standards Hardening

This document closes the remaining industry-standards planning gaps found in the external review pass. It does not authorize source edits, provider changes, new dependencies, or production enforcement. It adds contract fields that P0 must complete before implementation starts.

## Source Grounding

| Source | Planning implication |
| --- | --- |
| RFC 6585, section 4, `429 Too Many Requests` | `429` responses should explain the temporary rate-limit condition and may include `Retry-After`; this package keeps `Retry-After` mandatory where retry is allowed. Source: `https://www.rfc-editor.org/rfc/rfc6585.html#section-4`. |
| RFC 9110, `Retry-After` | `Retry-After` can be delay seconds or an HTTP-date, so route helpers and client parsers must support both. Source: `https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after`. |
| RFC 9457, Problem Details for HTTP APIs | Public HTTP APIs can use `application/problem+json` for stable machine-readable errors, but server actions may keep domain-native result shapes. Source: `https://www.rfc-editor.org/rfc/rfc9457.html`. |
| IETF HTTPAPI RateLimit header draft | `RateLimit` and `RateLimit-Policy` are current draft HTTP fields for quota metadata, not a blanket requirement. Expose them only where quota disclosure is safe; suppress them on sensitive auth/token/public flows when metadata could aid enumeration or abuse. Source: `https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/`. |
| OWASP API4:2023 Unrestricted Resource Consumption | Abuse controls must cover CPU, memory, storage, network, provider spend, timeouts, pagination, file sizes, and concurrency, not just request count. Source: `https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/`. |
| OWASP API6:2023 Unrestricted Access to Sensitive Business Flows | Sensitive business flows need anti-automation controls even when every individual request is syntactically valid and authenticated. Source: `https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/`. |
| OWASP Authentication Cheat Sheet and NIST SP 800-63B/63-4 | Failed authentication throttles must balance per-account/subscriber protection, generic responses, account recovery, and provider lockout behavior. Sources: `https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html` and `https://pages.nist.gov/800-63-4/sp800-63b.html`. |

## Mandatory P0 Additions

| Contract | P0 requirement | Why it matters |
| --- | --- | --- |
| HTTP response profile | Each route/action row must choose one response profile: `Retry-After` only, safe draft `RateLimit` metadata, `application/problem+json`, domain-native server-action result, or intentionally minimal body. | Prevents accidental metadata leakage and makes client/server tests concrete. |
| Quota disclosure posture | For every public/auth/token route, explicitly state whether remaining/reset/limit values are safe to expose. | Quota metadata can reveal account/token validity or help tune attacks. |
| Algorithm and window semantics | Each policy must define fixed window, sliding window, token bucket, GCRA, exact reservation, provider soft limit, or no-generic-quota; include burst capacity, reset behavior, and overshoot tolerance. | Tests cannot prove correctness if "window" has no implementation semantics. |
| Resource budget posture | Each relevant route/action must name request-count, body-byte, item-count, result-row/page-size, CPU/duration, concurrency, provider-cost-unit, queue-depth, and circuit-breaker limits or explicitly mark them not applicable. | OWASP API4 resource exhaustion is broader than requests per minute. |
| Auth failed-attempt recovery | Auth/contact rows must define per-email/account/subscriber, per-client, per-IP/NAT, reset, challenge, support/unlock, and provider-coordination behavior. | Avoids account enumeration and duplicate lockout while still resisting credential stuffing and magic-link spam. |
| Cache/CDN profile | Limiter denials on personalized, token, auth, or mutable API surfaces must define `Cache-Control`, `Vary`, CDN bypass/cache-key expectations, and whether any `GET` denial can be shared. | Prevents shared-cache leaks and stale denial behavior. This is defensive architecture, not an RFC 429 mandate. |
| Distributed low-and-slow detection | Operations must define anomaly signals for many accounts/IPs/tokens staying below per-key limits, plus escalation to WAF observe, Turnstile, stricter app policy, or incident mode. | Per-key rate limits miss distributed automation and sensitive business-flow abuse. |
| Retention/deletion handling | Hashed limiter data must have retention class, deletion/anonymization posture, legal/security exception, and pepper-rotation behavior. | Hashing reduces exposure but does not remove retention and deletion obligations. |

## Standards Contract Rows

P0 must expand these rows into route/action-specific answers before source edits.

| ID | Contract | Future implementation answer required | Required proof |
| --- | --- | --- | --- |
| SCE-001 | HTTP response profile | Which status/body/header shape the route/action uses for `429`, `409`, `412`, `422`, and `503`; whether RFC 9457 Problem Details is used; whether server actions keep domain-native results. | Route/action tests assert stable response envelope, safe user copy, `Retry-After` where retryable, and no provider/internal detail leakage. |
| SCE-002 | RateLimit metadata disclosure | Whether draft `RateLimit`/`RateLimit-Policy` metadata is emitted, suppressed, or redacted per surface; why exposure is safe or unsafe. | Sensitive public/auth/token routes do not reveal account/token existence or exact remaining quota unless explicitly approved; non-sensitive internal APIs can expose metadata when useful. |
| SCE-003 | Algorithm, burst, reset, and overshoot semantics | Algorithm type, window size, burst capacity, refill/reset behavior, exactness requirement, and tolerated distributed/provider overshoot. | Boundary tests cover window edges, burst exhaustion, reset/refill, concurrent attempts, and provider-soft overshoot cases. |
| SCE-004 | Resource budget dimensions | Max body bytes, file count, item count, page/result rows, duration/timeout, active concurrency, provider tokens/cost units, queue depth, and circuit breaker thresholds. | Abuse tests deny or shed before expensive work, provider spend, storage write, or large response generation. |
| SCE-005 | Auth failed-attempt and recovery semantics | Key dimensions, generic response, reset condition, unlock/support path, adaptive challenge threshold, provider lockout coordination, and shared-NAT false-positive handling. | Auth tests cover fake/real email parity, repeated failed attempts, successful recovery, provider duplicate-lockout avoidance, and beta-user support path. |
| SCE-006 | Cache/CDN denial profile | `Cache-Control`, `Vary`, CDN bypass/cache key, and no-store policy for personalized/token/auth/mutation denials; explicit rationale for any cacheable denial. | Shared-cache tests or static route review prove 429/403/409/412 bodies and headers cannot leak one actor's state to another. |
| SCE-007 | Distributed abuse escalation | Cardinality and correlation signals across actor/client/resource hashes, ASN/country, token families, email domains, or user-agent cohorts; thresholds for observe, challenge, stricter app policy, and incident response. | Synthetic low-and-slow matrix creates many below-threshold keys and still triggers dashboard/escalation signals without blocking known legitimate cohorts by broad IP alone. |
| SCE-008 | Retention, deletion, and anonymization | Retention class, expiry/delete job, summary aggregation, DSAR/deletion handling for hashed identifiers, legal/security exception, and hash pepper rotation. | Cleanup/deletion proof shows expired limiter rows and private queued/offline data are removed or anonymized without breaking active windows or incident audit requirements. |

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
| Item count/page size/result rows | Search/list/load-more/server action read fanout and proposal/export data pulls. |
| Duration/timeout | XLSX export, AI package builder, image transform, upload scan, large search. |
| Concurrency/active slots | Upload sessions, image transforms, export generation, realtime room connects. |
| Provider cost units | AI tokens/model calls, email sends, image transforms, storage writes. |
| Queue depth/retry budget | Upload cleanup/scan, webhooks, offline comment/event queues, future Cloudflare Queues. |
| Circuit breaker | Email provider, AI provider, storage/image provider, limiter store outage. |

## Non-Goals

- Do not emit draft `RateLimit` headers everywhere by default.
- Do not convert every server-action result into `application/problem+json`; server actions may keep existing domain-native result contracts.
- Do not treat `Cache-Control: no-store` as an RFC 429 requirement; use it as a privacy and shared-cache hardening rule for sensitive surfaces.
- Do not add dependencies, deploy Cloudflare rules, or enable provider products from this planning pass.

## Acceptance Criteria For Future Implementation Planning

- Every P0 route/action/client row includes SCE-001 through SCE-008 where applicable, with explicit `not applicable` rationale where not.
- Every policy row includes an algorithm/window/burst/reset/overshoot answer before tests are written.
- Every high-cost or data-bearing route/action has a resource budget table row before enforcement mode is enabled.
- Auth/contact enforcement cannot start until provider lockout behavior, generic responses, support recovery, and beta-user false-positive recovery are documented.
- Route tests or static contract tests assert response headers, body profile, cache profile, and metadata disclosure posture.
- Operations dashboards include low-and-slow anomaly signals and retention/deletion proof before production enforcement.
