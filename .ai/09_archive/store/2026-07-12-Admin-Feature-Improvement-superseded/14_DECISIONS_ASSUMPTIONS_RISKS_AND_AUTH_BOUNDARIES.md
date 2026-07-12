# Decisions, Assumptions, Risks, and Authorization Boundaries

## Decisions

### DEC-AUTO-001: Better Auth User Is Canonical Identity

`user.createdAt` defines signup. `profiles` remains the app authorization projection. Rejected: keep calling profile provision time signup; it hides mismatches/backfills.

### DEC-AUTO-002: Separate Lifecycle Timestamps

Store/display signup, profile provision, login, authenticated use, product activity, and online separately. Rejected: one `last_active` field; it becomes semantically unstable.

### DEC-AUTO-003: Normalize Activity Through Adapters/Read Model

Preserve source/provenance/redaction/retention. Rejected: raw SQL union; source semantics and privacy differ.

### DEC-AUTO-004: Add Campaign Control Plane Above Existing Inbox

Keep `notification_definitions`/`notification_deliveries` as user-facing materialization. Add campaign/version/run/job state. Rejected: use definitions as drafts; inbox visibility and lifecycle become unsafe.

### DEC-AUTO-005: Async Durable Publish

Publish returns accepted run identity; outbox/job + queue handles fanout. Rejected: synchronous `INSERT ... SELECT` for comprehensive manager; it lacks progress/retry/reconciliation and request-bound scale.

### DEC-AUTO-006: Cron Sweep Plus Queue Is Preferred Scheduler

Periodic due-campaign sweep and durable jobs provide arbitrary-future recovery for one-time schedules, bounded recurrence expansion, future-user enrollment windows, and digests. Immutable occurrences/high-water marks prevent recurrence from mutating retry audiences. DO alarms remain an alternative if precision/scale evidence justifies complexity.

### DEC-AUTO-007: Snapshot Is Default Audience Policy

Retry does not expand audience. Explicit future-user modes create separate append-only enrollment occurrences with unique user/window guards; they never mutate a completed run.

### DEC-AUTO-008: Metrics Use Materialization Language

Delivery row means inbox materialization, not device receipt. `seen` requires explicit display instrumentation.

### DEC-AUTO-009: Retraction Preserves Evidence

Suppress/tombstone user visibility and link corrections; never delete campaign/delivery/audit history as rollback.

### DEC-AUTO-010: Capabilities Beyond Product Roles

Admin operations get exact server capabilities even if initially mapped to one operator. Rejected: all `ceo|admin` users have every future operation automatically.

### DEC-AUTO-011: Hosted Optional Providers Are Isolated

Core in-app manager does not depend on GA4, Clarity, CF Access, or email campaigns. Missing credentials leave those slices disabled.

### DEC-AUTO-012: No New Dependency by Default

Use current stack/primitives. A dependency requires explicit evidence and authority.

### DEC-AUTO-013: Recurrence and Templates Are First-Class

Complete scheduling includes a bounded typed recurrence contract, immutable schedule revisions/occurrences, DST policy, series edit/cancel/retract history, and versioned archivable templates copied into campaigns. Rejected: one-shot-only scheduling or directly publishable templates.

### DEC-AUTO-014: User Preferences Are Product-Owned

`/settings/notifications` owns current-user choices. Admin owns defaults/mandatory policy but cannot silently rewrite user preferences. Quiet hours defer interruptive surfaces; digests use durable per-user buckets/jobs. Rejected: admin-only preference flags or applying quiet hours to historical center visibility.

### DEC-AUTO-015: No Better Auth Admin Plugin by Default

Use installed-version supported APIs behind narrow adapters. Do not add the plugin unless a version-matched gap and dependency review prove it necessary and compatible. Rejected: automatic adoption; Archestimator owns capability/status semantics and D1 migrations.

### DEC-AUTO-016: Placeholder Admin APIs Are Removed When Unused

Trace consumers first. Delete placeholder routes with no real HTTP consumer; implement only routes required by external, streaming, export, DO, or provider consumers. Server Components/Actions use typed repositories/actions. Rejected: preserving fake endpoints for speculative compatibility.

### DEC-AUTO-017: Existing Workshop Operator Tools Stay Linked

Do not relocate or duplicate mutation ownership in this pack. Admin provides stable navigation and bounded read summaries; a surface moves only with a named owner, redirect, and consumer tests. Rejected: leaving the choice to each executor.

### DEC-AUTO-018: Dedicated Notification Queue Is the Default

Keep upload and notification payload, retry, backpressure, and DLQ ownership isolated. A generalized queue can replace this only through a recorded decision proving typed envelopes, per-kind policy/metrics, migration, and zero upload regression.

### DEC-AUTO-019: Approval Separation Is Policy-Driven and Deterministic

Compose, review, and publish are separate capabilities. `wide_audience_threshold = min(1000, max(100, ceil(0.10 * currently eligible canonical users)))`; mandatory notices are always wide-risk regardless of count. While exactly one eligible reviewer exists, recorded `single_operator_mode` permits explicit self-review with fresh auth, reach/risk summary, and a 60-second cancellable grace window; wide-risk campaigns additionally require a second typed confirmation of the frozen count/hash. When two or more eligible reviewers exist, every production campaign requires a different reviewer. The formula may change only through a new decision backed by observed scale/incident evidence and regression tests. Rejected: implicit approval, ambiguous lower-risk exceptions, or runtime executor choice.

### DEC-AUTO-020: Intervention Safety Does Not Depend on Notice Delivery

Suspend, ban, revoke-one, revoke-all, and reactivate proceed when their account/session safety preconditions pass even if no external notice channel is proven. `notice_delivery_unavailable` always creates a mandatory case escalation and visible retry state; in-app-only delivery never counts as informing an inaccessible user. Rejected: blocking urgent protection on optional email or falsely reporting notice success.

## Decision Record Metadata

All decisions are owned by the implementation lead and checked by the independent verifier. Evidence freshness is the improve-stage baseline plus cited source/overlap receipts; relevant source, manifest, dependency, quota, or provider drift reopens the affected record.

| IDs | Evidence and options considered | Confidence | Consequence, rollback, or revision trigger |
| --- | --- | --- | --- |
| 001-003 | Better Auth/profile/session/admin/activity source; canonical user vs profile, collapsed vs separate timestamps, raw union vs adapters | high | preserve provenance/partial states; revise only with source-owned canonical contract and migration proof |
| 004-009 | inbox schema/repository/action and synchronous broadcast defects; control plane vs drafts-in-inbox, sync vs async, Cron vs alarms, snapshot vs enrollment occurrences, materialized vs delivered, tombstone vs delete | high | additive compatibility and recoverable evidence; rollback disables new authoring/consumers and never deletes history |
| 010-012 | broad role checks, provider boundaries, dependency inventory | high | exact capabilities, isolated optional providers, no dependency by default; reopen on version/provider proof |
| 013-014 | user request for a comprehensive scheduled manager plus recurrence/template/preference/digest audit gaps | high | all are required; rollback disables authoring/delivery while preserving versions, occurrences, and choices |
| 015-020 | installed Better Auth/Next architecture, placeholder-route inventory, workshop ownership, upload-specific Queue, current single-operator reality, intervention/notice failure boundary | medium-high | plugin-free, delete-unused, link-not-duplicate, dedicated queue, deterministic approval and notice-escalation policy; reverse only through stated falsifiers and focused regression proof |

## Assumptions

| ID | Assumption | Validation / revision trigger |
| --- | --- | --- |
| ASSUMP-001 | Initial user scale is within D1/Queue free-tier with chunked fanout | calculate current counts and hosted limits before enabling wide publish |
| ASSUMP-002 | Exactly one eligible notification reviewer exists at initial rollout | count at enablement; DEC-AUTO-019 automatically changes separation behavior when the count reaches two |
| ASSUMP-003 | 1–5 minute schedule precision is acceptable | user/business requirement or benchmark proves tighter need |
| ASSUMP-004 | Existing notification inbox is the canonical in-app surface | revise only through explicit product decision and migration plan |
| ASSUMP-005 | Activity producer contracts can support person-level admin consumption | block UNIT-005 until source-matched receipt exists |
| ASSUMP-006 | Better Auth supported APIs can revoke sessions cleanly | verify installed version/local docs and focused integration before choosing implementation |

## Risk Register

| ID | Risk | Mitigation |
| --- | --- | --- |
| RISK-001 | User 360 leaks cross-tenant/private data | per-source authz, redacted DTO, denial tests, sensitive-read audit |
| RISK-002 | Identity/profile mismatch causes omitted users/campaign recipients | reconciliation state, repair workflow, canonical identity audience |
| RISK-003 | Heartbeat creates D1 write load/privacy concerns | rate-limit, aggregate row, minimal metadata, cost/retention review |
| RISK-004 | Activity source drift creates false completeness | source revisions, partial flags, consumer receipts |
| RISK-005 | Status action locks out operators | self/peer/last-admin/protected-account floor and break-glass runbook |
| RISK-006 | Audit failure leaves unattributed mutation | transactional/outbox command, reconciliation, fail closed for high risk |
| RISK-007 | Wide campaign is sent accidentally | reach preview, approval hash, fresh auth, grace/cancel, caps/kill switch |
| RISK-008 | Duplicate/partial deliveries | idempotency, unique constraints, chunk checkpoints, reconciliation |
| RISK-009 | Cancel race continues fanout | version/claim recheck every chunk and durable cancel state |
| RISK-010 | Scheduler misses/duplicates runs | unique logical run, due sweep, freshness alert, backlog recovery |
| RISK-011 | Queue retries exceed free tier | operation budget, bounded attempts, DLQ, concurrency/campaign caps |
| RISK-012 | Metrics overclaim delivery/engagement | semantic labels, denominators, no invented seen/device receipt |
| RISK-013 | Retraction deletes evidence or fails to hide content | tombstone state, inbox query contract, reconciliation |
| RISK-014 | Recipient snapshots conflict with erasure | retention/anonymization policy, aggregate preservation, legal hold |
| RISK-015 | Admin UI becomes slow/N+1 | cursor pagination, page-scoped aggregates, rollups, query-plan gates |
| RISK-016 | Overlap pack race corrupts shared contracts | receipts, migration lease, file ownership, baseline refreeze |
| RISK-017 | Optional email/provider scope delays core | isolate flags/units/proof boundaries |
| RISK-018 | Historical broadcasts cannot be reconstructed | import as legacy with explicit unavailable fields |

## True Authorization Boundaries

Each boundary blocks only the named side effect/claim. Local design, code, migrations, emulation, tests, redacted inventories, cost calculations, and rollback preparation continue. The safe fallback is feature-off, current free-tier/bound-resource behavior, and an honest `BOUNDARY`/`N/A`; no boundary authorizes a false release claim.

| ID | Prohibited side effect / higher-priority boundary | Dependent claim only | Completed prerequisites and gathered evidence | Exact unblock procedure and expected result | Rollback and post-action proof |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | enable a paid Cloudflare tier/add-on or new paid vendor without owner approval | only the capability whose measured free-tier model breaches the 50% normal/70% peak headroom gate | UNIT-009 formulas, current official quota/version, seeded/hosted measurements, lower-cap/frequency/retention alternatives | present redacted cost table, exact SKU/price/account/resource/scope and rejected free alternative; obtain explicit owner approval; record approval reference; rerun cost gate expecting modeled and observed headroom PASS | disable paid feature/consumer, restore caps, confirm billing/resource state and core feature-off reconciliation; no spend claim from local proof |
| AUTH-002 | read/configure GA4, Clarity, Access, Email Routing, or optional delivery without credentials/config authority | only each optional provider slice in UNIT-018 | provider applicability receipt, source/config hash, no-secret adapter/tests, disabled UI | set only required secret env outside repo, run provider-specific preflight/least-privilege read or bounded test, expect source-matched redacted artifact; never print values | remove/rotate credential/config, disable slice, verify no exposed route/job and core in-app manager remains green |
| AUTH-003 | deploy/cut over or claim production readiness without a separately requested release and current gates | UNIT-017/019 hosted/release claims | local RC audit, migration/rollback rehearsal, source-matched artifacts, release report | follow current `cf:release-gates`/deploy instructions under explicit release request, expect deployed source revision and hosted gates PASS | disable flags/consumers, apply documented forward fix, verify route/queue/D1/readiness artifacts and incident state |
| AUTH-004 | claim legal retention/consent approval or activate a policy that requires counsel/designated approval | legal-approved portion of UNIT-013 | field taxonomy, safe conservative retention/erasure/hold defaults, tests, unresolved policy list | present policy diff/field-purpose/retention/DSAR/hold matrix to designated reviewer; record approved revision and rerun lifecycle tests | revert feature flag/policy config without deleting evidence, preserve holds, verify prior approved revision and audit trail |
| AUTH-005 | create/bind a new hosted notification Queue/DLQ outside already-bound resources | hosted notification fanout proof in UNIT-017 | dedicated topology decision, names/account boundary, free-tier model, local emulation/fault tests, `wrangler.jsonc` proposal, deployment/rollback/readback plan | present exact queue/DLQ names and account, obtain explicit owner authorization, create resources and bind via approved Cloudflare commands, deploy under AUTH-003, then read back bindings and run bounded retry/DLQ proof expecting PASS | disable consumer/scheduler, drain/reconcile D1-authoritative jobs, remove binding/resource only when evidence retention is safe, redeploy/read back old config and prove upload Queue unaffected |

Authorization packets are revalidated immediately before the side effect. The executor records actor/authority reference, timestamp, exact redacted command, exit/result artifact, source/config/provider hashes, rollback readiness, and post-action verification in the applicable unit receipt.

## Pre-Mortem

1. **Campaign reports Sent but thousands never receive an inbox row.** Cause: request-bound fanout/partial failure. Controls: durable run/chunks, exact reconciliation, no sent terminal state until counts resolve.
2. **Admin bans the wrong or last privileged user and cannot recover.** Cause: role-only broad authority and false affected-row success. Controls: capabilities, protected floor, fresh auth, expected state, row proof, session/audit reconciliation.
3. **User 360 confidently shows wrong signup/last-active data and leaks another workspace's events.** Cause: profile/session shortcuts and raw unions. Controls: canonical semantics, source adapters, partial labels, per-source authz, cross-tenant denial tests.
