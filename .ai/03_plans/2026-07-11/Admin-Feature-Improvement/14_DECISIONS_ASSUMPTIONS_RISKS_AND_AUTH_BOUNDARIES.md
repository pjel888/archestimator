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

Periodic due-campaign sweep and durable jobs provide arbitrary-future recovery. DO alarms remain an alternative if precision/scale evidence justifies complexity.

### DEC-AUTO-007: Snapshot Is Default Audience Policy

Retry does not expand audience. Explicit future-user modes exist for onboarding/release use cases.

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

## Assumptions

| ID | Assumption | Validation / revision trigger |
| --- | --- | --- |
| ASSUMP-001 | Initial user scale is within D1/Queue free-tier with chunked fanout | calculate current counts and hosted limits before enabling wide publish |
| ASSUMP-002 | One primary operator allows optional rather than mandatory two-human approval | revise when more admins exist or policy requires separation |
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

### AUTH-001: Paid Cloudflare or Third-Party Service

No paid add-on, plan upgrade, or new vendor without explicit owner approval.

### AUTH-002: External Provider Credentials/Configuration

GA4, Clarity, Cloudflare Access, Email Routing, and optional delivery need credentials/configuration and source-matched proof. Never print/store secrets.

### AUTH-003: Production Deployment/Release

Standing authority covers bound Cloudflare resource changes, but production deploy/cutover is separate from this planning task and follows current release instructions/gates.

### AUTH-004: Legal Retention/Consent Policy

Technical implementation may prepare controls, but claims of legal/compliance approval require the designated review.

### AUTH-005: New Hosted Notification Queue/DLQ

Local authoring and emulation are allowed. Creating or binding a new Cloudflare Queue/DLQ is outside the standing mandate for resources already bound in `wrangler.jsonc`; obtain explicit owner authorization after presenting names, free-tier/cost impact, account boundary, deployment order, rollback, and proof commands.

## Pre-Mortem

1. **Campaign reports Sent but thousands never receive an inbox row.** Cause: request-bound fanout/partial failure. Controls: durable run/chunks, exact reconciliation, no sent terminal state until counts resolve.
2. **Admin bans the wrong or last privileged user and cannot recover.** Cause: role-only broad authority and false affected-row success. Controls: capabilities, protected floor, fresh auth, expected state, row proof, session/audit reconciliation.
3. **User 360 confidently shows wrong signup/last-active data and leaks another workspace's events.** Cause: profile/session shortcuts and raw unions. Controls: canonical semantics, source adapters, partial labels, per-source authz, cross-tenant denial tests.
