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
| 8 Standards/resource proof | Response profiles, resource budgets, auth recovery, anomaly, and retention/deletion proofs exist. | No P0 standards gap remains. | response header/body checks, budget denials, cleanup proof. | Return affected policy to shadow. |
| 9 Cloudflare WAF shadow | Zone/account proof exists. | WAF matches expected traffic only. | WAF logs vs origin events. | Disable rule. |
| 10 Turnstile challenge | Server validation and UX proof. | Bot pressure reduced without support spike. | challenge solve rate, support tickets. | Disable challenge; preserve app limiter. |
| 11 Cloudflare exact proof | Hosted Worker/DO proof exists. | Exact counter parity proven. | concurrency test, DO telemetry. | Keep Postgres limiter as source of truth. |

## False Positive Handling

| User group | Recovery |
| --- | --- |
| Proposal reviewer | Clear wait time, owner-visible status, support contact, no confusing account demand. |
| Invite recipient | Retry guidance, owner resend path, no token existence leak. |
| Beta user login | Support link, avoid broad IP lockout, provider logs correlation. |
| Owner exporting/publishing | Retry guidance, optional owner override after abuse review. |
| Upload user | Show active upload/session explanation and cleanup retry timing. |

## Client-Facing Denial Copy

User-facing `429` and cooldown states must be scoped to the affected action and must not reveal account, token, recipient, or provider existence.

| Surface | Required copy elements |
| --- | --- |
| Proposal reviewer | Plain wait time, preserved draft/decision context, owner/support path, no account demand. |
| Invite/auth/contact | Retry time, preserved entered email/form state, recovery/support path, no account/token existence signal. |
| Upload/export/AI | Whether the user is waiting for retry time, active capacity cleanup, or provider-cost protection; keep unrelated work available. |
| Estimate/template editing | Non-blocking inline status for the affected row/resource; preserve optimistic work or make it retryable. |
| Email/publication actions | Recipient/resource cooldown, delivery status, and safe retry guidance without exposing recipient internals. |

## Low-Friction Escalation Ladder

Use visible friction only after lower-impact controls are insufficient for the specific surface.

| Step | Use before |
| --- | --- |
| Shadow/log-only decision and dashboard review | Any user-visible denial or challenge. |
| Narrow key tuning and threshold adjustment | Broad IP or account-level blocking. |
| Client pending/single-flight/cooldown and idempotency | Visible challenge or owner intervention. |
| Progressive delay and clear retry copy | Turnstile or WAF blocking. |
| Owner-visible override with expiry | Global policy disable. |
| Adaptive Turnstile challenge | WAF block or long-lived account friction. |
| Low-and-slow incident review | Broad account/IP/country/ASN blocking. |

## Rollback Switches

Every policy needs:

- Per-policy mode switch owned by the central registry.
- Per-surface threshold override with owner, reason, and expiry.
- Global emergency disable for non-security policies only.
- Cloudflare WAF rule disable path by rule ID and provider readback.
- Turnstile disable path by feature flag and server-validation bypass policy.
- Store adapter fallback path that names the source of truth after rollback.
- Audit trail for every override and rollback, including who changed it and when it expires.
- Runtime reload behavior: define whether config changes apply immediately, after deployment, or after cache expiry.

## Rollback Trigger Examples

| Surface | Trigger | Rollback action | Verification |
| --- | --- | --- | --- |
| Public proposal review | Legitimate reviewers report blocks or denial rate exceeds baseline by 3x for one token/session cohort. | Raise threshold or shadow only for the affected policy/resource; do not globally disable password/token protection. | Reviewer can reload/comment/decide; denial events stop for allowed cohort. |
| Auth/login | Beta-user login failure/support reports spike. | Disable app-side auth limiter; keep provider checks and signatures. | Test magic-link/OAuth happy paths and no account enumeration. |
| Upload/export/AI | Denials block normal owner workflow or provider cost stays low. | Raise thresholds or shadow; preserve concurrency/idempotency guards. | Cost route succeeds after retry, no partial upload/export corruption. |
| Webhook/internal jobs | Duplicate side effects or missed jobs observed. | Disable secondary rate limit; keep signature/replay/idempotency enforcement. | Replay test remains blocked; scheduled job can run once. |
| Cloudflare WAF/Turnstile | Support/accessibility or origin mismatch appears. | Disable or revert to observe-only by provider rule/flag. | Provider readback shows disabled; app limiter still emits decisions. |
| Low-and-slow anomaly | Many below-threshold cohorts trigger anomaly alert but support/reviewer metrics show legitimate traffic. | De-escalate challenge or cohort threshold; keep per-key app policies. | Anomaly alert quiets and legitimate cohort completes workflow. |
| Retention/deletion cleanup | Expired limiter/idempotency data or private queued data exceeds retention target. | Pause affected enforcement mode or retention-sensitive feature until cleanup/anonymization proof passes. | Cleanup proof shows expired/private data removed or audit exception recorded. |

## Owner Approval Gates

Owner review is required before:

- Enforcing new auth/login/contact controls.
- Adding Turnstile to user-facing flows.
- Enabling Cloudflare WAF blocking mode.
- Lowering thresholds on public proposal review.
- Claiming Cloudflare-native production readiness.
