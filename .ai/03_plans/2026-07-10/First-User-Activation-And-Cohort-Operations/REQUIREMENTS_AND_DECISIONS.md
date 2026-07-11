# Requirements And Decisions

## Requirements and acceptance

### UX-001 - true zero-project choice

When the All tab has no owned projects and no search/filter is active, render an
accessible zero state with exactly three available paths: guided sample,
workspace template, and blank. Search/status empties remain unchanged. Viewer,
loading, pending, partial, error, and recovery states have explicit actions.

`AC-001`: eligible users can keyboard-select each path; a viewer receives a
non-destructive contact-owner state; sample is labeled; no Import control implies
support. Unit `UNIT-002`, test `TEST-002`.

### REQ-001 - reliable path orchestration

Each path uses existing project/estimate/template authorization and mutation
boundaries, is idempotent per submitted attempt, and returns a resumable partial
state if downstream setup fails after project creation.

`AC-002`: sample/template/blank each produce one authorized project and default
estimate; retries do not duplicate; cross-workspace templates/viewers are denied.
Unit `UNIT-003`, test `TEST-003`.

### UX-002 - non-blocking reopenable checklist

The checklist derives completion from authoritative state, can be dismissed,
collapses after completion, and remains reopenable from Getting Started. It
never blocks ordinary editing/navigation and it exposes unavailable/degraded
integration milestones honestly.

`AC-003`: refresh/relogin preserves state; click-only actions cannot fabricate
completion; every incomplete item has a recovery target. Unit `UNIT-004`, test
`TEST-004`.

### DATA-001 - durable idempotent activation ledger

Additive D1 tables store minimal progress, allowlisted milestone events, durable
transactional outbox intents, and server-only retention holds. Events advance
progress monotonically, dedupe replays, survive process failure between domain
commit and delivery, and participate in exact retention, legal-hold, privacy
export/erase, and fix-forward recovery.

`AC-004`: migration constraints/indexes and composite tenant FKs on both
progress and event tables pass;
duplicate/out-of-order events preserve one ledger row per tenant-scoped,
server-derived dedupe key and maximum progress; the same nonce across two
workspaces does not collide; mismatched membership/project/estimate chains and
disallowed metadata are rejected; crash/retry/expired-lease/concurrent-worker
fixtures deliver exactly one event; 180-day event, 30-day delivered-outbox, and
180-day unresolved/dead rules execute; export/erase is atomic and an active hold
fails closed with `skipped_legal_hold`. Unit `UNIT-001`, test `TEST-001`.

### SEC-001 - tenant, role, and privacy boundaries

Every action derives identity server-side, checks workspace/project/template
access, denies viewers from creation, and returns shaped errors. Cohort reads are
server-only and platform-admin-gated. No credential or unbounded personal data
enters events/logs/query output. Corporate-account membership, role, or workspace
linkage is descriptive organization metadata only for this contract: it cannot
replace `workspace_members`, satisfy platform-admin authorization, or change the
tenant identity `(user_id, workspace_id)` used by progress, dedupe, and cohort
queries.

`AC-005`: unauthenticated, viewer, corporate-only owner/team-leader/member/viewer,
corporate-linked-but-not-workspace-member, cross-workspace, mismatched composite
resource chain, forged identity/dedupe key, public recipient, and non-admin
cohort requests fail before unauthorized reads/writes.
Units `UNIT-001`, `UNIT-003`, `UNIT-006`; test `TEST-005`.

### REQ-002 - first-value and external milestone contract

`ACTIVATION-PRODUCER-CONTRACT-v1` accepts the audit sequence, stable dedupe/source fields, and
server-resolved resource identity. Local producers cover project/area/row/total/
export through transactional outbox intent. Estimate Intelligence and Publisher
consume the same frozen contract for their owned milestones without this pack
editing their files; Beta Operating consumes the frozen cohort DTO/query. The
program integration contract records reciprocal receipts without turning an
internal owner acknowledgement into an implementation prerequisite.

`AC-006`: contract tests reject unknown/regressive identity shapes and accept
late/idempotent events; deterministic fixtures cover health, publication/
recipient, and cohort-consumer shapes; `ACTIVATION-PRODUCER-CONTRACT-v1` and receipt schemas
`ACT-RECEIPT-ESTIMATE-HEALTH-v1`, `ACT-RECEIPT-PUBLISHER-v1`, and
`ACT-RECEIPT-COHORT-CONSUMER-v1` validate locally. Receipt presence is checked by
program `UNIT-003`, not by an owner-approval blocker here. Unit `UNIT-005`, test
`TEST-006`.

### PERF-001 - bounded cohort and progress reads

User progress reads use one workspace/user key. Admin cohort reads are paginated,
indexed, capped at 100 rows, use cursor ordering, avoid N+1 queries, and return no
raw event stream/message body.

`AC-007`: 10k-user fixture query plan uses activation indexes and bounded rows;
result schema remains privacy-minimized. Unit `UNIT-006`, test `TEST-007`.

### OPS-001 - abandonment and support handoff

Derive explicit stoppage and support states, expose user retry/resume/cleanup/
support actions, and provide Beta Operations a stable query contract without
automatic outreach or dashboard presentation.

`AC-008`: threshold boundary cases, no-event users, partial setup, open/pending/
resolved support, and clock-controlled transitions are deterministic. Units
`UNIT-006`, `UNIT-007`; test `TEST-008`.

## Decisions

### DEC-AUTO-001 - separate activation domain from account onboarding/activity

Account onboarding completion, estimate activity history, and activation funnel
answer different questions. New tables prevent analytics semantics from leaking
into audit/history or auth data.

### DEC-AUTO-002 - server-derived progress with minimal client state

The server owns path/progress/milestones. Client state owns only open/pending/
focus behavior. This prevents localStorage from becoming truth and keeps resume
across devices.

### DEC-AUTO-003 - persist a real guided sample

The static sample route is insufficient for first-value proof. Create a real,
editable, user-owned project from a versioned safe payload and label it at every
project/estimate surface.

### DEC-AUTO-004 - derive checklist completion from domain facts

Click tracking is rejected. A quantity/source/total/publish item completes only
after the authoritative mutation and event succeeds.

### DEC-AUTO-005 - producer/query ownership, not dashboard ownership

This pack owns event/progress data and the cohort query. `Beta-Operating-Contract`
owns dashboard UI, telemetry policy, outreach, and operating thresholds after
consuming the contract.

### DEC-AUTO-006 - additive migration and fix-forward

Use `0067_beta_activation_events.sql` (Program generation 11, allocation
`activation`) only after the durable Program generation, migration-tail,
owner-manifest, allocation, allocation-set, and receipt digests recheck. The
prior `0054` slot was consumed by `0054_collaboration_pending_invitation_uniqueness.sql`;
the Program has already reissued Activation's allocation to `0067` and historical
ledger entries recording `0051`/`0052`/`0053`/`0054` are superseded receipts. A
missing, stale, consumed, or collided allocation stops the lane and requires a
Program-led atomic reissue of every affected unconsumed Publisher, Activation,
Estimate, Calculation, and Activity slot before source edits. D1 rollback
disables writers/readers and fixes forward; no destructive down script.

### DEC-AUTO-007 - honest integration states

Health and Publisher milestones appear as unavailable until their owner-pack
producer is present. Activation does not fabricate completion or modify active
Publisher/Estimate plan files.

### DEC-AUTO-008 - make milestone delivery durable at the domain commit

Every producer writes an activation outbox intent in the same D1 batch or
owner-domain transaction as its authoritative mutation. A bounded reconciler
claims expiring leases, commits event/progress/delivered state atomically, retries
at 1m/5m/15m/1h/6h through attempt 10, and then exposes `dead` for idempotent
operator repair. Rejected: post-response in-memory retry, because a process crash
can permanently lose a successful milestone.

### DEC-AUTO-009 - freeze activation-specific consent and retention

Activation progress is essential authenticated product state, not optional
provider analytics. Analytics consent withdrawal stops provider emission but
does not fabricate deletion of functional progress. Events retain 180 days,
delivered outbox rows 30 days, unresolved/dead rows at most 180 days, and progress
while membership is active. Privacy/account/membership erasure is atomic unless
an active server-only hold records `skipped_legal_hold`; export omits internal
lease/error/hold-reason fields. Rejected: policy-only declarations with no purge,
hold, export, or erasure implementation owner.

### DEC-AUTO-010 - program receipts replace internal acceptance gates

This pack freezes `ACTIVATION-PRODUCER-CONTRACT-v1`, producer-receipt and
cohort-consumer receipt schemas, plus fixtures. The
program's `UNIT-003` records versioned reciprocal receipts from Estimate,
Publisher, and Beta Operating. Missing receipts preserve `not_available` and
block integration/release truth only; they do not make Activation source work
non-executable. Rejected: making implementation executability depend on internal
reviewer availability.

## Risks

| ID | Risk | Mitigation | Trigger |
|---|---|---|---|
| `RISK-001` | partial sample/template setup leaves orphan project | idempotency key, setup state, resume/delete action, compensation test | any downstream mutation failure |
| `RISK-002` | event delivery is lost or drifts from a committed domain mutation | same-transaction outbox intent, expiring leases, bounded retry/dead repair, atomic event/progress delivery, crash/concurrency tests | pending age, dead row, or milestone without authoritative row |
| `RISK-003` | sample is mistaken for customer estimate | immutable sample version metadata and visible Demo label | label missing on any route/export |
| `RISK-004` | cohort query exposes sensitive data | allowlisted row DTO, admin gate, denial tests, no raw metadata/content | schema/consumer change |
| `RISK-005` | giant Projects client grows further | extract zero state/checklist islands; characterize existing empties | direct inline feature growth |
| `RISK-006` | migration collides in concurrent worktree | stop before edit; program lead atomically reissues every affected later slot and affected packs revalidate all references | new migration consumes Activation's allocated slot (already realized once: `0054` → `0067` reissue) |
| `RISK-007` | cross-pack producer files conflict or internal acceptance blocks execution | publish immutable fixtures; program `UNIT-003` records reciprocal receipts after owner implementation; missing receipt stays unavailable | owner pack still active or manifest/contract hash drift |
| `RISK-008` | abandonment thresholds are treated as telemetry policy | constants are query defaults; Beta Operations owns outreach policy, while Activation owns its table lifecycle | dashboard/outreach policy change |

## Rejected alternatives

- Long onboarding wizard: rejected because it traps experienced users and hides
  the actual product workflow.
- Browser/localStorage-only checklist: rejected because it cannot prove or resume
  durable progress.
- Generic analytics event blob: rejected because privacy, idempotency, and stage
  semantics would be ambiguous.
- Reuse `estimate_sheet_events`: rejected because history/audit retention and
  activation/cohort purpose differ.
- Build the admin dashboard here: rejected by ownership boundary and shared-file
  conflict risk.
- New package/dependency: rejected; current TypeScript/D1/React primitives are
  sufficient.
