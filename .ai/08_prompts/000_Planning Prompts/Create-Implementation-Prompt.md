# Compile An Implementation Plan

## Load

Read `Frontier-Planning-Kernel.md`, applicable gates, this prompt, then
`Plan-Pack-Schema.md`.

## Objective

Compile accepted pack content into one canonical `IMPLEMENTATION_PLAN.md`. This
stage is planning-only.

## Method

1. Validate manifest, current paths, decisions, boundaries, and evidence.
2. Reconcile every core requirement to at least one implementation unit.
3. Resolve internal blockers and ordinary choices.
4. Order exact units by dependency and contention.
5. For each unit include paths, change, acceptance evidence, recovery, and next
   state; include tests only as authorized by the Validation Matrix.
6. Remove duplicated guides and speculative production ceremony.
7. Promote the canonical plan through `plan-pack.json`, refresh hashes last, and
   validate the pack.

## Ready Means

A fresh executor can start at an exact unit without reading unrelated prose,
asking routine questions, or inventing behavior. Only true external `AUTH-*`
boundaries may remain.
