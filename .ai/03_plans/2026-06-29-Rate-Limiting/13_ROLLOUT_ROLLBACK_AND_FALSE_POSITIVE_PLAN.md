---
title: Rollout Rollback And False Positive Plan
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Rollout, Rollback, And False Positive Plan

## Staged Rollout

| Stage | Entry | Exit | Metrics | Rollback |
| --- | --- | --- | --- | --- |
| 0 Inventory | Current package accepted. | Route/action inventory refreshed. | Inventory count, missing paths. | Stop; no code changes. |
| 1 Test lock | Current behavior tests exist. | Existing behavior proven. | Test pass, current thresholds captured. | Remove tests only if wrong. |
| 2 Registry shadow | Registry reads policies without enforcing changes. | Shadow events match current helper decisions. | Decision parity, no user impact. | Disable shadow emission. |
| 3 Identity normalization shadow | New identity helper computes parallel keys. | Key mismatch understood and documented. | Old/new key diff rate. | Keep old keys. |
| 4 Shared-link enforce | Public share policies migrated one at a time. | No false-positive spike. | 429 rate, reviewer reports. | Per-policy old helper fallback. |
| 5 Invite/auth/contact | Public entry policies staged. | No beta-user lockout. | login/invite success, support reports. | Disable app limiter; keep provider checks. |
| 6 Cost surfaces | Upload/AI/export policies staged. | Provider spend and latency controlled. | p95, cost, denials. | Raise thresholds or shadow. |
| 7 Operations | Dashboards and alerts live. | Operator runbook drill passes. | alert latency, event completeness. | Fall back to logs only. |
| 8 Cloudflare WAF shadow | Zone/account proof exists. | WAF matches expected traffic only. | WAF logs vs origin events. | Disable rule. |
| 9 Turnstile challenge | Server validation and UX proof. | Bot pressure reduced without support spike. | challenge solve rate, support tickets. | Disable challenge; preserve app limiter. |
| 10 Cloudflare exact proof | Hosted Worker/DO proof exists. | Exact counter parity proven. | concurrency test, DO telemetry. | Keep Postgres limiter as source of truth. |

## False Positive Handling

| User group | Recovery |
| --- | --- |
| Proposal reviewer | Clear wait time, owner-visible status, support contact, no confusing account demand. |
| Invite recipient | Retry guidance, owner resend path, no token existence leak. |
| Beta user login | Support link, avoid broad IP lockout, provider logs correlation. |
| Owner exporting/publishing | Retry guidance, optional owner override after abuse review. |
| Upload user | Show active upload/session explanation and cleanup retry timing. |

## Rollback Switches

Every policy needs:

- Per-policy mode switch.
- Per-surface threshold override.
- Global emergency disable for non-security policies.
- Cloudflare WAF rule disable path.
- Turnstile disable path.
- Store adapter fallback path.

## Owner Approval Gates

Owner review is required before:

- Enforcing new auth/login/contact controls.
- Adding Turnstile to user-facing flows.
- Enabling Cloudflare WAF blocking mode.
- Lowering thresholds on public proposal review.
- Claiming Cloudflare-native production readiness.
