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

Additive D1 tables store minimal progress and allowlisted milestone events.
Events advance progress monotonically after domain commit, dedupe replays, and
participate in privacy export/erase and fix-forward recovery.

`AC-004`: migration constraints/indexes and composite tenant FKs on both
progress and event tables pass;
duplicate/out-of-order events preserve one ledger row per tenant-scoped,
server-derived dedupe key and maximum progress; the same nonce across two
workspaces does not collide; mismatched membership/project/estimate chains and
disallowed metadata are rejected. Unit `UNIT-001`, test `TEST-001`.

### SEC-001 - tenant, role, and privacy boundaries

Every action derives identity server-side, checks workspace/project/template
access, denies viewers from creation, and returns shaped errors. Cohort reads are
server-only and platform-admin-gated. No credential or unbounded personal data
enters events/logs/query output.

`AC-005`: unauthenticated, viewer, cross-workspace, mismatched composite
resource chain, forged identity/dedupe key, public recipient, and non-admin
cohort requests fail before unauthorized reads/writes.
Units `UNIT-001`, `UNIT-003`, `UNIT-006`; test `TEST-005`.

### REQ-002 - first-value and external milestone contract

The typed producer accepts the audit sequence, stable dedupe/source fields, and
server-resolved resource identity. Local producers cover project/area/row/total/
export. Estimate Intelligence and Publisher consume the same contract for their
owned milestones without this pack editing their active files.

`AC-006`: contract tests reject unknown/regressive identity shapes and accept
late/idempotent events; owner-accepted consumer fixtures cover health and
publication/recipient milestones. Unit `UNIT-005`, test `TEST-006`.

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

Use `0051_beta_activation_events.sql`, subject to pre-edit collision check. A
collision stops the lane and requires a program-led atomic reissue of every
affected Activation/Estimate/Calculation slot and pack reference before source
edits. D1 rollback disables writers/readers and fixes forward; no destructive
down script.

### DEC-AUTO-007 - honest integration states

Health and Publisher milestones appear as unavailable until their owner-pack
producer is present. Activation does not fabricate completion or modify active
Publisher/Estimate plan files.

## Risks

| ID | Risk | Mitigation | Trigger |
|---|---|---|---|
| `RISK-001` | partial sample/template setup leaves orphan project | idempotency key, setup state, resume/delete action, compensation test | any downstream mutation failure |
| `RISK-002` | event writes drift from domain commits | post-commit producer helper, idempotent retry, contract tests | milestone without authoritative row |
| `RISK-003` | sample is mistaken for customer estimate | immutable sample version metadata and visible Demo label | label missing on any route/export |
| `RISK-004` | cohort query exposes sensitive data | allowlisted row DTO, admin gate, denial tests, no raw metadata/content | schema/consumer change |
| `RISK-005` | giant Projects client grows further | extract zero state/checklist islands; characterize existing empties | direct inline feature growth |
| `RISK-006` | migration collides in concurrent worktree | stop before edit; program lead atomically reissues every affected later slot and affected packs revalidate all references | new `0051` appears |
| `RISK-007` | cross-pack producer files conflict | publish typed contract; owners wire after freeze; program receipts | owner pack still active |
| `RISK-008` | abandonment thresholds are treated as telemetry policy | constants are query defaults; Beta Operations owns outreach/policy | dashboard/retention decision |

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
