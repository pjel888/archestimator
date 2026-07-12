# Hosted D1 Recovery And Data Resilience

> **Current execution contract:** Read AGENTIC_EXECUTION_PROFILE.md before
> implementation. It applies the current lean agent workflow and User Test
> Authorization Gate to all older execution, testing, browser, validation, and
> reviewer language in this pack without changing product scope or status.
>
> **Freshness:** CURRENT_SOURCE_AND_READINESS_AUDIT.md is the authoritative
> 2026-07-12 source-drift and individual readiness verdict. Older line numbers,
> migration tails, and active-pack locations are historical navigation only.

## Outcome

Prove that a recent hosted Archestimator D1 export can be restored into an isolated disposable D1 target, passes schema/data/authz/application checks, and yields a measured, repeatable recovery artifact without risking the bound production database. This pack owns `BETA-P0-03`.

## Status

| Field | Value |
| --- | --- |
| Package | `IMPLEMENTATION_READY` |
| Implementation | `NOT_STARTED` |
| Release | `BOUNDARY` |
| Lifecycle | `ACTIVE` |
| Action ceiling | `EXTERNAL_ACTIONS` |
| Next unit | `UNIT-001` |
| Canonical execution artifact | `IMPLEMENTATION_PLAN.md` |

The local gate/schema/orchestration slice is executable. Creating and destroying a disposable hosted D1 database and Worker, exporting hosted data, and running a controlled hosted write require the explicit packet in `AUTH-001` because the standing repository mandate covers only resources already bound in `wrangler.jsonc`.

The `high-blast-radius` profile is proportionate because this pack crosses
provider mutation, encrypted data/export lifecycle, schema and application
integrity, bearer-equivalent sessions, temporary ingress security, measured
recovery performance, incident response, and destructive cleanup. The domain
artifacts below support independent review; they do not create another execution
plan or provider authority.

## Scope

- Make release/readiness gates reject `localOnly:true` or `providerBacked:false` restore artifacts.
- Produce a versioned hosted-rehearsal evidence schema and redacted runbook.
- Export the authorized hosted source, import into an isolated disposable D1 database, and verify migration/schema/data integrity.
- Bind a disposable Worker/environment to the restore target and verify protected reads, denials, isolation, and one controlled write.
- Decide and prove post-restore session invalidation because restored D1 data can contain bearer-equivalent session rows.
- Record RTO/RPO, operator actions, artifact freshness, rollback, and cleanup/destruction.

## Non-goals

- Running destructive Time Travel on `ARCH_DB` during planning or the first rehearsal.
- Claiming the current local SQLite rehearsal is provider-backed.
- Creating paid Cloudflare resources, extending retention with paid features, or touching another account/project.
- Designing application-level row revision/history restore, owned by `Activity-History-Mapping`.
- Treating a successful SQL import as sufficient application or authorization proof.

## Dependencies And Ownership

- `Beta-Operating-Contract` owns incident severity, operator/support roster, auth residual-risk decision, and production communication; it consumes `D1-RECOVERY-RECEIPT-v1` and never reruns recovery.
- `Release-Integrity-And-Golden-Path` consumes `D1-RECOVERY-RECEIPT-v1` and enforces its schema, identity, revision, freshness, result, and cleanup state.
- `Activity-History-Mapping` owns user-facing history/restore semantics, not disaster recovery.
- This pack exclusively owns changes to the D1 restore evidence producer, restore-readiness predicates, hosted recovery orchestration, integrity/authz probes, and recovery runbook.

## Critical Path

`UNIT-001 -> UNIT-002 -> UNIT-003 -> UNIT-004 -> UNIT-005 -> UNIT-006`

Units 001 through 005 are the local ready slice. `UNIT-006` is blocked by `AUTH-001` and is the only unit allowed to create/mutate disposable hosted resources.

## Artifact Map

Core authority:

- `plan-pack.json`: machine-readable status, stable IDs, paths, hashes, DAG, and evidence index.
- `README.md`: execution entrypoint and restart packet.
- `SOURCE_AND_CODEBASE_AUDIT.md`: current false-positive, source evidence, official constraints, and freshness.
- `REQUIREMENTS_AND_DECISIONS.md`: human-readable requirement, criterion, decision, risk, and authorization planning baseline; live record state remains solely in `plan-pack.json`.
- `IMPLEMENTATION_PLAN.md`: sole canonical execution artifact with unit packets and resource boundaries.
- `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`: human-readable test/gate planning baseline and completion audit; live status remains solely in `plan-pack.json`.
- `LOOP_LEDGER.md`: append-only run, supersession, and resume state.

Independent review surfaces:

- `PROVIDER_CAPABILITY_AND_CONSTRAINTS.md`: official capability/limit interpretation, identity, and provider failure model.
- `RECOVERY_ARTIFACT_SCHEMA_AND_DATA_INTEGRITY.md`: receipt fields, integrity layers, data/secret lifecycle, and strict consumers.
- `RESTORE_ORCHESTRATION_AND_DISPOSABLE_INGRESS_THREAT_MODEL.md`: phase order, resource leases, signed ingress, denials, and crash cleanup.
- `SESSION_AUTHZ_AND_APPLICATION_INTEGRITY_PROOF.md`: offline session invalidation, actor/resource matrix, app proof, and controlled write.
- `RTO_RPO_PERFORMANCE_AND_FAILURE_MODEL.md`: measured timing definitions, evaluators, thresholds, and recovery responses.
- `PROVIDER_REHEARSAL_TEST_PLAN.md`: applicability plus local, dry-run, provider, cleanup, and failure-response scenarios.
- `RUNBOOK_ROLLBACK_CLEANUP_AND_INCIDENT.md`: preflight, checkpoints, rollback/fix-forward, absence inventory, and handback.
- `AUTHORIZATION_PACKET_AND_FINAL_AUDIT.md`: exact external boundary, denials, requirement audit, and distinct-verifier contract.

## Restart Packet

1. Re-read `wrangler.jsonc` and confirm the bound D1 remains `ARCH_DB` / `archestimator-proof-db`.
2. Run `git status --short --branch`; preserve concurrent work.
3. Validate this pack, then start `UNIT-001` by adding failing regression fixtures for local-only/provider-false evidence.
4. Do not create, export, import, deploy, restore, or destroy a hosted resource until `AUTH-001` is resolved for the exact named target/account/commands.
5. Append every command, redacted result, cleanup state, and next action to `LOOP_LEDGER.md`.

Stop only when the release gate fails closed on non-provider proof, a current isolated hosted rehearsal passes every integrity/application/authz check, session treatment is explicit, RTO/RPO are measured, and disposable resources are confirmed destroyed. Plan validation alone proves none of these runtime claims.
