# First User Activation And Cohort Operations

## Goal capsule

Own and implement `BETA-P0-04`, and contribute the
privacy-safe data contract consumed by the `Beta-Operating-Contract` owner of
`BETA-P1-07`: a true zero-project state with guided
sample/template/blank choices, a non-blocking and reopenable first-estimate
checklist, durable first-value milestones, and an admin-authorized cohort query
that shows where a Beta user stopped.

Status tuple:

`package_status=IMPLEMENTATION_READY`,
`implementation_status=NOT_STARTED`, `release_status=NOT_EVALUATED`,
`plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

`UNIT-001..007` are `READY` in dependency-closed `SLICE-001`; no internal owner
approval or external producer implementation blocks this pack's executable work.
The next executable unit is exactly `UNIT-001`. Missing cross-pack integrations
remain explicit `not_available` release inputs until the program records their
versioned receipts.

## Current state

- `src/components/workshop/projects-page-client.tsx:1947-1956` defines empty
  state only for search or non-All status filters.
- `src/components/workshop/projects-page-client.tsx:3264-3335` renders those two
  recovery states, while `:3422` maps an empty All-tab collection to nothing.
- `src/components/workshop/NewProjectForm.tsx:263-338` creates a project and
  default estimate, but no first-value path follows.
- `src/app/admin/page.tsx:21-43,58-120` renders repository-backed signups,
  incidents, and health probes, but has no activation stage/cohort view.
- `migrations/0005_account_settings.sql:1-37` records account onboarding only;
  it is not a product activation ledger.
- `migrations/0042_support_conversations.sql:4-41` provides a real support state
  source that can be joined without copying message content.

## Target result

An authorized new user can select one of three explicit starts, reach a
persisted non-zero estimate without founder intervention, leave and resume, and
reopen the checklist after completion. Every zero, loading, pending, partial,
denied, error, and recovery state has an action. Server-side milestone writes
are idempotent and occur only after the corresponding domain commit succeeds.
The cohort query exposes stages and support status without email, tokens, IP,
user-agent, free text, or raw event metadata.

## Scope

- true zero-project UI on `/workshop/projects`;
- guided sample, workspace template, and existing blank creation paths;
- typed project type/floor area metadata needed by the checklist;
- server-side activation progress and milestone ledger in D1;
- checklist derivation, dismissal, completion, and reopening from Getting Started;
- first-value and integration milestone producer contract;
- privacy-safe, paginated, admin-only cohort query;
- abandonment/support-state derivation and explicit user recovery.

## Non-goals and ownership boundaries

- no operator dashboard cards, charts, tables, or presentation;
- no general telemetry/provider consent policy, bot governance, external
  analytics, or release decision; `Beta-Operating-Contract` owns those surfaces,
  while this pack owns the activation tables' exact functional basis,
  retention, legal-hold, privacy export, and erasure behavior;
- no Estimate Health implementation; `Estimate-Intelligence-And-Price-Governance`
  owns it and emits `health_reviewed` through this pack's contract;
- no Publisher implementation; `Publisher-And-Shared-Pages` emits publication
  and recipient milestones after its own freeze/implementation;
- no CI, full golden-path orchestration, or cross-browser matrix;
  `Release-Integrity-And-Golden-Path` owns those proofs;
- no long modal wizard, forced completion, automatic customer contact, or
  claim that importing an estimate works.

This pack is the data producer for `BETA-P1-07`, not its primary audit owner.
`Beta-Operating-Contract` owns operator presentation, metric truth, and the
final acceptance of the cohort contract.

## Success and stop condition

Implementation is complete only when all units are verified, the migration and
deny-path tests pass, a new eligible user can create/reopen a persisted
first-value journey, sample data remains visibly labeled, cohort rows are
privacy-minimized, the transactional outbox survives crash/retry/concurrency
cases, and the typed producer/cohort fixtures plus reciprocal receipt schemas
pass locally. External producer and operator-consumer receipt presence is a
`Beta-Readiness-Program` `UNIT-003` integration/release gate, not an Activation
implementation blocker. Release remains unevaluated until the umbrella and
operating/release packs assemble hosted, policy, receipt, and cohort evidence.

## Artifact map

| Artifact | Role |
|---|---|
| `README.md` | Entrypoint, goal, scope, proof boundary |
| `SOURCE_AND_CODEBASE_AUDIT.md` | Source anchors, data/flow audit, current-target delta |
| `REQUIREMENTS_AND_DECISIONS.md` | Requirements, acceptance, decisions, risks |
| `IMPLEMENTATION_PLAN.md` | Sole canonical execution artifact, units, DAG, leases |
| `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` | Test matrix, gates, rollout/rollback, final audit |
| `ZERO_STATE_PATHS_UX_AND_ACCESSIBILITY.md` | True-zero/checklist state, interaction, and accessibility review |
| `ACTIVATION_LEDGER_DATA_LIFECYCLE_AND_IDEMPOTENCY.md` | D1 integrity, outbox state machine, retention, and fix-forward review |
| `MILESTONE_OUTBOX_AND_CROSS_PACK_RECEIPTS.md` | Producer contract, receipt schema, ownership, and freshness review |
| `COHORT_QUERY_ABANDONMENT_AND_SUPPORT_MODEL.md` | Bounded cohort DTO/query, stoppage derivation, and support join review |
| `SECURITY_PRIVACY_RETENTION_AND_ACTOR_MATRIX.md` | Actor/resource denials, credential taxonomy, privacy lifecycle, and logging review |
| `PERFORMANCE_RELIABILITY_AND_OBSERVABILITY.md` | Cardinality evaluators, failure behavior, and redacted signals |
| `TEST_AND_ADVERSARIAL_QA.md` | Proof-first fixtures, negative paths, isolation, and checker plan |
| `ROLLOUT_FIX_FORWARD_AND_COMPLETION_GATE.md` | Staged enablement, stop/fix-forward rules, independent completion gate |
| `LOOP_LEDGER.md` | Append-only execution and resume state |
| `plan-pack.json` | Machine manifest; deliberately excluded from artifacts |

## Resume packet

Start at `IMPLEMENTATION_PLAN.md` `UNIT-001`. Validate the durable Program
`MIGRATION_LEASE_GENERATION.json` generation (currently 11), migration-tail
(currently `0065_activity_history_lifecycle.sql`), owner-manifest,
`0067` allocation, allocation, and receipt digests; re-read all exact paths and
run the existing project creation tests before schema work. A stale, consumed,
missing, or collided allocation blocks source edits. The Program preserves
consumed facts and atomically reissues every affected unconsumed slot; each owner
revalidates before any migration writer resumes. Historical ledger entries
recorded earlier slots (`0051`/`0052`/`0053`/`0054`); those are superseded
receipts — the current authoritative allocation is `0067`.
