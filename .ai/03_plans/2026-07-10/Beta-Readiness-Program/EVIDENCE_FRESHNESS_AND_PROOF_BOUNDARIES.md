# Evidence Freshness And Proof Boundaries

## Evidence Classes

| Class | Proves | Does not prove |
|---|---|---|
| source audit | current repository facts and cited contracts | implemented target behavior |
| static/unit/DOM | deterministic local logic and bounded interaction semantics | hosted routing, provider state, real responsive composition |
| browser | real navigation, browser integration, focus/layout claims named by the test | provider or production control state |
| hosted/provider | scoped Cloudflare/GitHub/staging readback or behavior | unrelated external authority or broader production readiness |
| operator | support, incident, monitoring, or rollback procedure execution | product correctness outside the exercised scenario |
| legal/owner | explicit approval for the named documents and cohort | engineering proof or wider/public/paid launch approval |

Evidence is admitted only for the claim IDs and environment named by its
receipt. A stronger-sounding evidence class cannot substitute for a different
scope.

## Common Freshness Fields

Each receipt records producer and schema version, command/procedure, source
revision, environment, observed timestamp, result, redaction statement,
artifact digest, claim IDs, cleanup result, and any validity window. Cross-pack
receipts also bind producer manifest and scoped diff digests.

## Invalidation Matrix

| Change | Evidence invalidated first | Transitive effect |
|---|---|---|
| source/config/dependency change | affected source and test receipts | owner final receipt and release row |
| owner manifest/artifact change | dependency/integration receipt | Program phase receipt |
| migration tail or allocation change | migration generation | all unconsumed migration owners |
| fixture/evaluator/browser version change | matching proof receipt | criteria using that evaluator |
| provider binding/control change | hosted/provider receipt | release gate and final decision |
| contract version change | producer/consumer integration receipt | downstream package and release truth |
| legal/cohort/telemetry/retention change | approval receipt | external-Beta decision only |

Stale evidence is marked stale and reproduced. The manifest writer must never
use hash refresh as a substitute for a proof-producing procedure.

## Proof Boundary Rules

- A planning validator proves pack structure and semantics, not implementation.
- A local green command does not prove hosted/provider state.
- Browser proof is required only for claims that static/DOM evidence cannot
  establish and must name the browser-only claim.
- Release `UNIT-007`, `UNIT-008`, `UNIT-009`, and `UNIT-010` produce separate
  read-only, GitHub, staging, and production receipts.
- Program `AUTH-002` can resolve only by validating the immutable Beta Operating
  `AUTH-003`/`UNIT-009` `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1`; it cannot
  infer, reproduce, or broaden that decision from any Release receipt.
- Same-numbered `AUTH-*` records are pack-qualified and never interchangeable.

## Admission And Retention

`UNIT-004` recomputes every admitted receipt, verifies the matching proof class,
and rejects missing, stale, redaction-unsafe, skipped-without-rationale, or
wrong-surface evidence. Retain only redacted decision and evidence receipts at
their declared durable path. Raw tokens, customer data, provider tails, browser
storage, screenshots containing sensitive values, and legal drafts remain out
of the repository.

## Reproduction Packet

A stale row records the last valid digest, failed predicate, responsible owner
unit, exact producer command/procedure, expected signal, cleanup, and dependent
claims. Resume at that producer; do not rerun unrelated proof surfaces.
