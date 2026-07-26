# Onboarding Q2 Architecture and Integration Review

**Reviewed at:** `2026-07-27T01:37:20.3144405+08:00`  
**Verdict:** **PASS**  
**Architectural status:** `CLEAR`  
**Unresolved findings:** 0 critical, 0 high, 0 medium

## Summary

The current onboarding architecture is coherent across starter recovery, lease fencing, role boundaries, resource-bound proof, route continuity, handoff, and non-destructive starter generation. Exact-token ownership is enforced inside the same atomic D1 batch as every starter business mutation.

No unresolved architecture or integration blocker remains. Aggregate Q2 release evidence remains a separate gate.

## Atomic Starter Mutation Fencing

Migration 0117 creates a unique composite lease identity and a guard table whose composite foreign key references the exact current workspace, version, and token. Each mutation transaction contains token-qualified renewal, exact-token guard insertion, all business statements, and exact-token guard deletion.

`run` and `runCheckedBatch` submit that sequence as one D1 batch. A replaced token fails the guard foreign key and rolls back the transaction. Once the transaction begins, expired takeover cannot interleave with its business statements. Expired leases remain recoverable, and release is token-qualified so a stale holder cannot delete its successor.

A direct write audit found no starter business mutation bypassing the fenced helpers. Remaining direct calls are lease acquisition and token-qualified release.

## Authorization and Proof

- Resume derives persisted membership, denies unsupported roles, and requires owner or admin whenever shared state is incomplete.
- A member with complete shared state is restricted to their own user scope; cross-user reconciliation remains manager-gated.
- Restore is authenticated-actor-matched and owner/admin-only.
- Onboarding events persist resource bindings, and completion derives proof from persisted, same-user, same-workspace, current-run domain evidence.
- Domain flows cannot complete from tour termination alone.

## Route and Handoff

Route preparation preserves flow and resume intent. Interactive handoff stops the overlay before focusing the product target, supports Escape return, renders “Try it now” instead of Next, and uses the real add-row control as the owned target.

## Acceptance Mapping

| Criterion | Verdict | Architecture evidence |
| --- | --- | --- |
| `AC-001` | **PASS** | Consistent revision/CAS, latest-generation recovery, role fencing, live expired takeover, and atomic stale-holder exclusion. |
| `AC-002` | **PASS** | Flow launch, route continuity, pause/resume, target resolution, and recovery paths are coherent. |
| `AC-003` | **PASS** | Nonmodal product-target handoff and domain-derived completion are structurally enforced. |
| `AC-004` | **PASS** | Versioned stable claims avoid in-place overwrite and recreate only missing or inactive generations. |
| `AC-005` | **PASS** | Role-specific flows and passive Viewed versus domain-confirmed Completed semantics are separated. |
| `AC-006` | **PASS — architecture lane** | No unresolved architecture finding; aggregate automation remains independently gated. |

## Evidence

- Migration and starter focused evidence passed 24/24 at review time.
- Starter tests cover active contention, expired takeover, adversarial successor replacement, member self-scope, stale CAS, and latest-generation restore.
- Migration tests reject a guard referencing a missing token and finish with a clean foreign-key check.
- Scoped onboarding TypeScript evidence is PASS.
- No heavy command was run by the independent reviewer.

## Residual Risk

Correctness relies on transactional D1 batch rollback and foreign-key enforcement. This matches the repository D1 contract and is exercised by SQLite with `BEGIN IMMEDIATE`, rollback, and foreign keys enabled.

## Stop Condition

Architecture review is complete. Do not mark the overall onboarding plan complete until all required Q2 automation, changed-code coverage, mutation, build, fresh GitNexus analysis, independent reviews, and evidence-manifest reconciliation are current and PASS.
