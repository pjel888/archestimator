# Beta Readiness Program

## Goal capsule

This pack is the coordination-only umbrella for closing the external-Beta
backlog defined in
`.ai/02_audits/archestimator_beta_readiness_audit_2026-07-10.md:746-774`.
It assigns every `BETA-P0-*` and `BETA-P1-*` item to exactly one implementation
pack, controls cross-pack sequencing, aggregates evidence, and makes the final
go/no-go decision packet reviewable. It does not implement application,
infrastructure, provider, or GitHub changes.

Current status tuple:

`package_status=CONDITIONALLY_READY`,
`implementation_status=NOT_STARTED`, `release_status=BOUNDARY`,
`plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

The ready slice is `UNIT-001`, which freezes the owner registry and records
dependency receipts. The program remains conditionally ready because the
implementation packs are not complete and `UNIT-005` is blocked by real
external authorization boundaries for hosted GitHub controls and legal approval.

## Target result and stop condition

The program succeeds only when:

1. every P0/P1 item has one primary owner and one evidence destination;
2. each owner pack reports current validator-clean completion evidence;
3. Publisher and Activity delta packets are applied only after their active
   planning agents freeze and hand back their manifests;
4. the release truth packet proves every local, hosted, provider, operator, and
   legal gate separately; and
5. an authorized owner records the external-Beta decision.

Planning stops at a valid coordination packet. Execution stops only at a proven
release decision or an evidence-backed authorization/technical blocker. A plan,
worker summary, local build, or one green suite is not a release claim.

## Scope

- exact-once backlog ownership and cross-pack dependency control;
- serialized circle-back packets for the existing Publisher and Activity packs;
- evidence freshness, release-gate aggregation, and contradiction handling;
- maker/checker separation, leases, restart state, and final audit;
- authorization packets for GitHub hosted controls and legal approval.

## Non-goals

- no product source, test, migration, workflow, provider, or policy edits;
- no duplicate Publisher, Activity, activation, estimate, or release implementation;
- no claim that either existing `NOT_READY/NOT_STARTED` pack is implemented;
- no deployment, protected-branch mutation, or legal approval by this pack;
- no operator dashboard, telemetry taxonomy, or product UX ownership.

## Owner registry

The table below is the sole primary-owner registry. Each audit ID appears once.
Dependencies and contributors do not become co-owners.

| Audit ID | Primary owner pack | Program contract |
|---|---|---|
| `BETA-P0-01` | `Release-Integrity-And-Golden-Path` | Active CI, required checks, passed-SHA deploy provenance |
| `BETA-P0-02` | `Release-Integrity-And-Golden-Path` | Deterministic staging golden path and hosted smoke |
| `BETA-P0-03` | `Hosted-D1-Recovery-And-Data-Resilience` | Provider-backed D1 restore rehearsal |
| `BETA-P0-04` | `First-User-Activation-And-Cohort-Operations` | Zero state and first-value journey |
| `BETA-P0-05` | `Calculation-And-Output-Parity` | Screen/share/XLSX parity fixtures |
| `BETA-P0-06` | `Beta-Operating-Contract` | Production telemetry governance and approval |
| `BETA-P0-07` | `Beta-Operating-Contract` | Incident, rollback, and support operating contract |
| `BETA-P0-08` | `Beta-Operating-Contract` | Auth residual-risk decision and revocation proof |
| `BETA-P0-09` | `Beta-Operating-Contract` | Limited-cohort legal gate and wider-launch boundary |
| `BETA-P0-10` | `Release-Integrity-And-Golden-Path` | Generated release truth manifest |
| `BETA-P1-01` | `Estimate-Intelligence-And-Price-Governance` | Estimate Health cockpit |
| `BETA-P1-02` | `Estimate-Intelligence-And-Price-Governance` | Warning/chart drill-through |
| `BETA-P1-03` | `Estimate-Intelligence-And-Price-Governance` | Revision intelligence |
| `BETA-P1-04` | `Publisher-And-Shared-Pages` | Snapshot-versioned Publisher funnel delta |
| `BETA-P1-05` | `Publisher-And-Shared-Pages` | Recipient matrix and follow-up delta |
| `BETA-P1-06` | `Publisher-And-Shared-Pages` | Proposal issue identity delta |
| `BETA-P1-07` | `Beta-Operating-Contract` | Operator presentation and truth contract; Activation supplies the privacy-safe cohort data contract |
| `BETA-P1-08` | `Estimate-Intelligence-And-Price-Governance` | Price freshness governance |
| `BETA-P1-09` | `Release-Integrity-And-Golden-Path` | Integrates browser/recovery proof; Publisher supplies its public-review contribution |
| `BETA-P1-10` | `Beta-Readiness-Program` | Cross-pack capability extraction policy and evidence gate only |

`Activity-History-Mapping` owns no full audit backlog ID. It is an existing,
read-only dependency owner for recipient follow-up interaction primitives and
activity-event contracts. Its `REQ-008`/`UNIT-007` must be reconciled by a
circle-back packet before Publisher can close the recipient-matrix audit item.

## Provisional migration lease order

The umbrella serializes the three concurrent migration proposals. These are
reservations, not permission to skip a current-tail scan:

| Provisional slot | Owner pack | Planned migration | Start condition |
|---|---|---|---|
| `0050` | `Publisher-And-Shared-Pages` | `0050_publication_foreign_keys.sql` | Publisher lease remains current |
| `0051` | `First-User-Activation-And-Cohort-Operations` | `0051_beta_activation_events.sql` | `0050` still belongs to Publisher and no source file has claimed `0051` |
| `0052` | `Estimate-Intelligence-And-Price-Governance` | `0052_estimate_intelligence_inputs.sql` | `0050/0051` leases are current and no source file has claimed `0052` |
| `0053` | `Calculation-And-Output-Parity` | `0053_estimate_calculation_input_constraints.sql` | `0050..0052` leases are current, the legacy invalid-row scan is clean, and no source file has claimed `0053` |

Immediately before the first migration edit, the owning lane must re-scan
`migrations/`, all four migration-owner pack ledgers, and active file leases. A collision
invalidates every later provisional slot; the program lead reissues the sequence
and each affected pack updates all references before source work begins.

## Artifact map

| Artifact | Role |
|---|---|
| `README.md` | Entrypoint, exact-once owner registry, scope, stop condition |
| `SOURCE_AND_CODEBASE_AUDIT.md` | Current evidence, contradictions, dependency state |
| `REQUIREMENTS_AND_DECISIONS.md` | Requirements, decisions, risks, boundaries |
| `IMPLEMENTATION_PLAN.md` | Sole canonical execution artifact and unit DAG |
| `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` | Gate matrix, proof, rollout/rollback, final audit |
| `LOOP_LEDGER.md` | Durable lease, handoff, resume, and iteration state |
| `plan-pack.json` | Machine-readable manifest; not an artifact record |

## Resume packet

Resume at `IMPLEMENTATION_PLAN.md` `UNIT-001`. Re-read the current manifests of
all owner packs, compare their artifact hashes to the dependency receipt table,
and update only this program folder. If an implementation pack is still being
edited, record its state as unfrozen and do not issue its circle-back delta.
