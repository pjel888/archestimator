# Dependency DAG, Phases, And Receipt Contracts

## Authority And Purpose

`IMPLEMENTATION_PLAN.md` owns executable unit packets and dependency edges. This
artifact makes the cross-pack phase and receipt contract independently
reviewable. It cannot change `next_unit`, unit status, or the ready slice.

## Program Phases

| Phase | Program unit | Entry condition | Exit receipt | Failure handback |
|---|---|---|---|---|
| registry freeze | `UNIT-001` | current owner manifests available | exact-once registry, dependency, and migration-generation receipt | keep later units `PLANNED`; name missing/stale owner |
| integration deltas | `UNIT-002` | `UNIT-001` receipt rechecks | Publisher and Activity incorporated-delta receipts | recompute delta from current owner content |
| maintainability integration | `UNIT-003` | `UNIT-002` complete and all contributor contracts version-compatible | nine-pack `BETA-P1-10` receipt matrix | return only the failing owner receipt |
| release aggregation | `UNIT-004` | all local owner receipts current | candidate-bound release truth packet and independent final audit | invalidate affected rows and resume at earliest stale producer |
| authorized decision | `UNIT-005` | `UNIT-004` complete plus scoped external receipts | go/no-go decision record | preserve no-go and continuation packets |

The only ready slice at planning close is the dependency-closed `UNIT-001`.
Planning status never advances a phase.

## Common Receipt Envelope

Every cross-pack receipt contains:

- schema and producer version;
- producer package ID and repo-relative package path;
- source revision and observed timestamp;
- producer manifest file SHA-256 and canonical self SHA-256;
- sorted artifact-set SHA-256;
- scoped status/diff SHA-256 before and after validation;
- exported contract name/version and incorporated delta IDs when applicable;
- command/procedure, exit/result, redaction statement, and cleanup result;
- claim IDs and evidence-class boundary; and
- canonical receipt SHA-256.

The receipt is invalid if a before/after scoped digest differs, an artifact path
escapes the package, a manifest does not validate, the contract version is
unknown to the consumer, or the claim exceeds the executed proof surface.

## Dependency Admission Algorithm

1. Resolve the producer by package ID, never by display label alone.
2. Recompute manifest, artifact-set, scoped status, and scoped diff digests.
3. Verify the producer's declared validator command and zero exit.
4. Confirm every referenced unit/test/gate exists in the producer manifest.
5. Confirm contract version and delta IDs match the consumer's declared input.
6. Recompute the canonical receipt digest.
7. Re-read the scoped diff; reject if it changed during admission.
8. Record admission or the exact failed predicate in `LOOP_LEDGER.md`.

Process presence, agent identity, file modification time, and a previously green
summary are not admission evidence.

## Publisher And Activity Serialization

`PUB-DELTA-01..04` and `ACT-DELTA-01..02` are issued only after `UNIT-001` has
frozen both source receipts. Publisher and Activity remain separate owners.
Program integration is serialized because their exported public-review and
activity-event contracts intersect, even when their physical file scopes do not.

The handback packet names the delta IDs, contract versions, exact changed plan
files, validator result, and post-change manifest digest. Any drift returns the
delta to `PLANNED`; it is never merged by inference.

## Restart Rule

Resume at the earliest unit whose input receipt no longer rechecks. Downstream
receipts become `STALE` by dependency, not silently refreshed. If all `UNIT-001`
inputs recheck, resume at the manifest's `next_unit`; otherwise repair only the
failed dependency predicate and regenerate its receipt.
