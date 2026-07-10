# Migration Lease Protocol

## Scope

This protocol governs the five provisional migration allocations `0053..0057`
for Publisher, Activation, Estimate Intelligence, Calculation Parity, and
Activity History. It coordinates planning ownership only. It does not create a
migration, mutate D1, or grant provider authority.

The durable machine-readable generation is
`MIGRATION_LEASE_GENERATION.json`. `README.md` names the human-readable slot
mapping; this artifact defines validation, consumption, and reissue semantics.

## Generation Invariants

A valid generation contains:

- `schema_version`, monotonic positive `generation`, and `observed_at`;
- current source revision;
- the sorted active migration-tail paths and their aggregate SHA-256;
- exactly five unique owner package IDs and manifest file/self digests;
- exactly five unique numbers and planned migration paths;
- allocation status `UNCLAIMED` or immutable consumed facts;
- one canonical digest per allocation, one aggregate allocation-set digest, and
  one canonical receipt digest; and
- no Program manifest digest, which would create a self-referential hash cycle.

Canonical digests recursively sort object keys, preserve array order, omit only
the digest field being computed, and serialize as UTF-8 JSON without whitespace.

## Allocation Table

| Number | Owner package | Planned path |
|---:|---|---|
| `0053` | Publisher | `migrations/0053_publication_foreign_keys.sql` |
| `0054` | Activation | `migrations/0054_beta_activation_events.sql` |
| `0055` | Estimate Intelligence | `migrations/0055_estimate_intelligence_inputs.sql` |
| `0056` | Calculation Parity | `migrations/0056_estimate_calculation_input_constraints.sql` |
| `0057` | Activity History | `migrations/0057_activity_history_indexes.sql` |

## Consumer Preflight

Immediately before creating its migration, an owner must verify:

1. receipt, allocation-set, and own allocation digests;
2. current migration-tail digest and absence of an unexpected higher/colliding
   migration;
3. every owner package and manifest digest in the generation, not only its row;
4. its package ID, exact planned path, number, and `UNCLAIMED` status;
5. any owner-specific prerequisite, including the Calculation legacy scan; and
6. that the generation has not been consumed or superseded since preflight.

The owner records generation plus receipt digest in its unit receipt before the
first edit. A partial or locally reconstructed lease is invalid.

## Consumption And Reissue

Creating the expected migration consumes the allocation and immediately stales
the current generation for every remaining owner. The Program then issues the
next monotonic generation with:

- consumed path and file digest retained as immutable observed facts;
- current migration-tail digest;
- current owner manifest digests;
- unconsumed allocations reissued without renaming another owner's migration;
  and
- fresh allocation and receipt digests.

Unexpected collision, rename, deleted migration, tail drift, owner-manifest
drift, malformed JSON, duplicate allocation, or digest mismatch follows the
same fail-closed rescan/reissue path.

## Adversarial Requirements

The verifier must reject duplicate numbers, duplicate owners, missing owners,
path traversal, a path outside `migrations/`, zero placeholder digests, reordered
or altered allocations without digest changes, an allocation claiming another
owner's package ID, a consumed file whose digest differs, and any generation
that omits one of the five owners.

## Resume And Cleanup

On failure, no owner edits a migration path. Record the failed predicate and the
last trusted generation in the Program ledger, release any temporary filesystem
lease, re-read the active migration tail and all five owner manifests, then
reissue from `UNIT-001`. Generated temporary comparison files are removed; the
redacted durable generation and receipts remain.
