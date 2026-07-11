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

The ready slice is `UNIT-001`, which pins the owner registry and records
dependency receipts. The program remains conditionally ready because the
implementation packs are not complete and `UNIT-005` cannot decide until the
Release pack independently resolves or fails closed its GitHub, isolated staging,
and production boundaries and Program `AUTH-002` validates the current cohort/
legal decision receipt from Beta Operating `AUTH-003`/`UNIT-009`.

## Target result and stop condition

The program succeeds only when:

1. every P0/P1 item has one primary owner and one evidence destination;
2. each owner pack reports current validator-clean completion evidence;
3. Publisher and Activity delta packets are applied only against
   validator-clean, content-addressed integration receipts whose manifest,
   artifact-set, scoped-diff, and contract hashes still match;
4. the release truth packet preserves the Release pack's `UNIT-007` read-only
   discovery, `UNIT-008` GitHub, `UNIT-009` isolated-staging, and `UNIT-010`
   production-or-no-release receipts as distinct evidence surfaces, alongside
   every other local, provider, operator, and legal gate; and
5. the Beta Operating `AUTH-003`/`UNIT-009` authorized decision receipt covers
   the exact external-Beta scope and Program validates rather than reproduces it.

Authorization IDs are pack-qualified. Program `AUTH-001` consumes the GitHub
receipt produced by Release `AUTH-001`/`UNIT-008`; Release `AUTH-002` gates
staging, Release `AUTH-003` gates production, Beta Operating `AUTH-003`/`UNIT-009`
alone produces the limited-cohort/legal decision, and Program `AUTH-002` is only
its strict receipt-consumer boundary. One receipt never grants another scope.

Planning stops at a valid coordination packet. Execution stops only at a proven
release decision or an evidence-backed authorization/technical blocker. A plan,
worker summary, local build, or one green suite is not a release claim.

## Scope

- exact-once backlog ownership and cross-pack dependency control;
- serialized integration-delta packets for the existing Publisher and Activity packs;
- evidence freshness, release-gate aggregation, and contradiction handling;
- maker/checker separation, leases, restart state, and final audit;
- distinct Release read-only, GitHub, staging, and production receipt packets,
  plus strict Program consumption of the separate Beta Operating cohort/legal
  decision receipt.

## Non-goals

- no product source, test, migration, workflow, provider, or policy edits;
- no duplicate Publisher, Activity, activation, estimate, or release implementation;
- no claim that a plan-ready pack is implemented before its evidence passes;
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

`Activity-History-Mapping` owns no full audit backlog ID. It owns activity-event
contracts consumed by recipient follow-up, while Publisher owns public mutation
and UI behavior. Activity `REQ-008` is deferred to Publisher and `UNIT-007` is
superseded; the content-addressed integration receipt must preserve that boundary.

## BETA-P1-10 Nine-Pack Contributor Matrix

`UNIT-003` and `TEST-004` audit this exact matrix. `REQUIRED` means the pack must
emit a current receipt with caller map, pre-change characterization, bounded
extraction/retention decision, changed files, tests, and verifier result. `N/A`
is an explicit receipt outcome, not an omitted row.

| Pack | Disposition | Owner unit | Caller map and characterization | Decision and required evidence |
|---|---|---|---|---|
| `Activity-History-Mapping` | REQUIRED | `UNIT-006`, final `UNIT-008` | `activity-composer.ts`, copy dictionary, estimate-sheet activity UI; `TEST-012` plus existing composer/filter tests | Retain already-bounded composer/dictionary modules or extract only a proven hotspot; final Activity receipt |
| `Beta-Operating-Contract` | REQUIRED | `UNIT-002`, receipt in `UNIT-006` | Admin page/routes and `src/lib/admin/*`; `TEST-003` real/zero/partial/error/stale/denied fixtures | Extract server aggregation DTO from presentation; operating artifact receipt |
| `Beta-Readiness-Program` | N/A | `UNIT-003` | Coordination artifacts only; scoped changed-file audit | Explicit N/A because the pack edits no product capability; Program maintainability audit row |
| `Calculation-And-Output-Parity` | REQUIRED | `UNIT-006`, final `UNIT-007` | editor/chart/publication/proposal/workbook/print callers; unification oracle, parity suite, `TEST-009` | Bounded calculation/export state extraction; `.ai/99_scratch/calculation-output-parity-final-audit.md` |
| `Estimate-Intelligence-And-Price-Governance` | REQUIRED | `UNIT-007`, final `UNIT-008` | `ProjectDataClient`, `CostComparisonBoard`, health/revision capabilities; chart/Data golden masters and `TEST-009` | Extract typed health/revision capabilities; `.ai/99_scratch/estimate-intelligence-final-audit.md` |
| `First-User-Activation-And-Cohort-Operations` | REQUIRED | `UNIT-002`, `UNIT-004`, final `UNIT-007` | projects page/client, zero-state and checklist islands; `TEST-002`, `TEST-004`, existing project-list fixtures | Extract new zero-state/checklist islands without growing the projects client; Activation final receipt |
| `Hosted-D1-Recovery-And-Data-Resilience` | N/A | `UNIT-005`, final `UNIT-006` | Recovery scripts/runbook only; scoped changed-file and caller scan | Explicit N/A because no product capability component is changed; recovery final receipt |
| `Publisher-And-Shared-Pages` | REQUIRED | `UNIT-003`, final `UNIT-022` | durable decision admission, wizard/roster/share-page components; `tests/vitest/project-publication-decision.test.tsx` plus public/share characterization suites | Retain or extract the characterized D1 admission boundary and bounded user-capability components; Publisher final receipt |
| `Release-Integrity-And-Golden-Path` | N/A | `UNIT-006`, read-only receipt `UNIT-007`, final `UNIT-010` | CI/e2e/release-manifest scripts only; scoped changed-file and caller scan | Explicit N/A because it orchestrates proof rather than product capability UI; preserve distinct `UNIT-008` GitHub, `UNIT-009` staging, and `UNIT-010` production-or-no-release receipts in the final release receipt |

## Migration Generation Receipt

The umbrella serializes all five migration proposals through one aggregate,
content-addressed receipt:

| Slot | Owner pack | Planned migration | Consumption condition |
|---|---|---|---|
| `0055` | `Publisher-And-Shared-Pages` | `0055_publication_foreign_keys.sql` | Current generation/tail/owner-manifest hashes match and slot is unclaimed |
| `0056` | `First-User-Activation-And-Cohort-Operations` | `0056_beta_activation_events.sql` | Current generation/tail/owner-manifest hashes match and slot is unclaimed |
| `0057` | `Estimate-Intelligence-And-Price-Governance` | `0057_estimate_intelligence_inputs.sql` | Current generation/tail/owner-manifest hashes match and slot is unclaimed |
| `0058` | `Calculation-And-Output-Parity` | `0058_estimate_calculation_input_constraints.sql` | Current generation/tail/owner-manifest hashes match, slot is unclaimed, and legacy scan is clean |
| `0059` | `Activity-History-Mapping` | `0059_activity_history_indexes.sql` | Current generation/tail/owner-manifest hashes match and slot is unclaimed |

The durable artifact `MIGRATION_LEASE_GENERATION.json` is part of this pack. It
contains `schema_version`, monotonic `generation`, `observed_at`, sorted
migration-tail SHA-256, five owner package IDs plus manifest file/self digests,
allocation rows with planned paths and `UNCLAIMED` state, per-row and aggregate
allocation SHA-256 values, and a canonical receipt SHA-256. It deliberately omits
the Program manifest digest to avoid a self-cycle. Each owner records the
generation and receipt hash immediately before editing, then validates the entire
receipt and its own unclaimed allocation. Any mismatch blocks the edit.

Creating an expected slot consumes it and stales the current generation for all
remaining slots. The Program emits the next generation with consumed actual
path/hash facts immutable and all unconsumed allocations reissued. Unexpected
collision, rename, migration-tail drift, or owner-manifest drift follows the same
stale/rescan/reissue path. No owner renames another owner's migration.

## Integration Receipt Contract

Publisher and Activity integration is driven only by receipts containing pack
path/package ID, manifest and manifest-self hashes, artifact-set hash, scoped
diff hash, status tuple, exported contract versions, incorporated delta IDs,
validator command/exit, observed timestamp, and canonical receipt hash. A receipt
is valid only when the scoped diff hash is identical immediately before and after
validation and every recorded hash rechecks. Drift makes it stale; Program
recomputes the delta against the new content and never relies on process presence,
human memory, or chat state.

## Artifact map

| Artifact | Role |
|---|---|
| `README.md` | Entrypoint, exact-once owner registry, scope, stop condition |
| `SOURCE_AND_CODEBASE_AUDIT.md` | Current evidence, contradictions, dependency state |
| `REQUIREMENTS_AND_DECISIONS.md` | Requirements, decisions, risks, boundaries |
| `IMPLEMENTATION_PLAN.md` | Sole canonical execution artifact and unit DAG |
| `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` | Gate matrix, proof, rollout/rollback, final audit |
| `LOOP_LEDGER.md` | Durable lease, integration-receipt, resume, and iteration state |
| `MIGRATION_LEASE_GENERATION.json` | Durable five-owner migration generation and content-addressed allocation receipt |
| `OWNERSHIP_REGISTRY_AND_CROSS_PACK_TRACEABILITY.md` | Exact-once registry invariants, relationship types, and traceability checks |
| `DEPENDENCY_DAG_PHASES_AND_RECEIPT_CONTRACTS.md` | Cross-pack phases, receipt envelope, admission, and restart rules |
| `MIGRATION_LEASE_PROTOCOL.md` | Five-owner allocation validation, consumption, collision, and reissue contract |
| `MAINTAINABILITY_AND_INTEGRATION_GATE.md` | `BETA-P1-10` retain/extract receipt and integration review contract |
| `EVIDENCE_FRESHNESS_AND_PROOF_BOUNDARIES.md` | Evidence classes, invalidation, admission, and retention rules |
| `ADVERSARIAL_INTEGRATION_QA.md` | Negative fixture matrix for registry, receipts, leases, DAG, paths, and status |
| `AUTHORIZATION_RELEASE_AND_FINAL_AUDIT.md` | Pack-qualified external boundaries and final go/no-go decision function |
| `plan-pack.json` | Machine-readable manifest; not an artifact record |

## Resume packet

Resume at `IMPLEMENTATION_PLAN.md` `UNIT-001`. Re-read the current manifests of
all owner packs, compare their artifact hashes to the dependency receipt table,
and update only this program folder. Issue an integration delta only from a
stable, validator-clean receipt; otherwise record the exact hash mismatch and
leave the dependent unit `PLANNED`.
