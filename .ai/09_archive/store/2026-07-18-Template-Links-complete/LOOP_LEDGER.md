# Loop Ledger

Append-only planning and execution continuity for `PLAN-2026-07-18-template-links`.

## Current State

- **Mode:** implementation closure
- **Package status:** `IMPLEMENTATION_READY`
- **Implementation status:** `COMPLETE`
- **Exact next unit:** none
- **Ready slice:** none
- **Product code changed:** yes — additive schema, domain, propagation, lifecycle, and linked UX
- **Automated tests/build/browser/screenshots run:** 64 focused Vitest tests passed; no build, browser automation, or screenshots
- **Static implementation validation:** `PASS` — type-check, changed-file lint with warnings only, migration-chain apply, and diff check
- **Independent review:** `GO` — architecture, implementation-readiness, and UX reviewers report no unresolved P0/P1 after repairs
- **Current-state pointer:** updated during archival to the canonical completed pack

## Event Ledger

| Event | Date | Result | Evidence/decision |
| --- | --- | --- | --- |
| `EV-001` | 2026-07-18 | Current Template source and insert path mapped. | `SRC-001`; existing behavior is guarded copy/materialization without instance identity. |
| `EV-002` | 2026-07-18 | Linked Component precedent mapped. | Impact fingerprint, version guard, set-based fan-out, receipts, authoritative patches, and project-specific conversion are reusable controls. |
| `EV-003` | 2026-07-18 | React/CRUD/render surface mapped. | `SRC-002`; branch memoization, virtual branches, editable row store, and shared Component modal define integration constraints. |
| `EV-004` | 2026-07-18 | D1/Worker/Queue constraints mapped. | `SRC-003`; two current Queues are domain-specific; five-minute Worker schedule and D1 outbox/lease patterns exist. |
| `EV-005` | 2026-07-18 | Architecture alternatives compared. | `DEC-AUTO-001`, `DEC-AUTO-004`; materialized D1 job with immediate drain and cron recovery selected. |
| `EV-006` | 2026-07-18 | Product ownership/lifecycle resolved. | `DEC-AUTO-002`–`DEC-AUTO-011`; whole link/detach boundary, fixed field ownership, safe delete, no historical inference/nesting. |
| `EV-007` | 2026-07-18 | Initial test boundary recorded. | Superseded by explicit user authorization for focused implementation testing. |
| `EV-008` | 2026-07-18 | Independent architecture/readiness/UX review returned no-go. | Two P0, multiple P1, and manifest-truth findings identified tenant FKs, Component snapshot precedence, set-based insert, lease indexing, mixed bulk, dirty deletion, insertion, detach, progress, multi-root, archive, and evidence gaps. |
| `EV-009` | 2026-07-18 | Reviewer findings repaired in canonical artifacts. | Composite FK/trigger schema, live Component resolution, set-based linked insert, indexed reclaim, explicit interaction state machines, and truthful planned-vs-passed evidence contracts selected; re-review pending. |
| `EV-010` | 2026-07-18 | Second review cycle repaired legacy/recovery edge cases. | Active-tab linked preflight with copy fallback, server-owned mutation intents, receipt-first reload recovery, retryable/terminal job taxonomy, progress query states, and class-safe bulk retry added. |
| `EV-011` | 2026-07-18 | Final architecture and UX re-reviews returned `GO`. | No unresolved P0/P1; permanent-delete receipt survives master deletion, dead-job requeue is class-specific, and all prior interaction findings remain closed. |
| `EV-012` | 2026-07-18 | Final static closure validation passed. | `validate:plan-pack -- --write`, normal `validate:plan-pack`, `validate:planning-prompts`, JSON parse/manifest summary, and `git diff --check`; no product tests/build/browser/screenshots run. |
| `EV-013` | 2026-07-18 | `UNIT-001` through `UNIT-007` implemented. | Migration `0092`, typed link/version contracts, linked insertion, immutable version fan-out, D1 propagation and intent recovery, lifecycle actions, Estimate projection, and linked UX are present in current source. |
| `EV-014` | 2026-07-18 | Authorized focused verification passed. | 8 Vitest files / 64 tests passed; type-check passed; changed-file lint exited 0 with warnings only; fresh full migration chain including `0092` applied locally; `git diff --check` passed. |
| `EV-015` | 2026-07-18 | Requirement and risk audit reached archive readiness. | All eight acceptance criteria and three gates pass; all units are verified; all declared risks are mitigated; release remains not evaluated. |

## Research Lanes

Four bounded read-only lanes were integrated:

1. current Template schema/lifecycle/insertion and missing identity;
2. linked Component version/fan-out/detach/confirmation precedent;
3. Estimate Sheet React/query/CRUD/virtualization integration and performance hazards;
4. D1/Worker/Queue limits, atomicity, outbox/lease/retry patterns, and architecture alternatives.

All lanes reported no edits, tests, builds, browser automation, or git mutation.

## Key Evidence Snapshot

- `estimate_templates` now advances immutable version records while retaining guarded source mutations.
- linked whole-Template insertion creates durable instances and stable node/row mappings; explicit copy paths remain independent.
- linked Component precedence is resolved live during Template instance reconciliation.
- `EstimateTreeNode` projects compact linked-instance state for recursive and virtualized branches.
- the Worker combines the existing five-minute responsibilities with bounded intent reconciliation and propagation draining.
- set-based JSON expansion and bind-budget coverage keep linked writes within D1 statement/parameter constraints.

## Decision Ledger

| Decision | Status | Rationale |
| --- | --- | --- |
| `DEC-AUTO-001` Materialized instances | Active | Preserves current read/calculation/publication/export model. |
| `DEC-AUTO-002` Whole linked insert only | Active | Creates one unambiguous instance boundary. |
| `DEC-AUTO-003` Fixed ownership matrix | Active | Avoids per-field override framework and silent overwrite. |
| `DEC-AUTO-004` D1 job + immediate/cron drain | Active | Durable and provider-lean; no new Queue. |
| `DEC-AUTO-005` No historical link backfill | Active | Existing provenance cannot prove maintained identity. |
| `DEC-AUTO-006` Whole one-way detach | Active | Keeps linked graph invariant simple and recoverable. |
| `DEC-AUTO-007` Component precedence | Active | Prevents stale Template snapshots from owning Component truth. |
| `DEC-AUTO-008` Detach-all master delete | Active | Preserves Estimate content and avoids cascade surprise. |
| `DEC-AUTO-009` Visible eventual convergence | Active | Honest global semantics with atomic local instances. |
| `DEC-AUTO-010` No nested/AI package links | Active | Avoids cycles and dual lifecycle ownership. |
| `DEC-AUTO-011` Fixed branch-level visual state | Active | Works in recursive and virtualized rendering. |
| `DEC-AUTO-012` Focused tests authorized | Active | User authorized scoped implementation tests; 64 tests passed. |
| `DEC-AUTO-013` One-owner bulk and no shared Undo | Active | Prevents mixed local/master mutations and hidden multi-version commits. |
| `DEC-AUTO-014` Server-authoritative topology with recoverable draft | Active | D1 reconciliation cannot wait for every dirty client; bounded session recovery prevents silent draft loss. |
| `DEC-AUTO-015` Explicit insertion matrix, non-empty source, active-tab target | Active | Removes mode ambiguity, prevents invisible instances, and avoids inferred migration of legacy tabless content. |
| `DEC-AUTO-016` Deterministic multi-root and global progress owners | Active | Keeps status/actions accessible under virtualization and exposes partial propagation from the Template Editor. |
| `DEC-AUTO-017` Explicit detach/archive/delete state machine | Active | Makes one-way consequences visible and keeps detach-all permanent deletion atomic. |
| `DEC-AUTO-018` Server-owned receipt-first intent resolution | Active | Persists the normalized payload across reload, prevents duplicate versions, and distinguishes committed, definitely not applied, and still unknown. |
| `DEC-AUTO-019` Retryable/terminal recovery taxonomy | Active | Prevents unsafe bulk retries and keeps progress-query failure separate from instance job failure. |

## Authorization Ledger

- `AUTH-001` — **Resolved for local implementation:** current repository contract authorizes additive source/migration work inside bound `ARCH_DB` and the existing Worker schedule. Remote apply, deployment, hosted mutation, paid service, or a new Queue remains excluded.

## Gate Ledger

- `GATE-DATA-001` — `PASS`: migration, ownership constraints, versioning, mappings, atomic jobs, reconciliation, and lifecycle preservation are implemented and verified.
- `GATE-UX-001` — `PASS`: explicit linked/copy insertion, impact confirmation, outcome recovery, status rails, progress, retry, detach, duplicate, archive, restore, and delete UX are implemented.
- `GATE-VERIFY-001` — `PASS`: requirement audit, 64 focused tests, type-check, scoped lint, migration-chain apply, and diff check passed.

## Continuation

No implementation unit remains. Archive the validated pack, repair the active-plan and current-state pointers, validate the archival copy, and retain release status `NOT_EVALUATED` until deployment or hosted proof is separately authorized.
