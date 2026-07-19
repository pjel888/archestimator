# Plan-Pack Schema

<!-- FRONTIER-PLAN-SUITE: 2026-07-19 -->

## Lean Schema

A pack is an execution index, not a document quota. Combine artifacts by
default. Split only for independent ownership, retrieval, or evidence freshness.

## 1. Manifest

`plan-pack.json` records the supported `suite_version`, title, status,
canonical entrypoint, artifacts, requirements, decisions, units, gates,
evidence, risks, and archive state. The executable validator defines exact
field vocabulary.

## 2. IDs

Use stable prefixes: `REQ-*`, `DEC-*`, `AUTH-*`, `UNIT-*`, `GATE-*`,
`EVID-*`, and `RISK-*`. Every accepted core requirement links to
implementation units and evidence. No orphan IDs.

## 3. Task And Requirements

Persist the Planning Kernel Task Contract at the smallest useful granularity.
Requirements record statement, source, `CORE|AUXILIARY`, status, units,
evidence, test decision, and explicit non-goals.

## 4. Decisions And Boundaries

Resolve ordinary choices. `AUTH-*` is only for exact prohibited external
actions and includes completed safe prerequisites plus continuation
command/context.

## 5. Units And Assignments

Each unit records goal, dependencies, owned paths/resources, implementation,
acceptance evidence, recovery, and status. The DAG must be acyclic and expose
an exact next ready unit.

When delegated, the unit also records the directive's Subagent Assignment and
Handoff fields. Do not duplicate shared policy inside the pack.

## 6. Evidence

Record claim, method, expected and actual signal, artifact/source/diff
fingerprint, freshness, and result. Do not claim a stronger evidence class than
collected.

## 7. Tests

Use `NOT_REQUIRED`, `TEST_PROPOSAL`, or `TEST_TASK` from the Validation
Matrix. `TEST_PROPOSAL` records the named risk, exact unrun command, and
rationale; it never grants test execution. Only explicit current-task user
authorization permits test execution or edits. Legacy manifest values may
remain validator compatibility, but they are not authoring guidance.

## 8. Status, Resume, And Archive

Track implementation separately from external release proof. Terminal status is
`ACHIEVED|AUTH_BLOCKED|TECH_BLOCKED|CANCELLED`. Resume state includes goal,
status, next unit, hashes, decisions, boundaries, ownership, handoffs, and
cleanup. Archive only after every core requirement is reconciled to fresh
evidence and inbound references are repaired.
