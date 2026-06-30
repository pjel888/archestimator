---
title: Route And Server Action Work Packages
plan_id: 2026-06-29-rate-limiting
created: 2026-06-29
profile: exhaustive
owner: Archestimator
---

# Route And Server Action Work Packages

Each work package is a future implementation slice. Files listed are likely future touch points, not files edited by this planning task.

## P0 - Re-Inventory And Test Lock

Objective: Re-run route/action/client-control discovery and add behavior-preserving tests before refactoring.
Files likely touched later: tests for share/invite/upload/AI/export/estimate/client-error and high-risk frontend submit controls; no production code first.
Behavior: prove current allow/deny/Retry-After, response/cache profile, metadata disclosure posture, algorithm/window semantics, resource-budget assumptions, and failure behavior.
Migration dependency: none.
Cloudflare dependency: none.
Tests: targeted route/action unit or integration tests.
Observability: record baseline event fields.
Rollback: no production behavior change.
Acceptance: inventory matches checkout, client-control rows and standards rows exist for high-risk UI/server actions, and tests fail if existing limiter behavior or response headers/bodies change.
Risk: medium because source tree is active.

## P1 - Central Policy Registry Skeleton

Objective: Define policy IDs, algorithms/windows, response profiles, resource-budget classes, disclosure posture, and modes in one module without changing behavior.
Files likely touched later: `src/lib/rate-limits/*`, current helper imports.
Behavior: no threshold changes.
Migration dependency: existing `security_rate_limit_events`.
Cloudflare dependency: none.
Tests: registry snapshots, response-profile snapshots, algorithm semantics fixtures, and type coverage.
Observability: none or shadow-only.
Rollback: remove registry adapter; helpers remain.
Acceptance: existing tests pass with same outputs.
Risk: low-medium.

## P2 - Identity Normalization

Objective: Replace scattered header reads with one trusted identity helper.
Files likely touched later: publication, invite, upload, AI, client-error, request proxy docs.
Behavior: identical or explicitly migrated client key order.
Migration dependency: limiter pepper env review.
Cloudflare dependency: define `cf-connecting-ip` trust only when behind Cloudflare.
Tests: header precedence, HMAC hashing, no raw IP persisted.
Observability: hashed client identity only.
Rollback: route helpers can revert to old extraction.
Acceptance: all limiter keys are generated through central helper.
Risk: high because key changes can reset/merge quotas.

## P3 - Shared-Link Policy Consolidation

Objective: Move shared-link limiters into registry-backed evaluator.
Files likely touched later: `public-repository.ts`, share route handlers.
Behavior: preserve current windows and responses.
Migration dependency: `security_rate_limit_events`.
Cloudflare dependency: none.
Tests: snapshot/activity/event/session/password/comment/decision/unsubscribe.
Observability: emit policy ID, allowed/denied, retryAfter.
Rollback: restore old helper path.
Acceptance: exact current limits preserved and source duplication reduced.
Risk: medium.

## P4 - Invite Policy Consolidation

Objective: Move invite create/resend/resolve/continue/accept into registry.
Files likely touched later: `invite-entry.ts`, invite routes, collaboration actions.
Behavior: preserve current windows and HMAC keying unless P2 changes are approved.
Migration dependency: rate-limit pepper and service-role client.
Cloudflare dependency: none.
Tests: token probing, authenticated accept, resend/create.
Observability: invite policy events without token leakage.
Rollback: old invite-entry helpers.
Acceptance: no token existence leak and same action result shape.
Risk: medium.

## P5 - Expensive Authenticated Routes

Objective: Standardize proposal export, AI ask, package-builder, project image/attachment init.
Files likely touched later: AI handlers, export route, upload routes.
Behavior: maintain existing AI/export thresholds; classify package-builder.
Migration dependency: audit storage.
Cloudflare dependency: none.
Tests: 429/503 quota unavailable, large cost path retries, body/item/duration/provider-cost budget denial before expensive work.
Observability: cost class, model/export/upload surface, resource-budget dimension, algorithm, response profile.
Rollback: surface-specific helpers.
Acceptance: expensive routes have consistent policy entries.
Risk: medium-high.

## P6 - Upload Admission Durability

Objective: Decide whether active upload/request windows are durable or explicitly supplemental local controls.
Files likely touched later: `src/lib/uploads/admission-control.ts`, upload routes, upload session repository.
Behavior: avoid reducing legitimate upload throughput; client must show active upload/session state, cancel/retry affordance, cleanup retry timing, and distinguish `Retry-After` from active-slot capacity cooldown.
Migration dependency: current direct-upload capacity tables/RPCs.
Cloudflare dependency: R2/Image proof only for future provider mode.
Tests: concurrency, release idempotency, retryAfter, active-slot UI recovery, tab crash/retry, scaled simulation.
Observability: quota class, workspace, actor hash.
Rollback: keep local admission as supplemental guard.
Acceptance: production-critical upload controls are not only process-local.
Risk: high.

## P7 - Estimate Mutation Controls

Objective: Preserve fast editing while making limiter behavior scaled-runtime safe.
Files likely touched later: `src/lib/estimates/action-rate-limit.ts`, estimate actions.
Behavior: keep burst allowances; avoid user-visible lag; client pending/cooldown must be per-resource and must not globally lock the editor.
Migration dependency: maybe Postgres bucket or workspace action ledger.
Cloudflare dependency: none.
Tests: burst, normal editing, multi-tab, keyboard operation, stale-tab recovery, retry message, no stuck disabled state.
Observability: near-limit only at first to avoid noise.
Rollback: current local bucket.
Acceptance: no false-positive block during realistic editing profile.
Risk: high UX risk.

## P8 - Auth And Contact Controls

Objective: Plan/implement app-side auth/contact throttles without duplicating provider lockouts.
Files likely touched later: auth routes/actions, contact intake if server endpoint is created.
Behavior: recoverable beta-user login; generic failed-attempt responses; success/reset semantics; provider-lockout coordination; contact may fall back to mailto; pending/cooldown states preserve form input and keyboard submit behavior.
Migration dependency: auth provider contracts.
Cloudflare dependency: Turnstile proof for public contact/auth escalation.
Tests: magic-link/OAuth callback, fake email enumeration, failed-attempt reset, provider duplicate-lockout avoidance, beta-user support recovery, Turnstile replay.
Observability: email hash/client hash only.
Rollback: disable app-side auth limiter; keep provider controls.
Acceptance: no account enumeration or accidental beta lockout.
Risk: high security/UX.

## P9 - Email/Webhook/Internal Job Hardening

Objective: Treat email, webhooks, and jobs as idempotency/signature problems first, quotas second.
Files likely touched later: Resend client/webhook, internal upload routes, queue/cron worker.
Behavior: no duplicate side effects; safe retries.
Migration dependency: delivery logs and job idempotency.
Cloudflare dependency: Queues/Cron provider proof later.
Tests: replay, duplicate event, invalid signature, secret missing, retry.
Observability: event id/job id hash, no secret values.
Rollback: disable secondary throttles; retain signature/idempotency.
Acceptance: replay blocked without relying on broad IP limits.
Risk: medium.

## P10 - Edge WAF And Turnstile Proof

Objective: Add reversible Cloudflare edge mitigation proof in log/challenge stages.
Files likely touched later: docs, Cloudflare config/runbooks, maybe Turnstile server validation endpoint.
Behavior: no production blocking until shadow metrics pass.
Migration dependency: app limiter exists.
Cloudflare dependency: zone/account proof and official docs refresh.
Tests: bot simulation, token validation, accessibility fallback.
Observability: Cloudflare logs plus app events.
Rollback: disable WAF rule/Turnstile gate.
Acceptance: edge layer reduces abuse without replacing app limiter.
Risk: medium.

## P11 - Durable Object Exact Counter Spike

Objective: Prototype exact Cloudflare counters for one low-risk public policy.
Files likely touched later: Worker/DO code, `wrangler.jsonc`, tests.
Behavior: proof-only; current app limiter remains source of truth.
Migration dependency: policy registry adapter boundary.
Cloudflare dependency: hosted Worker/DO provider proof.
Tests: concurrent increments, partitioning, alarm cleanup, hibernation.
Observability: DO counter metrics and fallback.
Rollback: remove adapter; app Postgres remains.
Acceptance: exact behavior proven under concurrency.
Risk: high until hosted proof exists.

## P12 - Rollout, Dashboards, And Runbooks

Objective: Move from tests to operations, including low-and-slow anomaly monitoring and retention/deletion proof.
Files likely touched later: observability dashboards/runbooks, docs, feature flags.
Behavior: staged shadow/enforce/challenge modes.
Migration dependency: event schema and kill switches.
Cloudflare dependency: logs/traces receipt for edge phases.
Tests: alert thresholds, low-and-slow synthetic cohort, rollback drills, false-positive workflow, expired-event/idempotency-key cleanup.
Observability: dashboards for allowed/denied/near-limit/store-failure, resource-budget denials, low-and-slow cardinality, retention/deletion status.
Rollback: global and per-policy disable switches.
Acceptance: operators can detect and reverse harm quickly.
Risk: medium.

## P13 - Frontend Interaction Safeguards

Objective: Add shared frontend contracts for accidental repeat actions without treating the browser as an enforcement boundary.
Files likely touched later: high-risk feature clients under `src/components/share/`, workshop/estimate/editor clients, upload/export/AI/publication UI, shared button/form primitives, and optional `src/lib/client-action-guards/*`.
Behavior: pending disable, keyboard parity, single-flight, scoped cooldown, idempotency key reuse with fingerprint/TTL/mismatch behavior, request cancellation, optimistic rollback or draft retention, stale-write precondition recovery, retry/backoff caps, offline queue caps/purge rules, lifecycle recomputation, toast dedupe, and multi-tab coordination where justified.
Migration dependency: route/action P0 contract rows and server idempotency/limiter results.
Cloudflare dependency: none; Turnstile UI waits for P10.
Tests: DOM/user-event rapid click, Enter submit, direct fetch bypass, same-key/different-payload replay, concurrent same-key request, stale resource version `409`/`412`, retry-after delay seconds and HTTP-date parsing, no unsafe auto-retry without idempotency, offline queue overflow, hidden-tab `visibilitychange` recovery, multi-tab fallback, no stuck disabled state, rollback/kill-switch recovery, and accessibility assertions.
Observability: client guard events are sampled/redacted and never include raw tokens, emails, IPs, or provider secrets.
Rollback: disable shared client guard per surface while server limiters remain active.
Acceptance: accidental duplicate requests drop visibly without blocking unrelated workflows; retry/offline/lifecycle behavior is bounded and accessible; scripted/direct requests are still controlled by server enforcement before side effects or provider calls.
Risk: medium-high UX risk because overbroad disabling can harm fast editing and public reviewer flows.
