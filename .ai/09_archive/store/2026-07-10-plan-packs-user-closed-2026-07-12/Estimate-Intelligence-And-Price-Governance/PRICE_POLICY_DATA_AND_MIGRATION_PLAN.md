# Price Policy Data And Migration Plan

## Boundary

This is the D1/data-integrity review for `DATA-001`, `DATA-002`, `AC-007` through
`AC-010`, `RISK-002`, `RISK-003`, and UNIT-002. It plans local implementation
only and does not prove or authorize a hosted D1 mutation.

## Lease And Ordering Contract

The candidate path is
`migrations/0055_estimate_intelligence_inputs.sql`, owned only after UNIT-002
validates the current durable Program receipt at
`../Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json`. Validation covers
generation, migration-tail digest, all five owner manifest/self hashes, the
0053..0057 allocation set, this exact path, allocation digest, and canonical
receipt digest.

As of the 2026-07-11 improve pass, the Program receipt is generation 4 with tail
`0052_corporate_accounts.sql`, while the live migration tail has advanced to the
untracked `migrations/0053_corporate_account_owner_integrity.sql`. UNIT-002 must
consume a Program generation-5 receipt covering the `0053` tail before any
migration edit. The `0055` allocation remains `UNCLAIMED` in the current receipt.

Any tail, owner manifest, filename, status, allocation, or digest mismatch
prohibits the edit and requires Program reissue. Consumption/collision stales the
generation for every unconsumed owner. This pack never selects a replacement
number unilaterally.

## Additive Schema Contract

### Project analytical inputs

Add nullable typed project columns for project type, gross floor area/unit,
phase, market region, target budget/basis date, and procurement status. Numeric
fields are non-negative; area unit is a closed safe enum; dates receive runtime
ISO-date validation. Null means unknown. Migration and reads invent no values.

### Freshness policy

`workspace_price_freshness_policies` has workspace ID, optional category ID,
stale/very-stale days, revision, actor, and timestamps. It enforces one workspace
default, at most one workspace/category override, positive stale days, and
`very_stale_days > stale_days`. No row means the compatible 90/180 fallback.

### Provenance origin

Both `estimate_row_items` and `estimate_template_row_items` gain nullable checked
`pricing_provenance_origin` with the four-value domain. Legacy rows remain null;
product writers set/preserve origin before fallback. Public serialization remains
unchanged and must not expose this internal marker.

### Forward revision facts

Append-only `estimate_revision_facts` keys each event fact by stable
`(event_id, ordinal)` and stores workspace/project/estimate identity, fact kind,
target row, occurred time, canonical before/after money inputs, scope/node/
tombstone references, and completeness/schema version. Facts and their Activity
event commit atomically; batches split only at complete-event boundaries.

## Producer Completeness

`tests/vitest/estimate-row-provenance-producers.test.ts` is the executable registry
for library insertion, estimate/tab copy, deleted-subtree restore, unsupported
row restore, template author/copy, reusable-source copy, every AI row/template/
package path, operational proof writers, and direct seed/test writers. Product
creation determines origin once; copy/restore preserves it byte-for-byte;
unsupported restore stays unavailable; non-product writers declare synthetic or
deliberate legacy-null behavior.

The revision producer fixture independently covers row, adjustment, template/
subtree, and AI package mutation. A new writer absent from either registry is a
test failure, not an implicit compatibility case.

## Migration Proof Matrix

| Case | Required result |
|---|---|
| Clean temp D1 apply | All columns/tables/constraints/indexes present |
| Existing legacy rows | Null-safe reads; no origin/analytical values invented |
| New/edited project | Typed values round-trip through authorized actions/repositories |
| Valid/invalid policy | Constraint/runtime validation and tenant predicate agree |
| Provenance producer | Exact persisted origin before any display fallback |
| Event/fact mutation | Event and complete ordinal facts commit or roll back together |
| Replay twice | Second apply has no pending destructive work and remains green |
| Cross-workspace access | Existing denial/not-found behavior; no IDs/counts leak |
| Failure midway | Transaction/batch leaves no partial event/fact or false receipt |

Rollback is fix-forward: disable reads/UI consumption while retaining additive
columns/tables and writes needed for compatibility. Destructive column removal or
heuristic historical backfill is prohibited. The local receipt records migration
and Program receipt hashes, schema/query results, fixture cleanup, and exact
failure response; hosted application remains a separate release boundary.
