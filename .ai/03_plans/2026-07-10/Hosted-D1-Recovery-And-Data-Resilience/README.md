# Hosted D1 Recovery And Data Resilience

## Outcome

Prove that a recent hosted Archestimator D1 export can be restored into an isolated disposable D1 target, passes schema/data/authz/application checks, and yields a measured, repeatable recovery artifact without risking the bound production database. This pack owns `BETA-P0-03`.

## Status

| Field | Value |
| --- | --- |
| Package | `CONDITIONALLY_READY` |
| Implementation | `NOT_STARTED` |
| Release | `BOUNDARY` |
| Lifecycle | `ACTIVE` |
| Action ceiling | `IMPLEMENT_LOCAL` |
| Next unit | `UNIT-001` |
| Canonical execution artifact | `IMPLEMENTATION_PLAN.md` |

The local gate/schema/orchestration slice is executable. Creating and destroying a disposable hosted D1 database and Worker, exporting hosted data, and running a controlled hosted write require the explicit packet in `AUTH-001` because the standing repository mandate covers only resources already bound in `wrangler.jsonc`.

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

- `Beta-Operating-Contract` owns incident severity, operator/support roster, auth residual-risk decision, and production communication.
- `Release-Integrity-And-Golden-Path` consumes the current recovery artifact and enforces its freshness.
- `Activity-History-Mapping` owns user-facing history/restore semantics, not disaster recovery.
- This pack exclusively owns changes to the D1 restore evidence producer, restore-readiness predicates, hosted recovery orchestration, integrity/authz probes, and recovery runbook.

## Critical Path

`UNIT-001 -> UNIT-002 -> UNIT-003 -> UNIT-004 -> UNIT-005 -> UNIT-006`

Units 001 through 005 are the local ready slice. `UNIT-006` is blocked by `AUTH-001` and is the only unit allowed to create/mutate disposable hosted resources.

## Artifact Map

- `SOURCE_AND_CODEBASE_AUDIT.md`: current false-positive and provider constraints.
- `REQUIREMENTS_AND_DECISIONS.md`: requirements, decisions, risks, and exact authorization packet.
- `IMPLEMENTATION_PLAN.md`: executable recovery units and resource boundaries.
- `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`: integrity/authz matrix, rehearsal, rollback, and completion gate.
- `LOOP_LEDGER.md`: append-only run state.
- `plan-pack.json`: machine-readable readiness and traceability.

## Restart Packet

1. Re-read `wrangler.jsonc` and confirm the bound D1 remains `ARCH_DB` / `archestimator-proof-db`.
2. Run `git status --short --branch`; preserve concurrent work.
3. Validate this pack, then start `UNIT-001` by adding failing regression fixtures for local-only/provider-false evidence.
4. Do not create, export, import, deploy, restore, or destroy a hosted resource until `AUTH-001` is resolved for the exact named target/account/commands.
5. Append every command, redacted result, cleanup state, and next action to `LOOP_LEDGER.md`.

Stop only when the release gate fails closed on non-provider proof, a current isolated hosted rehearsal passes every integrity/application/authz check, session treatment is explicit, RTO/RPO are measured, and disposable resources are confirmed destroyed. Plan validation alone proves none of these runtime claims.
