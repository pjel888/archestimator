# Publication Snapshot Data And Compatibility

## Boundary

This artifact isolates the data/compatibility review for `REQ-003`, `SEC-001`,
`AC-007` through `AC-009`, `RISK-002`, `RISK-003`, and UNIT-004. It does not
authorize edits to Publisher-owned issue, recipient, or page contracts.

## Snapshot Write Contract

Publication captures one authorized, saved estimate revision through the
canonical proposal-included calculation adapter. The builder writes an additive
schema/calculation version and only the safe fields needed to reconstruct the
issued public tree:

- public snapshot/node/row identifiers already accepted by the Publisher contract;
- stable ordering and safe labels/descriptions;
- normalized quantity/unit needed for display;
- safe scope status;
- currency and named basis/version;
- canonical stored row totals and aggregate direct/final totals where the
  existing public contract requires them; and
- existing public image references only after URL sanitization.

The snapshot is immutable after publication. Retrying the same create command
must not append rows twice or recalculate an already issued snapshot under a new
version.

## Explicit Exclusion Contract

The public serializer rejects or omits unit/labor rates, misc/adjustment source
inputs when they reveal pricing, supplier/library/component provenance,
confidence/link/internal lifecycle metadata, raw workspace/project/estimate IDs,
private object keys, unsafe URLs, recipient credentials, and application-only
diagnostic fields. `SECURITY_PRIVACY_AND_PUBLIC_ALLOWLIST.md` is the detailed
deny/allow review surface.

## Read Compatibility Matrix

| Snapshot | Read behavior | Forbidden behavior |
|---|---|---|
| Current version | Validate schema, sum each stored canonical row once, reconcile named totals | Re-read mutable estimate rows for public total |
| Legacy known version | Render stored `rowTotal`/aggregate under an explicit compatibility basis | Reinterpret rates or infer new scope/charges |
| Unknown version | Typed safe unavailable/compatibility response | Guess field meaning or expose raw JSON |
| Malformed safe field | Reject the affected snapshot response through structured safe error | Partial public tree labeled successful |
| Repeated share reconstruction | Byte-stable ordering/membership/total | Duplicate rows or charges |

## Consistency And Concurrency

- Snapshot construction uses one captured persisted revision; unsaved client state
  cannot leak into publication.
- Share reconstruction is pure over the immutable snapshot and does not query
  current internal rate/provenance rows.
- A concurrent edit after snapshot capture changes only a later publication.
- Publisher identity/version fields remain owned by the Publisher pack. If its
  current contract already provides equivalent calculation fields, UNIT-004
  adopts them instead of adding a parallel shape.
- Shared-file edits begin only after validating the Publisher manifest, scoped
  diff, contract versions, changed-file inventory, and receipt hash.

## Proof And Failure Response

`TEST-004` covers current/legacy snapshots, exact included membership, one-time
aggregation, and sanitizer behavior. `TEST-008` covers unknown/malformed version,
unsafe URL/internal fields, invalid currency/number, cross-workspace/public-ID
confusion, and raw JSON leakage. Any sanitizer or authorization failure blocks
UNIT-005/006 and is returned to UNIT-004; no workbook or print proof can override
a public-data failure.

Handback includes fixture/version, captured revision, public fields observed,
expected membership/total, receipt hash, and whether the defect is builder,
sanitizer, compatibility, or reconstruction owned.

