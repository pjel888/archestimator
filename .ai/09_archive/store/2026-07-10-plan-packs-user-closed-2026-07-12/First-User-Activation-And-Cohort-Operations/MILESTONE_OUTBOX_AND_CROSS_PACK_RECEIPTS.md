# Milestone Outbox And Cross-Pack Receipts

This supporting contract expands `REQ-002`, `DEC-AUTO-008/010`, `RISK-002/007`,
and `UNIT-005`. `IMPLEMENTATION_PLAN.md` remains the execution authority.

## Frozen Producer Contract

`ACTIVATION-PRODUCER-CONTRACT-v1` defines:

- ordered milestones from `invite_accepted` through `recipient_decided`;
- an allowlisted producer source and required resource chain per milestone;
- server-resolved user/workspace/project/estimate identity;
- tenant-scoped canonical dedupe and late-event behavior;
- same-transaction outbox intent, bounded reconciliation, and dead repair;
- shaped success/idempotent-success/error results and safe log fields;
- deterministic fixtures that consumers can validate without touching another
  pack's source files.

Unknown or regressive stage shapes, forged resource identity, arbitrary metadata,
and receipts that describe post-response in-memory delivery fail contract
validation.

## Producer And Consumer Ownership

| Contract/receipt | Owner | Required binding | Absence behavior |
|---|---|---|---|
| Local project/area/row/total/export producers | Activation | Authoritative mutation path, outbox guarantee, exact tests | Local unit fails until implemented |
| `ACT-RECEIPT-ESTIMATE-HEALTH-v1` | Estimate Intelligence | Owner manifest, `health_reviewed` path/test, contract version, transactional outbox, safe logs | Health checklist row is `not_available` |
| `ACT-RECEIPT-PUBLISHER-v1` | Publisher | Owner manifest, publication/open/engage/decision paths/tests, contract version, transactional outbox | Publication/recipient rows are `not_available` |
| `ACT-RECEIPT-COHORT-CONSUMER-v1` | Beta Operating | Owner manifest, DTO/query version, admin consumer paths/tests, retention basis, unavailable behavior | Operator presentation/release composition stays unavailable |
| Program integration receipt | Beta Readiness Program `UNIT-003` | Current owner manifests, receipt schema/results, fixture digests, freshness | Integration/release truth fails closed |

Activity History consumes no activation rows and does not repurpose audit/history
events as funnel state. Publisher and Activity may both emit their own domain
records, but only the Activation outbox contract advances activation progress.

## Receipt Minimum Fields

Every receipt binds package ID, owner manifest self hash, relevant artifact hash,
contract name/version, producer or consumer path, stable test IDs and command,
fixture/result digest, source revision, transactional guarantee or explicit
consumer behavior, safe-log assertion, collection time, and invalidation rules.
Raw tokens, customer fields, or reversible credential hashes are forbidden.

## Failure And Freshness Rules

- Missing receipt instances do not block executable Activation source units;
  they preserve honest unavailable UI and block Program integration/release only.
- Wrong manifest/contract/fixture hash, stale source revision, non-transactional
  delivery, missing unavailable behavior, or unsafe-log output rejects the receipt.
- A producer implementation change invalidates its receipt and every Program
  composition that cites it. Hashes are never refreshed over stale proof.
- Receipt validation is deterministic and restartable; agent completion messages
  or reviewer availability are not inputs.

## Resume

Implement and verify the local contract in `UNIT-005`, publish immutable schemas
and fixtures, then hand only their digests and paths to Program `UNIT-003`. Do not
edit Estimate, Publisher, Activity, Operating, or Program-owned source during this
unit.
