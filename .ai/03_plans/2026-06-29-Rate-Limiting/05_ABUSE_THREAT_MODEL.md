---
title: Abuse Threat Model
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Abuse Threat Model

## Threat Classes

| Threat | Examples | Primary impact | Required controls |
| --- | --- | --- | --- |
| Brute force | Shared-link passwords, invite tokens, auth login | Unauthorized access, account/user friction | Low windows, delayed retries, Turnstile escalation, event audit. |
| Enumeration | Invite resolution, share token existence, auth callback, public routes | Discovery of valid tokens/accounts | Uniform errors, rate limits by token/IP, no existence leaks. |
| Cost exhaustion | Uploads, images, AI, XLSX export, email resend/digest | Provider spend, CPU/DB pressure | Durable quotas, concurrency controls, circuit breakers, queue budgets. |
| UX denial | Client proposal review, comments, decisions, unsubscribe | Legitimate client blocked in high-trust flow | Reviewer-friendly recovery, allow owner override, narrow keys. |
| Spam/reputation damage | Email invites/resends/digests/contact | Resend/domain reputation | Per-owner/project limits, recipient cooldowns, circuit breaker, webhook idempotency. |
| Telemetry flood | Client error intake, activity events | Log volume/noise, incident masking | Body size, same-origin, per-IP limiter, sampling. |
| Replay/duplication | Webhooks, internal cron, upload scans, queue retries | Duplicate side effects | Signatures/secrets, idempotency keys, replay windows; rate limits are secondary. |
| Distributed flood | Edge/API floods across instances/regions | Origin overload before app limiter | WAF coarse rules, Workers soft limits, origin shielding, dashboards. |

## Surface-Specific Scenarios

| Surface | Abuse story | Current resilience | Residual risk |
| --- | --- | --- | --- |
| Public share root/snapshot | Bot repeatedly loads a proposal token to create DB/event pressure. | 60/min Postgres-backed token+IP limiter. | WAF edge overshoot possible; policy not centralized. |
| Shared-link password | Attacker brute-forces a shared password. | Durable failure records and local lockout/delay. | Mixed local/durable state and header inconsistency. |
| Shared comments/decisions | Bad actor spams comments or repeatedly submits decisions. | Recipient/publication durable write limits. | False positives hurt real reviewers; needs owner intervention path. |
| Shared activity/events | Script posts noisy activity or polls activity feed. | Same-origin checks and durable 60/min limiter. | Event volume may still be high across many IPs. |
| Invite resolution/accept | Token probing and repeated accept attempts. | Durable token/IP/user limits. | Sign-out route lacks limiter; errors must remain non-enumerating. |
| Auth login/magic/OAuth | Credential stuffing or magic-link spam. | Provider/auth checks; no unified app limiter found in scan. | Must not lock out legitimate beta users behind shared IPs. |
| Contact/support | Form spam if converted from mailto to server intake. | Mailto only today. | Future server endpoint must include Turnstile, limiter, abuse mailbox policy. |
| Uploads/images | Parallel uploads, transform storms, oversized requests. | Local admission maps; some durable direct-upload session capacity. | Process-local maps are insufficient under scaled deployment. |
| XLSX export | User or stolen session repeatedly exports heavy workbooks. | Durable 12/min, 120/hour per user+IP. | Need p95 and failure telemetry to tune. |
| AI ask/package-builder | Token spend and read-context fanout. | AI ask quota 10/min, 60/hour. | Package-builder route chain needs explicit classification; quotas should include model/provider costs. |
| Email resend/digest | Owner or attacker triggers repeated emails. | Invite resend and digest controls; process-local email circuit. | Account-wide provider protection not centralized. |
| Resend webhook | Forged webhook or replay. | Signature/config/body-size validation. | Needs idempotency/replay proof more than generic rate limit. |
| Internal cron/jobs | Repeated cleanup/scan invocations. | Secret/config checks. | Needs replay and idempotency tracking; Cloudflare cron/queue proof remains local. |
| Realtime collaboration | Room spam, connect floods, message storms. | Durable Object scaffold exists in Cloudflare proof config. | Production room quotas and observability not proven. |

## Abuse Priority

P0: shared-link password/session/comment/decision, invite resolve/accept, auth login/magic links, upload admission, AI ask, XLSX export.

P1: shared activity/events, invite create/resend, email digest/resend, client-error intake, package-builder, contact future endpoint.

P2: health/static routes, low-cost authenticated reads, webhook generic rate limits after signature/idempotency, internal jobs after secret/replay controls.

## False Positive Sensitivity

Highest sensitivity belongs to proposal reviewers, invite recipients, beta login, unsubscribe, and owner publishing/exporting during a client meeting. These surfaces should prefer narrow keys, clear `Retry-After`, support contact path, shadow-mode tuning, and owner-visible diagnostics over aggressive broad-IP blocking.
