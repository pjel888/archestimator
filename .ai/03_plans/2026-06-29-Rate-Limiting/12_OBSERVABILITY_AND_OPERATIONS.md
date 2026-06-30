---
title: Observability And Operations
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Observability And Operations

## Event Schema

Every limiter decision should emit a structured event in shadow and enforce modes.

| Field | Requirement |
| --- | --- |
| `timestamp` | ISO timestamp. |
| `policy_id` | Stable policy ID. |
| `surface` | Product surface such as `share_password`, `upload_admission`, `ai_ask`. |
| `mode` | `off`, `shadow`, `enforce`, `challenge`. |
| `decision` | `allow`, `near_limit`, `deny`, `challenge`, `store_error`, `bypass`. |
| `retry_after_seconds` | Present on deny. |
| `actor_hash` | HMAC user/workspace/recipient where applicable. |
| `client_hash` | HMAC client identity; never raw IP. |
| `resource_hash` | HMAC token/project/publication/estimate where useful. |
| `window_seconds` | Evaluated window. |
| `limit` | Evaluated limit. |
| `count` | Count or approximate count when safe. |
| `algorithm` | Fixed window, sliding window, token bucket/GCRA, reservation, provider soft limit, or no-generic-quota. |
| `response_profile` | Minimal, JSON, problem-details, server-action-domain, or provider-soft profile. |
| `quota_metadata_exposed` | Boolean or enum showing whether draft RateLimit metadata was emitted, suppressed, or redacted. |
| `resource_budget_dimension` | `request`, `body_bytes`, `items`, `duration`, `concurrency`, `provider_cost`, `queue_depth`, `circuit_breaker`, or not applicable. |
| `reset_at` | Optional safe reset timestamp when disclosure is allowed; omit on sensitive/token/auth flows if it leaks information. |
| `store` | `postgres_events`, `postgres_rpc`, `memory`, `waf`, `workers_rl`, `durable_object`, `d1`. |
| `runtime` | `vercel_node`, `opennext_worker`, `local`, as known. |
| `request_id` | Existing request/correlation ID if available. |
| `identity_source` | Trusted source used for client identity, such as Cloudflare, forwarded chain, Supabase-forwarded, direct, or unknown. |
| `client_prefix_hash_version` | Version marker for IPv6 prefix/HMAC canonicalization. |
| `ipv6_prefix_mask` | Coarse mask length only where safe and needed for debugging; never raw full IP. |
| `provider_auth_limit_source` | Provider-doc/account-config version used for Supabase/Auth coordination. |
| `sb_forwarded_for_mode` | `disabled`, `enabled-readback`, `not-applicable`, or `unknown`; never raw forwarded IP. |
| `cache_fill_outcome` | `leader`, `waiter`, `stale`, `shed`, `timeout`, `error`, or `not_applicable`. |
| `retry_algorithm` | `retry_after`, `full_jitter`, `manual_only`, or `not_applicable`. |
| `page_count_budget` | Safe budget label for page/count decisions, not raw query text. |
| `preflight_outcome` | `allowed`, `denied`, `not_configured`, or `not_applicable`. |
| `realtime_budget_dimension` | `token_issue`, `connect`, `message`, `presence`, `cursor`, `fanout`, or `not_applicable`. |
| `stream_body_budget` | `content_length`, `chunked`, `multipart_parts`, `transformed_bytes`, `session_ttl`, or `not_applicable`. |
| `bot_signal_bucket` | Coarse bot-signal bucket only after provider proof; never a raw fingerprint. |

## Dashboards

| Dashboard | Signals |
| --- | --- |
| Public share protection | Denials/challenges by policy, token/resource hash, client hash, retryAfter, false-positive reports. |
| Invite/auth abuse | Resolve/accept/login/magic-link pressure, provider errors, beta-user blocked count. |
| Cost protection | Upload/AI/export denials, near-limit rate, provider spend proxy metrics. |
| Store health | Limiter store latency/errors, fail-closed counts, cleanup lag. |
| Cloudflare edge | WAF rule matches, Turnstile validation outcomes, Workers logs/traces, origin 429 comparison. |
| False positives | Owner/client support reports, manual overrides, retry success after wait. |
| Low-and-slow abuse | Many actor/client/resource hashes below single-key thresholds, ASN/country/user-agent/email-domain cohorts, token-family probing, challenge escalation rate. |
| Retention/deletion | Expired event deletion, idempotency-key TTL cleanup, pepper-rotation window, anonymization/deletion queue status, Cloudflare log retention status. |
| Provider identity gaps | Identity source mix, IPv6 prefix-hash version adoption, `Sb-Forwarded-For` mode, and header-source anomalies. |
| Advanced abuse budgets | Cache-fill shed/waiter rates, deep pagination/count denials, preflight flood, realtime message/fanout denials, multipart/chunked aborts, full-jitter retry exhaustion, and bot-signal false positives. |

## Alerts

| Alert | Trigger hypothesis | Action |
| --- | --- | --- |
| Store outage fail-closed | Any sustained limiter store error on security/cost surfaces. | Page owner, disable non-critical policies only if safe. |
| Public share denial spike | Denials exceed baseline by 5x for one token/client cohort. | Inspect token exposure and client false-positive reports. |
| Auth/login pressure | Magic-link/login denials spike. | Check provider logs and WAF/Turnstile escalation. |
| Upload capacity saturation | Workspace active denials persist >10 minutes. | Inspect stuck sessions and cleanup. |
| AI/export cost pressure | Near-limit/deny events increase with provider errors. | Lower thresholds or disable feature temporarily. |
| Low-and-slow anomaly | Cohort cardinality or cross-resource attempts exceed baseline without one key crossing a hard threshold. | Move affected surfaces to observe/challenge review; avoid country/ASN-only blocking; inspect false-positive cohorts. |
| Retention cleanup failure | Expired limiter/idempotency rows, private queued work, or provider logs exceed retention target. | Pause new retention-sensitive enforcement, run cleanup/anonymization job, and record audit exception if needed. |
| Identity-source anomaly | Sudden shift in trusted header source, IPv6 prefix-hash version, or `Sb-Forwarded-For` mode. | Move affected policies to shadow or fallback identity version until deployment/provider path is verified. |
| Cache-fill stampede | Cache-fill waiters/sheds/timeouts spike on one expensive key family. | Serve stale, increase coalescing, shed earlier, or shadow the affected limiter until provider/store pressure clears. |
| Bot false-positive spike | Bot-signal challenge/deny cohort overlaps with proposal reviewers or beta users. | Revert bot rule to observe-only, keep app limiter active, and review support cases before re-escalation. |

## Operations Runbooks

1. Identify policy ID and affected surface.
2. Check whether denials are abusive, legitimate false positives, or store failures.
3. If false-positive: move policy to shadow or raise threshold for affected surface, not globally.
4. If abuse: enable edge rule/Turnstile if already proofed; otherwise tighten app policy with owner approval.
5. If store failure: follow fail-mode table; keep security/cost surfaces fail-closed unless owner decides otherwise.
6. If low-and-slow anomaly: correlate hashed actor/resource/client cohorts, support cases, and Cloudflare signals; escalate to observe/challenge or incident mode only with false-positive review.
7. Record the incident and update the policy matrix after the event.

## Retention

- Raw IPs: do not persist.
- Hashed limiter keys: retain only as long as needed for windows, audits, and abuse investigation.
- Security events: current table TTL is per-event `expires_at`; future retention should delete expired rows and summarize long-term aggregates.
- Cloudflare logs: align sampling and retention with provider plan and privacy policy.
- Idempotency key rows: delete expired keys/results after the replay window unless a security incident requires a scoped audit exception.
- Offline/client queues: purge private queued data on sign-out, workspace switch, token invalidation, server denial, age limit, byte limit, or queue-count limit.
- User deletion/anonymization: document whether hashed actor/email identifiers are deleted, irreversibly anonymized, or retained only in coarse security aggregates under a legal/security exception.

## Cardinality And Rotation Controls

| Control | Requirement |
| --- | --- |
| Event schema version | Include `schema_version` so dashboards and backfills can distinguish field changes. |
| Hash version | Include `hash_version` or pepper generation marker; do not expose pepper names or values. |
| Cardinality caps | Aggregate dashboard dimensions by policy/surface/mode/store/runtime first; inspect actor/resource/client hashes only in scoped incident review. |
| Sampling | Sample allows and near-limits by policy; never sample denied security events below the threshold required for incident review. |
| Pepper rotation | Support dual-read/dual-write or window-bounded transition so rotation does not merge users or erase active lockouts unexpectedly. |
| Redaction proof | Tests must assert raw IP, email, token, webhook signature, Turnstile token, cookie, and provider key values are absent from logs/events. |
