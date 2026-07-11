# Canonical Implementation Plan

## Execution Contract

This is the sole canonical execution artifact. Detail documents define contracts; this file defines ordering, ownership, completion evidence, and stop conditions.

Before every unit:

1. run `bun run supermemory:ensure`;
2. recompute the scoped baseline from `03_SOURCE_CODEBASE_AND_STALENESS_AUDIT.md`;
3. re-list active migrations and acquire the current Beta Program migration lease when a unit touches D1;
4. read the unit's overlap receipts in `13_OVERLAP_DEPENDENCY_AND_CONSUMER_RECEIPTS.md`;
5. append `STARTED` to `LOOP_LEDGER.md` with exact file ownership;
6. run the smallest red test or characterization that proves the current gap;
7. implement one coherent unit, verify, record evidence, and update the manifest last.

## Unit DAG

### UNIT-001: Reconcile Current Truth and Lock Regressions

**Depends on:** none  
**Owned surface:** current admin tests, source audit, overlap receipts, no product expansion.  
**Work:**

- reproduce and lock the searched-user placeholder-order defect;
- reconcile the stale admin flag test with the current before/after audit contract;
- add characterization tests for fake audit data, account affected-row behavior, admin notification UUID/readability, schema-bound validation, and non-atomic publish residue;
- inventory Better Auth users missing profiles and profiles missing Better Auth users without mutating data;
- verify active Corporate, Teamwork, Activity, Beta Operating, and observability manifests and record consumer revisions;
- reserve migration numbers through the shared lease only after the active migration list is fresh.

**Pass:** known-red baseline is intentional and fully enumerated; no unclassified failure remains; overlap and migration receipts are current.

### UNIT-002: Repair Existing Admin Correctness Baseline

**Depends on:** UNIT-001  
**Work:**

- bind searched user SQL parameters in exact placeholder order and prove filtered/unfiltered pagination;
- return `not_found` when status mutation affects zero rows;
- wire `/admin/audit` to the real repository with server pagination/filtering;
- repair placeholder admin API routes or remove them when no consumer requires them;
- align notification UI/action/schema bounds and typed enum validation;
- generate valid delivery IDs and prove user inbox read/dismiss/ack actions;
- make definition/fanout/audit behavior recoverable and idempotent before feature expansion;
- update navigation tests for Accounts and Notifications.

**Pass:** focused admin/notification tests are green and no current UI claims placeholder or approximate data as authoritative.

### UNIT-003: Canonical Admin Capability and Sensitive-Action Policy

**Depends on:** UNIT-002  
**Work:** define capabilities separate from platform product roles; require server-side checks per read/action; protect last privileged operator; require fresh-auth/reason/case reference for high-risk actions; prohibit unsafe self/peer changes; rate-limit interventions; audit sensitive reads and all mutations; use no-store/private responses.

**Pass:** denial matrix covers anonymous, member, limited operator, full operator, protected peer, self, and stale/fresh session paths.

### UNIT-004: Identity Reconciliation and Lifecycle Instrumentation

**Depends on:** UNIT-002, UNIT-003  
**Work:**

- treat Better Auth `user` as canonical identity and `profiles` as an app projection;
- build mismatch inventory and idempotent profile provision/repair workflow;
- add durable successful-login facts and rate-limited authenticated heartbeat;
- define last product activity rollup from normalized events;
- keep online presence ephemeral and identity-safe;
- add provenance/as-of/availability fields to user summary DTOs.

**Pass:** fixtures distinguish signup, profile provision, login, authenticated use, product activity, and online state; expired/deleted sessions do not erase durable login/use history.

### UNIT-005: User 360 Read Model and Admin Experience

**Depends on:** UNIT-004 and source-matched Activity/Corporate/Teamwork receipts  
**Work:** implement Summary, Access, Activity, Sessions/Security, Projects/Estimates, Support/Feedback, Notifications, and Interventions views; normalized cursor-paginated activity adapters; filters and source labels; identity mismatch states; membership footprint; user-specific notification engagement; export only through approved redacted contracts.

**Pass:** cross-tenant denial tests, source provenance, empty/error/stale states, and query budgets pass at seeded scale.

### UNIT-006: Safe Account and Session Operations

**Depends on:** UNIT-003, UNIT-004  
**Work:** suspend/ban/reactivate with reason, optional expiry, case reference, affected-row proof, relevant Better Auth session revocation, protected-admin floor, user notification policy, idempotency, atomic audit, and visible intervention history. Add single-session and revoke-all controls without exposing tokens.

**Pass:** status and session state agree after every success/failure/crash boundary; nonexistent targets and protected operators cannot produce false-success audit rows.

### UNIT-007: Notification Campaign Domain and Authoring UX

**Depends on:** UNIT-002, UNIT-003  
**Work:** introduce campaign and run lifecycles with immutable content versions; drafts, templates, preview, test audience/test send, review/approval, optimistic locking, content validation, safe action links, schedule/expiry/misfire, duplication, pause/resume/retry/reconcile transitions, and complete history filters.

**Pass:** lifecycle transition matrix and concurrent-editor tests pass; no draft or unapproved content is user-visible.

### UNIT-008: Audience Builder, Reach Preview, and Preferences

**Depends on:** UNIT-004, UNIT-007 and Corporate/Teamwork consumer receipts  
**Work:** typed audience rules for all active users, explicit users, signup/use cohorts, beta stage, corporate account/role, workspace/project membership/role, account status, and notification preference policy. Show eligible/excluded counts with reasons and freshness. Freeze rule revision/audience semantics at approval/publish. Define mandatory security/operational override and quiet-hours/digest behavior.

**Pass:** invalid/cross-tenant targets are denied; preview and publish use the same rule revision; suspended/banned/erased users and preference exclusions are deterministic.

### UNIT-009: Durable Scheduling, Fanout, Retry, and Reconciliation

**Depends on:** UNIT-007, UNIT-008  
**Work:** transactional publish command and outbox; mandatory per-run recipient ledger; dedicated notification queue/DLQ adapter, consumer, local emulation, and proposed binding as the v1 default; arbitrary-future scheduler; bounded recipient chunks; stable idempotency; partial acknowledgement; retry/backoff; DLQ/failed-recipient state; pause/resume/cancel concurrency; schedule-misfire handling; crash recovery; reconciliation; free-tier budgets. A generalized queue requires a recorded replacement decision and the typed isolation/migration proof in doc 07. Do not create or bind the hosted Queue/DLQ in this local unit.

**Pass:** fault injection after every state transition cannot duplicate recipients or lose the campaign; scheduled execution is at-most-one logical publish with recoverable at-least-once processing.

### UNIT-010: Notification History, Metrics, Cancellation, and Retraction

**Depends on:** UNIT-009  
**Work:** scheduled/sent/failed/cancelled/expired/retracted lists; detail timeline; intended/eligible/excluded/materialized/pending/failed/retried metrics; read/dismiss/modal-ack rates; action-click tracking only through a safe internal event/redirect; cancel pending work; retract materialized inbox items with tombstones; replacement/supersession flow; export of aggregate evidence only.

**Pass:** every metric names denominator/as-of/semantics; cancellation races and retraction visibility are proven; evidence is preserved.

### UNIT-011: Support Operations Improvement

**Depends on:** UNIT-003, UNIT-005  
**Work:** assignment, priority, status/SLA, tags, internal notes, canned replies, attachment policy, escalation, unread lifecycle, realtime consistency, and email-to-ticket as a separately hosted-proofed channel.

**Pass:** support access, send failure, duplication, attachment, escalation, and retention paths pass; email ingestion remains gated until hosted proof exists.

### UNIT-012: Feature Configuration and Maintenance Enforcement

**Depends on:** UNIT-003  
**Work:** typed flag registry, environment override precedence, before/after audit, rollout metadata, notification subsystem kill switches, and actual maintenance enforcement across workshop mutation boundaries with break-glass operator access.

**Pass:** every visible toggle has a proven consumer; stale/reserved flags are labeled or removed; maintenance denial coverage spans all mutation classes.

### UNIT-013: Audit, Security, Privacy, Retention, and DSAR

**Depends on:** UNIT-003 through UNIT-010  
**Work:** immutable/tombstoned admin actors instead of cascade loss; privileged-read audit; redacted summaries; retention classes for admin, notification, support, usage, client error, and security facts; legal holds; DSAR export/erase/anonymize policy; notification orphan cleanup; audit tamper/access monitoring.

**Pass:** retention/hold/DSAR tests cover every User 360 and campaign source; raw credentials/tokens/IP/UA never appear in DTOs, logs, exports, or audit summaries.

### UNIT-014: Operations, Incidents, Observability, and Product Analytics

**Depends on:** UNIT-005, UNIT-009, UNIT-013  
**Work:** truthful health probes, incident workflow, cron/queue/DLQ/job state, client error/vital trends, hosted proof readiness, product activation/retention/collaboration/publication/estimate/AI funnels, and notification effectiveness. Consolidate or link existing workshop operator tools without duplicating ownership.

**Pass:** every tile has source/as-of/failure semantics; hosted provider facts are not claimed from local D1 rows or links.

### UNIT-015: Performance, Accessibility, and Integration Hardening

**Depends on:** UNIT-005 through UNIT-014  
**Work:** query plans/indexes/rollups, bounded concurrency, bundle isolation, streaming and independent failure states, keyboard/focus/table/dialog/live-region behavior, responsive dense layouts, and degraded-mode testing.

**Pass:** budgets in doc 10 and proof matrix in doc 11 pass at seeded cardinalities; no page-wide failure from one provider or domain reader.

### UNIT-016: Local Release Candidate Audit

**Depends on:** UNIT-001 through UNIT-015  
**Work:** targeted and broad validation proportional to changed blast radius; D1 replay; migration/rollback rehearsal; error-handling gate; static secret/PII scan; admin route/auth smoke; notification crash/retry suite; support/retention checks; final source/manifest/receipt reconciliation.

**Pass:** local evidence is complete, no known error is unclassified, and hosted-only claims remain explicitly boundary-marked.

### UNIT-017: Hosted Queue, Scheduler, D1, and Worker Proof

**Depends on:** UNIT-016  
**Boundary:** requires source-matched deployment and mutation of bound Cloudflare resources; standing project authority applies, but deploy/release remains separately requested.  
**Work:** after `AUTH-005` is resolved, provision/bind the new notification Queue/DLQ and prove scheduled campaign execution, queue retry/DLQ, D1 materialization/reconciliation, cancellation, retraction, account actions/session revocation, operational dashboards, incident/alert/support monitoring, named ownership, and escalation against the source-matched deployed resources.

### UNIT-018: Optional Provider Applicability and Hosted Proof

**Depends on:** UNIT-016  
**Boundary:** credentials/configuration for optional providers and external delivery may be absent.  
**Work:** decide each optional provider independently as `enabled_and_required`, `disabled_not_applicable`, or `blocked_required`; prove every enabled slice for Cloudflare Email channel, email-to-ticket, CF Access, CF analytics, GA4, and Clarity; prove disabled slices are not exposed or claimed. A verifier may mark disabled slices `N/A` with an applicability receipt, so unavailable optional credentials do not block core in-app release. Production incident/alert/support ownership remains required in UNIT-017/019.

### UNIT-019: Production Cutover and Final Completion Audit

**Depends on:** UNIT-017 and UNIT-018's complete per-provider applicability/proof matrix  
**Work:** canary, evidence freshness, operator runbooks, rollback drill, support/incident monitoring, release decision, final requirement-by-requirement audit, and plan archival.

## Dependency-Closed Ready Slice

The immediately executable ready slice is `UNIT-001`, which freezes current overlap contracts, test failures, migration lease, and file ownership. `UNIT-002` through `UNIT-016` are planned and become ready in DAG order only after their dependencies and named receipt gates pass. `UNIT-017` through `UNIT-019` additionally require source-matched hosted/release evidence; UNIT-017 cannot provision the new Queue/DLQ until `AUTH-005` is resolved.

## Compact Execution Unit Packets

Each row is a runnable bounded-context packet. Requirements/risks are the reciprocal IDs in `plan-pack.json`; the unit heading above owns outcome, approach, invariants, dependencies, and postconditions. Before editing, re-read the named current symbols and expand only within the listed paths. A failed expected signal stops the unit, records the failing command and source hash in its receipt, and returns the unit to `PLANNED` until replanned. Resume state is the last green command, migration lease generation when applicable, exact modified paths, and remaining failed signal in the unit receipt.

| Unit | Exact paths/current symbols | Role, owned scope, non-goals | Command/procedure and expected signal | Evidence path / failure trigger |
| --- | --- | --- | --- | --- |
| UNIT-001 | `src/lib/admin/users-repository.ts` (`listAdminUsers`/status mutation), `src/lib/admin/notification-actions.ts`, `src/lib/notifications/**`, active producer manifests, migration lease | verifier; characterization/receipts only; no product fix | `bun x vitest run tests/vitest/admin-users-repository.test.ts tests/vitest/admin-feature-flags.test.ts tests/vitest/notifications-actions.test.ts tests/vitest/notification-schema.test.ts`; every failure classified and producer hashes current | `evidence/UNIT-001-receipt.md`; unknown failure, stale receipt, or lease collision replans |
| UNIT-002 | prior paths plus `src/app/admin/audit/**`, `src/lib/admin/audit-repository.ts`, `src/features/notifications/**` | executor; correctness baseline only; no new campaign UX | same focused suite plus `tests/vitest/admin-audit.test.ts tests/vitest/notification-center.test.tsx`; all baseline defects green | `evidence/UNIT-002-receipt.md`; changed inbox contract or unowned collision replans |
| UNIT-003 | `src/lib/admin/roles.ts`, admin layout/actions/API guards, Better Auth session helpers | security executor; exact capabilities/denials; no product-role redesign | `bun x vitest run tests/vitest/admin-roles.test.ts tests/vitest/beta-admin-action-boundaries.test.ts tests/vitest/admin-shell.test.tsx`; denial matrix green | `evidence/UNIT-003-receipt.md`; any anonymous/limited/protected-user allow is stop-fail |
| UNIT-004 | Better Auth `user`/`session`, `profiles`, `src/lib/auth/**`, `worker.ts` `GlobalPresence`, planned lifecycle repository/migration | executor; identity reconciliation and facts; no raw token/IP/route payload | `bun x vitest run tests/vitest/auth-session-closed-beta.test.ts tests/vitest/cloudflare-global-presence-router.test.ts tests/vitest/admin-user-lifecycle.test.ts`; milestone/presence matrix green | `evidence/UNIT-004-receipt.md`; write budget, privacy, or producer mismatch replans |
| UNIT-005 | `src/app/admin/users/**`, `src/lib/admin/users-repository.ts`, Activity/Corporate/Teamwork read contracts | executor; User 360 composition; no producer taxonomy/role mutation | `bun x vitest run tests/vitest/admin-users-repository.test.ts tests/vitest/activity-tenant-isolation.test.ts tests/vitest/admin-user-360.test.tsx`; cross-tenant denials and partial states green | `evidence/UNIT-005-receipt.md`; missing execution-time producer receipt blocks start |
| UNIT-006 | admin user actions, `src/lib/auth/session.ts`, Better Auth supported revoke APIs, audit/outbox | security executor; intervention commands; no token exposure or peer-role expansion | `bun x vitest run tests/vitest/admin-user-interventions.test.ts tests/vitest/admin-audit.test.ts`; row proof/session/audit crash matrix green | `evidence/UNIT-006-receipt.md`; unsupported Better Auth behavior or protected-floor failure replans |
| UNIT-007 | `src/app/admin/notifications/**`, `src/lib/admin/notification-actions.ts`, planned campaign domain/migrations | notification executor; authoring/lifecycle only; no hosted fanout | `bun x vitest run tests/vitest/admin-notification-campaign-domain.test.ts tests/vitest/admin-notification-composer.test.tsx`; transition/concurrent edit/validation matrix green | `evidence/UNIT-007-receipt.md`; schema/UI validation drift or unapproved visibility is stop-fail |
| UNIT-008 | planned audience evaluator/preferences repository, canonical identity plus Corporate/Teamwork read contracts | notification executor; typed audience/preferences; no raw SQL or role redefinition | `bun x vitest run tests/vitest/admin-notification-audience.test.ts tests/vitest/admin-notification-preferences.test.ts`; preview/publish revision and exclusion matrix green | `evidence/UNIT-008-receipt.md`; stale Corporate/Teamwork receipt blocks start |
| UNIT-009 | planned campaign run/job/recipient repositories, notification queue adapter/consumer, Cron handler, `worker.ts`, proposed `wrangler.jsonc` binding | deep executor; local durable dispatch only; no hosted queue creation | `bun x vitest run tests/vitest/admin-notification-dispatch.test.ts tests/vitest/admin-notification-scheduler.test.ts`; crash/idempotency/misfire/pause matrix green under local emulation | `evidence/UNIT-009-receipt.md`; duplicate/lost recipient, unbounded cost, or need for hosted provisioning stops at AUTH-005 |
| UNIT-010 | admin campaign history/detail/metrics, inbox suppression/tombstone, engagement actions | notification executor; history/metrics/recovery; no invented device delivery/seen | `bun x vitest run tests/vitest/admin-notification-history.test.ts tests/vitest/admin-notification-retraction.test.ts tests/vitest/notifications-actions.test.ts`; exact denominators and race matrix green | `evidence/UNIT-010-receipt.md`; irreconcilable counts or evidence deletion is stop-fail |
| UNIT-011 | `src/app/admin/support/**`, support repositories/actions, `SupportInbox` DO | executor; support operations; no campaign/support content merge or unproved email ingestion | `bun x vitest run tests/vitest/admin-support-actions.test.ts tests/vitest/cloudflare-support-inbox-router.test.ts`; assignment/SLA/realtime/failure paths green | `evidence/UNIT-011-receipt.md`; external email need moves to UNIT-018 |
| UNIT-012 | `src/app/admin/flags/**`, `src/lib/admin/feature-flags.ts`, workshop mutation guards | executor; typed flags/maintenance/kill switches; no reserved flag claims | `bun x vitest run tests/vitest/admin-feature-flags.test.ts tests/vitest/admin-flag-actions.test.ts tests/vitest/beta-admin-action-boundaries.test.ts`; every toggle has consumer and denial proof | `evidence/UNIT-012-receipt.md`; unenforced mutation class blocks pass |
| UNIT-013 | admin audit/security repositories, retention/DSAR/compliance paths, campaign/support/activity stores | security/privacy executor; retention and redaction machinery; no legal approval claim | `bun x vitest run tests/vitest/admin-audit.test.ts tests/vitest/admin-retention-dsar.test.ts && bun run validate:error-handling`; lifecycle/redaction gates green | `evidence/UNIT-013-receipt.md`; counsel decision stays AUTH-004, secret/PII finding stop-fails |
| UNIT-014 | `src/app/admin/{observability,analytics}/**`, incident/ops readers, Activity aggregates, workshop operator routes | operations executor; truthful composition/links; no local-to-hosted proof substitution | `bun x vitest run tests/vitest/admin-observability.test.ts tests/vitest/admin-product-analytics.test.ts tests/vitest/activity-view-model.test.ts`; source/as-of/failure semantics green | `evidence/UNIT-014-receipt.md`; provider-only fact remains boundary, duplicate mutation ownership replans |
| UNIT-015 | all changed admin components/queries plus loading boundaries and indexes | test/performance executor; integration hardening; no decorative redesign | `bun run type-check && bun x vitest run tests/vitest/admin-accessibility.test.tsx tests/vitest/admin-performance.test.ts`; budgets/a11y/degraded states green; targeted browser only for remaining browser-only claims | `evidence/UNIT-015-receipt.md`; budget regression or browser-only interaction gap returns to owning unit |
| UNIT-016 | complete local diff, migrations, runbooks, plan/consumer receipts | independent verifier; local release candidate only; no hosted/release claim | `bun run validate && bun run validate:error-handling && bun run ops:agent-debug-snapshot`; clean validation, replay/secret/PII/route evidence current | `evidence/UNIT-016-receipt.md`; any unclassified failure reopens owning unit |
| UNIT-017 | deployed Worker/D1 plus new notification Queue/DLQ proposal, Cron, observability/support proof surfaces | provider verifier; required core hosted proof; no action before AUTH-005/deploy gate | execute the source-matched queue provision/deploy/unblock packet, hosted notification fault matrix, `bun run ops:check-observability`, and `bun run launch:check-support-monitoring`; all required artifacts current | `evidence/UNIT-017-receipt.md`; missing authority, paid-plan need, wrong account, or failed rollback keeps BLOCKED |
| UNIT-018 | Cloudflare Email/email-to-ticket/Access/analytics, GA4, Clarity applicability records | provider verifier; optional slices independently; no synthetic proof | per-provider official preflight and proof command from its applicability receipt; enabled proof PASS or disabled `N/A` with no exposed claim | `evidence/UNIT-018-receipt.md`; required-but-uncredentialed becomes `blocked_required` |
| UNIT-019 | release gates, canary, rollback, support/incident ownership, all requirement receipts | independent verifier/release owner; cutover/audit only; no implementation shortcuts | `CLOUDFLARE_RELEASE_REQUIRE_PRODUCTION=1 bun run cf:release-gates` plus requirement audit and rollback drill; production cutover and every applicable claim green | `evidence/UNIT-019-receipt.md`; stale evidence, open critical risk, or failed canary rolls back and reopens unit |

## Suggested Execution Staffing

- **Lead / architect, high reasoning:** owns goal, overlap receipts, data semantics, unit ordering, manifest, and final claims.
- **Admin foundation executor, medium/high:** UNIT-001 through UNIT-006.
- **Notification domain executor, high:** UNIT-007 through UNIT-010.
- **Operations/support executor, medium/high:** UNIT-011, UNIT-012, UNIT-014.
- **Security/privacy reviewer, high:** UNIT-003, UNIT-006, UNIT-013 and adversarial denials.
- **Test engineer, high:** proof harness, failure injection, scale, accessibility, migration replay.
- **Verifier/critic, high and maker-separated:** UNIT-016 through UNIT-019 completion evidence.

For OMX CLI execution, prefer Team + Ultragoal: Team runs bounded parallel lanes; Ultragoal owns the durable requirement/evidence ledger. Example launch intent: `$ultragoal <this plan path>` plus `$team` with the role allocation above. In Codex App, use native role-specialized subagents and repo ledgers because the runtime workflows are not directly active. `$autoresearch-goal` is not the default follow-up because the deliverable is implementation, not a research evaluator; `$performance-goal` is appropriate only for the bounded performance unit. Ralph is reserved for an explicitly selected sequential verification/fix loop.

## Final Stop Condition

Do not claim the product goal complete until all applicable requirements in doc 15 have matching current evidence, all units are `VERIFIED`, hosted claims have hosted receipts, no required action remains, and release status is evaluated independently of implementation status.
