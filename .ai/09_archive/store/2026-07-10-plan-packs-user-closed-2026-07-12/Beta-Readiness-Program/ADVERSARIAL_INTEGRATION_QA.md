# Adversarial Integration QA

## Purpose

This artifact defines the negative tests for Program coordination. Stable test
IDs and scenario baselines are documented here and in
`VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`; current live status remains solely in
`plan-pack.json`. This file owns the adversarial fixture design and expected
failure signals.

## Registry Fixtures

| Fixture | Mutation | Expected rejection |
|---|---|---|
| missing ID | remove one `BETA-P*` row | exact expected-set mismatch |
| duplicate substitution | remove one ID and duplicate another while keeping 20 rows | missing plus duplicate IDs |
| duplicate owner lane | assign the same audit ID to two primary owners | primary-owner cardinality failure |
| nonexistent owner reference | use a missing package/unit/test | path or reciprocal-reference failure |
| contributor promotion | treat Activity contribution as Publisher backlog ownership | canonical owner mismatch |

## Receipt And Contract Fixtures

- Change one owner artifact after receipt generation: reject manifest/artifact-set
  mismatch.
- Change scoped diff between pre- and post-validation reads: reject unstable
  admission.
- Remove an incorporated delta ID or change an exported contract version: reject
  the integration receipt.
- Substitute a Release staging receipt for GitHub or production proof: reject the
  evidence class/scope.
- Substitute a same-numbered `AUTH-*` from another pack: reject the pack-qualified
  boundary ID.
- Remove one `BETA-P1-10` receipt or swap a `REQUIRED`/`N/A` disposition while
  preserving a six/three count: reject the exact package/disposition matrix.

## Migration Generation Fixtures

Reject malformed JSON, zero digests, duplicate numbers, duplicate owners, a
missing fifth owner, path traversal, an allocation outside `migrations/`, an
altered row with a retained digest, migration-tail drift, owner-manifest drift,
or a consumed migration whose file digest differs. A validator that checks only
the allocation count is insufficient.

## DAG And Status Fixtures

- Introduce a unit cycle: fail DAG validation.
- Remove a transitive dependency from the ready slice: fail dependency closure.
- Point `next_unit` to a `PLANNED`, `BLOCKED`, or out-of-slice unit: fail resume
  semantics.
- Mark release ready with active external boundaries: fail status-tuple review.
- Mark a criterion/test `PASS` while its only evidence remains `PLANNED`: fail
  proof-state consistency.
- Add a prose dependency edge absent from the manifest: fail integrated DAG
  comparison.

## Evidence And Path Fixtures

Reject an orphan reference, artifact-byte tamper, manifest self-hash tamper,
evidence tamper followed by `--write`, artifact path traversal, symlink escape,
zero baseline digests used as current evidence, a `COLLECTED` source receipt that
claims future implementation proof, or a source revision that no longer matches
the cited current files.

## Execution Contract

Each negative fixture runs in a disposable copy of the pack or a temporary
cross-pack checker. The expected signal is nonzero exit plus the named semantic
failure. Restore or delete the fixture after each case, never refresh evidence
hashes in place, and record only redacted scenario/result summaries.

`TEST-001..007` still require their positive counterparts. Adversarial rejection
alone does not make the Program ready.
