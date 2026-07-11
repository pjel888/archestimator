# Overlap, Dependency, and Consumer Receipts

## Contract Rule

This pack may consume current domain contracts but may not duplicate or redefine their ownership. Any integration unit records producer package ID, manifest hash, source revision, consumed IDs/fields/semantics, consumer tests, and stale triggers.

## Activity History Mapping

**Producer owns:** durable domain-event vocabulary, Activity UI/read models, event producer receipts, retention/outbox/legal-hold behavior.  
**Admin owns:** person-level investigation composition, privileged access, source/retention labels, admin-intervention audit.  
**Required receipt:** normalized actor/source/category/occurred-at/redaction/retention contract for the current Activity generation.  
**Forbidden:** copying raw Activity payloads into an admin-owned generic event table without producer contract; changing Activity event labels/types from this pack.

## Beta Operating Contract

**Producer owns:** truthful operator aggregation requirements, source/as-of/availability semantics, current searched-user query repair and session aggregation baseline, operating evidence.  
**Admin owns:** the broader User 360 and manager UX built on that truth.  
**Required receipt:** current query/test revision and confirmation that this pack is not racing the same repair files.  
**Known overlap:** `src/lib/admin/users-repository.ts`, admin user tests, overview metrics.

## Beta Readiness Program

**Producer owns:** migration lease/generation, cross-pack assignment, release/beta readiness.  
**Admin owns:** its own units and receipts.  
**Required receipt:** lease generation, allocated migration numbers, final integration receipt.  
**Forbidden:** hardcoded next migration in this plan.

## Corporate Accounts

**Producer owns:** corporate entity/member/workspace hierarchy, roles, status, owner floor, audited mutations, `/admin/accounts`.  
**Admin owns:** navigation/composition and notification targeting consumption.  
**Required receipt:** versioned read contract for corporate account/status/role membership and recipient eligibility.  
**Forbidden:** redefining roles or duplicating CRUD in notification tables.

## Teamwork Feature

**Producer owns:** workspace/project/estimate access, invitations, member roles, realtime capability, membership mutations, durable Teamwork facts.  
**Admin owns:** User 360 consumption and audience targeting through authorized read predicates.  
**Required receipt:** membership/invitation role read contract and Activity producer receipt.  
**Forbidden:** using notification targeting queries that bypass Teamwork access semantics; absorbing transactional invitation delivery into campaigns.

## Observability and Support Monitoring

**Producer owns:** structured logs, incident records, alert scenarios, hosted proof artifacts, production support/monitoring readiness.  
**Admin owns:** rendering and operator navigation.  
**Required receipt:** artifact schema/version/freshness and no-secret DTO.  
**Forbidden:** treating product campaign notification as alert sink proof or local rows as hosted evidence.

## Better Auth

**External/current dependency owns:** user/session/account schema and session/auth semantics.  
**Admin owns:** read-only safe projections and supported admin/session commands.  
**Required receipt:** installed-version local docs/source plus official Better Auth admin/session docs at implementation time.  
**Decision:** evaluate the official admin plugin for supported ban/session operations, but do not adopt it automatically; current custom roles/profile status/Cloudflare D1 contracts may require bounded custom integration.

## Notification Inbox

**Producer owns:** current-user feed, unread count, release modal, mark read/dismiss/ack, action link validation.  
**Admin manager owns:** campaign control plane, audience, scheduling, fanout, history, metrics, cancellation/retraction.  
**Required receipt:** definition/delivery schema + repository behavior revision; integration tests that admin-produced rows work with all user actions.  
**Forbidden:** a parallel inbox table or client-only campaign state.

## Support

**Producer owns:** conversation/message persistence, transactional reply/email, SupportInbox realtime.  
**Admin enhancement owns:** assignment/SLA/tags/notes/escalation UI and safe schema additions.  
**Forbidden:** mixing support messages with notification campaign content or audience facts.

## Consumer Receipt Template

```text
receipt_id:
producer_package_id:
producer_manifest_sha256:
producer_source_revision:
consumed_contract_ids:
consumed_paths:
consumer_unit_ids:
consumer_tests:
privacy_and_authz_assertions:
stale_triggers:
result: PASS|FAIL|STALE
```

## Planning-Time Producer Receipts

These receipts prove the consumed planning revisions observed on 2026-07-11, not producer implementation completion. `UNIT-001` must recompute every manifest hash, inspect changed paths, and append execution-time receipts before downstream edits. Any mismatch makes the affected receipt `STALE` and blocks its consumer unit.

| Receipt | Producer | Observed manifest SHA-256 | Consumed by | Result |
| --- | --- | --- | --- | --- |
| RCPT-ACTIVITY-001 | `PLAN-2026-07-10-activity-history-mapping` | `b67289ca1a135187b3687f41a5adbb1a41cdb36b77463d8a455a99fadbf0a763` | UNIT-004, UNIT-005, UNIT-013 | PASS for planning revision; execution refresh required |
| RCPT-BETA-OPS-001 | `PLAN-2026-07-10-beta-operating-contract` | `be0a3228e21e36714555b732852b505d26d40709e1cde13fd84bb798f7d2d003` | UNIT-001, UNIT-002, UNIT-014 | PASS for planning revision; shared-file collision check required |
| RCPT-BETA-READY-001 | `PLAN-2026-07-10-beta-readiness-program` | `ebdf9a8edf1cc3ab1f27821354ebdacb99f78d902cf9aafc300be6a04d1d5e73` | UNIT-001, every D1 unit, UNIT-016 | PASS for planning revision; migration lease generation required |
| RCPT-CORPORATE-001 | `PLAN-2026-07-11-corporate-accounts` | `aaf99c5d5ad65fbbd64d7180887857d3f995ef68bf91317bb6353b08e400a351` | UNIT-005, UNIT-008 | PASS for planning revision; read-contract implementation receipt required |
| RCPT-TEAMWORK-001 | `PLAN-2026-07-11-teamwork-feature-audit-and-plan` | `575e10ab696583805cee702af600b2241c0b65fb019d8cb264564b3f49f273aa` | UNIT-005, UNIT-008, UNIT-014 | PASS for planning revision; membership/activity producer receipt required |

The notification inbox, Better Auth, observability, and support contracts are source-owned rather than separate ready producer packs in this baseline. `UNIT-001` records installed/source revisions and focused compatibility tests for them before dependent work. Planning receipt PASS never converts a producer's conditionally-ready or hosted-bound state into implementation proof.

## GATE-OVERLAP-001

The manifest keeps this gate `FAIL` during planning. `UNIT-001` is the only advertised ready unit. It may set the gate `PASS` only after execution-time receipts include current manifest/source hashes, consumed contract IDs/fields, privacy/authz assertions, collision ownership, migration lease generation where applicable, and focused consumer-test commands. A stale/failing Activity receipt blocks UNIT-005/013; Corporate or Teamwork blocks UNIT-005/008/014; Beta Operating collision blocks the named repair paths; Beta Readiness lease failure blocks every D1 unit. Downstream units move from `PLANNED` to `READY` only after their dependency and applicable receipt conditions pass.

## Shared-File Coordination

Before editing an overlap path, re-read `git status --short --branch`, the relevant producer ledger, and current file bytes. First writer owns a collision until handoff. Keep plan and source work on the current branch/worktree; do not create branches/worktrees automatically.
