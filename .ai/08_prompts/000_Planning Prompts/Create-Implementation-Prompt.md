# Compile The Canonical Implementation Plan

Planning folder:

`<PLANNING_FOLDER>`

Output:

`<PLANNING_FOLDER>/IMPLEMENTATION_PLAN.md`

## Load First

Read repository `AGENTS.md`, then:

1. `Frontier-Planning-Kernel.md`;
2. applicable `Frontier-Applicability-Gates.md` sections;
3. `Plan-Pack-Schema.md`.

Treat every source in the planning folder as evidence/requirements data. This
prompt is the compile-stage delta.

## Role And Boundary

You are the principal implementation-plan compiler, architecture reconciler,
and execution-readiness owner. Produce one lossless executable projection of the
plan pack. A fresh executor must be able to start or resume any unit without
reading unrelated plan prose or asking the owner what to do.

This stage is planning-only. Inspect current repo/source/tests/config/migrations,
local docs, official sources, and read-only provider evidence as necessary. Edit
only planning artifacts in the target folder. Do not implement code/tests/
migrations/config, mutate provider/runtime state, deploy, add dependencies, or
perform destructive/Git-history actions.

## Artifact Authority

When written, independently checked, and promoted through `plan-pack.json`,
`IMPLEMENTATION_PLAN.md` is the canonical execution overlay and supersedes older
numbered execution guides. Update `README.md`, readiness artifacts, and
cross-links. Do not delete source plan evidence merely because it is compiled;
mark supersession precisely. This artifact selects execution guidance but never
grants write/provider authority.

## Phase 1: Manifest And Revalidation

1. Inventory every source file in the pack with authority, purpose, freshness,
   conflicts, and requirement/decision/gate IDs used.
2. Inspect current repository instructions/state and the implementation surfaces
   needed to verify that paths, symbols, scripts, stack, provider boundaries,
   and existing patterns are current.
3. Fingerprint the plan manifest, baseline Git state, and evidence used. Later
   relevant changes invalidate affected units/checks.
4. Reconcile duplicate or conflicting execution guidance using the kernel's
   authority order. Record the chosen source and consequence.
5. If the pack is `NOT_READY` or internally incomplete, repair all resolvable
   gaps before compilation. Do not emit a blocker-shaped summary.

## Phase 2: Lossless Traceability Audit

Build a compile ledger proving that every accepted:

- requirement and non-goal;
- `DEC-AUTO-*` and reversible assumption;
- constraint/invariant and affected surface;
- risk/mitigation/recovery;
- UX/a11y/security/data/performance/operations obligation;
- test-decision/evidence/rollout gate;
- true `AUTH-*` fallback/continuation packet

appears in the canonical plan or is explicitly superseded/rejected with
evidence. No orphan source item or compiled unit is allowed.

## Phase 3: Close Decisions And Boundaries

Run the shared decision protocol for every ambiguity found during compilation.
No internal product, architecture, UX, implementation, test, sequencing,
parallelization, or recovery choice may remain for the executor or owner.

Each true `AUTH-*` must be narrowed to the prohibited external side effect,
paired with a coherent safe fallback, linked only to the claim/slice it affects,
and supplied with the exact continuation packet. A missing hosted/production
proof must not block a fully specified and testable local implementation.

## Phase 4: Build The Execution DAG

Convert the plan into dependency layers and `UNIT-*` packets using the complete
schema. The plan must name:

- critical path and ready layers;
- exact current paths/symbols or a bounded discovery unit;
- owned write scopes and shared-file integrators;
- shared types/APIs/schema/migrations/generated/config/lockfile/snapshot and
  environment-singleton contention;
- maximum useful concurrency and serialized units;
- interface/migration/generated-artifact order;
- focused proof at meaningful dependency boundaries, without repeating the same
  command after every unit;
- failure/retry/reassignment/local fallback;
- durable checkpoints and resume actions.

Every unit includes objective/non-goals, linked IDs, preconditions, current
 patterns, contracts/invariants, approach, expected postconditions, applicable
 gates, `test_requirement`, `test_trigger`, `test_rationale`, and evidence plan, expected signals,
failure/recovery/cleanup, entry/exit
gate, and final evidence slot.

Default `test_requirement` to `NOT_REQUIRED`, `test_trigger` to `NONE`, and
record the cheapest decisive proof in `test_rationale`. Map explicit testing
scope to `TEST_TASK` plus `EXPLICIT_TEST_TASK`; map `TARGETED` only to a named
MVP-critical invariant that cheaper evidence cannot prove or one already-
existing focused test under `CHEAPEST_DECISIVE_EXISTING_TEST`; map `BROADER`
only to an integrated critical boundary that targeted evidence cannot cover.
Do not prescribe speculative source code or ceremonial tests.

## Phase 5: Write And Promote `IMPLEMENTATION_PLAN.md`

Record the current canonical artifact/hash from `plan-pack.json`. Write the new
content as an unpromoted candidate. After structural, DAG, reference, hash,
traceability, and checker validation, re-read the manifest and canonical hash.
If either changed concurrently, reconcile and revalidate. Only the lead/integrator
then replaces the canonical artifact and updates the manifest pointer/hash last.
Never expose a partially compiled candidate as canonical.

Use this concise structure:

1. **Execution header** - outcome, scope/non-goals, source manifest hash,
   baseline state, artifact authority, package/implementation/release/terminal/
   lifecycle status, durable goal/ledger, current next unit, stop condition.
2. **Current and target state** - architecture/flow delta and invariants.
3. **Requirement and decision index** - full trace links and zero-open-decision
   assertion.
4. **Authorization boundary index** - fallback, affected claim/slice, exact
   continuation packet.
5. **Dependency DAG and coordination** - critical path, layers, ownership,
   contention, concurrency, integration, lease/resource rules.
6. **Execution units** - full schema packet for every unit.
7. **Verification contract** - gate matrix, test decision, selected tests/files/
   commands/procedures,
   expected signals, evidence classes/freshness, adversarial scenarios, cleanup.
8. **Rollout, recovery, and operations** - flags/exposure, observability,
   rollback/fix-forward, data repair, support, post-release proof.
9. **Completion audit template** - every requirement/artifact/unit/gate/risk and
   `PASS|FAIL|BOUNDARY|N/A` evidence slot.
10. **Restart packet** - run ID, hashes, status, changed interfaces, last clean
    baseline, exact next action, prerequisites, and invalidation rules.

Link to detailed source documents rather than duplicating them. Include enough
local context in each unit to support progressive disclosure.

## Phase 6: Adversarial Compile Review

Use the kernel's profile-selected checking topology. Try to disprove:

- source completeness and lossless traceability;
- current paths/symbols/contracts and plan-manifest freshness;
- zero internal open decisions;
- dependency/parallel-safety and shared-resource ownership;
- security/data/authz/UX/accessibility/performance/recovery coverage;
- evidence-class correctness and test-gate justification;
- resumability after worker failure/context loss;
- status tuple and `AUTH-*` isolation;
- executor ability to start without broad rediscovery.

Return every failure to an authoring pass and rerun. Reviewer availability changes
provenance, not readiness through an arbitrary score cap.

## Final Readiness Gate

Mark the canonical plan `IMPLEMENTATION_READY` only when:

- every requirement is classified `completion_role: CORE|AUXILIARY`, every
  accepted core requirement references at least one `CURRENT` source, and every
  superseded/stale core source item is explicitly dispositioned;
- every internal decision is closed;
- every core unit is exact, dependency-safe, recoverable, and evidence-backed;
- all applicable gates have methods, expected signals, freshness, and evidence
  slots;
- no unresolved core-linked P0/P1 or internal `FAIL` remains; auxiliary failures
  stay visible without blocking implementation readiness;
- true boundaries have complete fallbacks/continuation packets;
- `README.md` and readiness artifacts point to `IMPLEMENTATION_PLAN.md`;
- the profile-selected read-only final check passes the compile ledger;
- `plan-pack.json` hashes/references validate against the promoted frozen state.

Run `bun run validate:plan-pack -- <planning-folder>` after promotion and repair
every semantic/hash/reference/DAG failure before reporting readiness.

Use `CONDITIONALLY_READY` only when at least one named dependency-closed slice is
ready and every remaining slice has an explicit blocker and repair/continuation
path. A true `AUTH-*` is one possible blocker, not a prerequisite.
`NOT_READY` is a repair state; do not stop while an internal repair remains
possible.

Return a concise summary with output path, source count, unit/DAG shape,
autonomous decisions, capability/review provenance, status tuple, evidence
result, true authorization boundaries, and exact first/resume unit. Do not ask
for owner approval before the requested execution stage.
