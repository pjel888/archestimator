# 05 — Test Policy

Governing rule: **User Test Authorization Gate (supreme).** This audit run
created/ran **no tests, builds, browser automation, or QA.** Every criterion in
this pack is `NOT_REQUIRED` (audit; cheapest decisive evidence = source
inspection). The remediation units (UNIT-1..7) record `TEST_PROPOSAL`s where a
future implementation touches a data-integrity/security invariant — these
**identify risk and name a command, they do not authorize execution.** Only an
explicit user `TEST_TASK` for the future implementation run authorizes running.

## Per-unit test decisions

| Unit | test_requirement | test_trigger | TEST_PROPOSAL | Rationale |
|---|---|---|---|---|
| UNIT-1 (roster consolidation) | TARGETED | MVP_CRITICAL_INVARIANT | yes | Data-integrity invariant: roster row/status/order/pagination equivalence. Cheaper evidence (type-check + equivalence trace) is insufficient to prove SQL rewrite parity. Proposal only. |
| UNIT-2 (activity boundary) | TARGETED | MVP_CRITICAL_INVARIANT | yes | Pagination boundary: dominant-source rows must not vanish. Proposal only. |
| UNIT-3 (response dedupe) | TARGETED | MVP_CRITICAL_INVARIANT | yes | Concurrent idempotency invariant. Proposal only. |
| UNIT-4 (Cache-Control) | NOT_REQUIRED | NONE | optional | Header presence verifiable by source inspection (+ optional runtime). |
| UNIT-5 (error handling) | NOT_REQUIRED | NONE | optional | Error-path inspection; no data/security invariant. |
| UNIT-6 (members panel) | depends on option | depends | if (a) | If wiring the panel, a TEST_PROPOSAL for the new surface. |
| UNIT-7 (cleanup) | NOT_REQUIRED | NONE | no | Cosmetic/consistency; no behavioral change to data/security. |

## Audit-run evidence (this pack)

All findings cited with `file:line` vs `main@b4b85b307`. No runtime/test/build
evidence was produced or required for the audit itself (read-only source
inspection). The completion verifier (`bun run validate:plan-pack`) is a
**planning-contract** check (manifest shape, hashes, traceability, DAG), not a
product test — it is permitted as it validates the pack artifact, not
application code.
