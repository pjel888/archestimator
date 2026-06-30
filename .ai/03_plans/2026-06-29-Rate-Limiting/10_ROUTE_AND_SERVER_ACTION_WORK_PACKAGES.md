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

Objective: Re-run route/action discovery and add behavior-preserving tests before refactoring.
Files likely touched later: tests for share/invite/upload/AI/export/estimate/client-error; no production code first.
Behavior: prove current allow/deny/Retry-After and failure behavior.
Migration dependency: none.
Cloudflare dependency: none.
Tests: targeted route/action unit or integration tests.
Observability: record baseline event fields.
Rollback: no production behavior change.
Acceptance: inventory matches checkout and tests fail if existing limiter behavior changes.
Risk: medium because source tree is active.

## P1 - Central Policy Registry Skeleton

Objective: Define policy IDs/windows/modes in one module without changing behavior.
Files likely touched later: `src/lib/rate-limits/*`, current helper imports.
Behavior: no threshold changes.
Migration dependency: existing `security_rate_limit_events`.
Cloudflare dependency: none.
Tests: registry snapshots and type coverage.
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
Tests: 429/503 quota unavailable, large cost path retries.
Observability: cost class, model/export/upload surface.
Rollback: surface-specific helpers.
Acceptance: expensive routes have consistent policy entries.
Risk: medium-high.

## P6 - Upload Admission Durability

Objective: Decide whether active upload/request windows are durable or explicitly supplemental local controls.
Files likely touched later: `src/lib/uploads/admission-control.ts`, upload routes, upload session repository.
Behavior: avoid reducing legitimate upload throughput.
Migration dependency: current direct-upload capacity tables/RPCs.
Cloudflare dependency: R2/Image proof only for future provider mode.
Tests: concurrency, release idempotency, retryAfter, scaled simulation.
Observability: quota class, workspace, actor hash.
Rollback: keep local admission as supplemental guard.
Acceptance: production-critical upload controls are not only process-local.
Risk: high.

## P7 - Estimate Mutation Controls

Objective: Preserve fast editing while making limiter behavior scaled-runtime safe.
Files likely touched later: `src/lib/estimates/action-rate-limit.ts`, estimate actions.
Behavior: keep burst allowances; avoid user-visible lag.
Migration dependency: maybe Postgres bucket or workspace action ledger.
Cloudflare dependency: none.
Tests: burst, normal editing, multi-tab, retry message.
Observability: near-limit only at first to avoid noise.
Rollback: current local bucket.
Acceptance: no false-positive block during realistic editing profile.
Risk: high UX risk.

## P8 - Auth And Contact Controls

Objective: Plan/implement app-side auth/contact throttles without duplicating provider lockouts.
Files likely touched later: auth routes/actions, contact intake if server endpoint is created.
Behavior: recoverable beta-user login; contact may fall back to mailto.
Migration dependency: auth provider contracts.
Cloudflare dependency: Turnstile proof for public contact/auth escalation.
Tests: magic-link/OAuth callback, fake email enumeration, Turnstile replay.
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

Objective: Move from tests to operations.
Files likely touched later: observability dashboards/runbooks, docs, feature flags.
Behavior: staged shadow/enforce/challenge modes.
Migration dependency: event schema and kill switches.
Cloudflare dependency: logs/traces receipt for edge phases.
Tests: alert thresholds, rollback drills, false-positive workflow.
Observability: dashboards for allowed/denied/near-limit/store-failure.
Rollback: global and per-policy disable switches.
Acceptance: operators can detect and reverse harm quickly.
Risk: medium.
