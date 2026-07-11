# Executive Summary and Target State

## Outcome

Archestimator needs one calm, dense, reliable operator workspace for first-user operations. `/admin` should answer, without database spelunking:

- Who signed up, when, through which identity path, and whether identity/profile projections agree?
- Who used the app recently, what defensible evidence supports that statement, and what product actions occurred?
- Which workspaces, corporate accounts, projects, estimates, invitations, shares, support cases, notifications, security facts, and incidents relate to a user?
- Which notification campaigns are drafts, scheduled, publishing, sent, failed, cancelled, expired, or retracted?
- Who was targeted and excluded, how many inbox deliveries were materialized, and what users read, dismissed, or acknowledged?
- What high-risk admin actions occurred, why, and can their effects be proven or rolled forward safely?
- What operational problems require attention now?

## Design Principles

1. **Truth before density.** Every metric and timestamp names its source, semantics, as-of time, and availability.
2. **Control plane, not alternate product logic.** Admin consumes canonical domain contracts; it does not redefine Activity, Teamwork, Corporate Accounts, auth, notifications, or observability truth.
3. **Safe operator actions.** Deny by default, prove affected rows, prevent privileged lockout, revoke relevant sessions, require reasons for high-risk actions, and audit atomically.
4. **Durable commands.** Long or high-cardinality work uses idempotent commands, outbox/job state, bounded chunks, retry, reconciliation, and explicit failure visibility.
5. **Privacy by construction.** Sensitive values stay server-side; activity is normalized and redacted; retention, DSAR, legal-hold, and access-to-audit rules are explicit.
6. **Free-tier discipline.** Reuse bound Cloudflare resources where contracts fit; add no paid service or new dependency without explicit authority.
7. **Evidence-class honesty.** Local tests do not prove hosted queues, cron execution, email delivery, analytics providers, or production alerting.

## Priority Model

### P0: Trustworthy Foundation

- repair current known-red admin tests and query bindings;
- replace fake audit data with the real repository;
- reconcile Better Auth users with profiles;
- define signup, last login, last authenticated activity, last product activity, and online separately;
- prove status mutations, privileged-account protections, and session revocation;
- fix notification validation/UUID/atomicity regressions before adding features;
- add server-driven search/filter/pagination and complete error/empty/loading states.

### P0: User 360

- identity reconciliation and lifecycle milestones;
- summary, access, activity, sessions/security, projects/estimates, support, notifications, and interventions tabs;
- normalized multi-source activity read model with cursor pagination and source/retention labels;
- safe account intervention workflows and investigation notes.

### P0: Notification Manager

- drafts, immutable versions, preview/test send, audience builder and estimated reach;
- approval/publish policy, scheduling and time-zone handling;
- durable fanout with job/run state, idempotency, chunking, retry, DLQ/reconciliation;
- sent/scheduled/cancelled/failed history and detail views;
- delivery materialization and engagement metrics with explicit denominators;
- cancellation, expiry, retraction/tombstone, replacement, and fix-forward runbooks.

### P1: Complete Operator Control Plane

- support assignment, priority, SLA, tags, notes, canned replies, escalation, attachments, and email ingestion boundary;
- typed/enforced feature configuration and maintenance mode;
- incident, cron, queue/DLQ, client error, web vital, provider-proof, and runbook drilldowns;
- product analytics for activation, retention, collaboration, publication, estimate, AI use, and notification effectiveness;
- consolidation of fragmented workshop-only admin tools through links or owned migrations.

### P2: Provider-Dependent Enhancements

- hosted Cloudflare analytics reads, GA4/Clarity server pulls, Cloudflare Access, email campaign channel, and hosted delivery proofs;
- only after credentials, free-tier/cost, privacy, and operational ownership are proven.

## Target Navigation

1. Overview
2. Users
3. Corporate Accounts
4. Notifications
5. Support
6. Product Analytics
7. Feature Configuration
8. Audit and Security
9. Operations and Incidents

Observability remains a distinct operational area but may be grouped under Operations after its data contract is real. Existing routes remain compatible during rollout.

## Target Data Semantics

- `signed_up_at`: Better Auth `user.createdAt`.
- `profile_provisioned_at`: `profiles.created_at`.
- `last_login_at`: durable successful authentication/session-creation event.
- `last_authenticated_at`: rate-limited protected-request heartbeat, not every request.
- `last_product_activity_at`: most recent normalized durable product event.
- `currently_online`: ephemeral authenticated presence with freshness, never inferred from session existence.
- `notification_materialized`: delivery row exists in the user's inbox.
- `notification_seen/read/dismissed/acknowledged`: explicit engagement timestamps with documented semantics.
- `sent`: campaign publish completed according to its frozen audience contract, not proof that a device displayed it.

## Stop Condition

Implementation may stop only when all units are verified, migration and source receipts are current, security/privacy/retention contracts pass, large-audience notification failure scenarios are proven, hosted proof units have real provider evidence, and the release gate is evaluated separately. A polished UI over ambiguous or partial data does not satisfy the outcome.
