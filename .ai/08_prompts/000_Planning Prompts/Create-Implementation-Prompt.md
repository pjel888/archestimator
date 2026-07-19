# Compile An Implementation Plan

## Load

Read `Frontier-Planning-Kernel.md`, applicable gates, this prompt, and
`Plan-Pack-Schema.md`. Load `Multi-Agent-Execution-Directive.md` when
assignments or handoffs are compiled.

## Objective

Compile accepted pack content into one canonical `IMPLEMENTATION_PLAN.md`.
This stage is planning-only.

## Method

1. Validate the Task Contract, manifest, current paths, decisions, boundaries,
   and evidence.
2. Reconcile every core requirement to at least one exact implementation unit.
3. Resolve internal blockers and ordinary reversible choices.
4. Order units by dependency, mutable-state ownership, and synchronization.
5. For each unit include owned paths/resources, change, capability class,
   permissions, acceptance evidence, recovery, handoff, and next state.
6. Include tests only as authorized by the Validation Matrix.
7. Remove duplicated guides and speculative production ceremony.
8. Promote the canonical plan through `plan-pack.json`, refresh hashes last,
   and validate.

## Ready Means

A fresh executor can begin at an exact unit without unrelated prose, routine
questions, invented behavior, or ambiguous ownership. Only true external
`AUTH-*` boundaries may remain.
