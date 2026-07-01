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
| 5 Invite/auth/contact | Public entry policies staged only after Better Auth authority/storage/IP behavior is documented. | No beta-user lockout or stacked Better Auth/app cooldown. | login/invite success, support reports, Better Auth/app denial divergence. | Disable app limiter for that auth path; keep provider checks. |
| 6 Cost surfaces | Upload/AI/export policies staged. | Provider spend and latency controlled. | p95, cost, denials. | Raise thresholds or shadow. |
| 7 Operations | Dashboards and alerts live with app-side denial events as primary ledger. | Operator runbook drill passes. | alert latency, app denial completeness, sampled Worker log correlation. | Shadow affected policy; do not fall back to sampled Worker logs as complete evidence. |
| 8 Standards/resource proof | Response profiles, resource budgets, auth recovery, anomaly, and retention/deletion proofs exist. | No P0 standards gap remains. | response header/body checks, budget denials, cleanup proof. | Return affected policy to shadow. |
| 9 Cloudflare WAF shadow | Zone/account proof exists, including hosted Server Action sweeps and Security Events/Ray-ID correlation. | WAF matches expected traffic only and does not silently block legitimate Server Actions. | WAF logs vs origin events, Server Action 403/HTML/hang checks. | Disable or narrow rule by ID after CVE-regression review. |
| 10 Turnstile challenge | Server validation and UX proof. | Bot pressure reduced without support spike. | challenge solve rate, support tickets. | Disable challenge; preserve app limiter. |
| 11 Cloudflare exact proof | Hosted Worker/DO proof exists. | Exact counter parity proven, and `CollaborationRoom` room quotas are kept separate from generic counters. | concurrency test, DO telemetry, room quota proof. | Keep existing app limiter as source of truth; disable room quota path separately from room transport. |
| 12 Fourth-pass runtime drift closure | `SCE-018` through `SCE-020`, `CP-009`, and `PROOF-RL-028` through `PROOF-RL-030` are filled. | Better Auth, WAF/Server Action, migration identity, app-denial observability, queue/cron/cache/images contracts are no longer ambiguous. | dual-lockout proof, hosted WAF proof, event completeness, queue/cron/image/cache budget evidence. | Stop implementation; return to P0/P15 planning rows. |

## False Positive Handling

| User group | Recovery |
| --- | --- |
| Proposal reviewer | Clear wait time, owner-visible status, support contact, no confusing account demand. |
| Invite recipient | Retry guidance, owner resend path, no token existence leak. |
| Beta user login | Support link, avoid broad IP lockout, provider logs correlation. |
| Better Auth user | One cooldown source, safe `X-Retry-After` handling, provider recovery path, and no cross-provider identity confusion. |
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
- Hosted Server Action failure path by Ray ID/Security Events lookup, with WAF causality and narrow skip/disable allowed only after provider evidence plus CVE-regression review.
- Turnstile disable path by feature flag and server-validation bypass policy.
- Store adapter fallback path that names the source of truth after rollback.
- Better Auth/app authority fallback by auth path, including app limiter disable and provider limiter retention where appropriate.
- Queue producer pause and DLQ routing path; cron trigger disable/overlap lock path; image/cache rule disable path where those provider features are involved.
- Audit trail for every override and rollback, including who changed it and when it expires.
- Runtime reload behavior: define whether config changes apply immediately, after deployment, or after cache expiry.

## Rollback Trigger Examples

| Surface | Trigger | Rollback action | Verification |
| --- | --- | --- | --- |
| Public proposal review | Legitimate reviewers report blocks or denial rate exceeds baseline by 3x for one token/session cohort. | Raise threshold or shadow only for the affected policy/resource; do not globally disable password/token protection. | Reviewer can reload/comment/decide; denial events stop for allowed cohort. |
| Auth/login | Beta-user login failure/support reports spike. | Disable app-side auth limiter; keep provider checks and signatures. | Test magic-link/OAuth happy paths and no account enumeration. |
| Better Auth/app limiter divergence | Better Auth 429s and app 429s stack or report conflicting cooldowns. | Make the selected `SCE-018` authority explicit; move the other limiter to disabled/shadow for that path. | Re-test `/sign-in/email`, session/get-session, OAuth callback, fake/real account, and recovery flows. |
| Upload/export/AI | Denials block normal owner workflow or provider cost stays low. | Raise thresholds or shadow; preserve concurrency/idempotency guards. | Cost route succeeds after retry, no partial upload/export corruption. |
| Webhook/internal jobs | Duplicate side effects or missed jobs observed. | Disable secondary rate limit; keep signature/replay/idempotency enforcement. | Replay test remains blocked; scheduled job can run once. |
| Cloudflare WAF/Turnstile | Support/accessibility or origin mismatch appears. | Disable or revert to observe-only by provider rule/flag. | Provider readback shows disabled; app limiter still emits decisions. |
| Hosted Server Action edge/runtime failure | Server Action returns Cloudflare HTML/403, hangs, or has no Worker execution for legitimate payloads. | Classify app/runtime/edge/unknown first; use Ray ID/Security Events to identify any managed rule before adding a narrow skip or disable by rule ID after CVE-regression review. | Hosted Server Action sweep passes, or failure has provider evidence and a narrow rollback. |
| Low-and-slow anomaly | Many below-threshold cohorts trigger anomaly alert but support/reviewer metrics show legitimate traffic. | De-escalate challenge or cohort threshold; keep per-key app policies. | Anomaly alert quiets and legitimate cohort completes workflow. |
| Retention/deletion cleanup | Expired limiter/idempotency data or private queued data exceeds retention target. | Pause affected enforcement mode or retention-sensitive feature until cleanup/anonymization proof passes. | Cleanup proof shows expired/private data removed or audit exception recorded. |
| Identity canonicalization | IPv6 prefix aggregation, trusted header order, or `Sb-Forwarded-For` change causes denial spike or attribution mismatch. | Revert to previous identity-key version or shadow the new key while preserving old behavior; disable `Sb-Forwarded-For` if provider readback fails. | Old/new key comparison stabilizes; raw client values remain absent from logs. |
| Cache-fill/stampede control | Coalescing creates stuck waiters, stale data harm, or provider pressure. | Reduce max waiters, serve stale, shed earlier, or disable coalescing for the affected expensive key. | Cache-fill leader/waiter/shed metrics return to baseline. |
| Full-jitter retry | Retry exhaustion or unexpected client retry storms appear. | Lower max attempts/elapsed time, require manual retry, or honor only server `Retry-After` for the affected surface. | Retry telemetry falls and no duplicate side effects appear. |
| Pagination/count budget | Legitimate search/list/export use is blocked by page/count budget. | Raise budget for the specific surface or switch to cursor/degraded count mode. | Valid workflow completes while expensive query telemetry remains bounded. |
| Preflight/realtime/multipart/body budget | Legitimate CORS preflight, collaboration, or upload/resumable traffic is blocked. | Shadow the specific budget, adjust limits, or fall back to existing upload/realtime path while preserving auth and body-size checks. | Route/realtime/upload proof passes and support cases close. |
| Bot Management escalation | Bot-score or bot-signal rule catches legitimate reviewers, beta users, or known provider callbacks. | Disable challenge/block rule or return to observe-only; app limiter remains source of truth. | Provider readback shows rollback and false-positive cohort completes. |
| Queue/cron/cache/images budget | Queue retries amplify downstream 429s, cron overlaps, cache-busting floods origin, or image transform variants spike. | Pause producer, delay/reduce consumer, skip/lock cron, normalize cache keys, or disable image/cache rule for affected path. | DLQ/cron/cache/image metrics return to budget and legitimate workflows complete. |

## Owner Approval Gates

Owner review is required before:

- Enforcing new auth/login/contact controls.
- Adding Turnstile to user-facing flows.
- Enabling Cloudflare WAF blocking mode.
- Adding a WAF skip/disable rule for Server Actions without hosted reproduction and provider Security Events/Ray-ID evidence.
- Enabling Bot Management challenge/block actions or bot-score based denials.
- Lowering thresholds on public proposal review.
- Changing identity key version, IPv6 prefix mask, or `Sb-Forwarded-For` mode for enforced policies.
- Claiming Cloudflare-native production readiness.
- Choosing temporary double quota for Supabase/Better Auth identity fragmentation.
