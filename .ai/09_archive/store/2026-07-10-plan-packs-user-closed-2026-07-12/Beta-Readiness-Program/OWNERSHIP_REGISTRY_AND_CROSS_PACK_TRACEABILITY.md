# Ownership Registry And Cross-Pack Traceability

## Authority

`README.md` is the canonical human-readable owner registry and
`plan-pack.json` is the machine-readable state authority. This artifact defines
how that registry is checked and changed; it does not create a second registry.
`IMPLEMENTATION_PLAN.md` remains the sole execution authority.

## Exact-Once Invariants

The `REQ-001` / `AC-001` contract is satisfied only when all of these statements
are true in the same frozen workspace state:

1. the set of primary keys is exactly `BETA-P0-01..10` plus `BETA-P1-01..10`;
2. every key has one and only one primary owner package;
3. every owner package path exists and its manifest validates;
4. each row names an evidence destination owned by that package or by the
   Program aggregation unit;
5. contributor, dependency, and proof-consumer relationships do not create a
   second primary owner; and
6. the Program owns `BETA-P1-10` as a cross-pack evidence gate, not as a product
   implementation lane.

An exact ID-set check is required in addition to duplicate-count checks. A
mutation that removes one ID and duplicates another can preserve a row count of
20 while violating the contract.

## Relationship Types

| Relationship | Meaning | May implement the backlog outcome? | Required receipt |
|---|---|---:|---|
| primary owner | accountable package for the backlog result | yes | owner final receipt |
| contributor | supplies a bounded contract or signal | only its owned contribution | versioned producer receipt |
| dependency | must complete before a consumer unit can start | no | dependency receipt |
| proof producer | runs the evidence-producing procedure | no ownership implication | content-addressed evidence receipt |
| proof consumer | evaluates a receipt against a gate | no | aggregation decision |

Activity is a contributor to recipient follow-up event semantics; Publisher is
the primary owner of the public mutation and UI behavior. Activation produces
privacy-safe cohort facts; Beta Operating owns their operator presentation. The
Release pack aggregates cross-surface proof without becoming the primary owner
of the underlying product behavior.

## Out-Of-Suite Capability Boundary

The dated `2026-07-11/Corporate-Accounts` folder is not one of this Program's
nine validated owner packs and receives no `BETA-P*` row, owner transfer, or
readiness credit here. Its current missing manifest and unresolved role model
make it `NOT_READY` for release composition. If any Corporate source is present
in a release candidate, Release `REQ-008` must consume a current validated
Corporate receipt; if absent, Release records a content-addressed candidate
exclusion disposition. Corporate membership, role, and workspace linkage never
change the canonical workspace or platform authorization contracts by virtue of
this Program.

## Change Protocol

Any owner-registry change must be performed by `UNIT-001` and must:

1. state the reason and the affected audit IDs;
2. prove that the new primary package owns the implementation and final evidence
   surface;
3. update the canonical README row and all dependency/receipt references;
4. rerun the exact set, duplicate, missing-owner, path, and reciprocal-reference
   checks;
5. invalidate the prior dependency receipt and release truth packet; and
6. append the before/after digest and result to `LOOP_LEDGER.md`.

No worker summary, chat message, matching numeric ID, or copied table authorizes
an ownership transfer.

## Traceability Check

For each registry row, the checker resolves this chain:

`audit ID -> primary package -> accepted requirement -> implementation unit -> acceptance criterion -> test/gate -> evidence destination`

The check fails on an orphan, a nonexistent package/unit/test, a package whose
manifest is not current, a proof destination outside the declared package, or a
receipt whose claim is broader than its proof surface. The output is stored in
the `UNIT-001` dependency receipt and later consumed by `UNIT-004`.

## Ownership Boundaries

- This Program may update only Program planning/aggregation artifacts.
- Capability packages own product, data, provider, and workflow implementation.
- Publisher and Activity deltas require stable content-addressed receipts and
  serialized handback.
- Migration numbers are coordination resources governed by
  `MIGRATION_LEASE_PROTOCOL.md`, not ownership evidence.
- External authorization remains governed by
  `AUTHORIZATION_RELEASE_AND_FINAL_AUDIT.md`.

## Recheck Triggers

Re-run the full traceability check when an audit row, package ID/path, owner
manifest, requirement/unit/test mapping, contributor contract version, or
release-evidence destination changes. A current row count alone is never enough.
