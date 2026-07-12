# Plan-Pack Schema

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 -->

## Lean Schema

A pack is an execution index, not a document quota. Combine artifacts by
default. Split only for independent ownership, retrieval, or evidence freshness.

## 1. Manifest

`plan-pack.json` records `suite_version: 2026-07-12`, title, status, canonical entrypoint, artifacts,
requirements, decisions, units, gates, evidence, risks, and archive state.

## 2. IDs

Use stable prefixes: `REQ-*`, `DEC-*`, `AUTH-*`, `UNIT-*`, `GATE-*`, `EV-*`,
`RISK-*`. Every accepted core requirement links to implementation units and
evidence. No orphan IDs.

## 3. Requirements

Record statement, source, `CORE|AUXILIARY`, status, units, evidence, and test
decision. Preserve the full objective and explicit non-goals.

## 4. Decisions And Boundaries

Resolve ordinary choices. `AUTH-*` is only for exact prohibited external actions
and includes completed safe prerequisites plus continuation command/context.

## 5. Units

Each unit records goal, dependencies, owned paths/resources, implementation,
acceptance evidence, recovery, and status. The DAG must be acyclic and expose an
exact next ready unit.

## 6. Evidence

Record claim, method, expected and actual signal, source/diff fingerprint,
freshness, and result. Do not claim a stronger evidence class than collected.

## 7. Tests

Use `NOT_REQUIRED`, `TEST_PROPOSAL`, or `TEST_TASK` from the Validation Matrix.
`TEST_PROPOSAL` uses `MVP_CRITICAL_INVARIANT` or
`CHEAPEST_DECISIVE_EXISTING_TEST` as proposal metadata and never grants execution
authority. Only explicit current-task user authorization permits test execution
or edits. The validator accepts legacy `TARGETED|BROADER` values for existing
`2026-07-10|2026-07-11` packs; new packs use `2026-07-12` and `TEST_PROPOSAL`.

## 8. Status

Track implementation separately from release/lifecycle. Terminal status is
`ACHIEVED|AUTH_BLOCKED|TECH_BLOCKED|CANCELLED`. Auxiliary gaps cannot manufacture
or prevent implementation completion.

## 9. Resume And Archive

Keep goal, current status, next unit, relevant hashes, decisions, boundaries,
and cleanup state. Archive only after every core requirement is reconciled to
fresh evidence and inbound references are repaired.
