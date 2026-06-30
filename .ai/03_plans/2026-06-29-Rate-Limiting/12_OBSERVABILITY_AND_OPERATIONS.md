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
| `store` | `postgres_events`, `postgres_rpc`, `memory`, `waf`, `workers_rl`, `durable_object`, `d1`. |
| `runtime` | `vercel_node`, `opennext_worker`, `local`, as known. |
| `request_id` | Existing request/correlation ID if available. |

## Dashboards

| Dashboard | Signals |
| --- | --- |
| Public share protection | Denials/challenges by policy, token/resource hash, client hash, retryAfter, false-positive reports. |
| Invite/auth abuse | Resolve/accept/login/magic-link pressure, provider errors, beta-user blocked count. |
| Cost protection | Upload/AI/export denials, near-limit rate, provider spend proxy metrics. |
| Store health | Limiter store latency/errors, fail-closed counts, cleanup lag. |
| Cloudflare edge | WAF rule matches, Turnstile validation outcomes, Workers logs/traces, origin 429 comparison. |
| False positives | Owner/client support reports, manual overrides, retry success after wait. |

## Alerts

| Alert | Trigger hypothesis | Action |
| --- | --- | --- |
| Store outage fail-closed | Any sustained limiter store error on security/cost surfaces. | Page owner, disable non-critical policies only if safe. |
| Public share denial spike | Denials exceed baseline by 5x for one token/client cohort. | Inspect token exposure and client false-positive reports. |
| Auth/login pressure | Magic-link/login denials spike. | Check provider logs and WAF/Turnstile escalation. |
| Upload capacity saturation | Workspace active denials persist >10 minutes. | Inspect stuck sessions and cleanup. |
| AI/export cost pressure | Near-limit/deny events increase with provider errors. | Lower thresholds or disable feature temporarily. |

## Operations Runbooks

1. Identify policy ID and affected surface.
2. Check whether denials are abusive, legitimate false positives, or store failures.
3. If false-positive: move policy to shadow or raise threshold for affected surface, not globally.
4. If abuse: enable edge rule/Turnstile if already proofed; otherwise tighten app policy with owner approval.
5. If store failure: follow fail-mode table; keep security/cost surfaces fail-closed unless owner decides otherwise.
6. Record the incident and update the policy matrix after the event.

## Retention

- Raw IPs: do not persist.
- Hashed limiter keys: retain only as long as needed for windows, audits, and abuse investigation.
- Security events: current table TTL is per-event `expires_at`; future retention should delete expired rows and summarize long-term aggregates.
- Cloudflare logs: align sampling and retention with provider plan and privacy policy.

## Cardinality And Rotation Controls

| Control | Requirement |
| --- | --- |
| Event schema version | Include `schema_version` so dashboards and backfills can distinguish field changes. |
| Hash version | Include `hash_version` or pepper generation marker; do not expose pepper names or values. |
| Cardinality caps | Aggregate dashboard dimensions by policy/surface/mode/store/runtime first; inspect actor/resource/client hashes only in scoped incident review. |
| Sampling | Sample allows and near-limits by policy; never sample denied security events below the threshold required for incident review. |
| Pepper rotation | Support dual-read/dual-write or window-bounded transition so rotation does not merge users or erase active lockouts unexpectedly. |
| Redaction proof | Tests must assert raw IP, email, token, webhook signature, Turnstile token, cookie, and provider key values are absent from logs/events. |
