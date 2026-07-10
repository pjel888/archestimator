# First User Activation And Cohort Operations

## Goal capsule

Own and implement `BETA-P0-04`, and contribute the
privacy-safe data contract consumed by the `Beta-Operating-Contract` owner of
`BETA-P1-07`: a true zero-project state with guided
sample/template/blank choices, a non-blocking and reopenable first-estimate
checklist, durable first-value milestones, and an admin-authorized cohort query
that shows where a Beta user stopped.

Status tuple:

`package_status=CONDITIONALLY_READY`,
`implementation_status=NOT_STARTED`, `release_status=NOT_EVALUATED`,
`plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

`UNIT-001..004` are `READY` in dependency-closed `SLICE-001`. `UNIT-005/006`
remain `PLANNED` until the external producer/query contracts are frozen, and
`UNIT-007` is `BLOCKED` until those consumers accept the contract. The next
executable unit is `UNIT-001`.

## Current state

- `src/components/workshop/projects-page-client.tsx:1955-1964` defines empty
  state only for search or non-All status filters.
- `src/components/workshop/projects-page-client.tsx:3272-3342` renders those two
  recovery states, while `:3430` maps an empty All-tab collection to nothing.
- `src/components/workshop/NewProjectForm.tsx:263-338` creates a project and
  default estimate, but no first-value path follows.
- `src/app/admin/page.tsx:12-25,40-43,62,80-87` is placeholder presentation.
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
- no telemetry consent/retention policy, bot governance, external analytics, or
  release decision; `Beta-Operating-Contract` owns those surfaces;
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
privacy-minimized, and external milestone consumers pass the typed contract.
Release remains unevaluated until the umbrella and operating/release packs
assemble hosted, policy, and cohort evidence.

## Artifact map

| Artifact | Role |
|---|---|
| `README.md` | Entrypoint, goal, scope, proof boundary |
| `SOURCE_AND_CODEBASE_AUDIT.md` | Source anchors, data/flow audit, current-target delta |
| `REQUIREMENTS_AND_DECISIONS.md` | Requirements, acceptance, decisions, risks |
| `IMPLEMENTATION_PLAN.md` | Sole canonical execution artifact, units, DAG, leases |
| `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` | Test matrix, gates, rollout/rollback, final audit |
| `LOOP_LEDGER.md` | Append-only execution and resume state |
| `plan-pack.json` | Machine manifest; deliberately excluded from artifacts |

## Resume packet

Start at `IMPLEMENTATION_PLAN.md` `UNIT-001`. Confirm migration number `0051`
is still free, re-read all exact paths, run the existing project creation tests,
then implement the schema/repository contract before UI work. If `0051` was
claimed after this plan was written, stop before source edits. The program lead
must atomically reissue every affected Activation/Estimate/Calculation slot in
the umbrella; each affected pack updates its own references and revalidates
before any migration writer resumes.
